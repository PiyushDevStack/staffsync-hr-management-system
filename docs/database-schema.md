# StaffSync Database Schema

All Mongoose schemas use timestamps. ObjectId references are used for cross-collection relationships; the seed script creates synthetic data only.

| Collection | Key fields and relationships | Main indexes / rules |
|---|---|---|
| `users` | name, normalized unique email, passwordHash (excluded from selection), role, accountStatus, optional employee ref, lastLoginAt | unique email; role + accountStatus |
| `employees` | employeeId, optional unique user ref, fullName, department, designation, dateOfJoining, reportingManager ref, employmentStatus, phone/address/emergency contact, annualCompensation (excluded by default) | unique employeeId; sparse unique user; department/status; name; manager |
| `attendances` | employee ref, attendanceDate, checkInAt, checkOutAt, server-calculated durationHours, status, notes | unique employee + attendanceDate; date/status |
| `leaves` | employee ref, leaveType, startDate/endDate, durationDays, reason, status, reviewer User ref, decisionAt, rejectionReason | employee/status/startDate; status/date range |
| `leavebalances` | employee ref, year, annual/sick/personal/unpaid entitlements and used counts | unique employee + year |
| `announcements` | title/content, author User ref, audienceRoles, audienceDepartments, publishAt/expiresAt, status | status/publishAt |
| `trainings` | title/description, instructor, startsAt/endsAt, capacity/enrolledCount, audienceDepartments, createdBy User ref, status | startsAt/status |
| `trainingenrollments` | training ref, employee ref, enrolledAt, status, completedAt | unique training + employee; employee/status |
| `notifications` | recipient User ref, type, title/message, optional resourceType/resourceId, readAt | recipient/readAt/createdAt |
| `auditlogs` | actor User ref, action, resourceType/resourceId, metadata, request IP | actor/createdAt |

## Relationship summary
- User 1 ↔ 0..1 Employee profile; `User.employee` points to the Employee record and `Employee.user` points back to the account.
- Employee 1 → many Attendance, Leave, LeaveBalance (yearly), and TrainingEnrollment records.
- Employee manager relationships use `Employee.reportingManager` self-reference.
- Leave reviewer and announcement/training author references point to User.
- Training has many TrainingEnrollment records; the unique compound key prevents duplicate enrollment.
- User has many Notifications; AuditLogs record security-sensitive administrative changes.

## Data protection
- Password hashes use bcrypt and are selected only for login/password change workflows.
- Compensation is marked `select: false` and excluded from ordinary employee endpoints.
- HR emergency/contact values are not exposed as a separate unrestricted API; profile endpoints enforce own-record access or HR management routes.
- Deactivation archives employment access by marking the employee inactive and deactivating the associated login. No hard delete is used for employee deactivation.
- Do not store real employee data in the public demo environment; protect database backups and logs.

## Integrity considerations
Unique indexes are authoritative duplicate guards and duplicate-key errors map to HTTP 409. Attendance uses one record per employee/attendance day, with the configured timezone day converted to a UTC date key. Leave business-day duration uses configured weekend weekdays and holidays. Approval updates are conditionally guarded; on a replica set, a MongoDB transaction should be used for stronger multi-document guarantees.
