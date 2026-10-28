import mongoose from 'mongoose';
const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  department: { type: String, required: true, trim: true, index: true },
  designation: { type: String, required: true, trim: true },
  dateOfJoining: { type: Date, required: true },
  reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null, index: true },
  employmentStatus: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'], default: 'ACTIVE', index: true },
  phone: { type: String, trim: true, maxlength: 30 },
  address: { type: String, trim: true, maxlength: 500 },
  emergencyContact: { name: { type: String, trim: true }, relationship: { type: String, trim: true }, phone: { type: String, trim: true } },
  annualCompensation: { type: Number, min: 0, select: false }
}, { timestamps: true });
employeeSchema.index({ department: 1, employmentStatus: 1 });
employeeSchema.index({ fullName: 1 });
export default mongoose.model('Employee', employeeSchema);
