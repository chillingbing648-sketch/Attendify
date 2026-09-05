/* ============================================================
   ATTENDIFY — notifications.js
   Generates notifications strictly from real stored data.
   No fake/random notifications are ever created.
   ============================================================ */

const Notifications = (() => {

  function thresholds() {
    const s = State.get().settings;
    return { safe: s.thresholdSafe, warn: s.thresholdWarn };
  }

  /** Call after any attendance change for a subject to react to threshold crossings. */
  function checkThresholdChange(subjectId) {
    const settings = State.get().settings;
    const subject = State.getSubject(subjectId);
    if (!subject) return;
    const th = thresholds();
    const stat = Attendance.statsForSubject(subjectId, th);
    if (stat.total === 0) return;

    if (stat.status === 'critical' && settings.notifyBelowThreshold) {
      State.addNotification({
        type: 'below-threshold',
        subjectId,
        title: `${subject.name} is below threshold`,
        message: `Attendance is at ${stat.pct}%, below the ${th.safe}% requirement.`
      });
    } else if (stat.status === 'warn' && settings.notifyApproaching) {
      State.addNotification({
        type: 'approaching-threshold',
        subjectId,
        title: `${subject.name} is approaching the limit`,
        message: `Attendance is at ${stat.pct}%, getting close to the ${th.safe}% requirement.`
      });
    } else if (stat.status === 'safe' && settings.notifyRecovered) {
      // Only notify "recovered" if there's a recent critical/warn notification for this subject
      const hadIssue = State.get().notifications.some(n =>
        n.subjectId === subjectId && (n.type === 'below-threshold' || n.type === 'approaching-threshold')
      );
      if (hadIssue) {
        State.addNotification({
          type: 'recovered',
          subjectId,
          title: `${subject.name} is back on track`,
          message: `Attendance has recovered to ${stat.pct}%.`
        });
      }
    }

    // Recovery opportunity notification: when attendance is not safe, but recovery is within reachable <= 5 classes
    if ((stat.status === 'critical' || stat.status === 'warn') && settings.notifyRecoveryOpportunity) {
      const pred = Attendance.predictionForSubject(subjectId, th);
      if (pred.needed > 0 && pred.needed <= 5) {
        State.addNotification({
          type: 'recovery-opportunity',
          subjectId,
          title: `${subject.name}: Recovery within reach`,
          message: `Attend the next ${pred.needed} class${pred.needed === 1 ? '' : 'es'} in a row to reach the ${th.safe}% safe mark.`
        });
      }
    }
  }

  /** Run once on load / periodically: checks upcoming classes and threshold state for all subjects. */
  function runChecks() {
    const settings = State.get().settings;
    const th = thresholds();

    State.get().subjects.forEach(s => {
      const stat = Attendance.statsForSubject(s.id, th);
      if (stat.total === 0) return;
      if (stat.status === 'critical' && settings.notifyBelowThreshold) {
        State.addNotification({
          type: 'below-threshold', subjectId: s.id,
          title: `${s.name} is below threshold`,
          message: `Attendance is at ${stat.pct}%, below the ${th.safe}% requirement.`
        });
      } else if (stat.status === 'warn' && settings.notifyApproaching) {
        State.addNotification({
          type: 'approaching-threshold', subjectId: s.id,
          title: `${s.name} is approaching the limit`,
          message: `Attendance is at ${stat.pct}%, getting close to the ${th.safe}% requirement.`
        });
      }

      if ((stat.status === 'critical' || stat.status === 'warn') && settings.notifyRecoveryOpportunity) {
        const pred = Attendance.predictionForSubject(s.id, th);
        if (pred.needed > 0 && pred.needed <= 5) {
          State.addNotification({
            type: 'recovery-opportunity',
            subjectId: s.id,
            title: `${s.name}: Recovery within reach`,
            message: `Attend the next ${pred.needed} class${pred.needed === 1 ? '' : 'es'} in a row to reach the ${th.safe}% safe mark.`
          });
        }
      }
    });

    // Daily schedule summary notification (deduped by date)
    if (settings.notifyDailySchedule && typeof Timetable !== 'undefined' && Timetable.todaysClasses) {
      const todayClasses = Timetable.todaysClasses();
      if (todayClasses.length > 0) {
        const todayISO = Utils.todayISO();
        State.addNotification({
          type: 'daily-schedule',
          date: todayISO,
          title: `Today's Schedule (${todayClasses.length} class${todayClasses.length === 1 ? '' : 'es'})`,
          message: `You have ${todayClasses.length} class${todayClasses.length === 1 ? '' : 'es'} scheduled today, starting with ${todayClasses[0].subjectName} at ${todayClasses[0].start}.`
        });
      }
    }

    if (settings.notifyUpcomingClass) {
      const next = Timetable.nextUpcomingClass();
      if (next && next.daysAhead === 0) {
        const subject = State.getSubject(next.entry.subjectId);
        if (subject) {
          State.addNotification({
            type: 'upcoming-class',
            subjectId: subject.id,
            title: `Upcoming class: ${subject.name}`,
            message: `Starts at ${next.entry.start}${next.entry.room ? ' in ' + next.entry.room : ''} today.`
          });
        }
      }
    }
  }

  function render() {
    const container = document.getElementById('view-notifications');
    const notifs = State.get().notifications;

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Notifications</h1>
          <p class="view-subtitle">${notifs.length === 0 ? 'No notifications yet' : `${State.unreadNotificationCount()} unread`}</p>
        </div>
        <div class="view-header-actions">
          ${notifs.length > 0 ? `
            <button class="btn btn-outline btn-sm" id="mark-all-read-btn">Mark all read</button>
            <button class="btn btn-ghost btn-sm" id="clear-notifs-btn">Clear all</button>
          ` : ''}
        </div>
      </div>

      <div class="card" style="padding:0;">
        ${notifs.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">${UI.icon('notifications')}</div>
            <h3>No Unread Notifications</h3>
            <p>System alerts regarding attendance thresholds and academic schedule updates will appear here.</p>
          </div>
        ` : notifs.map(notifItemHTML).join('')}
      </div>
    `;

    const markAllBtn = container.querySelector('#mark-all-read-btn');
    if (markAllBtn) markAllBtn.addEventListener('click', () => { State.markAllNotificationsRead(); render(); NavBadge.update(); });
    const clearBtn = container.querySelector('#clear-notifs-btn');
    if (clearBtn) clearBtn.addEventListener('click', async () => {
      const ok = await UI.confirmDialog({ title: 'Clear all notifications?', message: 'This removes your notification history. This cannot be undone.', confirmLabel: 'Clear all', danger: true });
      if (ok) { State.clearNotifications(); render(); NavBadge.update(); }
    });

    container.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', () => {
        State.markNotificationRead(item.dataset.id);
        item.classList.remove('unread');
        const dot = item.querySelector('.notif-unread-dot');
        if (dot) dot.remove();
        NavBadge.update();
      });
    });
  }

  function iconForType(type) {
    return {
      'below-threshold': { icon: 'alert', bg: 'var(--critical-soft)', color: 'var(--critical-soft-ink)' },
      'approaching-threshold': { icon: 'alert', bg: 'var(--warn-soft)', color: 'var(--warn-soft-ink)' },
      'recovered': { icon: 'checkCircle', bg: 'var(--safe-soft)', color: 'var(--safe-soft-ink)' },
      'upcoming-class': { icon: 'clock', bg: 'var(--accent-soft)', color: 'var(--accent-soft-ink)' },
      'recovery-opportunity': { icon: 'zap', bg: 'var(--accent-soft)', color: 'var(--accent-soft-ink)' },
      'daily-schedule': { icon: 'timetable', bg: 'var(--surface-3)', color: 'var(--ink)' }
    }[type] || { icon: 'notifications', bg: 'var(--surface-3)', color: 'var(--ink-2)' };
  }

  function notifItemHTML(n) {
    const cfg = iconForType(n.type);
    return `
      <div class="notif-item" data-id="${n.id}" style="cursor:pointer; ${n.read ? '' : 'background:var(--surface-2);'}">
        <div class="notif-icon" style="background:${cfg.bg}; color:${cfg.color};">${UI.icon(cfg.icon)}</div>
        <div class="notif-body">
          <div class="notif-title">${Utils.escapeHTML(n.title)}</div>
          <div class="notif-desc">${Utils.escapeHTML(n.message)}</div>
          <div class="notif-time">${Utils.timeAgo(n.createdAt)}</div>
        </div>
        ${!n.read ? '<div class="notif-unread-dot"></div>' : ''}
      </div>
    `;
  }

  return { checkThresholdChange, runChecks, render };
})();

/** Small helper to keep the sidebar unread badge in sync. */
const NavBadge = (() => {
  function update() {
    const count = State.unreadNotificationCount();
    const badge = document.getElementById('nav-notif-badge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 99 ? '99+' : String(count); badge.style.display = 'inline-block'; }
    else { badge.style.display = 'none'; }
  }
  return { update };
})();
