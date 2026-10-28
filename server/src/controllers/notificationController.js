import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
export const listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.max(1, Math.min(Number.parseInt(req.query.limit, 10) || 30, 100));
  const filter = { recipient: req.user._id };
  if (req.query.unread === 'true') filter.readAt = null;
  const [items, unreadCount] = await Promise.all([Notification.find(filter).sort({ createdAt: -1 }).limit(limit), Notification.countDocuments({ recipient: req.user._id, readAt: null })]);
  ok(res, { items, unreadCount });
});
export const markRead = asyncHandler(async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { $set: { readAt: new Date() } }, { new: true });
  if (!item) throw new HttpError(404, 'Notification not found.');
  ok(res, { notification: item }, 'Notification marked as read.');
});
export const markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  ok(res, { modifiedCount: result.modifiedCount }, 'Notifications marked as read.');
});
