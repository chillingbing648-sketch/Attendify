const test = require('node:test');
const assert = require('node:assert/strict');

const qrBackend = require('../qr-backend.js');
const studentBackend = require('../student-backend.js');

test('Student Portal - Valid login with Roll #1 and default PIN succeeds with secure bearer token', () => {
  studentBackend._resetStore();
  const res = studentBackend.login(1, '1001');
  assert.equal(res.success, true);
  assert.ok(typeof res.token === 'string' && res.token.startsWith('stu_tok_'));
  assert.equal(res.student.rollNumber, 1);
  assert.equal(res.student.name, 'Andre Harshad Balu');
});

test('Student Portal - Login fails with invalid PIN or un-enrolled roll number', () => {
  studentBackend._resetStore();
  // Wrong PIN
  const wrongPin = studentBackend.login(1, '9999');
  assert.equal(wrongPin.success, false);
  assert.equal(wrongPin.error, 'INVALID_PIN');

  // Roll out of bounds (> 60)
  const outOfBounds = studentBackend.login(61, '1061');
  assert.equal(outOfBounds.success, false);
  assert.equal(outOfBounds.error, 'INVALID_ROLL');

  // Roll < 1
  const zeroRoll = studentBackend.login(0, '1000');
  assert.equal(zeroRoll.success, false);
});

test('Student Portal - Requests without valid Bearer token are rejected', () => {
  studentBackend._resetStore();
  const mockReqNoAuth = { headers: {} };
  assert.equal(studentBackend.verifyAuth(mockReqNoAuth), null);

  const mockReqBadAuth = { headers: { authorization: 'Bearer invalid_garbage_token' } };
  assert.equal(studentBackend.verifyAuth(mockReqBadAuth), null);
});

test('Student Portal - Student sees active classes authorized by faculty', () => {
  qrBackend._resetStore();
  studentBackend._resetStore();

  const loginRes = studentBackend.login(1, '1001');
  const student = { studentId: loginRes.student.id, rollNumber: 1, name: loginRes.student.name };

  // 1. Before faculty starts session -> classes is empty
  let classesRes = studentBackend.getAvailableClasses(student);
  assert.equal(classesRes.success, true);
  assert.equal(classesRes.classes.length, 0);

  // 2. Faculty starts session
  const sessRes = qrBackend.startSession({
    subjectId: 'subj_1',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  });

  classesRes = studentBackend.getAvailableClasses(student);
  assert.equal(classesRes.success, true);
  assert.equal(classesRes.classes.length, 1);
  assert.equal(classesRes.classes[0].sessionId, sessRes.session.id);
  assert.equal(classesRes.classes[0].hasSubmitted, false);
});

test('Student Portal - CRITICAL: Attendance totals & records are strictly hidden before submission', () => {
  qrBackend._resetStore();
  studentBackend._resetStore();

  const loginRes = studentBackend.login(1, '1001');
  const student = { studentId: loginRes.student.id, rollNumber: 1, name: loginRes.student.name };

  // Faculty starts active session
  qrBackend.startSession({
    subjectId: 'subj_1',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  });

  // Student checks attendance summary BEFORE submitting attendance
  const summaryRes = studentBackend.getAttendanceSummary(student);
  assert.equal(summaryRes.success, true);
  assert.equal(summaryRes.visibilityGranted, false);
  assert.equal(summaryRes.lockReason, 'SUBMISSION_REQUIRED_FOR_ACTIVE_CLASS');
  // Confirm NO totals or records exist in the response
  assert.equal(summaryRes.stats, undefined);
  assert.equal(summaryRes.percentage, undefined);
  assert.equal(summaryRes.records, undefined);
  assert.equal(summaryRes.subjectBreakdown, undefined);
});

test('Student Portal - Submission rejected if QR token is invalid or expired', () => {
  qrBackend._resetStore();
  studentBackend._resetStore();

  const loginRes = studentBackend.login(1, '1001');
  const student = { studentId: loginRes.student.id, rollNumber: 1, name: loginRes.student.name };

  const sessRes = qrBackend.startSession({
    subjectId: 'subj_1',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  });

  // Submitting with bogus token
  const submitRes = studentBackend.submitAttendance(student, {
    sessionId: sessRes.session.id,
    token: 'bogus_fake_token_123'
  });

  assert.equal(submitRes.success, false);
  assert.ok(submitRes.error.includes('TOKEN') || submitRes.error.includes('INVALID'));

  // Totals must REMAIN hidden!
  const summaryRes = studentBackend.getAttendanceSummary(student);
  assert.equal(summaryRes.visibilityGranted, false);
});

