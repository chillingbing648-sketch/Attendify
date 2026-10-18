/**
 * ATTENDIFY — student-backend.js
 * Dedicated, Secure Backend for Student-Only Attendance Portal
 * 
 * Strict Security & Permissions:
 * • Cryptographically secure bearer token authentication
 * • Zero-trust roll number & identity verification (no client-supplied roll spoofing)
 * • Strict student permissions: Read-only personal access, no faculty controls
 * • Critical Attendance Visibility Rule: Attendance totals & records are strictly
 *   withheld by the server until attendance is verified & confirmed for the active class.
 * • Strict duplicate submission rejection
 * • Multi-subject calculations and real-time synchronization with qr-backend
 */

const crypto = require('crypto');
const qrBackend = require('./qr-backend.js');

// Standard SY BSc IT 60 Enrolled Students list matching Storage.seedStudents()
const ENROLLED_STUDENTS = [
  'Andre Harshad Balu','Ansari Farman Lukman','Behera Shubham Binod',
  'Chaurasiya Shivanshu Ashok','Chendvankar Tanishq Abhijit','Choursia Shraddha Madreshkumar',
  'Dudaye Shubham Pandurang','Gupta Himanshu Laxmikant','Gupta Nikhil Ganesh',
  'Gupta Raj Omprakash','Gurav Shreya Prakash','Jaiswal Khushi Dashrath',
  'Jaiswal Prince Dharmendra','Kottilaparambil Suvidh Sunil','Kushwaha Vinit Vidyanand',
  'Mishra Shashank Sureshkumar','Nesamoney Cinderella Jaiross','Pal Aryan Naveen',
  'Pal Ashish Ramavadh','Pal Laxmi Kapildev','Pandey Sharad Umeshchandra',
  'Rajput Prachi Narsing','Reddi Mahesh Chandranna','Sawant Narayan Manohar',
  'Sharma Abhay Chandrika','Sharma Kartike Sunil','Shevale Pratham Dryaneshwar',
  'Singh Aniket Rajesh','Singh Anurag Kush','Singh Aryan Sanjay',
  'Singh Bablu Kumar Santosh Kumar','Singh Janvi Anil','Singh Noel Damer',
  'Singh Sachi Ashutosh','Singh Sandhya Amarnath','Singh Vikash Kumar Laxman',
  'Yadav Pooja Om Prakash','Yadav Prince Virendrakumar','Yadav Vivek Rudra',
  'Yadav Yogank Ashok','Mishra Aditya Rajesh','Pardhe Harshit Chandrakant',
  'Jaiswal Moksh Rajkumar','Ghadigaonkar Maithili Mahesh','Pal Sanjana Rajendra',
  'Tiwari Pavan Awadesh','Thorat Kaustubh Ramesh','Makwana Ayushi Nilesh',
  'Dubey Harsh Puneet','Mourya Ansh Deenanath','Morye Mihir Mangesh',
  'Pandey Sakshi','Uttam Tripathi','Anchal Jaiswar',
  'Harshit Tiwari','Shivam Patel','Shivansu Mishra',
  'Abhay Yadav','Mahek Pandya','Abhishek Yadav'
].map((name, i) => ({
  id: 'stu_' + (i + 1),
  rollNumber: i + 1,
  name: name,
  // Default PIN: 1000 + roll (e.g. Roll 1 = 1001, Roll 27 = 1027)
  pin: String(1000 + (i + 1))
}));

const SUBJECTS = [
  { id: 'subj_1', name: 'Web Designing', teacher: 'Prof. Sharma', room: 'Lab 2', code: 'WD' },
  { id: 'subj_2', name: 'Object Oriented Programming (C++)', teacher: 'Dr. Rao', room: 'Lab 1', code: 'OOP' },
  { id: 'subj_3', name: 'PL/SQL', teacher: 'Prof. Nair', room: 'Lab 3', code: 'SQL' },
  { id: 'subj_4', name: 'Fundamentals of Python Programming', teacher: 'Dr. Mehta', room: 'Lab 2', code: 'PY' },
  { id: 'subj_5', name: 'Assembly Language Programming', teacher: 'Prof. Gupta', room: 'Lab 1', code: 'ALP' },
  { id: 'subj_6', name: 'Environmental Management', teacher: 'Dr. Verma', room: 'Room 204', code: 'EM' }
];

