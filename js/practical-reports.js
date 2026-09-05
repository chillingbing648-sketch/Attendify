/* ============================================================
   ATTENDIFY — practical-reports.js
   FIRST-CLASS FEATURE: SY BSc IT Practical & Experiment Reports
   Generate, Review, Filter, Print & Export Professional Academic Reports
   ============================================================ */

const PracticalReportsView = (() => {
  let selectedSubjectId = '';
  let selectedSessionId = '';
  let dateRangeFrom = '';
  let dateRangeTo = '';

  function render(containerId = 'view-practical-reports') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const subjects = State.get().subjects;
    const practicalSessions = State.getPracticalSessions();

    if (!selectedSubjectId && subjects.length > 0) {
      selectedSubjectId = subjects[0].id;
    }

    const filteredSessions = practicalSessions.filter(s => s.subjectId === selectedSubjectId);
    if (!selectedSessionId && filteredSessions.length > 0) {
      selectedSessionId = filteredSessions[0].id;
    }

    const activeSession = State.getSession(selectedSessionId);
    const activeSubject = State.getSubject(selectedSubjectId);
    const students = State.getAllStudents();

    let studentRecords = [];
    let stats = { present: 0, absent: 0, late: 0, total: students.length, pct: 0 };

    if (activeSession) {
      const recs = State.getRecordsForSession(activeSession.id);
      const recMap = {};
      recs.forEach(r => { recMap[r.studentId] = r.status; });

      studentRecords = students.map(s => ({
        student: s,
        status: recMap[s.id] || 'unreviewed'
      }));

      stats.present = studentRecords.filter(r => r.status === 'present').length;
      stats.absent = studentRecords.filter(r => r.status === 'absent').length;
      stats.late = studentRecords.filter(r => r.status === 'late').length;
      stats.pct = Utils.safePercent(stats.present + stats.late, students.length);
    }

    container.innerHTML = `
      <div class="view-header no-print">
        <div>
          <h1>Practical Attendance Reports</h1>
          <p class="view-subtitle">SY BSc IT · Laboratory Sessions, Experiments & Journals</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-outline" id="btn-print-practical">
            ${UI.icon('inbox')} Print Document
          </button>
          <button class="btn btn-primary" id="btn-export-practical-csv" ${!activeSession ? 'disabled' : ''}>
            ${UI.icon('download')} Export Practical CSV
          </button>
        </div>
      </div>

      <!-- Controls & Filter Bar (Hidden on print) -->
      <div class="card no-print section" style="padding:12px 14px; background:var(--surface);">
        <div style="display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
          <div class="register-bar-field" style="min-width:200px;">
            <label>Select Laboratory Course</label>
            <select id="pr-subject-select" class="select">
              ${subjects.map(sub => `
                <option value="${sub.id}" ${sub.id === selectedSubjectId ? 'selected' : ''}>${Utils.escapeHTML(sub.name)}</option>
              `).join('')}
            </select>
          </div>

          <div class="register-bar-field" style="min-width:260px;">
            <label>Select Practical Session / Experiment</label>
            <select id="pr-session-select" class="select" ${filteredSessions.length === 0 ? 'disabled' : ''}>
              ${filteredSessions.length === 0 ? '<option value="">No practical sessions logged</option>' : ''}
              ${filteredSessions.map(sess => `
                <option value="${sess.id}" ${sess.id === selectedSessionId ? 'selected' : ''}>
                  ${Utils.formatDate(sess.date)} (${sess.startTime}) ${sess.experimentTitle ? '— ' + Utils.escapeHTML(sess.experimentTitle) : ''}
                </option>
              `).join('')}
            </select>
          </div>

          <div style="margin-left:auto; display:flex; gap:8px;">
            <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSubject('${selectedSubjectId}')">
              ${UI.icon('plus')} Log New Practical
            </button>
          </div>
        </div>
      </div>

      <!-- Printable Professional Academic Document -->
      <div class="card practical-document" id="practical-print-area" style="background:#FFFFFF; border:1px solid var(--border-strong); box-shadow:var(--shadow-sm); padding:24px;">
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
            <div class="topbar-badge" style="font-size:11px;">Official Document</div>
            <div style="font-size:11px; color:var(--ink-secondary); margin-top:4px;">
              Date: <strong>${activeSession ? Utils.formatDate(activeSession.date) : Utils.formatDate(new Date())}</strong>
            </div>
          </div>
        </div>

        ${!activeSession ? `
          <div class="empty-state" style="padding:40px 16px;">
            <div class="empty-state-icon">${UI.icon('bookOpen')}</div>
            <h3>No Practical Session Selected</h3>
            <p>Select or mark a practical session for this course to generate the laboratory attendance ledger.</p>
            <button class="btn btn-primary" onclick="App.navigateTo('mark-attendance')">Mark Practical Attendance</button>
          </div>
        ` : `
          <!-- Session Meta Details -->
          <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; background:var(--surface-subtle); padding:10px 14px; border-radius:var(--r-md); border:1px solid var(--border); margin-bottom:18px;">
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Course</div>
              <div style="font-weight:700; font-size:13px; color:var(--ink);">${activeSubject ? Utils.escapeHTML(activeSubject.name) : ''}</div>
            </div>
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Experiment Title</div>
              <div style="font-weight:600; font-size:13px; color:var(--ink);">${activeSession.experimentTitle ? Utils.escapeHTML(activeSession.experimentTitle) : 'Regular Lab Session'}</div>
            </div>
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Lab Timing</div>
              <div style="font-weight:600; font-size:13px; color:var(--ink);">${activeSession.startTime || '09:00'} · ${activeSubject ? activeSubject.room || 'Lab' : 'Lab'}</div>
            </div>
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Lab Turnout</div>
              <div style="font-weight:700; font-size:13px; color:${stats.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
                ${stats.pct}% (${stats.present + stats.late}/${students.length})
              </div>
            </div>
          </div>

          <!-- Academic Attendance Ledger Table -->
          <div class="table-wrap" style="border:1px solid var(--border-strong);">
            <table class="data-table" style="font-size:12px;">
              <thead>
                <tr style="background:var(--surface-subtle);">
                  <th style="width:40px; text-align:center;">#</th>
                  <th style="width:75px;">Roll No</th>
                  <th>Student Name</th>
                  <th style="width:90px; text-align:center;">Status</th>
                  <th style="width:140px; text-align:center;">Lab Signature / Verification</th>
                </tr>
              </thead>
              <tbody>
                ${studentRecords.map((r, i) => {
                  const isPresent = r.status === 'present';
                  const isLate = r.status === 'late';
                  const isAbsent = r.status === 'absent';
                  return `
                    <tr>
                      <td style="text-align:center; color:var(--ink-tertiary); font-variant-numeric:tabular-nums; font-size:11px;">
                        ${String(i + 1).padStart(2, '0')}
                      </td>
                      <td><strong style="font-variant-numeric:tabular-nums;">${r.student.rollNumber}</strong></td>
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

          <!-- Document Footer Summary & Faculty Signature Area -->
          <div style="margin-top:24px; padding-top:16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:flex-end;">
            <div style="font-size:11px; color:var(--ink-secondary); line-height:1.6;">
              <strong>Summary:</strong> Total: 60 · Present: ${stats.present} · Absent: ${stats.absent} · Late: ${stats.late}<br>
              Generated on: ${Utils.formatDate(new Date())} via Attendify SY BSc IT Portal
            </div>
            <div style="text-align:center; min-width:180px;">
              <div style="height:38px; border-bottom:1px solid var(--ink); margin-bottom:4px;"></div>
              <div style="font-size:11px; font-weight:650; color:var(--ink);">Faculty In-Charge Signature</div>
              <div style="font-size:10px; color:var(--ink-tertiary);">${activeSubject ? activeSubject.teacher || 'Department Faculty' : ''}</div>
            </div>
          </div>
        `}
      </div>
    `;

    bindEvents(container, activeSession, activeSubject, studentRecords);
  }

  function bindEvents(container, activeSession, activeSubject, studentRecords) {
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

    const printBtn = container.querySelector('#btn-print-practical');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const exportBtn = container.querySelector('#btn-export-practical-csv');
    if (exportBtn && activeSession) {
      exportBtn.addEventListener('click', () => {
        exportPracticalCSV(activeSession, activeSubject, studentRecords);
      });
    }
  }

  function exportPracticalCSV(session, subject, records) {
    const rows = [
      ['SY BSc IT — Practical Attendance Report'],
      ['Subject', subject ? subject.name : 'Unknown'],
      ['Experiment', session.experimentTitle || 'Lab Session'],
      ['Date', session.date],
      ['Time', session.startTime || '09:00'],
      [''],
      ['Roll No', 'Student Name', 'Status', 'Verification']
    ];

    records.forEach(r => {
      rows.push([
        r.student.rollNumber,
        `"${r.student.name.replace(/"/g, '""')}"`,
        r.status.toUpperCase(),
        r.status === 'present' || r.status === 'late' ? 'Verified' : 'Absent'
      ]);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    Utils.downloadFile(`Practical_Report_${subject ? subject.name.replace(/\s+/g, '_') : 'Course'}_${session.date}.csv`, csv, 'text/csv');
    UI.toast('Practical report exported', 'success');
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = PracticalReportsView;
