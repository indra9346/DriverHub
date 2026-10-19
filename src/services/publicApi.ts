/**
 * Helpers shared by the public pages (home, job search, job detail, companies,
 * password recovery). Kept small and dependency-light because PublicLayout
 * imports it on start-up (see the password recovery tracker below).
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isUuid } from '../lib/ids';
import type { Job, User } from '../types';
import { parseStructuredLocation } from './indiaLocationService';

// ---------------------------------------------------------------------------
// Job categories
// ---------------------------------------------------------------------------

/**
 * Category filters that include related licence categories. Every other filter
 * matches its own category only. Used by the job search, the home page
 * category cards and anything else that counts jobs per category, so the
 * numbers shown always equal the results the link opens.
 */
const CATEGORY_GROUPS: Record<string, string[]> = {
  hmv: ['hmv', 'hmv-transport', 'truck driver', 'trailer driver'],
  lmv: ['lmv', 'lmv-transport', 'personal driver', 'cab driver', 'tempo driver'],
  'commercial driver': ['commercial driver', 'bus driver', 'cab driver', 'lmv-transport']
};

export function categoryMatches(filter: string | undefined | null, jobCategory: string | undefined | null): boolean {
  const wanted = (filter || '').trim().toLowerCase();
  if (!wanted) return true;
  const actual = (jobCategory || '').trim().toLowerCase();
  if (!actual) return false;
  if (actual === wanted) return true;
  return (CATEGORY_GROUPS[wanted] || []).includes(actual);
}

// ---------------------------------------------------------------------------
// Saving jobs
// ---------------------------------------------------------------------------

/**
 * Drivers can save jobs. Visitors who are not signed in are sent to the driver
 * sign-in; employer and admin accounts do not see the save control.
 */
export function getSaveJobMode(user: Pick<User, 'role'> | null | undefined): 'toggle' | 'login' | 'hidden' {
  if (!user) return 'login';
  return user.role === 'driver' ? 'toggle' : 'hidden';
}

// ---------------------------------------------------------------------------
// External links
// ---------------------------------------------------------------------------

/**
 * Returns a safe http(s) URL for a user-entered website, adding https:// when
 * no scheme is given, or null when the value is not a plain web address
 * (javascript:, data:, credentials, no host...).
 */
