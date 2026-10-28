import mongoose from 'mongoose';
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true, maxlength: 100 },
  resourceType: { type: String, required: true, maxlength: 100 },
  resourceId: { type: String, maxlength: 100 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, maxlength: 100 }
}, { timestamps: true });
auditLogSchema.index({ actor: 1, createdAt: -1 });
export default mongoose.model('AuditLog', auditLogSchema);
