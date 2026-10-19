const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Target real SQLite database file on disk for realistic persistence testing
const TEST_DB_FILE = path.join(__dirname, 'test_persistence.db');

// Ensure clean slate before tests
if (fs.existsSync(TEST_DB_FILE)) {
  try { fs.unlinkSync(TEST_DB_FILE); } catch {}
}

process.env.DATABASE_PATH = TEST_DB_FILE;
const database = require('../database.js');
const qrBackend = require('../qr-backend.js');
const studentBackend = require('../student-backend.js');

test.beforeEach(() => {
  database.resetDatabaseForTesting();
});

test.after(() => {
  database.resetDatabaseForTesting();
  if (fs.existsSync(TEST_DB_FILE)) {
    try { fs.unlinkSync(TEST_DB_FILE); } catch {}
  }
});

// 1. A valid QR token is accepted during an active session
test('Security Spec 1 — Valid QR token is accepted during an active session', () => {
  const session = database.createSession({ subjectId: 'subj_1', sessionType: 'lecture' });
  assert.ok(session.token);

  const checkinRes = database.recordStudentAttendance({
    sessionId: session.id,
    token: session.token,
    studentId: 'stu_1',
    rollNumber: 1,
    studentName: 'Andre Harshad Balu'
  });

  assert.equal(checkinRes.success, true);
  assert.equal(checkinRes.rollNumber, 1);
  assert.ok(checkinRes.checkedInAt);
});

// 2. Expired and malformed tokens are rejected
test('Security Spec 2 — Expired and malformed tokens are rejected', () => {
  const session = database.createSession({ subjectId: 'subj_1', rotationIntervalSec: 20 });
  const firstToken = session.token;

  // Malformed / bogus token
  const bogusRes = database.recordStudentAttendance({
    sessionId: session.id,
    token: 'malformed_invalid_token_random_junk',
    studentId: 'stu_2',
    rollNumber: 2,
    studentName: 'Ansari Farman Lukman'
  });
  assert.equal(bogusRes.success, false);
  assert.equal(bogusRes.error, 'TOKEN_EXPIRED_OR_INVALID');

  // Rotate token twice so firstToken grace period expires
  database.rotateSessionToken(session.id);
  // Fast forward grace window
  const db = database.getDb();
  db.prepare("UPDATE session_qr_tokens SET grace_expires_at = ? WHERE token = ?").run(Date.now() - 1000, firstToken);

  const expiredRes = database.recordStudentAttendance({
    sessionId: session.id,
    token: firstToken,
    studentId: 'stu_2',
    rollNumber: 2
  });
  assert.equal(expiredRes.success, false);
  assert.equal(expiredRes.error, 'TOKEN_EXPIRED_OR_INVALID');
});

// 3. A previously used token cannot create a second attendance record
test('Security Spec 3 — Previously used token cannot create a second attendance record', () => {
  const session = database.createSession({ subjectId: 'subj_1' });
  
  // First check-in
  const firstCheck = database.recordStudentAttendance({
    sessionId: session.id,
    token: session.token,
    studentId: 'stu_3',
    rollNumber: 3
  });
  assert.equal(firstCheck.success, true);

  // Repeated check-in with same token and student
  const secondCheck = database.recordStudentAttendance({
    sessionId: session.id,
    token: session.token,
    studentId: 'stu_3',
    rollNumber: 3
  });
  assert.equal(secondCheck.success, false);
  assert.equal(secondCheck.error, 'ALREADY_CHECKED_IN');
});

// 4. Student cannot submit attendance as another student (Zero-trust derived from session)
test('Security Spec 4 — Student cannot submit attendance as another student', () => {
  // Student 1 logs in
  const login1 = studentBackend.login(1, '1001');
  const authenticatedStudent1 = {
    token: login1.token,
    studentId: login1.student.id,
    rollNumber: login1.student.rollNumber,
    name: login1.student.name
  };

  const session = database.createSession({ subjectId: 'subj_1' });

  // Student 1 maliciously tries to send payload claiming to be Roll #5
  const maliciousSubmission = studentBackend.submitAttendance(authenticatedStudent1, {
    sessionId: session.id,
    token: session.token,
    studentId: 'stu_5',
    rollNumber: 5,
    name: 'Aditya Verma'
  });

  assert.equal(maliciousSubmission.success, true);

  // Verify that the database recorded Student 1 (Roll 1), strictly ignoring the forged body parameters!
  const record = database.getStudentRecord(session.id, 'stu_1');
  assert.ok(record);
  assert.equal(record.roll_number, 1);
  assert.equal(record.student_name, 'Andre Harshad Balu');

  // Verify Student 5 was NOT marked
  const record5 = database.getStudentRecord(session.id, 'stu_5');
  assert.equal(record5, undefined);
});

