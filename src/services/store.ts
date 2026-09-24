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
    return item ? JSON.parse(item) : fallback;
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

// Automatically sync mock seed data to Supabase in the background
try {
  const isSynced = localStorage.getItem('driverhub_supabase_seeded_v1');
  if (!isSynced) {
    SupabaseSync.syncAllData(initialJobs, initialEmployers, initialDrivers, initialApplications).then(() => {
      localStorage.setItem('driverhub_supabase_seeded_v1', 'true');
    });
  }
} catch (e) {
  console.log('Seed sync initiation:', e);
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
    let driver = drivers.find(d => d.id === id);
    if (!driver) {
      const user = this.getUsers().find(u => u.id === id);
      const email = user?.email || 'driver@driverhub.in';
      const namePart = email.split('@')[0].replace(/[\._0-9]/g, ' ').trim();
      const capitalized = namePart ? namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Driver Candidate';
      
      driver = {
        id,
        fullName: capitalized || 'Driver Candidate',
        phone: user?.phone || '+91 98765 00000',
        email,
        location: 'Bengaluru',
        city: 'Bengaluru',
        state: 'Karnataka',
        driverCategory: 'HMV',
        licenseNumber: 'KA01 ' + Math.floor(10000000 + Math.random() * 90000000),
        licenseType: 'Heavy Motor Vehicle (HMV-Transport)',
        licenseExpiry: '2034-12-31',
        experienceYears: 3,
        skills: ['Interstate Freight', 'GPS Navigation', 'Safe Driving'],
        preferredLocation: 'Bengaluru / Karnataka',
        expectedSalary: 26000,
        availability: 'Immediate',
        bio: 'Dedicated driver with verified commercial credentials and a clean safety record.',
        status: 'active',
        experiences: [],
        documents: []
      };
      this.updateDriverProfile(driver);
    }
    return driver;
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

  getEmployerById(id: string): EmployerProfile {
    const employers = this.getEmployers();
    let employer = employers.find(e => e.id === id);
    if (!employer) {
      const user = this.getUsers().find(u => u.id === id);
      const email = user?.email || 'employer@driverhub.in';
      const namePart = email.split('@')[0].replace(/[\._0-9]/g, ' ').trim();
      const capitalized = namePart ? namePart.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Enterprise Fleet';

      employer = {
        id,
        companyName: capitalized + ' Logistics',
        contactPerson: 'Talent Manager',
        email,
        phone: user?.phone || '+91 80 2200 0000',
        industry: 'Logistics & Fleet Operations',
        location: 'Bengaluru',
        city: 'Bengaluru',
        state: 'Karnataka',
        address: 'Fleet Depot, Bengaluru - 560100',
        verified: true,
        status: 'active',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      this.updateEmployerProfile(employer);
    }
    return employer;
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

  verifyEmployer(id: string, verified: boolean): void {
    const employers = this.getEmployers().map(e => 
      e.id === id ? { ...e, verified, status: verified ? 'active' as const : e.status } : e
    );
    setStorage(STORAGE_KEYS.EMPLOYERS, employers);
  },

  // Jobs
  getJobs(): Job[] {
    return getStorage<Job[]>(STORAGE_KEYS.JOBS, initialJobs);
  },

  getJobById(id: string): Job | undefined {
    return this.getJobs().find(j => j.id === id);
  },

  addJob(job: Job): void {
    const jobs = this.getJobs();
    setStorage(STORAGE_KEYS.JOBS, [job, ...jobs]);
    
    // Sync directly to Supabase
    const employer = this.getEmployerById(job.employerId);
    SupabaseSync.syncJob(job, employer);

    // Add admin notification
    this.addNotification({
      id: 'notif-' + Date.now(),
      userId: 'usr-admin-1',
      title: 'New Job Listing Pending Review',
      message: `${job.companyName} submitted a new vacancy: "${job.title}".`,
      type: 'system',
      read: false,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      link: '/admin/jobs'
    });
  },

  updateJob(job: Job): void {
    const jobs = this.getJobs().map(j => j.id === job.id ? job : j);
    setStorage(STORAGE_KEYS.JOBS, jobs);
    SupabaseSync.syncJob(job);
  },

  updateJobStatus(jobId: string, status: Job['status']): void {
    const jobs = this.getJobs().map(j => j.id === jobId ? { ...j, status } : j);
    setStorage(STORAGE_KEYS.JOBS, jobs);
    const updated = jobs.find(j => j.id === jobId);
    if (updated) {
      SupabaseSync.syncJob(updated);
    }
  },

  // Applications
  getApplications(): Application[] {
    return getStorage<Application[]>(STORAGE_KEYS.APPLICATIONS, initialApplications);
  },

  getApplicationById(id: string): Application | undefined {
    return this.getApplications().find(a => a.id === id);
  },

  addApplication(app: Application): void {
    const applications = this.getApplications();
    setStorage(STORAGE_KEYS.APPLICATIONS, [app, ...applications]);

    // Sync directly to Supabase
    SupabaseSync.syncApplication(app);

    // Increment job applicationsCount
    const job = this.getJobById(app.jobId);
    if (job) {
      this.updateJob({ ...job, applicationsCount: (job.applicationsCount || 0) + 1 });
      
      // Notify Employer
      this.addNotification({
        id: 'notif-' + Date.now(),
        userId: job.employerId,
        title: 'New Application Received',
        message: `${app.driverName || 'A candidate'} applied for ${job.title}.`,
        type: 'new_application',
        read: false,
        createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        link: '/employer/applications'
      });
    }
  },

  updateApplicationStatus(
    appId: string, 
    status: Application['status'], 
    options?: { employerNotes?: string; interviewDate?: string; interviewMode?: Application['interviewMode']; interviewLocation?: string }
  ): void {
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

      // Sync application status to Supabase in real-time
      SupabaseSync.syncApplicationStatus(appId, status, options?.employerNotes);
    }
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
    if (subs[employerId]) return subs[employerId];
    const employer = this.getEmployerById(employerId);
    const defaultSub: EmployerSubscription = {
      employerId,
      planName: 'Starter Fleet Hiring Plan (2 Job Credits + 50 Driver Unlocks)',
      jobCredits: 4,
      dbUnlockCredits: 50,
      totalJobCredits: 5,
      totalDbUnlockCredits: 50,
      gstin: employer.gstin || '29AAKCB0612Q1ZC',
      gstinVerified: true,
      billingCompanyName: (employer.companyName || 'FLEET LOGISTICS INDIA PVT LTD').toUpperCase(),
      billingAddress: employer.address || 'Third Floor, No. 51, 3rd Stage, 4th Block, Basaveshwara Nagar, Bengaluru Urban, Karnataka - 560079',
      expiresAt: '2026-12-31',
      status: 'active'
    };
    subs[employerId] = defaultSub;
    setStorage(STORAGE_KEYS.SUBSCRIPTIONS, subs);
    return defaultSub;
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
    const empTxns = txns.filter(t => t.employerId === employerId || employerId === 'usr-employer-1');
    return empTxns.length > 0 ? empTxns : initialBillingTransactions;
  },

  getCandidateUnlocks(employerId: string): CandidateUnlock[] {
    const unlocks = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, initialCandidateUnlocks);
    return unlocks.filter(u => u.employerId === employerId);
  },

  unlockCandidate(employerId: string, driverId: string): { success: boolean; message: string } {
    const unlocks = getStorage<CandidateUnlock[]>(STORAGE_KEYS.UNLOCKS, initialCandidateUnlocks);
    const already = unlocks.find(u => u.employerId === employerId && u.driverId === driverId);
    if (already) {
      return { success: true, message: 'Candidate phone number already unlocked.' };
    }

    const sub = this.getSubscription(employerId);
    if (sub.dbUnlockCredits <= 0) {
      return { success: false, message: 'Out of Driver Database Credits. Please recharge your plan in Billing & Credits.' };
    }

    // Deduct 1 DB Unlock credit
    this.updateSubscription(employerId, {
      dbUnlockCredits: Math.max(0, sub.dbUnlockCredits - 1)
    });

    const newUnlock: CandidateUnlock = {
      id: 'unl-' + Date.now(),
      employerId,
      driverId,
      unlockedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      downloadedExcel: false
    };
    setStorage(STORAGE_KEYS.UNLOCKS, [newUnlock, ...unlocks]);
    SupabaseSync.syncCandidateUnlock(newUnlock);

    // Notify driver that a verified employer viewed/unlocked their contact
    const employer = this.getEmployerById(employerId);
    this.addNotification({
      id: 'notif-unlock-' + Date.now(),
      userId: driverId,
      title: 'Employer Unlocked Your Contact 📞',
      message: `${employer.companyName} unlocked your verified profile from the DriverHub Database and may call you directly.`,
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
    return searches.filter(s => s.employerId === employerId || employerId === 'usr-employer-1');
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
