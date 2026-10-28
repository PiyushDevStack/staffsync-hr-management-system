import { env } from './config/env.js';
import { connectDatabase, closeDatabase } from './config/database.js';
import app from './app.js';

let server;
async function start() {
  await connectDatabase();
  server = app.listen(env.port, () => console.log(`StaffSync API listening on http://localhost:${env.port}`));
}
async function shutdown(signal) {
  console.log(`${signal} received; shutting down StaffSync...`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await closeDatabase();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
start().catch(async (error) => { console.error('Failed to start StaffSync API:', error.message); await closeDatabase(); process.exit(1); });
