# StaffSync REST API

Base URL for local development: `http://localhost:5000/api`. All responses use JSON. Successful operations follow `{ "success": true, "message": "...", "data": {} }`; failures follow `{ "success": false, "message": "...", "details": ... }` where applicable. Dates sent as form dates should use ISO `YYYY-MM-DD`; event timestamps are stored as UTC instants.

## Session and security
Call `GET /auth/csrf` before login to obtain a CSRF token in the JSON response; the frontend keeps it in memory for request headers (and also sets a readable CSRF cookie as a same-origin fallback). `POST /auth/login` accepts `{ "email", "password" }` and sets an HttpOnly session cookie plus a CSRF cookie. Authenticated `POST`, `PATCH`, `PUT` and `DELETE` calls must send `X-CSRF-Token` equal to the `staffsync_csrf` cookie. `GET /auth/me` retrieves the verified user. `POST /auth/logout` and `POST /auth/change-password` require a valid session and CSRF token.

## Endpoints and permissions
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | API and MongoDB readiness |
| GET | `/auth/csrf` | Public | Set CSRF cookie/token |
| POST | `/auth/login` | Public, rate-limited | Sign in |
| POST | `/auth/logout` | Authenticated | End current session |
| GET | `/auth/me` | Authenticated | Current identity |
| POST | `/auth/change-password` | Authenticated | Change password |
| GET | `/employees/me` | Authenticated | Own employee profile |
| PATCH | `/employees/me` | Authenticated | Update permitted personal contact fields |
| GET | `/employees` | HR / Manager | Search and list organization or assigned team |
| POST | `/employees` | HR | Provision user + employee record |
| GET | `/employees/:id` | HR / assigned Manager / owner | Retrieve permitted employee record |
| PATCH | `/employees/:id` | HR | Update allowlisted employee fields |
| DELETE | `/employees/:id` | HR | Deactivate employee and account |
| POST | `/attendance/check-in` | Linked employee account | Record server-time check-in |
| POST | `/attendance/check-out` | Linked employee account | Record server-time check-out/duration |
| GET | `/attendance` | Authenticated, role-scoped | Attendance history/filtering/pagination |
| GET | `/attendance/employee/:employeeId` | HR / assigned Manager | Employee attendance history |
| GET | `/leaves` | Authenticated, role-scoped | List requests |
| POST | `/leaves` | Linked employee account | Apply for leave |
| GET | `/leaves/balance` | Linked employee account | Current-year balance |
| PATCH | `/leaves/:id/review` | HR / assigned Manager | Approve or reject pending leave |
| PATCH | `/leaves/:id/cancel` | Request owner, pending only | Cancel a request |
| GET | `/announcements` | Authenticated | Audience-scoped announcements (HR sees admin records) |
| GET | `/announcements/:id` | Authenticated + audience | Announcement details |
| POST | `/announcements` | HR | Create/publish announcement |
| PATCH | `/announcements/:id` | HR | Update announcement |
| DELETE | `/announcements/:id` | HR | Archive announcement |
| GET | `/trainings` | Authenticated + department scope | List available programs |
| POST | `/trainings` | HR / assigned Manager | Create training |
| PATCH | `/trainings/:id` | HR / authorized Manager | Update training |
| POST | `/trainings/:id/enroll` | Linked employee account | Enroll in an open available program |
| GET | `/trainings/:id/enrollments` | HR / authorized Manager | View enrollment roster |
| PATCH | `/trainings/:id/enrollments/:employeeId` | HR / authorized Manager | Update status/completion |
| GET | `/notifications` | Authenticated | Own notification inbox |
| PATCH | `/notifications/:id/read` | Recipient only | Mark one notification read |
| PATCH | `/notifications/read-all` | Authenticated | Mark own notifications read |
| GET | `/analytics` | Authenticated | Role-scoped dashboard aggregates |

## Query parameters
List endpoints support pagination using `page` and `limit` (maximum 100). Employee search supports `q`, `department`, `status`, `designation`. Attendance supports `from`, `to`, `status`, and (HR) `employeeId`. Leave list supports `status`, `leaveType`, and (HR) `employeeId`. Notifications supports `limit` and `unread=true`.

## Example: log in
```http
POST /api/auth/login
Content-Type: application/json

{ "email": "employee1@staffsync.local", "password": "StaffSync@12345" }
```
Before the request, call `GET /api/auth/csrf`. Browser clients should send cookies (`withCredentials: true`) and `X-CSRF-Token` on state-changing calls.

## Example: submit leave
```json
{
  "leaveType": "ANNUAL",
  "startDate": "2026-11-02",
  "endDate": "2026-11-03",
  "reason": "Personal travel planned in advance."
}
```

## Access model
The server reloads the active user from the session identity and database on each request. Managers are restricted by `reportingManager`; employees are restricted to their own records; HR endpoints check the HR role. Do not infer access from the requested URL or client-supplied role. For production, add route-level integration tests against a disposable database for each allowed/forbidden role combination.
