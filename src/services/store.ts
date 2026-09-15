import { 
  Job, DriverProfile, EmployerProfile, Application, Notification, User, FavoriteJob, DriverDocument, DriverExperience 
} from '../types';
import { initialJobs, initialDrivers, initialEmployers, initialApplications, initialNotifications, initialUsers } from '../data/mockData';
import { SupabaseSync } from './supabaseSync';

const STORAGE_KEYS = {
  CURRENT_USER: 'driverhub_current_user',
  USERS: 'driverhub_users',
  JOBS: 'driverhub_jobs',
  DRIVERS: 'driverhub_drivers',
  EMPLOYERS: 'driverhub_employers',
  APPLICATIONS: 'driverhub_applications',
  NOTIFICATIONS: 'driverhub_notifications',
  FAVORITES: 'driverhub_favorites',
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
    return getStorage<DriverProfile[]>(STORAGE_KEYS.DRIVERS, initialDrivers);
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
    options?: { employerNotes?: string; interviewDate?: string }
  ): void {
    const apps = this.getApplications().map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status,
          updatedDate: new Date().toISOString().slice(0, 10),
          employerNotes: options?.employerNotes ?? a.employerNotes,
          interviewDate: options?.interviewDate ?? a.interviewDate,
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

  // Reset demo state if needed
  resetDemoData(): void {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.JOBS);
    localStorage.removeItem(STORAGE_KEYS.DRIVERS);
    localStorage.removeItem(STORAGE_KEYS.EMPLOYERS);
    localStorage.removeItem(STORAGE_KEYS.APPLICATIONS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    window.location.reload();
  }
};
