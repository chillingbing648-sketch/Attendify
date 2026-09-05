/* ============================================================
   ATTENDIFY — settings.js (Admin Settings)
   Thresholds, Batch details, and Data Backup/Restore
   ============================================================ */

const SettingsView = (() => {
  function render(containerId = 'view-settings') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const s = State.get().settings;

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Settings</h1>
          <p class="view-subtitle">System thresholds and administration</p>
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
              <input type="text" id="setting-batch-name" class="input" value="${Utils.escapeHTML(s.batchName || 'Single Batch')}">
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label>Safe Threshold (%) — Minimum Attendance Required</label>
              <input type="number" id="setting-th-safe" class="input" value="${s.thresholdSafe || 75}" min="1" max="100">
            </div>
            <div class="field">
              <label>Warning Threshold (%)</label>
              <input type="number" id="setting-th-warn" class="input" value="${s.thresholdWarn || 65}" min="1" max="100">
            </div>
          </div>
          <div>
            <button class="btn btn-primary" id="btn-save-settings">Save Class Settings</button>
          </div>
        </div>
      </div>

      <!-- Data Backup & Reset -->
      <div class="section">
        <div class="section-title-row"><div class="section-title">Data Administration</div></div>
        <div class="card" style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong>Backup System Data</strong>
              <p style="font-size:var(--fs-xs); color:var(--ink-2);">Export full database JSON including 60 students and all attendance logs.</p>
            </div>
            <button class="btn btn-outline" id="btn-export-backup">${UI.icon('download')} Export JSON Backup</button>
          </div>

          <div style="border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong>Restore From Backup</strong>
              <p style="font-size:var(--fs-xs); color:var(--ink-2);">Load a previously exported attendify JSON backup file.</p>
            </div>
            <div>
              <input type="file" id="restore-file-input" accept=".json" style="display:none;">
              <button class="btn btn-outline" onclick="document.getElementById('restore-file-input').click()">${UI.icon('upload')} Import Backup</button>
            </div>
          </div>

          <div style="border-top:1px solid var(--border); padding-top:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <strong style="color:var(--critical);">Reset Database</strong>
              <p style="font-size:var(--fs-xs); color:var(--ink-2);">Wipes all attendance logs and restores the clean 60-student roster.</p>
            </div>
            <button class="btn btn-danger" id="btn-reset-data">Reset All Data</button>
          </div>
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function bindEvents(container) {
    const saveBtn = container.querySelector('#btn-save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const className = container.querySelector('#setting-class-name').value.trim();
        const batchName = container.querySelector('#setting-batch-name').value.trim();
        const thresholdSafe = parseInt(container.querySelector('#setting-th-safe').value, 10) || 75;
        const thresholdWarn = parseInt(container.querySelector('#setting-th-warn').value, 10) || 65;

        State.updateSettings({ className, batchName, thresholdSafe, thresholdWarn });
        UI.toast('Settings saved', 'success');
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
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            const check = Validation.validateImport(data);
            if (!check.valid) {
              UI.toast(`Import failed: ${check.reason}`, 'error');
              return;
            }

            State.replaceAll(data);
            UI.toast('Backup restored successfully', 'success');
            render();
          } catch (err) {
            UI.toast('Invalid JSON file', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    const resetBtn = container.querySelector('#btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const ok = await UI.confirmDialog({
          title: 'Reset Attendance Database?',
          message: 'This will erase all recorded attendance sessions and restore the fresh 60-student batch. Continue?',
          confirmLabel: 'Reset Database',
          danger: true
        });

        if (ok) {
          State.resetAll();
          UI.toast('Database reset to clean 60-student batch', 'info');
          App.navigateTo('dashboard');
        }
      });
    }
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SettingsView;
