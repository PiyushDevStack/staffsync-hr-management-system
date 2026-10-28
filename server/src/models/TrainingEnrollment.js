import mongoose from 'mongoose';
const enrollmentSchema = new mongoose.Schema({
  training: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  enrolledAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['ENROLLED', 'ATTENDED', 'COMPLETED', 'WITHDRAWN'], default: 'ENROLLED' },
  completedAt: { type: Date, default: null }
}, { timestamps: true });
enrollmentSchema.index({ training: 1, employee: 1 }, { unique: true });
enrollmentSchema.index({ employee: 1, status: 1 });
export default mongoose.model('TrainingEnrollment', enrollmentSchema);