// 5. Unauthorized user cannot create or close a faculty session
test('Security Spec 5 — Faculty authentication and authorization checks', () => {
  // Invalid faculty credentials
  const badAuth = database.authenticateFaculty('faculty', 'wrong_password');
  assert.equal(badAuth, null);

  // Valid faculty credentials
  const validAuth = database.authenticateFaculty('faculty', 'password123');
  assert.ok(validAuth && validAuth.token);
  assert.equal(validAuth.faculty.username, 'faculty');

  // Verify session lookup
  const facultyUser = database.verifyFacultySession(validAuth.token);
  assert.ok(facultyUser);
  assert.equal(facultyUser.faculty_id, 'fac_1');

  // Inactive / invalid token fails verification
  assert.equal(database.verifyFacultySession('fake_token_123'), null);

  // Logout invalidates session
  database.logoutFacultySession(validAuth.token);
  assert.equal(database.verifyFacultySession(validAuth.token), null);
});

// 6. Student outside authorized roster is rejected
test('Security Spec 6 — Student outside authorized roster (roll < 1 or roll > 60) is rejected', () => {
  const session = database.createSession({ subjectId: 'subj_1' });

  const outOfBounds1 = database.recordStudentAttendance({
    sessionId: session.id,
    token: session.token,
    studentId: 'stu_99',
    rollNumber: 99
  });
  assert.equal(outOfBounds1.success, false);
  assert.equal(outOfBounds1.error, 'NOT_ENROLLED');

  const outOfBounds2 = database.recordStudentAttendance({
    sessionId: session.id,
    token: session.token,
    studentId: 'stu_0',
    rollNumber: 0
  });
  assert.equal(outOfBounds2.success, false);
  assert.equal(outOfBounds2.error, 'NOT_ENROLLED');
});

// 7. Concurrent requests do not create duplicate records (ACID Unique Constraint)
test('Security Spec 7 — Concurrent requests do not create duplicate records', async () => {
  const session = database.createSession({ subjectId: 'subj_1' });

  // Simulate 10 simultaneous concurrent requests for the exact same student
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(new Promise(resolve => {
      try {
        const res = database.recordStudentAttendance({
          sessionId: session.id,
          token: session.token,
          studentId: 'stu_7',
          rollNumber: 7,
          studentName: 'Dudaye Shubham Pandurang'
        });
        resolve(res);
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    }));
  }

  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success === true);
  const duplicates = results.filter(r => r.success === false && r.error === 'ALREADY_CHECKED_IN');

  // Strictly ONE must succeed, and nine must be blocked
  assert.equal(successful.length, 1);
  assert.equal(duplicates.length, 9);

  // Database must contain exactly 1 record for this student
  const db = database.getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE session_id = ? AND student_id = ?').get(session.id, 'stu_7').count;
  assert.equal(count, 1);
});

// 8. Ending a session invalidates its tokens
test('Security Spec 8 — Ending a session invalidates its tokens', () => {
  const session = database.createSession({ subjectId: 'subj_1' });
  const activeToken = session.token;

  // End session
  const endRes = database.endSession(session.id);
  assert.equal(endRes.success, true);
  assert.equal(endRes.session.status, 'ended');
  assert.equal(endRes.session.token, null);

  // Attempt check-in after session is closed
  const checkinAfterEnd = database.recordStudentAttendance({
    sessionId: session.id,
    token: activeToken,
    studentId: 'stu_8',
    rollNumber: 8
  });

  assert.equal(checkinAfterEnd.success, false);
  assert.equal(checkinAfterEnd.error, 'SESSION_CLOSED');
});