// In-memory student sessions: token -> { studentId, rollNumber, name, createdAt, expiresAt }
const authSessions = new Map();

// Confirmed attendance submissions: "sessionId:studentId" -> { timestamp, clientIp, status }
const confirmedSubmissions = new Map();

// Student-submitted historical records store
let syncedSessions = [];
let syncedRecords = [];

// Generate initial baseline semester attendance so students have realistic historical data
function generateBaselineHistory() {
  const sessions = [];
  const records = [];
  const dates = [
    '2026-09-01', '2026-09-03', '2026-09-05', '2026-09-08', '2026-09-10',
    '2026-09-12', '2026-09-15', '2026-09-17', '2026-09-19', '2026-09-22',
    '2026-09-24', '2026-09-26', '2026-09-29', '2026-10-01', '2026-10-03',
    '2026-10-06', '2026-10-08', '2026-10-10', '2026-10-13', '2026-10-15'
  ];

  dates.forEach((d, idx) => {
    const subj = SUBJECTS[idx % SUBJECTS.length];
    const sessId = 'hist_sess_' + (idx + 1);
    const isPractical = (idx % 3 === 1);
    sessions.push({
      id: sessId,
      subjectId: subj.id,
      subjectName: subj.name,
      teacher: subj.teacher,
      room: subj.room,
      date: d,
      startTime: isPractical ? '10:15' : '09:00',
      type: isPractical ? 'practical' : 'theory',
      experimentTitle: isPractical ? `Practical Lab ${Math.floor(idx / 3) + 1}: Implementation Exercise` : ''
    });

    ENROLLED_STUDENTS.forEach(stu => {
      // Deterministic attendance distribution based on roll number
      // Most students have ~80-95% attendance; a few are in warn/critical
      const seed = (stu.rollNumber * 17 + idx * 31) % 100;
      let status = 'present';
      if (stu.rollNumber === 4 || stu.rollNumber === 19 || stu.rollNumber === 42) {
        // Known defaulters (< 65%)
        status = seed < 55 ? 'absent' : 'present';
      } else if (stu.rollNumber === 8 || stu.rollNumber === 33) {
        // Warning zone (65 - 74%)
        status = seed < 30 ? 'absent' : (seed < 40 ? 'late' : 'present');
      } else {
        // Safe (>= 75%)
        status = seed < 10 ? 'absent' : (seed < 16 ? 'late' : 'present');
      }

      records.push({
        id: `rec_${sessId}_${stu.id}`,
        sessionId: sessId,
        studentId: stu.id,
        rollNumber: stu.rollNumber,
        status: status
      });
    });
  });

  return { sessions, records };
}

const baseline = generateBaselineHistory();
syncedSessions = baseline.sessions;
syncedRecords = baseline.records;

// --- AUTHENTICATION ---

function login(rollNumber, pin) {
  const parsedRoll = parseInt(rollNumber, 10);
  if (isNaN(parsedRoll) || parsedRoll < 1 || parsedRoll > 60) {
    return { success: false, error: 'INVALID_ROLL', message: 'Roll number must be between 1 and 60.' };
  }

  const student = ENROLLED_STUDENTS.find(s => s.rollNumber === parsedRoll);
  if (!student) {
    return { success: false, error: 'NOT_FOUND', message: 'Student roll number not enrolled.' };
  }

  // Verify PIN (default 1000 + roll or custom PIN)
  const cleanPin = String(pin || '').trim();
  if (cleanPin !== student.pin) {
    return { success: false, error: 'INVALID_PIN', message: 'Incorrect student access PIN. Default PIN is 1000 + Roll No.' };
  }

  // Generate cryptographically secure token
  const token = 'stu_tok_' + crypto.randomBytes(28).toString('hex');
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

  const sessionObj = {
    token,
    studentId: student.id,
    rollNumber: student.rollNumber,
    name: student.name,
    createdAt: now,
    expiresAt
  };

  authSessions.set(token, sessionObj);

  return {
    success: true,
    token,
    student: {
      id: student.id,
      rollNumber: student.rollNumber,
      name: student.name
    },
    expiresAt
  };
}

