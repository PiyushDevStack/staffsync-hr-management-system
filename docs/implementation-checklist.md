# StaffSync Implementation Checklist

This checklist follows the six requested epics. Checked items have corresponding source files; deployment and remote publication remain operator actions and are not claimed as complete.

## Epic 1 — Authentication and authorization
- [x] **Task 1:** Login for HR, managers and employees using normalized email and password validation.
- [x] **Task 2:** HR-controlled user/employee provisioning; public self-registration is intentionally disabled.
- [x] **Task 3:** Signed JWT session in HttpOnly cookie, account-active check, logout and password-change endpoint.
- [x] **Task 4:** Protected React routes, role guards, backend role middleware, ownership and team-scope checks, CSRF validation.

## Epic 2 — Employee management
- [x] **Task 5:** HR creates employee records and user accounts, initializes leave balances, updates permitted fields and deactivates accounts.
- [x] **Task 6:** Directory search, department filter, sorting/pagination, manager team scope, safe employee projections.
- [x] **Task 7:** Employee profile retrieval and self-service update for permitted contact/emergency-contact fields.

## Epic 3 — Attendance management
- [x] **Task 8:** Check-in/check-out with server-generated timestamps and server-calculated hours.
- [x] **Task 9:** Prevent duplicate check-ins, invalid check-outs and duplicate employee-day records.
- [x] **Task 10:** Personal/team/organization history and dashboard metrics; late and absence thresholds are configurable.

## Epic 4 — Leave management
- [x] **Task 11:** Submit leave requests with ISO dates, date-order validation, business-day calculation and overlap detection.
- [x] **Task 12:** HR and assigned managers can approve/reject only pending requests within their authorized scope; self-approval is blocked.
- [x] **Task 13:** Entitlements and holidays/weekends configurable; decision history, balance re-check on approval, in-app notifications.

## Epic 5 — Announcements and training
- [x] **Task 14:** HR creates, publishes, drafts, edits and archives announcements with audience rules.
- [x] **Task 15:** Audience-scoped announcement listing and recipient-owned in-app notifications with read/unread controls.
- [x] **Task 16:** HR or managers create/update training; manager programs are team-department scoped.
- [x] **Task 17:** Capacity-guarded enrollment, duplicate prevention, roster management and enrollment completion status.

## Epic 6 — Dashboards, reporting and delivery
- [x] **Task 18:** Role-specific backend-backed metrics, charts, attendance/leave/training summaries and dashboard UI.
- [x] **Task 19:** README, architecture/schema/API/deployment documentation, Postman collection, seed script and policy tests.
- [ ] **Release validation:** Install dependencies in the target environment, run frontend build/tests, and test all workflows against a disposable MongoDB database.
- [ ] **Publication:** Push to GitHub and deploy frontend/backend only after credentials and hosting are available; verify actual URLs before listing them.

## Remaining validation notes
- The automated tests currently cover date/business-day and attendance policy helpers. Full API integration tests across HR/manager/employee roles should be added and run against a disposable MongoDB test database.
- MongoDB multi-document transaction guarantees require a replica set; leave approvals currently use guarded conditional updates and compensating rollback rather than claiming full transactional atomicity on standalone local MongoDB.
- Overnight attendance shifts are not supported; a missed same-day check-out remains `INCOMPLETE` and requires HR follow-up.
- Email/password-reset delivery, email notifications, push notifications and real deployment are not included or claimed as complete.
