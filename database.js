/**
 * ATTENDIFY — database.js
 * Persistent Relational Storage Engine for Attendify Production
 * 
 * Powered by Node.js 22/24 native `node:sqlite` DatabaseSync with zero external dependencies.
 * Features:
 * • Persistent disk storage (`attendify.db`) with `:memory:` support for test isolation
 * • Foreign key enforcement and strict type validation
 * • Database-level uniqueness constraints (preventing race condition duplicates)
 * • Cryptographically salted PBKDF2 hash verification for faculty & students
 * • Atomic transactions (`BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`)
 * • Audit event ledger persistence
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DATABASE_PATH || 
  (process.env.NODE_ENV === 'test' ? ':memory:' : path.join(__dirname, 'attendify.db'));

let dbInstance = null;

// Standard cohort of 60 SY BSc IT Students
const ENROLLED_STUDENT_NAMES = [
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
];

const CURRICULUM_SUBJECTS = [
  { id: 'subj_1', code: 'WD', name: 'Web Designing', teacher: 'Prof. Sharma', room: 'Lab 2' },
  { id: 'subj_2', code: 'OOP', name: 'Object Oriented Programming (C++)', teacher: 'Dr. Rao', room: 'Lab 1' },
  { id: 'subj_3', code: 'SQL', name: 'PL/SQL', teacher: 'Prof. Nair', room: 'Lab 3' },
  { id: 'subj_4', code: 'PY', name: 'Fundamentals of Python Programming', teacher: 'Dr. Mehta', room: 'Lab 2' },
  { id: 'subj_5', code: 'ALP', name: 'Assembly Language Programming', teacher: 'Prof. Gupta', room: 'Lab 1' },
  { id: 'subj_6', code: 'EM', name: 'Environmental Management', teacher: 'Dr. Verma', room: 'Room 204' }
];

const DEFAULT_FACULTY = [
  { id: 'fac_1', username: 'faculty', name: 'Prof. Deshmukh', department: 'BSc IT', defaultPassword: 'password123' },
  { id: 'fac_2', username: 'dr.kulkarni', name: 'Dr. Kulkarni', department: 'BSc IT', defaultPassword: 'password123' },
  { id: 'fac_3', username: 'prof.sharma', name: 'Prof. Sharma', department: 'BSc IT', defaultPassword: 'password123' }
];

function hashSecret(secret, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(String(secret), salt, 1000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifySecret(secret, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const computed = crypto.pbkdf2Sync(String(secret), salt, 1000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(originalHash, 'utf8'));
}

function getDb(customPath = null) {
  if (dbInstance && !customPath) return dbInstance;

  const targetPath = customPath || DB_PATH;
  const db = new DatabaseSync(targetPath);
  
  // Enforce foreign keys and WAL mode for high concurrency
  db.exec('PRAGMA foreign_keys = ON;');
  if (targetPath !== ':memory:') {
    try {
      db.exec('PRAGMA journal_mode = WAL;');
    } catch {}
  }

  // Execute schema
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    throw new Error('schema.sql not found at ' + schemaPath);
  }

  // Seed baseline subjects, faculty, and students if table is empty
  seedInitialData(db);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

function seedInitialData(db) {
  // 1. Seed Subjects
  const countSubj = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;
  if (countSubj === 0) {
    const insertSubj = db.prepare(`
      INSERT INTO subjects (id, code, name, teacher, room)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const s of CURRICULUM_SUBJECTS) {
      insertSubj.run(s.id, s.code, s.name, s.teacher, s.room);
    }
  }

  // 2. Seed Faculty
  const countFac = db.prepare('SELECT COUNT(*) as count FROM faculty').get().count;
  if (countFac === 0) {
    const insertFac = db.prepare(`
      INSERT INTO faculty (id, username, password_hash, name, department, role, created_at)
      VALUES (?, ?, ?, ?, ?, 'faculty', ?)
    `);
    const now = new Date().toISOString();
    for (const f of DEFAULT_FACULTY) {
      const passHash = hashSecret(f.defaultPassword);
      insertFac.run(f.id, f.username, passHash, f.name, f.department, now);
    }
  }

  // 3. Seed Students
  const countStu = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  if (countStu === 0) {
    const insertStu = db.prepare(`
      INSERT INTO students (id, roll_number, name, cohort, pin_hash, created_at)
      VALUES (?, ?, ?, 'SY BSc IT', ?, ?)
    `);
    const now = new Date().toISOString();
    ENROLLED_STUDENT_NAMES.forEach((name, i) => {
      const rollNumber = i + 1;
      const studentId = 'stu_' + rollNumber;
      const pin = String(1000 + rollNumber); // Default PIN: 1000 + roll
      const pinHash = hashSecret(pin);
      insertStu.run(studentId, rollNumber, name, pinHash, now);
    });
  }
}

// Transaction runner
function transaction(fn) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn(db);
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// --- FACULTY OPERATIONS ---

function authenticateFaculty(username, password) {
  const db = getDb();
  const fac = db.prepare('SELECT * FROM faculty WHERE username = ?').get(String(username).trim());
  if (!fac) return null;
  if (!verifySecret(password, fac.password_hash)) return null;

  // Create session
  const token = 'fac_tok_' + crypto.randomBytes(28).toString('hex');
  const now = Date.now();
  const expiresAt = now + 12 * 60 * 60 * 1000; // 12 hours

  db.prepare(`
    INSERT INTO faculty_sessions (token, faculty_id, username, name, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, fac.id, fac.username, fac.name, now, expiresAt);

  return {
    token,
    faculty: {
      id: fac.id,
      username: fac.username,
      name: fac.name,
      department: fac.department,
      role: fac.role
    },
    expiresAt
  };
}

function verifyFacultySession(token) {
  if (!token) return null;
  const db = getDb();
  const session = db.prepare('SELECT * FROM faculty_sessions WHERE token = ?').get(token);
  if (!session) return null;

  if (Date.now() > session.expires_at) {
    db.prepare('DELETE FROM faculty_sessions WHERE token = ?').run(token);
    return null;
  }
  return session;
}

function logoutFacultySession(token) {
  if (!token) return;
  const db = getDb();
  db.prepare('DELETE FROM faculty_sessions WHERE token = ?').run(token);
}

// --- STUDENT OPERATIONS ---

function authenticateStudent(rollNumber, pin) {
  const db = getDb();
  const roll = parseInt(rollNumber, 10);
  if (isNaN(roll) || roll < 1 || roll > 60) return null;

  const stu = db.prepare('SELECT * FROM students WHERE roll_number = ?').get(roll);
  if (!stu) return null;

  if (!verifySecret(pin, stu.pin_hash)) return null;

  // Create session
  const token = 'stu_tok_' + crypto.randomBytes(28).toString('hex');
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

  db.prepare(`
    INSERT INTO student_sessions (token, student_id, roll_number, name, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(token, stu.id, stu.roll_number, stu.name, now, expiresAt);

  return {
    token,
    student: {
      id: stu.id,
      rollNumber: stu.roll_number,
      name: stu.name,
      cohort: stu.cohort
    },
    expiresAt
  };
}

function verifyStudentSession(token) {
  if (!token) return null;
  const db = getDb();
  const session = db.prepare('SELECT * FROM student_sessions WHERE token = ?').get(token);
  if (!session) return null;

  if (Date.now() > session.expires_at) {
    db.prepare('DELETE FROM student_sessions WHERE token = ?').run(token);
    return null;
  }
  return {
    token: session.token,
    studentId: session.student_id,
    rollNumber: session.roll_number,
    name: session.name,
    createdAt: session.created_at,
    expiresAt: session.expires_at
  };
}

function logoutStudentSession(token) {
  if (!token) return;
  const db = getDb();
  db.prepare('DELETE FROM student_sessions WHERE token = ?').run(token);
}

// --- ATTENDANCE SESSION OPERATIONS ---

function createSession(data, clientIp = '127.0.0.1') {
  return transaction((db) => {
    const now = Date.now();
    const durationMin = Math.min(180, Math.max(1, parseInt(data.durationMinutes, 10) || 15));
    const rotationSec = Math.min(120, Math.max(5, parseInt(data.rotationIntervalSec, 10) || 20));
    const sessionId = 'qr_sess_' + now + '_' + crypto.randomBytes(4).toString('hex');
    const initialToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = now + durationMin * 60 * 1000;
    const tokenExpiresAt = now + rotationSec * 1000;
    const graceExpiresAt = tokenExpiresAt + 5000;

    // 1. Insert Attendance Session
    db.prepare(`
      INSERT INTO attendance_sessions (
        id, subject_id, faculty_id, session_type, date, start_time,
        experiment_title, duration_minutes, rotation_interval_sec,
        created_at, expires_at, current_token, token_expires_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(
      sessionId,
      data.subjectId || 'subj_1',
      data.facultyId || 'fac_1',
      data.sessionType === 'practical' ? 'practical' : 'lecture',
      data.date || new Date().toISOString().slice(0, 10),
      data.startTime || '09:00',
      (data.experimentTitle || '').trim(),
      durationMin,
      rotationSec,
      now,
      expiresAt,
      initialToken,
      tokenExpiresAt
    );

    // 2. Insert Initial Token
    db.prepare(`
      INSERT INTO session_qr_tokens (token, session_id, created_at, expires_at, grace_expires_at, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(initialToken, sessionId, now, tokenExpiresAt, graceExpiresAt);

    // 3. Log Audit
    db.prepare(`
      INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
      VALUES ('SESSION_STARTED', ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      data.facultyId || 'fac_1',
      clientIp,
      new Date().toISOString(),
      `Session created for subject "${data.subjectId}" (${durationMin}m duration, ${rotationSec}s rotation)`
    );

    return getSessionById(sessionId);
  });
}

function rotateSessionToken(sessionId, clientIp = '127.0.0.1') {
  return transaction((db) => {
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) return { success: false, error: 'SESSION_NOT_FOUND', message: 'Session does not exist.' };

    const now = Date.now();
    if (session.status !== 'active') {
      return { success: false, error: 'SESSION_INACTIVE', message: `Session status is ${session.status}.` };
    }

    if (now >= session.expires_at) {
      db.prepare("UPDATE attendance_sessions SET status = 'expired' WHERE id = ?").run(sessionId);
      db.prepare(`
        INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
        VALUES ('SESSION_EXPIRED', ?, ?, ?, ?, 'Overall session duration expired.')
      `).run(sessionId, session.faculty_id, clientIp, new Date().toISOString());
      return { success: false, error: 'SESSION_EXPIRED', message: 'Session duration has expired.' };
    }

    // Set old active token status to grace (5 seconds)
    const GRACE_PERIOD_MS = 5000;
    if (session.current_token) {
      db.prepare(`
        UPDATE session_qr_tokens 
        SET status = 'grace', grace_expires_at = ?
        WHERE token = ? AND session_id = ?
      `).run(now + GRACE_PERIOD_MS, session.current_token, sessionId);
    }

    // Expire any tokens whose grace window has elapsed
    db.prepare(`
      UPDATE session_qr_tokens
      SET status = 'expired'
      WHERE session_id = ? AND status = 'grace' AND grace_expires_at <= ?
    `).run(sessionId, now);

    // Generate and insert new token
    const newToken = crypto.randomBytes(24).toString('hex');
    const tokenExpiresAt = now + session.rotation_interval_sec * 1000;
    const graceExpiresAt = tokenExpiresAt + GRACE_PERIOD_MS;

    db.prepare(`
      INSERT INTO session_qr_tokens (token, session_id, created_at, expires_at, grace_expires_at, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(newToken, sessionId, now, tokenExpiresAt, graceExpiresAt);

    // Update session table
    db.prepare(`
      UPDATE attendance_sessions
      SET current_token = ?, token_expires_at = ?
      WHERE id = ?
    `).run(newToken, tokenExpiresAt, sessionId);

    // Log rotation
    db.prepare(`
      INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
      VALUES ('TOKEN_ROTATED', ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      session.faculty_id,
      clientIp,
      new Date().toISOString(),
      `Token rotated (expires in ${session.rotation_interval_sec}s)`
    );

    return {
      success: true,
      token: newToken,
      tokenExpiresAt: tokenExpiresAt,
      expiresAt: session.expires_at
    };
  });
}

function recordStudentAttendance(params, clientIp = '127.0.0.1') {
  return transaction((db) => {
    const { sessionId, token, studentId, rollNumber, studentName } = params;
    const now = Date.now();

    // 1. Session Status Check
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return { success: false, error: 'SESSION_NOT_FOUND', message: 'Invalid session ID. Please scan current code.' };
    }

    if (session.status !== 'active') {
      return { success: false, error: 'SESSION_CLOSED', message: 'This attendance session has already closed.' };
    }

    if (now > session.expires_at) {
      db.prepare("UPDATE attendance_sessions SET status = 'expired' WHERE id = ?").run(sessionId);
      return { success: false, error: 'SESSION_EXPIRED', message: 'The check-in window for this session has closed.' };
    }

    // 2. Token Authenticity & Freshness Check
    const tokenRecord = db.prepare(`
      SELECT * FROM session_qr_tokens 
      WHERE token = ? AND session_id = ?
    `).get(token, sessionId);

    if (!tokenRecord) {
      db.prepare(`
        INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
        VALUES ('INVALID_TOKEN_REJECTED', ?, ?, ?, ?, ?)
      `).run(sessionId, studentId, clientIp, new Date().toISOString(), `Unrecognized token attempt for Roll #${rollNumber}`);

      return { success: false, error: 'TOKEN_EXPIRED_OR_INVALID', message: 'Invalid or expired QR token. Please scan the current active code.' };
    }

    const isCurrentValid = (tokenRecord.token === session.current_token) && (now <= tokenRecord.expires_at);
    const isGraceValid = (tokenRecord.status === 'grace') && (now <= tokenRecord.grace_expires_at);

    if (!isCurrentValid && !isGraceValid) {
      db.prepare(`
        INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
        VALUES ('REPLAY_ATTEMPT_BLOCKED', ?, ?, ?, ?, ?)
      `).run(sessionId, studentId, clientIp, new Date().toISOString(), `Expired/replay token attempt for Roll #${rollNumber}`);

      return { success: false, error: 'TOKEN_EXPIRED_OR_INVALID', message: 'This QR code has expired. Please scan the latest code on screen.' };
    }

    // 3. Roster Enrollment Verification
    const parsedRoll = parseInt(rollNumber, 10);
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND roll_number = ?').get(studentId, parsedRoll);
    if (!student) {
      db.prepare(`
        INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
        VALUES ('UNENROLLED_STUDENT_REJECTED', ?, ?, ?, ?, ?)
      `).run(sessionId, studentId, clientIp, new Date().toISOString(), `Unenrolled student rejected: ${rollNumber}`);

      return { success: false, error: 'NOT_ENROLLED', message: 'Student is not enrolled in the SY BSc IT batch.' };
    }

    // 4. Duplicate Check-in Prevention (Database-level catch + query)
    const existing = db.prepare(`
      SELECT * FROM attendance_records 
      WHERE session_id = ? AND (student_id = ? OR roll_number = ?)
    `).get(sessionId, studentId, parsedRoll);

    if (existing) {
      db.prepare(`
        INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
        VALUES ('DUPLICATE_CHECKIN_BLOCKED', ?, ?, ?, ?, ?)
      `).run(sessionId, studentId, clientIp, new Date().toISOString(), `Duplicate check-in blocked for Roll #${parsedRoll}`);

      return { success: false, error: 'ALREADY_CHECKED_IN', message: `Student Roll #${parsedRoll} has already checked in for this session.` };
    }

    // 5. Insert Record (Atomic with uniqueness constraints)
    const recordId = 'rec_' + sessionId + '_' + studentId;
    const verifiedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO attendance_records (
        id, session_id, student_id, roll_number, student_name,
        status, verified_at, client_ip, token_used
      ) VALUES (?, ?, ?, ?, ?, 'present', ?, ?, ?)
    `).run(
      recordId,
      sessionId,
      student.id,
      student.roll_number,
      student.name,
      verifiedAt,
      clientIp,
      token
    );

    // 6. Log Audit Event
    db.prepare(`
      INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
      VALUES ('CHECKIN_SUCCESS', ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      student.id,
      clientIp,
      verifiedAt,
      `Roll #${student.roll_number} (${student.name}) verified and recorded`
    );

    return {
      success: true,
      studentId: student.id,
      rollNumber: student.roll_number,
      name: student.name,
      checkedInAt: verifiedAt
    };
  });
}

function manualOverride(sessionId, studentId, status, flag, facultyId = 'fac_1', clientIp = '127.0.0.1') {
  return transaction((db) => {
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) return { success: false, error: 'SESSION_NOT_FOUND' };

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    if (!student) return { success: false, error: 'STUDENT_NOT_FOUND' };

    const existing = db.prepare('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?').get(sessionId, studentId);
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE attendance_records 
        SET status = ?, flag = ? 
        WHERE session_id = ? AND student_id = ?
      `).run(status || existing.status, flag !== undefined ? flag : existing.flag, sessionId, studentId);
    } else {
      const recordId = 'rec_' + sessionId + '_' + studentId;
      db.prepare(`
        INSERT INTO attendance_records (
          id, session_id, student_id, roll_number, student_name,
          status, verified_at, client_ip, token_used, flag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'FACULTY_OVERRIDE', ?)
      `).run(recordId, sessionId, student.id, student.roll_number, student.name, status || 'present', now, clientIp + ' (faculty override)', flag || null);
    }

    db.prepare(`
      INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
      VALUES ('MANUAL_FACULTY_OVERRIDE', ?, ?, ?, ?, ?)
    `).run(sessionId, facultyId, clientIp, now, `Faculty override for student ${studentId} to "${status}"`);

    const updated = db.prepare('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?').get(sessionId, studentId);
    return { success: true, record: updated };
  });
}

function endSession(sessionId, facultyId = 'fac_1', clientIp = '127.0.0.1') {
  return transaction((db) => {
    const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
    if (!session) return { success: false, error: 'SESSION_NOT_FOUND' };

    // Revoke all tokens
    db.prepare("UPDATE session_qr_tokens SET status = 'revoked' WHERE session_id = ?").run(sessionId);

    // End session
    db.prepare("UPDATE attendance_sessions SET status = 'ended', current_token = NULL WHERE id = ?").run(sessionId);

    const recordCount = db.prepare('SELECT COUNT(*) as count FROM attendance_records WHERE session_id = ?').get(sessionId).count;

    db.prepare(`
      INSERT INTO audit_logs (event_type, session_id, user_id, client_ip, timestamp, details)
      VALUES ('SESSION_ENDED', ?, ?, ?, ?, ?)
    `).run(sessionId, facultyId, clientIp, new Date().toISOString(), `Session finalized. Total verified check-ins: ${recordCount}`);

    return {
      success: true,
      session: getSessionById(sessionId)
    };
  });
}

function getSessionById(sessionId) {
  const db = getDb();
  const session = db.prepare('SELECT * FROM attendance_sessions WHERE id = ?').get(sessionId);
  if (!session) return null;

  const records = db.prepare('SELECT * FROM attendance_records WHERE session_id = ? ORDER BY roll_number ASC').all(sessionId);
  const auditLogs = db.prepare('SELECT * FROM audit_logs WHERE session_id = ? ORDER BY id ASC').all(sessionId);

  const now = Date.now();
  const remainingSeconds = Math.max(0, Math.round((session.expires_at - now) / 1000));
  const tokenRemainingSeconds = Math.max(0, Math.round(((session.token_expires_at || 0) - now) / 1000));

  const checkedInMap = new Map();
  records.forEach(r => {
    checkedInMap.set(r.student_id, {
      studentId: r.student_id,
      rollNumber: r.roll_number,
      name: r.student_name,
      timestamp: r.verified_at,
      ip: r.client_ip,
      status: r.status,
      flag: r.flag
    });
  });

  return {
    id: session.id,
    subjectId: session.subject_id,
    facultyId: session.faculty_id,
    sessionType: session.session_type,
    date: session.date,
    startTime: session.start_time,
    experimentTitle: session.experiment_title,
    durationMinutes: session.duration_minutes,
    rotationIntervalSec: session.rotation_interval_sec,
    createdAt: session.created_at,
    expiresAt: session.expires_at,
    remainingSeconds,
    token: session.current_token,
    tokenExpiresAt: session.token_expires_at,
    tokenRemainingSeconds,
    status: (session.status === 'active' && now > session.expires_at) ? 'expired' : session.status,
    checkedInStudents: checkedInMap,
    auditLog: auditLogs.map(a => ({
      event: a.event_type,
      timestamp: a.timestamp,
      clientIp: a.client_ip,
      details: a.details
    }))
  };
}

function getActiveSessions() {
  const db = getDb();
  const now = Date.now();
  const rows = db.prepare(`
    SELECT * FROM attendance_sessions 
    WHERE status = 'active' AND expires_at >= ?
    ORDER BY created_at DESC
  `).all(now);

  return rows.map(r => getSessionById(r.id));
}

function getStudentRecord(sessionId, studentId) {
  const db = getDb();
  return db.prepare('SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?').get(sessionId, studentId);
}

function getAllStudents() {
  const db = getDb();
  return db.prepare('SELECT id, roll_number as rollNumber, name, cohort FROM students ORDER BY roll_number ASC').all();
}

function getAllSubjects() {
  const db = getDb();
  return db.prepare('SELECT * FROM subjects ORDER BY code ASC').all();
}

function getStudentAttendanceLedger(studentId) {
  const db = getDb();
  return db.prepare(`
    SELECT r.id, r.session_id as sessionId, r.status, r.verified_at as verifiedAt,
           s.subject_id as subjectId, sub.name as subjectName, s.session_type as type,
           s.date, s.start_time as startTime, s.experiment_title as experimentTitle
    FROM attendance_records r
    JOIN attendance_sessions s ON r.session_id = s.id
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE r.student_id = ?
    ORDER BY s.date DESC, s.start_time DESC
  `).all(studentId);
}

function closeDatabaseConnection() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}

function resetDatabaseForTesting() {
  const db = getDb();
  try {
    db.exec(`
      DELETE FROM attendance_records;
      DELETE FROM session_qr_tokens;
      DELETE FROM attendance_sessions;
      DELETE FROM faculty_sessions;
      DELETE FROM student_sessions;
      DELETE FROM audit_logs;
    `);
  } catch {}
}

module.exports = {
  getDb,
  transaction,
  hashSecret,
  verifySecret,
  authenticateFaculty,
  verifyFacultySession,
  logoutFacultySession,
  authenticateStudent,
  verifyStudentSession,
  logoutStudentSession,
  createSession,
  rotateSessionToken,
  recordStudentAttendance,
  manualOverride,
  endSession,
  getSessionById,
  getActiveSessions,
  getStudentRecord,
  getAllStudents,
  getAllSubjects,
  getStudentAttendanceLedger,
  closeDatabaseConnection,
  resetDatabaseForTesting,
  CURRICULUM_SUBJECTS
};
