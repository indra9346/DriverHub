import { isSupabaseConfigured, supabase } from './supabaseClient';
import { Job, Application, DriverProfile, EmployerProfile, User, DriverDocument, DirectMessage, SavedSearch, DriverExperience } from '../types';
import { parseStructuredLocation, calculateHaversineDistanceKm, matchesPanIndiaLocationFilter } from './indiaLocationService';
import { newId } from '../lib/ids';

// Helper to convert any string ID to a valid deterministic UUID
export function toUUID(id: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  // Create a reproducible 32-char hex string from input
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const tail = '0000-4000-8000-' + hex.padStart(12, '0');
  return `00000000-${tail}`;
}

const DEMO_AUTH_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true';
const DEMO_DATA_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

/** Drop undefined keys so a partial save never overwrites unrelated columns. */
function definedOnly<T extends Record<string, unknown>>(payload: T): Partial<T> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>;
}

/** '' -> null for optional text columns; undefined stays undefined (not sent). */
const textOrNull = (value: string | undefined | null) => value === undefined ? undefined : (value?.trim() ? value.trim() : null);

/** Accepts YYYY-MM-DD, YYYY-MM or any parseable date; returns YYYY-MM-DD or null. */
function toDateOnly(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

const isMissingColumnError = (error: any) =>
  Boolean(error) && (error.code === 'PGRST204' || error.code === '42703' || /column .* does not exist|Could not find the '.*' column/i.test(error.message || ''));

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/** Turn a PostgREST/Postgres error into a sentence a user can act on. */
function friendlyError(error: any, fallback: string): string {
  const message: string = error?.message || '';
  if (!message) return fallback;
  if (error?.code === '23505') return 'This record already exists.';
  if (error?.code === '42501' || /permission denied/i.test(message)) return 'DriverHub could not access this data. Please sign in again; if it continues, contact support.';
  if (/JWT|session/i.test(message)) return 'Your session has expired. Please sign in again.';
  if (/fetch|network/i.test(message)) return 'Network error. Check your connection and try again.';
  return message;
}

let refreshInFlight: Promise<void> | null = null;
let refreshQueued = false;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export const SupabaseSync = {
  /** Last user-facing error from a failed write; read through DataStore.getLastError(). */
  lastError: '' as string,

  fail(error: any, fallback: string): false {
    this.lastError = friendlyError(error, fallback);
    if (error) console.warn(fallback, error?.message || error);
    return false;
  },

  /**
   * Debounced, single-flight refresh used by realtime events: many table
   * changes in a burst cause one refetch, and an older response can never
   * overwrite a newer one because only one fetch runs at a time.
   */
  scheduleRefresh(dataStore: any, onDone?: () => void, delayMs = 400) {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void this.fetchAndMergeRemoteData(dataStore).then(() => onDone?.());
    }, delayMs);
  },

  async fetchPublicEmployerDirectory(): Promise<Array<{ employer: EmployerProfile; activeVacancyCount: number }>> {
    if (!isSupabaseConfigured) throw new Error('The public employer directory is not connected to Supabase.');

    const { data: companyRows, error: companyError } = await supabase
      .from('companies')
      .select('user_id,company_name,industry,location,city,state,website,logo_url,description,verified,status,created_at')
      .eq('verified', true)
      .eq('status', 'active')
      .order('company_name', { ascending: true });
    if (companyError) throw new Error(`Could not load verified employers: ${companyError.message}`);

    const companies = companyRows || [];
    if (!companies.length) return [];

    const employerIds = companies.map((row: any) => row.user_id).filter(Boolean);
    const now = new Date().toISOString();
    const { data: activeJobRows, error: jobsError } = await supabase
      .from('jobs')
      .select('employer_id,vacancies')
      .in('employer_id', employerIds)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .or(`application_deadline.is.null,application_deadline.gte.${now}`);
    if (jobsError) throw new Error(`Could not load live vacancy counts: ${jobsError.message}`);

    const counts = new Map<string, number>();
    for (const row of activeJobRows || []) {
      const vacancies = Math.max(0, Number(row.vacancies) || 1);
      counts.set(row.employer_id, (counts.get(row.employer_id) || 0) + vacancies);
    }

    return companies.map((row: any) => {
      const parsed = parseStructuredLocation(row.location, row.state, row.district, row.city, row.pincode);
      return {
        employer: {
          id: row.user_id,
          companyName: row.company_name || '',
          contactPerson: '',
          email: '',
          phone: '',
          industry: row.industry || '',
          location: row.location || row.city || '',
          city: row.city || parsed.city || '',
          district: row.district || parsed.district || undefined,
          state: row.state || parsed.state || '',
          pincode: row.pincode || parsed.pincode || undefined,
          address: '',
          website: row.website || '',
          logoUrl: row.logo_url || '',
          description: row.description || '',
          gstin: '',
          verified: Boolean(row.verified),
          status: row.status || 'active',
          createdAt: row.created_at?.slice(0, 10) || ''
        },
        activeVacancyCount: counts.get(row.user_id) || 0
      };
    });
  },

  subscribeToPublicEmployerDirectory(onChange: () => void) {
    if (!isSupabaseConfigured) return () => undefined;
    const channel = supabase
      .channel(`public-employer-directory-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, onChange)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },

  async fetchPublicMarketplaceStats(): Promise<{ verifiedDrivers: number; verifiedEmployers: number; activeVacancies: number; hires: number; vacanciesByCategory: Record<string, number> } | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase.rpc('get_driverhub_public_stats');
      if (!error && data && typeof data === 'object') {
        const stats = data as Record<string, unknown>;
        const values = [stats.verifiedDrivers, stats.verifiedEmployers, stats.activeVacancies, stats.hires];
        if (
          !values.some(value => typeof value !== 'number' || !Number.isFinite(value)) &&
          stats.vacanciesByCategory &&
          typeof stats.vacanciesByCategory === 'object' &&
          !Array.isArray(stats.vacanciesByCategory)
        ) {
          const vacanciesByCategory = Object.fromEntries(
            Object.entries(stats.vacanciesByCategory as Record<string, unknown>)
              .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
          );
          return {
            verifiedDrivers: stats.verifiedDrivers as number,
            verifiedEmployers: stats.verifiedEmployers as number,
            activeVacancies: stats.activeVacancies as number,
            hires: stats.hires as number,
            vacanciesByCategory
          };
        }
      }
    } catch {
      // Fallback to direct queries below if RPC is unavailable
    }

    try {
      const now = new Date().toISOString();
      const [
        { data: activeJobs },
        { count: verifiedEmpCount },
        { count: driverCount },
        { count: hiresCount }
      ] = await Promise.all([
        supabase
          .from('jobs')
          .select('category,vacancies,status,expires_at,application_deadline')
          .eq('status', 'active'),
        supabase
          .from('companies')
          .select('user_id', { count: 'exact', head: true })
          .eq('verified', true)
          .eq('status', 'active'),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'driver')
          .eq('status', 'active'),
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'hired')
      ]);

      const vacanciesByCategory: Record<string, number> = {};
      let activeVacancies = 0;
      for (const row of activeJobs || []) {
        if (row.expires_at && row.expires_at <= now) continue;
        if (row.application_deadline && row.application_deadline < now.slice(0, 10)) continue;
        const count = Math.max(1, Number(row.vacancies) || 1);
        activeVacancies += count;
        const key = String(row.category || '').trim().toLowerCase();
        if (key) {
          vacanciesByCategory[key] = (vacanciesByCategory[key] || 0) + count;
        }
      }

      return {
        verifiedDrivers: driverCount ?? 0,
        verifiedEmployers: verifiedEmpCount ?? 0,
        activeVacancies,
        hires: hiresCount ?? 0,
        vacanciesByCategory
      };
    } catch (error) {
      console.warn('Could not load live public marketplace statistics:', error);
      return {
        verifiedDrivers: 0,
        verifiedEmployers: 0,
        activeVacancies: 0,
        hires: 0,
        vacanciesByCategory: {}
      };
    }
  },

  subscribeToPublicMarketplaceStats(onChange: () => void) {
    if (!isSupabaseConfigured) return () => undefined;
    const channel = supabase
      .channel(`public-marketplace-stats-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_profiles' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_documents' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, onChange)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },

  async updateAdminJobStatus(jobId: string, status: Job['status']): Promise<boolean> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return false;
    const { data: actor, error: actorError } = await supabase.from('profiles').select('role')
      .eq('id', authData.user.id).maybeSingle();
    if (actorError || actor?.role !== 'admin') return false;

    const { data: job, error: jobError } = await supabase.from('jobs').select('status')
      .eq('id', toUUID(jobId)).maybeSingle();
    if (jobError || !job) return false;
    const allowed: Record<Job['status'], Job['status'][]> = {
      draft: ['pending', 'active', 'closed'], pending: ['active', 'rejected', 'closed'],
      active: ['closed'], closed: ['active'], rejected: []
    };
    if (job.status !== status && !allowed[job.status as Job['status']]?.includes(status)) return false;
    if (job.status === status) return true;

    const { data, error } = await supabase.from('jobs').update({ status })
      .eq('id', toUUID(jobId)).eq('status', job.status).select('id').maybeSingle();
    if (error) return this.fail(error, 'Could not update this job.');
    if (!data?.id) return this.fail(null, 'This job changed in the meantime. Refresh and try again.');
    return true;
  },

  /** Employer status change (publish / close / re-open). Returns the saved status. */
  async updateEmployerJobStatus(jobId: string, status: Job['status']): Promise<Job['status'] | null> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { this.fail(null, 'Your session has expired. Please sign in again.'); return null; }
      const { data, error } = await supabase.from('jobs').update({ status })
        .eq('id', toUUID(jobId)).eq('employer_id', authData.user.id).select('id,status').maybeSingle();
      if (error) { this.fail(error, 'Could not update this job.'); return null; }
      if (!data?.id) { this.fail(null, 'This job could not be found in your account.'); return null; }
      return data.status as Job['status'];
    } catch (e) {
      this.fail(e, 'Could not update this job.');
      return null;
    }
  },

  async getAdminJobs(): Promise<Job[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Sign in with an administrator account to review jobs.');
    const { data: actor, error: actorError } = await supabase.from('profiles').select('role')
      .eq('id', authData.user.id).maybeSingle();
    if (actorError || actor?.role !== 'admin') throw new Error('Administrator access is required to review jobs.');

    const { data: rows, error } = await supabase.from('jobs').select('*').order('posted_date', { ascending: false });
    if (error) throw new Error(error.message);
    const employerIds = [...new Set((rows || []).map((row: any) => row.employer_id).filter(Boolean))];
    const { data: companies, error: companiesError } = employerIds.length
      ? await supabase.from('companies').select('user_id,company_name,logo_url,contact_person').in('user_id', employerIds)
      : { data: [], error: null };
    if (companiesError) throw new Error(companiesError.message);
    const companyById = new Map((companies || []).map((company: any) => [company.user_id, company]));
    return (rows || []).map((row: any): Job => {
      const company = companyById.get(row.employer_id) as any;
      return {
        id: row.id, employerId: row.employer_id,
        companyName: row.company_name || company?.company_name || 'Employer',
        companyLogo: row.company_logo || company?.logo_url || undefined,
        postedBy: row.posted_by || company?.contact_person || undefined,
        title: row.title, category: row.category, location: row.location,
        city: row.city || '', state: row.state || '', experienceRequired: row.experience_required || '',
        experienceMinYears: row.experience_min_years || 0, salaryMin: Number(row.salary_min || 0),
        salaryMax: Number(row.salary_max || 0), salaryType: row.salary_type || 'monthly',
        workingHours: row.working_hours || '', employmentType: row.employment_type || 'Full-time',
        description: row.description || '', requiredSkills: row.required_skills || [],
        requiredDocs: row.required_docs || [], routeType: row.route_type || undefined,
        vehicleType: row.vehicle_type || undefined, payType: row.pay_type || undefined,
        perks: row.perks || [], nightShift: Boolean(row.night_shift),
        workLocationType: row.work_location_type || undefined,
        joiningFeeRequired: Boolean(row.joining_fee_required), screeningQuestions: row.screening_questions || [],
        vacancies: row.vacancies || 1, status: row.status, postedDate: row.posted_date || '',
        applicationDeadline: row.application_deadline || undefined,
        creditConsumed: Boolean(row.credit_consumed), slotConsumed: Boolean(row.slot_consumed),
        expiresAt: row.expires_at || undefined
      };
    });
  },

  async getAdminDocumentQueue(): Promise<Array<DriverDocument & {
    driverName: string; driverEmail: string; driverPhone: string; driverCity: string; driverState: string;
  }>> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Sign in with an administrator account to review documents.');
    const { data: actor, error: actorError } = await supabase.from('profiles').select('role')
      .eq('id', authData.user.id).maybeSingle();
    if (actorError || actor?.role !== 'admin') throw new Error('Administrator access is required to review driver documents.');

    const { data: documentRows, error: documentError } = await supabase.from('driver_documents').select('*')
      .order('upload_date', { ascending: false });
    if (documentError) throw new Error(documentError.message);
    // Admin RLS returns every driver profile; a long .in() list could exceed URL limits.
    const { data: profileRows, error: profileError } = (documentRows || []).length
      ? await supabase.from('profiles').select('id,full_name,email,phone,city,state').eq('role', 'driver')
      : { data: [], error: null };
    if (profileError) throw new Error(profileError.message);
    const profileById = new Map((profileRows || []).map((row: any) => [row.id, row]));
    return (documentRows || []).map((row: any) => {
      const driver = profileById.get(row.driver_id) as any;
      return {
        id: row.id, driverId: row.driver_id, name: row.name, type: row.type,
        fileUrl: row.file_url, fileSize: row.file_size || undefined,
        uploadDate: row.upload_date?.slice(0, 10) || '', verificationStatus: row.verification_status,
        driverName: driver?.full_name || 'Driver', driverEmail: driver?.email || '',
        driverPhone: driver?.phone || '', driverCity: driver?.city || '', driverState: driver?.state || ''
      };
    });
  },

  async reviewDriverDocument(documentId: string, status: 'verified' | 'rejected'): Promise<boolean> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return false;
      const { data: actor } = await supabase.from('profiles').select('role')
        .eq('id', authData.user.id).maybeSingle();
      if (actor?.role !== 'admin') return false;
      const { error } = await supabase.rpc('review_driverhub_document', {
        p_document_id: toUUID(documentId), p_status: status
      });
      if (error) return this.fail(error, 'Could not save the document review.');
      return true;
    } catch (e) {
      console.warn('Supabase reviewDriverDocument error:', e);
      return false;
    }
  },

  async updateEmployerBillingProfile(employerId: string, billing: {
    gstin: string; billingCompanyName: string; billingAddress: string;
  }): Promise<boolean> {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== toUUID(employerId)) return false;
      const { error } = await supabase.rpc('update_driverhub_billing_profile', {
        p_gstin: billing.gstin,
        p_billing_company_name: billing.billingCompanyName,
        p_billing_address: billing.billingAddress
      });
      if (error) return this.fail(error, 'Could not save the billing profile.');
      return true;
    } catch (e) {
      console.warn('Supabase billing profile update error:', e);
      return false;
    }
  },

  /**
   * Search the driver database through the secured RPC. Throws an Error with a
   * user-facing message when the database refuses (no plan, company not yet
   * verified, signed out) so the page can explain why nothing is shown.
   */
  async searchDriverCandidates(filters: {
    keyword?: string; category?: string; city?: string; district?: string; state?: string; pincode?: string;
    latitude?: number; longitude?: number; radiusKm?: number;
    minExperience?: number; skill?: string; vehicleType?: string; userId?: string; activeInDays?: number; limit?: number;
  }): Promise<DriverProfile[]> {
    if (!isSupabaseConfigured) return [];
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) throw new Error('Sign in as an employer to search the driver database.');

    let data: any[] | null = null;
    let error: any = null;
    const hasCoords = typeof filters.latitude === 'number' && !isNaN(filters.latitude)
      && typeof filters.longitude === 'number' && !isNaN(filters.longitude);
    const radius = typeof filters.radiusKm === 'number' && filters.radiusKm > 0 ? filters.radiusKm : null;
    // A radius search is centred on the chosen place; the text location
    // filters would otherwise exclude nearby towns inside the radius.
    const useRadius = hasCoords && radius !== null;

    const rpcTry1 = await supabase.rpc('search_driverhub_candidates', {
      p_keyword: filters.keyword?.trim() || null,
      p_category: filters.category || null,
      p_city: useRadius ? null : filters.city || null,
      p_district: useRadius ? null : filters.district || null,
      p_state: useRadius ? null : filters.state || null,
      p_pincode: useRadius ? null : filters.pincode || null,
      p_lat: hasCoords ? filters.latitude : null,
      p_lng: hasCoords ? filters.longitude : null,
      p_radius_km: useRadius ? radius : null,
      p_min_years: filters.minExperience || 0,
      p_skill: filters.skill?.trim() || null,
      p_vehicle_type: filters.vehicleType || null,
      p_user_id: filters.userId || null,
      p_active_in_days: filters.activeInDays || null,
      p_limit: Math.min(Math.max(filters.limit || 100, 1), 250),
      p_offset: 0
    });

    if (!rpcTry1.error) {
      data = rpcTry1.data;
    } else if (rpcTry1.error.code === 'PGRST202') {
      // The radius-search migration has not been applied: use the older signature.
      const rpcTry2 = await supabase.rpc('search_driverhub_candidates', {
        p_keyword: filters.keyword?.trim() || null,
        p_category: filters.category || null,
        p_city: filters.city || null,
        p_state: filters.state || null,
        p_min_years: filters.minExperience || 0,
        p_skill: filters.skill?.trim() || null,
        p_vehicle_type: filters.vehicleType || null,
        p_user_id: filters.userId || null,
        p_active_in_days: filters.activeInDays || null,
        p_limit: Math.min(Math.max(filters.limit || 100, 1), 250),
        p_offset: 0
      });
      data = rpcTry2.data;
      error = rpcTry2.error;
    } else {
      error = rpcTry1.error;
    }

    if (error) throw new Error(friendlyError(error, 'The driver database could not be searched.'));

    let list = (data || []).map((row: any): DriverProfile => {
      let lat = typeof row.latitude === 'number' ? row.latitude : (row.latitude ? parseFloat(row.latitude) : undefined);
      let lng = typeof row.longitude === 'number' ? row.longitude : (row.longitude ? parseFloat(row.longitude) : undefined);
      let dist = typeof row.distance_km === 'number' ? row.distance_km : (row.distance_km ? parseFloat(row.distance_km) : undefined);

      const rawLoc = row.location || [row.city, row.district, row.state].filter(Boolean).join(', ');
      const parsed = parseStructuredLocation(rawLoc, row.state, row.district, row.city, row.pincode, lat, lng);

      const resolvedCity = parsed.city || row.city || '';
      const resolvedDistrict = parsed.district || row.district || undefined;
      const resolvedState = parsed.state || row.state || '';
      const resolvedPin = parsed.pincode || row.pincode || undefined;

      if (dist === undefined && typeof filters.latitude === 'number' && typeof filters.longitude === 'number' && lat !== undefined && lng !== undefined) {
        dist = calculateHaversineDistanceKm(filters.latitude, filters.longitude, lat, lng);
      }

      return {
        id: row.user_id,
        fullName: row.full_name || 'Driver',
        phone: row.phone || '',
        email: row.email || '',
        location: parsed.formattedLocation || rawLoc,
        city: resolvedCity,
        district: resolvedDistrict,
        state: resolvedState,
        pincode: resolvedPin,
        latitude: lat ?? parsed.latitude,
        longitude: lng ?? parsed.longitude,
        distanceKm: dist,
        driverCategory: row.driver_category || '',
        licenseNumber: row.license_number || '',
        licenseType: row.license_type || '',
        licenseExpiry: row.license_expiry || '',
        experienceYears: row.years_experience || 0,
        experienceMonths: row.months_experience || 0,
        skills: row.skills || [],
        languages: row.languages || [],
        vehicleTypes: row.vehicle_types || [],
        currentRole: row.current_role || '',
        education: row.education || '',
        preferredLocation: row.preferred_location
          ? (parseStructuredLocation(row.preferred_location).formattedLocation || row.preferred_location)
          : parsed.formattedLocation,
        expectedSalary: row.expected_salary || 0,
        availability: row.availability || 'Flexible',
        cvAttached: Boolean(row.cv_attached),
        policeVerified: Boolean(row.police_verified),
        lastActive: row.last_active || undefined,
        bio: row.bio || '',
        resumeUrl: row.resume_url || undefined,
        status: 'active',
        documents: []
      };
    });

    if (useRadius) {
      list = list.filter(d => typeof d.distanceKm === 'number' && d.distanceKm <= radius!);
    } else if (filters.state || filters.district || filters.city || filters.pincode) {
      list = list.filter(d =>
        matchesPanIndiaLocationFilter(d, {
          state: filters.state,
          district: filters.district,
          city: filters.city,
          pincode: filters.pincode
        })
      );
    }

    if (typeof filters.latitude === 'number' && typeof filters.longitude === 'number') {
      list.sort((a, b) => {
        if (typeof a.distanceKm === 'number' && typeof b.distanceKm === 'number') {
          return a.distanceKm - b.distanceKm;
        }
        if (typeof a.distanceKm === 'number') return -1;
        if (typeof b.distanceKm === 'number') return 1;
        return 0;
      });
    }

    return list;
  },

  async syncFavorite(driverId: string, jobId: string, saved: boolean): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(driverId)) return this.fail(null, 'Your session has expired. Please sign in again.');
      const query = supabase.from('favorite_jobs');
      const { error } = saved
        ? await query.upsert({ driver_id: authData.user.id, job_id: toUUID(jobId) }, { onConflict: 'driver_id,job_id' })
        : await query.delete().eq('driver_id', authData.user.id).eq('job_id', toUUID(jobId));
      if (error) return this.fail(error, 'Could not update saved jobs.');
      return true;
    } catch (e) {
      return this.fail(e, 'Could not update saved jobs.');
    }
  },

  async uploadDriverDocument(driverId: string, file: File, type: DriverDocument['type']): Promise<DriverDocument> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || authData.user.id !== toUUID(driverId)) {
      throw new Error('Sign in to your driver account before uploading documents.');
    }
    const id = newId();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${authData.user.id}/${id}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from('driver-documents').upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false
    });
    if (uploadError) throw new Error(uploadError.message);

    const doc: DriverDocument = {
      id,
      driverId: authData.user.id,
      name: file.name,
      type,
      fileUrl: path,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadDate: new Date().toISOString().slice(0, 10),
      verificationStatus: 'pending'
    };
    const { error: rowError } = await supabase.from('driver_documents').insert({
      id, driver_id: authData.user.id, name: doc.name, type: doc.type,
      file_url: path, file_size: doc.fileSize, verification_status: 'pending'
    });
    if (rowError) {
      await supabase.storage.from('driver-documents').remove([path]);
      throw new Error(rowError.message);
    }
    return doc;
  },

  async deleteDriverDocument(driverId: string, doc: DriverDocument): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(driverId)) return false;
      const { error: rowError } = await supabase.from('driver_documents').delete()
        .eq('id', toUUID(doc.id)).eq('driver_id', authData.user.id);
      if (rowError) throw rowError;
      if (doc.fileUrl && !doc.fileUrl.startsWith('blob:') && !doc.fileUrl.startsWith('data:')) {
        const { error: fileError } = await supabase.storage.from('driver-documents').remove([doc.fileUrl]);
        if (fileError) console.warn('Supabase document file removal error:', fileError.message);
      }
      return true;
    } catch (e) {
      console.warn('Supabase deleteDriverDocument error:', e);
      return false;
    }
  },

  async getDriverDocumentUrl(filePath: string): Promise<string> {
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('blob:')) return filePath;
    const { data, error } = await supabase.storage.from('driver-documents').createSignedUrl(filePath, 60);
    if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not open this document.');
    return data.signedUrl;
  },

  async getEmployerApplicantDocuments(driverId: string, jobId: string): Promise<DriverDocument[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error('Sign in as an employer to view applicant documents.');
    const employerId = authData.user.id;

    const [{ data: employer }, { data: plan }, { data: job }, { data: application }] = await Promise.all([
      supabase.from('profiles').select('role,status').eq('id', employerId).maybeSingle(),
      supabase.from('employer_subscriptions').select('status,expires_at').eq('employer_id', employerId).maybeSingle(),
      supabase.from('jobs').select('id').eq('id', toUUID(jobId)).eq('employer_id', employerId).maybeSingle(),
      supabase.from('applications').select('id').eq('job_id', toUUID(jobId)).eq('driver_id', toUUID(driverId)).maybeSingle()
    ]);
    if (employer?.role !== 'employer' || employer.status !== 'active') {
      throw new Error('An active employer account is required to view documents.');
    }
    if (!plan || plan.status !== 'active' || !plan.expires_at || new Date(plan.expires_at).getTime() <= Date.now()) {
      throw new Error('An active hiring subscription is required to view driver documents.');
    }
    if (!job || !application) throw new Error('You can view documents only for a driver who applied to your job.');

    const { data: rows, error } = await supabase.from('driver_documents').select('*')
      .eq('driver_id', toUUID(driverId)).order('upload_date', { ascending: false });
    if (error) throw new Error(error.message);

    return await Promise.all((rows || []).map(async (row: any) => {
      const path = String(row.file_url || '');
      if (!path || path.startsWith('blob:') || path.startsWith('data:')) return null;
      const { data: signed, error: signError } = await supabase.storage.from('driver-documents').createSignedUrl(path, 60);
      if (signError || !signed?.signedUrl) return null;
      return {
        id: row.id, driverId: row.driver_id, name: row.name, type: row.type,
        fileUrl: signed.signedUrl, fileSize: row.file_size || undefined,
        uploadDate: row.upload_date?.slice(0, 10) || '',
        verificationStatus: row.verification_status
      } as DriverDocument;
    })).then(documents => documents.filter((document): document is DriverDocument => Boolean(document)));
  },

  // Create a job, or save edits to an existing one (status changes go through
  // updateEmployerJobStatus / updateAdminJobStatus).
  async syncJob(job: Job, _employer?: EmployerProfile): Promise<boolean> {
    try {
      if (!job.employerId) return this.fail(null, 'This job has no employer.');
      const employerUUID = toUUID(job.employerId);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return DEMO_AUTH_ENABLED || this.fail(null, 'Your session has expired. Please sign in again.');
      const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
      const isAdmin = currentProfile?.role === 'admin';
      if (authData.user.id !== employerUUID && !isAdmin) return this.fail(null, 'You can only edit your own company jobs.');
      const { data: company } = await supabase.from('companies').select('company_name,logo_url,contact_person').eq('user_id', employerUUID).maybeSingle();
      if (!company && !isAdmin) return this.fail(null, 'Complete your company profile before posting a job.');

      const salaryMin = Math.max(0, Math.round(Number(job.salaryMin) || 0));
      const salaryMax = Math.max(salaryMin, Math.round(Number(job.salaryMax) || 0));
      const payload: Record<string, unknown> = {
        id: toUUID(job.id),
        employer_id: employerUUID,
        company_name: job.companyName?.trim() || company?.company_name || 'DriverHub Employer',
        company_logo: job.companyLogo || company?.logo_url || null,
        posted_by: job.postedBy || company?.contact_person || null,
        title: job.title,
        category: job.category,
        location: job.location,
        city: job.city || '',
        district: job.district || null,
        state: job.state || '',
        pincode: job.pincode || null,
        experience_required: job.experienceRequired,
        // 0 is a real value (freshers welcome); only a missing value gets a default.
        experience_min_years: Math.max(0, Math.round(Number(job.experienceMinYears ?? 0) || 0)),
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_type: job.salaryType || 'monthly',
        working_hours: job.workingHours || 'Full-time',
        employment_type: job.employmentType || 'Full-time',
        description: job.description,
        required_skills: job.requiredSkills || [],
        required_docs: job.requiredDocs || [],
        pay_type: job.payType || 'Fixed Only',
        perks: job.perks || [],
        night_shift: Boolean(job.nightShift),
        vehicle_type: job.vehicleType || null,
        route_type: job.routeType || 'Local City',
        work_location_type: job.workLocationType || 'Work From Depot / Office',
        joining_fee_required: Boolean(job.joiningFeeRequired),
        screening_questions: job.screeningQuestions || [],
        vacancies: Math.max(1, Math.round(Number(job.vacancies) || 1)),
        application_deadline: job.applicationDeadline || null,
        status: job.status || 'pending'
      };
      const { data: existing } = await supabase.from('jobs').select('id').eq('id', payload.id).maybeSingle();
      if (isAdmin && !existing) return this.fail(null, 'Administrators can only edit existing jobs.');
      const write = async (body: Record<string, unknown>) => {
        if (existing) {
          const { id: _id, employer_id: _owner, status: _status, ...changes } = body;
          return supabase.from('jobs').update(changes).eq('id', payload.id).select('id').maybeSingle();
        }
        return supabase.from('jobs').insert(body).select('id').maybeSingle();
      };
      let result = await write(payload);
      if (result.error && isMissingColumnError(result.error)) {
        const { district: _d, pincode: _p, ...legacy } = payload;
        result = await write(legacy);
      }
      if (result.error) return this.fail(result.error, 'Could not save this job.');
      if (!result.data?.id) return this.fail(null, 'Could not save this job.');
      return true;
    } catch (e) {
      return this.fail(e, 'Could not save this job.');
    }
  },

  // Submit a new application. The database sets the initial status and dates.
  async syncApplication(app: Application) {
    try {
      const driverUUID = toUUID(app.driverId);
      const jobUUID = toUUID(app.jobId);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return DEMO_AUTH_ENABLED || this.fail(null, 'Your session has expired. Please sign in again.');
      if (authData.user.id !== driverUUID) return this.fail(null, 'Sign in with your driver account to apply.');

      const { error } = await supabase.from('applications').insert({
        id: toUUID(app.id),
        job_id: jobUUID,
        driver_id: driverUUID,
        cover_message: app.coverMessage || '',
        resume_url: app.resumeUrl || null,
        status: 'applied'
      });
      if (error) {
        if (error.code === '23505') return this.fail(null, 'You have already applied to this job.');
        return this.fail(error, 'We could not submit your application.');
      }
      return true;
    } catch (e) {
      return this.fail(e, 'We could not submit your application.');
    }
  },

  /**
   * Save the signed-in user's own profile (registration, profile pages).
   * Only fields present on profileData are written, so a partial profile can
   * never wipe columns it does not know about. Returns false (with lastError)
   * when nothing could be saved, including an expired or different session.
   */
  async registerUser(user: User, profileData?: DriverProfile | EmployerProfile): Promise<boolean> {
    try {
      if (!isSupabaseConfigured) return DEMO_DATA_ENABLED || this.fail(null, 'Supabase is not configured for this deployment.');
      const userUUID = toUUID(user.id);
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return DEMO_AUTH_ENABLED || this.fail(null, 'Your session has expired. Please sign in again.');
      if (authData.user.id !== userUUID) return this.fail(null, 'A different account is signed in on this device. Sign in again to save.');

      const driver = user.role === 'driver' ? profileData as DriverProfile | undefined : undefined;
      const employer = user.role === 'employer' ? profileData as EmployerProfile | undefined : undefined;
      const latitude = typeof driver?.latitude === 'number' && !isNaN(driver.latitude) ? driver.latitude : undefined;
      const longitude = typeof driver?.longitude === 'number' && !isNaN(driver.longitude) ? driver.longitude : undefined;
      const city = driver?.city ?? employer?.city;
      const state = driver?.state ?? employer?.state;

      // ---- profiles (row is created by the signup trigger; self-heal if missing)
      const profilePayload = definedOnly({
        full_name: (driver?.fullName ?? employer?.contactPerson)?.trim() || undefined,
        phone: textOrNull(driver?.phone ?? employer?.phone ?? user.phone),
        city: textOrNull(city),
        district: textOrNull(driver?.district ?? employer?.district),
        pincode: textOrNull(driver?.pincode ?? employer?.pincode),
        state: textOrNull(state),
        location: textOrNull(driver?.location ?? employer?.location ?? (city && state ? `${city}, ${state}` : city)),
        latitude,
        longitude
      });
      let locationColumns = true;
      const saveProfile = async (payload: Record<string, unknown>) => {
        const updated = await supabase.from('profiles').update(payload).eq('id', userUUID).select('id').maybeSingle();
        if (updated.error || updated.data) return updated.error;
        const inserted = await supabase.from('profiles').insert({
          id: userUUID, role: user.role, email: (authData.user!.email || user.email).trim().toLowerCase(),
          full_name: (payload.full_name as string) || user.email.split('@')[0], ...payload
        });
        return inserted.error;
      };
      let profileError = await saveProfile(profilePayload);
      if (profileError && isMissingColumnError(profileError)) {
        locationColumns = false;
        const { district: _d, pincode: _p, latitude: _lat, longitude: _lng, ...legacy } = profilePayload;
        profileError = await saveProfile(legacy);
      }
      if (profileError) return this.fail(profileError, 'Could not save your profile.');

      if (driver) {
        const driverPayload = definedOnly({
          driver_category: driver.driverCategory === undefined ? undefined : (driver.driverCategory || null),
          years_experience: driver.experienceYears === undefined ? undefined : Math.max(0, Math.round(Number(driver.experienceYears) || 0)),
          months_experience: driver.experienceMonths === undefined ? undefined : Math.max(0, Math.round(Number(driver.experienceMonths) || 0)),
          license_number: textOrNull(driver.licenseNumber),
          license_type: textOrNull(driver.licenseType),
          license_expiry: driver.licenseExpiry === undefined ? undefined : toDateOnly(driver.licenseExpiry),
          skills: driver.skills,
          languages: driver.languages,
          vehicle_types: driver.vehicleTypes,
          current_role: textOrNull(driver.currentRole),
          previous_role: textOrNull(driver.previousRole),
          education: textOrNull(driver.education),
          preferred_location: textOrNull(driver.preferredLocation),
          expected_salary: driver.expectedSalary === undefined ? undefined : (Number(driver.expectedSalary) > 0 ? Math.round(Number(driver.expectedSalary)) : null),
          availability: driver.availability,
          night_shift_willing: driver.nightShiftWilling,
          outstation_willing: driver.outstationWilling,
          cv_attached: driver.resumeUrl === undefined && driver.cvAttached === undefined ? undefined : Boolean(driver.cvAttached || driver.resumeUrl),
          resume_url: textOrNull(driver.resumeUrl),
          bio: textOrNull(driver.bio),
          latitude,
          longitude,
          district: textOrNull(driver.district),
          pincode: textOrNull(driver.pincode)
        });
        const saveDriver = async (payload: Record<string, unknown>) => {
          const updated = await supabase.from('driver_profiles').update(payload).eq('user_id', userUUID).select('id').maybeSingle();
          if (updated.error || updated.data) return updated.error;
          const inserted = await supabase.from('driver_profiles').insert({ id: userUUID, user_id: userUUID, ...payload });
          return inserted.error;
        };
        let driverError = await saveDriver(driverPayload);
        if (driverError && isMissingColumnError(driverError)) {
          locationColumns = false;
          const { latitude: _lat, longitude: _lng, district: _d, pincode: _p, ...legacy } = driverPayload;
          driverError = await saveDriver(legacy);
        }
        if (driverError) return this.fail(driverError, 'Could not save your driver details.');

        if (driver.experiences !== undefined) {
          const experienceRows = driver.experiences.map((experience: DriverExperience) => ({
            id: toUUID(experience.id), driver_id: userUUID, company_name: experience.companyName,
            role_title: experience.roleTitle, vehicle_type: experience.vehicleType || null,
            duration_years: Number(experience.durationYears) || 0, start_date: toDateOnly(experience.startDate),
            end_date: toDateOnly(experience.endDate), description: experience.description || null
          }));
          if (experienceRows.length) {
            const { error: experienceError } = await supabase.from('driver_experiences').upsert(experienceRows, { onConflict: 'id' });
            if (experienceError) return this.fail(experienceError, 'Could not save your work experience.');
          }
        }
        if (!locationColumns) {
          // Core details were saved but not the structured location/coordinates.
          return this.fail(null, 'Profile saved, but your exact location could not be stored yet. Please contact support.');
        }
      } else if (employer) {
        const companyPayload = definedOnly({
          company_name: employer.companyName?.trim() || undefined,
          contact_person: textOrNull(employer.contactPerson),
          email: textOrNull(employer.email),
          phone: textOrNull(employer.phone),
          industry: textOrNull(employer.industry),
          location: textOrNull(employer.location),
          city: textOrNull(employer.city),
          district: textOrNull(employer.district),
          state: textOrNull(employer.state),
          pincode: textOrNull(employer.pincode),
          address: textOrNull(employer.address),
          website: textOrNull(employer.website),
          logo_url: textOrNull(employer.logoUrl),
          description: textOrNull(employer.description),
          gstin: textOrNull(employer.gstin)
        });
        // verified/status are never sent: only administration may change them.
        const saveCompany = async (payload: Record<string, unknown>) => {
          const updated = await supabase.from('companies').update(payload).eq('user_id', userUUID).select('user_id').maybeSingle();
          if (updated.error || updated.data) return updated.error;
          const inserted = await supabase.from('companies').insert({
            id: userUUID, user_id: userUUID, company_name: (payload.company_name as string) || 'My company', ...payload
          });
          return inserted.error;
        };
        let companyError = await saveCompany(companyPayload);
        if (companyError && isMissingColumnError(companyError)) {
          const { district: _d, pincode: _p, ...legacy } = companyPayload;
          companyError = await saveCompany(legacy);
        }
        if (companyError) return this.fail(companyError, 'Could not save your company profile.');
      }
      this.lastError = '';
      return true;
    } catch (e) {
      return this.fail(e, 'Could not save your profile.');
    }
  },

  async deleteDriverExperience(driverId: string, experienceId: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(driverId)) {
        return Boolean(import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true');
      }
      const { error } = await supabase.from('driver_experiences').delete()
        .eq('id', toUUID(experienceId)).eq('driver_id', authData.user.id);
      if (error) console.warn('Supabase deleteDriverExperience error:', error.message);
      return !error;
    } catch (e) {
      console.warn('Supabase deleteDriverExperience error:', e);
      return false;
    }
  },

  // Update user status (active/blocked) in Supabase
  async syncUserStatus(userId: string, status: 'active' | 'blocked' | 'pending' | 'suspended'): Promise<boolean> {
    try {
      const { data: current, error: authError } = await supabase.auth.getUser();
      if (authError || !current.user) return false;
      const { data: actor, error: actorError } = await supabase.from('profiles').select('role').eq('id', current.user.id).maybeSingle();
      if (actorError || actor?.role !== 'admin') return false;
      const userUUID = toUUID(userId);
      const { data, error } = await supabase.from('profiles').update({ status }).eq('id', userUUID).select('id').maybeSingle();
      if (error) throw error;
      return Boolean(data?.id);
    } catch (e) {
      return this.fail(e, 'Could not update this account.');
    }
  },

  async syncEmployerVerification(employerId: string, verified: boolean): Promise<boolean> {
    try {
      const { data: current, error: authError } = await supabase.auth.getUser();
      if (authError || !current.user) return false;
      const { data: actor, error: actorError } = await supabase.from('profiles').select('role').eq('id', current.user.id).maybeSingle();
      if (actorError || actor?.role !== 'admin') return false;
      // Verifying also lists the company (status active); the database keeps
      // both fields consistent for un-verification.
      const changes = verified ? { verified: true, status: 'active' } : { verified: false };
      const { data, error } = await supabase.from('companies').update(changes).eq('user_id', toUUID(employerId)).select('user_id').maybeSingle();
      if (error) throw error;
      if (!data?.user_id) return this.fail(null, 'This employer has no company profile yet.');
      return true;
    } catch (e) {
      return this.fail(e, 'Could not update the employer verification.');
    }
  },

  // Update application status in Supabase
  async syncApplicationStatus(appId: string, status: string, options?: { employerNotes?: string; interviewDate?: string; interviewMode?: string; interviewLocation?: string }): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return DEMO_AUTH_ENABLED || this.fail(null, 'Your session has expired. Please sign in again.');
      let interviewDate: string | undefined;
      if (options?.interviewDate) {
        const parsed = new Date(options.interviewDate);
        if (Number.isNaN(parsed.getTime())) return this.fail(null, 'Enter a valid interview date and time.');
        interviewDate = parsed.toISOString();
      }
      const changes = definedOnly({
        status,
        employer_notes: options?.employerNotes,
        interview_date: interviewDate,
        interview_mode: options?.interviewMode,
        interview_location: options?.interviewLocation
      });
      const { data, error } = await supabase.from('applications').update(changes)
        .eq('id', toUUID(appId)).select('id').maybeSingle();
      if (error) return this.fail(error, 'The application could not be updated.');
      if (!data?.id) return this.fail(null, 'This application could not be found. Refresh and try again.');
      return true;
    } catch (e) {
      return this.fail(e, 'The application could not be updated.');
    }
  },

  // Initialize Realtime WebSocket subscriptions
  initRealtimeListeners(onUpdate?: () => void) {
    try {
      const channel = supabase
        .channel(`driverhub_live_sync_${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_profiles' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_documents' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_experiences' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'favorite_jobs' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_searches' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'candidate_unlocks' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employer_subscriptions' }, () => onUpdate?.())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_transactions' }, () => onUpdate?.())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Realtime subscription setup:', e);
    }
  },

  async syncSubscription(sub: import('../types').EmployerSubscription) {
    try {
      const empUUID = toUUID(sub.employerId);
      await supabase.from('employer_subscriptions').upsert({
        id: empUUID,
        employer_id: empUUID,
        plan_name: sub.planName,
        job_credits: sub.jobCredits,
        db_unlock_credits: sub.dbUnlockCredits,
        total_job_credits: sub.totalJobCredits,
        total_db_unlock_credits: sub.totalDbUnlockCredits,
        gstin: sub.gstin,
        gstin_verified: sub.gstinVerified,
        billing_company_name: sub.billingCompanyName,
        billing_address: sub.billingAddress,
        status: sub.status
      }, { onConflict: 'employer_id' });
    } catch (e) {
      console.warn('syncSubscription error:', e);
    }
  },

  async syncBillingTransaction(txn: import('../types').BillingTransaction) {
    try {
      const empUUID = toUUID(txn.employerId);
      await supabase.from('billing_transactions').upsert({
        id: toUUID(txn.id),
        employer_id: empUUID,
        plan_details: txn.planDetails,
        applies_until: txn.appliesUntil,
        amount: txn.amount,
        status: txn.status,
        invoice_id: txn.invoiceId || 'INV-DH-2026',
        job_credits_added: txn.jobCreditsAdded || 0,
        db_credits_added: txn.dbCreditsAdded || 0
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('syncBillingTransaction error:', e);
    }
  },

  /**
   * Create a credit-backed unlock. The database trigger takes one credit for a
   * new driver; an existing unlock is left untouched (no second charge).
   */
  async syncCandidateUnlock(unlock: import('../types').CandidateUnlock) {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return DEMO_AUTH_ENABLED || this.fail(null, 'Your session has expired. Please sign in again.');
      if (authData.user.id !== toUUID(unlock.employerId)) return this.fail(null, 'Sign in with your employer account to unlock drivers.');
      const { error } = await supabase.from('candidate_unlocks').upsert({
        employer_id: authData.user.id,
        driver_id: toUUID(unlock.driverId),
        downloaded_excel: unlock.downloadedExcel || false
      }, { onConflict: 'employer_id,driver_id', ignoreDuplicates: true });
      if (error) return this.fail(error, 'Could not unlock this driver.');
      return true;
    } catch (e) {
      return this.fail(e, 'Could not unlock this driver.');
    }
  },

  /** Flag already-unlocked drivers as exported (no new unlocks, no credits). */
  async markUnlocksExported(employerId: string, driverIds: string[]): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(employerId) || !driverIds.length) return false;
      for (const ids of chunk(driverIds.map(toUUID), 100)) {
        const { error } = await supabase.from('candidate_unlocks').update({ downloaded_excel: true })
          .eq('employer_id', authData.user.id).in('driver_id', ids);
        if (error) return this.fail(error, 'Could not record the export.');
      }
      return true;
    } catch (e) {
      return this.fail(e, 'Could not record the export.');
    }
  },

  async syncSavedSearch(search: SavedSearch): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(search.employerId)) return this.fail(null, 'Your session has expired. Please sign in again.');
      let payload: Record<string, unknown> = {
        id: toUUID(search.id),
        employer_id: authData.user.id,
        title: search.title,
        category: search.category,
        city: search.city,
        district: search.district || null,
        state: search.state || null,
        pincode: search.pincode || null,
        radius_km: typeof search.radiusKm === 'number' && search.radiusKm > 0 ? search.radiusKm : null,
        keyword: search.keyword || null,
        vehicle_type: search.vehicleType || null,
        // null = any time (allowed once supabase-live-repair-2026-10.sql is applied)
        active_in_days: search.activeInDays || null,
        min_exp: search.minExp,
        must_have_skills: search.mustHaveSkills || [],
        match_count: search.matchCount ?? 0
      };
      let { error } = await supabase.from('saved_searches').upsert(payload, { onConflict: 'id' });
      // Databases without the latest migrations: drop the newer columns / use the old default.
      if (error && isMissingColumnError(error)) {
        const { district: _d, pincode: _p, radius_km: _r, ...legacy } = payload;
        payload = legacy;
        ({ error } = await supabase.from('saved_searches').upsert(payload, { onConflict: 'id' }));
      }
      if (error && error.code === '23502' && payload.active_in_days === null) {
        ({ error } = await supabase.from('saved_searches').upsert({ ...payload, active_in_days: 15 }, { onConflict: 'id' }));
      }
      if (error) return this.fail(error, 'Could not save this search.');
      return true;
    } catch (e) {
      return this.fail(e, 'Could not save this search.');
    }
  },

  async deleteSavedSearch(id: string, employerId: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(employerId)) return false;
      const { error } = await supabase.from('saved_searches').delete()
        .eq('id', toUUID(id)).eq('employer_id', authData.user.id);
      return !error;
    } catch (e) {
      console.warn('Supabase deleteSavedSearch error:', e);
      return false;
    }
  },

  async syncDirectMessage(msg: DirectMessage): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(msg.senderId)) return this.fail(null, 'Your session has expired. Please sign in again.');
      const { error } = await supabase.from('direct_messages').insert({
        id: toUUID(msg.id),
        sender_id: authData.user.id,
        sender_name: msg.senderName,
        sender_role: msg.senderRole,
        receiver_id: toUUID(msg.receiverId),
        receiver_name: msg.receiverName,
        job_id: msg.jobId ? toUUID(msg.jobId) : null,
        job_title: msg.jobTitle || null,
        text: msg.text,
        read: msg.read || false
      });
      if (error) return this.fail(error, 'Your message could not be sent.');
      return true;
    } catch (e) {
      return this.fail(e, 'Your message could not be sent.');
    }
  },

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user || authData.user.id !== toUUID(userId)) return this.fail(null, 'Your session has expired. Please sign in again.');
      const { error } = await supabase.from('notifications').update({ read: true })
        .eq('user_id', authData.user.id).eq('read', false);
      if (error) return this.fail(error, 'Could not mark notifications as read.');
      return true;
    } catch (e) {
      return this.fail(e, 'Could not mark notifications as read.');
    }
  },

  /** Mark messages from one conversation partner as read (recipient only). */
  async markMessagesRead(partnerId: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return false;
      const { error } = await supabase.from('direct_messages').update({ read: true })
        .eq('receiver_id', authData.user.id).eq('sender_id', toUUID(partnerId)).eq('read', false);
      return !error;
    } catch {
      return false;
    }
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return false;
      const { error } = await supabase.from('notifications').update({ read: true })
        .eq('id', toUUID(id)).eq('user_id', authData.user.id);
      return !error;
    } catch (e) {
      console.warn('Supabase markNotificationRead error:', e);
      return false;
    }
  },

  // Fetch public active driver vacancies plus records the authenticated user is allowed to see.
  // Single-flight: a call while one is running queues exactly one re-run.
  async fetchAndMergeRemoteData(dataStore: any): Promise<void> {
    if (refreshInFlight) {
      refreshQueued = true;
      return refreshInFlight;
    }
    refreshInFlight = (async () => {
      try {
        do {
          refreshQueued = false;
          await this.fetchAndMergeRemoteDataOnce(dataStore);
        } while (refreshQueued);
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },

  async fetchAndMergeRemoteDataOnce(dataStore: any) {
    try {
      const { data: authResult } = await supabase.auth.getUser();
      const authUser = authResult.user;
      const current = dataStore.getCurrentUser();
      const role = authUser ? current?.id === authUser.id ? current.role : null : null;
      let profile: any = null;
      // Admin sessions keep the full employer directory (incl. accounts without
      // a company row); other sessions get the public list plus their own company.
      let adminEmployerDirectory: EmployerProfile[] | null = null;
      if (authUser && role) {
        const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
        profile = data;
        if (profile) dataStore.addUser({
          id: authUser.id, email: profile.email || authUser.email || '', role: profile.role,
          status: profile.status === 'suspended' ? 'blocked' : profile.status || 'active',
          phone: profile.phone || '', createdAt: profile.created_at?.slice(0, 10) || ''
        });

        if (role === 'driver') {
          const [{ data: driverRow }, { data: experienceRows }, { data: documentRows }, { data: favoriteRows }] = await Promise.all([
            supabase.from('driver_profiles').select('*').eq('user_id', authUser.id).maybeSingle(),
            supabase.from('driver_experiences').select('*').eq('driver_id', authUser.id).order('start_date', { ascending: false }),
            supabase.from('driver_documents').select('*').eq('driver_id', authUser.id).order('upload_date', { ascending: false }),
            supabase.from('favorite_jobs').select('*').eq('driver_id', authUser.id)
          ]);
          if (driverRow) {
            const rawLoc = profile?.location || profile?.city || '';
            const parsed = parseStructuredLocation(rawLoc, profile?.state, profile?.district || driverRow.district, profile?.city, profile?.pincode || driverRow.pincode, driverRow.latitude, driverRow.longitude);
            const driver: DriverProfile = {
              id: authUser.id,
              fullName: profile?.full_name || authUser.user_metadata?.full_name || '',
              phone: profile?.phone || '', email: profile?.email || authUser.email || '',
              location: parsed.formattedLocation || rawLoc,
              city: parsed.city || profile?.city || '',
              state: parsed.state || profile?.state || '',
              district: parsed.district || profile?.district || driverRow.district || undefined,
              pincode: parsed.pincode || profile?.pincode || driverRow.pincode || undefined,
              latitude: typeof driverRow.latitude === 'number' ? driverRow.latitude : typeof profile?.latitude === 'number' ? profile.latitude : (driverRow.latitude ? parseFloat(driverRow.latitude) : profile?.latitude ? parseFloat(profile.latitude) : undefined),
              longitude: typeof driverRow.longitude === 'number' ? driverRow.longitude : typeof profile?.longitude === 'number' ? profile.longitude : (driverRow.longitude ? parseFloat(driverRow.longitude) : profile?.longitude ? parseFloat(profile.longitude) : undefined),
              driverCategory: driverRow.driver_category || '', licenseNumber: driverRow.license_number || '',
              licenseType: driverRow.license_type || '', licenseExpiry: driverRow.license_expiry || '',
              experienceYears: driverRow.years_experience || 0, experienceMonths: driverRow.months_experience || 0,
              skills: driverRow.skills || [], languages: driverRow.languages || [], vehicleTypes: driverRow.vehicle_types || [],
              currentRole: driverRow.current_role || '', previousRole: driverRow.previous_role || '',
              education: driverRow.education || '',
              preferredLocation: driverRow.preferred_location
                ? (parseStructuredLocation(driverRow.preferred_location).formattedLocation || driverRow.preferred_location)
                : parsed.formattedLocation,
              expectedSalary: driverRow.expected_salary || 0,
              availability: driverRow.availability || 'Flexible',
              nightShiftWilling: Boolean(driverRow.night_shift_willing), outstationWilling: Boolean(driverRow.outstation_willing),
              cvAttached: Boolean(driverRow.cv_attached), policeVerified: Boolean(driverRow.police_verified),
              lastActive: driverRow.updated_at || driverRow.created_at, bio: driverRow.bio || '',
              resumeUrl: driverRow.resume_url || undefined, status: profile?.status || 'active',
              experiences: (experienceRows || []).map((row: any): DriverExperience => ({
                id: row.id, driverId: authUser.id, companyName: row.company_name || '', roleTitle: row.role_title || '',
                vehicleType: row.vehicle_type || '', durationYears: Number(row.duration_years || 0),
                startDate: row.start_date || '', endDate: row.end_date || undefined, description: row.description || ''
              })),
              documents: (documentRows || []).map((row: any): DriverDocument => ({
                id: row.id, driverId: authUser.id, name: row.name, type: row.type,
                fileUrl: row.file_url, fileSize: row.file_size || undefined,
                uploadDate: row.upload_date?.slice(0, 10) || '', verificationStatus: row.verification_status
              }))
            };
            dataStore.mergeRemoteDrivers([driver]);
          }
          dataStore.mergeRemoteFavorites(authUser.id, favoriteRows || []);
        }

        const [{ data: notificationRows }, { data: messageRows }] = await Promise.all([
          supabase.from('notifications').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(100),
          supabase.from('direct_messages').select('*')
            .or(`sender_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
            .order('created_at', { ascending: false }).limit(500)
        ]);
        dataStore.mergeRemoteNotifications(authUser.id, notificationRows || []);
        // Newest 500, shown oldest-first.
        dataStore.mergeRemoteMessages(authUser.id, [...(messageRows || [])].reverse());

        // The admin workspace needs the full driver and employer directories.
        // Ordinary driver/employer sessions must remain limited to their own data.
        if (role === 'admin') {
          const [
            { data: driverAccounts, error: driverAccountsError },
            { data: driverRows, error: driverRowsError },
            { data: employerAccounts, error: employerAccountsError },
            { data: companyRows, error: companyRowsError }
          ] = await Promise.all([
            supabase.from('profiles').select('*').eq('role', 'driver').order('created_at', { ascending: false }),
            supabase.from('driver_profiles').select('*'),
            supabase.from('profiles').select('*').eq('role', 'employer').order('created_at', { ascending: false }),
            supabase.from('companies').select('*')
          ]);
          const directoryError = driverAccountsError || driverRowsError || employerAccountsError || companyRowsError;
          if (directoryError) throw directoryError;

          const driverByUserId = new Map((driverRows || []).map((row: any) => [row.user_id, row]));
          // Admin RLS returns all documents; no id list in the URL.
          const { data: adminDocumentRows, error: adminDocumentsError } = (driverAccounts || []).length
            ? await supabase.from('driver_documents').select('*')
            : { data: [], error: null };
          if (adminDocumentsError) throw adminDocumentsError;
          const adminUsers: User[] = [];
          const documentsByDriverId = new Map<string, DriverDocument[]>();
          for (const row of adminDocumentRows || []) {
            const documents = documentsByDriverId.get(row.driver_id) || [];
            documents.push({
              id: row.id, driverId: row.driver_id, name: row.name || '', type: row.type,
              fileUrl: row.file_url || '', fileSize: row.file_size || undefined,
              uploadDate: row.upload_date?.slice(0, 10) || '', verificationStatus: row.verification_status
            });
            documentsByDriverId.set(row.driver_id, documents);
          }
          const adminDrivers: DriverProfile[] = (driverAccounts || []).map((account: any) => {
            const row = driverByUserId.get(account.id) as any;
            const status = account.status === 'suspended' ? 'blocked' : account.status || 'active';
            const rawLoc = account.location || account.city || '';
            const parsed = parseStructuredLocation(rawLoc, account.state, account.district || row?.district, account.city, account.pincode || row?.pincode, row?.latitude, row?.longitude);
            adminUsers.push({
              id: account.id, email: account.email || '', role: 'driver', status: status as User['status'],
              phone: account.phone || '', createdAt: account.created_at?.slice(0, 10) || ''
            });
            return {
              id: account.id, fullName: account.full_name || '', phone: account.phone || '', email: account.email || '',
              location: parsed.formattedLocation || rawLoc,
              city: parsed.city || account.city || '',
              state: parsed.state || account.state || '',
              district: parsed.district || account.district || row?.district || undefined,
              pincode: parsed.pincode || account.pincode || row?.pincode || undefined,
              latitude: typeof row?.latitude === 'number' ? row.latitude : typeof account.latitude === 'number' ? account.latitude : (row?.latitude ? parseFloat(row.latitude) : account.latitude ? parseFloat(account.latitude) : undefined),
              longitude: typeof row?.longitude === 'number' ? row.longitude : typeof account.longitude === 'number' ? account.longitude : (row?.longitude ? parseFloat(row.longitude) : account.longitude ? parseFloat(account.longitude) : undefined),
              driverCategory: row?.driver_category || '', licenseNumber: row?.license_number || '',
              licenseType: row?.license_type || '', licenseExpiry: row?.license_expiry || '',
              experienceYears: row?.years_experience || 0, experienceMonths: row?.months_experience || 0,
              skills: row?.skills || [], languages: row?.languages || [], vehicleTypes: row?.vehicle_types || [],
              currentRole: row?.current_role || '', previousRole: row?.previous_role || '', education: row?.education || '',
              preferredLocation: row?.preferred_location
                ? (parseStructuredLocation(row.preferred_location).formattedLocation || row.preferred_location)
                : parsed.formattedLocation,
              expectedSalary: row?.expected_salary || 0,
              availability: row?.availability || 'Flexible', nightShiftWilling: Boolean(row?.night_shift_willing),
              outstationWilling: Boolean(row?.outstation_willing), cvAttached: Boolean(row?.cv_attached),
              policeVerified: Boolean(row?.police_verified), lastActive: row?.updated_at || account.updated_at,
              bio: row?.bio || '', resumeUrl: row?.resume_url || undefined,
              status: status as DriverProfile['status'], experiences: [], documents: documentsByDriverId.get(account.id) || []
            };
          });
          dataStore.mergeRemoteDrivers(adminDrivers);

          const companyByUserId = new Map((companyRows || []).map((row: any) => [row.user_id, row]));
          const adminEmployers: EmployerProfile[] = (employerAccounts || []).map((account: any) => {
            const company = companyByUserId.get(account.id) as any;
            const status = account.status === 'suspended' || company?.status === 'suspended'
              ? 'blocked'
              : account.status || company?.status || 'pending';
            adminUsers.push({
              id: account.id, email: account.email || '', role: 'employer', status: status as User['status'],
              phone: account.phone || '', createdAt: account.created_at?.slice(0, 10) || ''
            });
            return {
              id: account.id, companyName: company?.company_name || 'Company profile incomplete',
              contactPerson: company?.contact_person || account.full_name || '',
              email: company?.email || account.email || '', phone: company?.phone || account.phone || '',
              industry: company?.industry || '', location: company?.location || account.location || '',
              city: company?.city || account.city || '', state: company?.state || account.state || '',
              address: company?.address || '', website: company?.website || '', logoUrl: company?.logo_url || '',
              description: company?.description || '', gstin: company?.gstin || '',
              verified: Boolean(company?.verified), status: status as EmployerProfile['status'],
              createdAt: company?.created_at?.slice(0, 10) || account.created_at?.slice(0, 10) || ''
            };
          });
          dataStore.mergeRemoteUsers(adminUsers);
          adminEmployerDirectory = adminEmployers;
        }
      }

      // Fetch all public & verified company profiles from Supabase so all devices (drivers, visitors, employers) sync verified partners
      const { data: allCompanies } = await supabase.from('companies').select('*');
      const publicEmployers: EmployerProfile[] = (allCompanies || []).map((c: any) => {
        const parsedLoc = parseStructuredLocation(c.location, c.state, c.district, c.city, c.pincode);
        return {
          id: c.user_id,
          companyName: c.company_name || 'Verified Fleet Partner',
          contactPerson: c.contact_person || '',
          email: c.email || '',
          phone: c.phone || '',
          industry: c.industry || 'Logistics & Fleet Transport',
          location: c.location || [c.city, c.state].filter(Boolean).join(', ') || 'India',
          city: c.city || parsedLoc.city || '',
          district: c.district || parsedLoc.district || undefined,
          state: c.state || parsedLoc.state || '',
          pincode: c.pincode || parsedLoc.pincode || undefined,
          address: c.address || '',
          website: c.website || '',
          logoUrl: c.logo_url || '',
          description: c.description || '',
          gstin: c.gstin || '',
          verified: Boolean(c.verified),
          status: c.status === 'suspended' ? 'blocked' : (c.status || (c.verified ? 'active' : 'pending')),
          createdAt: c.created_at?.slice(0, 10) || ''
        };
      });
      if (!adminEmployerDirectory) dataStore.mergeRemoteEmployers(publicEmployers);
      else dataStore.mergeRemoteEmployers(adminEmployerDirectory);

      const { data: jobRows, error: jobError } = await supabase.from('jobs').select('*').order('posted_date', { ascending: false });
      if (jobError) throw jobError;
      const rows = jobRows || [];
      const companyById = new Map((allCompanies || []).map((company: any) => [company.user_id, company]));
      const jobs: Job[] = rows.map((row: any) => {
        const company = companyById.get(row.employer_id) as any;
        const parsedLoc = parseStructuredLocation(row.location, row.state, row.district, row.city, row.pincode);
        return {
          id: row.id, employerId: row.employer_id, companyName: row.company_name || company?.company_name || 'Verified employer',
          companyLogo: company?.logo_url || undefined, postedBy: company?.contact_person || undefined,
          title: row.title, category: row.category, location: row.location,
          city: row.city || parsedLoc.city || '',
          district: row.district || parsedLoc.district || undefined,
          state: row.state || parsedLoc.state || '',
          pincode: row.pincode || parsedLoc.pincode || undefined,
          experienceRequired: row.experience_required || '', experienceMinYears: row.experience_min_years || 0,
          salaryMin: row.salary_min || 0, salaryMax: row.salary_max || 0, salaryType: row.salary_type || 'monthly',
          workingHours: row.working_hours || '', employmentType: row.employment_type || 'Full-time',
          description: row.description || '', requiredSkills: row.required_skills || [], requiredDocs: row.required_docs || [],
          routeType: row.route_type || undefined, vehicleType: row.vehicle_type || undefined,
          payType: row.pay_type || undefined, perks: row.perks || [], nightShift: Boolean(row.night_shift),
          workLocationType: row.work_location_type || undefined, joiningFeeRequired: Boolean(row.joining_fee_required),
          screeningQuestions: row.screening_questions || [],
          vacancies: row.vacancies || 1, status: row.status, postedDate: row.posted_date || '',
          applicationDeadline: row.application_deadline || undefined, applicationsCount: 0,
          creditConsumed: Boolean(row.credit_consumed), slotConsumed: Boolean(row.slot_consumed),
          expiresAt: row.expires_at || undefined
        };
      });
      dataStore.mergeRemoteJobs(jobs);

      if (authUser && role) {
        let appQuery = supabase.from('applications').select('*');
        if (role === 'driver') appQuery = appQuery.eq('driver_id', authUser.id);
        else if (role === 'employer') {
          const ownJobIds = rows.filter((row: any) => row.employer_id === authUser.id).map((row: any) => row.id);
          if (ownJobIds.length) appQuery = appQuery.in('job_id', ownJobIds);
          else appQuery = appQuery.in('job_id', ['00000000-0000-0000-0000-000000000000']);
        }
        const { data: appRows, error: appError } = await appQuery.order('applied_date', { ascending: false });
        if (appError) throw appError;
        const driverIds = [...new Set((appRows || []).map((row: any) => row.driver_id as string))];
        const driverRows: any[] = [];
        const applicantDetailRows: any[] = [];
        for (const ids of chunk(driverIds, 100)) {
          const [{ data: profileBatch }, { data: detailBatch }] = await Promise.all([
            supabase.from('profiles').select('id,full_name,email,phone,city,state,location').in('id', ids),
            role === 'employer'
              ? supabase.from('driver_profiles').select('user_id,driver_category,years_experience,license_type,license_number,license_expiry,skills,police_verified,expected_salary').in('user_id', ids)
              : Promise.resolve({ data: [] as any[] })
          ]);
          driverRows.push(...(profileBatch || []));
          applicantDetailRows.push(...(detailBatch || []));
        }
        const profileById = new Map(driverRows.map((row: any) => [row.id, row]));
        const detailByDriverId = new Map(applicantDetailRows.map((row: any) => [row.user_id, row]));
        const jobById = new Map(jobs.map(job => [job.id, job]));
        const apps: Application[] = (appRows || []).map((row: any) => {
          const driver = profileById.get(row.driver_id) as any;
          const detail = detailByDriverId.get(row.driver_id) as any;
          const job = jobById.get(row.job_id);
          return {
            id: row.id, jobId: row.job_id, jobTitle: job?.title, companyName: job?.companyName,
            driverId: row.driver_id, driverName: driver?.full_name || 'Driver', driverPhone: driver?.phone || '',
            driverEmail: driver?.email || '', driverLocation: driver?.location || [driver?.city, driver?.state].filter(Boolean).join(', '),
            driverCategory: detail?.driver_category || undefined,
            driverExperienceYears: typeof detail?.years_experience === 'number' ? detail.years_experience : undefined,
            driverLicenseType: detail?.license_type || undefined,
            driverLicenseNumber: detail?.license_number || undefined,
            driverLicenseExpiry: detail?.license_expiry || undefined,
            driverSkills: detail?.skills || undefined,
            driverPoliceVerified: detail ? Boolean(detail.police_verified) : undefined,
            driverExpectedSalary: detail?.expected_salary || undefined,
            coverMessage: row.cover_message || '', resumeUrl: row.resume_url || undefined,
            status: row.status, appliedDate: row.applied_date || '', updatedDate: row.updated_date || row.applied_date || '',
            employerNotes: row.employer_notes || undefined, interviewDate: row.interview_date || undefined,
            interviewMode: row.interview_mode || undefined, interviewLocation: row.interview_location || undefined
          };
        });
        dataStore.mergeRemoteApplications(apps);
        if (role === 'employer') {
          const applicationCounts = new Map<string, number>();
          for (const row of appRows || []) applicationCounts.set(row.job_id, (applicationCounts.get(row.job_id) || 0) + 1);
          dataStore.mergeRemoteJobs(jobs.map(job => ({
            ...job,
            applicationsCount: applicationCounts.get(job.id) || 0
          })));
        }
      }

      if (authUser && role === 'employer') {
        const { data: sub } = await supabase.from('employer_subscriptions').select('*').eq('employer_id', authUser.id).maybeSingle();
        dataStore.mergeRemoteSubscription(sub ? {
          employerId: authUser.id, planName: sub.plan_name || 'Hiring plan', jobCredits: sub.job_credits || 0,
          dbUnlockCredits: sub.db_unlock_credits || 0, totalJobCredits: sub.total_job_credits || 0,
          totalDbUnlockCredits: sub.total_db_unlock_credits || 0, activeJobSlots: sub.active_job_slots || 0,
          gstin: sub.gstin || '', gstinVerified: Boolean(sub.gstin_verified),
          billingCompanyName: sub.billing_company_name || '', billingAddress: sub.billing_address || '',
          expiresAt: sub.expires_at || new Date(0).toISOString(),
          status: sub.status === 'active' && new Date(sub.expires_at).getTime() > Date.now() ? 'active' : 'expired'
        } : {
          employerId: authUser.id, planName: 'No active hiring plan', jobCredits: 0, dbUnlockCredits: 0,
          totalJobCredits: 0, totalDbUnlockCredits: 0, activeJobSlots: 0, gstin: '', gstinVerified: false,
          billingCompanyName: '', billingAddress: '', expiresAt: new Date(0).toISOString(), status: 'expired'
        });
        const { data: billingRows } = await supabase.from('billing_transactions').select('*').eq('employer_id', authUser.id).order('created_at', { ascending: false });
        dataStore.mergeRemoteBillingTransactions((billingRows || []).map((txn: any) => ({
          id: txn.id, employerId: authUser.id, date: txn.created_at?.slice(0, 10) || '', time: txn.created_at?.slice(11, 16) || '',
          planDetails: txn.plan_details, appliesUntil: txn.applies_until || '', amount: txn.amount || 0,
          status: txn.status === 'Success' ? 'Success' : txn.status === 'Failed' ? 'Failed' : txn.status === 'Cancelled' ? 'Cancelled' : 'Pending',
          invoiceId: txn.invoice_id || undefined, jobCreditsAdded: txn.job_credits_added || 0, dbCreditsAdded: txn.db_credits_added || 0
        })));
        const [{ data: unlockRows }, { data: savedSearchRows }] = await Promise.all([
          supabase.from('candidate_unlocks').select('*').eq('employer_id', authUser.id).order('unlocked_at', { ascending: false }),
          supabase.from('saved_searches').select('*').eq('employer_id', authUser.id).order('created_at', { ascending: false })
        ]);
        dataStore.mergeRemoteCandidateUnlocks(authUser.id, unlockRows || []);
        dataStore.mergeRemoteSavedSearches(authUser.id, savedSearchRows || []);
        const { data: company } = await supabase.from('companies').select('*').eq('user_id', authUser.id).maybeSingle();
        if (company && profile) {
          const ownCompany: EmployerProfile = {
            id: authUser.id, companyName: company.company_name, contactPerson: company.contact_person || profile.full_name || '',
            email: company.email || profile.email || '', phone: company.phone || profile.phone || '',
            industry: company.industry || '', location: company.location || '', city: company.city || '',
            district: company.district || undefined, state: company.state || '', pincode: company.pincode || undefined,
            address: company.address || '', website: company.website || '', logoUrl: company.logo_url || '',
            description: company.description || '', gstin: company.gstin || '', verified: company.verified || false,
            status: company.status === 'suspended' ? 'blocked' : company.status || 'pending',
            createdAt: company.created_at?.slice(0, 10) || ''
          };
          // Keep the public directory and replace only this employer's entry.
          dataStore.mergeRemoteEmployers([ownCompany, ...dataStore.getEmployers().filter((e: EmployerProfile) => e.id !== authUser.id)]);
        }
      }
    } catch (e) {
      console.warn('Supabase fetchAndMergeRemoteData notice:', e);
    }
  },
};
