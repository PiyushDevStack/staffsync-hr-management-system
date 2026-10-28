import mongoose from 'mongoose';
const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  attendanceDate: { type: Date, required: true },
  checkInAt: { type: Date, default: null },
  checkOutAt: { type: Date, default: null },
  durationHours: { type: Number, min: 0, default: null },
  status: { type: String, enum: ['PRESENT', 'LATE', 'ABSENT', 'INCOMPLETE'], default: 'INCOMPLETE', index: true },
  notes: { type: String, maxlength: 500 }
}, { timestamps: true });
attendanceSchema.index({ employee: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ attendanceDate: -1, status: 1 });
export default mongoose.model('Attendance', attendanceSchema);
