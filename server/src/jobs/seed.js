import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { connectDatabase, closeDatabase } from '../config/database.js';
import { attendanceDateKey, leaveEntitlements } from '../config/leavePolicy.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Announcement from '../models/Announcement.js';
import Training from '../models/Training.js';
import TrainingEnrollment from '../models/TrainingEnrollment.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

if (env.nodeEnv === 'production') throw new Error('Refusing to seed while NODE_ENV=production.');
const today = new Date(); const localTodayKey = attendanceDateKey(today); const localTodayYear = Number(localTodayKey.slice(0, 4)); const dayStart = new Date(`${localTodayKey}T00:00:00.000Z`);
const day = (offset) => new Date(dayStart.getTime() + offset * 86400000);
const password = process.env.DEMO_SEED_PASSWORD || 'StaffSync@12345';
if (password.length < 12) throw new Error('DEMO_SEED_PASSWORD must contain at least 12 characters.');

try {
  await connectDatabase();
  for (const Model of [TrainingEnrollment, Attendance, Leave, LeaveBalance, Notification, Announcement, Training, AuditLog, Employee, User]) await Model.deleteMany({});
  const passwordHash = await bcrypt.hash(password, 12);
  const hr = await User.create({ name: 'Taylor Morgan', email: 'hr@staffsync.local', passwordHash, role: 'HR', accountStatus: 'ACTIVE' });
  const manager1User = await User.create({ name: 'Jordan Lee', email: 'manager1@staffsync.local', passwordHash, role: 'MANAGER', accountStatus: 'ACTIVE' });
  const manager2User = await User.create({ name: 'Alex Rivera', email: 'manager2@staffsync.local', passwordHash, role: 'MANAGER', accountStatus: 'ACTIVE' });
  const employee1User = await User.create({ name: 'Sam Patel', email: 'employee1@staffsync.local', passwordHash, role: 'EMPLOYEE', accountStatus: 'ACTIVE' });
  const employee2User = await User.create({ name: 'Casey Chen', email: 'employee2@staffsync.local', passwordHash, role: 'EMPLOYEE', accountStatus: 'ACTIVE' });
  const manager1 = await Employee.create({ employeeId: 'SS-1001', user: manager1User._id, fullName: manager1User.name, department: 'Engineering', designation: 'Engineering Manager', dateOfJoining: day(-900) });
  const manager2 = await Employee.create({ employeeId: 'SS-1002', user: manager2User._id, fullName: manager2User.name, department: 'People Operations', designation: 'People Manager', dateOfJoining: day(-850) });
  const employee1 = await Employee.create({ employeeId: 'SS-2001', user: employee1User._id, fullName: employee1User.name, department: 'Engineering', designation: 'Software Engineer', dateOfJoining: day(-240), reportingManager: manager1._id });
  const employee2 = await Employee.create({ employeeId: 'SS-2002', user: employee2User._id, fullName: employee2User.name, department: 'People Operations', designation: 'HR Associate', dateOfJoining: day(-180), reportingManager: manager2._id });
  for (const [user, employee] of [[manager1User, manager1], [manager2User, manager2], [employee1User, employee1], [employee2User, employee2]]) { user.employee = employee._id; await user.save(); }
  const employees = [manager1, manager2, employee1, employee2];
  for (const employee of employees) await LeaveBalance.create({ employee: employee._id, year: localTodayYear, annual: leaveEntitlements.annual, sick: leaveEntitlements.sick, personal: leaveEntitlements.personal, unpaid: leaveEntitlements.unpaid, usedAnnual: 0, usedSick: 0, usedPersonal: 0 });
  for (const employee of employees) {
    await Attendance.create({ employee: employee._id, attendanceDate: day(-1), checkInAt: new Date(day(-1).getTime() + 9 * 3600000), checkOutAt: new Date(day(-1).getTime() + 17.5 * 3600000), durationHours: 8.5, status: 'PRESENT' });
    await Attendance.create({ employee: employee._id, attendanceDate: day(-2), checkInAt: new Date(day(-2).getTime() + 9.1 * 3600000), checkOutAt: new Date(day(-2).getTime() + 17.5 * 3600000), durationHours: 8.4, status: 'PRESENT' });
  }
  const approvedLeave = await Leave.create({ employee: employee1._id, leaveType: 'ANNUAL', startDate: day(3), endDate: day(4), durationDays: 2, reason: 'Personal travel planned in advance.', status: 'APPROVED', reviewer: manager1User._id, decisionAt: new Date() });
  await Leave.create({ employee: employee2._id, leaveType: 'SICK', startDate: day(1), endDate: day(1), durationDays: 1, reason: 'Medical rest day.', status: 'PENDING' });
  await LeaveBalance.updateOne({ employee: employee1._id, year: localTodayYear }, { $inc: { usedAnnual: 2 } });
  await Announcement.create({ title: 'Welcome to StaffSync', content: 'This is the StaffSync demo workspace. Use the dashboard to explore attendance, leave, training, and employee workflows.', author: hr._id, audienceRoles: ['HR', 'MANAGER', 'EMPLOYEE'], audienceDepartments: [], publishAt: new Date(), status: 'PUBLISHED' });
  await Announcement.create({ title: 'Quarterly learning week', content: 'Browse the training section to enroll in available learning sessions and track completion.', author: hr._id, audienceRoles: ['MANAGER', 'EMPLOYEE'], audienceDepartments: [], publishAt: new Date(), status: 'PUBLISHED' });
  const training1 = await Training.create({ title: 'Secure Software Foundations', description: 'Practical secure coding and web application threat awareness for engineering teams.', instructor: 'StaffSync Learning Team', startsAt: day(7), endsAt: new Date(day(7).getTime() + 2 * 3600000), capacity: 20, enrolledCount: 0, audienceDepartments: ['Engineering'], createdBy: hr._id, status: 'OPEN' });
  await Training.create({ title: 'People Operations Essentials', description: 'A practical introduction to employee support, policy workflows, and communication.', instructor: 'People Operations Team', startsAt: day(10), endsAt: new Date(day(10).getTime() + 2 * 3600000), capacity: 15, enrolledCount: 0, audienceDepartments: ['People Operations'], createdBy: hr._id, status: 'OPEN' });
  await TrainingEnrollment.create({ training: training1._id, employee: employee1._id, status: 'ENROLLED' });
  await Training.findByIdAndUpdate(training1._id, { $inc: { enrolledCount: 1 } });
  await Notification.create({ recipient: employee1User._id, type: 'LEAVE_UPDATE', title: 'Leave request approved', message: `Your leave request for ${day(3).toISOString().slice(0, 10)} to ${day(4).toISOString().slice(0, 10)} was approved.`, resourceType: 'Leave', resourceId: approvedLeave._id });
  await Notification.create({ recipient: employee1User._id, type: 'ANNOUNCEMENT', title: 'New company announcement', message: 'Welcome to StaffSync. Explore the dashboard to get started.', resourceType: 'Announcement' });
  console.log('StaffSync development data seeded.');
  console.log(`Demo password: ${password}`);
  console.log('Accounts: hr@staffsync.local, manager1@staffsync.local, manager2@staffsync.local, employee1@staffsync.local, employee2@staffsync.local');
} finally { await closeDatabase(); }
