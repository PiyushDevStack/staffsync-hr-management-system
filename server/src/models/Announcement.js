import mongoose from 'mongoose';
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  content: { type: String, required: true, trim: true, maxlength: 10000 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  audienceRoles: [{ type: String, enum: ['HR', 'MANAGER', 'EMPLOYEE'] }],
  audienceDepartments: [{ type: String, trim: true }],
  publishAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'PUBLISHED', index: true }
}, { timestamps: true });
announcementSchema.index({ status: 1, publishAt: -1 });
export default mongoose.model('Announcement', announcementSchema);
