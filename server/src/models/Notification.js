import mongoose from 'mongoose';
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true, enum: ['LEAVE_UPDATE', 'ANNOUNCEMENT', 'TRAINING', 'SYSTEM'] },
  title: { type: String, required: true, maxlength: 180 },
  message: { type: String, required: true, maxlength: 1000 },
  resourceType: { type: String, maxlength: 50 },
  resourceId: { type: String, maxlength: 100 },
  readAt: { type: Date, default: null }
}, { timestamps: true });
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);
