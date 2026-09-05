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

  /* ---- Lecture vs Practical Turnout (Prompt 18) ---- */
  function lectureVsPracticalStats() {
    const sessions = State.getAllSessions();
    const lectureSessIds = new Set(sessions.filter(s => s.type !== 'practical').map(s => s.id));
    const practicalSessIds = new Set(sessions.filter(s => s.type === 'practical').map(s => s.id));

    const records = State.get().records;
    const lectureRecs = records.filter(r => lectureSessIds.has(r.sessionId));
    const practicalRecs = records.filter(r => practicalSessIds.has(r.sessionId));

    const lPresent = lectureRecs.filter(r => r.status === 'present' || r.status === 'late').length;
    const lTotal = lectureRecs.length;
    const lPct = Utils.safePercent(lPresent, lTotal);

    const pPresent = practicalRecs.filter(r => r.status === 'present' || r.status === 'late').length;
    const pTotal = practicalRecs.length;
    const pPct = Utils.safePercent(pPresent, pTotal);

    return {
      lecture: { sessionCount: lectureSessIds.size, present: lPresent, total: lTotal, pct: lPct },
      practical: { sessionCount: practicalSessIds.size, present: pPresent, total: pTotal, pct: pPct }
    };
  }

  /* ---- Repeat Absentees (Prompt 18) ---- */
  function repeatAbsentees(limit = 8) {
    const students = State.getAllStudents();
    const list = students.map(s => {
      const st = statsForStudent(s.id);
      return { student: s, ...st };
    })
    .filter(s => s.absent > 0)
    .sort((a, b) => b.absent - a.absent || a.pct - b.pct);

    return list.slice(0, limit);
  }

  /* ---- Consecutive Absences (Prompt 18 & 19) ---- */
  function consecutiveAbsences(n = 2) {
    const sessions = State.getAllSessions();
    if (sessions.length < n) return [];

    const lastNSessions = sessions.slice(0, n);
    const lastNSessIds = lastNSessions.map(s => s.id);
    const students = State.getAllStudents();
    const records = State.get().records;

    const matched = [];
    students.forEach(stu => {
      const stuRecs = records.filter(r => r.studentId === stu.id && lastNSessIds.includes(r.sessionId));
      if (stuRecs.length === n && stuRecs.every(r => r.status === 'absent')) {
        matched.push({
          student: stu,
          consecutiveCount: n,
          sessions: lastNSessions
        });
      }
    });

    return matched;
  }

  /* ---- Smart Admin Insights (Prompt 19) ---- */
  function smartInsights() {
    const insights = [];
    const stats = overallBatchStats();
    const th = thresholds();
    const todayISO = Utils.todayISO();

    // 1. Defaulters alert
    const below75 = studentsBelow(th.safe);
    if (below75.length > 0) {
      insights.push({
        type: 'critical',
        text: `${below75.length} student${below75.length === 1 ? '' : 's'} below ${th.safe}% minimum attendance.`,
        actionLabel: 'View Defaulters',
        actionView: 'students',
        filter: 'critical'
      });
    }

    // 2. Consecutive absences
    const consecutive = consecutiveAbsences(2);
    if (consecutive.length > 0) {
      insights.push({
        type: 'warn',
        text: `${consecutive.length} student${consecutive.length === 1 ? '' : 's'} absent in the last 2 consecutive sessions.`,
        actionLabel: 'Review Students',
        actionView: 'students',
        filter: 'warn'
      });
    }

    // 3. Subject practical comparison vs batch average
    if (stats.totalSessions > 0) {
      const practicalSessions = State.getPracticalSessions();
      const subjects = State.get().subjects;
      subjects.forEach(sub => {
        const subPracticals = practicalSessions.filter(s => s.subjectId === sub.id);
        if (subPracticals.length > 0) {
          const sessIds = new Set(subPracticals.map(s => s.id));
          const subRecs = State.get().records.filter(r => sessIds.has(r.sessionId));
          const pPresent = subRecs.filter(r => r.status === 'present' || r.status === 'late').length;
          const pPct = Utils.safePercent(pPresent, subRecs.length);
          if (subRecs.length > 0 && pPct < stats.avgPct) {
            insights.push({
              type: 'info',
              text: `${sub.name} practical attendance (${pPct}%) is below the batch average (${stats.avgPct}%).`,
              actionLabel: 'View Practical Report',
              actionView: 'practical-reports'
            });
          }
        }
      });
    }

    // 4. Today's pending attendance
    const todaySlots = State.getTodayTimetable();
    const todaySessions = State.getSessionsForDate(todayISO);
    const pendingSlots = todaySlots.filter(slot => {
      return !todaySessions.some(s => s.subjectId === slot.subjectId && s.startTime === slot.start);
    });

    if (pendingSlots.length > 0) {
      const firstPending = pendingSlots[0];
      const sub = State.getSubject(firstPending.subjectId);
      insights.push({
        type: 'warn',
        text: `${sub ? sub.name : 'Scheduled class'} attendance is pending for today (${firstPending.start}).`,
        actionLabel: 'Mark Now',
        actionView: 'mark-attendance',
        prefillSubjectId: firstPending.subjectId,
        prefillTime: firstPending.start,
        prefillType: firstPending.type || 'theory'
      });
    }

    return insights;
  }

  return {
    thresholds, statusFromPct,
    statsForSession, statsForStudent, statsForStudentInSubject, statsForSubject,
    overallBatchStats, studentsBelow, subjectComparison,
    weeklyTrend, presentVsAbsent, statusDistribution,
    sessionStudentList, computeFromRecords,
    lectureVsPracticalStats, repeatAbsentees, consecutiveAbsences, smartInsights
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Attendance;
