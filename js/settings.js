/* ============================================================
   ATTENDIFY — settings.js (Admin Settings, Backup, Restore & Archive)
   Thresholds, Class Configuration, Backup Download, Backup Restore,
   Safe Archival & Data Administration.
   ============================================================ */

const SettingsView = (() => {
  function render(containerId = 'view-settings') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s = State.get().settings;
    const archives = State.getArchives();
    const sessions = State.getAllSessions();

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Settings & Backup</h1>
          <p class="view-subtitle">System thresholds, class metadata, archival and backup administration</p>
        </div>
      </div>

      <!-- Academic Batch Settings -->
      <div class="section">
        <div class="section-title-row"><div class="section-title">Class Configuration</div></div>
        <div class="card" style="display:flex; flex-direction:column; gap:16px;">
          <div class="field-row">
            <div class="field">
              <label>Class / Course Name</label>
              <input type="text" id="setting-class-name" class="input" value="${Utils.escapeHTML(s.className || 'SY BSc IT')}">
            </div>
            <div class="field">
              <label>Batch</label>
              <input type="text" id="setting-batch-name" class="input" value="${Utils.escapeHTML(s.batchName || 'Single Batch (60 Students)')}">
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Safe Minimum Attendance Threshold (%)</label>
              <input type="number" id="setting-th-safe" class="input" value="${s.thresholdSafe || 75}" min="1" max="100">
              <span style="font-size:11px; color:var(--ink-secondary); margin-top:2px;">Mandatory academic requirement (Default: 75%)</span>
            </div>
            <div class="field">
              <label>Warning Alert Threshold (%)</label>
              <input type="number" id="setting-th-warn" class="input" value="${s.thresholdWarn || 65}" min="1" max="100">
              <span style="font-size:11px; color:var(--ink-secondary); margin-top:2px;">Threshold triggering critical defaulter status (Default: 65%)</span>
            </div>
          </div>
          <div>
            <button class="btn btn-primary" id="btn-save-settings">Save Class Settings</button>
          </div>
        </div>
      </div>

      <!-- Backup & Restore (Prompt 16) -->
      <div class="section">
        <div class="section-title-row"><div class="section-title">Data Backup & Restore</div></div>
        <div class="card" style="display:flex; flex-direction:column; gap:16px;">
          <!-- Download Backup -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong>Download Backup</strong>
              <p style="font-size:var(--fs-xs); color:var(--ink-secondary);">
                Export full database JSON containing 60 students, course curriculum, and all attendance logs.
              </p>
            </div>
            <button class="btn btn-primary" id="btn-export-backup">
              ${UI.icon('download')} Download Backup JSON
            </button>
          </div>

          <!-- Restore Backup -->
          <div style="border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong>Restore Backup</strong>
              <p style="font-size:var(--fs-xs); color:var(--ink-secondary);">
                Load a previously exported Attendify backup file. Will validate data before restoring.
              </p>
            </div>
            <div>
              <input type="file" id="restore-file-input" accept=".json" style="display:none;">
              <button class="btn btn-outline" onclick="document.getElementById('restore-file-input').click()">
                ${UI.icon('upload')} Restore Backup File
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Safe Archival (Prompt 16: Never permanently delete data through Archive) -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Attendance Archival</div>
            <div class="section-desc">Safely archive older attendance sessions. Archived sessions are preserved and can be restored anytime.</div>
          </div>
        </div>
        <div class="card" style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:12px;">
            <div class="register-bar-field" style="max-width:260px;">
              <label>Archive sessions on or before date:</label>
              <input type="date" id="archive-cutoff-date" class="input" value="${getDefaultArchiveCutoff()}">
            </div>
            <button class="btn btn-outline" id="btn-archive-sessions">
              ${UI.icon('timetable')} Archive Older Sessions
            </button>
          </div>

          ${archives.length > 0 ? `
            <div style="border-top:1px solid var(--border); padding-top:14px;">
              <div style="font-size:12px; font-weight:700; color:var(--ink); margin-bottom:8px;">Archived Ledgers (${archives.length})</div>
              <div class="table-wrap">
                <table class="data-table" style="font-size:12px;">
                  <thead>
                    <tr>
                      <th>Archive Title</th>
                      <th style="width:110px;">Archived On</th>
                      <th style="width:90px; text-align:center;">Sessions</th>
                      <th style="width:90px; text-align:center;">Records</th>
                      <th style="width:180px; text-align:right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${archives.map(arch => `
                      <tr>
                        <td><strong>${Utils.escapeHTML(arch.title)}</strong></td>
                        <td>${Utils.formatDate(arch.archivedAt)}</td>
                        <td style="text-align:center;">${arch.sessionCount}</td>
                        <td style="text-align:center;">${arch.recordCount}</td>
                        <td style="text-align:right;">
                          <div style="display:inline-flex; gap:4px;">
                            <button class="btn btn-outline btn-sm restore-arch-btn" data-id="${arch.id}">Restore</button>
                            <button class="btn btn-ghost btn-sm download-arch-btn" data-id="${arch.id}" title="Download Archive JSON">${UI.icon('download')}</button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : `
            <div style="font-size:11.5px; color:var(--ink-secondary);">No archived ledgers. All ${sessions.length} sessions are active.</div>
          `}
        </div>
      </div>

      <!-- Danger Zone: Reset Database -->
      <div class="section">
        <div class="section-title-row"><div class="section-title" style="color:var(--critical);">Danger Zone</div></div>
        <div class="card" style="border-color:var(--critical-border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <strong style="color:var(--critical);">Reset Application Data</strong>
            <p style="font-size:var(--fs-xs); color:var(--ink-secondary);">
              Wipes all recorded attendance logs and resets to the default 60-student SY BSc IT roster.
            </p>
          </div>
          <button class="btn btn-danger" id="btn-reset-data">Reset Database</button>
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function getDefaultArchiveCutoff() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  }

  function bindEvents(container) {
    const saveBtn = container.querySelector('#btn-save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const className = container.querySelector('#setting-class-name').value.trim();
        const batchName = container.querySelector('#setting-batch-name').value.trim();
        const thresholdSafe = parseInt(container.querySelector('#setting-th-safe').value, 10) || 75;
        const thresholdWarn = parseInt(container.querySelector('#setting-th-warn').value, 10) || 65;

        if (thresholdSafe < thresholdWarn) {
          UI.toast('Safe threshold cannot be lower than warning threshold', 'error');
          return;
        }

        State.updateSettings({ className, batchName, thresholdSafe, thresholdWarn });
        UI.toast('Class configuration saved', 'success');
      });
    }

    const exportBtn = container.querySelector('#btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = JSON.stringify(State.get(), null, 2);
        Utils.downloadFile(`attendify_admin_backup_${Utils.todayISO()}.json`, json, 'application/json');
        UI.toast('Backup file downloaded', 'success');
      });
    }

    const fileInput = container.querySelector('#restore-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            const check = Validation.validateImport(data);
            if (!check.valid) {
              UI.toast(`Restore failed: ${check.reason}`, 'error');
              return;
            }

            const ok = await UI.confirmDialog({
              title: 'Restore Database from Backup?',
              message: `This will replace current data with ${check.counts.students || 60} students, ${check.counts.subjects} subjects, and ${check.counts.sessions} attendance sessions from "${file.name}". Proceed?`,
              confirmLabel: 'Restore Database',
              danger: true
            });

            if (ok) {
              State.replaceAll(data);
              UI.toast('Database successfully restored', 'success');
              render();
            }
          } catch (err) {
            UI.toast('Invalid JSON backup file format', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    const archiveBtn = container.querySelector('#btn-archive-sessions');
    if (archiveBtn) {
      archiveBtn.addEventListener('click', async () => {
        const cutoff = container.querySelector('#archive-cutoff-date').value;
        if (!cutoff) {
          UI.toast('Please select an archival cutoff date', 'error');
          return;
        }

        const eligible = State.getAllSessions().filter(s => s.date <= cutoff);
        if (eligible.length === 0) {
          UI.toast(`No sessions found on or before ${Utils.formatDate(cutoff)} to archive`, 'info');
          return;
        }

        const ok = await UI.confirmDialog({
          title: 'Archive Older Sessions?',
          message: `Move ${eligible.length} sessions (on or before ${Utils.formatDate(cutoff)}) to the safe archive? Data will NOT be lost and can be restored at any time.`,
          confirmLabel: 'Archive Sessions',
          danger: false
        });

        if (ok) {
          const res = State.archiveSessionsBefore(cutoff);
          UI.toast(`Successfully archived ${res.count} sessions`, 'success');
          render();
        }
      });
    }

    container.querySelectorAll('.restore-arch-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const ok = await UI.confirmDialog({
          title: 'Restore Archived Sessions?',
          message: 'Restore all sessions and attendance logs from this archive back into the active register?',
          confirmLabel: 'Restore to Active Register',
          danger: false
        });
        if (ok) {
          State.unarchiveSessionGroup(id);
          UI.toast('Archived sessions restored to active register', 'success');
          render();
        }
      });
    });

    container.querySelectorAll('.download-arch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const arch = State.getArchives().find(a => a.id === id);
        if (arch) {
          Utils.downloadFile(`attendify_archive_${arch.cutoffDate}.json`, JSON.stringify(arch, null, 2), 'application/json');
          UI.toast('Archive file downloaded', 'success');
        }
      });
    });

    const resetBtn = container.querySelector('#btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const ok = await UI.confirmDialog({
          title: 'Reset Entire Database?',
          message: 'Are you sure you want to wipe all attendance sessions and reset to the clean 60-student batch? This action cannot be undone unless you have a downloaded backup.',
          confirmLabel: 'Permanently Reset',
          danger: true
        });

        if (ok) {
          State.resetAll();
          UI.toast('Database reset to clean 60-student roster', 'info');
          render();
        }
      });
    }
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SettingsView;
