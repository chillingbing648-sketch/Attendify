/* ============================================================
   ATTENDIFY — validation.js (Admin Validation Foundation)
   ============================================================ */

const Validation = (() => {
  function validateImport(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { valid: false, reason: 'Import payload must be a valid JSON object.' };
    }

    // Check subjects if present
    const subjIds = new Set();
    if (Array.isArray(payload.subjects)) {
      for (const sub of payload.subjects) {
        if (!sub.id || subjIds.has(sub.id)) {
          return { valid: false, reason: `Duplicate subject ID "${sub.id}"` };
        }
        subjIds.add(sub.id);
      }
    }

    // Check student IDs uniqueness if present
    const stuIds = new Set();
    if (Array.isArray(payload.students)) {
      for (const s of payload.students) {
        if (!s.id || stuIds.has(s.id)) {
          return { valid: false, reason: `Duplicate or missing student ID: ${s.id}` };
        }
        stuIds.add(s.id);
      }
    }

    // Validate legacy / direct attendance records if present
    if (Array.isArray(payload.attendance)) {
      for (const att of payload.attendance) {
        if (att.subjectId && !subjIds.has(att.subjectId)) {
          return { valid: false, reason: `Attendance record references non-existent subject ID "${att.subjectId}"` };
        }
        if (att.status && !['present', 'absent', 'late'].includes(att.status)) {
          return { valid: false, reason: `invalid status "${att.status}"` };
        }
        if (att.date) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(att.date)) {
            return { valid: false, reason: `Invalid date format: "${att.date}"` };
          }
          const d = new Date(att.date);
          if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== att.date) {
            return { valid: false, reason: `Unparseable date: "${att.date}"` };
          }
        }
      }
    }

    // Validate sessions if present (v2 schema)
    const sessIds = new Set();
    if (Array.isArray(payload.sessions)) {
      for (const sess of payload.sessions) {
        if (!sess.id || sessIds.has(sess.id)) {
          return { valid: false, reason: `Duplicate or missing session ID: ${sess.id}` };
        }
        if (sess.subjectId && !subjIds.has(sess.subjectId)) {
          return { valid: false, reason: `Session references non-existent subject ID: ${sess.subjectId}` };
        }
        sessIds.add(sess.id);
      }
    }

    // Validate records if present (v2 schema)
    if (Array.isArray(payload.records)) {
      for (const rec of payload.records) {
        if (sessIds.size > 0 && rec.sessionId && !sessIds.has(rec.sessionId)) {
          return { valid: false, reason: `Attendance record references non-existent session ID: ${rec.sessionId}` };
        }
        if (stuIds.size > 0 && rec.studentId && !stuIds.has(rec.studentId)) {
          return { valid: false, reason: `Attendance record references non-existent student ID: ${rec.studentId}` };
        }
        if (rec.status && !['present', 'absent', 'late', 'unmarked'].includes(rec.status)) {
          return { valid: false, reason: `Invalid attendance status: ${rec.status}` };
        }
      }
    }

    // Validate timetable if present
    if (Array.isArray(payload.timetable)) {
      for (const t of payload.timetable) {
        if (t.day < 0 || t.day > 5) {
          return { valid: false, reason: 'Invalid timetable day (must be Monday 0 to Saturday 5).' };
        }
        if (t.start && t.end && t.start >= t.end) {
          return { valid: false, reason: 'Timetable start time must be before end time.' };
        }
      }
    }

    // Validate settings thresholds if present
    if (payload.settings) {
      const safe = Number(payload.settings.thresholdSafe);
      const warn = Number(payload.settings.thresholdWarn);
      if (!isNaN(safe) && !isNaN(warn) && safe < warn) {
        return { valid: false, reason: 'Safe threshold cannot be lower than warning threshold.' };
      }
    }

    const attendanceCount = Array.isArray(payload.attendance)
      ? payload.attendance.length
      : (Array.isArray(payload.records) ? payload.records.length : 0);

    return {
      valid: true,
      counts: {
        students: Array.isArray(payload.students) ? payload.students.length : 0,
        subjects: Array.isArray(payload.subjects) ? payload.subjects.length : 0,
        sessions: Array.isArray(payload.sessions) ? payload.sessions.length : 0,
        records: Array.isArray(payload.records) ? payload.records.length : 0
      },
      stats: {
        subjects: Array.isArray(payload.subjects) ? payload.subjects.length : 0,
        attendance: attendanceCount,
        timetable: Array.isArray(payload.timetable) ? payload.timetable.length : 0
      }
    };
  }

  function validateStudent({ rollNumber, name, existingId = null, students = [] }) {
    const errors = {};
    const parsedRoll = parseInt(rollNumber, 10);

    if (isNaN(parsedRoll) || parsedRoll <= 0 || parsedRoll > 9999) {
      errors.rollNumber = 'Roll number must be a valid integer between 1 and 9999.';
    } else {
      const isDuplicate = students.some(s => s.id !== existingId && s.rollNumber === parsedRoll);
      if (isDuplicate) {
        errors.rollNumber = `Roll number ${parsedRoll} is already assigned to another student.`;
      }
    }

    const cleanName = (name || '').trim();
    if (!cleanName || cleanName.length < 2) {
      errors.name = 'Student full name must be at least 2 characters.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  function validateSubject({ name, teacher, room, existingId = null, subjects = [] }) {
    const errors = {};
    const cleanName = (name || '').trim();

    if (!cleanName || cleanName.length < 2) {
      errors.name = 'Subject name must be at least 2 characters.';
    } else {
      const isDuplicate = subjects.some(s => s.id !== existingId && s.name.toLowerCase() === cleanName.toLowerCase());
      if (isDuplicate) {
        errors.name = `A subject named "${cleanName}" already exists.`;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }

  return { validateImport, validateStudent, validateSubject };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Validation;
