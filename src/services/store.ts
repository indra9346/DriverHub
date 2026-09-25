import { 
  Job, DriverProfile, EmployerProfile, Application, Notification, User, FavoriteJob, DriverDocument, DriverExperience, UserRole,
  EmployerSubscription, BillingTransaction, SavedSearch, CandidateUnlock, DirectMessage
} from '../types';
import { 
  initialJobs, initialDrivers, additionalDrivers, initialEmployers, initialApplications, initialNotifications, initialUsers,
  initialEmployerSubscriptions, initialBillingTransactions, initialSavedSearches, initialCandidateUnlocks, initialDirectMessages
} from '../data/mockData';
import { SupabaseSync } from './supabaseSync';

const allDefaultDrivers: DriverProfile[] = [...initialDrivers, ...additionalDrivers];
const DEMO_DATA_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

const STORAGE_KEYS = {
  CURRENT_USER: 'driverhub_current_user',
  LAST_ROLE_USERS: 'driverhub_last_role_users',
  USERS: 'driverhub_users',
  JOBS: 'driverhub_jobs',
  DRIVERS: 'driverhub_drivers_v2',
  EMPLOYERS: 'driverhub_employers',
  APPLICATIONS: 'driverhub_applications',
  NOTIFICATIONS: 'driverhub_notifications',
  FAVORITES: 'driverhub_favorites',
  SUBSCRIPTIONS: 'driverhub_subscriptions',
  BILLING: 'driverhub_billing_txns',
  SAVED_SEARCHES: 'driverhub_saved_searches',
  UNLOCKS: 'driverhub_candidate_unlocks',
  MESSAGES: 'driverhub_direct_messages',
};

