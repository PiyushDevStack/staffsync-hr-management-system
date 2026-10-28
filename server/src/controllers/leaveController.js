import { body, param, query } from 'express-validator';
import Leave from '../models/Leave.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { countLeaveDays, isoDay, attendanceDateKey } from '../config/leavePolicy.js';
import { employeeForUser, teamEmployeeIds } from '../services/permissions.js';
import { parsePagination, pageMeta } from '../middleware/pagination.js';
import { createNotification } from '../services/notifications.js';
import { audit } from '../utils/audit.js';

export const leaveValidators = [
  body('leaveType').isIn(['ANNUAL', 'SICK', 'PERSONAL', 'UNPAID']),
  body('startDate').isISO8601({ strict: true, strictSeparator: true }),
  body('endDate').isISO8601({ strict: true, strictSeparator: true }),
  body('reason').isString().trim().isLength({ min: 5, max: 1500 })
];
export const reviewValidators = [body('decision').isIn(['APPROVED', 'REJECTED']), body('rejectionReason').optional().isString().trim().isLength({ max: 1000 })];
const balanceField = { ANNUAL: ['annual', 'usedAnnual'], SICK: ['sick', 'usedSick'], PERSONAL: ['personal', 'usedPersonal'] };
async function getBalance(employeeId, year) {
  return LeaveBalance.findOneAndUpdate({ employee: employeeId, year }, { $setOnInsert: { employee: employeeId, year } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}
export const applyLeave = asyncHandler(async (req, res) => {
  const employee = await employeeForUser(req.user);
  if (!employee) throw new HttpError(400, 'Your account has no linked employee profile.');
  const start = isoDay(req.body.startDate); const end = isoDay(req.body.endDate);
  if (start < attendanceDateKey(new Date())) throw new HttpError(400, 'Leave cannot start in the past.');
  if (start.slice(0, 4) !== end.slice(0, 4)) throw new HttpError(400, 'Cross-year leave requests must be split by year.');
  const durationDays = countLeaveDays(start, end);
  if (durationDays < 1 && req.body.leaveType !== 'UNPAID') throw new HttpError(400, 'The selected dates contain no configured business days.');
  if (durationDays < 1) throw new HttpError(400, 'Leave duration must include at least one business day.');
  const overlap = await Leave.exists({ employee: employee._id, status: { $in: ['PENDING', 'APPROVED'] }, startDate: { $lte: new Date(`${end}T00:00:00.000Z`) }, endDate: { $gte: new Date(`${start}T00:00:00.000Z`) } });
  if (overlap) throw new HttpError(409, 'This request overlaps an existing pending or approved leave request.');
  if (req.body.leaveType !== 'UNPAID') {
    const balance = await getBalance(employee._id, Number(start.slice(0, 4)));
    const [available, used] = balanceField[req.body.leaveType];
    if (balance[available] - balance[used] < durationDays) throw new HttpError(400, `Insufficient ${req.body.leaveType.toLowerCase()} leave balance.`);
  }
  const leave = await Leave.create({ employee: employee._id, leaveType: req.body.leaveType, startDate: new Date(`${start}T00:00:00.000Z`), endDate: new Date(`${end}T00:00:00.000Z`), durationDays, reason: req.body.reason, status: 'PENDING' });
  const managers = employee.reportingManager ? await Employee.findById(employee.reportingManager).populate('user', '_id') : null;
  if (managers?.user?._id) await createNotification({ recipient: managers.user._id, type: 'LEAVE_UPDATE', title: 'Leave request submitted', message: `${employee.fullName} submitted a ${req.body.leaveType.toLowerCase()} leave request.`, resourceType: 'Leave', resourceId: leave._id });
  await audit({ actor: req.user._id, action: 'LEAVE_SUBMITTED', resourceType: 'Leave', resourceId: leave._id, metadata: { durationDays, leaveType: leave.leaveType }, req });
  ok(res, { leave }, 'Leave request submitted.', 201);
});
export const listLeaves = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req);
  const filter = {};
  if (req.user.role === 'EMPLOYEE') {
    const employee = await employeeForUser(req.user); if (!employee) throw new HttpError(400, 'No linked employee profile.'); filter.employee = employee._id;
  } else if (req.user.role === 'MANAGER') {
    const ids = await teamEmployeeIds(req.user); if (req.user.employee) ids.push(String(req.user.employee)); filter.employee = { $in: ids };
  } else if (req.query.employeeId) filter.employee = req.query.employeeId;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.leaveType) filter.leaveType = req.query.leaveType;
  const [items, total] = await Promise.all([Leave.find(filter).populate({ path: 'employee', select: 'employeeId fullName department reportingManager', populate: { path: 'user', select: 'email' } }).populate('reviewer', 'name email role').sort(sort).skip(skip).limit(limit), Leave.countDocuments(filter)]);
  ok(res, { items, pagination: pageMeta(page, limit, total) });
});
export const leaveBalances = asyncHandler(async (req, res) => {
  const employee = await employeeForUser(req.user); if (!employee) throw new HttpError(400, 'No linked employee profile.');
  const year = Number.parseInt(req.query.year, 10) || Number(attendanceDateKey().slice(0, 4));
  if (year < 2000 || year > 2200) throw new HttpError(400, 'Invalid leave-balance year.');
  const balance = await getBalance(employee._id, year);
  ok(res, { year, categories: Object.fromEntries(['ANNUAL', 'SICK', 'PERSONAL', 'UNPAID'].map((kind) => {
    if (kind === 'UNPAID') return [kind, { entitled: balance.unpaid, used: 0, remaining: balance.unpaid }];
    const [entitled, used] = balanceField[kind]; return [kind, { entitled: balance[entitled], used: balance[used], remaining: balance[entitled] - balance[used] }];
  })) });
});
export const reviewLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id).populate('employee', 'fullName reportingManager user');
  if (!leave) throw new HttpError(404, 'Leave request not found.');
  const employee = leave.employee;
  if (req.user.role === 'MANAGER' && String(employee.reportingManager || '') !== String(req.user.employee || '')) throw new HttpError(403, 'You can only review leave requests for your assigned team.');
  if (String(employee.user || '') === String(req.user._id)) throw new HttpError(403, 'You cannot approve or reject your own leave request.');
  if (leave.status !== 'PENDING') throw new HttpError(409, 'Only pending leave requests can be reviewed.');
  const decision = req.body.decision;
  if (decision === 'APPROVED' && leave.leaveType !== 'UNPAID') {
    const year = new Date(leave.startDate).getUTCFullYear();
    if (new Date(leave.endDate).getUTCFullYear() !== year) throw new HttpError(400, 'Cross-year leave requests must be split by year before approval.');
    const [entitled, used] = balanceField[leave.leaveType];
    const balance = await LeaveBalance.findOneAndUpdate({ employee: employee._id, year, $expr: { $gte: [{ $subtract: [`$${entitled}`, `$${used}`] }, leave.durationDays] } }, { $inc: { [used]: leave.durationDays } }, { new: true });
    if (!balance) throw new HttpError(400, `Insufficient ${leave.leaveType.toLowerCase()} balance at approval time.`);
    const updated = await Leave.findOneAndUpdate({ _id: leave._id, status: 'PENDING' }, { $set: { status: 'APPROVED', reviewer: req.user._id, decisionAt: new Date(), rejectionReason: '' } }, { new: true });
    if (!updated) { await LeaveBalance.updateOne({ employee: employee._id, year }, { $inc: { [used]: -leave.durationDays } }); throw new HttpError(409, 'Leave request was already processed by another reviewer.'); }
    leave.status = 'APPROVED'; leave.reviewer = req.user._id; leave.decisionAt = new Date();
  } else {
    const updated = await Leave.findOneAndUpdate({ _id: leave._id, status: 'PENDING' }, { $set: { status: decision, reviewer: req.user._id, decisionAt: new Date(), rejectionReason: decision === 'REJECTED' ? String(req.body.rejectionReason || '').slice(0, 1000) : '' } }, { new: true });
    if (!updated) throw new HttpError(409, 'Leave request was already processed by another reviewer.');
    leave.status = decision; leave.reviewer = req.user._id; leave.decisionAt = new Date(); leave.rejectionReason = updated.rejectionReason;
  }
  if (employee.user) await createNotification({ recipient: employee.user, type: 'LEAVE_UPDATE', title: `Leave request ${leave.status.toLowerCase()}`, message: `Your leave request for ${isoDay(leave.startDate)} to ${isoDay(leave.endDate)} was ${leave.status.toLowerCase()}.`, resourceType: 'Leave', resourceId: leave._id });
  await audit({ actor: req.user._id, action: `LEAVE_${decision}`, resourceType: 'Leave', resourceId: leave._id, metadata: { employee: employee._id, durationDays: leave.durationDays }, req });
  ok(res, { leave: { _id: leave._id, status: leave.status, reviewer: req.user._id, decisionAt: leave.decisionAt } }, `Leave request ${decision.toLowerCase()}.`);
});
export const cancelLeave = asyncHandler(async (req, res) => {
  const employee = await employeeForUser(req.user); if (!employee) throw new HttpError(400, 'No linked employee profile.');
  const leave = await Leave.findOneAndUpdate({ _id: req.params.id, employee: employee._id, status: 'PENDING' }, { $set: { status: 'CANCELLED' } }, { new: true });
  if (!leave) throw new HttpError(404, 'Pending leave request not found; only your pending requests can be cancelled.');
  await audit({ actor: req.user._id, action: 'LEAVE_CANCELLED', resourceType: 'Leave', resourceId: leave._id, req });
  ok(res, { leave }, 'Leave request cancelled.');
});
