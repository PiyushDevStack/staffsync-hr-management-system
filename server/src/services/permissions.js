import Employee from '../models/Employee.js';
import { HttpError } from '../utils/httpError.js';

export async function employeeForUser(user) {
  if (!user?.employee) return null;
  return Employee.findById(user.employee).select('employeeId fullName department designation reportingManager employmentStatus user');
}
export async function canAccessEmployee(user, employeeId) {
  if (user.role === 'HR') return true;
  const target = await Employee.findById(employeeId).select('reportingManager user');
  if (!target) return false;
  if (user.employee && String(target.user || '') === String(user._id)) return true;
  return user.role === 'MANAGER' && String(target.reportingManager || '') === String(user.employee || '');
}
export async function assertCanAccessEmployee(user, employeeId) {
  const allowed = await canAccessEmployee(user, employeeId);
  if (!allowed) throw new HttpError(403, 'You do not have access to this employee record.');
  const employee = await Employee.findById(employeeId);
  if (!employee) throw new HttpError(404, 'Employee not found.');
  return employee;
}
export async function teamEmployeeIds(user) {
  if (user.role === 'HR') return null;
  if (user.role === 'EMPLOYEE') return user.employee ? [user.employee] : [];
  if (!user.employee) return [];
  return (await Employee.find({ reportingManager: user.employee }).distinct('_id')).map(String);
}
export async function assertCanManageTraining(user, training) {
  if (user.role === 'HR') return;
  if (user.role !== 'MANAGER') throw new HttpError(403, 'Only HR or an authorized manager can manage training.');
  const manager = await employeeForUser(user);
  const team = await Employee.find({ reportingManager: user.employee }).select('department');
  const departments = new Set([manager?.department, ...team.map((e) => e.department)].filter(Boolean));
  const targeted = training.audienceDepartments || [];
  if (!targeted.length && String(training.createdBy || '') !== String(user._id)) throw new HttpError(403, 'You can only manage training you created or training explicitly scoped to your team.');
  if (targeted.some((department) => !departments.has(department))) throw new HttpError(403, 'Training includes departments outside your team.');
}
