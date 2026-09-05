/* ============================================================
   ATTENDIFY — storage.js (v2 — SY BSc IT Admin State Model)
   LocalStorage persistence with backup-key rotation.
   ============================================================ */
const Storage = (() => {
  const KEY = 'attendify:v2';
  const BACKUP = 'attendify:v2:backup';
  const OLD_KEY = 'attendify:v1';

  function defaultState() {
    return {
      version: 2,
      settings: {
        className: 'SY BSc IT',
        batchName: 'Single Batch (60 Students)',
        thresholdSafe: 75,
        thresholdWarn: 65,
        theme: 'light',
        adminName: 'Faculty / Admin'
      },
      students: [],
      subjects: [],
      sessions: [],   // { id, subjectId, date, startTime, type: 'theory'|'practical', experimentTitle, createdAt, updatedAt }
      records: [],    // { id, sessionId, studentId, status: 'present'|'absent'|'late'|'unreviewed' }
      timetable: [],  // { id, day: 0..5, start, end, subjectId, room, type }
      notifications: [],
      meta: { createdAt: new Date().toISOString(), lastOpenedAt: new Date().toISOString(), seeded: false }
    };
  }

  function seedStudents() {
    const names = [
      'Andre Harshad Balu','Ansari Farman Lukman','Behera Shubham Binod',
      'Chaurasiya Shivanshu Ashok','Chendvankar Tanishq Abhijit','Choursia Shraddha Madreshkumar',
      'Dudaye Shubham Pandurang','Gupta Himanshu Laxmikant','Gupta Nikhil Ganesh',
      'Gupta Raj Omprakash','Gurav Shreya Prakash','Jaiswal Khushi Dashrath',
      'Jaiswal Prince Dharmendra','Kottilaparambil Suvidh Sunil','Kushwaha Vinit Vidyanand',
      'Mishra Shashank Sureshkumar','Nesamoney Cinderella Jaiross','Pal Aryan Naveen',
      'Pal Ashish Ramavadh','Pal Laxmi Kapildev','Pandey Sharad Umeshchandra',
      'Rajput Prachi Narsing','Reddi Mahesh Chandranna','Sawant Narayan Manohar',
      'Sharma Abhay Chandrika','Sharma Kartike Sunil','Shevale Pratham Dryaneshwar',
      'Singh Aniket Rajesh','Singh Anurag Kush','Singh Aryan Sanjay',
      'Singh Bablu Kumar Santosh Kumar','Singh Janvi Anil','Singh Noel Damer',
      'Singh Sachi Ashutosh','Singh Sandhya Amarnath','Singh Vikash Kumar Laxman',
      'Yadav Pooja Om Prakash','Yadav Prince Virendrakumar','Yadav Vivek Rudra',
      'Yadav Yogank Ashok','Mishra Aditya Rajesh','Pardhe Harshit Chandrakant',
      'Jaiswal Moksh Rajkumar','Ghadigaonkar Maithili Mahesh','Pal Sanjana Rajendra',
      'Tiwari Pavan Awadesh','Thorat Kaustubh Ramesh','Makwana Ayushi Nilesh',
      'Dubey Harsh Puneet','Mourya Ansh Deenanath','Morye Mihir Mangesh',
      'Pandey Sakshi','Uttam Tripathi','Anchal Jaiswar',
      'Harshit Tiwari','Shivam Patel','Shivansu Mishra',
      'Abhay Yadav','Mahek Pandya','Abhishek Yadav'
    ];
    return names.map((name, i) => ({
      id: 'stu_' + (i + 1),
      rollNumber: i + 1,
      name: name,
      active: true
    }));
  }

  function seedSubjects() {
    const ts = new Date().toISOString();
    return [
      { id: 'subj_1', name: 'Web Designing', teacher: 'Prof. Sharma', room: 'Lab 2', color: '#4F46E5', createdAt: ts },
      { id: 'subj_2', name: 'Object Oriented Programming (C++)', teacher: 'Dr. Rao', room: 'Lab 1', color: '#059669', createdAt: ts },
      { id: 'subj_3', name: 'PL/SQL', teacher: 'Prof. Nair', room: 'Lab 3', color: '#D97706', createdAt: ts },
      { id: 'subj_4', name: 'Fundamentals of Python Programming', teacher: 'Dr. Mehta', room: 'Lab 2', color: '#7C3AED', createdAt: ts },
      { id: 'subj_5', name: 'Assembly Language Programming', teacher: 'Prof. Gupta', room: 'Lab 1', color: '#DC2626', createdAt: ts },
      { id: 'subj_6', name: 'Environmental Management', teacher: 'Dr. Verma', room: 'Room 204', color: '#0891B2', createdAt: ts }
    ];
  }

  function seedTimetable() {
    // Standard Mon-Fri timetable for SY BSc IT
    return [
      { id: 'tt_1', day: 0, start: '09:00', end: '10:00', subjectId: 'subj_1', room: 'Lab 2', type: 'theory' },
      { id: 'tt_2', day: 0, start: '10:15', end: '12:15', subjectId: 'subj_2', room: 'Lab 1', type: 'practical' },
      { id: 'tt_3', day: 1, start: '09:00', end: '10:00', subjectId: 'subj_3', room: 'Lab 3', type: 'theory' },
      { id: 'tt_4', day: 1, start: '10:15', end: '12:15', subjectId: 'subj_4', room: 'Lab 2', type: 'practical' },
      { id: 'tt_5', day: 2, start: '09:00', end: '10:00', subjectId: 'subj_5', room: 'Lab 1', type: 'theory' },
      { id: 'tt_6', day: 2, start: '10:15', end: '11:15', subjectId: 'subj_6', room: 'Room 204', type: 'theory' },
      { id: 'tt_7', day: 3, start: '09:00', end: '11:00', subjectId: 'subj_1', room: 'Lab 2', type: 'practical' },
      { id: 'tt_8', day: 4, start: '09:00', end: '11:00', subjectId: 'subj_3', room: 'Lab 3', type: 'practical' }
    ];
  }

  function seededState() {
    const s = defaultState();
    s.students = seedStudents();
    s.subjects = seedSubjects();
    s.timetable = seedTimetable();
    s.meta.seeded = true;
    return s;
  }

  function getStorage() {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
    return null;
  }

  function isAvailable() {
    try {
      const s = getStorage();
      if (!s) return false;
      const t = '__attendify_test__';
      s.setItem(t, '1');
      s.removeItem(t);
      return true;
    } catch { return false; }
  }

  let memoryFallback = null;

  function load() {
    const s = getStorage();
    if (!s || !isAvailable()) {
      memoryFallback = memoryFallback || seededState();
      return { state: memoryFallback, recovered: false, usedFallback: true };
    }

    // Check primary v2 or v1 keys
    let raw = s.getItem(KEY);
    let backupRaw = s.getItem(BACKUP);
    let isV1Only = false;

    if (!raw && !backupRaw) {
      const oldRaw = s.getItem(OLD_KEY);
      const oldBkp = s.getItem(OLD_KEY + ':backup');
      if (oldRaw || oldBkp) {
        raw = oldRaw;
        backupRaw = oldBkp;
        isV1Only = true;
      }
    }

    let recovered = false;

    if (!raw && backupRaw) {
      raw = backupRaw;
      recovered = true;
    }

    if (!raw) {
      const fresh = seededState();
      save(fresh);
      return { state: fresh, recovered: false, usedFallback: false };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (backupRaw) {
        try {
          parsed = JSON.parse(backupRaw);
          recovered = true;
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      // Primary and backup were corrupted; fall back to clean state
      const fresh = defaultState();
      save(fresh);
      return { state: fresh, recovered: true, usedFallback: false };
    }

    if (isV1Only && parsed && !parsed.version) {
      // Legacy format loaded
      if (!Array.isArray(parsed.subjects)) parsed.subjects = [];
      if (!Array.isArray(parsed.attendance)) parsed.attendance = [];
      if (!Array.isArray(parsed.timetable)) parsed.timetable = [];
      if (!Array.isArray(parsed.notifications)) parsed.notifications = [];
      return { state: parsed, recovered, usedFallback: false };
    }

    ['students','subjects','sessions','records','timetable','notifications'].forEach(k => {
      if (!Array.isArray(parsed[k])) parsed[k] = [];
    });
    if (!parsed.settings) parsed.settings = defaultState().settings;
    if (!parsed.meta) parsed.meta = defaultState().meta;

    // Ensure timetable is present if empty in normal v2 usage
    if (parsed.timetable.length === 0 && parsed.students.length > 0) {
      parsed.timetable = seedTimetable();
    }

    return { state: parsed, recovered, usedFallback: false };
  }

  function save(data) {
    if (memoryFallback) { memoryFallback = data; return; }
    const s = getStorage();
    if (!s || !isAvailable()) return;
    try {
      // Rotate and save primary v2
      const current = s.getItem(KEY);
      if (current) s.setItem(BACKUP, current);
      s.setItem(KEY, JSON.stringify(data));

      // Also maintain v1 rotation for compatibility
      const oldCurrent = s.getItem(OLD_KEY);
      if (oldCurrent) s.setItem(OLD_KEY + ':backup', oldCurrent);
      s.setItem(OLD_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Storage.save failed:', e);
    }
  }

  return { defaultState, seededState, seedStudents, seedSubjects, seedTimetable, load, save, isAvailable };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Storage;
