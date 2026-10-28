const parseCsv = (value) => (value || '').split(',').map((v) => v.trim()).filter(Boolean);
export const weekendDays = new Set(parseCsv(process.env.LEAVE_WEEKEND_DAYS ?? '0,6').map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6));
export const holidayDates = new Set(parseCsv(process.env.LEAVE_HOLIDAYS).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)));
const positiveInt = (value, fallback) => { const n = Number.parseInt(value, 10); return Number.isFinite(n) && n >= 0 ? n : fallback; };
export const leaveEntitlements = {
  annual: positiveInt(process.env.LEAVE_ANNUAL_DAYS, 18),
  sick: positiveInt(process.env.LEAVE_SICK_DAYS, 10),
  personal: positiveInt(process.env.LEAVE_PERSONAL_DAYS, 5),
  unpaid: positiveInt(process.env.LEAVE_UNPAID_DAYS, 999)
};
export const shiftStartTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(process.env.ATTENDANCE_SHIFT_START || '') ? process.env.ATTENDANCE_SHIFT_START : '09:00';
export const absentAfterTime = /^([01]\d|2[0-3]):([0-5]\d)$/.test(process.env.ATTENDANCE_ABSENT_AFTER || '') ? process.env.ATTENDANCE_ABSENT_AFTER : '12:00';
export const lateGraceMinutes = positiveInt(process.env.ATTENDANCE_LATE_GRACE_MINUTES, 5);

export function isoDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date. Use YYYY-MM-DD.');
  return d.toISOString().slice(0, 10);
}
export function countLeaveDays(startValue, endValue) {
  const start = isoDay(startValue);
  const end = isoDay(endValue);
  if (end < start) throw new Error('End date must be on or after start date.');
  let count = 0;
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    const day = cursor.getUTCDay();
    const key = cursor.toISOString().slice(0, 10);
    if (!weekendDays.has(day) && !holidayDates.has(key)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
export function attendanceDateKey(date = new Date(), timeZone = process.env.ATTENDANCE_TIME_ZONE || 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function hoursBetween(start, end) {
  const milliseconds = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error('Invalid attendance timestamps.');
  return Math.round((milliseconds / 3600000) * 100) / 100;
}

export function isConfiguredBusinessDate(dayValue) {
  const key = isoDay(dayValue);
  const weekday = new Date(`${key}T00:00:00.000Z`).getUTCDay();
  return !weekendDays.has(weekday) && !holidayDates.has(key);
}
export function localMinutes(date = new Date(), timeZone = process.env.ATTENDANCE_TIME_ZONE || 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Number(parts.find((p) => p.type === 'hour')?.value || 0) * 60 + Number(parts.find((p) => p.type === 'minute')?.value || 0);
}
export function isAfterLocalTime(date, time = absentAfterTime) {
  const [hours, minutes] = time.split(':').map(Number);
  return localMinutes(date) >= hours * 60 + minutes;
}
export function classifyAttendance(checkInAt) {
  const [hours, minutes] = shiftStartTime.split(':').map(Number);
  return localMinutes(new Date(checkInAt)) > hours * 60 + minutes + lateGraceMinutes ? 'LATE' : 'PRESENT';
}
