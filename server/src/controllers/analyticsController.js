import mongoose from 'mongoose';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Training from '../models/Training.js';
import TrainingEnrollment from '../models/TrainingEnrollment.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { HttpError } from '../utils/httpError.js';
import { employeeForUser, teamEmployeeIds } from '../services/permissions.js';
import { attendanceDateKey, isConfiguredBusinessDate, isAfterLocalTime } from '../config/leavePolicy.js';

export const dashboardAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const day = attendanceDateKey(now);
  const today = new Date(`${day}T00:00:00.000Z`);
  const currentYear = Number(day.slice(0, 4));
  const monthStart = new Date(`${day.slice(0, 7)}-01T00:00:00.000Z`);
  if (req.user.role === 'HR') {
    const [activeEmployees, departments, attendance, leaves, upcomingTrainings, recentAnnouncements] = await Promise.all([
      Employee.countDocuments({ employmentStatus: 'ACTIVE' }),
      Employee.aggregate([{ $match: { employmentStatus: 'ACTIVE' } }, { $group: { _id: '$department', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Attendance.aggregate([{ $match: { attendanceDate: { $gte: monthStart, $lte: today }, checkInAt: { $ne: null } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Leave.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Training.find({ startsAt: { $gte: now }, status: { $in: ['OPEN', 'IN_PROGRESS'] } }).sort({ startsAt: 1 }).limit(5).select('title startsAt instructor status enrolledCount capacity'),
      Announcement.find({ status: 'PUBLISHED', publishAt: { $lte: now } }).sort({ publishAt: -1 }).limit(5).select('title publishAt status')
    ]);
    const leaveCounts = Object.fromEntries(leaves.map((x) => [x._id, x.count]));
    const attendanceCounts = Object.fromEntries(attendance.map((x) => [x._id, x.count]));
    let absentToday = 0;
    if (isConfiguredBusinessDate(day) && isAfterLocalTime(now)) {
      const [activeIds, checkedInIds] = await Promise.all([
        Employee.find({ employmentStatus: 'ACTIVE' }).distinct('_id'),
        Attendance.find({ attendanceDate: today, checkInAt: { $ne: null } }).distinct('employee')
      ]);
      const checkedIn = new Set(checkedInIds.map(String));
      absentToday = activeIds.filter((id) => !checkedIn.has(String(id))).length;
    }
    const recordedThisMonth = (attendanceCounts.PRESENT || 0) + (attendanceCounts.LATE || 0) + (attendanceCounts.INCOMPLETE || 0);
    return ok(res, { role: 'HR', metrics: { activeEmployees, pendingLeaves: leaveCounts.PENDING || 0, approvedLeaves: leaveCounts.APPROVED || 0, presentThisMonth: recordedThisMonth, lateThisMonth: attendanceCounts.LATE || 0, absentToday, incompleteAttendance: attendanceCounts.INCOMPLETE || 0 }, departments: departments.map((d) => ({ department: d._id, count: d.count })), attendance: attendanceCounts, leaves: leaveCounts, upcomingTrainings, recentAnnouncements });
  }
  const employee = await employeeForUser(req.user);
  if (!employee) throw new HttpError(400, 'Your account has no linked employee profile.');
  const baseId = new mongoose.Types.ObjectId(employee._id);
  if (req.user.role === 'MANAGER') {
    const directTeamIds = await teamEmployeeIds(req.user);
    const directReports = await Employee.find({ _id: { $in: directTeamIds }, employmentStatus: 'ACTIVE' }).select('_id department');
    const teamIds = directReports.map((report) => report._id);
    const allowedDepartments = [...new Set([employee.department, ...directReports.map((report) => report.department)].filter(Boolean))];
    const [todayAttendance, pendingLeaves, upcomingTrainings, enrollments, personalAttendance] = await Promise.all([
      Attendance.aggregate([{ $match: { employee: { $in: teamIds }, attendanceDate: today, checkInAt: { $ne: null } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Leave.countDocuments({ employee: { $in: teamIds }, status: 'PENDING' }),
      Training.find({ status: { $in: ['OPEN', 'IN_PROGRESS'] }, startsAt: { $gte: now }, $or: [{ audienceDepartments: { $size: 0 } }, { audienceDepartments: { $in: allowedDepartments.length ? allowedDepartments : ['__NO_EMPLOYEE_DEPARTMENT__'] } }] }).sort({ startsAt: 1 }).limit(5).select('title startsAt enrolledCount capacity'),
      TrainingEnrollment.aggregate([{ $match: { employee: { $in: teamIds }, status: { $in: ['ATTENDED', 'COMPLETED'] } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Attendance.findOne({ employee: baseId, attendanceDate: today })
    ]);
    let absentToday = 0;
    if (teamIds.length && isConfiguredBusinessDate(day) && isAfterLocalTime(now)) {
      const checkedInIds = await Attendance.find({ employee: { $in: teamIds }, attendanceDate: today, checkInAt: { $ne: null } }).distinct('employee');
      const checkedIn = new Set(checkedInIds.map(String));
      absentToday = teamIds.filter((id) => !checkedIn.has(String(id))).length;
    }
    const attendanceMap = Object.fromEntries(todayAttendance.map((x) => [x._id, x.count]));
    const presentToday = (attendanceMap.PRESENT || 0) + (attendanceMap.LATE || 0) + (attendanceMap.INCOMPLETE || 0);
    return ok(res, { role: 'MANAGER', todayAttendance: personalAttendance, metrics: { teamSize: teamIds.length, pendingLeaves, presentToday, absentToday, lateToday: attendanceMap.LATE || 0, incompleteAttendance: attendanceMap.INCOMPLETE || 0 }, attendance: attendanceMap, trainingCompletion: Object.fromEntries(enrollments.map((x) => [x._id, x.count])), upcomingTrainings });
  }
  const [todayAttendance, balance, leaves, trainings, announcements, unreadCount] = await Promise.all([
    Attendance.findOne({ employee: employee._id, attendanceDate: today }),
    LeaveBalance.findOne({ employee: employee._id, year: currentYear }),
    Leave.find({ employee: employee._id }).sort({ createdAt: -1 }).limit(5).select('leaveType startDate endDate durationDays status createdAt'),
    Training.find({ status: 'OPEN', startsAt: { $gte: now }, $or: [{ audienceDepartments: { $size: 0 } }, { audienceDepartments: employee.department }] }).sort({ startsAt: 1 }).limit(5).select('title startsAt instructor capacity enrolledCount'),
    Announcement.find({ status: 'PUBLISHED', publishAt: { $lte: now }, $or: [{ audienceRoles: { $size: 0 } }, { audienceRoles: req.user.role }], $and: [{ $or: [{ audienceDepartments: { $size: 0 } }, { audienceDepartments: employee.department }] }, { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }] }).sort({ publishAt: -1 }).limit(5).select('title content publishAt'),
    Notification.countDocuments({ recipient: req.user._id, readAt: null })
  ]);
  const currentBalance = balance ? { annual: balance.annual - balance.usedAnnual, sick: balance.sick - balance.usedSick, personal: balance.personal - balance.usedPersonal } : { annual: Number(process.env.LEAVE_ANNUAL_DAYS || 18), sick: Number(process.env.LEAVE_SICK_DAYS || 10), personal: Number(process.env.LEAVE_PERSONAL_DAYS || 5) };
  ok(res, { role: 'EMPLOYEE', employee: { employeeId: employee.employeeId, fullName: employee.fullName }, todayAttendance, leaveBalance: currentBalance, recentLeaves: leaves, upcomingTrainings: trainings, recentAnnouncements: announcements, unreadCount });
});
