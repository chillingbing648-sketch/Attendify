/* ============================================================
   ATTENDIFY — subjects.js (Admin Academic Subjects)
   Manage curriculum, view batch performance per subject
   ============================================================ */

const Subjects = (() => {
  function render(containerId = 'view-subjects') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const subjects = State.get().subjects;

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Subjects</h1>
          <p class="view-subtitle">SY BSc IT · Academic Course Management</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-primary" id="btn-add-subject-modal">
            ${UI.icon('plus')} Add Subject
          </button>
        </div>
      </div>

      <div class="table-wrap section">
        <table class="data-table">
          <thead>
            <tr>
              <th>Subject Name</th>
              <th style="width: 150px;">Faculty / Teacher</th>
              <th style="width: 120px;">Sessions Held</th>
              <th style="width: 140px;">Avg Attendance %</th>
              <th style="width: 140px;">Last Session</th>
              <th style="width: 180px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${subjects.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align:center; padding: 32px; color:var(--ink-3);">
                  No subjects configured. Add your first subject to start tracking.
                </td>
              </tr>
            ` : subjects.map(sub => {
              const stats = Attendance.statsForSubject(sub.id);
              return `
                <tr>
                  <td>
                    <div style="font-weight:600; color:var(--ink);">${Utils.escapeHTML(sub.name)}</div>
                    <div style="font-size:var(--fs-xs); color:var(--ink-3);">${sub.room ? 'Room: ' + Utils.escapeHTML(sub.room) : ''}</div>
                  </td>
                  <td>${Utils.escapeHTML(sub.teacher || 'Not assigned')}</td>
                  <td><strong>${stats.sessionCount}</strong></td>
                  <td>
                    <span class="badge ${stats.sessionCount === 0 ? 'badge-neutral' : stats.pct >= 75 ? 'badge-safe' : 'badge-critical'}">
                      ${stats.sessionCount > 0 ? stats.pct + '%' : 'No Data'}
                    </span>
                  </td>
                  <td>${stats.lastSession ? Utils.formatDate(stats.lastSession.date) : 'Never'}</td>
                  <td style="text-align: right;">
                    <div style="display:inline-flex; gap:6px;">
                      <button class="btn btn-primary btn-sm mark-sub-btn" data-id="${sub.id}">Mark Attendance</button>
                      <button class="btn btn-outline btn-sm edit-sub-btn" data-id="${sub.id}">Edit</button>
                      <button class="btn btn-ghost btn-sm delete-sub-btn" data-id="${sub.id}" style="color:var(--critical);">Delete</button>
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
    const addBtn = container.querySelector('#btn-add-subject-modal');
    if (addBtn) addBtn.addEventListener('click', () => openSubjectForm());

    container.querySelectorAll('.mark-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        App.navigateToMarkSubject(btn.dataset.id);
      });
    });

    container.querySelectorAll('.edit-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const sub = State.getSubject(btn.dataset.id);
        if (sub) openSubjectForm(sub);
      });
    });

    container.querySelectorAll('.delete-sub-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sub = State.getSubject(btn.dataset.id);
        if (!sub) return;

        const ok = await UI.confirmDialog({
          title: 'Delete Subject?',
          message: `Permanently delete "${sub.name}" and all associated attendance sessions?`,
          confirmLabel: 'Delete Subject',
          danger: true
        });

        if (ok) {
          State.deleteSubject(sub.id);
          UI.toast('Subject deleted', 'info');
          render();
        }
      });
    });
  }

  function openSubjectForm(existing = null) {
    const isEdit = !!existing;
    const bodyHTML = `
      <div class="field">
        <label>Subject Name *</label>
        <input type="text" id="modal-sub-name" class="input" placeholder="e.g. Web Designing" value="${existing ? Utils.escapeHTML(existing.name) : ''}">
      </div>
      <div class="field-row">
        <div class="field">
          <label>Faculty / Teacher</label>
          <input type="text" id="modal-sub-teacher" class="input" placeholder="e.g. Prof. Sharma" value="${existing ? Utils.escapeHTML(existing.teacher || '') : ''}">
        </div>
        <div class="field">
          <label>Room / Lab</label>
          <input type="text" id="modal-sub-room" class="input" placeholder="e.g. Lab 2" value="${existing ? Utils.escapeHTML(existing.room || '') : ''}">
        </div>
      </div>
    `;

    UI.openModal({
      title: isEdit ? 'Edit Subject' : 'Add New Subject',
      desc: 'SY BSc IT Curriculum',
      bodyHTML,
      footerHTML: `
        <button class="btn btn-outline" id="modal-sub-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-sub-save">${isEdit ? 'Save Changes' : 'Create Subject'}</button>
      `,
      onOpen: (overlay, close) => {
        overlay.querySelector('#modal-sub-cancel').addEventListener('click', close);
        overlay.querySelector('#modal-sub-save').addEventListener('click', () => {
          const name = overlay.querySelector('#modal-sub-name').value.trim();
          if (!name) {
            UI.toast('Subject name is required', 'error');
            return;
          }
          const teacher = overlay.querySelector('#modal-sub-teacher').value.trim();
          const room = overlay.querySelector('#modal-sub-room').value.trim();

          if (isEdit) {
            State.updateSubject(existing.id, { name, teacher, room });
            UI.toast('Subject updated', 'success');
          } else {
            State.addSubject({ name, teacher, room });
            UI.toast('Subject added', 'success');
          }
          close();
          render();
        });
      }
    });
  }

  return { render, openSubjectForm };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Subjects;
