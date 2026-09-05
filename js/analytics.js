/* ============================================================
   ATTENDIFY — analytics.js (Admin Batch Analytics & Insights)
   REAL attendance data only:
   • Overall Batch Attendance
   • Subject Comparison
   • Lecture vs Practical Attendance
   • Attendance Trend
   • Students Below 75% & Below 65%
   • Repeat Absentees & Consecutive Absences
   • Smart Actionable Admin Insights
   ============================================================ */

const AnalyticsView = (() => {
  function render(containerId = 'view-analytics') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = Attendance.overallBatchStats();
    const comparison = Attendance.subjectComparison();
    const dist = Attendance.statusDistribution();
    const pva = Attendance.presentVsAbsent();
    const lvp = Attendance.lectureVsPracticalStats();
    const trend = Attendance.weeklyTrend(6);
    const repeatAbs = Attendance.repeatAbsentees(6);
    const consecutive = Attendance.consecutiveAbsences(2);
    const insights = Attendance.smartInsights();

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Batch Analytics</h1>
          <p class="view-subtitle">SY BSc IT · Real Attendance Performance, Distribution & Trends</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-outline" onclick="App.navigateTo('reports')">
            ${UI.icon('download')} Reports & Exports
          </button>
        </div>
      </div>

      <!-- Smart Admin Insights Strip (Prompt 19) -->
      ${insights.length > 0 ? `
        <div class="section">
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${insights.map(item => `
              <div class="card" style="padding:10px 14px; border-left:4px solid ${item.type === 'critical' ? 'var(--critical)' : item.type === 'warn' ? 'var(--warn)' : 'var(--accent)'}; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="color:${item.type === 'critical' ? 'var(--critical)' : item.type === 'warn' ? 'var(--warn)' : 'var(--accent)'};">${UI.icon('alert')}</span>
                  <span style="font-size:12.5px; font-weight:600; color:var(--ink);">${Utils.escapeHTML(item.text)}</span>
                </div>
                <button class="btn btn-outline btn-sm insight-action-btn" data-view="${item.actionView}" data-prefill-sub="${item.prefillSubjectId || ''}" data-prefill-time="${item.prefillTime || ''}" data-prefill-type="${item.prefillType || ''}">
                  ${item.actionLabel} →
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Top Primary Metrics (Prompt 18) -->
      <div class="stat-grid section">
        <div class="stat-card">
          <div class="stat-label">Overall Batch Attendance</div>
          <div class="stat-value" style="color:${stats.avgPct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
            ${stats.totalSessions > 0 ? stats.avgPct + '%' : '—'}
          </div>
          <div class="stat-sub">${stats.totalSessions} sessions conducted</div>
        </div>

        <div class="stat-card" style="cursor:pointer;" onclick="App.navigateTo('students')">
          <div class="stat-label" style="color:var(--critical);">Defaulters (< 75%)</div>
          <div class="stat-value" style="color:var(--critical);">${stats.belowSafe}</div>
          <div class="stat-sub">Students below university rule</div>
        </div>

        <div class="stat-card" style="cursor:pointer;" onclick="App.navigateTo('students')">
          <div class="stat-label" style="color:var(--critical);">Critical Alert (< 65%)</div>
          <div class="stat-value" style="color:var(--critical);">${stats.belowWarn}</div>
          <div class="stat-sub">Immediate faculty intervention</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Cumulative Absences</div>
          <div class="stat-value">${pva.absent}</div>
          <div class="stat-sub">${pva.present} presents across all sessions</div>
        </div>
      </div>

      <!-- Lecture vs Practical Attendance (Prompt 18) -->
      <div class="today-sections-grid section">
        <div class="session-category-card">
          <div class="session-category-header">
            <div class="session-category-title-group">
              <div class="session-category-icon icon-lecture">${UI.icon('bookOpen')}</div>
              <div>
                <div class="session-category-title">Lecture Attendance</div>
                <div class="session-category-subtitle">Theory classroom turnout</div>
              </div>
            </div>
            <div style="font-size:18px; font-weight:800; color:${lvp.lecture.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
              ${lvp.lecture.sessionCount > 0 ? lvp.lecture.pct + '%' : '—'}
            </div>
          </div>
          <div style="padding:14px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--ink-secondary); margin-bottom:6px;">
              <span>Total Lectures: <strong>${lvp.lecture.sessionCount}</strong></span>
              <span>Attended: <strong>${lvp.lecture.present}/${lvp.lecture.total}</strong></span>
            </div>
            <div style="height:6px; background:var(--surface-subtle); border-radius:3px; overflow:hidden;">
              <div style="height:100%; width:${lvp.lecture.pct}%; background:var(--accent);"></div>
            </div>
          </div>
        </div>

        <div class="session-category-card">
          <div class="session-category-header">
            <div class="session-category-title-group">
              <div class="session-category-icon icon-practical">${UI.icon('timetable')}</div>
              <div>
                <div class="session-category-title">Practical Attendance</div>
                <div class="session-category-subtitle">Laboratory & experiment turnout</div>
              </div>
            </div>
            <div style="font-size:18px; font-weight:800; color:${lvp.practical.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
              ${lvp.practical.sessionCount > 0 ? lvp.practical.pct + '%' : '—'}
            </div>
          </div>
          <div style="padding:14px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--ink-secondary); margin-bottom:6px;">
              <span>Total Practicals: <strong>${lvp.practical.sessionCount}</strong></span>
              <span>Attended: <strong>${lvp.practical.present}/${lvp.practical.total}</strong></span>
            </div>
            <div style="height:6px; background:var(--surface-subtle); border-radius:3px; overflow:hidden;">
              <div style="height:100%; width:${lvp.practical.pct}%; background:var(--practical);"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Attendance Trend & Improvement/Decline (Prompt 13) -->
      <div class="section">
        <div class="card" style="padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <div>
              <div class="section-title" style="font-size:13.5px; font-weight:700;">Attendance Trend (Last 6 Weeks)</div>
              <div class="section-desc">Weekly percentage turnout compared against the 75% university safe threshold</div>
            </div>
            ${renderTrendSummaryBadge(trend)}
          </div>
          <div style="width:100%; overflow-x:auto;">
            ${renderTrendSVG(trend)}
          </div>
        </div>
      </div>

      <!-- Course Comparison Table (Prompt 18) -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Subject Attendance Comparison</div>
            <div class="section-desc">Performance across individual courses in SY BSc IT curriculum</div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Subject Name</th>
                <th style="width: 100px; text-align:center;">Sessions</th>
                <th style="width: 100px; text-align:center;">Present</th>
                <th style="width: 100px; text-align:center;">Absent</th>
                <th style="width: 120px; text-align:center;">Attendance %</th>
                <th style="width: 110px; text-align:center;">Status</th>
                <th style="width: 100px; text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${comparison.length === 0 ? `
                <tr><td colspan="7" style="text-align:center; padding: 24px; color:var(--ink-secondary);">No subjects configured.</td></tr>
              ` : comparison.map(item => `
                <tr>
                  <td><strong>${Utils.escapeHTML(item.subject.name)}</strong></td>
                  <td style="text-align:center;">${item.sessionCount}</td>
                  <td style="text-align:center;"><span style="color:var(--safe); font-weight:600;">${item.present}</span></td>
                  <td style="text-align:center;"><span style="color:var(--critical); font-weight:600;">${item.absent}</span></td>
                  <td style="text-align:center;">
                    <strong style="font-variant-numeric: tabular-nums; color:${item.sessionCount === 0 ? 'var(--ink)' : item.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
                      ${item.sessionCount > 0 ? item.pct + '%' : '—'}
                    </strong>
                  </td>
                  <td style="text-align:center;">
                    <span class="badge ${item.sessionCount === 0 ? 'badge-neutral' : item.pct >= 75 ? 'badge-safe' : 'badge-critical'}">
                      ${item.sessionCount > 0 ? Utils.statusLabel(item.status) : 'No Data'}
                    </span>
                  </td>
                  <td style="text-align:right;">
                    <button class="btn btn-ghost btn-sm" onclick="App.navigateToMarkSubject('${item.subject.id}')">Mark</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Repeat Absentees & Consecutive Absences (Prompt 18) -->
      <div class="today-sections-grid section">
        <!-- Repeat Absentees -->
        <div class="card" style="padding:16px;">
          <div class="section-title" style="font-size:13px; font-weight:700; margin-bottom:2px;">Repeat Absentees</div>
          <div class="section-desc" style="margin-bottom:10px;">Students with highest cumulative missed sessions</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${repeatAbs.length === 0 ? `
              <div style="padding:16px; text-align:center; color:var(--ink-secondary); font-size:12px;">No student absences recorded yet.</div>
            ` : repeatAbs.map(item => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-radius:var(--r-sm); background:var(--surface-subtle); font-size:12px; cursor:pointer;" onclick="StudentsView.openStudentDetail('${item.student.id}')">
                <div style="display:flex; align-items:center; gap:8px;">
                  <strong style="width:20px; font-variant-numeric:tabular-nums;">${item.student.rollNumber}</strong>
                  <span>${Utils.escapeHTML(item.student.name)}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="color:var(--critical); font-weight:700;">${item.absent} Absences</span>
                  <span class="badge ${item.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${item.pct}%</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Consecutive Absences -->
        <div class="card" style="padding:16px;">
          <div class="section-title" style="font-size:13px; font-weight:700; margin-bottom:2px;">Consecutive Absences</div>
          <div class="section-desc" style="margin-bottom:10px;">Students absent in the last 2 or more consecutive sessions</div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${consecutive.length === 0 ? `
              <div style="padding:16px; text-align:center; color:var(--ink-secondary); font-size:12px;">No consecutive absences detected across recent sessions.</div>
            ` : consecutive.map(item => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; border-radius:var(--r-sm); background:var(--critical-subtle); border:1px solid var(--critical-border); font-size:12px; cursor:pointer;" onclick="StudentsView.openStudentDetail('${item.student.id}')">
                <div style="display:flex; align-items:center; gap:8px;">
                  <strong style="width:20px; font-variant-numeric:tabular-nums; color:var(--critical);">${item.student.rollNumber}</strong>
                  <span style="font-weight:600; color:var(--critical-ink);">${Utils.escapeHTML(item.student.name)}</span>
                </div>
                <span class="badge badge-critical">Consecutive Absent</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function bindEvents(container) {
    container.querySelectorAll('.insight-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        const subId = btn.dataset.prefillSub;
        const time = btn.dataset.prefillTime;
        const type = btn.dataset.prefillType;
        if (view === 'mark-attendance' && subId) {
          App.navigateToMarkSlot(subId, time || '09:00', type || 'lecture');
        } else {
          App.navigateTo(view);
        }
      });
    });
  }

  function renderTrendSummaryBadge(trend) {
    const activeWeeks = trend.filter(w => w.sessions > 0);
    if (activeWeeks.length < 2) {
      return '<span class="badge badge-neutral">Baseline Active</span>';
    }
    const latest = activeWeeks[activeWeeks.length - 1];
    const prev = activeWeeks[activeWeeks.length - 2];
    const diff = latest.pct - prev.pct;
    if (diff > 0) {
      return `<span class="badge badge-safe">▲ +${diff.toFixed(1)}% Improvement</span>`;
    } else if (diff < 0) {
      return `<span class="badge badge-critical">▼ ${diff.toFixed(1)}% Decline</span>`;
    } else {
      return '<span class="badge badge-neutral">Turnout Stable</span>';
    }
  }

  function renderTrendSVG(trend) {
    const activeWeeks = trend.filter(w => w.sessions > 0);
    if (activeWeeks.length === 0) {
      return `
        <div style="padding:28px 16px; text-align:center; color:var(--ink-secondary); font-size:12px;">
          No weekly trend data available yet. Record attendance sessions to generate trend visualization.
        </div>
      `;
    }

    const w = 700;
    const h = 160;
    const padL = 40;
    const padR = 25;
    const padT = 20;
    const padB = 30;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const safeY = padT + chartH * (1 - 0.75);

    const points = trend.map((item, idx) => {
      const x = padL + (idx / Math.max(1, trend.length - 1)) * chartW;
      const y = padT + chartH * (1 - Math.min(100, Math.max(0, item.pct)) / 100);
      return { x, y, item, idx };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

    return `
      <svg viewBox="0 0 ${w} ${h}" class="chart-svg" style="width:100%; height:auto; overflow:visible;" aria-label="Weekly Attendance Trend Line Chart">
        <!-- Background Grid & Y-Axis Scale -->
        <line x1="${padL}" y1="${padT + chartH}" x2="${w - padR}" y2="${padT + chartH}" stroke="var(--border)" stroke-width="1" />
        <line x1="${padL}" y1="${padT + chartH * 0.5}" x2="${w - padR}" y2="${padT + chartH * 0.5}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3" />
        <line x1="${padL}" y1="${safeY}" x2="${w - padR}" y2="${safeY}" stroke="var(--warn)" stroke-width="1.2" stroke-dasharray="4,3" />
        <line x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3" />

        <!-- Y Axis Labels -->
        <text x="${padL - 6}" y="${padT + 4}" text-anchor="end" font-size="10" fill="var(--ink-tertiary)" font-family="var(--font-sans)">100%</text>
        <text x="${padL - 6}" y="${safeY + 3}" text-anchor="end" font-size="10" fill="var(--warn)" font-weight="600" font-family="var(--font-sans)">75%</text>
        <text x="${padL - 6}" y="${padT + chartH + 3}" text-anchor="end" font-size="10" fill="var(--ink-tertiary)" font-family="var(--font-sans)">0%</text>

        <!-- 75% Safe Threshold Label -->
        <text x="${w - padR}" y="${safeY - 5}" text-anchor="end" font-size="10" font-weight="600" fill="var(--warn)" font-family="var(--font-sans)">
          75% Safe Attendance Threshold
        </text>

        <!-- Area Fill -->
        <path d="${areaD}" fill="var(--accent)" fill-opacity="0.08" />

        <!-- Polyline Line -->
        <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Data Points & Labels -->
        ${points.map(p => `
          <g>
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="var(--surface)" stroke="${p.item.pct >= 75 ? 'var(--safe)' : 'var(--critical)'}" stroke-width="2.2" />
            <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink)" font-family="var(--font-sans)">
              ${p.item.sessions > 0 ? p.item.pct + '%' : ''}
            </text>
            <text x="${p.x.toFixed(1)}" y="${(padT + chartH + 18).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--ink-secondary)" font-family="var(--font-sans)">
              ${p.item.weekLabel.split(',')[0]}
            </text>
          </g>
        `).join('')}
      </svg>
    `;
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AnalyticsView;

