import { body } from 'express-validator';
import Training from '../models/Training.js';
import TrainingEnrollment from '../models/TrainingEnrollment.js';
import Employee from '../models/Employee.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { employeeForUser, assertCanManageTraining } from '../services/permissions.js';
import { createNotification } from '../services/notifications.js';
import { audit } from '../utils/audit.js';

export const trainingValidators = [body('title').isString().trim().isLength({ min: 3, max: 180 }), body('description').isString().trim().isLength({ min: 10, max: 5000 }), body('instructor').isString().trim().isLength({ min: 2, max: 120 }), body('startsAt').isISO8601(), body('endsAt').isISO8601(), body('capacity').optional().isInt({ min: 1, max: 10000 }), body('audienceDepartments').optional().isArray(), body('audienceDepartments.*').optional().isString().trim().isLength({ min: 2, max: 100 }), body('status').optional().isIn(['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])];
export async function visibleTrainingFilter(user) {
  if (user.role === 'HR') return {};
  const employee = await employeeForUser(user);
  const team = user.role === 'MANAGER' ? await Employee.find({ reportingManager: user.employee }).select('department') : [];
  const departments = [...new Set([employee?.department, ...team.map((e) => e.department)].filter(Boolean))];
  return { status: { $in: ['OPEN', 'IN_PROGRESS', 'COMPLETED'] }, $or: [{ audienceDepartments: { $size: 0 } }, { audienceDepartments: { $in: departments.length ? departments : ['__NO_EMPLOYEE_DEPARTMENT__'] } }] };
}
export const listTrainings = asyncHandler(async (req, res) => {
  const filter = await visibleTrainingFilter(req.user);
  if (req.query.status) filter.status = req.query.status;
  const items = await Training.find(filter).populate('createdBy', 'name role').sort({ startsAt: 1 }).limit(200);
  const employee = await employeeForUser(req.user);
  const enrollmentIds = employee ? (await TrainingEnrollment.find({ employee: employee._id, status: { $ne: 'WITHDRAWN' } }).distinct('training')).map(String) : [];
  ok(res, { items, enrolledTrainingIds: enrollmentIds });
});
export const createTraining = asyncHandler(async (req, res) => {
  let audiences = req.body.audienceDepartments || [];
  if (req.user.role === 'MANAGER') {
    const team = await Employee.find({ reportingManager: req.user.employee }).select('department');
    const manager = await employeeForUser(req.user);
    const allowed = new Set([manager?.department, ...team.map((e) => e.department)].filter(Boolean));
    if (audiences.some((d) => !allowed.has(d))) throw new HttpError(403, 'Training audience must be limited to your team departments.');
    if (!audiences.length) audiences = [...allowed];
    if (!audiences.length) throw new HttpError(400, 'No team department is available for training targeting.');
  }
  const startsAt = new Date(req.body.startsAt); const endsAt = new Date(req.body.endsAt);
  if (endsAt <= startsAt) throw new HttpError(400, 'Training end time must be after its start time.');
  const item = await Training.create({ title: req.body.title, description: req.body.description, instructor: req.body.instructor, startsAt, endsAt, capacity: Number(req.body.capacity || 30), audienceDepartments: audiences, createdBy: req.user._id, status: req.body.status || 'OPEN', enrolledCount: 0 });
  await audit({ actor: req.user._id, action: 'TRAINING_CREATED', resourceType: 'Training', resourceId: item._id, req });
  ok(res, { training: item }, 'Training created.', 201);
});
export const updateTraining = asyncHandler(async (req, res) => {
  const training = await Training.findById(req.params.id);
  if (!training) throw new HttpError(404, 'Training not found.');
  await assertCanManageTraining(req.user, training);
  const allowed = ['title', 'description', 'instructor', 'startsAt', 'endsAt', 'capacity', 'audienceDepartments', 'status'];
  const update = {};
  for (const field of allowed) if (req.body[field] !== undefined) update[field] = req.body[field];
  if (update.startsAt) update.startsAt = new Date(update.startsAt);
  if (update.endsAt) update.endsAt = new Date(update.endsAt);
  const nextStartsAt = update.startsAt || training.startsAt;
  const nextEndsAt = update.endsAt || training.endsAt;
  if (nextEndsAt <= nextStartsAt) throw new HttpError(400, 'Training end time must be after its start time.');
  if (update.capacity !== undefined && Number(update.capacity) < training.enrolledCount) throw new HttpError(400, 'Capacity cannot be lower than current enrollment.');
  if (update.audienceDepartments && req.user.role === 'MANAGER') {
    const manager = await employeeForUser(req.user); const team = await Employee.find({ reportingManager: req.user.employee }).select('department');
    const allowedDepartments = new Set([manager?.department, ...team.map((e) => e.department)].filter(Boolean));
    if (!update.audienceDepartments.length || update.audienceDepartments.some((d) => !allowedDepartments.has(d))) throw new HttpError(403, 'Training audience must be limited to your team departments.');
  }
  Object.assign(training, update); await training.save();
  await audit({ actor: req.user._id, action: 'TRAINING_UPDATED', resourceType: 'Training', resourceId: training._id, metadata: { fields: Object.keys(update) }, req });
  ok(res, { training }, 'Training updated.');
});
export const enrollTraining = asyncHandler(async (req, res) => {
  const employee = await employeeForUser(req.user); if (!employee) throw new HttpError(400, 'Your account has no linked employee profile.');
  const training = await Training.findOne({ _id: req.params.id, status: 'OPEN' });
  if (!training) throw new HttpError(404, 'Open training program not found.');
  if (training.audienceDepartments.length && !training.audienceDepartments.includes(employee.department)) throw new HttpError(403, 'This training is not available to your department.');
  if (training.startsAt <= new Date()) throw new HttpError(409, 'Enrollment is closed because the training has started.');
  const previousEnrollment = await TrainingEnrollment.findOne({ training: training._id, employee: employee._id });
  if (previousEnrollment && previousEnrollment.status !== 'WITHDRAWN') throw new HttpError(409, 'You are already enrolled in this training.');
  const reserved = await Training.findOneAndUpdate({ _id: training._id, status: 'OPEN', $expr: { $lt: ['$enrolledCount', '$capacity'] } }, { $inc: { enrolledCount: 1 } }, { new: true });
  if (!reserved) throw new HttpError(409, 'Training is full or no longer open.');
  let enrollment;
  try {
    if (previousEnrollment) {
      enrollment = await TrainingEnrollment.findOneAndUpdate(
        { _id: previousEnrollment._id, status: 'WITHDRAWN' },
        { $set: { status: 'ENROLLED', enrolledAt: new Date(), completedAt: null } },
        { new: true, runValidators: true }
      );
      if (!enrollment) throw new HttpError(409, 'This enrollment changed concurrently. Refresh and try again.');
    } else {
      enrollment = await TrainingEnrollment.create({ training: training._id, employee: employee._id });
    }
  } catch (error) {
    await Training.findByIdAndUpdate(training._id, { $inc: { enrolledCount: -1 } });
    if (error.code === 11000) throw new HttpError(409, 'You are already enrolled in this training.');
    throw error;
  }
  await createNotification({ recipient: req.user._id, type: 'TRAINING', title: 'Training enrollment confirmed', message: `You are enrolled in ${training.title}.`, resourceType: 'Training', resourceId: training._id });
  ok(res, { enrollment }, 'Enrollment confirmed.', 201);
});
export const listTrainingEnrollments = asyncHandler(async (req, res) => {
  const training = await Training.findById(req.params.id);
  if (!training) throw new HttpError(404, 'Training not found.');
  await assertCanManageTraining(req.user, training);
  const items = await TrainingEnrollment.find({ training: training._id }).populate('employee', 'employeeId fullName department');
  ok(res, { items });
});
export const updateEnrollmentStatus = asyncHandler(async (req, res) => {
  const training = await Training.findById(req.params.id);
  if (!training) throw new HttpError(404, 'Training not found.');
  await assertCanManageTraining(req.user, training);
  if (!['ATTENDED', 'COMPLETED', 'ENROLLED', 'WITHDRAWN'].includes(req.body.status)) throw new HttpError(400, 'Invalid enrollment status.');
  const current = await TrainingEnrollment.findOne({ training: training._id, employee: req.params.employeeId });
  if (!current) throw new HttpError(404, 'Enrollment not found.');
  const nextStatus = req.body.status;
  if (current.status !== 'WITHDRAWN' && nextStatus === 'WITHDRAWN') {
    await Training.findOneAndUpdate({ _id: training._id, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });
  } else if (current.status === 'WITHDRAWN' && nextStatus !== 'WITHDRAWN') {
    const reserved = await Training.findOneAndUpdate({ _id: training._id, $expr: { $lt: ['$enrolledCount', '$capacity'] } }, { $inc: { enrolledCount: 1 } }, { new: true });
    if (!reserved) throw new HttpError(409, 'Training is full; the enrollment cannot be reactivated.');
  }
  const enrollment = await TrainingEnrollment.findOneAndUpdate({ _id: current._id }, { $set: { status: nextStatus, completedAt: nextStatus === 'COMPLETED' ? new Date() : null } }, { new: true, runValidators: true }).populate('employee', 'employeeId fullName department');
  await audit({ actor: req.user._id, action: 'TRAINING_ENROLLMENT_UPDATED', resourceType: 'TrainingEnrollment', resourceId: enrollment._id, metadata: { status: nextStatus }, req });
  ok(res, { enrollment }, 'Enrollment status updated.');
});
