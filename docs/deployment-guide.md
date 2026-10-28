# StaffSync Setup, Deployment, and Troubleshooting

## Local development
1. Install Node.js 20.19+ (22.12+ recommended) and MongoDB or create a MongoDB Atlas database.
2. Copy `.env.example` to `server/.env` and `client/.env.example` to `client/.env`.
3. Generate a strong JWT secret using `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` and set it in `server/.env`.
4. Set `MONGODB_URI`, `CLIENT_URL=http://localhost:5173`, and `COOKIE_SAME_SITE=lax` for local development.
5. Run `npm install`, then `npm run seed` only against a disposable development database.
6. Run `npm run dev`; open `http://localhost:5173`.
7. Verify `GET http://localhost:5000/api/health` returns `success: true` and `database: connected`.

## Production hosting
- Deploy `client` to a static host with build command `npm run build` and output directory `client/dist` (or set the project root to `client` and run `npm run build`). Set `VITE_API_BASE_URL` to the deployed backend `/api` URL. Configure SPA fallback to `/index.html`.
- Deploy `server` as a Node.js service with start command `npm start` in the `server` workspace or `npm --workspace server start` from the monorepo root.
- Set production `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`, `COOKIE_SAME_SITE`, and any policy variables in the hosting dashboard. Never commit secrets.
- If frontend and backend are different sites, use `COOKIE_SAME_SITE=none` and HTTPS (`Secure` cookies). Browser privacy controls may block cross-site cookies; whenever possible, place the frontend and API on the same site (for example, app.example.com and api.example.com) or configure a same-origin reverse proxy. Check that the host/proxy handles credentials and CORS as expected.
- Use a dedicated database user with least privilege, restrict Atlas network access, enable backups, and test restore procedures.
- Do not run the seeder in production. Provision production accounts through a controlled admin process.

## MongoDB transactions
Strong atomic multi-document transactions require a replica set (Atlas provides this by default). For local transaction testing, configure MongoDB as a single-node replica set if transaction-backed logic is enabled. Leave approvals use guarded conditional writes and compensation but must be stress-tested for production concurrency.

## Troubleshooting
- **`Missing required environment variable`:** Check `server/.env`; ensure MONGODB_URI, JWT_SECRET (32+ characters), and CLIENT_URL are defined.
- **API says database disconnected:** Start MongoDB, verify URI credentials/network rules, and check `/api/health`.
- **Browser CORS or cookies fail:** Make `CLIENT_URL` exactly match the frontend origin, enable HTTPS in production, verify credentials are enabled, and align `SameSite` settings with the hosting topology.
- **Login fails:** Ensure seed completed against the configured database and try a known demo account only in local development. The seeder resets StaffSync collections.
- **CSRF validation failed:** Refresh the app so the CSRF cookie is issued again; check that cookies are not blocked and that requests include `X-CSRF-Token`.
- **Training not visible:** Check status, start date, department targeting, and the current user's employee profile.
- **Leave balance mismatch:** Review configured leave policy/weekends/holidays and the matching LeaveBalance document. Cross-year leave must be split into requests by year.
- **Build issues:** Use Node 20.19+ or Node 22.12+, delete workspace node_modules only if needed, run `npm install`, then `npm run build`.

## Verification before public release
- Run all tests and frontend production build.
- Verify each role's positive and negative permissions via separate seeded accounts.
- Verify cookies are HttpOnly/Secure as intended and CSRF guards reject missing/wrong token requests.
- Confirm backups, access controls, log redaction, incident response and retention policies.
- Publish only verified GitHub and deployed URLs; no live URL is supplied by this local project scaffold.
