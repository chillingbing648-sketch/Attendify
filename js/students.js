/* ============================================================
   ATTENDIFY — students.js (Admin Student Directory)
   High-density directory with search, filter, and detail modal
   ============================================================ */

const StudentsView = (() => {
  let searchQuery = '';
  let statusFilter = 'all'; // all | safe | warn | critical

  function render(containerId = 'view-students') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const students = State.getAllStudents();
    const th = Attendance.thresholds();

    const studentList = students.map(s => {
      const stats = Attendance.statsForStudent(s.id);
      return { ...s, stats };
    });

    let filtered = studentList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || String(s.rollNumber).includes(q));
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.stats.status === statusFilter);
    }

    const counts = {
      all: students.length,
      safe: studentList.filter(s => s.stats.status === 'safe' && s.stats.total > 0).length,
      warn: studentList.filter(s => s.stats.status === 'warn').length,
      critical: studentList.filter(s => s.stats.status === 'critical' && s.stats.total > 0).length
    };

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Students Directory</h1>
          <p class="view-subtitle">SY BSc IT · Single Batch · ${students.length} Students</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-outline" id="btn-export-students-csv">
            ${UI.icon('download')} Export Student List
          </button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="section" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:14px;">
        <div class="search-box">
          ${UI.icon('search')}
          <input type="text" id="students-search-input" class="input" placeholder="Search by roll no. or student name..." value="${Utils.escapeHTML(searchQuery)}">
        </div>

        <div style="display:flex; gap:4px; margin-left:auto;">
          <button class="btn btn-sm ${statusFilter === 'all' ? 'btn-secondary' : 'btn-outline'}" data-status-filter="all">All (${counts.all})</button>
          <button class="btn btn-sm ${statusFilter === 'safe' ? 'btn-secondary' : 'btn-outline'}" data-status-filter="safe">Safe ≥${th.safe}% (${counts.safe})</button>
          <button class="btn btn-sm ${statusFilter === 'warn' ? 'btn-secondary' : 'btn-outline'}" data-status-filter="warn">Warning (${counts.warn})</button>
          <button class="btn btn-sm ${statusFilter === 'critical' ? 'btn-secondary' : 'btn-outline'}" data-status-filter="critical">Defaulter <${th.warn}% (${counts.critical})</button>
        </div>
      </div>

      <!-- High Density Student Table -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 70px;">Roll No</th>
              <th>Student Name</th>
              <th style="width: 120px;">Lectures Present</th>
              <th style="width: 120px;">Lectures Absent</th>
              <th style="width: 120px;">Attendance %</th>
              <th style="width: 95px;">Status</th>
              <th style="width: 80px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="7" style="text-align:center; padding: 28px; color:var(--ink-secondary);">
                  No students found matching your search.
                </td>
              </tr>
            ` : filtered.map(s => {
              const statusClass = s.stats.total === 0 ? 'badge-neutral' : `badge-${s.stats.status}`;
              const statusLabel = s.stats.total === 0 ? 'No Data' : Utils.statusLabel(s.stats.status);
              return `
                <tr>
                  <td><strong style="font-variant-numeric: tabular-nums;">${s.rollNumber}</strong></td>
                  <td>
                    <div style="font-weight:600; color:var(--ink);">${Utils.escapeHTML(s.name)}</div>
                  </td>
                  <td><span style="color:var(--safe); font-weight:600;">${s.stats.present + s.stats.late}</span></td>
                  <td><span style="color:var(--critical); font-weight:600;">${s.stats.absent}</span></td>
                  <td>
                    <strong style="font-variant-numeric: tabular-nums;">
                      ${s.stats.total > 0 ? s.stats.pct + '%' : '—'}
                    </strong>
                  </td>
                  <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-ghost btn-sm view-student-btn" data-id="${s.id}">View</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    bindEvents(container);
  }

  function bindEvents(container) {
    const search = container.querySelector('#students-search-input');
    if (search) {
      search.addEventListener('input', Utils.debounce((e) => {
        searchQuery = e.target.value;
        render();
      }, 120));
    }

    container.querySelectorAll('[data-status-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        statusFilter = btn.dataset.statusFilter;
        render();
      });
    });

    container.querySelectorAll('.view-student-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openStudentDetail(btn.dataset.id);
      });
    });

    const exportBtn = container.querySelector('#btn-export-students-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportStudentsCSV);
    }
  }

  function openStudentDetail(studentId) {
    const student = State.getStudent(studentId);
    if (!student) return;

    const stats = Attendance.statsForStudent(studentId);
    const subjects = State.get().subjects;

    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px;">
          <div class="card" style="padding:8px 10px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Total Sessions</div>
            <div class="stat-value" style="font-size:16px;">${stats.total}</div>
          </div>
          <div class="card" style="padding:8px 10px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Present</div>
            <div class="stat-value" style="font-size:16px; color:var(--safe);">${stats.present}</div>
          </div>
          <div class="card" style="padding:8px 10px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Absent</div>
            <div class="stat-value" style="font-size:16px; color:var(--critical);">${stats.absent}</div>
          </div>
          <div class="card" style="padding:8px 10px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Turnout</div>
            <div class="stat-value" style="font-size:16px;">${stats.total > 0 ? stats.pct + '%' : '—'}</div>
          </div>
        </div>

        <div class="section-title" style="font-size:12px; font-weight:650;">Course Attendance Breakdown</div>
        <div class="table-wrap">
          <table class="data-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Subject</th>
                <th style="width:65px;">Attended</th>
                <th style="width:65px;">Missed</th>
                <th style="width:65px;">Total</th>
                <th style="width:65px;">%</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(sub => {
                const subStats = Attendance.statsForStudentInSubject(studentId, sub.id);
                return `
                  <tr>
                    <td><strong>${Utils.escapeHTML(sub.name)}</strong></td>
                    <td style="color:var(--safe); font-weight:600;">${subStats.present + subStats.late}</td>
                    <td style="color:var(--critical); font-weight:600;">${subStats.absent}</td>
                    <td>${subStats.total}</td>
                    <td><strong>${subStats.total > 0 ? subStats.pct + '%' : '—'}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    UI.openModal({
      title: `Roll No. ${student.rollNumber} — ${student.name}`,
      desc: 'SY BSc IT · Student Attendance Record',
      bodyHTML,
      footerHTML: `<button class="btn btn-outline" id="btn-close-modal">Close</button>`,
      onOpen: (overlay, close) => {
        overlay.querySelector('#btn-close-modal').addEventListener('click', close);
      }
    });
  }

  function exportStudentsCSV() {
    const students = State.getAllStudents();
    const rows = [
      ['Roll Number', 'Student Name', 'Total Sessions', 'Present', 'Absent', 'Late', 'Attendance %', 'Status']
    ];

    students.forEach(s => {
      const stats = Attendance.statsForStudent(s.id);
      rows.push([
        s.rollNumber,
        `"${s.name.replace(/"/g, '""')}"`,
        stats.total,
        stats.present,
        stats.absent,
        stats.late,
        stats.total > 0 ? stats.pct + '%' : 'N/A',
        Utils.statusLabel(stats.status)
      ]);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    Utils.downloadFile(`SY_BSc_IT_Students_Attendance_${Utils.todayISO()}.csv`, csvContent, 'text/csv');
    UI.toast('Exported student roster report', 'success');
  }

  return { render, openStudentDetail };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = StudentsView;
