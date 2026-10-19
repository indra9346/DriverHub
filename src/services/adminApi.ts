/**
 * Admin-portal data helpers that read Supabase directly: the moderation log,
 * the driver document queue, signed document links, the application audit
 * list and a debounced realtime subscription. Everything here relies on the
 * database's admin RLS policies; the UI is not the security boundary.
 */
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { ApplicationStatus, DriverDocument, VerificationStatus } from '../types';

const DOCUMENT_BUCKET = 'driver-documents';
const SIGNED_URL_SECONDS = 300;
export const ADMIN_LIST_LIMIT = 500;

// --------------------------------------------------------------------------
// Moderation log (public.admin_actions)
// --------------------------------------------------------------------------
export type AdminActionTarget = 'job' | 'employer' | 'driver' | 'driver_document';
export type AdminActionName =
  | 'approve' | 'reject' | 'close' | 'block' | 'unblock' | 'verify' | 'unverify';

/**
 * Record a moderation decision. Never throws and never blocks the moderation
 * itself: a failure is logged to the console and reported as `false`.
 */
export async function logAdminAction(entry: {
  targetType: AdminActionTarget;
  targetId: string;
  action: AdminActionName;
  reason?: string;
}): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      console.error('[admin_actions] Not recorded: no signed-in administrator.', authError?.message || '');
      return false;
    }
    const { error } = await supabase.from('admin_actions').insert({
      admin_id: auth.user.id,
      target_type: entry.targetType,
      target_id: entry.targetId,
      action: entry.action,
      reason: entry.reason?.trim() || null
    });
    if (error) {
      console.error(`[admin_actions] Could not record "${entry.action}" on ${entry.targetType} ${entry.targetId}:`, error.message);
      return false;
    }
    return true;
  } catch (cause) {
    console.error('[admin_actions] Could not record the moderation action:', cause);
    return false;
  }
}

// --------------------------------------------------------------------------
// Realtime
// --------------------------------------------------------------------------
/**
 * Call `onChange` once per burst of changes to the given tables. Returns the
 * cleanup function (removes the channel and any pending timer).
 */
export function subscribeToTables(tables: string[], onChange: () => void, debounceMs = 700): () => void {
  if (!isSupabaseConfigured || tables.length === 0) return () => undefined;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, debounceMs);
  };
  let channel = supabase.channel(`admin-${tables.join('-')}-${Math.random().toString(36).slice(2)}`);
  for (const table of tables) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, schedule);
  }
  channel.subscribe();
  return () => {
    if (timer) clearTimeout(timer);
    void supabase.removeChannel(channel);
  };
}

// --------------------------------------------------------------------------
// Driver documents
// --------------------------------------------------------------------------
export type AdminReviewDocument = DriverDocument & {
  driverName: string;
  driverEmail: string;
  driverPhone: string;
  driverCity: string;
  driverState: string;
};

export type DocumentStatusFilter = 'all' | VerificationStatus;
export type DocumentCounts = Record<DocumentStatusFilter, number>;

export class LocalOnlyDocumentError extends Error {
  constructor() {
    super('This file was saved only on the uploader\'s device.');
    this.name = 'LocalOnlyDocumentError';
  }
}

/**
 * The storage path of a document. Rows normally store the path; older rows
 * store a full .../object/public|sign|authenticated/driver-documents/<path>
 * URL, which no longer opens because the bucket is private.
 * Returns null for files that only ever existed in the uploader's browser.
 */
