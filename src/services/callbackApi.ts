/**
 * Call-back requests: visitors leave a name, mobile number and short message
 * from the support chat, and administrators call them back. Requests are added
 * through the request_driverhub_callback() database function; only active
 * administrators can read or update them (supabase-callback-requests-2026-10.sql).
 */
import { isSupabaseConfigured, supabase } from './supabaseClient';

// Same cap as the other admin lists; not imported from adminApi so the
// public chat does not load the admin helpers.
const ADMIN_LIST_LIMIT = 500;

export type CallbackStatus = 'new' | 'contacted';
export type CallbackFilter = CallbackStatus | 'all';

export interface CallbackRequest {
  id: string;
  name: string;
  phone: string;
  message: string;
  page: string;
  status: CallbackStatus;
  createdAt: string;
  contactedAt?: string;
}

export type CallbackCounts = Record<CallbackFilter, number>;

/** 10-digit Indian mobile number (optionally written with +91, 91 or 0), or null. */
export function normaliseIndianMobile(value: string): string | null {
  const digits = value.replace(/[\s().-]/g, '').replace(/^(\+91|0091|91(?=\d{10}$)|0)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export type CallbackSendResult = 'sent' | 'duplicate' | 'failed';

/** Save a visitor's call-back request. Never throws. */
export async function requestCallback(entry: {
  name: string;
  phone: string;
  message: string;
  page: string;
}): Promise<CallbackSendResult> {
  if (!isSupabaseConfigured) return 'failed';
  try {
    const { error } = await supabase.rpc('request_driverhub_callback', {
      p_name: entry.name,
      p_phone: entry.phone,
      p_message: entry.message,
      p_page: entry.page,
    });
    if (!error) return 'sent';
    console.error('[callback] Request not saved:', error.message);
    return /already have your request/i.test(error.message) ? 'duplicate' : 'failed';
  } catch (e) {
    console.error('[callback] Request not saved:', e);
    return 'failed';
  }
}

const toRequest = (row: Record<string, unknown>): CallbackRequest => ({
  id: String(row.id),
  name: String(row.name || ''),
  phone: String(row.phone || ''),
  message: String(row.message || ''),
  page: String(row.page || ''),
  status: row.status === 'contacted' ? 'contacted' : 'new',
  createdAt: String(row.created_at || ''),
  contactedAt: row.contacted_at ? String(row.contacted_at) : undefined,
});

/** Newest requests for the admin page, with the count for every filter. */
export async function fetchCallbackRequests(filter: CallbackFilter): Promise<{
  requests: CallbackRequest[];
  counts: CallbackCounts;
}> {
  let query = supabase.from('driverhub_callback_requests')
    .select('id,name,phone,message,page,status,created_at,contacted_at')
    .order('created_at', { ascending: false })
    .limit(ADMIN_LIST_LIMIT);
  if (filter !== 'all') query = query.eq('status', filter);

  const countFor = (status: CallbackStatus) => supabase.from('driverhub_callback_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);

  const [list, fresh, called] = await Promise.all([query, countFor('new'), countFor('contacted')]);
  const failure = list.error || fresh.error || called.error;
  if (failure) throw new Error(failure.message);
  const counts = { new: fresh.count || 0, contacted: called.count || 0, all: 0 };
  counts.all = counts.new + counts.contacted;
  return { requests: (list.data || []).map(toRequest), counts };
}

/** Mark a request as called (or back to new). Throws with the database message on failure. */
export async function setCallbackStatus(id: string, status: CallbackStatus): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from('driverhub_callback_requests')
    .update(status === 'contacted'
      ? { status, contacted_at: new Date().toISOString(), contacted_by: auth.user?.id ?? null }
      : { status, contacted_at: null, contacted_by: null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
