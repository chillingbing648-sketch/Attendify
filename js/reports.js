/* ============================================================
   ATTENDIFY — reports.js (Attendance Reports & Presets)
   Presets:
   • Today's Attendance
   • This Month
   • Full Batch
   • Defaulters (< 75%)
   • Subject Summary
   • Practical Report
   • Custom Date Range
   ============================================================ */

const ReportsView = (() => {
  let customFrom = '';
  let customTo = '';

  function render(containerId = 'view-reports') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const subjects = State.get().subjects;
    const defaulters = Attendance.studentsBelow(Attendance.thresholds().safe);
    const todayISO = Utils.todayISO();
    const todaySessions = State.getSessionsForDate(todayISO);
    const currentMonth = todayISO.slice(0, 7);
    const monthSessions = State.getAllSessions().filter(s => s.date.startsWith(currentMonth));

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Attendance Reports</h1>
          <p class="view-subtitle">SY BSc IT · Academic Ledgers, Summaries & Presets</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-primary" id="btn-quick-generate-today" ${todaySessions.length === 0 ? 'disabled' : ''} title="Export CSV for today's classes">
            ${UI.icon('download')} Generate Today's Report
          </button>
        </div>
      </div>

      <!-- Presets Grid (Prompt 15) -->
      <div class="stat-grid section">
        <!-- Preset 1: Today's Attendance -->
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
          <div>
            <div class="stat-label">Preset 01</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Today's Attendance</h3>
            <p style="font-size:11.5px; color:var(--ink-secondary); line-height:1.4;">
              Export all attendance records logged for today (${Utils.formatDate(new Date())}).
            </p>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-export-today-csv" ${todaySessions.length === 0 ? 'disabled' : ''}>
            ${UI.icon('download')} Export Today's CSV (${todaySessions.length})
          </button>
        </div>

        <!-- Preset 2: This Month -->
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
          <div>
            <div class="stat-label">Preset 02</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">This Month's Attendance</h3>
            <p style="font-size:11.5px; color:var(--ink-secondary); line-height:1.4;">
              Monthly academic ledger for ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}.
            </p>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-export-month-csv" ${monthSessions.length === 0 ? 'disabled' : ''}>
            ${UI.icon('download')} Export Month CSV (${monthSessions.length})
          </button>
        </div>

        <!-- Preset 3: Full Batch -->
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
          <div>
            <div class="stat-label">Preset 03</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Full Batch Ledger</h3>
            <p style="font-size:11.5px; color:var(--ink-secondary); line-height:1.4;">
              Comprehensive multi-subject attendance matrix across Roll Nos 1–60.
            </p>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-export-full-csv">
            ${UI.icon('download')} Download Full Batch CSV
          </button>
        </div>

        <!-- Preset 4: Defaulters -->
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
          <div>
            <div class="stat-label" style="color:var(--critical);">Preset 04</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Defaulters Report (< 75%)</h3>
            <p style="font-size:11.5px; color:var(--ink-secondary); line-height:1.4;">
              Official list of ${defaulters.length} students falling below university threshold.
            </p>
          </div>
          <button class="btn btn-danger btn-sm" id="btn-export-defaulters-csv" ${defaulters.length === 0 ? 'disabled' : ''}>
            ${UI.icon('download')} Download Defaulters (${defaulters.length})
          </button>
        </div>

        <!-- Preset 5: Subject Summary -->
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
          <div>
            <div class="stat-label">Preset 05</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Subject Summary</h3>
            <p style="font-size:11.5px; color:var(--ink-secondary); line-height:1.4;">
              Aggregated course statistics, lectures held, present/absent counts.
            </p>
          </div>
          <button class="btn btn-outline btn-sm" id="btn-export-subjects-csv">
            ${UI.icon('download')} Download Subject Summary
          </button>
        </div>

        <!-- Preset 6: Practical Report -->
        <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; gap:12px;">
          <div>
            <div class="stat-label" style="color:var(--practical);">Preset 06</div>
            <h3 style="font-size:14px; font-weight:700; margin:4px 0 2px 0;">Practical Report</h3>
            <p style="font-size:11.5px; color:var(--ink-secondary); line-height:1.4;">
              Laboratory experiment ledgers with verification signatures.
            </p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('practical-reports')">
            Open Practical Portal →
          </button>
        </div>
      </div>

      <!-- Preset 7: Custom Date Range Export -->
      <div class="section">
        <div class="card" style="background:var(--surface); border:1px solid var(--border);">
          <div class="section-title" style="font-size:13px; font-weight:700; margin-bottom:4px;">
            Preset 07: Custom Date Range Report
          </div>
          <p style="font-size:11.5px; color:var(--ink-secondary); margin-bottom:12px;">
            Generate an academic ledger for any custom date interval.
          </p>
          <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
            <div class="register-bar-field">
              <label>From Date</label>
              <input type="date" id="report-custom-from" class="input" value="${customFrom}">
            </div>
            <div class="register-bar-field">
              <label>To Date</label>
              <input type="date" id="report-custom-to" class="input" value="${customTo}">
            </div>
            <button class="btn btn-primary btn-sm" id="btn-export-custom-range">
              ${UI.icon('download')} Download Range CSV
            </button>
          </div>
        </div>
      </div>

      <!-- Live Summary Preview -->
      <div class="section">
        <div class="section-title-row">
          <div class="section-title">Course Attendance Summary Preview</div>
          <div class="section-desc">Class: SY BSc IT (60 Students)</div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Course Name</th>
                <th style="width: 120px; text-align:center;">Sessions Held</th>
                <th style="width: 120px; text-align:center;">Total Present</th>
                <th style="width: 120px; text-align:center;">Total Absent</th>
                <th style="width: 140px; text-align:center;">Batch Average</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(s => {
                const st = Attendance.statsForSubject(s.id);
                return `
                  <tr>
                    <td><strong>${Utils.escapeHTML(s.name)}</strong></td>
                    <td style="text-align:center;">${st.sessionCount}</td>
                    <td style="text-align:center;"><span style="color:var(--safe); font-weight:600;">${st.present}</span></td>
                    <td style="text-align:center;"><span style="color:var(--critical); font-weight:600;">${st.absent}</span></td>
                    <td style="text-align:center;">
                      <strong style="color:${st.sessionCount === 0 ? 'var(--ink)' : st.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
                        ${st.sessionCount > 0 ? st.pct + '%' : '—'}
                      </strong>
                    </td>
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
    const todayBtn = container.querySelector('#btn-export-today-csv');
    if (todayBtn) todayBtn.addEventListener('click', exportTodayCSV);

    const monthBtn = container.querySelector('#btn-export-month-csv');
    if (monthBtn) monthBtn.addEventListener('click', exportMonthCSV);

    const fullBtn = container.querySelector('#btn-export-full-csv');
    if (fullBtn) fullBtn.addEventListener('click', exportFullCSV);

    const defBtn = container.querySelector('#btn-export-defaulters-csv');
    if (defBtn) defBtn.addEventListener('click', exportDefaultersCSV);

    const subjBtn = container.querySelector('#btn-export-subjects-csv');
    if (subjBtn) subjBtn.addEventListener('click', exportSubjectSummaryCSV);

    const customBtn = container.querySelector('#btn-export-custom-range');
    if (customBtn) {
      customBtn.addEventListener('click', () => {
        const from = container.querySelector('#report-custom-from').value;
        const to = container.querySelector('#report-custom-to').value;
        exportCustomRangeCSV(from, to);
      });
    }
  }

  function exportTodayCSV() {
    const today = Utils.todayISO();
    const sessions = State.getSessionsForDate(today);
    exportSessionsToCSV(sessions, `Today_Attendance_${today}.csv`);
  }

  function exportMonthCSV() {
    const month = Utils.todayISO().slice(0, 7);
    const sessions = State.getAllSessions().filter(s => s.date.startsWith(month));
    exportSessionsToCSV(sessions, `Monthly_Attendance_${month}.csv`);
  }

  function exportSessionsToCSV(sessions, filename) {
    const students = State.getAllStudents();
    const headers = ['Session Date', 'Time', 'Subject', 'Type', 'Roll No', 'Student Name', 'Status'];
    const rows = [headers];

    sessions.forEach(sess => {
      const sub = State.getSubject(sess.subjectId);
      const recs = State.getRecordsForSession(sess.id);
      const recMap = {};
      recs.forEach(r => { recMap[r.studentId] = r.status; });

      students.forEach(s => {
        rows.push([
          sess.date,
          sess.startTime || '09:00',
          `"${sub ? sub.name.replace(/"/g, '""') : 'Course'}"`,
          sess.type || 'theory',
          s.rollNumber,
          `"${s.name.replace(/"/g, '""')}"`,
          (recMap[s.id] || 'unmarked').toUpperCase()
        ]);
      });
    });

    Utils.downloadFile(filename, rows.map(r => r.join(',')).join('\n'), 'text/csv');
    UI.toast(`Exported ${filename}`, 'success');
  }

  function exportFullCSV() {
    const students = State.getAllStudents();
    const subjects = State.get().subjects;

    const headers = ['Roll No', 'Student Name'];
    subjects.forEach(s => {
      headers.push(`${s.name} (Attended)`, `${s.name} (Total)`, `${s.name} (%)`);
    });
    headers.push('Overall Present', 'Overall Total', 'Overall %', 'Status');

    const rows = [headers];
    students.forEach(s => {
      const row = [s.rollNumber, `"${s.name.replace(/"/g, '""')}"`];
      subjects.forEach(sub => {
        const st = Attendance.statsForStudentInSubject(s.id, sub.id);
        row.push(st.present + st.late, st.total, st.total > 0 ? st.pct + '%' : 'N/A');
      });
      const overall = Attendance.statsForStudent(s.id);
      row.push(overall.present + overall.late, overall.total, overall.total > 0 ? overall.pct + '%' : 'N/A', Utils.statusLabel(overall.status));
      rows.push(row);
    });

    Utils.downloadFile(`SY_BSc_IT_Full_Batch_Ledger_${Utils.todayISO()}.csv`, rows.map(r => r.join(',')).join('\n'), 'text/csv');
    UI.toast('Full batch ledger exported', 'success');
  }

  function exportDefaultersCSV() {
    const defaulters = Attendance.studentsBelow(Attendance.thresholds().safe);
    const rows = [
      ['SY BSc IT — Attendance Defaulters List (< 75%)'],
      ['Generated On', Utils.todayISO()],
      ['Class Threshold', '75%'],
      [''],
      ['Roll No', 'Student Name', 'Total Sessions', 'Attended', 'Missed', 'Attendance %', 'Status']
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

    Utils.downloadFile(`SY_BSc_IT_Defaulters_${Utils.todayISO()}.csv`, rows.map(r => r.join(',')).join('\n'), 'text/csv');
    UI.toast('Defaulters list exported', 'success');
  }

  function exportSubjectSummaryCSV() {
    const subjects = State.get().subjects;
    const rows = [
      ['Course Code', 'Subject Name', 'Faculty', 'Sessions Held', 'Total Present', 'Total Absent', 'Average Attendance %']
    ];

    subjects.forEach(s => {
      const st = Attendance.statsForSubject(s.id);
      rows.push([
        s.code || 'IT300',
        `"${s.name.replace(/"/g, '""')}"`,
        `"${(s.teacher || '').replace(/"/g, '""')}"`,
        st.sessionCount,
        st.present,
        st.absent,
        st.sessionCount > 0 ? st.pct + '%' : 'N/A'
      ]);
    });

    Utils.downloadFile(`SY_BSc_IT_Subject_Summary_${Utils.todayISO()}.csv`, rows.map(r => r.join(',')).join('\n'), 'text/csv');
    UI.toast('Subject summary exported', 'success');
  }

  function exportCustomRangeCSV(from, to) {
    if (!from || !to) {
      UI.toast('Please select both From and To dates', 'error');
      return;
    }
    const sessions = State.getAllSessions().filter(s => s.date >= from && s.date <= to);
    if (sessions.length === 0) {
      UI.toast('No sessions found in the selected date range', 'info');
      return;
    }
    exportSessionsToCSV(sessions, `Attendance_Range_${from}_to_${to}.csv`);
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ReportsView;
