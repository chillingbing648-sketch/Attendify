/* ============================================================
   ATTENDIFY — history.js (Attendance History & Session Audit Trail)
   Audit log: Date, Subject, Type, Present, Absent, Late, %, Status, Actions (View, Edit)
   ============================================================ */

const HistoryView = (() => {
  let subjectFilter = 'all';
  let typeFilter = 'all'; // all | lecture | practical

  function render(containerId = 'view-history') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sessions = State.getAllSessions();
    const subjects = State.get().subjects;

    let filtered = sessions;
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(s => s.subjectId === subjectFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(s => (s.type || 'theory') === typeFilter || (typeFilter === 'lecture' && s.type === 'theory'));
    }

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Attendance History</h1>
          <p class="view-subtitle">Audit log of all recorded SY BSc IT attendance sessions</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-outline" id="btn-export-history-csv">
            ${UI.icon('download')} Export History CSV
          </button>
          <button class="btn btn-primary" onclick="App.openMarkChoiceModal()">
            ${UI.icon('plus')} Mark Attendance
          </button>
        </div>
      </div>

      <!-- Controls & Filters -->
      <div class="section" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px;">
        <div style="min-width: 180px;">
          <select id="history-subject-filter" class="select">
            <option value="all">All Subjects</option>
            ${subjects.map(s => `
              <option value="${s.id}" ${s.id === subjectFilter ? 'selected' : ''}>${Utils.escapeHTML(s.name)}</option>
            `).join('')}
          </select>
        </div>

        <div style="display:flex; gap:4px;">
          <button class="btn btn-sm ${typeFilter === 'all' ? 'btn-secondary' : 'btn-outline'}" data-type-filter="all">All Types</button>
          <button class="btn btn-sm ${typeFilter === 'lecture' ? 'btn-secondary' : 'btn-outline'}" data-type-filter="lecture">Lectures</button>
          <button class="btn btn-sm ${typeFilter === 'practical' ? 'btn-secondary' : 'btn-outline'}" data-type-filter="practical">Practicals</button>
        </div>

        <div style="font-size:var(--fs-xs); color:var(--ink-tertiary); margin-left:auto;">
          ${filtered.length} session${filtered.length === 1 ? '' : 's'} on record
        </div>
      </div>

      <!-- History Table (Prompt 13: Date | Subject | Type | Present | Absent | Late | % | Status | Actions) -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 110px;">Date</th>
              <th>Subject</th>
              <th style="width: 95px;">Type</th>
              <th style="width: 75px; text-align:center;">Present</th>
              <th style="width: 75px; text-align:center;">Absent</th>
              <th style="width: 75px; text-align:center;">Late</th>
              <th style="width: 85px; text-align:center;">%</th>
              <th style="width: 100px; text-align:center;">Status</th>
              <th style="width: 140px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="9" style="text-align:center; padding: 32px; color:var(--ink-secondary);">
                  No attendance sessions match the current filters.
                </td>
              </tr>
            ` : filtered.map(sess => {
              const sub = State.getSubject(sess.subjectId);
              const stats = Attendance.statsForSession(sess.id);
              const isPractical = sess.type === 'practical';
              const isSafe = stats.status === 'safe';
              return `
                <tr>
                  <td>
                    <strong>${Utils.formatDate(sess.date)}</strong>
                    <div style="font-size:11px; color:var(--ink-tertiary); font-variant-numeric:tabular-nums;">${sess.startTime || '09:00'}</div>
                  </td>
                  <td>
                    <div style="font-weight:600; color:var(--ink);">${sub ? Utils.escapeHTML(sub.name) : 'Unknown Subject'}</div>
                    ${sess.experimentTitle ? `<div style="font-size:11px; color:var(--ink-secondary); font-style:italic;">${Utils.escapeHTML(sess.experimentTitle)}</div>` : ''}
                  </td>
                  <td>
                    <span class="badge ${isPractical ? 'badge-safe' : 'badge-neutral'}">
                      ${isPractical ? 'PRACTICAL' : 'LECTURE'}
                    </span>
                  </td>
                  <td style="text-align:center;"><span style="color:var(--safe); font-weight:650;">${stats.present}</span></td>
                  <td style="text-align:center;"><span style="color:var(--critical); font-weight:650;">${stats.absent}</span></td>
                  <td style="text-align:center;"><span style="color:var(--warn); font-weight:650;">${stats.late}</span></td>
                  <td style="text-align:center;">
                    <strong style="font-variant-numeric: tabular-nums;">${stats.pct}%</strong>
                  </td>
                  <td style="text-align:center;">
                    <span class="badge ${isSafe ? 'badge-safe' : 'badge-critical'}">${Utils.statusLabel(stats.status)}</span>
                  </td>
                  <td style="text-align: right;">
                    <div style="display:inline-flex; gap:4px;">
                      <button class="btn btn-ghost btn-sm view-session-btn" data-id="${sess.id}">View</button>
                      <button class="btn btn-outline btn-sm edit-session-btn" data-id="${sess.id}">Edit</button>
                      <button class="btn btn-ghost btn-sm delete-session-btn" data-id="${sess.id}" style="color:var(--critical);" title="Delete Session">${UI.icon('trash')}</button>
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
    const filterSelect = container.querySelector('#history-subject-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        subjectFilter = e.target.value;
        render();
      });
    }

    container.querySelectorAll('[data-type-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        typeFilter = btn.dataset.typeFilter;
        render();
      });
    });

    container.querySelectorAll('.view-session-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openSessionDetailModal(btn.dataset.id);
      });
    });

    container.querySelectorAll('.edit-session-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        App.navigateToMarkSession(btn.dataset.id);
      });
    });

    container.querySelectorAll('.delete-session-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const sess = State.getSession(id);
        const sub = sess ? State.getSubject(sess.subjectId) : null;
        const ok = await UI.confirmDialog({
          title: 'Delete Attendance Session?',
          message: `Permanently delete this session on ${sess ? Utils.formatDate(sess.date) : ''} for ${sub ? sub.name : 'this subject'} and all student records?`,
          confirmLabel: 'Delete Session',
          danger: true
        });

        if (ok) {
          State.deleteSession(id);
          UI.toast('Session deleted', 'info');
          render();
        }
      });
    });

    const exportBtn = container.querySelector('#btn-export-history-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportHistoryCSV);
    }
  }

  function openSessionDetailModal(sessionId) {
    const sess = State.getSession(sessionId);
    if (!sess) return;
    const sub = State.getSubject(sess.subjectId);
    const stats = Attendance.statsForSession(sessionId);
    const studentList = Attendance.sessionStudentList(sessionId);
    const isPractical = sess.type === 'practical';

    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; background:var(--surface-subtle); padding:10px 12px; border-radius:var(--r-md); border:1px solid var(--border);">
          <div>
            <div style="font-size:10px; color:var(--ink-tertiary); text-transform:uppercase; font-weight:700;">Date & Time</div>
            <div style="font-weight:700; font-size:13px; color:var(--ink);">${Utils.formatDate(sess.date)} (${sess.startTime || '09:00'})</div>
          </div>
          <div>
            <div style="font-size:10px; color:var(--ink-tertiary); text-transform:uppercase; font-weight:700;">Subject</div>
            <div style="font-weight:700; font-size:13px; color:var(--ink);">${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</div>
          </div>
          <div>
            <div style="font-size:10px; color:var(--ink-tertiary); text-transform:uppercase; font-weight:700;">Category</div>
            <div style="font-weight:700; font-size:13px; color:var(--ink);">${isPractical ? 'Practical Lab' : 'Theory Lecture'}</div>
          </div>
          <div>
            <div style="font-size:10px; color:var(--ink-tertiary); text-transform:uppercase; font-weight:700;">Turnout</div>
            <div style="font-weight:700; font-size:13px; color:${stats.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
              ${stats.pct}% (${stats.present} P · ${stats.absent} A · ${stats.late} L)
            </div>
          </div>
        </div>

        ${sess.experimentTitle ? `
          <div style="font-size:12px; color:var(--ink-secondary);">
            <strong>Experiment Title:</strong> ${Utils.escapeHTML(sess.experimentTitle)}
          </div>
        ` : ''}

        <div class="section-title" style="font-size:12px; font-weight:650; margin-top:4px;">Registered Students (${studentList.length})</div>
        <div class="table-wrap" style="max-height:340px; overflow-y:auto;">
          <table class="data-table" style="font-size:12px;">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">#</th>
                <th style="width:75px;">Roll No</th>
                <th>Student Name</th>
                <th style="width:100px; text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${studentList.map((item, idx) => {
                const isP = item.status === 'present';
                const isL = item.status === 'late';
                const isA = item.status === 'absent';
                return `
                  <tr>
                    <td style="text-align:center; color:var(--ink-tertiary); font-size:11px;">${idx + 1}</td>
                    <td><strong>${item.student.rollNumber}</strong></td>
                    <td><div style="font-weight:550; color:var(--ink);">${Utils.escapeHTML(item.student.name)}</div></td>
                    <td style="text-align:center;">
                      <span class="badge ${isP ? 'badge-safe' : isL ? 'badge-warn' : isA ? 'badge-critical' : 'badge-neutral'}">
                        ${(item.status || 'UNMARKED').toUpperCase()}
                      </span>
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
      title: `Session Audit: ${sub ? sub.name : 'Course'}`,
      desc: `Recorded on ${Utils.formatDate(sess.date)} · ${isPractical ? 'Practical Lab' : 'Lecture'}`,
      bodyHTML,
      wide: true,
      footerHTML: `
        <div style="display:flex; justify-content:space-between; width:100%;">
          <button class="btn btn-outline" id="modal-edit-sess-btn">Edit This Session</button>
          <button class="btn btn-primary" id="modal-close-sess-btn">Close</button>
        </div>
      `,
      onOpen: (overlay, close) => {
        overlay.querySelector('#modal-close-sess-btn').addEventListener('click', close);
        overlay.querySelector('#modal-edit-sess-btn').addEventListener('click', () => {
          close();
          App.navigateToMarkSession(sessionId);
        });
      }
    });
  }

  function exportHistoryCSV() {
    const sessions = State.getAllSessions();
    const rows = [
      ['Session ID', 'Date', 'Time', 'Subject', 'Type', 'Experiment Title', 'Present', 'Absent', 'Late', 'Total', 'Attendance %', 'Status']
    ];

    sessions.forEach(sess => {
      const sub = State.getSubject(sess.subjectId);
      const stats = Attendance.statsForSession(sess.id);
      rows.push([
        sess.id,
        sess.date,
        sess.startTime || '09:00',
        `"${sub ? sub.name.replace(/"/g, '""') : 'Subject'}"`,
        sess.type || 'theory',
        `"${(sess.experimentTitle || '').replace(/"/g, '""')}"`,
        stats.present,
        stats.absent,
        stats.late,
        stats.total,
        stats.pct + '%',
        Utils.statusLabel(stats.status)
      ]);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    Utils.downloadFile(`Attendify_Attendance_History_${Utils.todayISO()}.csv`, csv, 'text/csv');
    UI.toast('Exported attendance history CSV', 'success');
  }

  function setSubjectFilter(subId) {
    subjectFilter = subId;
  }

  return { render, setSubjectFilter };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = HistoryView;
