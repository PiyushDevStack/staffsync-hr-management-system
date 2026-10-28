import { body, query } from 'express-validator';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { attendanceDateKey, hoursBetween, classifyAttendance } from '../config/leavePolicy.js';
import { assertCanAccessEmployee, employeeForUser, teamEmployeeIds } from '../services/permissions.js';
import { parsePagination, pageMeta } from '../middleware/pagination.js';
import { audit } from '../utils/audit.js';
export const attendanceDateValidators = [query('from').optional().isISO8601(), query('to').optional().isISO8601(), query('employeeId').optional().isMongoId()];
export const checkIn = asyncHandler(async (req, res) => {
  const employee = await employeeForUser(req.user);
  if (!employee) throw new HttpError(400, 'Your account has no linked employee profile.');
  const day = attendanceDateKey(new Date());
  const attendanceDate = new Date(`${day}T00:00:00.000Z`);
  const existing = await Attendance.findOne({ employee: employee._id, attendanceDate });
  if (existing?.checkInAt) throw new HttpError(409, existing.checkOutAt ? 'Attendance for today is already complete.' : 'You have already checked in today.');
  const checkInAt = new Date();
  let record;
  if (existing) {
    record = await Attendance.findOneAndUpdate(
      { _id: existing._id, checkInAt: null },
      { $set: { checkInAt, checkOutAt: null, durationHours: null, status: 'INCOMPLETE' } },
      { new: true, runValidators: true }
    );
    if (!record) throw new HttpError(409, 'A check-in was already recorded for today.');
  } else {
    try { record = await Attendance.create({ employee: employee._id, attendanceDate, checkInAt, status: 'INCOMPLETE' }); }
    catch (error) {
      if (error.code === 11000) throw new HttpError(409, 'A check-in was already recorded for today.');
      throw error;
    }
  }
  await audit({ actor: req.user._id, action: 'ATTENDANCE_CHECK_IN', resourceType: 'Attendance', resourceId: record._id, req });
  ok(res, { attendance: record }, 'Checked in successfully.', existing ? 200 : 201);
});
export const checkOut = asyncHandler(async (req, res) => {
  const employee = await employeeForUser(req.user);
  if (!employee) throw new HttpError(400, 'Your account has no linked employee profile.');
  const day = attendanceDateKey(new Date());
  const record = await Attendance.findOne({ employee: employee._id, attendanceDate: new Date(`${day}T00:00:00.000Z`) });
  if (!record?.checkInAt) throw new HttpError(409, 'Check in before checking out.');
  if (record.checkOutAt) throw new HttpError(409, 'You have already checked out today.');
  const now = new Date();
  const durationHours = hoursBetween(record.checkInAt, now);
  const status = classifyAttendance(record.checkInAt);
  const updated = await Attendance.findOneAndUpdate(
    { _id: record._id, checkOutAt: null },
    { $set: { checkOutAt: now, durationHours, status } },
    { new: true, runValidators: true }
  );
  if (!updated) throw new HttpError(409, 'You have already checked out today.');
  await audit({ actor: req.user._id, action: 'ATTENDANCE_CHECK_OUT', resourceType: 'Attendance', resourceId: updated._id, req });
  ok(res, { attendance: updated }, 'Checked out successfully.');
});
export const listAttendance = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req);
  const filter = {};
  if (req.query.from || req.query.to) filter.attendanceDate = { ...(req.query.from ? { $gte: new Date(`${String(req.query.from).slice(0,10)}T00:00:00.000Z`) } : {}), ...(req.query.to ? { $lte: new Date(`${String(req.query.to).slice(0,10)}T00:00:00.000Z`) } : {}) };
  if (req.user.role === 'EMPLOYEE') {
    const employee = await employeeForUser(req.user); if (!employee) throw new HttpError(400, 'No linked employee profile.'); filter.employee = employee._id;
  } else if (req.user.role === 'MANAGER') {
    const ids = await teamEmployeeIds(req.user); if (req.user.employee) ids.push(String(req.user.employee)); filter.employee = { $in: ids };
  } else if (req.query.employeeId) filter.employee = req.query.employeeId;
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([Attendance.find(filter).populate('employee', 'employeeId fullName department').sort(sort).skip(skip).limit(limit), Attendance.countDocuments(filter)]);
  ok(res, { items, pagination: pageMeta(page, limit, total) });
});
export const attendanceForEmployee = asyncHandler(async (req, res) => {
  await assertCanAccessEmployee(req.user, req.params.employeeId);
  const items = await Attendance.find({ employee: req.params.employeeId }).sort({ attendanceDate: -1 }).limit(366);
  ok(res, { items });
});
