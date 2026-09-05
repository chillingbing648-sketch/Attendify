/* ============================================================
   ATTENDIFY — state.js (v2 — Central Admin State Management)
   ============================================================ */
const State = (() => {
  let data = Storage.defaultState();
  let usedFallback = false;
  const listeners = new Set();

  function init() {
    const result = Storage.load();
    data = result.state;
    usedFallback = result.usedFallback;
    data.meta.lastOpenedAt = new Date().toISOString();
    persist();
    return { recovered: result.recovered, usedFallback };
  }

  function persist() { Storage.save(data); }
  function get() { return data; }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit(changeType) {
    persist();
    listeners.forEach(fn => { try { fn(changeType, data); } catch (e) { console.error('State listener error:', e); } });
  }

  /* ---- Settings ---- */
  function updateSettings(patch) { data.settings = { ...data.settings, ...patch }; emit('settings'); }

  /* ---- Students ---- */
  function addStudent(student) {
    const rec = {
      id: Utils.uid('stu'),
      rollNumber: student.rollNumber || (data.students.length + 1),
      name: (student.name || '').trim(),
      active: student.active !== false
    };
    data.students.push(rec);
    emit('students');
    return rec;
  }
  function getStudent(id) { return data.students.find(s => s.id === id) || null; }
  function getStudentByRoll(roll) { return data.students.find(s => s.rollNumber === parseInt(roll, 10)) || null; }
  function getAllStudents() { return data.students.filter(s => s.active !== false).sort((a, b) => a.rollNumber - b.rollNumber); }
  function updateStudent(id, patch) {
    const s = data.students.find(x => x.id === id);
    if (!s) return null;
    Object.assign(s, patch);
    emit('students');
    return s;
  }
  function deleteStudent(id) {
    data.students = data.students.filter(s => s.id !== id);
    data.records = data.records.filter(r => r.studentId !== id);
    emit('students');
  }

  /* ---- Subjects ---- */
  function addSubject(subj) {
    const rec = {
      id: Utils.uid('subj'),
      name: (subj.name || '').trim(),
      teacher: (subj.teacher || '').trim(),
      room: (subj.room || '').trim(),
      color: subj.color || '#4F46E5',
      createdAt: new Date().toISOString()
    };
    data.subjects.push(rec);
    emit('subjects');
    return rec;
  }
  function getSubject(id) { return data.subjects.find(s => s.id === id) || null; }
  function updateSubject(id, patch) {
    const s = data.subjects.find(x => x.id === id);
    if (!s) return null;
    Object.assign(s, patch);
    emit('subjects');
    return s;
  }
  function deleteSubject(id) {
    data.subjects = data.subjects.filter(s => s.id !== id);
    const sessionIds = new Set(data.sessions.filter(s => s.subjectId === id).map(s => s.id));
    data.sessions = data.sessions.filter(s => s.subjectId !== id);
    data.records = data.records.filter(r => !sessionIds.has(r.sessionId));
    data.timetable = (data.timetable || []).filter(t => t.subjectId !== id);
    if (data.attendance) data.attendance = data.attendance.filter(a => a.subjectId !== id);
    if (data.notifications) data.notifications = data.notifications.filter(n => n.subjectId !== id);
    emit('subjects');
  }

  function markAttendance(subjectId, status = 'present', date = Utils.todayISO()) {
    let sess = findDuplicateSession(subjectId, date, '09:00');
    if (!sess) {
      sess = createSession({ subjectId, date, startTime: '09:00', type: 'theory' });
    }
    const stu = data.students && data.students[0] ? data.students[0].id : 'stu_1';
    const rec = { id: Utils.uid('rec'), sessionId: sess.id, studentId: stu, status };
    data.records.push(rec);
    if (!data.attendance) data.attendance = [];
    const attRec = { id: Utils.uid('att'), subjectId, status, date };
    data.attendance.push(attRec);
    emit('records');
    return attRec;
  }

  /* ---- Sessions (Theory & Practical) ---- */
  function createSession({ subjectId, date, startTime, type = 'theory', experimentTitle = '' }) {
    const rec = {
      id: Utils.uid('sess'),
      subjectId,
      date: date || Utils.todayISO(),
      startTime: startTime || '',
      type: type || 'theory',
      experimentTitle: (experimentTitle || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.sessions.push(rec);
    emit('sessions');
    return rec;
  }
  function getSession(id) { return data.sessions.find(s => s.id === id) || null; }
  function getAllSessions() { return [...data.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)); }
  function getSessionsForSubject(subjectId) { return data.sessions.filter(s => s.subjectId === subjectId).sort((a, b) => b.date.localeCompare(a.date)); }
  function getSessionsForDate(dateISO) { return data.sessions.filter(s => s.date === dateISO); }
  function getPracticalSessions() { return data.sessions.filter(s => s.type === 'practical').sort((a, b) => b.date.localeCompare(a.date)); }
  function updateSession(id, patch) {
    const s = data.sessions.find(x => x.id === id);
    if (!s) return null;
    Object.assign(s, patch, { updatedAt: new Date().toISOString() });
    emit('sessions');
    return s;
  }
  function deleteSession(id) {
    data.sessions = data.sessions.filter(s => s.id !== id);
    data.records = data.records.filter(r => r.sessionId !== id);
    emit('sessions');
  }
  function findDuplicateSession(subjectId, date, startTime) {
    return data.sessions.find(s => s.subjectId === subjectId && s.date === date && s.startTime === (startTime || ''));
  }

  /* ---- Records ---- */
  function saveRecords(sessionId, statusMap) {
    data.records = data.records.filter(r => r.sessionId !== sessionId);
    Object.entries(statusMap).forEach(([studentId, status]) => {
      data.records.push({
        id: Utils.uid('rec'),
        sessionId,
        studentId,
        status: status || 'unreviewed'
      });
    });
    const sess = data.sessions.find(s => s.id === sessionId);
    if (sess) sess.updatedAt = new Date().toISOString();
    emit('records');
  }
  function getRecordsForSession(sessionId) { return data.records.filter(r => r.sessionId === sessionId); }
  function getRecordsForStudent(studentId) { return data.records.filter(r => r.studentId === studentId); }
  function getRecordsForStudentAndSubject(studentId, subjectId) {
    const sessIds = new Set(data.sessions.filter(s => s.subjectId === subjectId).map(s => s.id));
    return data.records.filter(r => r.studentId === studentId && sessIds.has(r.sessionId));
  }

  /* ---- Timetable ---- */
  function addTimetableEntry(entry) {
    const rec = {
      id: entry.id || Utils.uid('tt'),
      day: entry.day !== undefined ? entry.day : 0,
      start: entry.start || '09:00',
      end: entry.end || '10:00',
      subjectId: entry.subjectId,
      room: entry.room || 'Lab 1',
      type: entry.type || 'theory'
    };
    if (!data.timetable) data.timetable = [];
    data.timetable.push(rec);
    emit('timetable');
    return rec;
  }
  function getTimetable() { return data.timetable || []; }
  function getTimetableForDay(dayIndex) { return (data.timetable || []).filter(t => t.day === dayIndex).sort((a,b) => a.start.localeCompare(b.start)); }
  function getTodayTimetable() {
    // 0 = Sunday in JS, but 0 = Monday in our timetable format
    const jsDay = new Date().getDay();
    const ttDay = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Tue=1, ..., Sat=5, Sun=6
    return getTimetableForDay(ttDay);
  }

  /* ---- Notifications ---- */
  function addNotification(notif) {
    const dupe = data.notifications.find(n => n.type === notif.type && n.date === notif.date);
    if (dupe) return dupe;
    const rec = { id: Utils.uid('notif'), read: false, createdAt: new Date().toISOString(), ...notif };
    data.notifications.unshift(rec);
    data.notifications = data.notifications.slice(0, 50);
    emit('notifications');
    return rec;
  }
  function markNotificationRead(id) { const n = data.notifications.find(x => x.id === id); if (n) { n.read = true; emit('notifications'); } }
  function clearNotifications() { data.notifications = []; emit('notifications'); }
  function unreadNotificationCount() { return data.notifications.filter(n => !n.read).length; }

  /* ---- Archival (Prompt 16) ---- */
  function getArchives() {
    if (!Array.isArray(data.archives)) data.archives = [];
    return data.archives;
  }

  function archiveSessionsBefore(dateISO) {
    if (!Array.isArray(data.archives)) data.archives = [];
    const sessionsToArchive = data.sessions.filter(s => s.date <= dateISO);
    if (sessionsToArchive.length === 0) return { count: 0 };

    const sessIds = new Set(sessionsToArchive.map(s => s.id));
    const recordsToArchive = data.records.filter(r => sessIds.has(r.sessionId));

    const archiveRecord = {
      id: Utils.uid('arch'),
      title: `Archived Sessions on or before ${Utils.formatDate(dateISO)}`,
      cutoffDate: dateISO,
      archivedAt: new Date().toISOString(),
      sessionCount: sessionsToArchive.length,
      recordCount: recordsToArchive.length,
      sessions: sessionsToArchive,
      records: recordsToArchive
    };

    data.archives.unshift(archiveRecord);
    data.sessions = data.sessions.filter(s => !sessIds.has(s.id));
    data.records = data.records.filter(r => !sessIds.has(r.sessionId));
    emit('sessions');
    return { count: sessionsToArchive.length, archive: archiveRecord };
  }

  function unarchiveSessionGroup(archiveId) {
    if (!Array.isArray(data.archives)) return false;
    const arch = data.archives.find(a => a.id === archiveId);
    if (!arch) return false;

    // Restore sessions & records safely
    const existingSessIds = new Set(data.sessions.map(s => s.id));
    arch.sessions.forEach(s => {
      if (!existingSessIds.has(s.id)) data.sessions.push(s);
    });

    const existingRecIds = new Set(data.records.map(r => r.id));
    arch.records.forEach(r => {
      if (!existingRecIds.has(r.id)) data.records.push(r);
    });

    data.archives = data.archives.filter(a => a.id !== archiveId);
    emit('sessions');
    return true;
  }

  /* ---- Import / Export / Reset ---- */
  function replaceAll(newState) {
    if (!newState || typeof newState !== 'object') return false;
    newState.version = 2;
    ['students','subjects','sessions','records','timetable','notifications'].forEach(k => {
      if (!Array.isArray(newState[k])) newState[k] = [];
    });
    if (!newState.settings) newState.settings = Storage.defaultState().settings;
    if (!newState.meta) newState.meta = Storage.defaultState().meta;
    data = newState;
    emit('all');
    return true;
  }

  function resetAll() {
    try { localStorage.removeItem('attendify:v2'); localStorage.removeItem('attendify:v2:backup'); } catch {}
    data = Storage.seededState();
    emit('all');
  }

  return {
    init, get, persist, subscribe, emit,
    updateSettings,
    addStudent, getStudent, getStudentByRoll, getAllStudents, updateStudent, deleteStudent,
    addSubject, getSubject, updateSubject, deleteSubject,
    createSession, getSession, getAllSessions, getSessionsForSubject, getSessionsForDate, getPracticalSessions,
    updateSession, deleteSession, findDuplicateSession,
    saveRecords, getRecordsForSession, getRecordsForStudent, getRecordsForStudentAndSubject,
    markAttendance,
    getTimetable, getTimetableForDay, getTodayTimetable, addTimetableEntry,
    addNotification, markNotificationRead, clearNotifications, unreadNotificationCount,
    getArchives, archiveSessionsBefore, unarchiveSessionGroup,
    replaceAll, resetAll
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = State;