export function extractDriverDocumentPath(fileUrl: string): { path: string } | { url: string } | null {
  const value = (fileUrl || '').trim();
  if (!value || value.startsWith('blob:') || value.startsWith('data:')) return null;
  if (!/^https?:\/\//i.test(value)) return { path: value.replace(/^\/+/, '') };
  try {
    const parsed = new URL(value);
    const marker = `/${DOCUMENT_BUCKET}/`;
    const objectIndex = parsed.pathname.indexOf('/storage/v1/object/');
    const bucketIndex = parsed.pathname.indexOf(marker, objectIndex >= 0 ? objectIndex : 0);
    if (objectIndex >= 0 && bucketIndex >= 0) {
      const path = decodeURIComponent(parsed.pathname.slice(bucketIndex + marker.length));
      if (path) return { path };
    }
  } catch {
    // Not a URL we can parse; fall through and open it as given.
  }
  return { url: value };
}

/** A short-lived link that opens the document. Throws LocalOnlyDocumentError or Error. */
export async function getDriverDocumentViewUrl(fileUrl: string): Promise<string> {
  const target = extractDriverDocumentPath(fileUrl);
  if (!target) throw new LocalOnlyDocumentError();
  if ('url' in target) return target.url;
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(target.path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not open this document.');
  return data.signedUrl;
}

type DriverContact = { name: string; email: string; phone: string; city: string; state: string };
let driverDirectory = new Map<string, DriverContact>();

async function ensureDriverContacts(driverIds: string[]): Promise<Map<string, DriverContact>> {
  if (driverIds.every(id => driverDirectory.has(id))) return driverDirectory;
  // Admin RLS returns every driver profile; filtering by role keeps the URL
  // short however many documents are listed.
  const { data, error } = await supabase.from('profiles')
    .select('id,full_name,email,phone,city,state').eq('role', 'driver');
  if (error) throw new Error(error.message);
  const next = new Map<string, DriverContact>();
  for (const row of data || []) {
    next.set(row.id, {
      name: row.full_name || '', email: row.email || '', phone: row.phone || '',
      city: row.city || '', state: row.state || ''
    });
  }
  driverDirectory = next;
  return driverDirectory;
}

async function countDocuments(status: VerificationStatus): Promise<number> {
  const { count, error } = await supabase.from('driver_documents')
    .select('id', { count: 'exact', head: true }).eq('verification_status', status);
  if (error) throw new Error(error.message);
  return count || 0;
}

/** The newest documents with the given status (filtered in the database) plus per-status counts. */
export async function fetchDocumentQueue(filter: DocumentStatusFilter): Promise<{
  documents: AdminReviewDocument[];
  counts: DocumentCounts;
}> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in with an administrator account to review documents.');

  let query = supabase.from('driver_documents')
    .select('id,driver_id,name,type,file_url,file_size,verification_status,upload_date')
    .order('upload_date', { ascending: false })
    .limit(ADMIN_LIST_LIMIT);
  if (filter !== 'all') query = query.eq('verification_status', filter);

  const [rowsResult, pending, verified, rejected] = await Promise.all([
    query, countDocuments('pending'), countDocuments('verified'), countDocuments('rejected')
  ]);
  if (rowsResult.error) throw new Error(rowsResult.error.message);
  const rows = rowsResult.data || [];
  const contacts = rows.length ? await ensureDriverContacts([...new Set(rows.map((row: any) => row.driver_id))]) : driverDirectory;

  return {
    documents: rows.map((row: any): AdminReviewDocument => {
      const driver = contacts.get(row.driver_id);
      return {
        id: row.id, driverId: row.driver_id, name: row.name || '', type: row.type,
        fileUrl: row.file_url || '', fileSize: row.file_size || undefined,
        uploadDate: row.upload_date || '', verificationStatus: row.verification_status,
        driverName: driver?.name || 'Driver', driverEmail: driver?.email || '',
        driverPhone: driver?.phone || '', driverCity: driver?.city || '', driverState: driver?.state || ''
      };
    }),
    counts: { pending, verified, rejected, all: pending + verified + rejected }
  };
}

// --------------------------------------------------------------------------
// Applications audit
// --------------------------------------------------------------------------
export type AdminApplicationRow = {
  id: string;
  jobId: string;
  driverId: string;
  status: ApplicationStatus;
  appliedDate: string;
  interviewDate?: string;
};

/** The newest applications across all employers and the total count. Throws on failure. */
export async function fetchAdminApplications(): Promise<{ rows: AdminApplicationRow[]; total: number }> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in with an administrator account to view applications.');
  const { data, error, count } = await supabase.from('applications')
    .select('id,job_id,driver_id,status,applied_date,interview_date', { count: 'exact' })
    .order('applied_date', { ascending: false })
    .limit(ADMIN_LIST_LIMIT);
  if (error) throw new Error(error.message);
  const rows = (data || []).map((row: any): AdminApplicationRow => ({
    id: row.id, jobId: row.job_id, driverId: row.driver_id, status: row.status,
    appliedDate: row.applied_date || '', interviewDate: row.interview_date || undefined
  }));
  return { rows, total: count ?? rows.length };
}

// --------------------------------------------------------------------------
// Formatting
// --------------------------------------------------------------------------
/** "19 Oct 2026" (or the Kannada locale's form); the raw value if it is not a date. */
export function formatAdminDate(value: string | undefined, lang: 'en' | 'kn', withTime = false): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = lang === 'kn' ? 'kn-IN' : 'en-IN';
  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return withTime
    ? date.toLocaleString(locale, { ...dateOptions, hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(locale, dateOptions);
}
