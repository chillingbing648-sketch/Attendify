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

test('Validation - validateStudent checks roll number range and uniqueness', () => {
  const existingStudents = [
    { id: 'stu_1', rollNumber: 1, name: 'Alice Smith' },
    { id: 'stu_2', rollNumber: 2, name: 'Bob Jones' }
  ];

  // Invalid roll numbers
  assert.equal(Validation.validateStudent({ rollNumber: 'abc', name: 'Charlie', students: existingStudents }).valid, false);
  assert.equal(Validation.validateStudent({ rollNumber: 0, name: 'Charlie', students: existingStudents }).valid, false);
  assert.equal(Validation.validateStudent({ rollNumber: -5, name: 'Charlie', students: existingStudents }).valid, false);
  assert.equal(Validation.validateStudent({ rollNumber: 10000, name: 'Charlie', students: existingStudents }).valid, false);

  // Duplicate roll number for new student
  const dupRes = Validation.validateStudent({ rollNumber: 2, name: 'Charlie', students: existingStudents });
  assert.equal(dupRes.valid, false);
  assert.match(dupRes.errors.rollNumber, /already assigned/);

  // Updating same student with their existing roll number is allowed
  const updateSame = Validation.validateStudent({ rollNumber: 2, name: 'Bob Jones Updated', existingId: 'stu_2', students: existingStudents });
  assert.equal(updateSame.valid, true);

  // Valid new student
  const validRes = Validation.validateStudent({ rollNumber: 3, name: 'Charlie Brown', students: existingStudents });
  assert.equal(validRes.valid, true);
  assert.deepEqual(validRes.errors, {});
});

test('Validation - validateStudent rejects empty or short names', () => {
  assert.equal(Validation.validateStudent({ rollNumber: 5, name: '' }).valid, false);
  assert.equal(Validation.validateStudent({ rollNumber: 5, name: ' ' }).valid, false);
  assert.equal(Validation.validateStudent({ rollNumber: 5, name: 'A' }).valid, false);
  assert.equal(Validation.validateStudent({ rollNumber: 5, name: 'Al' }).valid, true);
});

test('Validation - validateSubject checks name length and uniqueness', () => {
  const existingSubjects = [
    { id: 'sub_1', name: 'Cloud Computing' },
    { id: 'sub_2', name: 'Computer Networks' }
  ];

  // Short or empty name
  assert.equal(Validation.validateSubject({ name: '', subjects: existingSubjects }).valid, false);
  assert.equal(Validation.validateSubject({ name: 'A', subjects: existingSubjects }).valid, false);

  // Duplicate name (case-insensitive)
  const dupRes = Validation.validateSubject({ name: 'cloud computing', subjects: existingSubjects });
  assert.equal(dupRes.valid, false);
  assert.match(dupRes.errors.name, /already exists/i);

  // Updating same subject with its own name is allowed
  const selfUpdate = Validation.validateSubject({ name: 'Cloud Computing', existingId: 'sub_1', subjects: existingSubjects });
  assert.equal(selfUpdate.valid, true);

  // Valid new subject
  const validRes = Validation.validateSubject({ name: 'Artificial Intelligence', subjects: existingSubjects });
  assert.equal(validRes.valid, true);
  assert.deepEqual(validRes.errors, {});
});
