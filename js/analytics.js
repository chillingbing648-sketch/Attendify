/* ============================================================
   ATTENDIFY — analytics.js (Admin Batch Analytics)
   Clean, restrained data visualization for SY BSc IT batch
   ============================================================ */

const AnalyticsView = (() => {
  function render(containerId = 'view-analytics') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = Attendance.overallBatchStats();
    const comparison = Attendance.subjectComparison();
    const dist = Attendance.statusDistribution();
    const pva = Attendance.presentVsAbsent();

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Batch Analytics</h1>
          <p class="view-subtitle">SY BSc IT · Aggregate attendance performance and distribution</p>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="stat-grid section">
        <div class="stat-card">
          <div class="stat-label">Batch Average</div>
          <div class="stat-value" style="color:${stats.avgPct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
            ${stats.totalSessions > 0 ? stats.avgPct + '%' : '—'}
          </div>
          <div class="stat-sub">${stats.totalSessions} sessions conducted</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Defaulters (< 75%)</div>
          <div class="stat-value" style="color:var(--critical);">${stats.belowSafe}</div>
          <div class="stat-sub">Below mandatory minimum</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Critical (< 65%)</div>
          <div class="stat-value" style="color:var(--critical);">${stats.belowWarn}</div>
          <div class="stat-sub">Immediate faculty alert</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Total Absences</div>
          <div class="stat-value">${pva.absent}</div>
          <div class="stat-sub">Cumulative missed lectures</div>
        </div>
      </div>

      <!-- Subject Performance Table -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Course-wise Attendance Performance</div>
            <div class="section-desc">Comparison of attendance across curriculum subjects</div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th style="width: 100px;">Sessions</th>
                <th style="width: 100px;">Present</th>
                <th style="width: 100px;">Absent</th>
                <th style="width: 120px;">Attendance %</th>
                <th style="width: 100px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${comparison.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align:center; padding: 24px; color:var(--ink-secondary);">
                    No subjects configured.
                  </td>
                </tr>
              ` : comparison.map(item => `
                <tr>
                  <td><strong>${Utils.escapeHTML(item.subject.name)}</strong></td>
                  <td>${item.sessionCount}</td>
                  <td><span style="color:var(--safe); font-weight:600;">${item.present}</span></td>
                  <td><span style="color:var(--critical); font-weight:600;">${item.absent}</span></td>
                  <td><strong>${item.sessionCount > 0 ? item.pct + '%' : '—'}</strong></td>
                  <td>
                    <span class="badge ${item.sessionCount === 0 ? 'badge-neutral' : item.pct >= 75 ? 'badge-safe' : 'badge-critical'}">
                      ${item.sessionCount > 0 ? Utils.statusLabel(item.status) : 'No Data'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Attendance Breakdown Distribution -->
      <div class="chart-grid section">
        <div class="chart-card">
          <div class="chart-card-head">
            <h3>Student Threshold Distribution</h3>
          </div>
          <div class="chart-card-desc">Batch breakdown relative to university attendance requirements</div>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
            <div>
              <div style="display:flex; justify-content:space-between; font-size:var(--fs-xs); margin-bottom:3px;">
                <span style="color:var(--safe); font-weight:600;">Safe (≥ 75%)</span>
                <strong>${dist.safe} students (${Math.round((dist.safe / 60) * 100)}%)</strong>
              </div>
              <div style="height:6px; background:var(--surface-subtle); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${(dist.safe / 60) * 100}%; background:var(--safe);"></div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:var(--fs-xs); margin-bottom:3px;">
                <span style="color:var(--warn); font-weight:600;">Warning (65% – 74%)</span>
                <strong>${dist.warn} students (${Math.round((dist.warn / 60) * 100)}%)</strong>
              </div>
              <div style="height:6px; background:var(--surface-subtle); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${(dist.warn / 60) * 100}%; background:var(--warn);"></div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:var(--fs-xs); margin-bottom:3px;">
                <span style="color:var(--critical); font-weight:600;">Defaulter (< 65%)</span>
                <strong>${dist.critical} students (${Math.round((dist.critical / 60) * 100)}%)</strong>
              </div>
              <div style="height:6px; background:var(--surface-subtle); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:${(dist.critical / 60) * 100}%; background:var(--critical);"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-head">
            <h3>Aggregate Marks Ledger</h3>
          </div>
          <div class="chart-card-desc">Total headcount marks across all logged lectures</div>
          <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 7px 10px; background:var(--surface-subtle); border-radius:var(--r-md); border:1px solid var(--border);">
              <span style="font-weight:550; font-size:var(--fs-xs);">Present (P)</span>
              <strong style="color:var(--safe); font-size:var(--fs-base);">${pva.present}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 7px 10px; background:var(--surface-subtle); border-radius:var(--r-md); border:1px solid var(--border);">
              <span style="font-weight:550; font-size:var(--fs-xs);">Absent (A)</span>
              <strong style="color:var(--critical); font-size:var(--fs-base);">${pva.absent}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 7px 10px; background:var(--surface-subtle); border-radius:var(--r-md); border:1px solid var(--border);">
              <span style="font-weight:550; font-size:var(--fs-xs);">Late (L)</span>
              <strong style="color:var(--warn); font-size:var(--fs-base);">${pva.late}</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AnalyticsView;