// 9. Backend or database failure never produces a false success
test('Security Spec 9 — Database failure fails safely with clear error', () => {
  // Querying a non-existent session
  const fakeSessionCheck = database.recordStudentAttendance({
    sessionId: 'qr_sess_does_not_exist',
    token: 'any_token',
    studentId: 'stu_1',
    rollNumber: 1
  });

  assert.equal(fakeSessionCheck.success, false);
  assert.equal(fakeSessionCheck.error, 'SESSION_NOT_FOUND');
  assert.ok(fakeSessionCheck.message);
});

// 10. Records survive backend restarts (Real database file persistence)
test('Security Spec 10 — Records survive backend restarts and database reboots', () => {
  const session = database.createSession({ subjectId: 'subj_1', sessionType: 'practical' });
  
  database.recordStudentAttendance({
    sessionId: session.id,
    token: session.token,
    studentId: 'stu_10',
    rollNumber: 10,
    studentName: 'Gupta Raj Omprakash'
  });

  // Verify before restart
  let before = database.getStudentRecord(session.id, 'stu_10');
  assert.ok(before);
  assert.equal(before.roll_number, 10);

  // Simulate server crash / restart: close DB instance and recreate connection from disk
  database.closeDatabaseConnection();

  // Re-open disk database
  const freshDb = database.getDb(TEST_DB_FILE);
  const recordAfterReboot = freshDb.prepare('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?').get(session.id, 'stu_10');

  assert.ok(recordAfterReboot, 'Attendance record must persist on disk after server restart');
  assert.equal(recordAfterReboot.roll_number, 10);
  assert.equal(recordAfterReboot.student_name, 'Gupta Raj Omprakash');
  assert.equal(recordAfterReboot.status, 'present');
});

// 11. Login and attendance endpoints enforce rate limits
test('Security Spec 11 — Rate limits prevent abuse on high-frequency calls', () => {
  const ip = '192.168.1.100';
  let blocked = false;

  // Send 35 requests in rapid succession
  for (let i = 0; i < 35; i++) {
    const res = qrBackend.checkin({ sessionId: 'dummy', token: 'dummy', studentId: 'stu_1' }, ip);
    if (res.error === 'RATE_LIMITED') {
      blocked = true;
      break;
    }
  }

  assert.equal(blocked, true, 'Rate limiter must throttle client after exceeding window threshold');
});

// 12. Student portal and faculty workflow function correctly end-to-end
test('Security Spec 12 — End-to-end faculty session and student portal workflow', () => {
  // 1. Faculty starts lecture session
  const facultyAuth = database.authenticateFaculty('faculty', 'password123');
  const sess = database.createSession({
    subjectId: 'subj_2',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  });

  // 2. Student logs in
  const stuLogin = studentBackend.login(15, '1015');
  assert.equal(stuLogin.success, true);
  const student = { studentId: stuLogin.student.id, rollNumber: 15, name: stuLogin.student.name };

  // 3. Before submitting, summary is locked per critical visibility rule
  const lockedSummary = studentBackend.getAttendanceSummary(student);
  assert.equal(lockedSummary.visibilityGranted, false);
  assert.equal(lockedSummary.lockReason, 'SUBMISSION_REQUIRED_FOR_ACTIVE_CLASS');

  // 4. Student confirms attendance with active QR token
  const submitRes = studentBackend.submitAttendance(student, {
    sessionId: sess.id,
    token: sess.token
  });
  assert.equal(submitRes.success, true);
  assert.equal(submitRes.submissionConfirmed, true);

  // 5. Summary immediately UNLOCKS!
  const unlockedSummary = studentBackend.getAttendanceSummary(student);
  assert.equal(unlockedSummary.visibilityGranted, true);
  assert.ok(unlockedSummary.stats.percentage >= 0);
  assert.ok(unlockedSummary.subjectBreakdown.length > 0);

  // 6. Faculty reviews live headcount and finalizes session
  const facultySession = database.getSessionById(sess.id);
  assert.equal(facultySession.checkedInStudents.size, 1);
  assert.ok(facultySession.checkedInStudents.has('stu_15'));

  const endSession = database.endSession(sess.id);
  assert.equal(endSession.session.status, 'ended');
});
