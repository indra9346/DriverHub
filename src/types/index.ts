export type UserRole = 'driver' | 'employer' | 'admin';
export type UserStatus = 'active' | 'pending' | 'blocked';

export type DriverCategory = 
  | 'LMV'
  | 'HMV'
  | 'LMV-Transport'
  | 'HMV-Transport'
  | 'Truck Driver'
  | 'Bus Driver'
  | 'Delivery Driver'
  | 'Cab Driver'
  | 'Tempo Driver'
  | 'Trailer Driver'
  | 'Personal Driver'
  | 'Commercial Driver'
  | 'MCWG';

export type JobStatus = 'active' | 'pending' | 'closed' | 'rejected' | 'draft';
export type ApplicationStatus = 'applied' | 'under_review' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | 'withdrawn';
export type DocumentType = 'resume' | 'driving_license' | 'aadhar' | 'pan' | 'experience_cert' | 'police_verification' | 'other';
export type VerificationStatus = 'verified' | 'pending' | 'rejected';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
  phone?: string;
  createdAt: string;
}

export interface DriverProfile {
  id: string; // user id
  fullName: string;
  phone: string;
  email: string;
  location: string;
  city: string;
  state: string;
  driverCategory: DriverCategory;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  experienceYears: number;
  skills: string[];
  preferredLocation?: string;
  expectedSalary?: number;
  availability: 'Immediate' | '15 Days' | '1 Month' | 'Flexible';
  bio?: string;
  avatarUrl?: string;
  resumeUrl?: string;
  status: UserStatus;
  experiences?: DriverExperience[];
  documents?: DriverDocument[];
}

export interface DriverExperience {
  id: string;
  driverId: string;
  companyName: string;
  roleTitle: string;
  vehicleType: string;
  durationYears: number;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface DriverDocument {
  id: string;
  driverId: string;
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileSize?: string;
  uploadDate: string;
  verificationStatus: VerificationStatus;
}

export interface EmployerProfile {
  id: string; // user id
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  industry: string;
  location: string;
  city: string;
  state: string;
  address?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  verified: boolean;
  status: UserStatus;
  createdAt: string;
}

export interface Job {
  id: string;
  employerId: string;
  companyName: string;
  companyLogo?: string;
  title: string;
  category: DriverCategory;
  location: string;
  city: string;
  state: string;
  experienceRequired: string;
  experienceMinYears?: number;
  salaryMin: number;
  salaryMax: number;
  salaryType?: 'monthly' | 'yearly' | 'daily';
  workingHours: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary';
  description: string;
  requiredSkills: string[];
  requiredDocs: string[];
  vacancies: number;
  status: JobStatus;
  postedDate: string;
  applicationsCount?: number;
}

export interface Application {
  id: string;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  driverId: string;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
  driverCategory?: DriverCategory;
  driverExperienceYears?: number;
  driverLocation?: string;
  resumeUrl?: string;
  coverMessage?: string;
  status: ApplicationStatus;
  appliedDate: string;
  updatedDate: string;
  employerNotes?: string;
  interviewDate?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'application_status' | 'new_application' | 'job_approved' | 'job_rejected' | 'job_match' | 'system';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface FavoriteJob {
  id: string;
  driverId: string;
  jobId: string;
  createdAt: string;
}

export interface AdminAction {
  id: string;
  adminId: string;
  targetType: 'job' | 'employer' | 'driver';
  targetId: string;
  action: 'approve' | 'reject' | 'block' | 'unblock' | 'delete';
  reason?: string;
  createdAt: string;
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  options?: string[];
  actionLink?: {
    text: string;
    url: string;
  };
}
