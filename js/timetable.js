/* ============================================================
   ATTENDIFY — timetable.js (Admin Timetable & Quick Session Launcher)
   Prefills Subject, Date, and Time for single-click attendance
   ============================================================ */

const Timetable = (() => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function render(containerId = 'view-timetable') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const todaySlots = State.getTodayTimetable();
    const todayISO = Utils.todayISO();
    const allSlots = State.getTimetable();

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Class Schedule & Timetable</h1>
          <p class="view-subtitle">SY BSc IT · Pre-configured lecture timetable</p>
        </div>
      </div>

      <!-- Today's Classes Launcher (Reduces Admin Work) -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Today's Lectures & Labs (${Utils.formatDate(new Date())})</div>
            <div class="section-desc">Single-click to open attendance register pre-filled with subject and time</div>
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
                <th style="width: 120px;">Status</th>
                <th style="width: 140px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${todaySlots.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align:center; padding: 24px; color:var(--ink-secondary);">
                    No lectures scheduled on today's timetable.
                  </td>
                </tr>
              ` : todaySlots.map(slot => {
                const sub = State.getSubject(slot.subjectId);
                // Check if already marked today
                const recorded = State.getAllSessions().find(s => s.subjectId === slot.subjectId && s.date === todayISO && s.startTime === slot.start);
                return `
                  <tr>
                    <td><strong>${slot.start} – ${slot.end}</strong></td>
                    <td>
                      <div style="font-weight:600; color:var(--ink);">${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</div>
                      <div style="font-size:11px; color:var(--ink-secondary);">${sub ? sub.teacher || '' : ''}</div>
                    </td>
                    <td>
                      <span class="badge ${slot.type === 'practical' ? 'badge-safe' : 'badge-neutral'}">
                        ${slot.type ? slot.type.toUpperCase() : 'THEORY'}
                      </span>
                    </td>
                    <td>${slot.room || '—'}</td>
                    <td>
                      ${recorded ? '<span class="badge badge-safe">Marked ✓</span>' : '<span class="badge badge-warn">Pending</span>'}
                    </td>
                    <td style="text-align: right;">
                      ${recorded ? `
                        <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSession('${recorded.id}')">
                          Edit Session
                        </button>
                      ` : `
                        <button class="btn btn-primary btn-sm" onclick="App.navigateToMarkSlot('${slot.subjectId}', '${slot.start}', '${slot.type || 'theory'}')">
                          Mark Attendance
                        </button>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Weekly Schedule Overview -->
      <div class="section">
        <div class="section-title-row">
          <div class="section-title">Weekly Batch Schedule</div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 110px;">Day</th>
                <th style="width: 120px;">Time</th>
                <th>Subject</th>
                <th style="width: 100px;">Type</th>
                <th style="width: 110px;">Room / Lab</th>
                <th style="width: 130px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${allSlots.map(slot => {
                const sub = State.getSubject(slot.subjectId);
                return `
                  <tr>
                    <td><strong>${DAYS[slot.day] || 'Day'}</strong></td>
                    <td><span style="font-variant-numeric: tabular-nums;">${slot.start} – ${slot.end}</span></td>
                    <td><strong>${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</strong></td>
                    <td>
                      <span class="badge ${slot.type === 'practical' ? 'badge-safe' : 'badge-neutral'}">
                        ${(slot.type || 'theory').toUpperCase()}
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
