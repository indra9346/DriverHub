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
- **State & Resilience**: Supabase is the source of truth; a local cache keeps screens fast and works with live updates
- **Mobile**: React Native, Expo

---

## Run the Web Application

1. Install dependencies with Node.js/npm installed:
   ```bash
   npm ci
   ```
2. Create `.env.local` from `.env.example`. Set only the Supabase project URL and public anon/publishable key in this browser environment. Never put a Supabase service-role/secret key in a `VITE_` variable or browser env file.
3. Start the app with `npm run dev`; create a production build with `npm run build`.

The app requires a configured Supabase project and the SQL files below. It has no built-in sample data or demo accounts: every account, job and application lives in Supabase.

## Production Database and Hiring Plans

### Existing project: repair first

If the live site shows no jobs or companies (the browser console reports `permission denied for table jobs`, code 42501), run `supabase-live-repair-2026-10.sql` once in the Supabase SQL Editor. It restores the table privileges and fixes the moderation, credit and application rules. It is idempotent and only touches DriverHub objects, which matters because this Supabase project is shared with other apps.

Then run `supabase-db-health-check.sql` (read-only). It returns one row per check; after the repair there should be no `FAIL` rows. Each `FAIL` names the SQL file that fixes it. For databases created by older DriverHub scripts the repair also adds every column the app uses (with safe defaults: no credits, no verification), the radius candidate search, the payment-order table and plan-activation function, and the realtime tables.

### Sign-up fix (run after the repair)

`supabase-signup-fix-2026-10.sql` makes new accounts keep the role chosen at registration (employers were being saved as drivers), stops the free "Starter" plan and sample GSTIN that sign-up used to grant, and repairs accounts that were already affected. It also runs a test sign-up that is rolled back, and its result table lists every trigger that runs when an account is created in this shared project.

### Notification wording (run after the repair)

`supabase-notification-wording-2026-10.sql` turns status notifications into sentences ("has an interview scheduled" instead of "is now interview"). Run it once if the repair ran before 19 Oct 2026.

### Create an admin account

Registration only creates driver and employer accounts. To make an administrator:

1. Create the sign-in account if needed: Supabase Dashboard → Authentication → Users → Add user → Create new user (tick "Auto Confirm User").
2. Open `supabase-make-admin.sql`, replace `CHANGE-ME@example.com` with that email, and run it in the SQL Editor. It works whether or not the account already has a DriverHub profile.
3. Sign in on `/login?role=admin`. The health check row "admins are active" turns PASS.

`supabase-list-accounts.sql` (read-only) lists every sign-in account in this shared project and its DriverHub role, which shows accounts that belong to other apps.

### Activate a plan without online payment

Until the Razorpay functions are deployed, `supabase-activate-plan.sql` activates a hiring plan for an employer by email (for offline payments or test employers). It records a payment order and billing transaction and grants credits through the same trusted function as a verified online payment.

### New project: apply in this order

Apply these SQL files in order using the Supabase SQL Editor (this exact order is what `supabase/tests/run-local.sh` verifies):

1. `supabase-schema.sql`
2. `supabase-apnahire-upgrade.sql`
3. `supabase-security-hardening.sql`
4. `supabase-marketplace-flows.sql`
5. `supabase-fix-rls-recursion.sql`
6. `supabase-payment-checkout.sql`
7. `supabase-employer-driver-doc-access.sql`
8. `supabase-homepage-public-stats.sql`
9. `supabase-admin-live-fix.sql`
10. `supabase-pan-india-locations.sql`
11. `supabase-radius-search.sql`
12. `supabase-profile-sync-rls-fix.sql`
13. `supabase-live-repair-2026-10.sql`
14. `supabase-signup-fix-2026-10.sql`
15. `supabase-notification-wording-2026-10.sql`

Finish with `supabase-db-health-check.sql`.

### Database tests

`supabase/tests/` holds 117 business-flow checks (driver, employer, admin and visitor permissions, credits, moderation, messaging, notifications) that run against a throwaway local Postgres with Supabase stubs: `PSQL=psql PGPORT=54329 bash supabase/tests/run-local.sh` (exits non-zero if any check or the health check fails). Never point it at the live project.

### Password reset links

In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to the deployed site and add `https://<your-domain>/reset-password` to the Redirect URLs, otherwise reset emails link to the wrong page.

Apply the location migrations after the marketplace migration. The radius-search migration is the final candidate-search RPC definition and keeps current driver location fields in `profiles` authoritative when reconciling older values in `driver_profiles`.

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
