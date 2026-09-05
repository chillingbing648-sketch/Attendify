/* ============================================================
   ATTENDIFY — attendance.js  (v2 — Admin Calculations)
   Pure calculation module. No DOM, no State mutation.
   Reads from State to compute statistics.
   ============================================================ */
const Attendance = (() => {

  function thresholds() {
    const s = State.get().settings;
    return { safe: s.thresholdSafe || 75, warn: s.thresholdWarn || 65 };
  }

  function statusFromPct(pct, total) {
    if (total === 0) return 'safe';
    const th = thresholds();
    if (pct >= th.safe) return 'safe';
    if (pct >= th.warn) return 'warn';
    return 'critical';
  }

  /* ---- Session stats ---- */
  function statsForSession(sessionId) {
    const recs = State.getRecordsForSession(sessionId);
    const present = recs.filter(r => r.status === 'present').length;
    const absent = recs.filter(r => r.status === 'absent').length;
    const late = recs.filter(r => r.status === 'late').length;
    const total = recs.length;
    const pct = Utils.safePercent(present + late, total);
    return { present, absent, late, total, pct, status: statusFromPct(pct, total) };
  }

  /* ---- Student overall stats ---- */
  function statsForStudent(studentId) {
    const recs = State.getRecordsForStudent(studentId);
    return computeFromRecords(recs);
  }

  /* ---- Student stats in a specific subject ---- */
  function statsForStudentInSubject(studentId, subjectId) {
    const recs = State.getRecordsForStudentAndSubject(studentId, subjectId);
    return computeFromRecords(recs);
  }

  function computeFromRecords(recs) {
    const present = recs.filter(r => r.status === 'present').length;
    const absent = recs.filter(r => r.status === 'absent').length;
    const late = recs.filter(r => r.status === 'late').length;
    const total = recs.length;
    const pct = Utils.safePercent(present + late, total);
    return { present, absent, late, total, pct, status: statusFromPct(pct, total) };
  }

  /* ---- Subject stats (across all sessions) ---- */
  function statsForSubject(subjectId) {
    const sessions = State.getSessionsForSubject(subjectId);
    const sessIds = new Set(sessions.map(s => s.id));
    const allRecs = State.get().records.filter(r => sessIds.has(r.sessionId));
    const present = allRecs.filter(r => r.status === 'present').length;
    const absent = allRecs.filter(r => r.status === 'absent').length;
    const late = allRecs.filter(r => r.status === 'late').length;
    const total = allRecs.length;
    const pct = Utils.safePercent(present + late, total);
    return {
      subject: State.getSubject(subjectId),
      sessionCount: sessions.length,
      present, absent, late, total, pct,
      status: statusFromPct(pct, total),
      lastSession: sessions[0] || null
    };
  }

  /* ---- Overall batch stats ---- */
  function overallBatchStats() {
    const students = State.getAllStudents();
    const sessions = State.getAllSessions();
    const subjects = State.get().subjects;
    const allRecs = State.get().records;
    const th = thresholds();

    const present = allRecs.filter(r => r.status === 'present').length;
    const absent = allRecs.filter(r => r.status === 'absent').length;
    const late = allRecs.filter(r => r.status === 'late').length;
    const totalRecs = allRecs.length;
    const avgPct = Utils.safePercent(present + late, totalRecs);

    // Students below thresholds
    let belowSafe = 0, belowWarn = 0;
    students.forEach(stu => {
      const st = statsForStudent(stu.id);
      if (st.total > 0 && st.pct < th.safe) belowSafe++;
      if (st.total > 0 && st.pct < th.warn) belowWarn++;
    });

    return {
      totalStudents: students.length,
      totalSessions: sessions.length,
      totalSubjects: subjects.length,
      avgPct,
      belowSafe,
      belowWarn,
      present, absent, late, totalRecs
    };
  }

  /* ---- Students below threshold ---- */
  function studentsBelow(threshold) {
    return State.getAllStudents()
      .map(s => ({ student: s, ...statsForStudent(s.id) }))
      .filter(s => s.total > 0 && s.pct < threshold)
      .sort((a, b) => a.pct - b.pct);
  }

  /* ---- Subject comparison ---- */
  function subjectComparison() {
    return State.get().subjects.map(subj => {
      const st = statsForSubject(subj.id);
      return { subject: subj, ...st };
    }).sort((a, b) => b.pct - a.pct);
  }

  /* ---- Weekly trend (last N weeks) ---- */
  function weeklyTrend(weeks) {
    weeks = weeks || 8;
    const result = [];
    const now = new Date();
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const startISO = weekStart.toISOString().slice(0, 10);
      const endISO = weekEnd.toISOString().slice(0, 10);

      const sessions = State.get().sessions.filter(s => s.date >= startISO && s.date <= endISO);
      const sessIds = new Set(sessions.map(s => s.id));
      const recs = State.get().records.filter(r => sessIds.has(r.sessionId));
      const present = recs.filter(r => r.status === 'present' || r.status === 'late').length;
      const total = recs.length;
      const pct = Utils.safePercent(present, total);

      result.push({ weekLabel: Utils.formatDate(startISO), pct, total, sessions: sessions.length });
    }
    return result;
  }

  /* ---- Present vs Absent overall ---- */
  function presentVsAbsent() {
    const recs = State.get().records;
    return {
      present: recs.filter(r => r.status === 'present').length,
      absent: recs.filter(r => r.status === 'absent').length,
      late: recs.filter(r => r.status === 'late').length
    };
  }

  /* ---- Status distribution of students ---- */
  function statusDistribution() {
    const students = State.getAllStudents();
    const th = thresholds();
    let safe = 0, warn = 0, critical = 0, noData = 0;
    students.forEach(stu => {
      const st = statsForStudent(stu.id);
      if (st.total === 0) { noData++; return; }
      if (st.status === 'safe') safe++;
      else if (st.status === 'warn') warn++;
      else critical++;
    });
    return { safe, warn, critical, noData };
  }

  /* ---- Student-wise attendance for a session (used by mark attendance / history) ---- */
  function sessionStudentList(sessionId) {
    const records = State.getRecordsForSession(sessionId);
    const recordMap = {};
    records.forEach(r => { recordMap[r.studentId] = r; });
    return State.getAllStudents().map(stu => ({
      student: stu,
      record: recordMap[stu.id] || null,
      status: recordMap[stu.id] ? recordMap[stu.id].status : null
    }));
  }

  return {
    thresholds, statusFromPct,
    statsForSession, statsForStudent, statsForStudentInSubject, statsForSubject,
    overallBatchStats, studentsBelow, subjectComparison,
    weeklyTrend, presentVsAbsent, statusDistribution,
    sessionStudentList, computeFromRecords
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Attendance;
