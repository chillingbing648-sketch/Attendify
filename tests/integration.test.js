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
  print: () => {}
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

test('Integration - State initialization seeds 60 students and curriculum', () => {
  State.resetAll();
  const students = State.getAllStudents();
  assert.equal(students.length, 60);
  assert.equal(students[0].rollNumber, 1);
  assert.equal(students[59].rollNumber, 60);

  const subjects = State.get().subjects;
  assert.ok(subjects.length >= 6);
});

test('Integration - Lecture and Practical sessions share single attendance engine', () => {
  State.resetAll();
  const students = State.getAllStudents();
  const subjects = State.get().subjects;
  const subId = subjects[0].id;

  // 1. Create Theory Lecture session
  const sess1 = State.createSession({
    subjectId: subId,
    date: '2026-09-01',
    startTime: '09:00',
    type: 'theory'
  });

  const statusMap1 = {};
  students.forEach((s, idx) => {
    statusMap1[s.id] = (idx < 55) ? 'present' : 'absent';
  });
  State.saveRecords(sess1.id, statusMap1);

  const stats1 = Attendance.statsForSession(sess1.id);
  assert.equal(stats1.total, 60);
  assert.equal(stats1.present, 55);
  assert.equal(stats1.absent, 5);
  assert.equal(stats1.pct, Utils.safePercent(55, 60));

  // 2. Create Practical session with experiment title
  const sess2 = State.createSession({
    subjectId: subId,
    date: '2026-09-02',
    startTime: '10:15',
    type: 'practical',
    experimentTitle: 'Experiment 01: CSS Grid Architecture'
  });

  const statusMap2 = {};
  students.forEach((s, idx) => {
    statusMap2[s.id] = (idx < 50) ? 'present' : (idx < 58) ? 'absent' : 'late';
  });
  State.saveRecords(sess2.id, statusMap2);

  const stats2 = Attendance.statsForSession(sess2.id);
  assert.equal(stats2.total, 60);
  assert.equal(stats2.present, 50);
  assert.equal(stats2.absent, 8);
  assert.equal(stats2.late, 2);

  // 3. Verify student stats derive from actual records
  const stu1Stats = Attendance.statsForStudent(students[0].id);
  assert.equal(stu1Stats.total, 2);
  assert.equal(stu1Stats.present, 2);
  assert.equal(stu1Stats.pct, 100);

  const stu57Stats = Attendance.statsForStudent(students[56].id);
  assert.equal(stu57Stats.total, 2);
  assert.equal(stu57Stats.absent, 2);
  assert.equal(stu57Stats.pct, 0);

  // 4. Verify lecture vs practical stats
  const lvp = Attendance.lectureVsPracticalStats();
  assert.equal(lvp.lecture.sessionCount, 1);
  assert.equal(lvp.practical.sessionCount, 1);
  assert.equal(lvp.lecture.present, 55);
  assert.equal(lvp.practical.present, 52); // 50 present + 2 late
});

test('Integration - Archival moves sessions safely without data loss', () => {
  State.resetAll();
  const subjects = State.get().subjects;
  const sess = State.createSession({
    subjectId: subjects[0].id,
    date: '2026-07-15',
    startTime: '09:00',
    type: 'theory'
  });
  State.saveRecords(sess.id, { stu_1: 'present', stu_2: 'absent' });

  assert.equal(State.getAllSessions().some(s => s.id === sess.id), true);

  // Archive sessions on or before 2026-07-31
  const res = State.archiveSessionsBefore('2026-07-31');
  assert.equal(res.count, 1);
  assert.equal(State.getAllSessions().some(s => s.id === sess.id), false);
  assert.equal(State.getArchives().length, 1);

  // Restore archive
  State.unarchiveSessionGroup(State.getArchives()[0].id);
  assert.equal(State.getAllSessions().some(s => s.id === sess.id), true);
  assert.equal(State.getArchives().length, 0);
});

test('Integration - Smart admin insights detect defaulters and consecutive absences', () => {
  State.resetAll();
  const students = State.getAllStudents();
  const subjects = State.get().subjects;

  // Create 2 sessions where student 59 is absent in both
  const s1 = State.createSession({ subjectId: subjects[0].id, date: '2026-09-01', startTime: '09:00' });
  const map1 = {};
  students.forEach(st => { map1[st.id] = (st.rollNumber === 60) ? 'absent' : 'present'; });
  State.saveRecords(s1.id, map1);

  const s2 = State.createSession({ subjectId: subjects[0].id, date: '2026-09-02', startTime: '09:00' });
  const map2 = {};
  students.forEach(st => { map2[st.id] = (st.rollNumber === 60) ? 'absent' : 'present'; });
  State.saveRecords(s2.id, map2);

  const consecutive = Attendance.consecutiveAbsences(2);
  assert.ok(consecutive.some(c => c.student.rollNumber === 60));

  const insights = Attendance.smartInsights();
  assert.ok(insights.length > 0);
  assert.ok(insights.some(i => i.text.includes('consecutive')));
});
