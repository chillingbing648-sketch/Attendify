/* ============================================================
   ATTENDIFY — dashboard.js (Operational Admin Dashboard)
   Prioritizes ACTIONS over decoration:
   • Header: Attendance Overview, SY BSc IT · Single Batch · 60 Students
   • Primary CTA: + Mark Attendance
   • Compact metrics: 60 Students, Today's Sessions, Overall Attendance, Pending Sessions
   • Actionable Smart Admin Insights
   • TODAY'S LECTURE ATTENDANCE
   • TODAY'S PRACTICAL ATTENDANCE
   • STUDENTS NEEDING ATTENTION (< 75%)
   • RECENT SESSIONS (Subject, Time, P/A/L, %, Pending/Completed, Actions)
   ============================================================ */

const Dashboard = (() => {
  function render(containerId = 'view-dashboard') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = Attendance.overallBatchStats();
    const recentSessions = State.getAllSessions().slice(0, 6);
    const defaulters = Attendance.studentsBelow(Attendance.thresholds().safe);
    const todayISO = Utils.todayISO();
    const insights = Attendance.smartInsights();

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
      <!-- 1. Header with Primary Action (Attendance Overview + Mark Attendance) -->
      <div class="view-header">
        <div>
          <h1>Attendance Overview</h1>
          <p class="view-subtitle">SY BSc IT · Single Batch · 60 Students · ${Utils.formatDate(new Date())}</p>
        </div>
        <div class="view-header-actions">
          ${pendingSlots.length > 0 ? `
            <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSlot('${pendingSlots[0].subjectId}', '${pendingSlots[0].start}', '${pendingSlots[0].type || 'lecture'}')" title="Start attendance for next pending class">
              Start Pending (${pendingSlots[0].start}) →
            </button>
          ` : ''}
          <button class="btn btn-primary" onclick="App.openMarkChoiceModal()">
            ${UI.icon('plus')} Mark Attendance
          </button>
        </div>
      </div>

      <!-- 2. Compact Metrics -->
      <div class="stat-grid section">
        <div class="stat-card" style="cursor:pointer;" onclick="App.navigateTo('students')">
          <div class="stat-label">${UI.icon('users')} 60 Students</div>
          <div class="stat-value">60</div>
          <div class="stat-sub">Enrolled in batch</div>
        </div>

        <div class="stat-card" style="cursor:pointer;" onclick="App.navigateTo('timetable')">
          <div class="stat-label">${UI.icon('clock')} Today's Sessions</div>
          <div class="stat-value">${todaySlots.length}</div>
          <div class="stat-sub">${todaySessions.length} recorded · ${pendingSlots.length} pending</div>
        </div>

        <div class="stat-card" style="cursor:pointer;" onclick="App.navigateTo('analytics')">
          <div class="stat-label">${UI.icon('trendUp')} Overall Attendance</div>
          <div class="stat-value" style="color:${stats.avgPct >= 75 ? 'var(--safe)' : 'var(--critical)'};">
            ${stats.totalSessions > 0 ? stats.avgPct + '%' : '—'}
          </div>
          <div class="stat-sub">${defaulters.length} student${defaulters.length === 1 ? '' : 's'} below 75% threshold</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">${UI.icon('alert')} Pending Sessions</div>
          <div class="stat-value" style="color:${pendingSlots.length > 0 ? 'var(--warn)' : 'var(--safe)'};">
            ${pendingSlots.length}
          </div>
          <div class="stat-sub">${pendingSlots.length === 0 ? 'All sessions marked today' : 'Require attendance marking'}</div>
        </div>
      </div>

      <!-- 3. Today's Lecture Attendance & 4. Today's Practical Attendance -->
      <div class="today-sections-grid section">
        <!-- TODAY'S LECTURE ATTENDANCE -->
        <div class="session-category-card">
          <div class="session-category-header">
            <div class="session-category-title-group">
              <div class="session-category-icon icon-lecture">${UI.icon('bookOpen')}</div>
              <div>
                <div class="session-category-title">Today's Lecture Attendance</div>
                <div class="session-category-subtitle">Regular classroom theory sessions</div>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSlot('', '09:00', 'lecture')">
              + Mark Lecture
            </button>
          </div>

          <div class="session-category-list">
            ${lectureSlots.length === 0 ? `
              <div style="padding:20px; text-align:center; color:var(--ink-secondary); font-size:12px;">
                No theory lectures scheduled on the timetable for today.
              </div>
            ` : lectureSlots.map(slot => {
              const sub = State.getSubject(slot.subjectId);
              const recorded = todaySessions.find(s => s.subjectId === slot.subjectId && s.startTime === slot.start && s.type !== 'practical');
              let sStats = null;
              if (recorded) sStats = Attendance.statsForSession(recorded.id);

              return `
                <div class="today-session-row">
                  <div class="today-session-main">
                    <div class="today-session-name">${sub ? Utils.escapeHTML(sub.name) : 'Theory Lecture'}</div>
                    <div class="today-session-meta">
                      <span>${slot.start} – ${slot.end}</span>
                      <span>·</span>
                      <span>${sub ? sub.teacher || 'Faculty' : 'Faculty'}</span>
                      <span>·</span>
                      <span class="badge ${recorded ? 'badge-safe' : 'badge-warn'}">${recorded ? 'Completed' : 'Pending'}</span>
                    </div>
                  </div>

                  <div class="today-session-stats">
                    ${recorded ? `
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:11.5px; font-weight:700; color:var(--ink); font-variant-numeric:tabular-nums;">
                          ${sStats.present} P · ${sStats.absent} A · ${sStats.late} L
                        </span>
                        <span class="badge ${sStats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${sStats.pct}%</span>
                      </div>
                      <button class="btn btn-ghost btn-sm" style="height:24px; padding:0 8px; font-size:11.5px;" onclick="App.navigateToMarkSession('${recorded.id}')">
                        View Session
                      </button>
                    ` : `
                      <button class="btn btn-primary btn-sm" style="height:26px; padding:0 10px; font-size:11.5px;" onclick="App.navigateToMarkSlot('${slot.subjectId}', '${slot.start}', 'lecture')">
                        Start Attendance
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- TODAY'S PRACTICAL ATTENDANCE -->
        <div class="session-category-card">
          <div class="session-category-header">
            <div class="session-category-title-group">
              <div class="session-category-icon icon-practical">${UI.icon('timetable')}</div>
              <div>
                <div class="session-category-title">Today's Practical Attendance</div>
                <div class="session-category-subtitle">Laboratory & experiment sessions</div>
              </div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSlot('', '10:15', 'practical')">
              + Mark Practical
            </button>
          </div>

          <div class="session-category-list">
            ${practicalSlots.length === 0 ? `
              <div style="padding:20px; text-align:center; color:var(--ink-secondary); font-size:12px;">
                No laboratory sessions scheduled on the timetable for today.
              </div>
            ` : practicalSlots.map(slot => {
              const sub = State.getSubject(slot.subjectId);
              const recorded = todaySessions.find(s => s.subjectId === slot.subjectId && s.startTime === slot.start && s.type === 'practical');
              let sStats = null;
              if (recorded) sStats = Attendance.statsForSession(recorded.id);

              return `
                <div class="today-session-row">
                  <div class="today-session-main">
                    <div class="today-session-name">${sub ? Utils.escapeHTML(sub.name) : 'Laboratory Practical'}</div>
                    <div class="today-session-meta">
                      <span>${slot.start} – ${slot.end}</span>
                      <span>·</span>
                      <span>${slot.room || 'Computer Lab'}</span>
                      <span>·</span>
                      <span class="badge ${recorded ? 'badge-safe' : 'badge-warn'}">${recorded ? 'Completed' : 'Pending'}</span>
                    </div>
                  </div>

                  <div class="today-session-stats">
                    ${recorded ? `
                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:11.5px; font-weight:700; color:var(--ink); font-variant-numeric:tabular-nums;">
                          ${sStats.present} P · ${sStats.absent} A · ${sStats.late} L
                        </span>
                        <span class="badge badge-safe">${sStats.pct}%</span>
                      </div>
                      <button class="btn btn-ghost btn-sm" style="height:24px; padding:0 8px; font-size:11.5px;" onclick="App.navigateToMarkSession('${recorded.id}')">
                        View Session
                      </button>
                    ` : `
                      <button class="btn btn-primary btn-sm" style="height:26px; padding:0 10px; font-size:11.5px; background:var(--practical); border-color:var(--practical);" onclick="App.navigateToMarkSlot('${slot.subjectId}', '${slot.start}', 'practical')">
                        Start Attendance
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- PRIORITIZED SECTION 2: STUDENTS NEEDING ATTENTION (< 75%) (Prompt 5) -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Students Needing Attention (< 75%)</div>
            <div class="section-desc">${defaulters.length} students currently failing the university minimum attendance requirement</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="App.navigateTo('students')">View All Students</button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 75px;">Roll No</th>
                <th>Student Name</th>
                <th style="width: 90px; text-align:center;">Present</th>
                <th style="width: 90px; text-align:center;">Absent</th>
                <th style="width: 110px; text-align:center;">Attendance %</th>
                <th style="width: 100px; text-align:center;">Status</th>
                <th style="width: 90px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${defaulters.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align:center; padding: 20px; color:var(--ink-secondary);">
                    ${stats.totalSessions === 0 ? 'Record attendance sessions to view defaulter analysis.' : 'All 60 students are meeting the 75% attendance requirement.'}
                  </td>
                </tr>
              ` : defaulters.slice(0, 6).map(d => `
                <tr>
                  <td><strong>${d.student.rollNumber}</strong></td>
                  <td><strong>${Utils.escapeHTML(d.student.name)}</strong></td>
                  <td style="color:var(--safe); font-weight:600; text-align:center;">${d.present + d.late}</td>
                  <td style="color:var(--critical); font-weight:600; text-align:center;">${d.absent}</td>
                  <td style="text-align:center;"><strong style="color:var(--critical); font-variant-numeric: tabular-nums;">${d.pct}%</strong></td>
                  <td style="text-align:center;"><span class="badge ${d.pct < 65 ? 'badge-critical' : 'badge-warn'}">${Utils.statusLabel(d.status)}</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-ghost btn-sm" onclick="StudentsView.openStudentDetail('${d.student.id}')">Profile</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- PRIORITIZED SECTION 3: RECENT SESSIONS (Prompt 5) -->
      <div class="section">
        <div class="section-title-row">
          <div>
            <div class="section-title">Recent Attendance Sessions</div>
            <div class="section-desc">Audit trail showing Subject, Time, Present / Absent / Late, %, Pending / Completed</div>
          </div>
          <div style="display:flex; gap:6px;">
            ${recentSessions.length > 0 ? `
              <button class="btn btn-ghost btn-sm" onclick="App.navigateToMarkSession('${recentSessions[0].id}')" title="View most recently recorded session">
                View Last Session
              </button>
            ` : ''}
            <button class="btn btn-outline btn-sm" onclick="App.navigateTo('history')">View Full History</button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 110px;">Date</th>
                <th>Subject</th>
                <th style="width: 85px;">Time</th>
                <th style="width: 90px;">Type</th>
                <th style="width: 140px; text-align:center;">Present / Absent / Late</th>
                <th style="width: 90px; text-align:center;">Attendance %</th>
                <th style="width: 95px; text-align:center;">Status</th>
                <th style="width: 120px; text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${recentSessions.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align:center; padding: 24px; color:var(--ink-secondary);">
                    No attendance sessions recorded yet. Click "+ Mark Attendance" to begin.
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
                      ${sess.experimentTitle ? `<div style="font-size:11px; color:var(--ink-secondary); font-style:italic;">${Utils.escapeHTML(sess.experimentTitle)}</div>` : ''}
                    </td>
                    <td><span style="color:var(--ink-secondary); font-variant-numeric: tabular-nums;">${sess.startTime || '09:00'}</span></td>
                    <td>
                      <span class="badge ${isPractical ? 'badge-safe' : 'badge-neutral'}">
                        ${isPractical ? 'PRACTICAL' : 'LECTURE'}
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <span style="font-size:11.5px; font-weight:700; font-variant-numeric:tabular-nums;">
                        <span style="color:var(--safe);">${sStats.present} P</span> · 
                        <span style="color:var(--critical);">${sStats.absent} A</span> · 
                        <span style="color:var(--warn);">${sStats.late} L</span>
                      </span>
                    </td>
                    <td style="text-align:center;">
                      <span class="badge ${sStats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${sStats.pct}%</span>
                    </td>
                    <td style="text-align:center;">
                      <span class="badge badge-safe">Completed</span>
                    </td>
                    <td style="text-align: right;">
                      <div style="display:inline-flex; gap:4px;">
                        <button class="btn btn-ghost btn-sm" onclick="App.navigateToMarkSession('${sess.id}')">View Session</button>
                        <button class="btn btn-outline btn-sm" onclick="App.navigateToMarkSession('${sess.id}')">Continue</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    bindEvents(container);
  }

  function bindEvents(container) {
    container.querySelectorAll('.dashboard-insight-btn').forEach(btn => {
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

  return { render };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Dashboard;
