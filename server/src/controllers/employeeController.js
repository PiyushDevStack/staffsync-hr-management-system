import bcrypt from 'bcryptjs';
import { body, param, query } from 'express-validator';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import LeaveBalance from '../models/LeaveBalance.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { parsePagination, pageMeta } from '../middleware/pagination.js';
import { employeeForUser, teamEmployeeIds } from '../services/permissions.js';
import { audit } from '../utils/audit.js';
import { attendanceDateKey } from '../config/leavePolicy.js';

export const employeeValidators = [
  body('fullName').isString().trim().isLength({ min: 2, max: 120 }),
  body('employeeId').isString().trim().matches(/^[a-zA-Z0-9_-]{2,30}$/),
  body('email').isEmail().normalizeEmail(),
  body('initialPassword').isString().isLength({ min: 12, max: 128 }),
  body('department').isString().trim().isLength({ min: 2, max: 100 }),
  body('designation').isString().trim().isLength({ min: 2, max: 120 }),
  body('dateOfJoining').isISO8601(),
  body('role').optional().isIn(['MANAGER', 'EMPLOYEE']),
  body('reportingManager').optional({ nullable: true }).isMongoId()
];
export const listValidators = [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })];
function safeEmployee(employee) {
  const out = employee.toObject ? employee.toObject() : { ...employee };
  delete out.annualCompensation;
  if (out.user && typeof out.user === 'object') { delete out.user.passwordHash; delete out.user.accountStatus; }
  return out;
}
export const listEmployees = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req);
  const filter = {};
  if (req.user.role === 'MANAGER') filter.reportingManager = req.user.employee;
  else if (req.user.role !== 'HR') throw new HttpError(403, 'Employee directory access is not permitted.');
  if (req.query.department) filter.department = String(req.query.department).slice(0, 100);
  if (req.query.status) filter.employmentStatus = req.query.status;
  if (req.query.designation) filter.designation = String(req.query.designation).slice(0, 120);
  if (req.query.q) {
    const q = String(req.query.q).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ fullName: new RegExp(q, 'i') }, { employeeId: new RegExp(q, 'i') }, { department: new RegExp(q, 'i') }];
  }
  const [employees, total] = await Promise.all([
    Employee.find(filter).select('-annualCompensation').populate('reportingManager', 'employeeId fullName').populate('user', 'name email role').sort(sort).skip(skip).limit(limit),
    Employee.countDocuments(filter)
  ]);
  ok(res, { items: employees.map(safeEmployee), pagination: pageMeta(page, limit, total) });
});
export const myEmployeeProfile = asyncHandler(async (req, res) => {
  const employee = await employeeForUser(req.user);
  if (!employee) throw new HttpError(404, 'No employee profile is linked to this account.');
  const full = await Employee.findById(employee._id).select('-annualCompensation').populate('reportingManager', 'employeeId fullName department designation');
  ok(res, { employee: safeEmployee(full) });
});
export const getEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id).select('-annualCompensation').populate('reportingManager', 'employeeId fullName department designation').populate('user', 'name email role');
  if (!employee) throw new HttpError(404, 'Employee not found.');
  const allowed = req.user.role === 'HR' || (req.user.role === 'MANAGER' && String(employee.reportingManager?._id || '') === String(req.user.employee || '')) || String(employee.user?._id || employee.user || '') === String(req.user._id);
  if (!allowed) throw new HttpError(403, 'You do not have access to this employee record.');
  ok(res, { employee: safeEmployee(employee) });
});
export const createEmployee = asyncHandler(async (req, res) => {
  const { fullName, employeeId, email, initialPassword, department, designation, dateOfJoining, reportingManager, role = 'EMPLOYEE', phone, address } = req.body;
  if (reportingManager) {
    const manager = await Employee.findOne({ _id: reportingManager, employmentStatus: 'ACTIVE' }).populate('user', 'role');
    if (!manager || manager.user?.role !== 'MANAGER') throw new HttpError(400, 'Reporting manager must be an active employee with the Manager role.');
  }
  const user = await User.create({ name: fullName.trim(), email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(initialPassword, 12), role, accountStatus: 'ACTIVE' });
  let employee;
  try {
    employee = await Employee.create({ employeeId, user: user._id, fullName, department, designation, dateOfJoining: new Date(dateOfJoining), reportingManager: reportingManager || null, phone, address });
    user.employee = employee._id;
    await user.save();
    await LeaveBalance.create({ employee: employee._id, year: Number(attendanceDateKey().slice(0, 4)) });
  } catch (error) {
    await Employee.deleteOne({ user: user._id }); await User.deleteOne({ _id: user._id }); throw error;
  }
  await audit({ actor: req.user._id, action: 'EMPLOYEE_CREATED', resourceType: 'Employee', resourceId: employee._id, metadata: { role, department }, req });
  ok(res, { employee: safeEmployee(employee) }, 'Employee and account created.', 201);
});
export const updateEmployee = asyncHandler(async (req, res) => {
  const allowedFields = ['fullName', 'department', 'designation', 'dateOfJoining', 'reportingManager', 'employmentStatus', 'phone', 'address', 'emergencyContact'];
  const update = {};
  for (const field of allowedFields) if (req.body[field] !== undefined) update[field] = req.body[field];
  if (update.dateOfJoining) update.dateOfJoining = new Date(update.dateOfJoining);
  if (update.reportingManager === '') update.reportingManager = null;
  if (update.reportingManager) {
    const manager = await Employee.findOne({ _id: update.reportingManager, employmentStatus: 'ACTIVE' }).populate('user', 'role');
    if (!manager || manager.user?.role !== 'MANAGER') throw new HttpError(400, 'Reporting manager must be an active employee with the Manager role.');
  }
  const employee = await Employee.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true }).select('-annualCompensation');
  if (!employee) throw new HttpError(404, 'Employee not found.');
  if (employee.user && update.fullName) await User.findByIdAndUpdate(employee.user, { name: update.fullName });
  if (employee.user && update.employmentStatus) await User.findByIdAndUpdate(employee.user, { accountStatus: ['INACTIVE', 'TERMINATED'].includes(update.employmentStatus) ? 'INACTIVE' : 'ACTIVE' });
  await audit({ actor: req.user._id, action: 'EMPLOYEE_UPDATED', resourceType: 'Employee', resourceId: employee._id, metadata: { fields: Object.keys(update) }, req });
  ok(res, { employee: safeEmployee(employee) }, 'Employee updated.');
});
export const updateMyProfile = asyncHandler(async (req, res) => {
  const employee = await employeeForUser(req.user);
  if (!employee) throw new HttpError(404, 'No employee profile is linked to this account.');
  const update = {};
  for (const field of ['phone', 'address', 'emergencyContact']) if (req.body[field] !== undefined) update[field] = req.body[field];
  const updated = await Employee.findByIdAndUpdate(employee._id, { $set: update }, { new: true, runValidators: true }).select('-annualCompensation');
  ok(res, { employee: safeEmployee(updated) }, 'Profile updated.');
});
export const deactivateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new HttpError(404, 'Employee not found.');
  employee.employmentStatus = 'INACTIVE'; await employee.save();
  if (employee.user) await User.findByIdAndUpdate(employee.user, { accountStatus: 'INACTIVE' });
  await audit({ actor: req.user._id, action: 'EMPLOYEE_DEACTIVATED', resourceType: 'Employee', resourceId: employee._id, req });
  ok(res, {}, 'Employee account deactivated.');
});
