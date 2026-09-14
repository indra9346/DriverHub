# Driver Hub — Driver Recruitment & Job Portal

A driver recruitment and job portal connecting **Drivers / Candidates**, **Employers / Fleet Companies**, and **Administrators** with Supabase integration, real-time AI Support Assistant, responsive UI, trimmed/curved logo assets, and an Android React Native MVP.

---

## 🌟 Key Features

### 🚗 For Drivers & Candidates
- **Registration & Authentication**: Quick registration with license category and city.
- **Dynamic Profile Management**: Profile completion score, driving license details (HMV/LMV/Transport badges), multiple experience records, and expected compensation.
- **Document Uploader**: Secure document manager for Commercial Driving License, Aadhar Card, Resume, and Police Clearance with verification status.
- **Job Search & Advanced Filters**: Multi-parameter search by license type, location, experience years, shift timings, and minimum salary in INR (`₹`).
- **1-Tap Application**: Apply to verified jobs with optional cover note and duplicate application prevention.
- **Application Status Tracker**: Real-time status pipeline (`Applied` → `Under Review` → `Shortlisted` → `Interview Scheduled` → `Selected / Hired`).
- **Saved / Bookmarked Jobs**: Save vacancies for quick comparison.
- **Notification Inbox**: Push & in-app alerts for shortlisting and interview invites.

### 🏢 For Employers & Fleets
- **Employer Profile**: Company branding, logo, industry, contact person, and address.
- **Job Vacancy Posting**: Comprehensive job builder with category, experience requirements, salary ranges, shift schedules, and mandatory document checklists.
- **Admin Approval Queue**: Newly posted vacancies start in "Pending Admin Approval" to ensure trust.
- **Manage Listings**: Close, reopen, or inspect candidate application counts.
- **Candidate Pipeline Tracker**: Review applicant profiles, download documents, schedule driving tests with specific dates, and update candidate statuses.
- **Driver Talent Pool**: Searchable database of verified drivers by category and location with direct contact options.

### 🛡️ For Superadmin
- **Analytics Dashboard**: Platform metrics (Total Drivers, Employers, Active Jobs, Pending Approvals).
- **Job Moderation Queue**: 1-click Approve, Reject with notes, or Suspend listings.
- **Candidate Moderation**: Review driver credentials and block/unblock accounts.
- **Employer Verification**: Verify business credentials and assign official verification badges.
- **Global Applications Audit**: Live audit trail of all applications across all employers.

### 🤖 Real-Time AI Support Specialist
- Floating interactive support team member ("DriverHub AI Assistant").
- Multilingual domain expertise in driving license categories (LMV/HMV/Commercial transport), typical salary benchmarks, application troubleshooting, and instant shortcuts.

### 📱 Android Application MVP (`android-mvp/`)
- Dedicated Expo React Native mobile application for drivers on the go with shared database contracts.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v6, TanStack Query
- **Backend & Storage**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **State & Resilience**: Dual-mode data layer with persistent local storage sync for instant demo review
- **Mobile**: React Native, Expo

---

## 🚀 Running the Web Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Set up Supabase environment variables in `.env`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
   *(If omitted, the app runs with full interactive local persistence and preloaded real demo data)*

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## 👤 Quick Demo Accounts (1-Click Switcher Available on Login Screen)
- **Driver**: `ravi.kumar@driverhub.in`
- **Employer**: `deepa@bharatlogistics.in`
- **Admin**: `admin@driverhub.in`
