import mongoose from 'mongoose';
const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  leaveType: { type: String, enum: ['ANNUAL', 'SICK', 'PERSONAL', 'UNPAID'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  durationDays: { type: Number, required: true, min: 0 },
  reason: { type: String, required: true, trim: true, maxlength: 1500 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING', index: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  decisionAt: { type: Date, default: null },
  rejectionReason: { type: String, trim: true, maxlength: 1000 }
}, { timestamps: true });
leaveSchema.index({ employee: 1, status: 1, startDate: -1 });
leaveSchema.index({ status: 1, startDate: 1, endDate: 1 });
export default mongoose.model('Leave', leaveSchema);
