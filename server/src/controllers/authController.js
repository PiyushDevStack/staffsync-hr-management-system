import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { AUTH_COOKIE, CSRF_COOKIE, cookieOptions, setCsrfCookie } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

export const loginValidators = [
  body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required.')
];
export const issueCsrf = (req, res) => {
  const existing = req.cookies?.[CSRF_COOKIE];
  const csrfToken = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : setCsrfCookie(res);
  return ok(res, { csrfToken }, 'CSRF token issued.');
};
export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user && user.accountStatus === 'ACTIVE' && await bcrypt.compare(String(req.body.password || ''), user.passwordHash);
  if (!valid) throw new HttpError(401, 'Invalid email or password.');
  user.lastLoginAt = new Date();
  await user.save();
  const token = jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, issuer: 'staffsync-api', audience: 'staffsync-client' });
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: 24 * 60 * 60 * 1000 });
  const csrfToken = setCsrfCookie(res);
  await audit({ actor: user._id, action: 'AUTH_LOGIN', resourceType: 'User', resourceId: user._id, req });
  ok(res, { user: { id: user._id, name: user.name, email: user.email, role: user.role, employee: user.employee }, csrfToken }, 'Signed in successfully.');
});
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.clearCookie(CSRF_COOKIE, { httpOnly: false, secure: env.cookieSecure, sameSite: env.cookieSameSite, path: '/' });
  await audit({ actor: req.user._id, action: 'AUTH_LOGOUT', resourceType: 'User', resourceId: req.user._id, req });
  ok(res, {}, 'Signed out successfully.');
});
export const me = asyncHandler(async (req, res) => ok(res, { user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, employee: req.user.employee } }));
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 12) throw new HttpError(400, 'New password must contain at least 12 characters.');
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!await bcrypt.compare(String(currentPassword || ''), user.passwordHash)) throw new HttpError(400, 'Current password is incorrect.');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.clearCookie(AUTH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.clearCookie(CSRF_COOKIE, { httpOnly: false, secure: env.cookieSecure, sameSite: env.cookieSameSite, path: '/' });
  await audit({ actor: user._id, action: 'AUTH_PASSWORD_CHANGED', resourceType: 'User', resourceId: user._id, req });
  ok(res, {}, 'Password changed. Sign in again with your new password.');
});