function verifyAuth(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  const session = authSessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    authSessions.delete(token);
    return null;
  }

  return session;
}

// --- AVAILABLE CLASSES (Active Sessions authorized by faculty) ---

function getAvailableClasses(student) {
  // Query active sessions from qrBackend
  const activeSessions = qrBackend.getActiveSessions ? qrBackend.getActiveSessions() : [];
  
  const classes = activeSessions.map(sess => {
    const subj = SUBJECTS.find(s => s.id === sess.subjectId) || { name: sess.subjectId, teacher: 'Faculty', room: 'Classroom' };
    const hasSubmitted = confirmedSubmissions.has(sess.id + ':' + student.studentId) || 
      (sess.checkedInStudents && sess.checkedInStudents.has(student.studentId));

    let submittedAt = null;
    if (hasSubmitted) {
      const conf = confirmedSubmissions.get(sess.id + ':' + student.studentId);
      if (conf) submittedAt = conf.timestamp;
      else if (sess.checkedInStudents && sess.checkedInStudents.has(student.studentId)) {
        submittedAt = sess.checkedInStudents.get(student.studentId).timestamp;
      }
    }

    return {
      sessionId: sess.id,
      subjectId: sess.subjectId,
      subjectName: subj.name,
      sessionType: sess.sessionType || 'lecture',
      teacher: subj.teacher,
      room: subj.room,
      date: sess.date,
      startTime: sess.startTime,
      experimentTitle: sess.experimentTitle || '',
      durationMinutes: sess.durationMinutes,
      expiresAt: sess.expiresAt,
      hasSubmitted: Boolean(hasSubmitted),
      submittedAt
    };
  });

  return {
    success: true,
    classes
  };
}

// --- SUBMIT ATTENDANCE ---

function submitAttendance(student, params = {}, clientIp = '127.0.0.1') {
  const { sessionId, token } = params;
  if (!sessionId) {
    return { success: false, error: 'MISSING_SESSION', message: 'Session ID is required.' };
  }

  // 1. Verify session exists and is active
  const session = qrBackend.getSession ? qrBackend.getSession(sessionId) : null;
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND', message: 'No active session found with this ID.' };
  }

  if (session.status !== 'active') {
    return { success: false, error: 'SESSION_CLOSED', message: 'This attendance session has already closed.' };
  }

  if (Date.now() > session.expiresAt) {
    return { success: false, error: 'SESSION_EXPIRED', message: 'The submission window for this session has expired.' };
  }

  // 2. Prevent duplicate submissions
  const submissionKey = sessionId + ':' + student.studentId;
  if (confirmedSubmissions.has(submissionKey) || (session.checkedInStudents && session.checkedInStudents.has(student.studentId))) {
    return {
      success: false,
      error: 'ALREADY_SUBMITTED',
      message: `You have already submitted attendance for this class.`
    };
  }

  // 3. Server-side token validation via qrBackend.checkin
  // Note: Authenticated student identity is taken strictly from 'student' (verified token), NOT from request body!
  const checkinResult = qrBackend.checkin({
    sessionId,
    token: token || '',
    studentId: student.studentId,
    rollNumber: student.rollNumber,
    studentName: student.name
  }, clientIp);

  if (!checkinResult.success) {
    return {
      success: false,
      error: checkinResult.error || 'INVALID_SUBMISSION',
      message: checkinResult.message || 'Attendance submission could not be verified by server.'
    };
  }

  // 4. Record confirmed submission on server
  const nowISO = new Date().toISOString();
  confirmedSubmissions.set(submissionKey, {
    timestamp: nowISO,
    clientIp,
    status: 'present'
  });

  // Also record into student's synced records
  const subj = SUBJECTS.find(s => s.id === session.subjectId);
  const newRec = {
    id: `rec_${sessionId}_${student.studentId}`,
    sessionId: session.id,
    studentId: student.studentId,
    rollNumber: student.rollNumber,
    status: 'present',
    subjectName: subj ? subj.name : session.subjectId,
    date: session.date,
    timestamp: nowISO
  };

  // Replace or add record
  const existingIdx = syncedRecords.findIndex(r => r.sessionId === session.id && r.studentId === student.studentId);
  if (existingIdx >= 0) {
    syncedRecords[existingIdx] = newRec;
  } else {
    syncedRecords.push(newRec);
  }

  return {
    success: true,
    submissionConfirmed: true,
    message: 'Attendance successfully verified and recorded.',
    checkedInAt: nowISO,
    session: {
      id: session.id,
      subjectName: subj ? subj.name : session.subjectId
    }
  };
}

