/* ============================================================
   ATTENDIFY — mark-attendance.js
   Unified Attendance Engine:
   • Choice between Lecture Attendance and Practical Attendance
   • Practical: Subject, Experiment Title, Date, Time, 60 Students
   • Lecture: Subject, Date, Time, 60 Students
   • Quick Absent roll entry, Exceptions filter, Undo, and Keyboard shortcuts
   ============================================================ */

const MarkAttendanceView = (() => {
  let selectedSubjectId = '';
  let selectedDate = Utils.todayISO();
  let selectedStartTime = '09:00';
  let selectedSessionType = 'lecture'; // lecture | practical
  let experimentTitle = '';
  let studentStatusMap = {}; // { studentId: 'present' | 'absent' | 'late' | 'unreviewed' }
  let searchQuery = '';
  let activeFilter = 'all'; // all | exceptions | present | absent | late
  let editingSessionId = null;
  let keyboardBound = false;
  let historyStack = [];

  function initSession(sessionId = null, prefillSubjectId = null, prefillTime = null, prefillType = 'lecture') {
    editingSessionId = sessionId;
    historyStack = [];
    const students = State.getAllStudents();
    studentStatusMap = {};

    if (sessionId) {
      const sess = State.getSession(sessionId);
      if (sess) {
        selectedSubjectId = sess.subjectId;
        selectedDate = sess.date;
        selectedStartTime = sess.startTime || '09:00';
        selectedSessionType = sess.type === 'practical' ? 'practical' : 'lecture';
        experimentTitle = sess.experimentTitle || '';
        const recs = State.getRecordsForSession(sessionId);
        recs.forEach(r => { studentStatusMap[r.studentId] = r.status; });
      }
    } else {
      const subjects = State.get().subjects;
      selectedSubjectId = prefillSubjectId || (subjects.length > 0 ? subjects[0].id : '');
      selectedDate = Utils.todayISO();
      selectedStartTime = prefillTime || '09:00';
      selectedSessionType = prefillType || 'lecture';
      experimentTitle = '';

      // Default all 60 students to Present
      students.forEach(s => {
        studentStatusMap[s.id] = 'present';
      });
    }
  }

  function render(containerId = 'view-mark-attendance', prefillSubjectId = null, sessionId = null, prefillTime = null, prefillType = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (sessionId !== null || editingSessionId !== sessionId || Object.keys(studentStatusMap).length === 0 || (prefillType && prefillType !== selectedSessionType)) {
      initSession(sessionId, prefillSubjectId, prefillTime, prefillType);
    }

    const subjects = State.get().subjects;
    const students = State.getAllStudents();

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="view-header">
          <div>
            <h1>Mark Attendance</h1>
            <p class="view-subtitle">SY BSc IT · 60 Students</p>
          </div>
        </div>
        <div class="card empty-state">
          <div class="empty-state-icon">${UI.icon('subjects')}</div>
          <h3>No subjects configured</h3>
          <p>Please configure courses before recording attendance.</p>
          <button class="btn btn-primary" onclick="App.navigateTo('subjects')">Configure Subjects</button>
        </div>
      `;
      return;
    }

    const counts = calculateCounts();
    const isPractical = selectedSessionType === 'practical';

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>${editingSessionId ? 'Edit Attendance Session' : 'Mark Attendance'}</h1>
          <p class="view-subtitle">SY BSc IT · Single Batch · ${students.length} Students</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-outline btn-sm" id="btn-undo-mark" ${historyStack.length === 0 ? 'disabled' : ''} title="Undo last change">
            Undo Last Mark
          </button>
          <button class="btn btn-outline btn-sm" id="btn-quick-all-present">All Present</button>
          <button class="btn btn-outline btn-sm" id="btn-quick-all-absent">All Absent</button>
          <button class="btn btn-outline btn-sm" id="btn-quick-reset">Reset</button>
        </div>
      </div>

      <!-- Segmented Type Switcher: Lecture Attendance vs Practical Attendance -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
        <div class="register-type-segmented">
          <button class="segmented-tab ${!isPractical ? 'active' : ''}" id="tab-type-lecture">
            Lecture Attendance
          </button>
          <button class="segmented-tab ${isPractical ? 'active' : ''}" id="tab-type-practical">
            Practical Attendance
          </button>
        </div>

        <span style="font-size:11.5px; color:var(--ink-secondary);">
          ${isPractical ? 'Recording laboratory session with experiment details' : 'Recording regular classroom theory lecture'}
        </span>
      </div>

      <!-- Quick Absent Entry Bar -->
      <div class="card" style="background:var(--surface); border:1px solid ${isPractical ? 'var(--practical-border)' : 'var(--accent-border)'}; margin-bottom:12px; padding:10px 14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:280px;">
            <span style="font-size:11px; font-weight:700; color:${isPractical ? 'var(--practical)' : 'var(--accent)'}; text-transform:uppercase; letter-spacing:0.04em;">
              ⚡ Quick Absent Entry:
            </span>
            <input type="text" id="quick-roll-input" class="input" style="height:28px; font-size:var(--fs-xs); max-width:320px;" placeholder="e.g. 4, 12, 18, 32, 47">
            <button class="btn btn-primary btn-sm" id="btn-apply-absentees" style="${isPractical ? 'background:var(--practical); border-color:var(--practical);' : ''}">
              Apply Absentees
            </button>
          </div>
          <span style="font-size:11px; color:var(--ink-secondary);">
            Enter absentee roll numbers. All unlisted students remain Present.
          </span>
        </div>
      </div>

      <div class="register-container">
        <!-- Control Bar -->
        <div class="register-bar">
          <div class="register-bar-controls">
            <div class="register-bar-field" style="min-width: 200px;">
              <label for="mark-subject-select">Course / Subject</label>
              <select id="mark-subject-select" class="select">
                ${subjects.map(sub => `
                  <option value="${sub.id}" ${sub.id === selectedSubjectId ? 'selected' : ''}>${Utils.escapeHTML(sub.name)}</option>
                `).join('')}
              </select>
            </div>

            ${isPractical ? `
              <div class="register-bar-field" style="min-width: 220px;">
                <label for="mark-exp-title">Practical / Experiment Title</label>
                <input type="text" id="mark-exp-title" class="input" placeholder="e.g. Practical 04: File Handling" value="${Utils.escapeHTML(experimentTitle)}">
              </div>
            ` : ''}

            <div class="register-bar-field">
              <label for="mark-date-input">Date</label>
              <input type="date" id="mark-date-input" class="input" value="${selectedDate}">
            </div>

            <div class="register-bar-field">
              <label for="mark-time-input">Time</label>
              <input type="time" id="mark-time-input" class="input" value="${selectedStartTime}">
            </div>
          </div>

          <div class="search-box">
            ${UI.icon('search')}
            <input type="text" id="mark-student-search" class="input" placeholder="Filter by roll no. or name..." value="${Utils.escapeHTML(searchQuery)}">
          </div>
        </div>

        <!-- Sticky Live Headcount Bar -->
        <div class="register-counts-sticky">
          <div class="count-pills">
            <span class="pill pill-total">Total: ${students.length}</span>
            <span class="pill pill-present" id="count-present">Present: ${counts.present}</span>
            <span class="pill pill-absent" id="count-absent">Absent: ${counts.absent}</span>
            <span class="pill pill-late" id="count-late">Late: ${counts.late}</span>
          </div>

          <div style="display:flex; gap:4px;">
            <button class="btn btn-sm ${activeFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}" data-filter="all">All (${students.length})</button>
            <button class="btn btn-sm ${activeFilter === 'exceptions' ? 'btn-secondary' : 'btn-ghost'}" data-filter="exceptions" title="Show only Absentees & Late students">
              Exceptions (${counts.absent + counts.late})
            </button>
            <button class="btn btn-sm ${activeFilter === 'absent' ? 'btn-secondary' : 'btn-ghost'}" data-filter="absent">Absentees (${counts.absent})</button>
            <button class="btn btn-sm ${activeFilter === 'late' ? 'btn-secondary' : 'btn-ghost'}" data-filter="late">Late (${counts.late})</button>
          </div>
        </div>

        <!-- 60-Student Register Table -->
        <div class="table-wrap">
          <table class="data-table" id="attendance-register-table">
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">#</th>
                <th style="width: 80px;">Roll No</th>
                <th>Student Name</th>
                <th style="width: 140px; text-align: center;">Status (P / A / L)</th>
              </tr>
            </thead>
            <tbody>
              ${renderStudentRows(students)}
            </tbody>
          </table>
        </div>

        <!-- Sticky Footer Summary & Save -->
        <div class="register-footer">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:var(--fs-sm); font-weight:650; color:var(--ink);">
              Reconciled: ${counts.present} Present · ${counts.absent} Absent · ${counts.late} Late
            </span>
            <span style="font-size:var(--fs-xs); color:var(--ink-secondary); font-weight:500;">
              (${Utils.safePercent(counts.present + counts.late, students.length)}% Turnout)
            </span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline" id="btn-cancel-mark" onclick="App.navigateTo('dashboard')">Cancel</button>
            <button class="btn btn-primary" id="btn-save-attendance" style="${isPractical ? 'background:var(--practical); border-color:var(--practical);' : ''}">
              ${UI.icon('check')} Save ${isPractical ? 'Practical' : 'Lecture'} Session
            </button>
          </div>
        </div>
      </div>
    `;

    bindEvents(container);
    initKeyboardShortcuts();
  }

  function renderStudentRows(students) {
    let filtered = students;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(q) || 
        String(s.rollNumber).includes(q)
      );
    }

    if (activeFilter === 'exceptions') {
      filtered = filtered.filter(s => {
        const st = studentStatusMap[s.id];
        return st === 'absent' || st === 'late';
      });
    } else if (activeFilter !== 'all') {
      filtered = filtered.filter(s => studentStatusMap[s.id] === activeFilter);
    }

    if (filtered.length === 0) {
      return `
        <tr>
          <td colspan="4" style="text-align:center; padding: 24px; color:var(--ink-secondary);">
            No students match the active filter or query.
          </td>
        </tr>
      `;
    }

    return filtered.map((stu, idx) => {
      const status = studentStatusMap[stu.id] || 'present';
      return `
        <tr data-student-id="${stu.id}" tabindex="0" class="register-row ${status === 'absent' ? 'row-absent' : ''}">
          <td style="color:var(--ink-tertiary); text-align: center; font-variant-numeric: tabular-nums; font-size: 11px;">
            ${String(idx + 1).padStart(2, '0')}
          </td>
          <td>
            <span style="font-weight: 700; color:var(--ink); font-variant-numeric: tabular-nums;">
              ${stu.rollNumber}
            </span>
          </td>
          <td>
            <div style="font-weight: 550; color:var(--ink);">${Utils.escapeHTML(stu.name)}</div>
          </td>
          <td style="text-align: center;">
            <div class="status-btn-group" data-student-id="${stu.id}">
              <button type="button" class="status-btn ${status === 'present' ? 'active-present' : ''}" data-val="present" title="Present (P)">P</button>
              <button type="button" class="status-btn ${status === 'absent' ? 'active-absent' : ''}" data-val="absent" title="Absent (A)">A</button>
              <button type="button" class="status-btn ${status === 'late' ? 'active-late' : ''}" data-val="late" title="Late (L)">L</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function calculateCounts() {
    const vals = Object.values(studentStatusMap);
    const present = vals.filter(v => v === 'present').length;
    const absent = vals.filter(v => v === 'absent').length;
    const late = vals.filter(v => v === 'late').length;
    return { present, absent, late, total: vals.length };
  }

  function updateLivePills() {
    const counts = calculateCounts();
    const p = document.getElementById('count-present');
    const a = document.getElementById('count-absent');
    const l = document.getElementById('count-late');
    if (p) p.textContent = `Present: ${counts.present}`;
    if (a) a.textContent = `Absent: ${counts.absent}`;
    if (l) l.textContent = `Late: ${counts.late}`;
    const undoBtn = document.getElementById('btn-undo-mark');
    if (undoBtn) undoBtn.disabled = historyStack.length === 0;
  }

  function setStudentStatus(stuId, newStatus, recordHistory = true) {
    if (recordHistory) {
      historyStack.push({ studentId: stuId, prevStatus: studentStatusMap[stuId] || 'present' });
    }
    studentStatusMap[stuId] = newStatus;
  }

  function bindEvents(container) {
    // Segmented Type Switcher
    const tabLecture = container.querySelector('#tab-type-lecture');
    const tabPractical = container.querySelector('#tab-type-practical');
    if (tabLecture) {
      tabLecture.addEventListener('click', () => {
        selectedSessionType = 'lecture';
        render('view-mark-attendance', selectedSubjectId, editingSessionId, selectedStartTime, 'lecture');
      });
    }
    if (tabPractical) {
      tabPractical.addEventListener('click', () => {
        selectedSessionType = 'practical';
        render('view-mark-attendance', selectedSubjectId, editingSessionId, selectedStartTime, 'practical');
      });
    }

    const subSel = container.querySelector('#mark-subject-select');
    if (subSel) subSel.addEventListener('change', (e) => { selectedSubjectId = e.target.value; });

    const expInput = container.querySelector('#mark-exp-title');
    if (expInput) expInput.addEventListener('input', (e) => { experimentTitle = e.target.value; });

    const dateInp = container.querySelector('#mark-date-input');
    if (dateInp) dateInp.addEventListener('change', (e) => { selectedDate = e.target.value; });

    const timeInp = container.querySelector('#mark-time-input');
    if (timeInp) timeInp.addEventListener('change', (e) => { selectedStartTime = e.target.value; });

    const searchInp = container.querySelector('#mark-student-search');
    if (searchInp) {
      searchInp.addEventListener('input', Utils.debounce((e) => {
        searchQuery = e.target.value;
        refreshTable(container);
      }, 120));
    }

    // Quick Absent Roll Numbers
    const applyAbsentBtn = container.querySelector('#btn-apply-absentees');
    const quickRollInput = container.querySelector('#quick-roll-input');
    if (applyAbsentBtn && quickRollInput) {
      applyAbsentBtn.addEventListener('click', () => {
        applyQuickAbsent(quickRollInput.value);
      });
      quickRollInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyQuickAbsent(quickRollInput.value);
        }
      });
    }

    // Undo action
    const undoBtn = container.querySelector('#btn-undo-mark');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (historyStack.length === 0) return;
        const last = historyStack.pop();
        studentStatusMap[last.studentId] = last.prevStatus;
        refreshTable(container);
        updateLivePills();
        UI.toast('Undid last mark', 'info', 1000);
      });
    }

    container.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        render('view-mark-attendance', selectedSubjectId, editingSessionId, selectedStartTime, selectedSessionType);
      });
    });

    const allP = container.querySelector('#btn-quick-all-present');
    if (allP) {
      allP.addEventListener('click', () => {
        State.getAllStudents().forEach(s => { setStudentStatus(s.id, 'present', false); });
        historyStack = [];
        render('view-mark-attendance', selectedSubjectId, editingSessionId, selectedStartTime, selectedSessionType);
        UI.toast('All 60 students marked Present', 'info', 1500);
      });
    }

    const allA = container.querySelector('#btn-quick-all-absent');
    if (allA) {
      allA.addEventListener('click', () => {
        State.getAllStudents().forEach(s => { setStudentStatus(s.id, 'absent', false); });
        historyStack = [];
        render('view-mark-attendance', selectedSubjectId, editingSessionId, selectedStartTime, selectedSessionType);
        UI.toast('All 60 students marked Absent', 'info', 1500);
      });
    }

    const resetBtn = container.querySelector('#btn-quick-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        initSession(editingSessionId, selectedSubjectId, selectedStartTime, selectedSessionType);
        render('view-mark-attendance', selectedSubjectId, editingSessionId, selectedStartTime, selectedSessionType);
        UI.toast('Register reset to default', 'info', 1500);
      });
    }

    container.querySelector('#attendance-register-table').addEventListener('click', (e) => {
      const btn = e.target.closest('.status-btn');
      if (!btn) return;
      const group = btn.closest('.status-btn-group');
      const stuId = group.dataset.studentId;
      const newStatus = btn.dataset.val;

      setStudentStatus(stuId, newStatus, true);

      group.querySelectorAll('.status-btn').forEach(b => { b.className = 'status-btn'; });
      btn.classList.add(`active-${newStatus}`);

      updateLivePills();
    });

    const saveBtn = container.querySelector('#btn-save-attendance');
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
  }

  function applyQuickAbsent(inputStr) {
    if (!inputStr.trim()) return;
    const tokens = inputStr.split(/[\s,]+/).map(t => parseInt(t.trim(), 10)).filter(n => !isNaN(n));
    if (tokens.length === 0) {
      UI.toast('Please enter valid roll numbers', 'error');
      return;
    }

    const absentSet = new Set(tokens);
    const students = State.getAllStudents();
    let markedCount = 0;

    students.forEach(s => {
      if (absentSet.has(s.rollNumber)) {
        setStudentStatus(s.id, 'absent', false);
        markedCount++;
      } else {
        setStudentStatus(s.id, 'present', false);
      }
    });

    historyStack = [];
    render('view-mark-attendance', selectedSubjectId, editingSessionId, selectedStartTime, selectedSessionType);
    UI.toast(`Applied: ${markedCount} Absent, ${students.length - markedCount} Present`, 'success', 2500);
  }

  function initKeyboardShortcuts() {
    if (keyboardBound) return;
    keyboardBound = true;

    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const view = App.getCurrentView();
      if (view !== 'mark-attendance') return;

      const key = e.key.toUpperCase();
      if (['P', 'A', 'L'].includes(key)) {
        const row = document.activeElement ? document.activeElement.closest('.register-row') : null;
        if (row) {
          const stuId = row.dataset.studentId;
          const status = key === 'P' ? 'present' : key === 'A' ? 'absent' : 'late';
          setStudentStatus(stuId, status, true);

          const group = row.querySelector('.status-btn-group');
          if (group) {
            group.querySelectorAll('.status-btn').forEach(b => { b.className = 'status-btn'; });
            const activeBtn = group.querySelector(`[data-val="${status}"]`);
            if (activeBtn) activeBtn.classList.add(`active-${status}`);
          }
          updateLivePills();
          e.preventDefault();
        }
      }
    });
  }

  function refreshTable(container) {
    const tbody = container.querySelector('#attendance-register-table tbody');
    if (tbody) tbody.innerHTML = renderStudentRows(State.getAllStudents());
  }

  function handleSave() {
    if (!selectedSubjectId) {
      UI.toast('Please select a course', 'error');
      return;
    }

    if (!editingSessionId) {
      const dupe = State.findDuplicateSession(selectedSubjectId, selectedDate, selectedStartTime);
      if (dupe) {
        UI.confirmDialog({
          title: 'Duplicate Session Detected',
          message: 'An attendance session for this course, date and time already exists. Overwrite records?',
          confirmLabel: 'Overwrite Records',
          danger: true
        }).then(ok => {
          if (ok) commitSave(dupe.id);
        });
        return;
      }
    }
    commitSave(editingSessionId);
  }

  function commitSave(sessionId) {
    let sessId = sessionId;
    if (!sessId) {
      const sess = State.createSession({
        subjectId: selectedSubjectId,
        date: selectedDate,
        startTime: selectedStartTime,
        type: selectedSessionType,
        experimentTitle: experimentTitle
      });
      sessId = sess.id;
    } else {
      State.updateSession(sessId, {
        subjectId: selectedSubjectId,
        date: selectedDate,
        startTime: selectedStartTime,
        type: selectedSessionType,
        experimentTitle: experimentTitle
      });
    }

    State.saveRecords(sessId, studentStatusMap);

    const counts = calculateCounts();
    UI.toast(`Saved ${selectedSessionType === 'practical' ? 'Practical' : 'Lecture'}: ${counts.present} Present, ${counts.absent} Absent`, 'success');
    
    editingSessionId = null;
    historyStack = [];
    App.navigateTo('history');
  }

  return { render, initSession };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MarkAttendanceView;
