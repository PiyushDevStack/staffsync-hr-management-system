import AuditLog from '../models/AuditLog.js';
export async function audit({ actor, action, resourceType, resourceId, metadata = {}, req }) {
  try {
    await AuditLog.create({ actor, action, resourceType, resourceId: resourceId ? String(resourceId) : undefined, metadata, ip: req?.ip });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
}
