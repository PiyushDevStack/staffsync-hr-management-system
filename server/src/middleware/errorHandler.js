import { HttpError } from '../utils/httpError.js';
export function notFound(req, _res, next) { next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`)); }
export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return;
  let status = error.status || 500;
  let message = error.message || 'Internal server error.';
  let details = error.details;
  if (error.name === 'ValidationError') { status = 400; message = 'Validation failed.'; details = Object.values(error.errors).map((e) => e.message); }
  if (error.code === 11000) { status = 409; message = 'A record with this unique value already exists.'; details = error.keyValue; }
  if (error.name === 'CastError') { status = 400; message = 'Invalid resource identifier.'; }
  if (status >= 500) { console.error(error); message = 'An unexpected server error occurred.'; }
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}
