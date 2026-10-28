import bcrypt from 'bcryptjs';
import { connectDatabase, closeDatabase } from '../config/database.js';
import User from '../models/User.js';

const name = String(process.env.INITIAL_ADMIN_NAME || '').trim();
const email = String(process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.INITIAL_ADMIN_PASSWORD || '');
if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 14) {
  throw new Error('Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and a unique INITIAL_ADMIN_PASSWORD (14+ characters) before running create-admin.');
}
try {
  await connectDatabase();
  if (await User.exists({ role: 'HR' })) throw new Error('An HR account already exists. Refusing to create another bootstrap admin.');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, role: 'HR', accountStatus: 'ACTIVE' });
  console.log(`Created initial HR administrator: ${user.email}`);
  console.log('No password was printed. Remove INITIAL_ADMIN_PASSWORD from the environment after this one-time operation.');
} finally { await closeDatabase(); }
