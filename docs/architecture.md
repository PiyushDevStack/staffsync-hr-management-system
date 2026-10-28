# StaffSync Architecture

## Overview
StaffSync uses a three-tier MERN architecture. The Vite-powered React single-page application is independently deployable from the Express API. Mongoose models persistence and constraints in MongoDB. Business rules are checked by the backend; frontend route guards are usability controls, not security controls.

## Logical components
- **Presentation:** React pages, shared components, React Router, Redux Toolkit, Axios, Bootstrap and custom responsive CSS.
- **API:** Express routes, authentication, CSRF validation, role guards, input validation, controllers/services and centralized error handling.
- **Persistence:** Mongoose models, unique/compound indexes, references, atomic conditional updates and scoped queries.
- **Operations:** env validation, CORS allowlist, Helmet, rate limits, request logs, health endpoint, seeding, tests and API collection.

## Identity and session
Users contain a role (`HR`, `MANAGER`, `EMPLOYEE`) and may reference one Employee profile. Login uses bcrypt comparison and issues a signed JWT in an HttpOnly cookie. The client keeps no long-lived token in localStorage. A separate double-submit CSRF cookie/header is checked for mutating authenticated API requests. Configure HTTPS and secure cookies in production; cross-site deployments require `SameSite=None; Secure` and correctly configured CORS.

## Authorization model
- HR can manage organization-wide employee records, announcements, training, reports, and leave decisions.
- Managers are scoped to employee records whose `reportingManager` points to their own employee profile; leave-review and training-management paths repeat the scope check on the server.
- Employees can access their own employee, attendance, leave, enrollment, and notification data.
- Sensitive changes use allowlists and audit logs. Compensation is excluded by default from Employee queries.

## Main data flow
Browser → Axios with credentials and CSRF header → Express route → validation / authentication / authorization → controller/service → Mongoose query → MongoDB → standard JSON envelope `{ success, message, data }`.

## Implementation epics
1. Authentication & authorization — login, account provisioning, JWT cookie, CSRF, protected routes, role enforcement.
2. Employee management — create/update/deactivate, directory, search/filter/pagination, profile self-service.
3. Attendance — check-in/out, duplicate prevention, server-calculated duration, scoped history.
4. Leave management — application, overlap checks, configurable business days/holidays, reviewer decisions, balance checks and notifications.
5. Communication & development — announcements, in-app notifications, training programs, capacity-limited enrollment and completion tracking.
6. Dashboards, reports & delivery — role-specific aggregates, tests, docs, Postman collection, build and deployment instructions.

## Important operational notes
- `ATTENDANCE_TIME_ZONE` controls the local day used when grouping attendance. `ATTENDANCE_SHIFT_START` plus `ATTENDANCE_LATE_GRACE_MINUTES` classifies completed attendance as PRESENT or LATE. `ATTENDANCE_ABSENT_AFTER` determines when dashboard absence counts begin; only configured business days are considered. Store event timestamps as UTC instants.
- `LEAVE_WEEKEND_DAYS` (JS weekdays 0–6), `LEAVE_HOLIDAYS` (comma-separated ISO dates), and the `LEAVE_*_DAYS` entitlement variables drive leave balances. Organization policy must be reviewed before production use.
- Overnight shifts are not supported by the current attendance check-out flow; check-out must occur on the configured attendance day. Missed check-outs remain INCOMPLETE and require an HR follow-up process.
- The training `enrolledCount` is incremented with a conditional MongoDB update before creating the unique enrollment record. If enrollment creation fails, a compensating decrement is attempted.
- Leave approval uses a conditional balance decrement followed by a pending-only decision update and compensating rollback if another reviewer wins the race. A multi-document transaction is preferable for high-integrity production use on a MongoDB replica set; test concurrency and recovery before production use.
- The seed script is destructive to the collections it owns and is development-only.
