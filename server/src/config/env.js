import dotenv from 'dotenv';
import crypto from 'node:crypto';
dotenv.config();

const required = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];
for (const key of required) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required environment variable: ${key}`);
}
if (process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters. Generate one with crypto.randomBytes(64).toString("hex").');
}
let parsedClientUrl;
try { parsedClientUrl = new URL(process.env.CLIENT_URL); }
catch { throw new Error('CLIENT_URL must be a valid http(s) origin.'); }
if (!['http:', 'https:'].includes(parsedClientUrl.protocol) || parsedClientUrl.pathname !== '/' || parsedClientUrl.search || parsedClientUrl.hash) {
  throw new Error('CLIENT_URL must be an origin only, for example http://localhost:5173 (no path or query).');
}
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
try { new Intl.DateTimeFormat('en-US', { timeZone: process.env.ATTENDANCE_TIME_ZONE || 'Asia/Kolkata' }); }
catch { throw new Error('ATTENDANCE_TIME_ZONE must be a valid IANA timezone.'); }
const sameSite = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
if (!['lax', 'strict', 'none'].includes(sameSite)) throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.');
if (process.env.NODE_ENV === 'production' && sameSite === 'none' && process.env.COOKIE_SECURE === 'false') {
  throw new Error('SameSite=None cookies require Secure cookies in production.');
}
export const env = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: parsedClientUrl.origin,
  attendanceTimeZone: process.env.ATTENDANCE_TIME_ZONE || 'Asia/Kolkata',
  cookieSameSite: sameSite,
  cookieSecure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true'
};
export const makeRandomSecret = () => crypto.randomBytes(64).toString('hex');
