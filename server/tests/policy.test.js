import test from 'node:test';
import assert from 'node:assert/strict';
import { countLeaveDays, hoursBetween, attendanceDateKey } from '../src/config/leavePolicy.js';

test('counts business days excluding Saturday and Sunday', () => {
  assert.equal(countLeaveDays('2026-10-26', '2026-10-30'), 5);
  assert.equal(countLeaveDays('2026-10-24', '2026-10-25'), 0);
});
test('rejects reversed date ranges', () => {
  assert.throws(() => countLeaveDays('2026-10-30', '2026-10-26'), /End date/);
});
test('calculates server attendance duration in hours', () => {
  assert.equal(hoursBetween('2026-10-28T09:00:00Z', '2026-10-28T17:30:00Z'), 8.5);
  assert.throws(() => hoursBetween('2026-10-28T17:30:00Z', '2026-10-28T09:00:00Z'), /Invalid attendance/);
});
test('attendance day follows configured IANA timezone', () => {
  assert.equal(attendanceDateKey(new Date('2026-10-27T20:00:00.000Z'), 'Asia/Kolkata'), '2026-10-28');
});

test('classifies attendance against shift start and grace minutes', async () => {
  const { classifyAttendance } = await import('../src/config/leavePolicy.js');
  assert.equal(classifyAttendance('2026-10-28T03:35:00.000Z'), 'PRESENT'); // 09:05 in Asia/Kolkata
  assert.equal(classifyAttendance('2026-10-28T03:36:00.000Z'), 'LATE'); // 09:06 in Asia/Kolkata
});
test('absence cutoff uses configured local time', async () => {
  const { isAfterLocalTime } = await import('../src/config/leavePolicy.js');
  assert.equal(isAfterLocalTime(new Date('2026-10-28T06:29:00.000Z'), '12:00'), false);
  assert.equal(isAfterLocalTime(new Date('2026-10-28T06:30:00.000Z'), '12:00'), true);
});
test('business date helper excludes weekend days', async () => {
  const { isConfiguredBusinessDate } = await import('../src/config/leavePolicy.js');
  assert.equal(isConfiguredBusinessDate('2026-10-28'), true);
  assert.equal(isConfiguredBusinessDate('2026-10-31'), false);
});
