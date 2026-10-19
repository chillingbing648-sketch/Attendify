-- ============================================================
-- ATTENDIFY — Database Schema (SQLite / PostgreSQL Compatible)
-- Enterprise-grade schema for attendance management
-- ============================================================

-- 1. Faculty Accounts
CREATE TABLE IF NOT EXISTS faculty (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'BSc IT',
  role TEXT NOT NULL DEFAULT 'faculty',
  created_at TEXT NOT NULL
);

-- 2. Faculty Active Auth Sessions
CREATE TABLE IF NOT EXISTS faculty_sessions (
  token TEXT PRIMARY KEY,
  faculty_id TEXT NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- 3. Students Roster (SY BSc IT 60 Enrolled Students)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  roll_number INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  cohort TEXT NOT NULL DEFAULT 'SY BSc IT',
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 4. Student Active Auth Sessions
CREATE TABLE IF NOT EXISTS student_sessions (
  token TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  roll_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- 5. Curriculum Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  teacher TEXT NOT NULL,
  room TEXT NOT NULL
);

-- 6. Live Attendance Sessions
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  faculty_id TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'lecture',
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  experiment_title TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL,
  rotation_interval_sec INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  current_token TEXT,
  token_expires_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active' -- 'active', 'ended', 'expired'
);

-- 7. Cryptographic QR Rotation Tokens
CREATE TABLE IF NOT EXISTS session_qr_tokens (
  token TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  grace_expires_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' -- 'active', 'grace', 'expired', 'revoked'
);

-- 8. Verified Attendance Records (ACID Persisted)
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  roll_number INTEGER NOT NULL,
  student_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present', -- 'present', 'late', 'absent'
  verified_at TEXT NOT NULL,
  client_ip TEXT NOT NULL,
  token_used TEXT,
  flag TEXT,
  -- Database-Level Uniqueness Constraints
  CONSTRAINT uq_session_student UNIQUE (session_id, student_id),
  CONSTRAINT uq_session_roll UNIQUE (session_id, roll_number)
);

-- 9. Security Audit Event Ledger
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  session_id TEXT,
  user_id TEXT,
  client_ip TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  details TEXT
);

-- Indices for rapid queries and constraint enforcement
CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_tokens_session ON session_qr_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
