import {
  Job, DriverProfile, EmployerProfile, Application, Notification, User, FavoriteJob, DriverDocument, DriverExperience, UserRole,
  EmployerSubscription, BillingTransaction, SavedSearch, CandidateUnlock, DirectMessage
} from '../types';
import { SupabaseSync } from './supabaseSync';
import { parseStructuredLocation } from './indiaLocationService';
import { newId } from '../lib/ids';

const STORAGE_KEYS = {
  CURRENT_USER: 'driverhub_current_user',
  LAST_ROLE_USERS: 'driverhub_last_role_users',
  USERS: 'driverhub_users',
  JOBS: 'driverhub_jobs_v3',
  DRIVERS: 'driverhub_drivers_v3',
  EMPLOYERS: 'driverhub_employers_v2',
  APPLICATIONS: 'driverhub_applications_v2',
  NOTIFICATIONS: 'driverhub_notifications_v2',
  FAVORITES: 'driverhub_favorites_v2',
  SUBSCRIPTIONS: 'driverhub_subscriptions_v2',
  BILLING: 'driverhub_billing_txns_v2',
  SAVED_SEARCHES: 'driverhub_saved_searches_v2',
  UNLOCKS: 'driverhub_candidate_unlocks_v2',
  MESSAGES: 'driverhub_direct_messages_v2',
};

try {
  localStorage.removeItem(STORAGE_KEYS.LAST_ROLE_USERS);
} catch {
  // ignore
}

// Helper for local storage
function getStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed)) {
        // Browsers that ran an older version may still hold its sample records
        // and sample accounts (00000000-0000-4000-8000-0000000000NN); hide them.
        // Real rows are never filtered, whatever their id looks like.
        const isOldSampleId = (id: any) =>
          typeof id === 'string' &&
          (id.startsWith('job-') ||
           id.startsWith('driver-') ||
           id.startsWith('emp-') ||
           id.startsWith('app-') ||
           id.startsWith('user-') ||
           /^00000000-0000-4000-8000-0000000000\d{2}$/.test(id));
        return parsed.filter((entry: any) => !isOldSampleId(entry?.id)) as T;
      }
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('driverhub_storage_updated'));
  } catch (e) {
    console.error('Storage write error:', e);
  }
}

/** A job a driver can apply to right now: live, not expired, deadline not passed. */
export function isJobOpenForApplications(job: Pick<Job, 'status' | 'expiresAt' | 'applicationDeadline'>): boolean {
  if (job.status !== 'active') return false;
  if (job.expiresAt && Date.parse(job.expiresAt) <= Date.now()) return false;
  if (job.applicationDeadline) {
    // Deadlines are dates: the job stays open until the end of that day.
    const deadline = new Date(job.applicationDeadline);
    if (!Number.isNaN(deadline.getTime())) {
      deadline.setHours(23, 59, 59, 999);
      if (deadline.getTime() < Date.now()) return false;
    }
  }
  return true;
}

