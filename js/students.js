/* ============================================================
   ATTENDIFY — students.js (Admin Student Directory)
   Professional high-density directory with search, filter,
   sorting, add/edit/remove, and comprehensive detail modal.
   ============================================================ */

const StudentsView = (() => {
  let searchQuery = '';
  let statusFilter = 'all'; // all | safe | warn | critical
  let sortBy = 'rollNumber'; // 'rollNumber' | 'name' | 'pct'
  let sortAsc = true;

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

    // Sort
    filtered.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'rollNumber') {
        valA = a.rollNumber;
        valB = b.rollNumber;
      } else if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'pct') {
        valA = a.stats.total > 0 ? a.stats.pct : -1;
        valB = b.stats.total > 0 ? b.stats.pct : -1;
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

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
          <button class="btn btn-primary" id="btn-add-student-modal">
            ${UI.icon('plus')} Add Student
          </button>
          <button class="btn btn-outline" id="btn-export-students-csv">
            ${UI.icon('download')} Export CSV
          </button>
        </div>
      </div>

      <!-- Search, Sorting & Filters -->
      <div class="section" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:14px;">
        <div class="search-box">
          ${UI.icon('search')}
          <input type="text" id="students-search-input" class="input" placeholder="Search by roll no. or name..." value="${Utils.escapeHTML(searchQuery)}">
        </div>

        <div style="display:flex; gap:6px; align-items:center;">
          <span style="font-size:var(--fs-xs); color:var(--ink-secondary);">Sort:</span>
          <select id="students-sort-select" class="select" style="height:32px; font-size:12px; padding:2px 8px; width:auto;">
            <option value="rollNumber-asc" ${sortBy === 'rollNumber' && sortAsc ? 'selected' : ''}>Roll No (Ascending)</option>
            <option value="rollNumber-desc" ${sortBy === 'rollNumber' && !sortAsc ? 'selected' : ''}>Roll No (Descending)</option>
            <option value="name-asc" ${sortBy === 'name' && sortAsc ? 'selected' : ''}>Name (A–Z)</option>
            <option value="name-desc" ${sortBy === 'name' && !sortAsc ? 'selected' : ''}>Name (Z–A)</option>
            <option value="pct-desc" ${sortBy === 'pct' && !sortAsc ? 'selected' : ''}>Attendance % (Highest)</option>
            <option value="pct-asc" ${sortBy === 'pct' && sortAsc ? 'selected' : ''}>Attendance % (Lowest)</option>
          </select>
        </div>

        <div style="display:flex; gap:4px; margin-left:auto; flex-wrap:wrap;">
          <button class="btn btn-sm ${statusFilter === 'all' ? 'btn-secondary' : 'btn-outline'}" data-status-filter="all">All (${counts.all})</button>
          <button class="btn btn-sm ${statusFilter === 'safe' ? 'btn-secondary' : 'btn-outline'}" data-status-filter="safe">Safe ≥${th.safe}% (${counts.safe})</button>
          <button class="btn btn-sm ${statusFilter === 'warn' ? 'btn-secondary' : 'btn-outline'}" data-status-filter="warn">Warning (${counts.warn})</button>
          <button class="btn btn-sm ${statusFilter === 'critical' ? 'btn-secondary' : 'btn-outline'}" data-status-filter="critical">Critical <${th.warn}% (${counts.critical})</button>
        </div>
      </div>

      <!-- Professional Directory Table (Prompt Specification: Roll No. | Name | Overall % | Status | Action) -->
      <div class="table-wrap">
        <table class="data-table workbench-table">
          <thead>
            <tr>
              <th style="width: 80px;">Roll No.</th>
              <th>Name</th>
              <th style="width: 140px;">Overall %</th>
              <th style="width: 120px;">Status</th>
              <th style="width: 140px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="5" style="text-align:center; padding: 28px; color:var(--ink-secondary);">
                  No students found matching your criteria.
                </td>
              </tr>
            ` : filtered.map(s => {
              const statusClass = s.stats.total === 0 ? 'badge-neutral' : `badge-${s.stats.status}`;
              const statusLabel = s.stats.total === 0 ? 'No Data' : Utils.statusLabel(s.stats.status);
              return `
                <tr>
                  <td><span class="roll-cell">${s.rollNumber}</span></td>
                  <td>
                    <div style="font-weight:600; color:var(--ink);">${Utils.escapeHTML(s.name)}</div>
                  </td>
                  <td>
                    <strong style="font-variant-numeric: tabular-nums; color:${s.stats.total === 0 ? 'var(--ink-secondary)' : s.stats.pct >= th.safe ? 'var(--safe)' : 'var(--critical)'};">
                      ${s.stats.total > 0 ? s.stats.pct + '%' : '—'}
                    </strong>
                    ${s.stats.total > 0 ? `<span style="font-size:11px; color:var(--ink-secondary); margin-left:4px;">(${s.stats.present + s.stats.late}/${s.stats.total})</span>` : ''}
                  </td>
                  <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                  <td style="text-align: right;">
                    <div style="display:inline-flex; gap:4px;">
                      <button class="btn btn-ghost btn-sm view-student-btn" data-id="${s.id}">Detail</button>
                      <button class="btn btn-ghost btn-sm edit-student-btn" data-id="${s.id}">Edit</button>
                    </div>
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

    const sortSelect = container.querySelector('#students-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, dir] = e.target.value.split('-');
        sortBy = field;
        sortAsc = dir === 'asc';
        render();
      });
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

    container.querySelectorAll('.edit-student-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = State.getStudent(btn.dataset.id);
        if (s) openStudentForm(s);
      });
    });

    const addBtn = container.querySelector('#btn-add-student-modal');
    if (addBtn) {
      addBtn.addEventListener('click', () => openStudentForm());
    }

    const exportBtn = container.querySelector('#btn-export-students-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportStudentsCSV);
    }
  }

  function openStudentForm(existing = null) {
    const isEdit = !!existing;
    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="field">
          <label>Roll Number *</label>
          <input type="number" id="modal-stu-roll" class="input" placeholder="e.g. 61" value="${existing ? existing.rollNumber : (State.getAllStudents().length + 1)}" min="1" max="999">
        </div>
        <div class="field">
          <label>Full Student Name *</label>
          <input type="text" id="modal-stu-name" class="input" placeholder="e.g. Sharma Rohit Anand" value="${existing ? Utils.escapeHTML(existing.name) : ''}">
        </div>
      </div>
    `;

    UI.openModal({
      title: isEdit ? `Edit Student (Roll No. ${existing.rollNumber})` : 'Add New Student to Batch',
      desc: 'SY BSc IT · 60 Students',
      bodyHTML,
      footerHTML: `
        <div style="display:flex; justify-content:space-between; width:100%;">
          ${isEdit ? `<button class="btn btn-ghost" id="modal-stu-delete" style="color:var(--critical);">Delete Student</button>` : '<div></div>'}
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline" id="modal-stu-cancel">Cancel</button>
            <button class="btn btn-primary" id="modal-stu-save">${isEdit ? 'Save Changes' : 'Add Student'}</button>
          </div>
        </div>
      `,
      onOpen: (overlay, close) => {
        overlay.querySelector('#modal-stu-cancel').addEventListener('click', close);
        
        overlay.querySelector('#modal-stu-save').addEventListener('click', () => {
          const roll = parseInt(overlay.querySelector('#modal-stu-roll').value, 10);
          const name = overlay.querySelector('#modal-stu-name').value.trim();
          if (!roll || roll <= 0) {
            UI.toast('Please enter a valid roll number', 'error');
            return;
          }
          if (!name) {
            UI.toast('Please enter the student name', 'error');
            return;
          }

          if (isEdit) {
            State.updateStudent(existing.id, { rollNumber: roll, name });
            UI.toast('Student record updated', 'success');
          } else {
            State.addStudent({ rollNumber: roll, name });
            UI.toast('Student added to batch', 'success');
          }
          close();
          render();
        });

        if (isEdit) {
          overlay.querySelector('#modal-stu-delete').addEventListener('click', async () => {
            const ok = await UI.confirmDialog({
              title: `Delete ${existing.name}?`,
              message: `Permanently delete Roll No. ${existing.rollNumber} (${existing.name}) and all associated attendance records?`,
              confirmLabel: 'Delete Student',
              danger: true
            });
            if (ok) {
              State.deleteStudent(existing.id);
              UI.toast('Student removed from batch', 'info');
              close();
              render();
            }
          });
        }
      }
    });
  }

  function openStudentDetail(studentId) {
    const student = State.getStudent(studentId);
    if (!student) return;

    const stats = Attendance.statsForStudent(studentId);
    const subjects = State.get().subjects;
    const allSessions = State.getAllSessions();

    // Get recent sessions for this student
    const studentRecords = State.getRecordsForStudent(studentId);
    const recordMap = {};
    studentRecords.forEach(r => { recordMap[r.sessionId] = r.status; });

    const recentSessions = allSessions.filter(s => recordMap[s.id] !== undefined).slice(0, 6);

    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <!-- Compact KPI Header Strip -->
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px;">
          <div class="card" style="padding:8px 10px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Overall %</div>
            <div class="stat-value" style="font-size:16px; color:${stats.total === 0 ? 'var(--ink)' : stats.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
              ${stats.total > 0 ? stats.pct + '%' : '—'}
            </div>
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
            <div class="stat-label" style="justify-content:center; font-size:10px;">Late</div>
            <div class="stat-value" style="font-size:16px; color:var(--warn);">${stats.late}</div>
          </div>
          <div class="card" style="padding:8px 10px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Attendance Risk</div>
            <div class="stat-value" style="font-size:13px; margin-top:2px;">
              <span class="badge ${stats.total === 0 ? 'badge-neutral' : stats.status === 'safe' ? 'badge-safe' : stats.status === 'warn' ? 'badge-warn' : 'badge-critical'}">
                ${stats.total > 0 ? Utils.statusLabel(stats.status) : 'No Data'}
              </span>
            </div>
          </div>
        </div>

        <!-- Subject-wise Attendance Breakdown -->
        <div class="section-title" style="font-size:12px; font-weight:650; margin-top:2px;">Subject-wise Attendance</div>
        <div class="table-wrap">
          <table class="data-table" style="font-size:12px;">
            <thead>
              <tr>
                <th>Subject</th>
                <th style="width:65px;">Attended</th>
                <th style="width:65px;">Absent</th>
                <th style="width:65px;">Total</th>
                <th style="width:75px;">Attendance %</th>
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
                    <td><strong style="color:${subStats.total === 0 ? 'var(--ink)' : subStats.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">${subStats.total > 0 ? subStats.pct + '%' : '—'}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Recent Sessions for this student -->
        <div class="section-title" style="font-size:12px; font-weight:650; margin-top:4px;">Recent Attendance Sessions</div>
        <div class="table-wrap">
          <table class="data-table" style="font-size:12px;">
            <thead>
              <tr>
                <th style="width:100px;">Date</th>
                <th>Subject</th>
                <th style="width:80px;">Type</th>
                <th style="width:90px; text-align:right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${recentSessions.length === 0 ? `
                <tr><td colspan="4" style="text-align:center; padding:16px; color:var(--ink-secondary);">No sessions recorded for this student yet.</td></tr>
              ` : recentSessions.map(sess => {
                const sub = State.getSubject(sess.subjectId);
                const st = recordMap[sess.id] || 'unmarked';
                const isSafe = st === 'present';
                const isLate = st === 'late';
                return `
                  <tr>
                    <td>${Utils.formatDate(sess.date)}</td>
                    <td><strong>${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</strong></td>
                    <td><span class="badge ${sess.type === 'practical' ? 'badge-safe' : 'badge-neutral'}">${(sess.type || 'theory').toUpperCase()}</span></td>
                    <td style="text-align:right;">
                      <span class="badge ${isSafe ? 'badge-safe' : isLate ? 'badge-warn' : 'badge-critical'}">${st.toUpperCase()}</span>
                    </td>
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
      desc: 'SY BSc IT · Student Attendance Record & Profile',
      bodyHTML,
      wide: true,
      footerHTML: `
        <div style="display:flex; justify-content:space-between; width:100%;">
          <button class="btn btn-outline" id="btn-edit-student-from-detail">Edit Student</button>
          <button class="btn btn-primary" id="btn-close-modal">Done</button>
        </div>
      `,
      onOpen: (overlay, close) => {
        overlay.querySelector('#btn-close-modal').addEventListener('click', close);
        overlay.querySelector('#btn-edit-student-from-detail').addEventListener('click', () => {
          close();
          openStudentForm(student);
        });
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

  return { render, openStudentDetail, openStudentForm };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = StudentsView;
