/* ============================================================
   ATTENDIFY — students.js (Apple × Academic SaaS Students Directory)
   Rebuilt from scratch:
   1. Recomposed Header: Title, Student Count Context, Add Student CTA
   2. Real-Data Cohort Statistics & Insights Strip
   3. Cohesive Distinct Floating Toolbar (Search, Sort, Segmented Filter)
   4. Refined Student List: Monogram Avatars, Roll Badges, Attendance Meters,
      Semantic Status Pills, Compact Actions & Responsive Mobile Card View
   5. High-Fidelity Student Academic Profile & Edit Modal
   ============================================================ */

const StudentsView = (() => {
  let searchQuery = '';
  let statusFilter = 'all'; // all | safe | warn | critical
  let sortBy = 'rollNumber'; // 'rollNumber' | 'name' | 'pct'
  let sortAsc = true;

  // Apple-Grade Monogram Palette (Plum, Mint, Amber, Cyan, Ruby, Lavender)
  const AVATAR_PALETTE = [
    { bg: 'rgba(124, 58, 237, 0.12)', text: '#7C3AED', border: 'rgba(124, 58, 237, 0.25)' },
    { bg: 'rgba(5, 150, 105, 0.12)',  text: '#059669', border: 'rgba(5, 150, 105, 0.25)' },
    { bg: 'rgba(217, 119, 6, 0.12)',  text: '#D97706', border: 'rgba(217, 119, 6, 0.25)' },
    { bg: 'rgba(2, 132, 199, 0.12)',  text: '#0284C7', border: 'rgba(2, 132, 199, 0.25)' },
    { bg: 'rgba(225, 29, 72, 0.12)',  text: '#E11D48', border: 'rgba(225, 29, 72, 0.25)' },
    { bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6', border: 'rgba(139, 92, 246, 0.25)' }
  ];

  function getInitials(name) {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  function getAvatarStyle(rollNumber) {
    const c = AVATAR_PALETTE[(rollNumber || 1) % AVATAR_PALETTE.length];
    return `background:${c.bg}; color:${c.text}; border:1px solid ${c.border};`;
  }

  function render(containerId = 'view-students') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const students = State.getAllStudents();
    const th = Attendance.thresholds();
    const batchStats = Attendance.overallBatchStats();

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
      <!-- 1. Recomposed Page Header with Rich Context -->
      <div class="view-header">
        <div>
          <h1>Students Directory</h1>
          <div style="display:flex; align-items:center; gap:8px; margin-top:5px; flex-wrap:wrap;">
            <div class="topbar-badge">
              <span class="topbar-badge-dot"></span>
              SY BSc IT Cohort · ${students.length} Enrolled Students
            </div>
            <span style="font-size:12px; color:var(--ink-tertiary);">Roll Numbers 1–${students.length} · Academic Term 2026-27</span>
          </div>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-secondary" id="btn-export-students-csv">
            ${UI.icon('download')} Export Roster CSV
          </button>
          <button class="btn btn-primary" id="btn-add-student-modal">
            ${UI.icon('plus')} Add Student
          </button>
        </div>
      </div>

      <!-- 2. Real-Data Cohort Statistics & Insights Cards -->
      <div class="stat-grid section" style="margin-bottom:18px;">
        <div class="stat-card">
          <div class="stat-label">${UI.icon('users')} Total Enrolled</div>
          <div class="stat-value">${students.length}</div>
          <div class="stat-sub">100% active roster in SY BSc IT</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">${UI.icon('trendUp')} Batch Attendance</div>
          <div class="stat-value" style="color:${batchStats.avgPct >= th.safe ? 'var(--safe)' : 'var(--critical)'};">
            ${batchStats.totalSessions > 0 ? batchStats.avgPct + '%' : '—'}
          </div>
          <div class="stat-sub">${batchStats.totalSessions} conducted sessions recorded</div>
        </div>

        <div class="stat-card" style="cursor:pointer;" id="stat-filter-safe">
          <div class="stat-label" style="color:var(--safe);">${UI.icon('checkCircle')} Compliant Standing</div>
          <div class="stat-value" style="color:var(--safe);">${counts.safe}</div>
          <div class="stat-sub">Above university ≥${th.safe}% threshold</div>
        </div>

        <div class="stat-card" style="cursor:pointer;" id="stat-filter-critical">
          <div class="stat-label" style="color:var(--critical);">${UI.icon('alert')} At-Risk Defaulters</div>
          <div class="stat-value" style="color:var(--critical);">${counts.critical + counts.warn}</div>
          <div class="stat-sub">${counts.critical} critical (<${th.warn}%) · ${counts.warn} warning</div>
        </div>
      </div>

      <!-- 3. Cohesive, Visually Distinct Floating Toolbar -->
      <div class="directory-toolbar section">
        <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; flex:1; min-width:280px;">
          <div class="search-box" style="flex:1; max-width:340px;">
            ${UI.icon('search')}
            <input type="text" id="students-search-input" class="input" placeholder="Search by student name or roll number..." value="${Utils.escapeHTML(searchQuery)}">
            ${searchQuery ? `<button class="icon-btn" id="students-clear-search" style="position:absolute; right:6px; width:22px; height:22px; font-size:12px; color:var(--ink-tertiary);" title="Clear search">${UI.icon('x')}</button>` : ''}
          </div>

          <div style="display:flex; gap:6px; align-items:center;">
            <span style="font-size:var(--fs-xs); color:var(--ink-secondary); font-weight:700;">Sort By:</span>
            <select id="students-sort-select" class="select" style="height:32px; font-size:12px; padding:2px 10px; width:auto;">
              <option value="rollNumber-asc" ${sortBy === 'rollNumber' && sortAsc ? 'selected' : ''}>Roll No. (Ascending)</option>
              <option value="rollNumber-desc" ${sortBy === 'rollNumber' && !sortAsc ? 'selected' : ''}>Roll No. (Descending)</option>
              <option value="name-asc" ${sortBy === 'name' && sortAsc ? 'selected' : ''}>Student Name (A–Z)</option>
              <option value="name-desc" ${sortBy === 'name' && !sortAsc ? 'selected' : ''}>Student Name (Z–A)</option>
              <option value="pct-desc" ${sortBy === 'pct' && !sortAsc ? 'selected' : ''}>Attendance % (Highest First)</option>
              <option value="pct-asc" ${sortBy === 'pct' && sortAsc ? 'selected' : ''}>Attendance % (Lowest First)</option>
            </select>
          </div>
        </div>

        <div class="segmented-control">
          <button class="segmented-item ${statusFilter === 'all' ? 'active' : ''}" data-status-filter="all">All (${counts.all})</button>
          <button class="segmented-item ${statusFilter === 'safe' ? 'active' : ''}" data-status-filter="safe">Safe ≥${th.safe}% (${counts.safe})</button>
          <button class="segmented-item ${statusFilter === 'warn' ? 'active' : ''}" data-status-filter="warn">Warning (${counts.warn})</button>
          <button class="segmented-item ${statusFilter === 'critical' ? 'active' : ''}" data-status-filter="critical">Critical <${th.warn}% (${counts.critical})</button>
        </div>
      </div>

      <!-- 4. Redesigned Student Roster Surface (Desktop Table & Mobile Cards) -->
      <div class="table-wrap students-table-wrap">
        <table class="data-table workbench-table students-data-table">
          <thead>
            <tr>
              <th style="width: 90px;">Roll No.</th>
              <th>Student Roster Profile</th>
              <th style="width: 220px;">Attendance Progress</th>
              <th style="width: 140px;">Academic Status</th>
              <th style="width: 130px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="5">
                  <div class="empty-state">
                    <div class="empty-state-icon">${UI.icon('search')}</div>
                    <h3>No Matching Students Found</h3>
                    <p>
                      No students match your filter criteria${searchQuery ? ` for "${Utils.escapeHTML(searchQuery)}"` : ''}.
                    </p>
                    <button class="btn btn-secondary btn-sm" id="btn-reset-student-filters">Reset Filters</button>
                  </div>
                </td>
              </tr>
            ` : filtered.map(s => {
              const hasRecords = s.stats.total > 0;
              const statusClass = hasRecords ? `badge-${s.stats.status}` : 'badge-neutral';
              const statusLabel = hasRecords ? (s.stats.status === 'safe' ? `Safe (≥${th.safe}%)` : s.stats.status === 'warn' ? `Warning (${th.warn}–${th.safe - 1}%)` : `Critical (<${th.warn}%)`) : 'No Records';
              const rollFormatted = s.rollNumber < 10 ? `0${s.rollNumber}` : `${s.rollNumber}`;
              const progressColor = !hasRecords ? 'var(--ink-tertiary)' : s.stats.pct >= th.safe ? 'var(--safe)' : s.stats.pct >= th.warn ? 'var(--warn)' : 'var(--critical)';
              
              return `
                <tr>
                  <td data-label="Roll Number">
                    <span class="roll-cell" title="Roll Number ${s.rollNumber}">#${rollFormatted}</span>
                  </td>
                  <td data-label="Student">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div class="student-avatar" style="${getAvatarStyle(s.rollNumber)}" aria-hidden="true">${getInitials(s.name)}</div>
                      <div>
                        <div style="font-weight:700; color:var(--ink); font-size:13.5px; letter-spacing:-0.01em;">${Utils.escapeHTML(s.name)}</div>
                        <div style="font-size:11px; color:var(--ink-secondary); font-family:var(--font-mono); margin-top:1px;">UID: ${s.id} · Batch 2026-27</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Attendance">
                    ${hasRecords ? `
                      <div style="display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; align-items:baseline; justify-content:space-between;">
                          <strong style="font-size:13.5px; font-variant-numeric:tabular-nums; color:${progressColor}; letter-spacing:-0.02em;">
                            ${s.stats.pct}%
                          </strong>
                          <span style="font-size:11px; color:var(--ink-tertiary); font-variant-numeric:tabular-nums;">
                            ${s.stats.present + s.stats.late} / ${s.stats.total} Sessions
                          </span>
                        </div>
                        <div style="width:100%; height:6px; background:var(--surface-subtle); border-radius:9999px; overflow:hidden; border:1px solid var(--border-subtle);">
                          <div style="height:100%; width:${s.stats.pct}%; background:${progressColor}; border-radius:9999px; transition:width 0.3s ease;"></div>
                        </div>
                      </div>
                    ` : `
                      <span style="color:var(--ink-tertiary); font-size:12px; font-style:italic;">No attendance records yet</span>
                    `}
                  </td>
                  <td data-label="Status">
                    <span class="badge ${statusClass}">${statusLabel}</span>
                  </td>
                  <td style="text-align: right;" data-label="Actions">
                    <div style="display:inline-flex; gap:6px; align-items:center;">
                      <button class="btn btn-secondary btn-sm view-student-btn" data-id="${s.id}" title="View Student Academic Profile">
                        Profile
                      </button>
                      <button class="icon-btn edit-student-btn" data-id="${s.id}" title="Edit Student Information" style="width:28px; height:28px;">
                        ${UI.icon('edit')}
                      </button>
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

    const clearSearchBtn = container.querySelector('#students-clear-search');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchQuery = '';
        render();
      });
    }

    const resetFilterBtn = container.querySelector('#btn-reset-student-filters');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        searchQuery = '';
        statusFilter = 'all';
        sortBy = 'rollNumber';
        sortAsc = true;
        render();
      });
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

    const statSafe = container.querySelector('#stat-filter-safe');
    if (statSafe) {
      statSafe.addEventListener('click', () => {
        statusFilter = 'safe';
        render();
      });
    }

    const statCrit = container.querySelector('#stat-filter-critical');
    if (statCrit) {
      statCrit.addEventListener('click', () => {
        statusFilter = 'critical';
        render();
      });
    }

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
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="field">
          <label for="modal-stu-roll">Roll Number *</label>
          <input type="number" id="modal-stu-roll" class="input" placeholder="e.g. 61" value="${existing ? existing.rollNumber : (State.getAllStudents().length + 1)}" min="1" max="9999" autocomplete="off">
          <div id="modal-stu-roll-error" class="form-error-msg" style="display:none;"></div>
        </div>
        <div class="field">
          <label for="modal-stu-name">Full Student Name *</label>
          <input type="text" id="modal-stu-name" class="input" placeholder="e.g. Sharma Rohit Anand" value="${existing ? Utils.escapeHTML(existing.name) : ''}" autocomplete="off">
          <div id="modal-stu-name-error" class="form-error-msg" style="display:none;"></div>
        </div>
      </div>
    `;

    UI.openModal({
      title: isEdit ? `Edit Student (Roll No. ${existing.rollNumber})` : 'Add New Student to Batch',
      desc: 'SY BSc IT · Academic Cohort · Single Batch',
      bodyHTML,
      footerHTML: `
        <div style="display:flex; justify-content:space-between; width:100%;">
          ${isEdit ? `<button class="btn btn-ghost" id="modal-stu-delete" style="color:var(--critical);">Delete Student</button>` : '<div></div>'}
          <div style="display:flex; gap:9px;">
            <button class="btn btn-secondary" id="modal-stu-cancel">Cancel</button>
            <button class="btn btn-primary" id="modal-stu-save">${isEdit ? 'Save Changes' : 'Add Student'}</button>
          </div>
        </div>
      `,
      onOpen: (overlay, close) => {
        const rollInput = overlay.querySelector('#modal-stu-roll');
        const nameInput = overlay.querySelector('#modal-stu-name');
        const rollError = overlay.querySelector('#modal-stu-roll-error');
        const nameError = overlay.querySelector('#modal-stu-name-error');

        overlay.querySelector('#modal-stu-cancel').addEventListener('click', close);
        
        overlay.querySelector('#modal-stu-save').addEventListener('click', () => {
          rollInput.classList.remove('is-invalid');
          nameInput.classList.remove('is-invalid');
          rollError.style.display = 'none';
          nameError.style.display = 'none';

          const val = Validation.validateStudent({
            rollNumber: rollInput.value,
            name: nameInput.value,
            existingId: existing ? existing.id : null,
            students: State.getAllStudents()
          });

          if (!val.valid) {
            if (val.errors.rollNumber) {
              rollInput.classList.add('is-invalid');
              rollError.textContent = val.errors.rollNumber;
              rollError.style.display = 'flex';
            }
            if (val.errors.name) {
              nameInput.classList.add('is-invalid');
              nameError.textContent = val.errors.name;
              nameError.style.display = 'flex';
            }
            UI.toast('Please correct the validation errors in the form', 'error');
            return;
          }

          const roll = parseInt(rollInput.value, 10);
          const name = nameInput.value.trim();

          if (isEdit) {
            State.updateStudent(existing.id, { rollNumber: roll, name });
            UI.toast(`Updated Roll ${roll} (${name})`, 'success');
          } else {
            State.addStudent({ rollNumber: roll, name });
            UI.toast(`Added Roll ${roll} (${name}) to batch`, 'success');
          }
          close();
          render();
        });

        if (isEdit) {
          overlay.querySelector('#modal-stu-delete').addEventListener('click', async () => {
            const ok = await UI.confirmDialog({
              title: `Delete ${existing.name}?`,
              message: `Permanently delete Roll No. ${existing.rollNumber} (${existing.name}) and all associated attendance records? This cannot be undone.`,
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
    const th = Attendance.thresholds();

    const studentRecords = State.getRecordsForStudent(studentId);
    const recordMap = {};
    studentRecords.forEach(r => { recordMap[r.sessionId] = r.status; });

    const recentSessions = allSessions.filter(s => recordMap[s.id] !== undefined).slice(0, 6);

    let roadmapNotice = '';
    if (stats.total > 0) {
      if (stats.pct >= th.safe) {
        const canMiss = Utils.classesCanMiss(stats.present + stats.late, stats.total, th.safe);
        roadmapNotice = `
          <div class="card" style="padding:12px 16px; background:var(--safe-subtle); border-color:var(--safe-border); display:flex; align-items:center; gap:10px;">
            <span style="color:var(--safe); font-size:18px;">${UI.icon('checkCircle')}</span>
            <div style="font-size:12.5px; color:var(--safe-ink); font-weight:600;">
              Compliant Standing: Student is safely above the ${th.safe}% threshold and can miss up to <strong>${canMiss}</strong> upcoming session${canMiss === 1 ? '' : 's'}.
            </div>
          </div>
        `;
      } else {
        const needed = Utils.classesNeededToRecover(stats.present + stats.late, stats.total, th.safe);
        roadmapNotice = `
          <div class="card" style="padding:12px 16px; background:var(--critical-subtle); border-color:var(--critical-border); display:flex; align-items:center; gap:10px;">
            <span style="color:var(--critical); font-size:18px;">${UI.icon('alert')}</span>
            <div style="font-size:12.5px; color:var(--critical-ink); font-weight:600;">
              Defaulter Alert: Student is below the ${th.safe}% threshold and must attend the next <strong>${needed}</strong> consecutive session${needed === 1 ? '' : 's'} to recover.
            </div>
          </div>
        `;
      }
    }

    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        ${roadmapNotice}

        <!-- Compact KPI Header Strip -->
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:10px;">
          <div class="card" style="padding:10px 12px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Overall %</div>
            <div class="stat-value" style="font-size:18px; color:${stats.total === 0 ? 'var(--ink)' : stats.pct >= th.safe ? 'var(--safe)' : 'var(--critical)'};">
              ${stats.total > 0 ? stats.pct + '%' : '—'}
            </div>
          </div>
          <div class="card" style="padding:10px 12px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Present</div>
            <div class="stat-value" style="font-size:18px; color:var(--safe);">${stats.present}</div>
          </div>
          <div class="card" style="padding:10px 12px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Absent</div>
            <div class="stat-value" style="font-size:18px; color:var(--critical);">${stats.absent}</div>
          </div>
          <div class="card" style="padding:10px 12px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Late</div>
            <div class="stat-value" style="font-size:18px; color:var(--warn);">${stats.late}</div>
          </div>
          <div class="card" style="padding:10px 12px; text-align:center;">
            <div class="stat-label" style="justify-content:center; font-size:10px;">Status</div>
            <div class="stat-value" style="font-size:12px; margin-top:4px;">
              <span class="badge ${stats.total === 0 ? 'badge-neutral' : stats.status === 'safe' ? 'badge-safe' : stats.status === 'warn' ? 'badge-warn' : 'badge-critical'}">
                ${stats.total > 0 ? Utils.statusLabel(stats.status) : 'No Data'}
              </span>
            </div>
          </div>
        </div>

        <!-- Subject-wise Attendance Breakdown -->
        <div class="section-title" style="font-size:13px; font-weight:700; margin-top:4px;">Course Curriculum Breakdown</div>
        <div class="table-wrap">
          <table class="data-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th>Course Name</th>
                <th style="width:80px; text-align:center;">Attended</th>
                <th style="width:80px; text-align:center;">Absent</th>
                <th style="width:80px; text-align:center;">Total</th>
                <th style="width:100px; text-align:center;">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(sub => {
                const subStats = Attendance.statsForStudentInSubject(studentId, sub.id);
                return `
                  <tr>
                    <td><strong>${Utils.escapeHTML(sub.name)}</strong></td>
                    <td style="color:var(--safe); font-weight:600; text-align:center;">${subStats.present + subStats.late}</td>
                    <td style="color:var(--critical); font-weight:600; text-align:center;">${subStats.absent}</td>
                    <td style="text-align:center;">${subStats.total}</td>
                    <td style="text-align:center;"><strong style="color:${subStats.total === 0 ? 'var(--ink)' : subStats.pct >= th.safe ? 'var(--safe)' : 'var(--critical)'}; font-variant-numeric:tabular-nums;">${subStats.total > 0 ? subStats.pct + '%' : '—'}</strong></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Recent Sessions for this student -->
        <div class="section-title" style="font-size:13px; font-weight:700; margin-top:6px;">Recent Attendance Records</div>
        <div class="table-wrap">
          <table class="data-table" style="font-size:12.5px;">
            <thead>
              <tr>
                <th style="width:110px;">Date</th>
                <th>Subject</th>
                <th style="width:90px;">Type</th>
                <th style="width:100px; text-align:right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${recentSessions.length === 0 ? `
                <tr><td colspan="4" style="text-align:center; padding:20px; color:var(--ink-secondary);">No sessions recorded for this student yet.</td></tr>
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
          <button class="btn btn-secondary" id="btn-edit-student-from-detail">Edit Student</button>
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
