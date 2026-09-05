const test = require('node:test');
const assert = require('node:assert/strict');

// Setup mock window & localStorage for Node testing
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
  localStorage: createMockStorage()
};

const Storage = require('../js/storage.js');
const Utils = require('../js/utils.js');
global.Utils = Utils;
global.Storage = Storage;
const State = require('../js/state.js');

test('Storage.save - rotates current data to backup before overwriting', () => {
  const mock = createMockStorage();
  global.window.localStorage = mock;

  const state1 = Storage.defaultState();
  state1.subjects = [{ id: 's1', name: 'Subject 1' }];
  Storage.save(state1);

  assert.equal(mock.getItem('attendify:v1:backup'), null);
  assert.ok(mock.getItem('attendify:v1').includes('Subject 1'));

  const state2 = Storage.defaultState();
  state2.subjects = [{ id: 's2', name: 'Subject 2' }];
  Storage.save(state2);

  assert.ok(mock.getItem('attendify:v1:backup').includes('Subject 1'));
  assert.ok(mock.getItem('attendify:v1').includes('Subject 2'));
});

test('Storage.load - recovers from corrupted primary JSON via backup key without throwing', () => {
  const mock = createMockStorage();
  global.window.localStorage = mock;

  const goodBackup = Storage.defaultState();
  goodBackup.subjects = [{ id: 'backup_sub', name: 'Recovered Subject' }];

  mock.setItem('attendify:v1', '{ invalid json ... corrupted');
  mock.setItem('attendify:v1:backup', JSON.stringify(goodBackup));

  const result = Storage.load();
  assert.equal(result.recovered, true);
  assert.equal(result.usedFallback, false);
  assert.equal(result.state.subjects[0].id, 'backup_sub');
});

test('Storage.load - falls back to fresh default state when both primary and backup are corrupted', () => {
  const mock = createMockStorage();
  global.window.localStorage = mock;

  mock.setItem('attendify:v1', 'corrupted 1');
  mock.setItem('attendify:v1:backup', 'corrupted 2');

  const result = Storage.load();
  assert.equal(result.recovered, true);
  assert.ok(Array.isArray(result.state.subjects));
  assert.equal(result.state.subjects.length, 0);
});

test('State.deleteSubject - cascades correctly to attendance, timetable, and notifications', () => {
  const mock = createMockStorage();
  global.window.localStorage = mock;

  State.init();
  const sub = State.addSubject({ name: 'Physics' });
  const att = State.markAttendance(sub.id, 'present', '2026-09-01');
  const tt = State.addTimetableEntry({ subjectId: sub.id, day: 1, start: '09:00', end: '10:00' });
  const notif = State.addNotification({ type: 'below-threshold', subjectId: sub.id, title: 'Alert', message: 'Below' });

  assert.equal(State.get().subjects.some(s => s.id === sub.id), true);
  assert.equal(State.get().attendance.some(a => a.subjectId === sub.id), true);
  assert.equal(State.get().timetable.some(t => t.subjectId === sub.id), true);
  assert.equal(State.get().notifications.some(n => n.subjectId === sub.id), true);

  State.deleteSubject(sub.id);

  assert.equal(State.get().subjects.some(s => s.id === sub.id), false);
  assert.equal(State.get().attendance.some(a => a.subjectId === sub.id), false);
  assert.equal(State.get().timetable.some(t => t.subjectId === sub.id), false);
  assert.equal(State.get().notifications.some(n => n.subjectId === sub.id), false);
});