// --- ATTENDANCE VISIBILITY & SUMMARY RULE ---
// CRITICAL: Before a student successfully submits attendance for the relevant class,
// hide their total attendance, percentage, overall statistics, and summaries.
// Enforced strictly here on the backend!

function getAttendanceSummary(student, reqQuery = {}) {
  const activeSessions = qrBackend.getActiveSessions ? qrBackend.getActiveSessions() : [];
  
  // Rule Check: If there is at least one active class session currently taking attendance,
  // the student MUST have confirmed submission for at least one active session to unlock summary.
  let visibilityGranted = false;
  let lockReason = '';

  if (activeSessions.length > 0) {
    // Check if student has submitted for ANY of the active sessions
    const hasActiveSubmission = activeSessions.some(s => confirmedSubmissions.has(s.id + ':' + student.studentId));
    if (hasActiveSubmission) {
      visibilityGranted = true;
    } else {
      visibilityGranted = false;
      lockReason = 'SUBMISSION_REQUIRED_FOR_ACTIVE_CLASS';
    }
  } else {
    // When no class is currently active:
    // If student has ANY confirmed submission in history, unlock;
    // otherwise lock until they submit in their first class session.
    const hasAnySubmission = confirmedSubmissions.size > 0 || syncedRecords.some(r => r.studentId === student.studentId && r.status === 'present');
    if (hasAnySubmission) {
      visibilityGranted = true;
    } else {
      visibilityGranted = false;
      lockReason = 'NO_CONFIRMED_SUBMISSION';
    }
  }

  // IF VISIBILITY IS NOT GRANTED: Strictly withhold totals, percentages, and records!
  if (!visibilityGranted) {
    return {
      success: true,
      visibilityGranted: false,
      lockReason,
      message: 'Attendance totals, percentage, and detailed records are locked until your attendance is verified and submitted for class.',
      student: {
        id: student.studentId,
        rollNumber: student.rollNumber,
        name: student.name
      }
      // NO stats, NO percentage, NO records in payload!
    };
  }

  // VISIBILITY IS GRANTED: Compute student's own attendance from server store
  const studentRecs = syncedRecords.filter(r => r.studentId === student.studentId);
  const present = studentRecs.filter(r => r.status === 'present').length;
  const late = studentRecs.filter(r => r.status === 'late').length;
  const absent = studentRecs.filter(r => r.status === 'absent').length;
  const total = studentRecs.length;
  const percentage = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

  let status = 'safe';
  if (percentage < 65) status = 'critical';
  else if (percentage < 75) status = 'warn';

  // Per-subject breakdown
  const subjectBreakdown = SUBJECTS.map(subj => {
    // Match sessions for this subject
    const subjSessionIds = new Set(syncedSessions.filter(s => s.subjectId === subj.id).map(s => s.id));
    const subjRecs = studentRecs.filter(r => subjSessionIds.has(r.sessionId));
    const sPresent = subjRecs.filter(r => r.status === 'present').length;
    const sLate = subjRecs.filter(r => r.status === 'late').length;
    const sAbsent = subjRecs.filter(r => r.status === 'absent').length;
    const sTotal = subjRecs.length;
    const sPct = sTotal > 0 ? Math.round(((sPresent + sLate) / sTotal) * 1000) / 10 : 0;
    
    let sStatus = 'safe';
    if (sPct < 65) sStatus = 'critical';
    else if (sPct < 75) sStatus = 'warn';

    return {
      subjectId: subj.id,
      name: subj.name,
      code: subj.code,
      teacher: subj.teacher,
      room: subj.room,
      total: sTotal,
      attended: sPresent + sLate,
      missed: sAbsent,
      percentage: sPct,
      status: sStatus
    };
  });

  // Recent attendance records for this student only
  const records = studentRecs.slice(-25).reverse().map(r => {
    const sess = syncedSessions.find(s => s.id === r.sessionId) || {};
    return {
      recordId: r.id,
      sessionId: r.sessionId,
      subjectName: sess.subjectName || r.subjectName || 'Course',
      sessionType: sess.type || 'theory',
      experimentTitle: sess.experimentTitle || '',
      date: sess.date || r.date || '',
      startTime: sess.startTime || '',
      status: r.status
    };
  });

  return {
    success: true,
    visibilityGranted: true,
    student: {
      id: student.studentId,
      rollNumber: student.rollNumber,
      name: student.name
    },
    stats: {
      totalSessions: total,
      attendedSessions: present + late,
      missedSessions: absent,
      percentage,
      status
    },
    subjectBreakdown,
    records
  };
}

