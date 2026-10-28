import { Router } from 'express';
import { param, body } from 'express-validator';
import { authorizeRoles } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import * as employees from '../controllers/employeeController.js';
import * as attendance from '../controllers/attendanceController.js';
import * as leaves from '../controllers/leaveController.js';
import * as announcements from '../controllers/announcementController.js';
import * as trainings from '../controllers/trainingController.js';
import * as notifications from '../controllers/notificationController.js';
import * as analytics from '../controllers/analyticsController.js';
const router = Router();

router.get('/employees/me', employees.myEmployeeProfile);
router.patch('/employees/me', employees.updateMyProfile);
router.get('/employees', authorizeRoles('HR', 'MANAGER'), employees.listValidators, validateRequest, employees.listEmployees);
router.post('/employees', authorizeRoles('HR'), employees.employeeValidators, validateRequest, employees.createEmployee);
router.get('/employees/:id', authorizeRoles('HR', 'MANAGER', 'EMPLOYEE'), param('id').isMongoId(), validateRequest, employees.getEmployee);
router.patch('/employees/:id', authorizeRoles('HR'), param('id').isMongoId(), validateRequest, employees.updateEmployee);
router.delete('/employees/:id', authorizeRoles('HR'), param('id').isMongoId(), validateRequest, employees.deactivateEmployee);

router.post('/attendance/check-in', authorizeRoles('MANAGER', 'EMPLOYEE', 'HR'), attendance.checkIn);
router.post('/attendance/check-out', authorizeRoles('MANAGER', 'EMPLOYEE', 'HR'), attendance.checkOut);
router.get('/attendance', attendance.attendanceDateValidators, validateRequest, attendance.listAttendance);
router.get('/attendance/employee/:employeeId', authorizeRoles('HR', 'MANAGER'), param('employeeId').isMongoId(), validateRequest, attendance.attendanceForEmployee);

router.get('/leaves/balance', leaves.leaveBalances);
router.get('/leaves', leaves.listLeaves);
router.post('/leaves', leaves.leaveValidators, validateRequest, leaves.applyLeave);
router.patch('/leaves/:id/review', authorizeRoles('HR', 'MANAGER'), param('id').isMongoId(), leaves.reviewValidators, validateRequest, leaves.reviewLeave);
router.patch('/leaves/:id/cancel', param('id').isMongoId(), validateRequest, leaves.cancelLeave);

router.get('/announcements', announcements.listAnnouncements);
router.get('/announcements/:id', param('id').isMongoId(), validateRequest, announcements.getAnnouncement);
router.post('/announcements', authorizeRoles('HR'), announcements.announcementValidators, validateRequest, announcements.createAnnouncement);
router.patch('/announcements/:id', authorizeRoles('HR'), param('id').isMongoId(), validateRequest, announcements.updateAnnouncement);
router.delete('/announcements/:id', authorizeRoles('HR'), param('id').isMongoId(), validateRequest, announcements.archiveAnnouncement);

router.get('/trainings', trainings.listTrainings);
router.post('/trainings', authorizeRoles('HR', 'MANAGER'), trainings.trainingValidators, validateRequest, trainings.createTraining);
router.patch('/trainings/:id', authorizeRoles('HR', 'MANAGER'), param('id').isMongoId(), validateRequest, trainings.updateTraining);
router.post('/trainings/:id/enroll', trainings.enrollTraining);
router.get('/trainings/:id/enrollments', authorizeRoles('HR', 'MANAGER'), param('id').isMongoId(), validateRequest, trainings.listTrainingEnrollments);
router.patch('/trainings/:id/enrollments/:employeeId', authorizeRoles('HR', 'MANAGER'), param('id').isMongoId(), param('employeeId').isMongoId(), body('status').isIn(['ATTENDED', 'COMPLETED', 'ENROLLED', 'WITHDRAWN']), validateRequest, trainings.updateEnrollmentStatus);

router.get('/notifications', notifications.listNotifications);
router.patch('/notifications/read-all', notifications.markAllRead);
router.patch('/notifications/:id/read', param('id').isMongoId(), validateRequest, notifications.markRead);
router.get('/analytics', analytics.dashboardAnalytics);

export default router;