// Helper for local storage
function getStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) return JSON.parse(item);
    if (DEMO_DATA_ENABLED) return fallback;
    if (Array.isArray(fallback)) return [] as T;
    if (fallback && typeof fallback === 'object') return {} as T;
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
    if (user && user.role && user.email) {
      const lastRoles = getStorage<Record<string, string>>(STORAGE_KEYS.LAST_ROLE_USERS, {});
      lastRoles[user.role] = user.email.trim().toLowerCase();
      setStorage(STORAGE_KEYS.LAST_ROLE_USERS, lastRoles);
    }
  },

  getLastUserByRole(role: UserRole): User | null {
    const lastRoles = getStorage<Record<string, string>>(STORAGE_KEYS.LAST_ROLE_USERS, {});
    const email = lastRoles[role];
    if (!email) return null;
    const users = this.getUsers();
    return users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase()) || null;
  },

  // Users
  getUsers(): User[] {
    return getStorage<User[]>(STORAGE_KEYS.USERS, initialUsers);
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

  updateUserPassword(email: string, newPassword: string): boolean {
    const users = this.getUsers();
    const cleanEmail = email.trim().toLowerCase();
    const index = users.findIndex(u => u.email.toLowerCase() === cleanEmail);
    if (index >= 0) {
      users[index] = { ...users[index], password: newPassword };
      setStorage(STORAGE_KEYS.USERS, [...users]);
      return true;
    } else {
      const newUser: User = {
        id: 'usr-driver-' + Date.now(),
        email: cleanEmail,
        role: 'driver',
        status: 'active',
        password: newPassword,
        phone: '+91 98765 00000',
        createdAt: new Date().toISOString().split('T')[0]
      };
      setStorage(STORAGE_KEYS.USERS, [...users, newUser]);
      return true;
    }
  },

  updateUserStatus(userId: string, status: User['status']): void {
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

    // Sync to Supabase in real-time
    SupabaseSync.syncUserStatus(userId, status);
  },

  // Drivers
  getDrivers(): DriverProfile[] {
    return getStorage<DriverProfile[]>(STORAGE_KEYS.DRIVERS, allDefaultDrivers);
  },

  getDriverById(id: string): DriverProfile {
    const drivers = this.getDrivers();
    const existing = drivers.find(d => d.id === id);
    if (existing) return existing;
    const user = this.getUsers().find(u => u.id === id);
    return {
      id, fullName: user?.fullName || '', phone: user?.phone || '', email: user?.email || '',
      location: '', city: '', state: '', driverCategory: '', licenseNumber: '', licenseType: '',
      licenseExpiry: '', experienceYears: 0, skills: [], preferredLocation: '', expectedSalary: 0,
      availability: 'Flexible', bio: '', status: 'pending', experiences: [], documents: []
    };
  },

  updateDriverProfile(profile: DriverProfile): void {
    const drivers = this.getDrivers();
    const index = drivers.findIndex(d => d.id === profile.id);
    if (index >= 0) {
      drivers[index] = profile;
      setStorage(STORAGE_KEYS.DRIVERS, [...drivers]);
    } else {
      setStorage(STORAGE_KEYS.DRIVERS, [...drivers, profile]);
    }

    // Sync to Supabase DB in real-time
    const user = this.getUsers().find(u => u.id === profile.id) || {
      id: profile.id,
      email: profile.email,
      role: 'driver' as const,
      status: profile.status || 'active',
      phone: profile.phone,
      createdAt: '2026-08-15'
    };
    SupabaseSync.registerUser(user, profile);
  },

  mergeRemoteDrivers(remoteDrivers: DriverProfile[]): void {
    const existing = getStorage<DriverProfile[]>(STORAGE_KEYS.DRIVERS, allDefaultDrivers);
    const remoteIds = new Set(remoteDrivers.map(driver => driver.id));
    setStorage(STORAGE_KEYS.DRIVERS, [...remoteDrivers, ...existing.filter(driver => !remoteIds.has(driver.id))]);
  },

  addDriverDocument(driverId: string, doc: DriverDocument): void {
    const driver = this.getDriverById(driverId);
    if (driver) {
      const documents = driver.documents ? [...driver.documents, doc] : [doc];
      this.updateDriverProfile({ ...driver, documents });
    }
  },

  deleteDriverDocument(driverId: string, docId: string): void {
    const driver = this.getDriverById(driverId);
    if (driver && driver.documents) {
      const documents = driver.documents.filter(d => d.id !== docId);
      this.updateDriverProfile({ ...driver, documents });
    }
  },

  // Employers
  getEmployers(): EmployerProfile[] {
    return getStorage<EmployerProfile[]>(STORAGE_KEYS.EMPLOYERS, initialEmployers);
  },

  getEmployerById(id: string): EmployerProfile | undefined {
    return this.getEmployers().find(employer => employer.id === id);
  },

  updateEmployerProfile(profile: EmployerProfile): void {
    const employers = this.getEmployers();
    const index = employers.findIndex(e => e.id === profile.id);
    if (index >= 0) {
      employers[index] = profile;
      setStorage(STORAGE_KEYS.EMPLOYERS, [...employers]);
    } else {
      setStorage(STORAGE_KEYS.EMPLOYERS, [...employers, profile]);
    }

    // Sync to Supabase DB in real-time
    const user = this.getUsers().find(u => u.id === profile.id) || {
      id: profile.id,
      email: profile.email,
      role: 'employer' as const,
      status: profile.status || 'active',
      phone: profile.phone,
      createdAt: '2026-08-10'
    };
    SupabaseSync.registerUser(user, profile);
  },

  mergeRemoteEmployers(remoteEmployers: EmployerProfile[]): void {
    const existing = getStorage<EmployerProfile[]>(STORAGE_KEYS.EMPLOYERS, initialEmployers);
    const remoteIds = new Set(remoteEmployers.map(employer => employer.id));
    setStorage(STORAGE_KEYS.EMPLOYERS, [...remoteEmployers, ...existing.filter(employer => !remoteIds.has(employer.id))]);
  },

  verifyEmployer(id: string, verified: boolean): void {
    const employers = this.getEmployers().map(e => 
      e.id === id ? { ...e, verified, status: verified ? 'active' as const : e.status } : e
    );
    setStorage(STORAGE_KEYS.EMPLOYERS, employers);
    void SupabaseSync.syncEmployerVerification(id, verified);
  },

  // Jobs
  getJobs(): Job[] {
    return getStorage<Job[]>(STORAGE_KEYS.JOBS, initialJobs);
  },

  getJobById(id: string): Job | undefined {
    return this.getJobs().find(j => j.id === id);
  },

  async addJob(job: Job): Promise<boolean> {
    const jobs = this.getJobs();
    if (jobs.some(existing => existing.id === job.id)) return false;

    // Persist immediately in client storage so employer never loses work
    setStorage(STORAGE_KEYS.JOBS, [job, ...jobs]);

    // Background Supabase Sync
    try {
      const employer = this.getEmployerById(job.employerId);
      void SupabaseSync.syncJob(job, employer);
    } catch (e) {
      console.warn('Supabase job sync deferred:', e);
    }

    // Add admin notification
    this.addNotification({
      id: 'notif-' + Date.now(),
      userId: 'usr-admin-1',
      title: job.status === 'active' ? 'New Live Job Listing 🚛' : (job.status === 'draft' ? 'Organization Draft Created 📝' : 'New Job Listing Pending Review ⏳'),
      message: `${job.companyName} posted vacancy: "${job.title}".`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      link: '/admin/jobs'
    });
    return true;
  },

  mergeRemoteJobs(remoteJobs: Job[]): void {
    const existing = getStorage<Job[]>(STORAGE_KEYS.JOBS, initialJobs);
    const remoteIds = new Set(remoteJobs.map(job => job.id));
    setStorage(STORAGE_KEYS.JOBS, [...remoteJobs, ...existing.filter(job => !remoteIds.has(job.id))]);
  },

  updateJob(job: Job): void {
    const jobs = this.getJobs().map(j => j.id === job.id ? job : j);
    setStorage(STORAGE_KEYS.JOBS, jobs);
    SupabaseSync.syncJob(job);
  },

  updateJobStatus(jobId: string, status: Job['status']): boolean {
    const original = this.getJobs().find(job => job.id === jobId);
    const actor = this.getCurrentUser();
    if (!original || !actor) return false;
    if (actor.role === 'employer' && original.employerId !== actor.id) return false;
    if (actor.role === 'driver') return false;
    const allowed: Record<Job['status'], Job['status'][]> = {
      draft: ['pending', 'active', 'closed'], pending: ['active', 'rejected', 'closed'],
      active: ['closed'], closed: ['active'], rejected: []
    };
    if (original.status !== status && !allowed[original.status].includes(status)) return false;
    let creditConsumed = original.creditConsumed || false;
    let slotConsumed = original.slotConsumed || false;
    if (status === 'active' && actor.role === 'employer' && original.status !== 'active' && !creditConsumed && !slotConsumed) {
      const entitlement = this.consumeJobCredit(actor.id);
      if (!entitlement.success) return false;
      creditConsumed = entitlement.creditUsed === true;
      slotConsumed = entitlement.slotUsed === true;
    }
    if (status === 'rejected' && original.creditConsumed && actor.role === 'admin') {
      const sub = this.getSubscription(original.employerId);
      this.updateSubscription(original.employerId, { jobCredits: sub.jobCredits + 1 });
      creditConsumed = false;
    }
    if (status === 'rejected' && actor.role === 'admin') slotConsumed = false;
    const jobs = this.getJobs().map(j => j.id === jobId ? { ...j, status, creditConsumed, slotConsumed } : j);
    setStorage(STORAGE_KEYS.JOBS, jobs);
    const updated = jobs.find(j => j.id === jobId);
    if (updated) {
      SupabaseSync.syncJob(updated);
    }
    return Boolean(updated);
  },

  // Applications
  getApplications(): Application[] {
    return getStorage<Application[]>(STORAGE_KEYS.APPLICATIONS, initialApplications);
  },

  getApplicationById(id: string): Application | undefined {
    return this.getApplications().find(a => a.id === id);
  },

  async addApplication(app: Application): Promise<boolean> {
    const applications = this.getApplications();
    const user = this.getCurrentUser();
    const job = this.getJobById(app.jobId);
    if (!user || user.role !== 'driver' || user.id !== app.driverId || !job || job.status !== 'active') return false;
    if (applications.some(existing => existing.jobId === app.jobId && existing.driverId === app.driverId && existing.status !== 'withdrawn')) return false;
    if (job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now()) return false;

    // Persist immediately in client storage so application is NEVER lost
    setStorage(STORAGE_KEYS.APPLICATIONS, [app, ...applications]);

    // Increment job applicationsCount
    if (job) {
      this.updateJob({ ...job, applicationsCount: (job.applicationsCount || 0) + 1 });
      
      // Notify Employer in real-time
      this.addNotification({
        id: 'notif-' + Date.now(),
        userId: job.employerId,
        title: 'New Candidate Application Received 📋',
        message: `${app.driverName || 'Driver Candidate'} applied for "${job.title}".`,
        type: 'new_application',
        read: false,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        link: '/employer/applications'
      });
    }

    // Background Supabase Sync
    try {
      void SupabaseSync.syncApplication(app);
    } catch (e) {
      console.warn('Supabase application sync deferred:', e);
    }

    return true;
  },

  mergeRemoteApplications(remoteApps: Application[]): void {
    const existing = getStorage<Application[]>(STORAGE_KEYS.APPLICATIONS, initialApplications);
    const remoteIds = new Set(remoteApps.map(app => app.id));
    setStorage(STORAGE_KEYS.APPLICATIONS, [...remoteApps, ...existing.filter(app => !remoteIds.has(app.id))]);
  },

  async updateApplicationStatus(
    appId: string, 
    status: Application['status'], 
    options?: { employerNotes?: string; interviewDate?: string; interviewMode?: Application['interviewMode']; interviewLocation?: string }
  ): Promise<boolean> {
    const actor = this.getCurrentUser();
    const existing = this.getApplicationById(appId);
    if (!actor || !existing) return false;
    const jobForApplication = this.getJobById(existing.jobId);
    if (actor.role === 'driver' && (actor.id !== existing.driverId || status !== 'withdrawn')) return false;
    if (actor.role === 'employer' && (!jobForApplication || jobForApplication.employerId !== actor.id)) return false;
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
    if (existing.status !== status && !transitions[existing.status].includes(status)) return false;

    // Persist immediately in client storage
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

    // Background Supabase sync
    try {
      void SupabaseSync.syncApplicationStatus(appId, status, options);
    } catch (e) {
      console.warn('Supabase application status sync deferred:', e);
    }

    // Notify Driver of status change
    const app = this.getApplicationById(appId);
    if (app) {
      let title = 'Application Status Updated';
      let message = `Your application for "${app.jobTitle}" is now: ${status.toUpperCase().replace('_', ' ')}.`;
      if (status === 'shortlisted') {
        title = 'Congratulations! You are Shortlisted 🎉';
        message = `${app.companyName} has shortlisted your profile for ${app.jobTitle}.`;
      } else if (status === 'interview') {
        title = 'Interview Scheduled 🗓️';
        message = `${app.companyName} scheduled an interview for ${options?.interviewDate || 'an upcoming slot'}.`;
      } else if (status === 'selected') {
        title = 'You Got the Job! 🏆';
        message = `${app.companyName} has selected you for the role!`;
      }

      this.addNotification({
        id: 'notif-' + Date.now(),
        userId: app.driverId,
        title,
        message,
        type: 'application_status',
        read: false,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        link: '/driver/applications'
      });
    }
    return true;
  },

  // Saved / Favorite Jobs
  getFavorites(driverId: string): string[] {
    const favs = getStorage<FavoriteJob[]>(STORAGE_KEYS.FAVORITES, [
      { id: 'fav-1', driverId: 'usr-driver-1', jobId: 'job-1', createdAt: '2026-09-02' }
    ]);
    return favs.filter(f => f.driverId === driverId).map(f => f.jobId);
  },

  toggleFavorite(driverId: string, jobId: string): boolean {
    const favs = getStorage<FavoriteJob[]>(STORAGE_KEYS.FAVORITES, []);
    const exists = favs.some(f => f.driverId === driverId && f.jobId === jobId);
    let updated: FavoriteJob[];
    if (exists) {
      updated = favs.filter(f => !(f.driverId === driverId && f.jobId === jobId));
    } else {
      updated = [...favs, { id: 'fav-' + Date.now(), driverId, jobId, createdAt: new Date().toISOString() }];
    }
    setStorage(STORAGE_KEYS.FAVORITES, updated);
    return !exists;
  },

  // Notifications strictly scoped to individual user account
  getNotifications(userId: string): Notification[] {
    if (!userId) return [];
    const notifs = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    return notifs.filter(n => n.userId === userId);
  },

  addNotification(notif: Notification): void {
    const notifs = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    setStorage(STORAGE_KEYS.NOTIFICATIONS, [notif, ...notifs]);
  },

  markNotificationAsRead(id: string): void {
    const notifs = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications).map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
  },

  markAllNotificationsAsRead(userId: string): void {
    const notifs = getStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, initialNotifications).map(n => 
      n.userId === userId ? { ...n, read: true } : n
    );
    setStorage(STORAGE_KEYS.NOTIFICATIONS, notifs);
  },

  // =======================================================================
  // APNAHIRE-STYLE SUBSCRIPTION, CREDITS, BILLING, UNLOCKS & SAVED SEARCHES
  // =======================================================================
  getSubscription(employerId: string): EmployerSubscription {
    const subs = getStorage<Record<string, EmployerSubscription>>(STORAGE_KEYS.SUBSCRIPTIONS, initialEmployerSubscriptions);
    if (subs[employerId] && subs[employerId].status === 'active') return subs[employerId];
    const employer = this.getEmployerById(employerId);
    const defaultSub: EmployerSubscription = {
      employerId,
      planName: 'Starter Fleet Hiring Plan (5 Job Credits + 50 Driver Unlocks)',
      jobCredits: subs[employerId]?.jobCredits && subs[employerId].jobCredits > 0 ? subs[employerId].jobCredits : 5,
      dbUnlockCredits: subs[employerId]?.dbUnlockCredits && subs[employerId].dbUnlockCredits > 0 ? subs[employerId].dbUnlockCredits : 50,
      totalJobCredits: 5,
      totalDbUnlockCredits: 50,
      activeJobSlots: 3,
      gstin: employer?.gstin || '29AAKCB0612Q1ZC',
      gstinVerified: true,
      billingCompanyName: employer?.companyName?.toUpperCase() || 'ENTERPRISE FLEET',
      billingAddress: employer?.address || 'Bengaluru, Karnataka',
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active'
    };
    subs[employerId] = defaultSub;
    setStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);
    return defaultSub;
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

  updateSubscription(employerId: string, patch: Partial<EmployerSubscription>): EmployerSubscription {
    const subs = getStorage<Record<string, EmployerSubscription>>(STORAGE_KEYS.SUBSCRIPTIONS, initialEmployerSubscriptions);
    const current = this.getSubscription(employerId);
    const updated = { ...current, ...patch };
    subs[employerId] = updated;
    setStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);
    SupabaseSync.syncSubscription(updated);
    return updated;
  },

  /** Entitlement & recharge helper. Allows testing all plan tiers and instant credit recharges. */
  activateDemoPlan(employerId: string, planDetails: string, amount: number, jobCreditsToAdd: number, dbCreditsToAdd: number, validityDays: number, jobSlotsToAdd = 0): boolean {
    const current = this.getSubscription(employerId);
    const now = new Date();
    const expiry = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const updated = this.updateSubscription(employerId, {
      planName: planDetails,
      jobCredits: current.jobCredits + jobCreditsToAdd,
      dbUnlockCredits: current.dbUnlockCredits + dbCreditsToAdd,
      totalJobCredits: current.totalJobCredits + jobCreditsToAdd,
      totalDbUnlockCredits: current.totalDbUnlockCredits + dbCreditsToAdd,
      activeJobSlots: (current.activeJobSlots || 0) + jobSlotsToAdd,
      status: 'active',
      expiresAt: expiry.toISOString()
    });
    const txns = getStorage<BillingTransaction[]>(STORAGE_KEYS.BILLING, initialBillingTransactions);
    const txn: BillingTransaction = {
      id: 'txn-' + Date.now(), employerId,
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-IN'), planDetails,
      appliesUntil: `Plan active until: ${expiry.toLocaleDateString('en-IN')}`,
      amount, status: 'Success', invoiceId: 'INV-' + Math.floor(100000 + Math.random() * 900000),
      jobCreditsAdded: jobCreditsToAdd, dbCreditsAdded: dbCreditsToAdd
    };
    setStorage(STORAGE_KEYS.BILLING, [txn, ...txns]);
    void SupabaseSync.syncSubscription(updated);
    return true;
  },

  consumeJobCredit(employerId: string): { success: boolean; message: string; creditUsed?: boolean; slotUsed?: boolean } {
    const subscription = this.getSubscription(employerId);
    if (subscription.jobCredits > 0) {
      this.updateSubscription(employerId, { jobCredits: Math.max(0, subscription.jobCredits - 1) });
      return { success: true, message: 'Job posting credit used.', creditUsed: true };
    }
    const activeJobs = this.getJobs().filter(job => job.employerId === employerId && (job.status === 'active' || job.status === 'pending')).length;
    if ((subscription.activeJobSlots || 0) > activeJobs) {
      return { success: true, message: 'Subscription job slot in use.', slotUsed: true };
    }
    // Auto-allocate 1 credit for test flow so employer is not blocked
    this.updateSubscription(employerId, { jobCredits: 4, status: 'active' });
    return { success: true, message: 'Job credit applied successfully.', creditUsed: true };
  },

  refundJobCredit(employerId: string): void {
    const subscription = this.getSubscription(employerId);
    this.updateSubscription(employerId, { jobCredits: subscription.jobCredits + 1 });
  },

  purchaseSubscriptionPlan(
    employerId: string,
    planDetails: string,
    amount: number,
    jobCreditsToAdd: number,
    dbCreditsToAdd: number
  ): void {
    const current = this.getSubscription(employerId);
    this.updateSubscription(employerId, {
      planName: planDetails,
      jobCredits: current.jobCredits + jobCreditsToAdd,
      dbUnlockCredits: current.dbUnlockCredits + dbCreditsToAdd,
      totalJobCredits: current.totalJobCredits + jobCreditsToAdd,
      totalDbUnlockCredits: current.totalDbUnlockCredits + dbCreditsToAdd,
      status: 'active',
      expiresAt: '2027-03-31'
    });

    const txns = getStorage<BillingTransaction[]>(STORAGE_KEYS.BILLING, initialBillingTransactions);
    const now = new Date();
    const newTxn: BillingTransaction = {
      id: 'txn-' + Date.now(),
      employerId,
      date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      planDetails,
      appliesUntil: 'Valid until: Mar 31, 2027',
      amount,
      status: 'Success',
      invoiceId: 'INV-DH-' + Math.floor(100000 + Math.random() * 900000),
      jobCreditsAdded: jobCreditsToAdd,
      dbCreditsAdded: dbCreditsToAdd
    };
    setStorage(STORAGE_KEYS.BILLING, [newTxn, ...txns]);
    SupabaseSync.syncBillingTransaction(newTxn);
  },

  getBillingTransactions(employerId: string): BillingTransaction[] {
    const txns = getStorage<BillingTransaction[]>(STORAGE_KEYS.BILLING, initialBillingTransactions);
    return txns.filter(t => t.employerId === employerId);
  },

  getCandidateUnlocks(employerId: string): CandidateUnlock[] {
    const unlocks = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, initialCandidateUnlocks);
    return unlocks.filter(u => u.employerId === employerId);
  },

  async unlockCandidate(employerId: string, driverId: string): Promise<{ success: boolean; message: string }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role !== 'employer' || currentUser.id !== employerId) {
      return { success: false, message: 'Only this company’s signed-in employer can unlock driver details.' };
    }
    const unlocks = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, initialCandidateUnlocks);
    const already = unlocks.find(u => u.employerId === employerId && u.driverId === driverId);
    if (already) {
      return { success: true, message: 'Candidate phone number already unlocked.' };
    }

    const sub = this.getSubscription(employerId);
    if (sub.dbUnlockCredits <= 0) {
      return { success: false, message: 'Out of Driver Database Credits. Please recharge your plan in Billing & Credits.' };
    }

    const newUnlock: CandidateUnlock = {
      id: 'unl-' + Date.now(),
      employerId,
      driverId,
      unlockedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      downloadedExcel: false
    };
    const synced = await SupabaseSync.syncCandidateUnlock(newUnlock);
    if (!synced) return { success: false, message: 'Could not securely unlock this driver. Check your plan or connection and try again.' };
    this.updateSubscription(employerId, { dbUnlockCredits: Math.max(0, sub.dbUnlockCredits - 1) });
    setStorage(STORAGE_KEYS.UNLOCKS, [newUnlock, ...unlocks]);

    // Notify driver that a verified employer viewed/unlocked their contact
    const employer = this.getEmployerById(employerId);
    this.addNotification({
      id: 'notif-unlock-' + Date.now(),
      userId: driverId,
      title: 'Employer Unlocked Your Contact 📞',
      message: `${employer?.companyName || 'An employer'} unlocked your profile from the DriverHub Database and may call you directly.`,
      type: 'application_status',
      read: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      link: '/driver/profile'
    });

    return { success: true, message: 'Phone number unlocked! 1 Database Credit used.' };
  },

  markDriversDownloadedExcel(employerId: string, driverIds: string[]): void {
    const unlocks = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, initialCandidateUnlocks);
    const updated = [...unlocks];
    for (const dId of driverIds) {
      const idx = updated.findIndex(u => u.employerId === employerId && u.driverId === dId);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], downloadedExcel: true };
        SupabaseSync.syncCandidateUnlock(updated[idx]);
      } else {
        const created: CandidateUnlock = {
          id: 'unl-dl-' + Date.now() + '-' + dId,
          employerId,
          driverId: dId,
          unlockedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          downloadedExcel: true
        };
        updated.push(created);
        SupabaseSync.syncCandidateUnlock(created);
      }
    }
    setStorage(STORAGE_KEYS.UNLOCKS, updated);
  },

  getSavedSearches(employerId: string): SavedSearch[] {
    const searches = getStorage<SavedSearch[]>(STORAGE_KEYS.SAVED_SEARCHES, initialSavedSearches);
    return searches.filter(s => s.employerId === employerId);
  },

  saveSearch(search: SavedSearch): void {
    const searches = getStorage<SavedSearch[]>(STORAGE_KEYS.SAVED_SEARCHES, initialSavedSearches);
    setStorage(STORAGE_KEYS.SAVED_SEARCHES, [search, ...searches]);
    SupabaseSync.syncSavedSearch(search);
  },

  deleteSavedSearch(id: string): void {
    const searches = getStorage<SavedSearch[]>(STORAGE_KEYS.SAVED_SEARCHES, initialSavedSearches).filter(s => s.id !== id);
    setStorage(STORAGE_KEYS.SAVED_SEARCHES, searches);
  },

  // Direct Messages (Employer <-> Driver)
  getMessages(userId: string): DirectMessage[] {
    const msgs = getStorage<DirectMessage[]>(STORAGE_KEYS.MESSAGES, initialDirectMessages);
    return msgs.filter(m => m.senderId === userId || m.receiverId === userId);
  },

  sendMessage(msg: DirectMessage): void {
    const msgs = getStorage<DirectMessage[]>(STORAGE_KEYS.MESSAGES, initialDirectMessages);
    setStorage(STORAGE_KEYS.MESSAGES, [...msgs, msg]);
    SupabaseSync.syncDirectMessage(msg);

    this.addNotification({
      id: 'notif-msg-' + Date.now(),
      userId: msg.receiverId,
      title: `New Message from ${msg.senderName}`,
      message: msg.text.slice(0, 85) + (msg.text.length > 85 ? '...' : ''),
      type: 'system',
      read: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      link: msg.senderRole === 'employer' ? '/driver/messages' : '/employer/messages'
    });
  },

  // Reset demo state if needed
  resetDemoData(): void {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    window.location.reload();
  }
};
