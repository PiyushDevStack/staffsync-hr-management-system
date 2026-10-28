import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['HR', 'MANAGER', 'EMPLOYEE'], required: true, default: 'EMPLOYEE', index: true },
  accountStatus: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });
userSchema.index({ role: 1, accountStatus: 1 });
export default mongoose.model('User', userSchema);
