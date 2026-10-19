import { DirectMessage } from '../types';
import { DataStore } from './store';
import { SupabaseSync } from './supabaseSync';
import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Small helpers for the driver portal and the shared messages page.
 * They sit on top of DataStore / SupabaseSync and never change their APIs.
 */

const STORAGE_EVENT = 'driverhub_storage_updated';

/**
 * Parse a timestamp from the database (ISO), a client-created ISO string, a
 * date-only value (YYYY-MM-DD, read as a local date) or the legacy
 * "YYYY-MM-DD HH:MM" cache format (written from toISOString, so UTC).
 * Returns epoch milliseconds, or null when the value is not a date
 * (e.g. an old "10:30 am" label).
 */
export function parseTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])).getTime();
  }
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}Z`
    : trimmed;
  const time = Date.parse(normalized);
  return Number.isNaN(time) ? null : time;
}

/** "19 Oct 2026, 10:42 am" (en-IN). Unparseable values are shown as they are. */
export function formatDateTime(value?: string | null, fallback = ''): string {
  if (!value) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return formatDate(value, fallback);
  const time = parseTimestamp(value);
  if (time === null) return value;
  return new Date(time).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

/** "19 Oct 2026" (en-IN). */
export function formatDate(value?: string | null, fallback = ''): string {
  if (!value) return fallback;
  const time = parseTimestamp(value);
  if (time === null) return value;
  return new Date(time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Time only for today ("10:42 am"), otherwise "19 Oct" / "19 Oct 2025". */
export function formatShortDateTime(value?: string | null): string {
  const time = parseTimestamp(value);
  if (time === null) return value || '';
  const date = new Date(time);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {})
  });
}

/** Mark the cached incoming messages from one partner as read (no network). */
export function markConversationReadLocally(userId: string, partnerId: string): void {
  DataStore.markMessagesReadLocally(userId, partnerId);
}

/**
 * Mark a conversation's incoming messages read in the database (recipient
 * only), then in the local cache. Returns false when the database refused.
 */
export async function markConversationRead(userId: string, partnerId: string): Promise<boolean> {
  if (!userId || !partnerId) return false;
  if (!DataStore.isDemoMode()) {
    const saved = await SupabaseSync.markMessagesRead(partnerId);
    if (!saved) return false;
  }
  markConversationReadLocally(userId, partnerId);
  return true;
}

/**
 * The driver's own availability exactly as stored. The shared cache maps an
 * unset (NULL) availability to 'Flexible', so the profile form reads the raw
 * value to show "not set" honestly. Returns undefined when it cannot tell
 * (demo mode, offline, no driver row yet).
 */
export async function fetchStoredAvailability(userId: string): Promise<string | null | undefined> {
  if (!userId || DataStore.isDemoMode() || !isSupabaseConfigured) return undefined;
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('availability')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return undefined;
    return (data as { availability?: string | null }).availability ?? null;
  } catch {
    return undefined;
  }
}

export interface AlertPreferences {
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

const DEFAULT_ALERT_PREFERENCES: AlertPreferences = { whatsapp: true, sms: true, email: true };
const alertPreferencesKey = (userId: string) => `driverhub_alert_prefs_${userId}`;

/** Alert preferences have no database column yet; they live in this browser only. */
export function loadAlertPreferences(userId: string): AlertPreferences {
  if (!userId) return { ...DEFAULT_ALERT_PREFERENCES };
  try {
    const raw = localStorage.getItem(alertPreferencesKey(userId));
    if (!raw) return { ...DEFAULT_ALERT_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<AlertPreferences>;
    return {
      whatsapp: typeof parsed.whatsapp === 'boolean' ? parsed.whatsapp : DEFAULT_ALERT_PREFERENCES.whatsapp,
      sms: typeof parsed.sms === 'boolean' ? parsed.sms : DEFAULT_ALERT_PREFERENCES.sms,
      email: typeof parsed.email === 'boolean' ? parsed.email : DEFAULT_ALERT_PREFERENCES.email
    };
  } catch {
    return { ...DEFAULT_ALERT_PREFERENCES };
  }
}

export function saveAlertPreferences(userId: string, preferences: AlertPreferences): boolean {
  if (!userId) return false;
  try {
    localStorage.setItem(alertPreferencesKey(userId), JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
