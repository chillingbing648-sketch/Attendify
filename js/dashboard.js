/* ============================================================
   ATTENDIFY — dashboard.js (Operational Admin Overview)
   Apple-Inspired Composition:
   • Focused Top Metrics (Students, Sessions, Turnout, Pending)
   • Separate Visual Sections: LECTURE ATTENDANCE & PRACTICAL ATTENDANCE
   • Students Needing Attention
   • Recent Attendance Sessions
   ============================================================ */

const Dashboard = (() => {
  function render(containerId = 'view-dashboard') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = Attendance.overallBatchStats();
    const recentSessions = State.getAllSessions().slice(0, 6);
    const defaulters = Attendance.studentsBelow(Attendance.thresholds().safe);
    const todayISO = Utils.todayISO();

    // Get today's scheduled timetable slots
    const todaySlots = State.getTodayTimetable();
    const todaySessions = State.getSessionsForDate(todayISO);

    // Group into Lecture slots and Practical slots
    const lectureSlots = todaySlots.filter(s => s.type !== 'practical');
    const practicalSlots = todaySlots.filter(s => s.type === 'practical');

    // Count pending sessions
    const pendingSlots = todaySlots.filter(slot => {
      return !todaySessions.some(s => s.subjectId === slot.subjectId && s.startTime === slot.start);
    });

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Attendance Overview</h1>
          <p class="view-subtitle">SY BSc IT · Single Batch · 60 Students · ${Utils.formatDate(new Date())}</p>
        </div>
        <div class="view-header-actions">
          <button class="btn btn-primary" onclick="App.openMarkChoiceModal()">
            ${UI.icon('plus')} Mark Attendance
          </button>
        </div>
      </div>

      <!-- Focused Apple-Inspired Metrics Strip -->
      <div class="stat-grid section">
        <div class="stat-card">
          <div class="stat-label">${UI.icon('users')} Total Students</div>
          <div class="stat-value">${stats.totalStudents}</div>
          <div class="stat-sub">Enrolled in batch</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">${UI.icon('clock')} Today's Schedule</div>
          <div class="stat-value">${todaySlots.length}</div>
          <div class="stat-sub">${todaySessions.length} completed, ${pendingSlots.length} pending</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">${UI.icon('trendUp')} Batch Attendance</div>
          <div class="stat-value" style="color:${stats.avgPct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
            ${stats.totalSessions > 0 ? stats.avgPct + '%' : '—'}
          </div>
          <div class="stat-sub">${defaulters.length} students below 75%</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">${UI.icon('alert')} Pending Sessions</div>
          <div class="stat-value" style="color:${pendingSlots.length > 0 ? 'var(--warn)' : 'var(--safe)'};">
            ${pendingSlots.length}
          </div>
          <div class="stat-sub">${pendingSlots.length === 0 ? 'All marked for today' : 'Require attendance'}</div>
        </div>
      </div>

      <!-- VISUAL SEPARATION: LECTURE ATTENDANCE & PRACTICAL ATTENDANCE -->
      <div class="today-sections-grid section">
        <!-- Lecture Attendance Panel -->
        <div class="session-category-card">
          <div class="session-category-header">
            <div class="session-category-title-group">
              <div class="session-category-icon icon-lecture">${UI.icon('bookOpen')}</div>
              <div>
                <div class="session-category-title">Lecture Attendance</div>
                <div class="session-category-subtitle">Regular classroom theory sessions</div>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSlot('', '09:00', 'lecture')">
              + Mark Lecture
            </button>
          </div>

          <div class="session-category-list">
            ${lectureSlots.length === 0 ? `
              <div style="padding:24px; text-align:center; color:var(--ink-secondary); font-size:var(--fs-xs);">
                No theory lectures scheduled for today.
              </div>
            ` : lectureSlots.map(slot => {
              const sub = State.getSubject(slot.subjectId);
              const recorded = todaySessions.find(s => s.subjectId === slot.subjectId && s.startTime === slot.start && s.type !== 'practical');
              let sStats = null;
              if (recorded) sStats = Attendance.statsForSession(recorded.id);

              return `
                <div class="today-session-row">
                  <div class="today-session-main">
                    <div class="today-session-name">${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</div>
                    <div class="today-session-meta">
                      <span>${slot.start} – ${slot.end}</span>
                      <span>·</span>
                      <span>${sub ? sub.teacher || 'Faculty' : ''}</span>
                    </div>
                  </div>

                  <div class="today-session-stats">
                    ${recorded ? `
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:12px; font-weight:700; color:var(--ink);">${sStats.present}/60</span>
                        <span class="badge ${sStats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${sStats.pct}%</span>
                      </div>
                      <button class="btn btn-ghost btn-sm" style="height:22px; padding:0 6px; font-size:11px;" onclick="App.navigateToMarkSession('${recorded.id}')">
                        View Session
                      </button>
                    ` : `
                      <span class="badge badge-warn">Pending</span>
                      <button class="btn btn-primary btn-sm" style="height:24px; padding:0 8px; font-size:11px;" onclick="App.navigateToMarkSlot('${slot.subjectId}', '${slot.start}', 'lecture')">
                        Start Attendance
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Practical Attendance Panel -->
        <div class="session-category-card">
          <div class="session-category-header">
            <div class="session-category-title-group">
              <div class="session-category-icon icon-practical">${UI.icon('timetable')}</div>
              <div>
                <div class="session-category-title">Practical Attendance</div>
                <div class="session-category-subtitle">Laboratory & experiment sessions</div>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSlot('', '10:15', 'practical')">
              + Mark Practical
            </button>
          </div>

          <div class="session-category-list">
            ${practicalSlots.length === 0 ? `
              <div style="padding:24px; text-align:center; color:var(--ink-secondary); font-size:var(--fs-xs);">
                No laboratory sessions scheduled for today.
              </div>
            ` : practicalSlots.map(slot => {
              const sub = State.getSubject(slot.subjectId);
              const recorded = todaySessions.find(s => s.subjectId === slot.subjectId && s.startTime === slot.start && s.type === 'practical');
              let sStats = null;
              if (recorded) sStats = Attendance.statsForSession(recorded.id);

              return `
                <div class="today-session-row">
                  <div class="today-session-main">
                    <div class="today-session-name">${sub ? Utils.escapeHTML(sub.name) : 'Laboratory'}</div>
                    <div class="today-session-meta">
                      <span>${slot.start} – ${slot.end}</span>
                      <span>·</span>
                      <span>${slot.room || 'Computer Lab'}</span>
                    </div>
                  </div>

                  <div class="today-session-stats">
                    ${recorded ? `
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:12px; font-weight:700; color:var(--ink);">${sStats.present}/60</span>
                        <span class="badge badge-safe">${sStats.pct}%</span>
                      </div>
                      <button class="btn btn-ghost btn-sm" style="height:22px; padding:0 6px; font-size:11px;" onclick="App.navigateToMarkSession('${recorded.id}')">
                        View Lab Session
                      </button>
                    ` : `
                      <span class="badge badge-warn">Pending Lab</span>
                      <button class="btn btn-primary btn-sm" style="height:24px; padding:0 8px; font-size:11px; background:var(--practical); border-color:var(--practical);" onclick="App.navigateToMarkSlot('${slot.subjectId}', '${slot.start}', 'practical')">
                        Start Practical
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Students Needing Attention (< 75%) -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Students Needing Attention (< 75%)</div>
            <div class="section-desc">${defaulters.length} students at risk of attendance default</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('students')">View All Students</button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 70px;">Roll No</th>
                <th>Student Name</th>
                <th style="width: 100px;">Present</th>
                <th style="width: 100px;">Absent</th>
                <th style="width: 110px;">Attendance %</th>
                <th style="width: 90px;">Status</th>
                <th style="width: 80px; text-align: right;">Profile</th>
              </tr>
            </thead>
            <tbody>
              ${defaulters.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align:center; padding: 20px; color:var(--ink-secondary);">
                    ${stats.totalSessions === 0 ? 'Record attendance sessions to populate defaulter analysis.' : 'All 60 students are currently meeting the 75% attendance requirement.'}
                  </td>
                </tr>
              ` : defaulters.slice(0, 5).map(d => `
                <tr>
                  <td><strong>${d.student.rollNumber}</strong></td>
                  <td><strong>${Utils.escapeHTML(d.student.name)}</strong></td>
                  <td style="color:var(--safe); font-weight:600;">${d.present}</td>
                  <td style="color:var(--critical); font-weight:600;">${d.absent}</td>
                  <td><strong style="color:var(--critical); font-variant-numeric: tabular-nums;">${d.pct}%</strong></td>
                  <td><span class="badge ${d.pct < 65 ? 'badge-critical' : 'badge-warn'}">${Utils.statusLabel(d.status)}</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-ghost btn-sm" onclick="StudentsView.openStudentDetail('${d.student.id}')">View</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recent Attendance Sessions -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Recent Attendance Sessions</div>
            <div class="section-desc">Audit trail of completed lectures and practicals</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('history')">View Full History</button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 110px;">Date</th>
                <th>Subject & Experiment</th>
                <th style="width: 90px;">Type</th>
                <th style="width: 80px;">Time</th>
                <th style="width: 80px;">Present</th>
                <th style="width: 80px;">Absent</th>
                <th style="width: 100px;">Attendance %</th>
                <th style="width: 80px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${recentSessions.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align:center; padding: 24px; color:var(--ink-secondary);">
                    No attendance sessions recorded yet.
                  </td>
                </tr>
              ` : recentSessions.map(sess => {
                const sub = State.getSubject(sess.subjectId);
                const sStats = Attendance.statsForSession(sess.id);
                const isPractical = sess.type === 'practical';
                return `
                  <tr>
                    <td><strong>${Utils.formatDate(sess.date)}</strong></td>
                    <td>
                      <div style="font-weight:600; color:var(--ink);">${sub ? Utils.escapeHTML(sub.name) : 'Subject'}</div>
                      ${sess.experimentTitle ? `<div style="font-size:11px; color:var(--ink-secondary);">${Utils.escapeHTML(sess.experimentTitle)}</div>` : ''}
                    </td>
                    <td>
                      <span class="badge ${isPractical ? 'badge-safe' : 'badge-neutral'}">
                        ${isPractical ? 'PRACTICAL' : 'LECTURE'}
                      </span>
                    </td>
                    <td><span style="color:var(--ink-secondary); font-variant-numeric: tabular-nums;">${sess.startTime || '—'}</span></td>
                    <td><span style="color:var(--safe); font-weight:600;">${sStats.present}</span></td>
                    <td><span style="color:var(--critical); font-weight:600;">${sStats.absent}</span></td>
                    <td>
                      <span class="badge ${sStats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${sStats.pct}%</span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-ghost btn-sm" onclick="App.navigateToMarkSession('${sess.id}')">Edit</button>
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

if (typeof module !== 'undefined' && module.exports) module.exports = Dashboard;