export function toSafeExternalUrl(raw: string | null | undefined): string | null {
  const value = (raw || '').trim();
  if (!value || /\s/.test(value)) return null;
  const hasScheme =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /^(?:javascript|data|vbscript|mailto|tel|file|blob|about):/i.test(value);
  const candidate = hasScheme ? value : `https://${value.replace(/^\/+/, '')}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname || !url.hostname.includes('.')) return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Short label for a safe URL: host and path without the scheme or trailing slash. */
export function externalUrlLabel(safeUrl: string): string {
  try {
    const url = new URL(safeUrl);
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
    return `${url.host}${path}`;
  } catch {
    return safeUrl;
  }
}

// ---------------------------------------------------------------------------
// Single job lookup (job detail page cache miss)
// ---------------------------------------------------------------------------

export interface PublicJobLookup {
  job: Job;
  employerVerified: boolean;
}

/**
 * Loads one job straight from Supabase when it is not in the local cache yet
 * (shared link, first visit, cache cleared). Row-level security decides what
 * the visitor may see. Returns null when the job does not exist or is hidden.
 */
export async function fetchPublicJobById(id: string): Promise<PublicJobLookup | null> {
  if (!isSupabaseConfigured || !id || !isUuid(id)) return null;
  const { data: row, error } = await supabase.from('jobs').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  let company: any = null;
  if (row.employer_id) {
    const { data } = await supabase
      .from('companies')
      .select('user_id,company_name,logo_url,contact_person,verified')
      .eq('user_id', row.employer_id)
      .maybeSingle();
    company = data;
  }

  const parsedLoc = parseStructuredLocation(row.location, row.state, row.district, row.city, row.pincode);
  const job: Job = {
    id: row.id,
    employerId: row.employer_id,
    companyName: row.company_name || company?.company_name || 'Employer',
    companyLogo: row.company_logo || company?.logo_url || undefined,
    postedBy: row.posted_by || company?.contact_person || undefined,
    title: row.title || '',
    category: row.category,
    location: row.location || parsedLoc.formattedLocation || '',
    city: row.city || parsedLoc.city || '',
    district: row.district || parsedLoc.district || undefined,
    state: row.state || parsedLoc.state || '',
    pincode: row.pincode || parsedLoc.pincode || undefined,
    experienceRequired: row.experience_required || '',
    experienceMinYears: row.experience_min_years || 0,
    salaryMin: Number(row.salary_min || 0),
    salaryMax: Number(row.salary_max || 0),
    salaryType: row.salary_type || 'monthly',
    workingHours: row.working_hours || '',
    employmentType: row.employment_type || 'Full-time',
    description: row.description || '',
    requiredSkills: row.required_skills || [],
    requiredDocs: row.required_docs || [],
    routeType: row.route_type || undefined,
    vehicleType: row.vehicle_type || undefined,
    payType: row.pay_type || undefined,
    perks: row.perks || [],
    nightShift: Boolean(row.night_shift),
    workLocationType: row.work_location_type || undefined,
    joiningFeeRequired: Boolean(row.joining_fee_required),
    screeningQuestions: row.screening_questions || [],
    vacancies: row.vacancies || 1,
    status: row.status,
    postedDate: row.posted_date || '',
    applicationDeadline: row.application_deadline || undefined,
    creditConsumed: Boolean(row.credit_consumed),
    slotConsumed: Boolean(row.slot_consumed),
    expiresAt: row.expires_at || undefined
  };
  return { job, employerVerified: Boolean(company?.verified) };
}

// ---------------------------------------------------------------------------
// Password recovery session tracking
// ---------------------------------------------------------------------------

/*
 * Supabase handles the recovery link while the client starts (before the lazily
 * loaded reset page mounts) and then removes the tokens from the URL, so the
 * page could miss both the URL hint and the PASSWORD_RECOVERY event. This
 * module is imported by PublicLayout on start-up, records the hint and listens
 * for the event, and remembers it for this tab until the recovery ends.
 */
const RECOVERY_FLAG_KEY = 'driverhub_password_recovery';

const readRecoveryFlag = (): boolean => {
  try {
    return sessionStorage.getItem(RECOVERY_FLAG_KEY) === '1';
  } catch {
    return false;
  }
};

const writeRecoveryFlag = (active: boolean) => {
  try {
    if (active) sessionStorage.setItem(RECOVERY_FLAG_KEY, '1');
    else sessionStorage.removeItem(RECOVERY_FLAG_KEY);
  } catch {
    // ignore
  }
};

const readUrlParams = (): { type: string; error: string } => {
  if (typeof window === 'undefined') return { type: '', error: '' };
  try {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return {
      type: hash.get('type') || query.get('type') || '',
      error: hash.get('error_description') || query.get('error_description') || ''
    };
  } catch {
    return { type: '', error: '' };
  }
};

const initialUrl = readUrlParams();
let recoveryActive = readRecoveryFlag() || initialUrl.type === 'recovery';
const initialRecoveryError = initialUrl.error;
if (recoveryActive) writeRecoveryFlag(true);
const recoveryListeners = new Set<(active: boolean) => void>();

const setRecoveryActive = (active: boolean) => {
  if (recoveryActive === active) return;
  recoveryActive = active;
  writeRecoveryFlag(active);
  recoveryListeners.forEach(listener => listener(active));
};

if (isSupabaseConfigured && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(event => {
    if (event === 'PASSWORD_RECOVERY') setRecoveryActive(true);
    else if (event === 'SIGNED_OUT') setRecoveryActive(false);
  });
}

/** Whether this tab holds a real password recovery session (link or code). */
export function isPasswordRecoveryActive(): boolean {
  return recoveryActive;
}

/** The error Supabase put in the recovery link, if any (expired, already used...). */
export function getInitialRecoveryError(): string {
  return initialRecoveryError;
}

export function subscribePasswordRecovery(listener: (active: boolean) => void): () => void {
  recoveryListeners.add(listener);
  return () => {
    recoveryListeners.delete(listener);
  };
}

/** Marks a recovery verified with an emailed code (verifyOtp type 'recovery'). */
export function markPasswordRecoveryStarted(): void {
  setRecoveryActive(true);
}

export function endPasswordRecovery(): void {
  setRecoveryActive(false);
}