export const DataStore = {
  // Current logged in user (null by default if not signed in)
  getCurrentUser(): User | null {
    const user = getStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) return null;

    // Always cross-reference with latest user list to reflect real-time blocked/active status
    const users = this.getUsers();
    const freshUser = users.find(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    return freshUser || user;
  },

  setCurrentUser(user: User | null): void {
    setStorage(STORAGE_KEYS.CURRENT_USER, user);
    try {
      localStorage.removeItem(STORAGE_KEYS.LAST_ROLE_USERS);
    } catch {
      // ignore
    }
  },

  getLastUserByRole(_role: UserRole): User | null {
    return null;
  },

  /**
   * Remove every cached record of the previous session (profiles, contacts,
   * messages, unlocks, admin directories). Call on sign-out and before a
   * different account signs in on the same device. The language choice is
   * stored separately and is kept.
   */
  clearSessionCaches(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event('driverhub_storage_updated'));
  },

  /** Merge many accounts into the cached list in one write (one storage event). */
  mergeRemoteUsers(remoteUsers: User[]): void {
    if (!remoteUsers.length) return;
    const byId = new Map<string, User>(this.getUsers().map((user): [string, User] => [user.id, user]));
    for (const user of remoteUsers) byId.set(user.id, { ...byId.get(user.id), ...user });
    setStorage(STORAGE_KEYS.USERS, [...byId.values()]);
  },

  // Users
  getUsers(): User[] {
    return getStorage<User[]>(STORAGE_KEYS.USERS, []);
  },

  addUser(user: User): void {
    const users = this.getUsers();
    const cleanEmail = user.email.trim().toLowerCase();
    const existingIndex = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === cleanEmail);
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
      setStorage(STORAGE_KEYS.USERS, [...users]);
    } else {
      setStorage(STORAGE_KEYS.USERS, [...users, user]);
    }
  },

  async updateUserStatus(userId: string, status: User['status']): Promise<boolean> {
    const actor = this.getCurrentUser();
    if (!actor || actor.role !== 'admin') return false;

    const saved = await SupabaseSync.syncUserStatus(userId, status);
    if (!saved) return false;

    const users = this.getUsers().map(u => u.id === userId ? { ...u, status } : u);
    setStorage(STORAGE_KEYS.USERS, users);

    // If currently logged in user is being modified, update current user session as well
    const currentUser = getStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && currentUser.id === userId) {
      setStorage(STORAGE_KEYS.CURRENT_USER, { ...currentUser, status });
    }

    // Also update profile status if driver or employer
    const drivers = this.getDrivers().map(d => d.id === userId ? { ...d, status } : d);
    setStorage(STORAGE_KEYS.DRIVERS, drivers);

    const employers = this.getEmployers().map(e => e.id === userId ? { ...e, status } : e);
    setStorage(STORAGE_KEYS.EMPLOYERS, employers);

    return true;
  },

  // Drivers
  getDrivers(): DriverProfile[] {
    const raw = getStorage<DriverProfile[]>(STORAGE_KEYS.DRIVERS, []) || [];
    return raw.map(d => {
      const parsed = parseStructuredLocation(d);
      const isOutdated =
        (parsed.city && parsed.city !== d.city) ||
        (parsed.district && parsed.district !== d.district) ||
        (d.city && d.city.includes('(Kolar)')) ||
        (d.location && d.location.includes('(Kolar)'));
      if (isOutdated) {
        return {
          ...d,
          city: parsed.city || d.city,
          district: parsed.district || d.district,
          state: parsed.state || d.state,
          pincode: parsed.pincode || d.pincode,
          location: parsed.formattedLocation || d.location,
          preferredLocation: d.preferredLocation ? (parseStructuredLocation(d.preferredLocation).formattedLocation || d.preferredLocation) : parsed.formattedLocation
        };
      }
      return d;
    });
  },

  getDriverById(id: string): DriverProfile {
    const drivers = this.getDrivers();
    const existing = drivers.find(d => d.id === id);
    if (existing) return existing;
    const user = this.getUsers().find(u => u.id === id);
    if (user) {
      const match = drivers.find(d =>
        (d.email && user.email && d.email.toLowerCase() === user.email.toLowerCase()) ||
        (d.phone && user.phone && d.phone.replace(/[^0-9]/g, '') === user.phone.replace(/[^0-9]/g, ''))
      );
      if (match) return { ...match, id };
    }
    return {
      id, fullName: user?.fullName || '', phone: user?.phone || '', email: user?.email || '',
      location: '', city: '', state: '', driverCategory: '', licenseNumber: '', licenseType: '',
      licenseExpiry: '', experienceYears: 0, skills: [], preferredLocation: '', expectedSalary: 0,
      availability: 'Flexible', bio: '', status: 'pending', experiences: [], documents: []
    };
  },

  getDriverDocuments(driverId: string): DriverDocument[] {
    const driver = this.getDriverById(driverId);
    if (driver && driver.documents && driver.documents.length > 0) {
      return driver.documents;
    }
    const drivers = this.getDrivers();
    const match = drivers.find(d => d.id === driverId || (driver && d.phone && driver.phone && d.phone.replace(/[^0-9]/g, '') === driver.phone.replace(/[^0-9]/g, '')));
    return match?.documents || [];
  },

  setDriverProfileLocal(profile: DriverProfile): void {
    const parsed = parseStructuredLocation(profile);
    const sanitized: DriverProfile = {
      ...profile,
      city: parsed.city || profile.city,
      district: parsed.district || profile.district,
      state: parsed.state || profile.state,
      pincode: parsed.pincode || profile.pincode,
      location: parsed.formattedLocation || profile.location,
      preferredLocation: profile.preferredLocation
        ? (parseStructuredLocation(profile.preferredLocation).formattedLocation || profile.preferredLocation)
        : (parsed.formattedLocation || profile.location)
    };
    const drivers = this.getDrivers();
    const index = drivers.findIndex(d => d.id === sanitized.id);
    if (index >= 0) {
      drivers[index] = sanitized;
      setStorage(STORAGE_KEYS.DRIVERS, [...drivers]);
    } else {
      setStorage(STORAGE_KEYS.DRIVERS, [...drivers, sanitized]);
    }
  },

  async updateDriverProfile(profile: DriverProfile): Promise<boolean> {
    const user = this.getUsers().find(u => u.id === profile.id) || {
      id: profile.id,
      email: profile.email,
      role: 'driver' as const,
      status: profile.status || 'active',
      phone: profile.phone,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    if (!(await SupabaseSync.registerUser(user, profile))) return false;
    this.setDriverProfileLocal(profile);
    if (profile.phone && user.phone !== profile.phone) this.addUser({ ...user, phone: profile.phone });
    return true;
  },

  mergeRemoteDrivers(remoteDrivers: DriverProfile[]): void {
    const sanitized = remoteDrivers.map(d => {
      const parsed = parseStructuredLocation(d);
      return {
        ...d,
        city: parsed.city || d.city,
        district: parsed.district || d.district,
        state: parsed.state || d.state,
        pincode: parsed.pincode || d.pincode,
        location: parsed.formattedLocation || d.location,
        preferredLocation: d.preferredLocation
          ? (parseStructuredLocation(d.preferredLocation).formattedLocation || d.preferredLocation)
          : (parsed.formattedLocation || d.location)
      };
    });
    setStorage(STORAGE_KEYS.DRIVERS, sanitized);
  },

  addDriverDocument(driverId: string, doc: DriverDocument): void {
    const driver = this.getDriverById(driverId);
    if (driver) {
      const existingDocs = driver.documents || [];
      const documents = [...existingDocs.filter(d => d.id !== doc.id), doc];
      this.setDriverDocuments(driverId, documents);
    }
  },

  setDriverDocuments(driverId: string, documents: DriverDocument[]): void {
    const drivers = this.getDrivers();
    const profile = this.getDriverById(driverId);
    const next = { ...profile, documents };
    const index = drivers.findIndex(driver => driver.id === driverId);
    if (index >= 0) drivers[index] = next;
    else drivers.push(next);
    setStorage(STORAGE_KEYS.DRIVERS, drivers);
  },

  async deleteDriverDocument(driverId: string, docId: string): Promise<boolean> {
    const driver = this.getDriverById(driverId);
    if (!driver?.documents) return false;
    const document = driver.documents.find(doc => doc.id === docId);
    if (!document) return false;
    if (!(await SupabaseSync.deleteDriverDocument(driverId, document))) return false;
    this.setDriverDocuments(driverId, driver.documents.filter(doc => doc.id !== docId));
    return true;
  },

  // Employers
  getEmployers(): EmployerProfile[] {
    return getStorage<EmployerProfile[]>(STORAGE_KEYS.EMPLOYERS, []) || [];
  },

  getEmployerById(id: string): EmployerProfile | undefined {
    return this.getEmployers().find(employer => employer.id === id);
  },

  setEmployerProfileLocal(profile: EmployerProfile): void {
    const employers = this.getEmployers();
    const index = employers.findIndex(e => e.id === profile.id);
    if (index >= 0) {
      employers[index] = profile;
      setStorage(STORAGE_KEYS.EMPLOYERS, [...employers]);
    } else {
      setStorage(STORAGE_KEYS.EMPLOYERS, [...employers, profile]);
    }
  },

  async updateEmployerProfile(profile: EmployerProfile): Promise<boolean> {
    const user = this.getUsers().find(u => u.id === profile.id) || {
      id: profile.id,
      email: profile.email,
      role: 'employer' as const,
      status: profile.status || 'active',
      phone: profile.phone,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    if (!(await SupabaseSync.registerUser(user, profile))) return false;
    // Verification and listing status are owned by administration.
    const existing = this.getEmployerById(profile.id);
    this.setEmployerProfileLocal(existing ? { ...profile, verified: existing.verified, status: existing.status } : profile);
    return true;
  },

  mergeRemoteEmployers(remoteEmployers: EmployerProfile[]): void {
    setStorage(STORAGE_KEYS.EMPLOYERS, remoteEmployers);
  },

  async verifyEmployer(id: string, verified: boolean): Promise<boolean> {
    const actor = this.getCurrentUser();
    if (!actor || actor.role !== 'admin') return false;
    if (!(await SupabaseSync.syncEmployerVerification(id, verified))) return false;

    const employers = this.getEmployers().map(e => {
      if (e.id !== id) return e;
      const status: EmployerProfile['status'] = verified && e.status === 'pending' ? 'active' : (!verified && e.status === 'active' ? 'pending' : e.status);
      return { ...e, verified, status };
    });
    setStorage(STORAGE_KEYS.EMPLOYERS, employers);
    return employers.some(employer => employer.id === id);
  },

  // Jobs
  getJobs(): Job[] {
    return getStorage<Job[]>(STORAGE_KEYS.JOBS, []) || [];
  },

  getJobById(id: string): Job | undefined {
    return this.getJobs().find(j => j.id === id);
  },

  async addJob(job: Job): Promise<boolean> {
    const jobs = this.getJobs();
    if (jobs.some(existing => existing.id === job.id)) return false;

    const employer = this.getEmployerById(job.employerId);
    const synced = await SupabaseSync.syncJob(job, employer);
    if (!synced) return false;
    await SupabaseSync.fetchAndMergeRemoteData(this);
    return true;
  },

  mergeRemoteJobs(remoteJobs: Job[]): void {
    setStorage(STORAGE_KEYS.JOBS, remoteJobs);
  },

  async updateJob(job: Job): Promise<boolean> {
    if (!(await SupabaseSync.syncJob(job))) return false;
    setStorage(STORAGE_KEYS.JOBS, this.getJobs().map(j => j.id === job.id ? job : j));
    await SupabaseSync.fetchAndMergeRemoteData(this);
    return true;
  },

  /** Remove one of the employer's own drafts. Published jobs are closed instead. */
  async deleteDraftJob(jobId: string): Promise<boolean> {
    const original = this.getJobs().find(job => job.id === jobId);
    const actor = this.getCurrentUser();
    if (!original || !actor) {
      SupabaseSync.lastError = actor ? 'This job could not be found. Refresh and try again.' : 'Your session has expired. Please sign in again.';
      return false;
    }
    if (actor.role !== 'employer' || original.employerId !== actor.id || original.status !== 'draft') {
      SupabaseSync.lastError = 'Only your own drafts can be deleted. Close a published job instead.';
      return false;
    }
    if (!(await SupabaseSync.deleteEmployerDraftJob(jobId))) return false;
    setStorage(STORAGE_KEYS.JOBS, this.getJobs().filter(job => job.id !== jobId));
    return true;
  },

  async updateJobStatus(jobId: string, status: Job['status']): Promise<boolean> {
    const original = this.getJobs().find(job => job.id === jobId);
    const actor = this.getCurrentUser();
    if (!original || !actor) {
      SupabaseSync.lastError = actor ? 'This job could not be found. Refresh and try again.' : 'Your session has expired. Please sign in again.';
      return false;
    }
    if ((actor.role === 'employer' && original.employerId !== actor.id) || actor.role === 'driver') {
      SupabaseSync.lastError = 'You can only change your own company jobs.';
      return false;
    }
    // Employers publish, close and re-open; only administration approves or rejects.
    const allowed: Record<Job['status'], Job['status'][]> = actor.role === 'admin'
      ? { draft: ['pending', 'active', 'closed'], pending: ['active', 'rejected', 'closed'], active: ['closed'], closed: ['active'], rejected: [] }
      : { draft: ['pending', 'active', 'closed'], pending: ['closed'], active: ['closed'], closed: ['active'], rejected: [] };
    if (original.status !== status && !allowed[original.status].includes(status)) {
      SupabaseSync.lastError = original.status === 'pending' && status === 'active'
        ? 'This job is waiting for DriverHub review and goes live after approval.'
        : `A ${original.status} job cannot be moved to ${status}.`;
      return false;
    }
    if (actor.role === 'admin') {
      // Moderation changes only the status. Sending a full job payload from the
      // admin UI could overwrite employer fields with client defaults.
      const saved = await SupabaseSync.updateAdminJobStatus(jobId, status);
      if (!saved) return false;
      setStorage(STORAGE_KEYS.JOBS, this.getJobs().map(job => job.id === jobId ? { ...job, status } : job));
      await SupabaseSync.fetchAndMergeRemoteData(this);
      return true;
    }
    // Send only the status: the database applies entitlement, review and
    // expiry rules, and a stale cached row must not overwrite newer edits.
    const savedStatus = await SupabaseSync.updateEmployerJobStatus(jobId, status);
    if (!savedStatus) return false;
    setStorage(STORAGE_KEYS.JOBS, this.getJobs().map(job => job.id === jobId ? { ...job, status: savedStatus } : job));
    await SupabaseSync.fetchAndMergeRemoteData(this);
    return true;
  },

  // Applications
  getApplications(): Application[] {
    return getStorage<Application[]>(STORAGE_KEYS.APPLICATIONS, []);
  },

  getApplicationById(id: string): Application | undefined {
    return this.getApplications().find(a => a.id === id);
  },

  async addApplication(app: Application): Promise<boolean> {
    const applications = this.getApplications();
    const user = this.getCurrentUser();
    const job = this.getJobById(app.jobId);
    if (!user || user.role !== 'driver' || user.id !== app.driverId || !job || !isJobOpenForApplications(job)) {
      SupabaseSync.lastError = 'This job is no longer accepting applications.';
      return false;
    }
    // One application per job and driver (the database enforces this too), so a
    // withdrawn application cannot be re-submitted.
    if (applications.some(existing => existing.jobId === app.jobId && existing.driverId === app.driverId)) {
      SupabaseSync.lastError = 'You have already applied to this job.';
      return false;
    }

    const synced = await SupabaseSync.syncApplication(app);
    if (!synced) return false;
    setStorage(STORAGE_KEYS.APPLICATIONS, [app, ...applications]);

    // The database notifies the employer; keep the job's counter current here.
    const jobs = this.getJobs().map(existing => existing.id === job.id
      ? { ...existing, applicationsCount: (existing.applicationsCount || 0) + 1 }
      : existing);
    setStorage(STORAGE_KEYS.JOBS, jobs);
    return true;
  },

  mergeRemoteApplications(remoteApps: Application[]): void {
    setStorage(STORAGE_KEYS.APPLICATIONS, remoteApps);
  },

  async updateApplicationStatus(
    appId: string,
    status: Application['status'],
    options?: { employerNotes?: string; interviewDate?: string; interviewMode?: Application['interviewMode']; interviewLocation?: string }
  ): Promise<boolean> {
    const actor = this.getCurrentUser();
    const existing = this.getApplicationById(appId);
    if (!actor || !existing) {
      SupabaseSync.lastError = actor ? 'This application could not be found. Refresh and try again.' : 'Your session has expired. Please sign in again.';
      return false;
    }
    const jobForApplication = this.getJobById(existing.jobId);
    if (actor.role === 'driver' && (actor.id !== existing.driverId || status !== 'withdrawn')) {
      SupabaseSync.lastError = 'Drivers can only withdraw their own applications.';
      return false;
    }
    if (actor.role === 'employer' && (!jobForApplication || jobForApplication.employerId !== actor.id)) {
      SupabaseSync.lastError = 'You can only update applications for your own jobs.';
      return false;
    }
    const transitions: Record<Application['status'], Application['status'][]> = {
      applied: ['viewed', 'under_review', 'shortlisted', 'rejected', 'withdrawn'],
      viewed: ['under_review', 'shortlisted', 'contacted', 'interview', 'rejected', 'withdrawn'],
      under_review: ['shortlisted', 'contacted', 'interview', 'rejected', 'withdrawn'],
      shortlisted: ['contacted', 'interview', 'selected', 'hired', 'rejected', 'withdrawn'],
      contacted: ['interview', 'selected', 'hired', 'rejected', 'withdrawn'],
      interview: ['selected', 'hired', 'rejected', 'withdrawn'],
      selected: ['hired', 'rejected'],
      hired: [], rejected: [], withdrawn: []
    };
    if (existing.status !== status && !transitions[existing.status].includes(status)) {
      SupabaseSync.lastError = `An application that is ${existing.status.replace('_', ' ')} cannot be moved to ${status.replace('_', ' ')}.`;
      return false;
    }

    const synced = await SupabaseSync.syncApplicationStatus(appId, status, options);
    if (!synced) return false;

    // Persist after the authoritative Supabase write succeeds.
    const apps = this.getApplications().map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status,
          updatedDate: new Date().toISOString().slice(0, 10),
          employerNotes: options?.employerNotes ?? a.employerNotes,
          interviewDate: options?.interviewDate ?? a.interviewDate,
          interviewMode: options?.interviewMode ?? a.interviewMode,
          interviewLocation: options?.interviewLocation ?? a.interviewLocation,
        };
      }
      return a;
    });
    setStorage(STORAGE_KEYS.APPLICATIONS, apps);
    // The database notifies the driver of the new status.
    return true;
  },

  // Saved / Favorite Jobs
  getFavorites(driverId: string): string[] {
    const favs = getStorage<FavoriteJob[]>(STORAGE_KEYS.FAVORITES, []);
    return favs.filter(f => f.driverId === driverId).map(f => f.jobId);
  },

  async toggleFavorite(driverId: string, jobId: string): Promise<boolean> {
    const favs = getStorage<FavoriteJob[]>(STORAGE_KEYS.FAVORITES, []);
    const exists = favs.some(f => f.driverId === driverId && f.jobId === jobId);
    let updated: FavoriteJob[];
    if (exists) {
      updated = favs.filter(f => !(f.driverId === driverId && f.jobId === jobId));
    } else {
      updated = [...favs, { id: newId(), driverId, jobId, createdAt: new Date().toISOString() }];
    }
    const synced = await SupabaseSync.syncFavorite(driverId, jobId, !exists);
    if (!synced) return exists;
    setStorage(STORAGE_KEYS.FAVORITES, updated);
    return !exists;
  },

  mergeRemoteFavorites(driverId: string, rows: any[]): void {
    const existing = getStorage<FavoriteJob[]>(STORAGE_KEYS.FAVORITES, []);
    const keep = existing.filter(favorite => favorite.driverId !== driverId);
    const remote = rows.map(row => ({ id: row.id, driverId, jobId: row.job_id, createdAt: row.created_at }));
    setStorage(STORAGE_KEYS.FAVORITES, [...remote, ...keep]);
  },

  // Notifications strictly scoped to individual user account
  getNotifications(userId: string): Notification[] {
    if (!userId) return [];
    const notifs = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    return notifs.filter(n => n.userId === userId);
  },

  mergeRemoteNotifications(userId: string, rows: any[]): void {
    const existing = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    const keep = existing.filter(notification => notification.userId !== userId);
    const remote = rows.map((row): Notification => ({
      id: row.id, userId: row.user_id, title: row.title, message: row.message,
      type: row.type || 'system', read: Boolean(row.read),
      createdAt: row.created_at || '', link: row.link || undefined
    }));
    setStorage(STORAGE_KEYS.NOTIFICATIONS, [...remote, ...keep]);
  },

  async markNotificationAsRead(id: string): Promise<boolean> {
    if (!(await SupabaseSync.markNotificationRead(id))) return false;
    const notifs = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []).map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
    return true;
  },

  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    if (!(await SupabaseSync.markAllNotificationsRead(userId))) return false;
    const notifs = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []).map(n =>
      n.userId === userId ? { ...n, read: true } : n
    );
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
    return true;
  },

  // =======================================================================
  // APNAHIRE-STYLE SUBSCRIPTION, CREDITS, BILLING, UNLOCKS & SAVED SEARCHES
  // =======================================================================
  getSubscription(employerId: string): EmployerSubscription {
    const subs = getStorage<Record<string, EmployerSubscription>>(STORAGE_KEYS.SUBSCRIPTIONS, {});
    // The stored record is kept even when expired so billing details stay visible.
    const stored = subs[employerId];
    if (stored) return stored;
    const employer = this.getEmployerById(employerId);
    return {
      employerId,
      planName: 'No active hiring plan',
      jobCredits: 0,
      dbUnlockCredits: 0,
      totalJobCredits: 0,
      totalDbUnlockCredits: 0,
      activeJobSlots: 0,
      gstin: employer?.gstin || '',
      gstinVerified: false,
      billingCompanyName: employer?.companyName?.toUpperCase() || '',
      billingAddress: employer?.address || '',
      expiresAt: new Date(0).toISOString(),
      status: 'expired'
    };
  },

  mergeRemoteSubscription(subscription: EmployerSubscription): void {
    const subs = getStorage<Record<string, EmployerSubscription>>(STORAGE_KEYS.SUBSCRIPTIONS, {});
    subs[subscription.employerId] = subscription;
    setStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);
  },

  mergeRemoteBillingTransactions(transactions: BillingTransaction[]): void {
    const existing = getStorage<BillingTransaction[]>(STORAGE_KEYS.BILLING, []);
    const remoteIds = new Set(transactions.map(transaction => transaction.id));
    setStorage(STORAGE_KEYS.BILLING, [...transactions, ...existing.filter(transaction => !remoteIds.has(transaction.id))]);
  },

  getBillingTransactions(employerId: string): BillingTransaction[] {
    const txns = getStorage<BillingTransaction[]>(STORAGE_KEYS.BILLING, []);
    return txns.filter(t => t.employerId === employerId);
  },

  getCandidateUnlocks(employerId: string): CandidateUnlock[] {
    const unlocks = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, []);
    return unlocks.filter(u => u.employerId === employerId);
  },

  mergeRemoteCandidateUnlocks(employerId: string, rows: any[]): void {
    const existing = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, []);
    const keep = existing.filter(unlock => unlock.employerId !== employerId);
    const remote = rows.map((row): CandidateUnlock => ({
      id: row.id, employerId: row.employer_id, driverId: row.driver_id,
      unlockedAt: row.unlocked_at || '', downloadedExcel: Boolean(row.downloaded_excel)
    }));
    setStorage(STORAGE_KEYS.UNLOCKS, [...remote, ...keep]);
  },

  async unlockCandidate(employerId: string, driverId: string): Promise<{ success: boolean; message: string }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'employer' || currentUser.id !== employerId) {
      return { success: false, message: 'Only this company’s signed-in employer can unlock driver details.' };
    }
    const unlocks = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, []);
    const already = unlocks.find(u => u.employerId === employerId && u.driverId === driverId);
    if (already) {
      return { success: true, message: 'Candidate phone number already unlocked.' };
    }

    const sub = this.getSubscription(employerId);
    if (sub.dbUnlockCredits <= 0) {
      return { success: false, message: 'Out of Driver Database Credits. Please recharge your plan in Billing & Credits.' };
    }

    const newUnlock: CandidateUnlock = {
      id: newId(),
      employerId,
      driverId,
      unlockedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      downloadedExcel: false
    };
    const synced = await SupabaseSync.syncCandidateUnlock(newUnlock);
    if (!synced) return { success: false, message: 'Could not securely unlock this driver. Check your plan or connection and try again.' };
    setStorage(STORAGE_KEYS.UNLOCKS, [newUnlock, ...unlocks]);
    await SupabaseSync.fetchAndMergeRemoteData(this);
    // The database trigger notifies the driver together with the credit-backed unlock.
    return { success: true, message: 'Phone number unlocked! 1 Database Credit used.' };
  },

  /** Mark already-unlocked drivers as exported. Never creates (paid) unlocks. */
  async markDriversDownloadedExcel(employerId: string, driverIds: string[]): Promise<void> {
    const unlocks = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, []);
    const wanted = new Set(driverIds);
    const updated = unlocks.map(unlock => unlock.employerId === employerId && wanted.has(unlock.driverId)
      ? { ...unlock, downloadedExcel: true }
      : unlock);
    await SupabaseSync.markUnlocksExported(employerId, driverIds);
    setStorage(STORAGE_KEYS.UNLOCKS, updated);
  },

  getSavedSearches(employerId: string): SavedSearch[] {
    const searches = getStorage<SavedSearch[]>(STORAGE_KEYS.SAVED_SEARCHES, []);
    return searches.filter(s => s.employerId === employerId);
  },

  mergeRemoteSavedSearches(employerId: string, rows: any[]): void {
    const existing = getStorage<SavedSearch[]>(STORAGE_KEYS.SAVED_SEARCHES, []);
    const keep = existing.filter(search => search.employerId !== employerId);
    const remote = rows.map((row): SavedSearch => ({
      id: row.id, employerId: row.employer_id, title: row.title || '', category: row.category || '',
      city: row.city || '', district: row.district || '', pincode: row.pincode || '',
      radiusKm: typeof row.radius_km === 'number' ? row.radius_km : (row.radius_km ? Number(row.radius_km) : undefined),
      minExp: row.min_exp || 0, mustHaveSkills: row.must_have_skills || [],
      state: row.state || '', keyword: row.keyword || '', vehicleType: row.vehicle_type || '',
      activeInDays: row.active_in_days ?? undefined,
      createdAt: row.created_at?.slice(0, 10) || '', matchCount: row.match_count || 0
    }));
    setStorage(STORAGE_KEYS.SAVED_SEARCHES, [...remote, ...keep]);
  },

  async saveSearch(search: SavedSearch): Promise<boolean> {
    if (!(await SupabaseSync.syncSavedSearch(search))) return false;
    const searches = getStorage<SavedSearch[]>(STORAGE_KEYS.SAVED_SEARCHES, []);
    setStorage(STORAGE_KEYS.SAVED_SEARCHES, [search, ...searches]);
    return true;
  },

  async deleteSavedSearch(id: string): Promise<boolean> {
    const searches = getStorage<SavedSearch[]>(STORAGE_KEYS.SAVED_SEARCHES, []);
    const savedSearch = searches.find(search => search.id === id);
    if (savedSearch && !(await SupabaseSync.deleteSavedSearch(id, savedSearch.employerId))) return false;
    const updated = searches.filter(s => s.id !== id);
    setStorage(STORAGE_KEYS.SAVED_SEARCHES, updated);
    return true;
  },

  // Direct Messages (Employer <-> Driver)
  getMessages(userId: string): DirectMessage[] {
    const msgs = getStorage<DirectMessage[]>(STORAGE_KEYS.MESSAGES, []);
    return msgs.filter(m => m.senderId === userId || m.receiverId === userId);
  },

  mergeRemoteMessages(userId: string, rows: any[]): void {
    const existing = getStorage<DirectMessage[]>(STORAGE_KEYS.MESSAGES, []);
    const keep = existing.filter(message => message.senderId !== userId && message.receiverId !== userId);
    const remote = rows.map((row): DirectMessage => ({
      id: row.id, senderId: row.sender_id, senderName: row.sender_name || 'DriverHub user',
      senderRole: row.sender_role || 'driver', receiverId: row.receiver_id,
      receiverName: row.receiver_name || 'DriverHub user', jobId: row.job_id || undefined,
      jobTitle: row.job_title || undefined, text: row.text || '',
      timestamp: row.created_at || '', read: Boolean(row.read)
    }));
    setStorage(STORAGE_KEYS.MESSAGES, [...remote, ...keep]);
  },

  /** Mark cached incoming messages from one partner as read (no network). */
  markMessagesReadLocally(userId: string, partnerId: string): void {
    const msgs = getStorage<DirectMessage[]>(STORAGE_KEYS.MESSAGES, []);
    let changed = false;
    const next = msgs.map(message => {
      if (message.receiverId === userId && message.senderId === partnerId && !message.read) {
        changed = true;
        return { ...message, read: true };
      }
      return message;
    });
    if (changed) setStorage(STORAGE_KEYS.MESSAGES, next);
  },

  async sendMessage(msg: DirectMessage): Promise<boolean> {
    if (!(await SupabaseSync.syncDirectMessage(msg))) return false;
    const msgs = getStorage<DirectMessage[]>(STORAGE_KEYS.MESSAGES, []);
    setStorage(STORAGE_KEYS.MESSAGES, [...msgs, msg]);
    // The database notifies the receiver.
    return true;
  },

  /** Message from the last failed Supabase write, for user-facing errors. */
  getLastError(fallback = 'Something went wrong. Please try again.'): string {
    return SupabaseSync.lastError || fallback;
  }
};
