/**
 * Employer-portal helpers that sit on top of DataStore / SupabaseSync:
 * safe CSV export, URL validation, error classification, candidate lookups
 * and the Razorpay checkout plumbing used by the billing page.
 */
import { supabase } from '../lib/supabase';
import { SupabaseSync } from './supabaseSync';
import { DataStore } from './store';
import type { DriverProfile, Job } from '../types';

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

/**
 * Quote one CSV cell. Values that a spreadsheet would run as a formula
 * (= + - @ tab CR) get a leading apostrophe (CSV/formula injection).
 */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Build a CSV file in memory and hand it to the browser as a download. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const lines = [headers, ...rows].map(row => row.map(csvCell).join(','));
  // The BOM makes Excel read UTF-8 (₹, Kannada names) correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------------------
// Validation & classification
// ---------------------------------------------------------------------------

export type UrlCheck = { ok: true; value: string } | { ok: false; error: string };

/**
 * Accept only http(s) links. A bare domain gets https:// in front;
 * javascript:, data: and other schemes are rejected.
 */
export function normalizeHttpUrl(input: string, label = 'website'): UrlCheck {
  const trimmed = (input || '').trim();
  if (!trimmed) return { ok: true, value: '' };
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    || /^(javascript|data|vbscript|file|blob|about|mailto|tel|ftp):/i.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: `Enter a valid ${label} address, for example https://yourcompany.com` };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: `The ${label} must start with http:// or https://` };
  }
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return { ok: false, error: `Enter a valid ${label} address, for example https://yourcompany.com` };
  }
  let value = parsed.toString();
  if (parsed.pathname === '/' && !parsed.search && !parsed.hash) value = value.replace(/\/$/, '');
  return { ok: true, value };
}

/** True when a database refusal is about a missing plan, credits or slots. */
export const isPlanOrCreditError = (message: string): boolean =>
  /plan|credit|slot|entitlement|subscription|recharge/i.test(message || '');

/** True when a database refusal is about company verification / profile. */
export const isCompanyVerificationError = (message: string): boolean =>
  /verif|company profile/i.test(message || '');

/** Forget the previous failure so getLastError() never shows a stale reason. */
export function clearLastError(): void {
  SupabaseSync.lastError = '';
}

/** A live job whose 30-day listing period has run out. */
export function isJobExpired(job: Pick<Job, 'status' | 'expiresAt'>): boolean {
  return job.status === 'active' && Boolean(job.expiresAt) && Date.parse(job.expiresAt!) <= Date.now();
}

/** ISO timestamp -> value for <input type="datetime-local"> (local time). */
export function toDateTimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTimeIN(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Candidate lookups
// ---------------------------------------------------------------------------

/**
 * Fetch one driver as this employer may see them (contacts unmasked only
 * when unlocked). Throws the database's reason when search is refused.
 */
export async function fetchCandidateById(driverId: string): Promise<DriverProfile | null> {
  if (DataStore.isDemoMode()) {
    const [local] = DataStore.searchDriversLocally({ userId: driverId, limit: 1 });
    return local || null;
  }
  const [row] = await SupabaseSync.searchDriverCandidates({ userId: driverId, limit: 1 });
  return row || null;
}

/** Run an async mapper over items with a small concurrency limit. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
  onResult?: (item: T, result: R) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index]);
      onResult?.(items[index], results[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Edge functions & Razorpay checkout
// ---------------------------------------------------------------------------

export interface EdgeResult<T> {
  data: T | null;
  /** The function's own { error } message, or a transport error. */
  error: string | null;
  /** HTTP status (0 when the request never reached the function). */
  status: number;
}

export async function invokeEdgeFunction<T>(name: string, body: Record<string, unknown>): Promise<EdgeResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (!error) return { data: data as T, error: null, status: 200 };
    let status = 0;
    let message = '';
    const context = (error as { context?: unknown }).context as Response | undefined;
    if (context && typeof context.status === 'number') {
      status = context.status;
      try {
        const payload = await context.json();
        message = typeof payload?.error === 'string' ? payload.error : '';
      } catch {
        // body was not JSON
      }
    }
    return { data: null, error: message || error.message || 'The request failed. Please try again.', status };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Network error. Check your connection and try again.', status: 0 };
  }
}

export interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { email?: string; contact?: string; name?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string; reason?: string } }) => void) => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let razorpayLoader: Promise<RazorpayConstructor> | null = null;

/** Load https://checkout.razorpay.com/v1/checkout.js once and wait for window.Razorpay. */
export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (razorpayLoader) return razorpayLoader;
  razorpayLoader = new Promise<RazorpayConstructor>((resolve, reject) => {
    const fail = () => {
      razorpayLoader = null;
      script.remove();
      reject(new Error('The payment window could not be loaded. Check your connection and try again.'));
    };
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.driverhubRazorpay = 'true';
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else fail();
    };
    script.onerror = fail;
    document.body.appendChild(script);
  });
  return razorpayLoader;
}
