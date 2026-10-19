# DriverHub live test report — 19 Oct 2026

Site: https://driver-hub-xi.vercel.app (production, after PR #1 and PR #2).
Database: Supabase project shared with other apps; `supabase-live-repair-2026-10.sql` and `supabase-signup-fix-2026-10.sql` applied.

## Employer portal (tested live, signed in as a real employer account)

The account is unverified and has no hiring plan, so it covers the "new employer" path.

| Page / action | Result |
| --- | --- |
| Registration with GPS location (local emulator, live code) | Employer role, employer dashboard, no credits, location saved |
| Dashboard | Loads; "Verification pending", company, counters |
| Post job: template, steps 1–4, preview | Works; location pre-filled from the company |
| Save as draft | Saved; appears in Manage Jobs as Draft |
| Publish draft with 0 credits | Refused: "An active employer hiring plan is required to publish a driver job"; job stays a draft |
| Edit job | Loads the saved draft |
| Manage jobs filters | Counts correct (Draft 1, others 0) |
| Applications / Reports / Messages | Load; empty states correct |
| Driver database | Search refused with the database's reason (plan, then verification); page explains it |
| Company profile save | "Profile Saved Successfully!", all requests 200 |
| Billing: GSTIN form | Invalid GSTIN rejected in the browser, nothing sent |
| Billing: plans and order summary | ₹1,949 + 18% GST ₹351 = ₹2,300; payment not tried (Razorpay not deployed) |
| Notifications | List and read state work |
| Settings | Loads |
| Phone width (375 px), all 11 pages | No sideways scrolling |
| Failed API calls | None, except the expected 400 for a blocked candidate search |

### Fixed in this round

1. Job preview showed the location twice ("…Andhra Pradesh - 515201, Hindupur, Andhra Pradesh").
2. Billing said "No active hiring plan · expired <date>" for an employer who never bought a plan.
3. Employer Settings showed the driver's alert texts ("when an employer shortlists you").
4. Drafts could not be deleted. "Delete draft" added (own drafts only; published jobs are closed instead).
5. "View public job page" was offered for drafts and jobs under review, which have no public page.

All verified on the local emulator; `run-local.sh` 116/116, build and i18n checks pass.

## Admin portal (tested live, signed in as the site owner's admin account)

| Page / action | Result |
| --- | --- |
| Dashboard, Jobs, Drivers, Employers, Applications, Documents, Settings | All load; no failed API calls |
| Phone width (375 px), all 7 pages | No sideways scrolling |
| Moderation queue | Both submitted test jobs listed as Pending |
| Approve & publish (job A) | "Job approved and published"; job appears on the public /jobs page |
| Reject without a reason | Refused: "Enter a reason for rejecting this job." |
| Reject with a reason (job B) | "Job rejected"; reason saved to the moderation log; job B never public |
| Approve & verify company | "Company verified and listed"; employer shows Verified |
| Employer credits | 3 → 1 after submitting two jobs (rejection refunds one; checked in the DB tests) |

Data note: the driver list contains three accounts that are not real drivers (an unnamed row created by another app's sign-up trigger, an old account and a demo account).

## Driver portal (tested on the local emulator with the same code; live run needs a driver account)

| Page / action | Result |
| --- | --- |
| Dashboard, Jobs, Applications, Saved, Messages, Profile, Documents, Notifications, Settings | All load; no failed API calls |
| Profile: GPS location + licence + bio, Save | Saved: Kolar / 563101, licence, expiry, bio, map coordinates |
| Document upload (PDF) | Listed as Pending Review; stored in the driver's private folder |
| Apply with cover note | "Application Submitted"; employer notified |
| Message employer | Delivered; sender role, name and job title set by the server |
| Withdraw | Status Withdrawn; job shows "Applied" (cannot re-apply) |
| Phone width (375 px), 11 pages | No sideways scrolling |

Also fixed: "Showing 1 active vacancies" now reads "1 active vacancy".

## Known limits

- Online payment needs the Razorpay edge functions and secrets deployed.
- `on_auth_user_created` → `handle_new_auth_user()` (not DriverHub) creates a profile row for every account in the shared project; DriverHub sign-ups now override it, other apps' accounts still get a DriverHub driver row.
