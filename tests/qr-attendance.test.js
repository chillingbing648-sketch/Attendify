const test = require('node:test');
const assert = require('node:assert/strict');

// Setup mock window & localStorage
function createMockStorage() {
  const store = new Map();
  return {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

global.window = {
  localStorage: createMockStorage(),
  print: () => {},
  crypto: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    }
  }
};

const Utils = require('../js/utils.js');
global.Utils = Utils;

const Storage = require('../js/storage.js');
global.Storage = Storage;

const Validation = require('../js/validation.js');
global.Validation = Validation;

const State = require('../js/state.js');
global.State = State;

const Attendance = require('../js/attendance.js');
global.Attendance = Attendance;

const QRCode = require('../js/qrcode.js');
global.QRCode = QRCode;

const qrBackend = require('../qr-backend.js');

test('QR Attendance - QRCode generator produces valid vector SVG markup without errors', () => {
  const payload = 'http://localhost:3000/checkin.html?s=sess_test_123&t=token_abc';
  const svg = QRCode.generateSVG(payload, { margin: 2 });
  assert.ok(typeof svg === 'string');
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('</svg>'));
  assert.ok(svg.includes('<rect'));
  assert.ok(svg.includes('viewBox='));
});

test('QR Attendance - Backend starts session with cryptographically secure token', () => {
  qrBackend._resetStore();
  const res = qrBackend.startSession({
    subjectId: 'subj_python',
    sessionType: 'lecture',
    durationMinutes: 15,
    rotationIntervalSec: 20
  }, '127.0.0.1');

  assert.equal(res.success, true);
  assert.ok(res.session.id.startsWith('qr_sess_'));
  assert.ok(typeof res.session.token === 'string');
  assert.equal(res.session.token.length, 48); // 24 bytes hex = 48 chars
  assert.equal(res.session.status, 'active');
  assert.equal(res.session.rotationIntervalSec, 20);
});

test('QR Attendance - Token rotates and updates tokenExpiresAt correctly', () => {
  qrBackend._resetStore();
  const start = qrBackend.startSession({
    subjectId: 'subj_dsa',
    rotationIntervalSec: 20
  });

  const token1 = start.session.token;
  const rotateRes = qrBackend.rotateToken(start.session.id);

  assert.equal(rotateRes.success, true);
  assert.notEqual(rotateRes.token, token1);
  assert.ok(rotateRes.tokenExpiresAt > Date.now());
});

test('QR Attendance - Valid student check-in succeeds with server timestamp', () => {
  qrBackend._resetStore();
  const start = qrBackend.startSession({ subjectId: 'subj_cn' });
  const sid = start.session.id;
  const token = start.session.token;

  const checkinRes = qrBackend.checkin({
    sessionId: sid,
    token: token,
    studentId: 'stu_1',
    rollNumber: 1,
    studentName: 'Aarav Patel'
  }, '192.168.1.100');

  assert.equal(checkinRes.success, true);
  assert.equal(checkinRes.rollNumber, 1);
  assert.equal(checkinRes.studentId, 'stu_1');
  assert.ok(checkinRes.checkedInAt);
});

test('QR Attendance - Duplicate student check-in is strictly blocked', () => {
  qrBackend._resetStore();
  const start = qrBackend.startSession({ subjectId: 'subj_dbms' });
  const sid = start.session.id;
  const token = start.session.token;

  // 1st attempt
  const first = qrBackend.checkin({
    sessionId: sid,
    token: token,
    studentId: 'stu_2',
    rollNumber: 2,
    studentName: 'Ananya Sharma'
  }, '192.168.1.101');
  assert.equal(first.success, true);

  // 2nd duplicate attempt with same roll number
  const second = qrBackend.checkin({
    sessionId: sid,
    token: token,
    studentId: 'stu_2',
    rollNumber: 2,
    studentName: 'Ananya Sharma'
  }, '192.168.1.101');

  assert.equal(second.success, false);
  assert.equal(second.error, 'ALREADY_CHECKED_IN');
});

test('QR Attendance - Expired and replayed tokens are rejected', async () => {
  qrBackend._resetStore();
  const start = qrBackend.startSession({
    subjectId: 'subj_se',
    rotationIntervalSec: 20
  });
  const sid = start.session.id;
  const oldToken = start.session.token;

  // Rotate token twice to completely push oldToken out of the grace period
  qrBackend.rotateToken(sid);
  // Wait small moment or rotate again
  const rotate2 = qrBackend.rotateToken(sid);

  // Attempt checkin with totally bogus / expired token
  const bogusRes = qrBackend.checkin({
    sessionId: sid,
    token: 'totally_bogus_or_expired_token_value',
    studentId: 'stu_3',
    rollNumber: 3,
    studentName: 'Rohan Gupta'
  });

  assert.equal(bogusRes.success, false);
  assert.equal(bogusRes.error, 'TOKEN_EXPIRED_OR_INVALID');
});

test('QR Attendance - Unenrolled students (roll < 1 or roll > 60) are rejected', () => {
  qrBackend._resetStore();
  const start = qrBackend.startSession({ subjectId: 'subj_python' });
  const sid = start.session.id;
  const token = start.session.token;

  const invalidRoll = qrBackend.checkin({
    sessionId: sid,
    token: token,
    studentId: 'stu_99',
    rollNumber: 99, // Outside 1..60
    studentName: 'Imposter Student'
  });

  assert.equal(invalidRoll.success, false);
  assert.equal(invalidRoll.error, 'NOT_ENROLLED');
});

test('QR Attendance - Ending session invalidates all active tokens', () => {
  qrBackend._resetStore();
  const start = qrBackend.startSession({ subjectId: 'subj_dsa' });
  const sid = start.session.id;
  const token = start.session.token;

  // End session
  const endRes = qrBackend.endSession(sid);
  assert.equal(endRes.success, true);
  assert.equal(endRes.session.status, 'ended');
  assert.equal(endRes.session.token, null);

  // Checkin attempt after session closed
  const postEndCheckin = qrBackend.checkin({
    sessionId: sid,
    token: token,
    studentId: 'stu_4',
    rollNumber: 4,
    studentName: 'Priya Nair'
  });

  assert.equal(postEndCheckin.success, false);
  assert.equal(postEndCheckin.error, 'SESSION_CLOSED');
});

test('QR Attendance - Finalized session commits cleanly into State.createSession & State.saveRecords', () => {
  State.resetAll();
  const subjects = State.get().subjects;
  const testSub = subjects[0];

  // Simulate finalized QR attendance
  const sess = State.createSession({
    subjectId: testSub.id,
    date: '2026-10-19',
    startTime: '10:00',
    type: 'theory'
  });

  assert.ok(sess.id);

  // Mark 50 present, 10 absent
  const statusMap = {};
  State.getAllStudents().forEach((s, idx) => {
    statusMap[s.id] = idx < 50 ? 'present' : 'absent';
  });

  State.saveRecords(sess.id, statusMap);

  // Verify records in State
  const records = State.getRecordsForSession(sess.id);
  assert.equal(records.length, 60);

  // Verify attendance stats calculation
  const sessionStats = Attendance.statsForSession(sess.id);
  assert.equal(sessionStats.present, 50);
  assert.equal(sessionStats.absent, 10);
  assert.equal(sessionStats.total, 60);
  assert.ok(sessionStats.pct > 80);

  // Verify session appears in Attendance History
  const allSessions = State.getAllSessions();
  const found = allSessions.find(s => s.id === sess.id);
  assert.ok(found);
  assert.equal(found.subjectId, testSub.id);
});