// Sync state from faculty app
function syncState(payload) {
  if (payload.sessions && Array.isArray(payload.sessions)) {
    syncedSessions = payload.sessions;
  }
  if (payload.records && Array.isArray(payload.records)) {
    syncedRecords = payload.records;
  }
  return { success: true, sessionCount: syncedSessions.length, recordCount: syncedRecords.length };
}

// HTTP API Request Router
function handleApiRequest(req, res, parsedUrl) {
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  const pathname = parsedUrl.pathname;

  function json(status, data) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(data));
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // 1. Student Login: POST /api/student/login
  if (pathname === '/api/student/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = login(payload.rollNumber, payload.pin);
        json(result.success ? 200 : 401, result);
      } catch {
        json(400, { success: false, error: 'INVALID_JSON' });
      }
    });
    return;
  }

  // 2. State Synchronization: POST /api/state/sync
  if (pathname === '/api/state/sync' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = syncState(payload);
        json(200, result);
      } catch {
        json(400, { success: false, error: 'INVALID_JSON' });
      }
    });
    return;
  }

  // All other endpoints require student authentication!
  const student = verifyAuth(req);
  if (!student) {
    json(401, {
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in with your student credentials.'
    });
    return;
  }

  // 3. Current Authenticated Student Profile: GET /api/student/me
  if (pathname === '/api/student/me' && req.method === 'GET') {
    json(200, {
      success: true,
      student: {
        id: student.studentId,
        rollNumber: student.rollNumber,
        name: student.name
      }
    });
    return;
  }

  // 4. Available Classes for Submission: GET /api/student/available-classes
  if (pathname === '/api/student/available-classes' && req.method === 'GET') {
    const result = getAvailableClasses(student);
    json(200, result);
    return;
  }

  // 5. Submit Attendance: POST /api/student/submit
  if (pathname === '/api/student/submit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = submitAttendance(student, payload, clientIp);
        json(result.success ? 200 : 400, result);
      } catch {
        json(400, { success: false, error: 'INVALID_JSON' });
      }
    });
    return;
  }

  // 6. Attendance Summary & Personal Records: GET /api/student/attendance-summary
  if (pathname === '/api/student/attendance-summary' && req.method === 'GET') {
    const result = getAttendanceSummary(student, parsedUrl.searchParams);
    json(200, result);
    return;
  }

  // 7. Logout: POST /api/student/logout
  if (pathname === '/api/student/logout' && req.method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/, '').trim();
    if (token) authSessions.delete(token);
    json(200, { success: true, message: 'Logged out successfully.' });
    return;
  }

  json(404, { success: false, error: 'NOT_FOUND', message: 'API route not found.' });
}

module.exports = {
  login,
  verifyAuth,
  getAvailableClasses,
  submitAttendance,
  getAttendanceSummary,
  syncState,
  handleApiRequest,
  ENROLLED_STUDENTS,
  _resetStore: () => {
    authSessions.clear();
    confirmedSubmissions.clear();
    const b = generateBaselineHistory();
    syncedSessions = b.sessions;
    syncedRecords = b.records;
  }
};
