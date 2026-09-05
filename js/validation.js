/* ============================================================
   ATTENDIFY — validation.js (Admin Validation Foundation)
   ============================================================ */

const Validation = (() => {
  function validateImport(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { valid: false, reason: 'Import payload must be a valid JSON object.' };
    }

    if (!Array.isArray(payload.students)) {
      return { valid: false, reason: 'Missing students list.' };
    }

    if (!Array.isArray(payload.subjects)) {
      return { valid: false, reason: 'Missing subjects list.' };
    }

    // Check student IDs uniqueness
    const stuIds = new Set();
    for (const s of payload.students) {
      if (!s.id || stuIds.has(s.id)) {
        return { valid: false, reason: `Duplicate or missing student ID: ${s.id}` };
      }
      stuIds.add(s.id);
    }

    // Check subject IDs uniqueness
    const subjIds = new Set();
    for (const sub of payload.subjects) {
      if (!sub.id || subjIds.has(sub.id)) {
        return { valid: false, reason: `Duplicate or missing subject ID: ${sub.id}` };
      }
      subjIds.add(sub.id);
    }

    // Validate sessions if present
    if (Array.isArray(payload.sessions)) {
      const sessIds = new Set();
      for (const sess of payload.sessions) {
        if (!sess.id || sessIds.has(sess.id)) {
          return { valid: false, reason: `Duplicate or missing session ID: ${sess.id}` };
        }
        if (!subjIds.has(sess.subjectId)) {
          return { valid: false, reason: `Session references non-existent subject ID: ${sess.subjectId}` };
        }
        sessIds.add(sess.id);
      }

      // Validate records if present
      if (Array.isArray(payload.records)) {
        for (const rec of payload.records) {
          if (!sessIds.has(rec.sessionId)) {
            return { valid: false, reason: `Attendance record references non-existent session ID: ${rec.sessionId}` };
          }
          if (!stuIds.has(rec.studentId)) {
            return { valid: false, reason: `Attendance record references non-existent student ID: ${rec.studentId}` };
          }
          if (!['present', 'absent', 'late'].includes(rec.status)) {
            return { valid: false, reason: `Invalid attendance status: ${rec.status}` };
          }
        }
      }
    }

    return {
      valid: true,
      counts: {
        students: payload.students.length,
        subjects: payload.subjects.length,
        sessions: Array.isArray(payload.sessions) ? payload.sessions.length : 0,
        records: Array.isArray(payload.records) ? payload.records.length : 0
      }
    };
  }

  return { validateImport };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Validation;
