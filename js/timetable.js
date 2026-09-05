/* ============================================================
   ATTENDIFY — timetable.js (Timetable Intelligence & Auto-Launcher)
   Drives attendance workflow:
   • Today's Classes (Pending Attendance vs Completed Attendance)
   • Upcoming Classes / Weekly Schedule
   • Each session: Subject, Time, Lecture/Practical, [Mark Attendance]
   • Prefills known subject, time, and type automatically
   ============================================================ */

const Timetable = (() => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function render(containerId = 'view-timetable') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const todaySlots = State.getTodayTimetable();
    const todayISO = Utils.todayISO();
    const allSlots = State.getTimetable();
    const todaySessions = State.getSessionsForDate(todayISO);

    const pendingSlots = [];
    const completedSlots = [];

    todaySlots.forEach(slot => {
      const rec = todaySessions.find(s => s.subjectId === slot.subjectId && s.startTime === slot.start);
      if (rec) {
        completedSlots.push({ slot, session: rec });
      } else {
        pendingSlots.push({ slot, session: null });
      }
    });

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Class Timetable</h1>
          <p class="view-subtitle">SY BSc IT · Schedule & Attendance Intelligence · ${Utils.formatDate(new Date())}</p>
        </div>
      </div>

      <!-- Quick Metrics Strip -->
      <div class="stat-grid section">
        <div class="stat-card">
          <div class="stat-label">Today's Total Classes</div>
          <div class="stat-value">${todaySlots.length}</div>
          <div class="stat-sub">Scheduled for today</div>
        </div>
        <div class="stat-card">
          <div class="stat-label" style="color:var(--warn);">Pending Attendance</div>
          <div class="stat-value" style="color:var(--warn);">${pendingSlots.length}</div>
          <div class="stat-sub">Require attendance mark</div>
        </div>
        <div class="stat-card">
          <div class="stat-label" style="color:var(--safe);">Completed Attendance</div>
          <div class="stat-value" style="color:var(--safe);">${completedSlots.length}</div>
          <div class="stat-sub">Recorded & reconciled</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Weekly Sessions</div>
          <div class="stat-value">${allSlots.length}</div>
          <div class="stat-sub">Total curriculum slots</div>
        </div>
      </div>

      <!-- TODAY'S CLASSES: PENDING ATTENDANCE (Prompt 17) -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Today's Pending Attendance (${pendingSlots.length})</div>
            <div class="section-desc">Classes requiring attendance records. Single-click to launch prefilled register.</div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 120px;">Time Slot</th>
                <th>Subject</th>
                <th style="width: 100px;">Type</th>
                <th style="width: 120px;">Room / Lab</th>
                <th style="width: 100px; text-align:center;">Status</th>
                <th style="width: 160px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingSlots.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align:center; padding: 20px; color:var(--ink-secondary);">
                    ${todaySlots.length === 0 ? 'No lectures scheduled for today on the timetable.' : '✓ All classes scheduled for today have completed attendance records.'}
                  </td>
                </tr>
              ` : pendingSlots.map(({ slot }) => {
                const sub = State.getSubject(slot.subjectId);
                const isPractical = slot.type === 'practical';
                return `
                  <tr>
                    <td><strong style="font-variant-numeric: tabular-nums;">${slot.start} – ${slot.end}</strong></td>
                    <td>
                      <div style="font-weight:600; color:var(--ink);">${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</div>
                      <div style="font-size:11px; color:var(--ink-secondary);">${sub ? sub.teacher || 'Faculty' : ''}</div>
                    </td>
                    <td>
                      <span class="badge ${isPractical ? 'badge-safe' : 'badge-neutral'}">
                        ${isPractical ? 'PRACTICAL' : 'LECTURE'}
                      </span>
                    </td>
                    <td>${slot.room || '—'}</td>
                    <td style="text-align:center;"><span class="badge badge-warn">Pending</span></td>
                    <td style="text-align: right;">
                      <button class="btn btn-primary btn-sm" style="${isPractical ? 'background:var(--practical); border-color:var(--practical);' : ''}" onclick="App.navigateToMarkSlot('${slot.subjectId}', '${slot.start}', '${isPractical ? 'practical' : 'lecture'}')">
                        ${UI.icon('plus')} Mark Attendance
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TODAY'S CLASSES: COMPLETED ATTENDANCE (Prompt 17) -->
      ${completedSlots.length > 0 ? `
        <div class="section">
          <div class="section-title-row">
            <div>
              <div class="section-title">Today's Completed Attendance (${completedSlots.length})</div>
              <div class="section-desc">Sessions already recorded for today</div>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 120px;">Time Slot</th>
                  <th>Subject</th>
                  <th style="width: 100px;">Type</th>
                  <th style="width: 140px; text-align:center;">Turnout</th>
                  <th style="width: 100px; text-align:center;">Attendance %</th>
                  <th style="width: 140px; text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${completedSlots.map(({ slot, session }) => {
                  const sub = State.getSubject(slot.subjectId);
                  const stats = Attendance.statsForSession(session.id);
                  const isPractical = slot.type === 'practical';
                  return `
                    <tr>
                      <td><strong style="font-variant-numeric: tabular-nums;">${slot.start} – ${slot.end}</strong></td>
                      <td>
                        <div style="font-weight:600; color:var(--ink);">${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</div>
                        ${session.experimentTitle ? `<div style="font-size:11px; color:var(--ink-secondary); font-style:italic;">${Utils.escapeHTML(session.experimentTitle)}</div>` : ''}
                      </td>
                      <td>
                        <span class="badge ${isPractical ? 'badge-safe' : 'badge-neutral'}">
                          ${isPractical ? 'PRACTICAL' : 'LECTURE'}
                        </span>
                      </td>
                      <td style="text-align:center;">
                        <span style="color:var(--safe); font-weight:700;">${stats.present} P</span> · 
                        <span style="color:var(--critical); font-weight:700;">${stats.absent} A</span>
                      </td>
                      <td style="text-align:center;">
                        <span class="badge ${stats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${stats.pct}%</span>
                      </td>
                      <td style="text-align: right;">
                        <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSession('${session.id}')">
                          Edit Session
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- WEEKLY SCHEDULE OVERVIEW (Upcoming Classes) -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Weekly Batch Schedule & Upcoming Classes</div>
            <div class="section-desc">Master timetable for SY BSc IT (Monday – Saturday)</div>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 110px;">Day</th>
                <th style="width: 120px;">Time</th>
                <th>Subject</th>
                <th style="width: 100px;">Type</th>
                <th style="width: 120px;">Room / Lab</th>
                <th style="width: 140px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${allSlots.map(slot => {
                const sub = State.getSubject(slot.subjectId);
                const isPractical = slot.type === 'practical';
                return `
                  <tr>
                    <td><strong>${DAYS[slot.day] || 'Day'}</strong></td>
                    <td><span style="font-variant-numeric: tabular-nums;">${slot.start} – ${slot.end}</span></td>
                    <td>
                      <strong>${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</strong>
                      <div style="font-size:11px; color:var(--ink-secondary);">${sub ? sub.teacher || '' : ''}</div>
                    </td>
                    <td>
                      <span class="badge ${isPractical ? 'badge-safe' : 'badge-neutral'}">
                        ${isPractical ? 'PRACTICAL' : 'LECTURE'}
                      </span>
                    </td>
                    <td>${slot.room || '—'}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-ghost btn-sm" onclick="App.navigateToMarkSlot('${slot.subjectId}', '${slot.start}', '${slot.type || 'theory'}')">
                        Launch Register
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Timetable;
