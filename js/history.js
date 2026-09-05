/* ============================================================
   ATTENDIFY — history.js (Attendance History & Session Audit)
   View, filter, edit, and audit recorded sessions
   ============================================================ */

const HistoryView = (() => {
  let subjectFilter = 'all';

  function render(containerId = 'view-history') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sessions = State.getAllSessions();
    const subjects = State.get().subjects;

    let filtered = sessions;
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(s => s.subjectId === subjectFilter);
    }

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Attendance History</h1>
          <p class="view-subtitle">Audit log of all recorded SY BSc IT attendance sessions</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-primary" onclick="App.navigateTo('mark-attendance')">
            ${UI.icon('plus')} Mark New Lecture
          </button>
        </div>
      </div>

      <!-- Controls & Filters -->
      <div class="section" style="display:flex; gap:10px; align-items:center; margin-bottom:14px;">
        <div style="min-width: 200px;">
          <select id="history-subject-filter" class="select">
            <option value="all">All Subjects</option>
            ${subjects.map(s => `
              <option value="${s.id}" ${s.id === subjectFilter ? 'selected' : ''}>${Utils.escapeHTML(s.name)}</option>
            `).join('')}
          </select>
        </div>
        <div style="font-size:var(--fs-xs); color:var(--ink-tertiary);">
          ${filtered.length} session${filtered.length === 1 ? '' : 's'} on record
        </div>
      </div>

      <!-- History Table -->
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 110px;">Date</th>
              <th>Subject</th>
              <th style="width: 80px;">Time</th>
              <th style="width: 80px;">Present</th>
              <th style="width: 80px;">Absent</th>
              <th style="width: 80px;">Late</th>
              <th style="width: 110px;">Attendance %</th>
              <th style="width: 110px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align:center; padding: 32px; color:var(--ink-secondary);">
                  No attendance sessions recorded yet.
                </td>
              </tr>
            ` : filtered.map(sess => {
              const sub = State.getSubject(sess.subjectId);
              const stats = Attendance.statsForSession(sess.id);
              const isSafe = stats.status === 'safe';
              return `
                <tr>
                  <td><strong>${Utils.formatDate(sess.date)}</strong></td>
                  <td>
                    <div style="font-weight:600; color:var(--ink);">${sub ? Utils.escapeHTML(sub.name) : 'Unknown Subject'}</div>
                  </td>
                  <td><span style="color:var(--ink-secondary); font-variant-numeric: tabular-nums;">${sess.startTime || '—'}</span></td>
                  <td><span style="color:var(--safe); font-weight:600;">${stats.present}</span></td>
                  <td><span style="color:var(--critical); font-weight:600;">${stats.absent}</span></td>
                  <td><span style="color:var(--warn); font-weight:600;">${stats.late}</span></td>
                  <td>
                    <span class="badge ${isSafe ? 'badge-safe' : 'badge-critical'}">${stats.pct}%</span>
                  </td>
                  <td style="text-align: right;">
                    <div style="display:inline-flex; gap:4px;">
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
          message: `Permanently delete this session on ${sess ? Utils.formatDate(sess.date) : ''} for ${sub ? sub.name : 'this subject'} and all 60 student records?`,
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
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = HistoryView;
