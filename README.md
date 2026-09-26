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

## Run the Web Application

1. Install dependencies with Node.js/npm installed:
   ```bash
   npm ci
   ```
2. Create `.env.local` from `.env.example`. Set only the Supabase project URL and public anon/publishable key in this browser environment. Never put a Supabase service-role/secret key in a `VITE_` variable or browser env file.
3. Start the app with `npm run dev`; create a production build with `npm run build`.

The production app requires a configured Supabase project and the SQL files below. Demo data, authentication, and checkout are disabled by default and are for local development only. Do not use the demo settings for a live deployment.

## Production Database and Hiring Plans

Apply these SQL files in order using the Supabase SQL Editor:

1. `supabase-schema.sql`
2. `supabase-apnahire-upgrade.sql`
3. `supabase-security-hardening.sql`
4. `supabase-marketplace-flows.sql`
5. `supabase-payment-checkout.sql`

The final migration creates payment-order records and a server-only, idempotent entitlement grant. Employer credits are activated only after the payment provider reports a captured payment and its signature is verified. Do not run these files against production until you have reviewed the SQL and backed up any existing production data.

### Razorpay checkout

Create Razorpay test keys first. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` as Supabase Edge Function secrets, using Supabase Dashboard → Edge Functions → Secrets (or the CLI secrets command). Never add these values to `.env`, `.env.local`, Vercel client variables, or Git.

Deploy the three Edge Functions after linking this directory to the correct Supabase project:

```bash
supabase functions deploy create-payment-order --project-ref YOUR_PROJECT_REF
supabase functions deploy verify-payment --project-ref YOUR_PROJECT_REF
supabase functions deploy razorpay-webhook --no-verify-jwt --project-ref YOUR_PROJECT_REF
```

Configure a Razorpay webhook for `payment.captured` at:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook
```

Use the same webhook secret in Razorpay and Supabase. Verify the complete flow with Razorpay test mode before setting live keys, configure the frontend's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider, then deploy the web build. Payment-provider activation and a Supabase deployment still require account access and credentials outside this repository.

---

## Development Demo Accounts

Only use these demo identities with local demo authentication enabled. They are not production accounts.
- **Driver**: `ravi.kumar@driverhub.in`
- **Employer**: `deepa@bharatlogistics.in`
- **Admin**: `admin@driverhub.in`
