import mongoose from 'mongoose';
import { leaveEntitlements } from '../config/leavePolicy.js';
const leaveBalanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  year: { type: Number, required: true },
  annual: { type: Number, min: 0, default: leaveEntitlements.annual },
  sick: { type: Number, min: 0, default: leaveEntitlements.sick },
  personal: { type: Number, min: 0, default: leaveEntitlements.personal },
  unpaid: { type: Number, min: 0, default: leaveEntitlements.unpaid },
  usedAnnual: { type: Number, min: 0, default: 0 },
  usedSick: { type: Number, min: 0, default: 0 },
  usedPersonal: { type: Number, min: 0, default: 0 }
}, { timestamps: true });
leaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });
export default mongoose.model('LeaveBalance', leaveBalanceSchema);