test('Student Portal - Valid submission succeeds, marks student present, and records on server', () => {
  qrBackend._resetStore();
  studentBackend._resetStore();

  const loginRes = studentBackend.login(1, '1001');
  const student = { studentId: loginRes.student.id, rollNumber: 1, name: loginRes.student.name };

  const sessRes = qrBackend.startSession({
    subjectId: 'subj_1',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  });

  const validToken = sessRes.session.token;

  const submitRes = studentBackend.submitAttendance(student, {
    sessionId: sessRes.session.id,
    token: validToken
  });

  assert.equal(submitRes.success, true);
  assert.equal(submitRes.submissionConfirmed, true);
  assert.ok(submitRes.checkedInAt);

  // Faculty session now includes this student
  const facultySession = qrBackend.getSession(sessRes.session.id);
  assert.ok(facultySession.checkedInStudents.has(student.studentId));
  assert.equal(facultySession.checkedInStudents.get(student.studentId).status, 'present');
});

test('Student Portal - Duplicate attendance submission for the same session is strictly blocked', () => {
  qrBackend._resetStore();
  studentBackend._resetStore();

  const loginRes = studentBackend.login(1, '1001');
  const student = { studentId: loginRes.student.id, rollNumber: 1, name: loginRes.student.name };

  const sessRes = qrBackend.startSession({
    subjectId: 'subj_1',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  });

  const token = sessRes.session.token;

  // First submission succeeds
  const first = studentBackend.submitAttendance(student, {
    sessionId: sessRes.session.id,
    token: token
  });
  assert.equal(first.success, true);

  // Second submission must be rejected
  const second = studentBackend.submitAttendance(student, {
    sessionId: sessRes.session.id,
    token: token
  });
  assert.equal(second.success, false);
  assert.equal(second.error, 'ALREADY_SUBMITTED');
});

test('Student Portal - CRITICAL: Attendance totals become visible ONLY after server-confirmed submission', () => {
  qrBackend._resetStore();
  studentBackend._resetStore();

  const loginRes = studentBackend.login(1, '1001');
  const student = { studentId: loginRes.student.id, rollNumber: 1, name: loginRes.student.name };

  const sessRes = qrBackend.startSession({
    subjectId: 'subj_1',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  });

  // 1. Before submit: Locked
  let summary = studentBackend.getAttendanceSummary(student);
  assert.equal(summary.visibilityGranted, false);
  assert.equal(summary.stats, undefined);

  // 2. Submit attendance
  const submitRes = studentBackend.submitAttendance(student, {
    sessionId: sessRes.session.id,
    token: sessRes.session.token
  });
  assert.equal(submitRes.success, true);

  // 3. After submit: UNLOCKED!
  summary = studentBackend.getAttendanceSummary(student);
  assert.equal(summary.visibilityGranted, true);
  assert.ok(summary.stats !== undefined);
  assert.ok(typeof summary.stats.percentage === 'number');
  assert.ok(summary.stats.totalSessions > 0);
  assert.ok(Array.isArray(summary.subjectBreakdown));
  assert.ok(Array.isArray(summary.records));
  assert.equal(summary.student.rollNumber, 1);
});

test('Student Portal - Privacy: Student can only access their own records and not other students', () => {
  qrBackend._resetStore();
  studentBackend._resetStore();

  // Student 1 logs in
  const login1 = studentBackend.login(1, '1001');
  const student1 = { studentId: login1.student.id, rollNumber: 1, name: login1.student.name };

  // Student 2 logs in
  const login2 = studentBackend.login(2, '1002');
  const student2 = { studentId: login2.student.id, rollNumber: 2, name: login2.student.name };

  const sessRes = qrBackend.startSession({
    subjectId: 'subj_1',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  });

  // Only Student 1 submits
  studentBackend.submitAttendance(student1, {
    sessionId: sessRes.session.id,
    token: sessRes.session.token
  });

  // Student 1 summary shows Student 1 data
  const sum1 = studentBackend.getAttendanceSummary(student1);
  assert.equal(sum1.visibilityGranted, true);
  assert.equal(sum1.student.rollNumber, 1);
  assert.equal(sum1.student.name, 'Andre Harshad Balu');

  // Student 2 summary is LOCKED (Student 2 has not submitted)
  const sum2 = studentBackend.getAttendanceSummary(student2);
  assert.equal(sum2.visibilityGranted, false);
  assert.equal(sum2.student.rollNumber, 2);
  assert.equal(sum2.student.name, 'Ansari Farman Lukman');
});
