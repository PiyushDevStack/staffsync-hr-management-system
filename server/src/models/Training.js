import mongoose from 'mongoose';
const trainingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  instructor: { type: String, required: true, trim: true, maxlength: 120 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  capacity: { type: Number, min: 1, default: 30 },
  enrolledCount: { type: Number, min: 0, default: 0 },
  audienceDepartments: [{ type: String, trim: true }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'OPEN', index: true }
}, { timestamps: true });
trainingSchema.index({ startsAt: 1, status: 1 });
export default mongoose.model('Training', trainingSchema);
