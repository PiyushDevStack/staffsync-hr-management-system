import { body } from 'express-validator';
import Announcement from '../models/Announcement.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { employeeForUser } from '../services/permissions.js';
import { audit } from '../utils/audit.js';

export const announcementValidators = [body('title').isString().trim().isLength({ min: 3, max: 180 }), body('content').isString().trim().isLength({ min: 10, max: 10000 }), body('audienceRoles').optional().isArray(), body('audienceDepartments').optional().isArray(), body('status').optional().isIn(['DRAFT', 'PUBLISHED'])];
async function visibilityFilter(user) {
  if (user.role === 'HR') return {};
  const employee = await employeeForUser(user);
  const department = employee?.department || '__NO_EMPLOYEE_DEPARTMENT__';
  const now = new Date();
  return {
    status: 'PUBLISHED', publishAt: { $lte: now },
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ audienceRoles: { $size: 0 } }, { audienceRoles: user.role }] },
      { $or: [{ audienceDepartments: { $size: 0 } }, { audienceDepartments: department }] }
    ]
  };
}
export const listAnnouncements = asyncHandler(async (req, res) => {
  const filter = await visibilityFilter(req.user);
  if (req.user.role === 'HR' && req.query.status) filter.status = req.query.status;
  const items = await Announcement.find(filter).populate('author', 'name role').sort({ publishAt: -1 }).limit(200);
  ok(res, { items });
});
export const getAnnouncement = asyncHandler(async (req, res) => {
  const filter = await visibilityFilter(req.user);
  filter._id = req.params.id;
  const item = await Announcement.findOne(filter).populate('author', 'name role');
  if (!item) throw new HttpError(404, 'Announcement not found or not visible to your account.');
  ok(res, { announcement: item });
});
export const createAnnouncement = asyncHandler(async (req, res) => {
  const item = await Announcement.create({
    title: req.body.title, content: req.body.content, author: req.user._id,
    audienceRoles: req.body.audienceRoles?.length ? req.body.audienceRoles : ['HR', 'MANAGER', 'EMPLOYEE'],
    audienceDepartments: req.body.audienceDepartments || [], publishAt: req.body.publishAt ? new Date(req.body.publishAt) : new Date(),
    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null, status: req.body.status || 'PUBLISHED'
  });
  await audit({ actor: req.user._id, action: 'ANNOUNCEMENT_CREATED', resourceType: 'Announcement', resourceId: item._id, req });
  ok(res, { announcement: item }, 'Announcement saved.', 201);
});
export const updateAnnouncement = asyncHandler(async (req, res) => {
  const allowed = ['title', 'content', 'audienceRoles', 'audienceDepartments', 'publishAt', 'expiresAt', 'status'];
  const update = {};
  for (const field of allowed) if (req.body[field] !== undefined) update[field] = req.body[field];
  if (update.publishAt) update.publishAt = new Date(update.publishAt);
  if (update.expiresAt === '') update.expiresAt = null; else if (update.expiresAt) update.expiresAt = new Date(update.expiresAt);
  const item = await Announcement.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
  if (!item) throw new HttpError(404, 'Announcement not found.');
  await audit({ actor: req.user._id, action: 'ANNOUNCEMENT_UPDATED', resourceType: 'Announcement', resourceId: item._id, metadata: { fields: Object.keys(update) }, req });
  ok(res, { announcement: item }, 'Announcement updated.');
});
export const archiveAnnouncement = asyncHandler(async (req, res) => {
  const item = await Announcement.findByIdAndUpdate(req.params.id, { $set: { status: 'ARCHIVED' } }, { new: true });
  if (!item) throw new HttpError(404, 'Announcement not found.');
  await audit({ actor: req.user._id, action: 'ANNOUNCEMENT_ARCHIVED', resourceType: 'Announcement', resourceId: item._id, req });
  ok(res, { announcement: item }, 'Announcement archived.');
});
