/* ============================================================
   ATTENDIFY — practical-reports.js
   FIRST-CLASS FEATURE: SY BSc IT Practical & Laboratory Reports
   Workflows:
   • Subject-wise practical report
   • Single experiment / session report
   • Student-wise practical report
   • Complete batch practical summary
   Clean academic document styling, review, print, and CSV export.
   ============================================================ */

const PracticalReportsView = (() => {
  let reportType = 'session'; // 'session' | 'subject' | 'student' | 'batch'
  let selectedSubjectId = '';
  let selectedSessionId = '';
  let selectedStudentId = '';
  let dateFrom = '';
  let dateTo = '';

  function render(containerId = 'view-practical-reports') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const subjects = State.get().subjects;
    const practicalSessions = State.getPracticalSessions();
    const students = State.getAllStudents();

    if (!selectedSubjectId && subjects.length > 0) {
      selectedSubjectId = subjects[0].id;
    }

    const filteredSessions = practicalSessions.filter(s => s.subjectId === selectedSubjectId);
    if (!selectedSessionId && filteredSessions.length > 0) {
      selectedSessionId = filteredSessions[0].id;
    }

    if (!selectedStudentId && students.length > 0) {
      selectedStudentId = students[0].id;
    }

    const activeSession = State.getSession(selectedSessionId);
    const activeSubject = State.getSubject(selectedSubjectId);
    const activeStudent = State.getStudent(selectedStudentId);

    container.innerHTML = `
      <div class="view-header no-print">
        <div>
          <h1>Practical Reports</h1>
          <p class="view-subtitle">SY BSc IT · Laboratory Sessions, Journal Verifications & Experiment Ledgers</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-outline" id="btn-print-practical" title="Print official academic ledger">
            ${UI.icon('inbox')} Print Document
          </button>
          <button class="btn btn-primary" id="btn-export-practical-csv">
            ${UI.icon('download')} Export Report CSV
          </button>
        </div>
      </div>

      <!-- Mode Selector & Filter Bar (No Print) -->
      <div class="card no-print section" style="padding:12px 14px; background:var(--surface);">
        <div style="display:flex; flex-direction:column; gap:12px;">
          <!-- Segmented Mode Tabs -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div class="register-type-segmented">
              <button class="segmented-tab ${reportType === 'session' ? 'active' : ''}" data-pr-type="session">
                Experiment Session Report
              </button>
              <button class="segmented-tab ${reportType === 'subject' ? 'active' : ''}" data-pr-type="subject">
                Subject-wise Practical Report
              </button>
              <button class="segmented-tab ${reportType === 'student' ? 'active' : ''}" data-pr-type="student">
                Student-wise Practical Report
              </button>
              <button class="segmented-tab ${reportType === 'batch' ? 'active' : ''}" data-pr-type="batch">
                Complete Batch Summary
              </button>
            </div>
            <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSlot('${selectedSubjectId}', '10:15', 'practical')">
              ${UI.icon('plus')} Mark New Practical
            </button>
          </div>

          <!-- Dynamic Filter Controls depending on report type -->
          <div style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
            ${(reportType === 'session' || reportType === 'subject') ? `
              <div class="register-bar-field" style="min-width:200px;">
                <label>Laboratory Subject</label>
                <select id="pr-subject-select" class="select">
                  ${subjects.map(sub => `
                    <option value="${sub.id}" ${sub.id === selectedSubjectId ? 'selected' : ''}>${Utils.escapeHTML(sub.name)}</option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            ${reportType === 'session' ? `
              <div class="register-bar-field" style="min-width:280px;">
                <label>Practical / Experiment Session</label>
                <select id="pr-session-select" class="select" ${filteredSessions.length === 0 ? 'disabled' : ''}>
                  ${filteredSessions.length === 0 ? '<option value="">No practical sessions logged yet</option>' : ''}
                  ${filteredSessions.map(sess => `
                    <option value="${sess.id}" ${sess.id === selectedSessionId ? 'selected' : ''}>
                      ${Utils.formatDate(sess.date)} (${sess.startTime || '09:00'}) ${sess.experimentTitle ? '— ' + Utils.escapeHTML(sess.experimentTitle) : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            ${reportType === 'student' ? `
              <div class="register-bar-field" style="min-width:260px;">
                <label>Select Student</label>
                <select id="pr-student-select" class="select">
                  ${students.map(s => `
                    <option value="${s.id}" ${s.id === selectedStudentId ? 'selected' : ''}>Roll ${s.rollNumber} — ${Utils.escapeHTML(s.name)}</option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            <div class="register-bar-field">
              <label>From Date</label>
              <input type="date" id="pr-date-from" class="input" value="${dateFrom}">
            </div>

            <div class="register-bar-field">
              <label>To Date</label>
              <input type="date" id="pr-date-to" class="input" value="${dateTo}">
            </div>

            <button class="btn btn-ghost btn-sm" id="pr-reset-dates" style="margin-bottom:2px;">Clear Dates</button>
          </div>
        </div>
      </div>

      <!-- Printable Professional Academic Document -->
      <div class="card practical-document" id="practical-print-area" style="background:#FFFFFF; border:1px solid var(--border-strong); box-shadow:var(--shadow-sm); padding:24px; margin-bottom:24px;">
        ${renderAcademicReportContent({ reportType, activeSubject, activeSession, activeStudent, practicalSessions, students })}
      </div>
    `;

    bindEvents(container);
  }

  function renderAcademicReportContent({ reportType, activeSubject, activeSession, activeStudent, practicalSessions, students }) {
    if (reportType === 'session') {
      return renderSingleSessionDocument(activeSubject, activeSession, students);
    } else if (reportType === 'subject') {
      return renderSubjectWiseDocument(activeSubject, practicalSessions, students);
    } else if (reportType === 'student') {
      return renderStudentWiseDocument(activeStudent, practicalSessions);
    } else {
      return renderCompleteBatchDocument(practicalSessions, students);
    }
  }

  function renderSingleSessionDocument(subject, session, students) {
    if (!session) {
      return `
        <div class="empty-state" style="padding:40px 16px;">
          <div class="empty-state-icon">${UI.icon('bookOpen')}</div>
          <h3>No Practical Session Selected</h3>
          <p>Select or mark a practical session for this course to generate the laboratory attendance ledger.</p>
          <button class="btn btn-primary" onclick="App.openMarkChoiceModal()">Mark Practical Attendance</button>
        </div>
      `;
    }

    const recs = State.getRecordsForSession(session.id);
    const recMap = {};
    recs.forEach(r => { recMap[r.studentId] = r.status; });

    const studentRecords = students.map(s => ({
      student: s,
      status: recMap[s.id] || 'unmarked'
    }));

    const present = studentRecords.filter(r => r.status === 'present').length;
    const absent = studentRecords.filter(r => r.status === 'absent').length;
    const late = studentRecords.filter(r => r.status === 'late').length;
    const pct = Utils.safePercent(present + late, students.length);

    return `
      <!-- Official Academic Header -->
      <div style="border-bottom:2px solid var(--ink); padding-bottom:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink-secondary);">
            DEPARTMENT OF INFORMATION TECHNOLOGY · ACADEMIC LEDGER
          </div>
          <h2 style="font-size:18px; font-weight:800; color:var(--ink); letter-spacing:-0.02em; margin-top:2px;">
            PRACTICAL & EXPERIMENT ATTENDANCE RECORD
          </h2>
          <div style="font-size:12px; color:var(--ink-secondary); margin-top:2px;">
            Class: <strong>SY BSc IT</strong> · Batch: <strong>Single Batch (60 Students)</strong>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="badge badge-neutral" style="font-size:11px;">Official Document</div>
          <div style="font-size:11px; color:var(--ink-secondary); margin-top:4px;">
            Date: <strong>${Utils.formatDate(session.date)}</strong>
          </div>
        </div>
      </div>

      <!-- Session Meta Details -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; background:var(--surface-subtle); padding:10px 14px; border-radius:var(--r-md); border:1px solid var(--border); margin-bottom:18px;">
        <div>
          <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Course</div>
          <div style="font-weight:700; font-size:13px; color:var(--ink);">${subject ? Utils.escapeHTML(subject.name) : 'Practical Lab'}</div>
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Experiment Title</div>
          <div style="font-weight:600; font-size:13px; color:var(--ink);">${session.experimentTitle ? Utils.escapeHTML(session.experimentTitle) : 'Regular Lab Session'}</div>
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Lab Timing</div>
          <div style="font-weight:600; font-size:13px; color:var(--ink);">${session.startTime || '09:00'} · ${subject ? subject.room || 'Lab' : 'Lab'}</div>
        </div>
        <div>
          <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Lab Turnout</div>
          <div style="font-weight:700; font-size:13px; color:${pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
            ${pct}% (${present + late}/${students.length})
          </div>
        </div>
      </div>

      <!-- Academic Ledger Table -->
      <div class="table-wrap" style="border:1px solid var(--border-strong);">
        <table class="data-table" style="font-size:12px;">
          <thead>
            <tr style="background:var(--surface-subtle);">
              <th style="width:40px; text-align:center;">#</th>
              <th style="width:75px;">Roll No</th>
              <th>Student Name</th>
              <th style="width:95px; text-align:center;">Status</th>
              <th style="width:140px; text-align:center;">Lab Signature / Verification</th>
            </tr>
          </thead>
          <tbody>
            ${studentRecords.map((r, i) => {
              const isPresent = r.status === 'present';
              const isLate = r.status === 'late';
              return `
                <tr>
                  <td style="text-align:center; color:var(--ink-tertiary); font-variant-numeric:tabular-nums; font-size:11px;">
                    ${String(i + 1).padStart(2, '0')}
                  </td>
                  <td><strong>${r.student.rollNumber}</strong></td>
                  <td><div style="font-weight:600; color:var(--ink);">${Utils.escapeHTML(r.student.name)}</div></td>
                  <td style="text-align:center;">
                    <span class="badge ${isPresent ? 'badge-safe' : isLate ? 'badge-warn' : 'badge-critical'}">
                      ${r.status.toUpperCase()}
                    </span>
                  </td>
                  <td style="text-align:center; color:var(--ink-tertiary); font-family:var(--font-mono); font-size:11px;">
                    ${isPresent || isLate ? '[ Verified ✓ ]' : '—'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Footer & Signature -->
      <div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="font-size:11px; color:var(--ink-secondary); line-height:1.6;">
          <strong>Batch Summary:</strong> Total: 60 · Present: ${present} · Absent: ${absent} · Late: ${late} · Attendance: ${pct}%<br>
          Report generated on: ${Utils.formatDate(new Date())} via Attendify Portal
        </div>
        <div style="text-align:center; min-width:180px;">
          <div style="height:38px; border-bottom:1px solid var(--ink); margin-bottom:4px;"></div>
          <div style="font-size:11px; font-weight:650; color:var(--ink);">Faculty In-Charge Signature</div>
          <div style="font-size:10px; color:var(--ink-tertiary);">${subject ? subject.teacher || 'Department Faculty' : ''}</div>
        </div>
      </div>
    `;
  }

  function renderSubjectWiseDocument(subject, practicalSessions, students) {
    let sessions = practicalSessions.filter(s => s.subjectId === (subject ? subject.id : ''));
    if (dateFrom) sessions = sessions.filter(s => s.date >= dateFrom);
    if (dateTo) sessions = sessions.filter(s => s.date <= dateTo);

    return `
      <div style="border-bottom:2px solid var(--ink); padding-bottom:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink-secondary);">
            DEPARTMENT OF INFORMATION TECHNOLOGY · ACADEMIC LEDGER
          </div>
          <h2 style="font-size:18px; font-weight:800; color:var(--ink); letter-spacing:-0.02em; margin-top:2px;">
            SUBJECT PRACTICAL ATTENDANCE LEDGER
          </h2>
          <div style="font-size:12px; color:var(--ink-secondary); margin-top:2px;">
            Course: <strong>${subject ? Utils.escapeHTML(subject.name) : 'Course'}</strong> · Class: <strong>SY BSc IT (60 Students)</strong>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="badge badge-neutral">Subject Ledger</div>
          <div style="font-size:11px; color:var(--ink-secondary); margin-top:4px;">
            Total Practicals: <strong>${sessions.length}</strong>
          </div>
        </div>
      </div>

      <div class="table-wrap" style="border:1px solid var(--border-strong);">
        <table class="data-table" style="font-size:12px;">
          <thead>
            <tr style="background:var(--surface-subtle);">
              <th style="width:40px; text-align:center;">#</th>
              <th style="width:70px;">Roll No</th>
              <th>Student Name</th>
              <th style="width:90px; text-align:center;">Attended</th>
              <th style="width:80px; text-align:center;">Missed</th>
              <th style="width:80px; text-align:center;">Total Labs</th>
              <th style="width:110px; text-align:center;">Attendance %</th>
              <th style="width:90px; text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, idx) => {
              const recs = State.getRecordsForStudentAndSubject(s.id, subject.id)
                .filter(r => sessions.some(sess => sess.id === r.sessionId));
              const present = recs.filter(r => r.status === 'present' || r.status === 'late').length;
              const absent = recs.filter(r => r.status === 'absent').length;
              const total = recs.length;
              const pct = Utils.safePercent(present, total);
              const isSafe = pct >= 75;
              return `
                <tr>
                  <td style="text-align:center; color:var(--ink-tertiary); font-size:11px;">${idx + 1}</td>
                  <td><strong>${s.rollNumber}</strong></td>
                  <td><div style="font-weight:600; color:var(--ink);">${Utils.escapeHTML(s.name)}</div></td>
                  <td style="text-align:center; color:var(--safe); font-weight:600;">${present}</td>
                  <td style="text-align:center; color:var(--critical); font-weight:600;">${absent}</td>
                  <td style="text-align:center;">${total}</td>
                  <td style="text-align:center;"><strong>${total > 0 ? pct + '%' : '—'}</strong></td>
                  <td style="text-align:center;">
                    <span class="badge ${total === 0 ? 'badge-neutral' : isSafe ? 'badge-safe' : 'badge-critical'}">
                      ${total > 0 ? (isSafe ? 'ELIGIBLE' : 'DEFAULTER') : '—'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="font-size:11px; color:var(--ink-secondary); line-height:1.6;">
          Report period: ${dateFrom ? Utils.formatDate(dateFrom) : 'Semester Start'} to ${dateTo ? Utils.formatDate(dateTo) : 'Current Date'}<br>
          Official ledger generated on: ${Utils.formatDate(new Date())}
        </div>
        <div style="text-align:center; min-width:180px;">
          <div style="height:38px; border-bottom:1px solid var(--ink); margin-bottom:4px;"></div>
          <div style="font-size:11px; font-weight:650; color:var(--ink);">Head of Department Signature</div>
        </div>
      </div>
    `;
  }

  function renderStudentWiseDocument(student, practicalSessions) {
    if (!student) return '';
    const studentRecords = State.getRecordsForStudent(student.id);
    const recMap = {};
    studentRecords.forEach(r => { recMap[r.sessionId] = r.status; });

    let sessions = practicalSessions.filter(s => recMap[s.id] !== undefined);
    if (dateFrom) sessions = sessions.filter(s => s.date >= dateFrom);
    if (dateTo) sessions = sessions.filter(s => s.date <= dateTo);

    const attended = sessions.filter(s => recMap[s.id] === 'present' || recMap[s.id] === 'late').length;
    const total = sessions.length;
    const pct = Utils.safePercent(attended, total);

    return `
      <div style="border-bottom:2px solid var(--ink); padding-bottom:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink-secondary);">
            DEPARTMENT OF INFORMATION TECHNOLOGY · INDIVIDUAL PRACTICAL DOSSIER
          </div>
          <h2 style="font-size:18px; font-weight:800; color:var(--ink); letter-spacing:-0.02em; margin-top:2px;">
            STUDENT LABORATORY RECORD
          </h2>
          <div style="font-size:12px; color:var(--ink-secondary); margin-top:2px;">
            Student: <strong>Roll No. ${student.rollNumber} — ${Utils.escapeHTML(student.name)}</strong> · Class: <strong>SY BSc IT</strong>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="badge ${pct >= 75 ? 'badge-safe' : 'badge-critical'}">${pct}% Overall Practical</div>
          <div style="font-size:11px; color:var(--ink-secondary); margin-top:4px;">Attended: <strong>${attended}/${total} Practicals</strong></div>
        </div>
      </div>

      <div class="table-wrap" style="border:1px solid var(--border-strong);">
        <table class="data-table" style="font-size:12px;">
          <thead>
            <tr style="background:var(--surface-subtle);">
              <th style="width:100px;">Date</th>
              <th>Laboratory Course</th>
              <th>Experiment / Practical Title</th>
              <th style="width:100px; text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.length === 0 ? `
              <tr><td colspan="4" style="text-align:center; padding:24px; color:var(--ink-secondary);">No practical records on file for this student in the selected range.</td></tr>
            ` : sessions.map(sess => {
              const sub = State.getSubject(sess.subjectId);
              const status = recMap[sess.id] || 'unmarked';
              const isP = status === 'present';
              const isL = status === 'late';
              return `
                <tr>
                  <td><strong>${Utils.formatDate(sess.date)}</strong></td>
                  <td><strong>${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</strong></td>
                  <td>${sess.experimentTitle ? Utils.escapeHTML(sess.experimentTitle) : 'Lab Practical'}</td>
                  <td style="text-align:center;">
                    <span class="badge ${isP ? 'badge-safe' : isL ? 'badge-warn' : 'badge-critical'}">
                      ${status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderCompleteBatchDocument(practicalSessions, students) {
    return `
      <div style="border-bottom:2px solid var(--ink); padding-bottom:14px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink-secondary);">
            DEPARTMENT OF INFORMATION TECHNOLOGY · ACADEMIC AUDIT
          </div>
          <h2 style="font-size:18px; font-weight:800; color:var(--ink); letter-spacing:-0.02em; margin-top:2px;">
            COMPLETE BATCH PRACTICAL SUMMARY LEDGER
          </h2>
          <div style="font-size:12px; color:var(--ink-secondary); margin-top:2px;">
            Batch: <strong>SY BSc IT · 60 Students</strong> · Total Practicals Conducted: <strong>${practicalSessions.length}</strong>
          </div>
        </div>
        <div style="text-align:right;">
          <div class="badge badge-neutral">Batch Audit</div>
        </div>
      </div>

      <div class="table-wrap" style="border:1px solid var(--border-strong);">
        <table class="data-table" style="font-size:12px;">
          <thead>
            <tr style="background:var(--surface-subtle);">
              <th style="width:70px;">Roll No</th>
              <th>Student Name</th>
              <th style="width:90px; text-align:center;">Present</th>
              <th style="width:90px; text-align:center;">Absent</th>
              <th style="width:90px; text-align:center;">Late</th>
              <th style="width:110px; text-align:center;">Practical %</th>
              <th style="width:100px; text-align:center;">Eligibility</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => {
              const recs = State.getRecordsForStudent(s.id).filter(r => practicalSessions.some(sess => sess.id === r.sessionId));
              const present = recs.filter(r => r.status === 'present').length;
              const absent = recs.filter(r => r.status === 'absent').length;
              const late = recs.filter(r => r.status === 'late').length;
              const total = recs.length;
              const pct = Utils.safePercent(present + late, total);
              return `
                <tr>
                  <td><strong>${s.rollNumber}</strong></td>
                  <td><strong>${Utils.escapeHTML(s.name)}</strong></td>
                  <td style="text-align:center; color:var(--safe); font-weight:600;">${present}</td>
                  <td style="text-align:center; color:var(--critical); font-weight:600;">${absent}</td>
                  <td style="text-align:center; color:var(--warn); font-weight:600;">${late}</td>
                  <td style="text-align:center;"><strong>${total > 0 ? pct + '%' : '—'}</strong></td>
                  <td style="text-align:center;">
                    <span class="badge ${total === 0 ? 'badge-neutral' : pct >= 75 ? 'badge-safe' : 'badge-critical'}">
                      ${total > 0 ? (pct >= 75 ? 'ELIGIBLE' : 'DEFAULTER') : 'NO DATA'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function bindEvents(container) {
    container.querySelectorAll('[data-pr-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        reportType = btn.dataset.prType;
        render();
      });
    });

    const subSel = container.querySelector('#pr-subject-select');
    if (subSel) {
      subSel.addEventListener('change', (e) => {
        selectedSubjectId = e.target.value;
        selectedSessionId = '';
        render();
      });
    }

    const sessSel = container.querySelector('#pr-session-select');
    if (sessSel) {
      sessSel.addEventListener('change', (e) => {
        selectedSessionId = e.target.value;
        render();
      });
    }

    const stuSel = container.querySelector('#pr-student-select');
    if (stuSel) {
      stuSel.addEventListener('change', (e) => {
        selectedStudentId = e.target.value;
        render();
      });
    }

    const df = container.querySelector('#pr-date-from');
    if (df) {
      df.addEventListener('change', (e) => {
        dateFrom = e.target.value;
        render();
      });
    }

    const dt = container.querySelector('#pr-date-to');
    if (dt) {
      dt.addEventListener('change', (e) => {
        dateTo = e.target.value;
        render();
      });
    }

    const resetDates = container.querySelector('#pr-reset-dates');
    if (resetDates) {
      resetDates.addEventListener('click', () => {
        dateFrom = '';
        dateTo = '';
        render();
      });
    }

    const printBtn = container.querySelector('#btn-print-practical');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const exportBtn = container.querySelector('#btn-export-practical-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportCSV);
    }
  }

  function exportCSV() {
    const students = State.getAllStudents();
    const subjects = State.get().subjects;
    const practicalSessions = State.getPracticalSessions();

    if (reportType === 'session') {
      const activeSession = State.getSession(selectedSessionId);
      const activeSubject = State.getSubject(selectedSubjectId);
      if (!activeSession) {
        UI.toast('Please select an active session to export', 'error');
        return;
      }
      const recs = State.getRecordsForSession(activeSession.id);
      const recMap = {};
      recs.forEach(r => { recMap[r.studentId] = r.status; });

      const rows = [
        ['SY BSc IT — Practical Attendance Report'],
        ['Course', activeSubject ? activeSubject.name : 'Unknown'],
        ['Experiment', activeSession.experimentTitle || 'Practical Session'],
        ['Date', activeSession.date],
        ['Time', activeSession.startTime || '09:00'],
        [''],
        ['Roll No', 'Student Name', 'Status', 'Verification']
      ];
      students.forEach(s => {
        const st = recMap[s.id] || 'unmarked';
        rows.push([s.rollNumber, `"${s.name.replace(/"/g, '""')}"`, st.toUpperCase(), st === 'present' || st === 'late' ? 'Verified' : 'Absent']);
      });
      Utils.downloadFile(`Practical_Experiment_${activeSession.date}.csv`, rows.map(r => r.join(',')).join('\n'), 'text/csv');
      UI.toast('Exported practical session CSV', 'success');
    } else {
      // General practical batch export
      const rows = [
        ['Roll No', 'Student Name', 'Practical Present', 'Practical Absent', 'Practical Late', 'Total Practicals', 'Practical %', 'Status']
      ];
      students.forEach(s => {
        const recs = State.getRecordsForStudent(s.id).filter(r => practicalSessions.some(sess => sess.id === r.sessionId));
        const present = recs.filter(r => r.status === 'present').length;
        const absent = recs.filter(r => r.status === 'absent').length;
        const late = recs.filter(r => r.status === 'late').length;
        const total = recs.length;
        const pct = Utils.safePercent(present + late, total);
        rows.push([
          s.rollNumber,
          `"${s.name.replace(/"/g, '""')}"`,
          present, absent, late, total,
          total > 0 ? pct + '%' : 'N/A',
          total > 0 ? (pct >= 75 ? 'Safe' : 'Critical') : 'No Data'
        ]);
      });
      Utils.downloadFile(`SY_BSc_IT_Practical_Batch_Report_${Utils.todayISO()}.csv`, rows.map(r => r.join(',')).join('\n'), 'text/csv');
      UI.toast('Exported complete practical batch report', 'success');
    }
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PracticalReportsView;
