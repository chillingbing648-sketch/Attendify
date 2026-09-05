/* ============================================================
   ATTENDIFY — reports.js (Attendance Reports & Exports)
   Generate Batch Reports, Date Range Reports, Defaulters List, and CSVs
   ============================================================ */

const ReportsView = (() => {
  function render(containerId = 'view-reports') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const subjects = State.get().subjects;
    const stats = Attendance.overallBatchStats();
    const defaulters = Attendance.studentsBelow(Attendance.thresholds().safe);
    const critical = Attendance.studentsBelow(Attendance.thresholds().warn);

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Attendance Reports</h1>
          <p class="view-subtitle">SY BSc IT · Official academic ledgers and summary exports</p>
        </div>
      </div>

      <!-- Export Presets Grid -->
      <div class="stat-grid section">
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <div class="stat-label">Report Preset 01</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Complete Batch Ledger</h3>
            <p style="font-size:11px; color:var(--ink-secondary); line-height:1.4;">
              Full multi-subject attendance matrix with Roll Nos 1–60 and individual percentages.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-export-full-csv">
            ${UI.icon('download')} Download Full CSV
          </button>
        </div>

        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <div class="stat-label" style="color:var(--critical);">Report Preset 02</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Defaulters Report (< 75%)</h3>
            <p style="font-size:11px; color:var(--ink-secondary); line-height:1.4;">
              Official list of ${defaulters.length} students failing the university 75% attendance rule.
            </p>
          </div>
          <button class="btn btn-danger btn-sm" id="btn-export-defaulters-csv">
            ${UI.icon('download')} Download Defaulters CSV (${defaulters.length})
          </button>
        </div>

        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <div class="stat-label">Report Preset 03</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Practical Reports</h3>
            <p style="font-size:11px; color:var(--ink-secondary); line-height:1.4;">
              Generate lab experiment verification records with student attendance breakdown.
            </p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('practical-reports')">
            Open Practical Reports Portal →
          </button>
        </div>

        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:14px;">
          <div>
            <div class="stat-label">Report Preset 04</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Lecture Audit Trail</h3>
            <p style="font-size:11px; color:var(--ink-secondary); line-height:1.4;">
              Session-by-session history including timestamps, course names, and headcounts.
            </p>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-export-sessions-csv">
            ${UI.icon('download')} Download Sessions Log
          </button>
        </div>
      </div>

      <!-- Preview Summary Table -->
      <div class="section">
        <div class="section-title-row">
          <div class="section-title">Batch Attendance Summary</div>
          <div class="section-desc">Class: SY BSc IT (60 Students)</div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th style="width: 130px;">Lectures Held</th>
                <th style="width: 130px;">Total Present</th>
                <th style="width: 130px;">Total Absent</th>
                <th style="width: 130px;">Batch Average</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(s => {
                const st = Attendance.statsForSubject(s.id);
                return `
                  <tr>
                    <td><strong>${Utils.escapeHTML(s.name)}</strong></td>
                    <td>${st.sessionCount}</td>
                    <td><span style="color:var(--safe); font-weight:600;">${st.present}</span></td>
                    <td><span style="color:var(--critical); font-weight:600;">${st.absent}</span></td>
                    <td><strong>${st.sessionCount > 0 ? st.pct + '%' : '—'}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function bindEvents(container) {
    const fullBtn = container.querySelector('#btn-export-full-csv');
    if (fullBtn) fullBtn.addEventListener('click', exportFullCSV);

    const defBtn = container.querySelector('#btn-export-defaulters-csv');
    if (defBtn) defBtn.addEventListener('click', exportDefaultersCSV);

    const sessBtn = container.querySelector('#btn-export-sessions-csv');
    if (sessBtn) sessBtn.addEventListener('click', exportSessionsCSV);
  }

  function exportFullCSV() {
    const students = State.getAllStudents();
    const subjects = State.get().subjects;

    const headers = ['Roll No', 'Student Name'];
    subjects.forEach(s => {
      headers.push(`${s.name} (P)`, `${s.name} (T)`, `${s.name} (%)`);
    });
    headers.push('Overall Present', 'Overall Total', 'Overall %', 'Status');

    const rows = [headers];

    students.forEach(stu => {
      const overall = Attendance.statsForStudent(stu.id);
      const row = [stu.rollNumber, `"${stu.name.replace(/"/g, '""')}"`];

      subjects.forEach(sub => {
        const subStat = Attendance.statsForStudentInSubject(stu.id, sub.id);
        row.push(subStat.present + subStat.late, subStat.total, subStat.total > 0 ? subStat.pct + '%' : 'N/A');
      });

      row.push(
        overall.present + overall.late,
        overall.total,
        overall.total > 0 ? overall.pct + '%' : 'N/A',
        Utils.statusLabel(overall.status)
      );

      rows.push(row);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    Utils.downloadFile(`SY_BSc_IT_Full_Attendance_${Utils.todayISO()}.csv`, csv, 'text/csv');
    UI.toast('Full attendance ledger exported', 'success');
  }

  function exportDefaultersCSV() {
    const defaulters = Attendance.studentsBelow(Attendance.thresholds().safe);
    const rows = [
      ['Roll No', 'Student Name', 'Total Classes', 'Attended', 'Missed', 'Attendance %', 'Status']
    ];

    defaulters.forEach(d => {
      rows.push([
        d.student.rollNumber,
        `"${d.student.name.replace(/"/g, '""')}"`,
        d.total,
        d.present + d.late,
        d.absent,
        d.pct + '%',
        Utils.statusLabel(d.status)
      ]);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    Utils.downloadFile(`SY_BSc_IT_Defaulters_${Utils.todayISO()}.csv`, csv, 'text/csv');
    UI.toast('Defaulters report exported', 'success');
  }

  function exportSessionsCSV() {
    const sessions = State.getAllSessions();
    const rows = [
      ['Session ID', 'Date', 'Time', 'Type', 'Subject', 'Present Count', 'Absent Count', 'Attendance %']
    ];

    sessions.forEach(sess => {
      const sub = State.getSubject(sess.subjectId);
      const stats = Attendance.statsForSession(sess.id);
      rows.push([
        sess.id,
        sess.date,
        sess.startTime || 'N/A',
        (sess.type || 'theory').toUpperCase(),
        sub ? `"${sub.name.replace(/"/g, '""')}"` : 'Unknown',
        stats.present + stats.late,
        stats.absent,
        stats.pct + '%'
      ]);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    Utils.downloadFile(`SY_BSc_IT_Session_Log_${Utils.todayISO()}.csv`, csv, 'text/csv');
    UI.toast('Sessions log exported', 'success');
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ReportsView;
