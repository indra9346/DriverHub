# Driver Hub — Technical Specification & Roadmap

A driver-recruitment job portal connecting drivers/candidates with employers, plus an admin panel — for Web and Android.

This document covers the architecture, database design, API surface, and how the attached web MVP extends to a production system and a native Android app.

---

## 1. What's in the prototype

`driver-hub-app.jsx` is a working front-end prototype covering the three roles end to end, backed by in-memory mock data (resets on refresh — there is no backend yet):

- **Drivers**: register/login, edit profile (license category, experience, skills, resume upload), search & filter jobs, view job details, apply, track application status, see notifications for matching/status-changed jobs.
- **Employers**: register/login (new accounts start "Pending review"), manage company profile, post vacancies (category, experience, location, salary, hours, required documents), view/close postings, review applicants, shortlist/reject/hire, see contact details once shortlisted, search the driver pool.
- **Admin**: dashboard stats (counts + charts by license category and application status), approve/block drivers and employers, remove/restore job postings.

This is the functional and UX reference for the production build described below.

---

## 2. Recommended tech stack

| Layer | Choice | Why |
|---|---|---|
| Web frontend | React + TypeScript, Vite, React Router, TanStack Query | Matches the prototype; fast dev loop; good form/data-fetching ergonomics |
| Mobile | React Native (Expo) | Shares business logic, API client, and types with the web app; one codebase for Android (and iOS later) instead of a parallel Kotlin build |
| Backend API | Node.js + Express (or NestJS for stricter structure), REST | Simple to reason about for a CRUD-heavy domain; NestJS if the team wants enforced module boundaries (auth, jobs, applications, admin) |
| Database | PostgreSQL | Relational data (users, jobs, applications) with real foreign keys and query needs (filtering, search) |
| File storage | S3-compatible object storage (AWS S3 / Cloudflare R2) | Resumes and license/ID documents |
| Auth | JWT (access + refresh tokens), bcrypt for passwords | Stateless, works identically for web and mobile clients |
| Notifications | Push via Firebase Cloud Messaging (mobile) + email (SendGrid/SES) for job matches and status changes | Matches the "notifications for relevant jobs" requirement |
| Hosting | Any container host (Render/Railway/AWS ECS) for the API, Vercel/Netlify for web, Play Store for the Android build | |

If the team prefers to move faster with fewer moving parts, Next.js (API routes + React in one project) with Prisma ORM over PostgreSQL is a reasonable single-repo alternative to the split frontend/backend above.

---

## 3. Database schema (relational)

```
users
  id (uuid, pk)
  role            enum('driver','employer','admin')
  email           text unique
  phone           text unique
  password_hash   text
  status          enum('active','blocked','pending')   -- employers start 'pending'
  created_at      timestamptz

driver_profiles
  id              uuid pk, fk -> users.id
  full_name       text
  location        text
  license_category enum('MCWG','LMV','LMV_TRANSPORT','HMV','HMV_TRANSPORT')
  experience_years smallint
  skills          text[]            -- or a normalized driver_skills join table
  resume_url      text
  id_doc_url      text

employer_profiles
  id              uuid pk, fk -> users.id
  company_name    text
  contact_person  text
  sector          text
  location        text

jobs
  id              uuid pk
  employer_id     uuid fk -> employer_profiles.id
  title           text
  license_category enum(...)         -- same enum as driver_profiles
  location        text
  experience_required text
  salary_min      integer
  salary_max      integer
  working_hours   text
  required_docs   text[]
  status          enum('active','closed','removed')
  created_at      timestamptz

applications
  id              uuid pk
  job_id          uuid fk -> jobs.id
  driver_id       uuid fk -> driver_profiles.id
  status          enum('applied','shortlisted','rejected','hired')
  applied_at      timestamptz
  updated_at      timestamptz
  unique (job_id, driver_id)         -- one application per driver per job

notifications
  id              uuid pk
  user_id         uuid fk -> users.id
  message         text
  read            boolean default false
  created_at      timestamptz
```

Indexes worth adding early: `jobs(license_category, location, status)` for search/filter, `applications(driver_id)` and `applications(job_id)` for the two dashboards' list queries.

---

## 4. Core API endpoints (REST)

```
Auth
  POST   /auth/register/driver
  POST   /auth/register/employer
  POST   /auth/login
  POST   /auth/refresh

Driver
  GET    /me/profile              PUT /me/profile
  POST   /me/resume               (multipart upload)
  GET    /jobs?category=&location=&q=&page=
  GET    /jobs/:id
  POST   /jobs/:id/apply
  GET    /me/applications

Employer
  GET    /me/company               PUT /me/company
  POST   /jobs                     PUT /jobs/:id        (post/edit a vacancy)
  PATCH  /jobs/:id/status          (close/reopen)
  GET    /jobs/:id/applicants
  PATCH  /applications/:id/status  (shortlist/reject/hire)
  GET    /drivers?license=&location=&q=   (search driver pool)

Admin
  GET    /admin/stats
  GET    /admin/drivers            PATCH /admin/drivers/:id/status
  GET    /admin/employers          PATCH /admin/employers/:id/status
  GET    /admin/jobs               PATCH /admin/jobs/:id/status
```

All endpoints (except register/login) require a bearer JWT; role is checked server-side per route (a driver token cannot call employer/admin routes, etc.) — this is the same API both the web app and the Android app call.

---

## 5. Android app plan

Rather than a separate native codebase, build the Android app in **React Native (Expo)**, reusing:
- The same API client and TypeScript types as the web app.
- Equivalent screens: Job feed with filters, Job detail, Apply, My applications, Profile editor with document upload (camera/gallery), Employer posting flow, Applicant review with swipe-to-shortlist/reject, Push notifications for new matching jobs and status changes.
- Native-specific additions: camera access for document photos, FCM push notifications, offline caching of the job feed (so a driver can browse without signal and apply once back online).

If a fully native Kotlin app is required instead (e.g. for stricter platform integration), the screens map 1:1 to the ones above and consume the same REST API — the backend and database design don't change either way.

---

## 6. Suggested build order (post-MVP)

1. Stand up the Postgres schema + Express/NestJS API with auth.
2. Wire the existing React screens to real endpoints (replace in-memory state with API calls + TanStack Query).
3. Add file upload (resumes, ID documents) to S3-compatible storage.
4. Add push/email notifications for job matches and application status changes.
5. Build the React Native Android app against the same API.
6. Add admin moderation queues (new employer approvals, reported listings) and basic analytics.
