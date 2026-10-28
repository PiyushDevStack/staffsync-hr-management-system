import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export const AUTH_COOKIE = 'staffsync_session';
export const CSRF_COOKIE = 'staffsync_csrf';
export const cookieOptions = { httpOnly: true, secure: env.cookieSecure, sameSite: env.cookieSameSite, path: '/' };
export function setCsrfCookie(res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, { httpOnly: false, secure: env.cookieSecure, sameSite: env.cookieSameSite, path: '/', maxAge: 24 * 60 * 60 * 1000 });
  return token;
}
export function verifyCsrf(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.get('x-csrf-token');
  if (!cookie || !header || cookie.length !== header.length || !crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(header))) {
    return next(new HttpError(403, 'CSRF validation failed. Refresh the page and retry.'));
  }
  next();
}
export async function authenticate(req, _res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    if (!token) throw new HttpError(401, 'Authentication required.');
    let payload;
    try { payload = jwt.verify(token, env.jwtSecret, { issuer: 'staffsync-api', audience: 'staffsync-client' }); }
    catch { throw new HttpError(401, 'Session is invalid or expired. Please sign in again.'); }
    const user = await User.findById(payload.sub).select('name email role accountStatus employee');
    if (!user || user.accountStatus !== 'ACTIVE') throw new HttpError(401, 'Account is unavailable.');
    req.user = user;
    next();
  } catch (error) { next(error); }
}
export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to perform this action.'));
  next();
};
