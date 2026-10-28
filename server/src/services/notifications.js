import Notification from '../models/Notification.js';
export async function createNotification({ recipient, type = 'SYSTEM', title, message, resourceType, resourceId }) {
  if (!recipient) return null;
  return Notification.create({ recipient, type, title, message, resourceType, resourceId: resourceId ? String(resourceId) : undefined });
}
export async function notifyEmployee(employee, payload) {
  const populated = employee?.user ? employee : await employee?.populate?.('user');
  const userId = populated?.user?._id || populated?.user;
  return createNotification({ recipient: userId, ...payload });
}
