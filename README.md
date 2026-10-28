# StaffSync — Human Resource Management System

**Smarter People Management. Seamless Workflows.** StaffSync is a MERN application for employee records, attendance, leave workflows, announcements, training, notifications and role-scoped analytics.

> **Status:** Source project and local development scaffold. Deployment, live URLs, and real database operation are not claimed until configured and verified by the operator.

## Stack
- React 19 + Vite 8, React Router 7, Redux Toolkit, Bootstrap 5, Axios
- Node.js 20.19+ (Node 22 recommended), Express 5, Mongoose 9
- JWT in an HttpOnly cookie, bcrypt password hashing, double-submit CSRF protection
- Vitest / Node test runner; Supertest-ready API structure

## Prerequisites
- Node.js 20.19+ / 22.12+ and npm
- MongoDB local instance or MongoDB Atlas
- Git and (optionally) Postman

## Setup (Windows PowerShell)
```powershell
cd StaffSync
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
npm install
# Edit server/.env and set a strong JWT_SECRET and MONGODB_URI.
# Start a local MongoDB service or use a MongoDB Atlas connection string.
npm run seed
npm run dev
```

Open `http://localhost:5173`. The API is served on `http://localhost:5000/api` by default. Use two terminals instead of `npm run dev` when you want to inspect frontend and backend logs separately:
```powershell
npm run dev:server
npm run dev:client
```

macOS/Linux uses the same commands; use `cp server/.env.example server/.env` and `cp client/.env.example client/.env` for copying env files.

## Configuration
### `server/.env`
- `PORT`: backend port (default 5000)
- `NODE_ENV`: `development` or `production`
- `MONGODB_URI`: local or Atlas URI
- `JWT_SECRET`: long random secret; generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `JWT_EXPIRES_IN`: JWT lifetime (e.g. `1d`)
- `CLIENT_URL`: exact allowed frontend origin
- `ATTENDANCE_TIME_ZONE`: IANA timezone used to group attendance days (default `Asia/Kolkata`)
- `ATTENDANCE_SHIFT_START`, `ATTENDANCE_LATE_GRACE_MINUTES`: configured local shift start and grace window used to classify completed attendance as PRESENT or LATE
- `ATTENDANCE_ABSENT_AFTER`: local time after which the dashboard counts active employees without a check-in as absent on configured business days
- `LEAVE_WEEKEND_DAYS`: comma-separated JS weekdays to exclude from leave-day calculation (default `0,6`)
- `LEAVE_HOLIDAYS`: comma-separated ISO dates to exclude (e.g. `2026-01-26,2026-08-15`)
- `LEAVE_ANNUAL_DAYS`, `LEAVE_SICK_DAYS`, `LEAVE_PERSONAL_DAYS`, `LEAVE_UNPAID_DAYS`: initial annual leave entitlements
- `COOKIE_SAME_SITE`: normally `lax` in local development and `none` for cross-site production hosting. `none` requires HTTPS/Secure cookies.
- `DEMO_SEED_PASSWORD`: optional demo password used only by the development seeder; defaults to a clearly documented local-only password. Never run the seeder in production.

### `client/.env`
`VITE_API_BASE_URL=http://localhost:5000/api`

Never commit actual `.env` files or production credentials. `npm run seed` refuses to run if `NODE_ENV=production`.

## Development demo accounts
The development-only seeder prints the local test account emails and configured seed password after successful completion. Use those synthetic accounts only against a disposable local database; the seeder refuses to run in production and clears the StaffSync demo collections before creating data.

## Main user flows
1. Sign in and load `/auth/me` to validate the server-side identity.
2. HR can provision employees, search the directory, publish announcements, manage training and see organization analytics.
3. Employees can check in/out, submit leave, enroll in training and read notifications.
4. Managers can see only their assigned team, review that team's leave requests and manage permitted training.
5. Critical mutations are validated on the server; the client never decides authoritative role or duration values.

## Tests and build
```powershell
npm test
npm run build
npm run lint
```
The currently runnable Node test suite covers leave-day/date helpers and attendance policy calculations. A frontend component test is included but requires installed workspace dependencies. API integration, browser end-to-end, and MongoDB concurrency tests remain release-validation work. A successful frontend build does not prove that MongoDB is reachable; verify `GET /api/health` after setting `MONGODB_URI` and starting the API. See `docs/verification-results.md` for the checks run while preparing this source bundle.

## API and documentation
- Implementation checklist: `docs/implementation-checklist.md`
- API contract: `docs/api-documentation.md`
- Architecture and RBAC: `docs/architecture.md`
- Database model and relationships: `docs/database-schema.md`
- Deployment/troubleshooting: `docs/deployment-guide.md`
- Verification status: `docs/verification-results.md`
- Postman request starter collection: `postman/StaffSync.postman_collection.json`

## Initial production administrator
For a fresh production database, configure `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and a unique `INITIAL_ADMIN_PASSWORD` of at least 14 characters in a protected shell or one-time job, then run `npm run create-admin`. The command refuses to run if an HR account already exists and never prints the password. Remove the password environment variable after the bootstrap operation. This is separate from the development-only seeder.

## Deployment
Deploy `client` as a static Vite application and `server` as a Node.js service. Set production environment variables explicitly, allow only the frontend origin in `CLIENT_URL`, set HTTPS, configure `COOKIE_SAME_SITE=none` only if frontend and backend are cross-site, and use a managed MongoDB database with least-privilege credentials and backups. Cookies with `SameSite=None` must also be `Secure`. Configure SPA fallback to `index.html` on the frontend host.

**Live demo / repository URLs:** Not yet deployed or published by this scaffold. Add verified URLs only after deploying and checking them; no public URL is fabricated here.

## Known scope notes
- In-app notifications are implemented; email and push delivery are not configured.
- Password reset via external email is not included; authenticated password change and admin-controlled account provisioning are supported.
- Leave policy defaults exclude Saturday/Sunday and configured holidays. Organization policies should be reviewed before real-world use.
- Transactional multi-document operations require a MongoDB replica set. Local development fallback paths use guarded atomic updates with compensating rollback where stated.
- This is a software starter, not legal, payroll, or HR compliance advice. Review security, privacy, and local employment policies before production use.
