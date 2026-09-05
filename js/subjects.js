/* ============================================================
   ATTENDIFY — subjects.js (Admin Academic Courses)
   Manage curriculum: Name, Code, Faculty, Lecture/Practical,
   Sessions, Attendance %, Last Session, Mark Attendance, View Attendance
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
          <p class="view-subtitle">SY BSc IT · Academic Course Management & Curriculum</p>
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
              <th style="width: 110px;">Code</th>
              <th>Course Name</th>
              <th style="width: 140px;">Faculty</th>
              <th style="width: 120px;">Category</th>
              <th style="width: 90px; text-align: center;">Sessions</th>
              <th style="width: 130px;">Attendance %</th>
              <th style="width: 120px;">Last Session</th>
              <th style="width: 220px; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${subjects.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align:center; padding: 32px; color:var(--ink-secondary);">
                  No subjects configured. Add your first course to start recording attendance.
                </td>
              </tr>
            ` : subjects.map(sub => {
              const stats = Attendance.statsForSubject(sub.id);
              const code = sub.code || getAutoCode(sub.name);
              const typeLabel = sub.type === 'practical' ? 'Practical' : sub.type === 'theory' ? 'Lecture' : 'Lecture + Lab';
              return `
                <tr>
                  <td><span class="badge badge-neutral" style="font-family:var(--font-mono); font-weight:700;">${Utils.escapeHTML(code)}</span></td>
                  <td>
                    <div style="font-weight:600; color:var(--ink);">${Utils.escapeHTML(sub.name)}</div>
                    <div style="font-size:var(--fs-xs); color:var(--ink-tertiary);">${sub.room ? 'Location: ' + Utils.escapeHTML(sub.room) : ''}</div>
                  </td>
                  <td>${Utils.escapeHTML(sub.teacher || 'Not Assigned')}</td>
                  <td>
                    <span class="badge ${sub.type === 'practical' ? 'badge-safe' : 'badge-neutral'}">
                      ${typeLabel}
                    </span>
                  </td>
                  <td style="text-align: center;"><strong>${stats.sessionCount}</strong></td>
                  <td>
                    <span class="badge ${stats.sessionCount === 0 ? 'badge-neutral' : stats.pct >= 75 ? 'badge-safe' : 'badge-critical'}">
                      ${stats.sessionCount > 0 ? stats.pct + '%' : 'No Data'}
                    </span>
                  </td>
                  <td>${stats.lastSession ? Utils.formatDate(stats.lastSession.date) : 'Never'}</td>
                  <td style="text-align: right;">
                    <div style="display:inline-flex; gap:4px;">
                      <button class="btn btn-primary btn-sm mark-sub-btn" data-id="${sub.id}" title="Record Attendance">
                        Mark
                      </button>
                      <button class="btn btn-outline btn-sm view-sub-btn" data-id="${sub.id}" title="View Attendance History for this course">
                        History
                      </button>
                      <button class="btn btn-ghost btn-sm edit-sub-btn" data-id="${sub.id}">Edit</button>
                      <button class="btn btn-ghost btn-sm delete-sub-btn" data-id="${sub.id}" style="color:var(--critical);">${UI.icon('trash')}</button>
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

  function getAutoCode(name) {
    if (!name) return 'IT300';
    if (name.includes('Web')) return 'IT301';
    if (name.includes('Oriented') || name.includes('C++')) return 'IT302';
    if (name.includes('SQL') || name.includes('PL')) return 'IT303';
    if (name.includes('Python')) return 'IT304';
    if (name.includes('Assembly')) return 'IT305';
    if (name.includes('Environmental')) return 'IT306';
    return 'IT30' + (name.length % 9 + 1);
  }

  function bindEvents(container) {
    const addBtn = container.querySelector('#btn-add-subject-modal');
    if (addBtn) addBtn.addEventListener('click', () => openSubjectForm());

    container.querySelectorAll('.mark-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        App.navigateToMarkSubject(btn.dataset.id);
      });
    });

    container.querySelectorAll('.view-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        HistoryView.setSubjectFilter(btn.dataset.id);
        App.navigateTo('history');
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
          title: `Delete ${sub.name}?`,
          message: `Permanently delete "${sub.name}" and all associated attendance sessions and logs?`,
          confirmLabel: 'Delete Subject',
          danger: true
        });

        if (ok) {
          State.deleteSubject(sub.id);
          UI.toast('Subject removed', 'info');
          render();
        }
      });
    });
  }

  function openSubjectForm(existing = null) {
    const isEdit = !!existing;
    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="field-row">
          <div class="field" style="flex:2;">
            <label>Subject Name *</label>
            <input type="text" id="modal-sub-name" class="input" placeholder="e.g. Web Designing" value="${existing ? Utils.escapeHTML(existing.name) : ''}">
          </div>
          <div class="field" style="flex:1;">
            <label>Course Code</label>
            <input type="text" id="modal-sub-code" class="input" placeholder="e.g. IT301" value="${existing ? Utils.escapeHTML(existing.code || getAutoCode(existing.name)) : ''}">
          </div>
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
        <div class="field">
          <label>Course Type</label>
          <select id="modal-sub-type" class="select">
            <option value="both" ${!existing || existing.type === 'both' ? 'selected' : ''}>Lecture & Practical</option>
            <option value="theory" ${existing && existing.type === 'theory' ? 'selected' : ''}>Lecture Only</option>
            <option value="practical" ${existing && existing.type === 'practical' ? 'selected' : ''}>Practical / Lab Only</option>
          </select>
        </div>
      </div>
    `;

    UI.openModal({
      title: isEdit ? 'Edit Subject Details' : 'Add Academic Course',
      desc: 'SY BSc IT Curriculum',
      bodyHTML,
      footerHTML: `
        <div style="display:flex; justify-content:flex-end; gap:8px; width:100%;">
          <button class="btn btn-outline" id="modal-sub-cancel">Cancel</button>
          <button class="btn btn-primary" id="modal-sub-save">${isEdit ? 'Save Changes' : 'Create Subject'}</button>
        </div>
      `,
      onOpen: (overlay, close) => {
        overlay.querySelector('#modal-sub-cancel').addEventListener('click', close);
        overlay.querySelector('#modal-sub-save').addEventListener('click', () => {
          const name = overlay.querySelector('#modal-sub-name').value.trim();
          if (!name) {
            UI.toast('Subject name is required', 'error');
            return;
          }
          const code = overlay.querySelector('#modal-sub-code').value.trim() || getAutoCode(name);
          const teacher = overlay.querySelector('#modal-sub-teacher').value.trim();
          const room = overlay.querySelector('#modal-sub-room').value.trim();
          const type = overlay.querySelector('#modal-sub-type').value;

          if (isEdit) {
            State.updateSubject(existing.id, { name, code, teacher, room, type });
            UI.toast('Subject updated successfully', 'success');
          } else {
            State.addSubject({ name, code, teacher, room, type });
            UI.toast('New subject created', 'success');
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
