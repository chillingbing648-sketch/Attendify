const test = require('node:test');
const assert = require('node:assert/strict');
const Validation = require('../js/validation.js');

test('Validation - rejects non-object or array payloads', () => {
  assert.equal(Validation.validateImport(null).valid, false);
  assert.equal(Validation.validateImport('string').valid, false);
  assert.equal(Validation.validateImport([1, 2, 3]).valid, false);
});

test('Validation - rejects duplicate subject IDs', () => {
  const payload = {
    subjects: [
      { id: 'subj_1', name: 'Math' },
      { id: 'subj_1', name: 'Physics' }
    ]
  };
  const res = Validation.validateImport(payload);
  assert.equal(res.valid, false);
  assert.match(res.reason, /Duplicate subject ID "subj_1"/);
});

test('Validation - rejects orphaned attendance records', () => {
  const payload = {
    subjects: [{ id: 'subj_1', name: 'Math' }],
    attendance: [
      { id: 'att_1', subjectId: 'subj_999', status: 'present', date: '2026-09-01' }
    ]
  };
  const res = Validation.validateImport(payload);
  assert.equal(res.valid, false);
  assert.match(res.reason, /references non-existent subject ID "subj_999"/);
});

test('Validation - rejects invalid status enum values', () => {
  const payload = {
    subjects: [{ id: 'subj_1', name: 'Math' }],
    attendance: [
      { id: 'att_1', subjectId: 'subj_1', status: 'excused', date: '2026-09-01' }
    ]
  };
  const res = Validation.validateImport(payload);
  assert.equal(res.valid, false);
  assert.match(res.reason, /invalid status "excused"/);
});

test('Validation - rejects invalid date formats and unparseable dates', () => {
  const badFormatPayload = {
    subjects: [{ id: 'subj_1', name: 'Math' }],
    attendance: [
      { id: 'att_1', subjectId: 'subj_1', status: 'present', date: '01-09-2026' }
    ]
  };
  assert.equal(Validation.validateImport(badFormatPayload).valid, false);

  const unparseablePayload = {
    subjects: [{ id: 'subj_1', name: 'Math' }],
    attendance: [
      { id: 'att_1', subjectId: 'subj_1', status: 'present', date: '2026-99-99' }
    ]
  };
  assert.equal(Validation.validateImport(unparseablePayload).valid, false);
});

test('Validation - rejects timetable with start time >= end time or invalid day', () => {
  const badTimePayload = {
    subjects: [{ id: 'subj_1', name: 'Math' }],
    timetable: [
      { id: 'tt_1', subjectId: 'subj_1', day: 1, start: '10:00', end: '09:00' }
    ]
  };
  assert.equal(Validation.validateImport(badTimePayload).valid, false);

  const badDayPayload = {
    subjects: [{ id: 'subj_1', name: 'Math' }],
    timetable: [
      { id: 'tt_1', subjectId: 'subj_1', day: 6, start: '09:00', end: '10:00' }
    ]
  };
  assert.equal(Validation.validateImport(badDayPayload).valid, false);
});

test('Validation - rejects invalid threshold configuration', () => {
  const badThresholdPayload = {
    subjects: [{ id: 'subj_1', name: 'Math' }],
    settings: { thresholdSafe: 70, thresholdWarn: 75 }
  };
  assert.equal(Validation.validateImport(badThresholdPayload).valid, false);
});

test('Validation - accepts valid payload and reports accurate counts', () => {
  const validPayload = {
    settings: { thresholdSafe: 75, thresholdWarn: 65 },
    subjects: [
      { id: 's1', name: 'Math' },
      { id: 's2', name: 'Physics' }
    ],
    attendance: [
      { id: 'a1', subjectId: 's1', status: 'present', date: '2026-09-01' },
      { id: 'a2', subjectId: 's2', status: 'absent', date: '2026-09-01' }
    ],
    timetable: [
      { id: 't1', subjectId: 's1', day: 0, start: '09:00', end: '10:00' }
    ]
  };
  const res = Validation.validateImport(validPayload);
  assert.equal(res.valid, true);
  assert.deepEqual(res.stats, { subjects: 2, attendance: 2, timetable: 1 });
});
