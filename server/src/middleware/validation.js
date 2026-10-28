import { validationResult } from 'express-validator';
import { HttpError } from '../utils/httpError.js';
export function validateRequest(req, _res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) return next(new HttpError(400, 'Request validation failed.', result.array().map(({ path, msg }) => ({ field: path, message: msg }))));
  next();
}
