/* ============================================================
   ATTENDIFY — app.js (Admin Taskbar, Modal Flow & Navigation)
   ============================================================ */

const App = (() => {
  const VIEWS = ['dashboard', 'mark-attendance', 'students', 'subjects', 'history', 'analytics', 'reports', 'practical-reports', 'timetable', 'settings'];
  let currentView = 'dashboard';

  const VIEW_TITLES = {
    'dashboard': 'Dashboard',
    'mark-attendance': 'Mark Attendance',
    'students': 'Students Directory',
    'subjects': 'Curriculum Courses',
    'history': 'Attendance History',
    'analytics': 'Batch Analytics',
    'reports': 'Reports & Summary',
    'practical-reports': 'Practical Reports',
    'timetable': 'Timetable',
    'settings': 'Settings & Backup'
  };

  const NAV_SECTIONS = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'mark-attendance', label: 'Mark Attendance', icon: 'plus', highlight: true }
      ]
    },
    {
      title: 'Manage',
      items: [
        { id: 'students', label: 'Students', icon: 'users' },
        { id: 'subjects', label: 'Subjects', icon: 'subjects' }
      ]
    },
    {
      title: 'Records',
      items: [
        { id: 'history', label: 'Attendance History', icon: 'clock' }
      ]
    },
    {
      title: 'Insights',
      items: [
        { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        { id: 'reports', label: 'Reports', icon: 'download' },
        { id: 'practical-reports', label: 'Practical Reports', icon: 'bookOpen' }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'timetable', label: 'Timetable', icon: 'timetable' },
        { id: 'settings', label: 'Settings & Backup', icon: 'settings' }
      ]
    }
  ];

  function buildShell() {
    const root = document.getElementById('app-root');
    const settings = State.get().settings;

    root.innerHTML = `
      <div class="sidebar-scrim" id="sidebar-scrim"></div>
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark">A</div>
          <div class="brand-info">
            <div class="brand-name">Attendify</div>
            <div class="brand-class">${Utils.escapeHTML(settings.className || 'SY BSc IT')}</div>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Main navigation">
          ${NAV_SECTIONS.map(sec => `
            <div class="nav-section-title">${sec.title}</div>
            ${sec.items.map(item => `
              <button class="nav-item ${item.highlight ? 'nav-item-highlight' : ''}" data-view="${item.id}">
                ${UI.icon(item.icon)}
                <span>${item.label}</span>
              </button>
            `).join('')}
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          <button class="nav-item" id="theme-toggle-btn">
            ${UI.icon('sun')}
            <span>Toggle Theme</span>
          </button>
        </div>
      </aside>

      <div class="app-main">
        <!-- Apple-Inspired Refined Taskbar -->
        <div class="topbar">
          <div class="topbar-left">
            <button class="icon-btn topbar-menu-btn" id="topbar-menu-btn" aria-label="Open navigation menu">
              ${UI.icon('menu')}
            </button>
            <div class="topbar-breadcrumb">
              <span>Attendify</span>
              <span class="topbar-breadcrumb-sep">/</span>
              <span id="topbar-view-title">${VIEW_TITLES[currentView] || 'Dashboard'}</span>
            </div>
          </div>

          <div class="topbar-center">
            <div class="topbar-badge">
              <span class="topbar-badge-dot"></span>
              ${Utils.escapeHTML(settings.className || 'SY BSc IT')} · 60 Students
            </div>
          </div>

          <div class="topbar-right">
            <!-- Global Search Trigger -->
            <button class="topbar-search-trigger" id="topbar-search-btn" title="Quick Search (Ctrl+K)">
              ${UI.icon('search')}
              <span>Search student, roll no., subject...</span>
              <span class="kbd-shortcut">Ctrl+K</span>
            </button>

            <span class="topbar-date">${Utils.formatDate(new Date())}</span>

            <button class="icon-btn" id="topbar-theme-btn" aria-label="Toggle theme" title="Toggle Light/Dark Theme">
              ${UI.icon('sun')}
            </button>

            <!-- Admin Profile Indicator -->
            <button class="icon-btn" id="topbar-profile-btn" style="width:28px; height:28px; border-radius:50%; background:var(--accent-subtle); color:var(--accent); font-weight:700; font-size:11px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--accent-border); cursor:pointer;" title="Faculty Admin Profile">
              AD
            </button>
          </div>
        </div>

        <div class="view-scroll">
          <div class="view" id="view-dashboard" data-view="dashboard"></div>
          <div class="view" id="view-mark-attendance" data-view="mark-attendance"></div>
          <div class="view" id="view-students" data-view="students"></div>
          <div class="view" id="view-subjects" data-view="subjects"></div>
          <div class="view" id="view-history" data-view="history"></div>
          <div class="view" id="view-analytics" data-view="analytics"></div>
          <div class="view" id="view-reports" data-view="reports"></div>
          <div class="view" id="view-practical-reports" data-view="practical-reports"></div>
          <div class="view" id="view-timetable" data-view="timetable"></div>
          <div class="view" id="view-settings" data-view="settings"></div>
        </div>
      </div>
    `;

    bindNav();
    bindGlobalSearch();
  }

  function bindNav() {
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.view));
    });

    document.getElementById('theme-toggle-btn').addEventListener('click', cycleTheme);
    document.getElementById('topbar-theme-btn').addEventListener('click', cycleTheme);

    const profileBtn = document.getElementById('topbar-profile-btn');
    if (profileBtn) profileBtn.addEventListener('click', openProfileModal);

    document.getElementById('topbar-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebar-scrim').classList.add('open');
    });
    document.getElementById('sidebar-scrim').addEventListener('click', closeMobileSidebar);
  }

  function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-scrim').classList.remove('open');
  }

  function cycleTheme() {
    const current = State.get().settings.theme || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    State.updateSettings({ theme: next });
    UI.applyTheme(next);
    UI.toast(`Theme: ${next.toUpperCase()}`, 'info', 1000);
  }

  function navigateTo(viewId) {
    if (!VIEWS.includes(viewId)) viewId = 'dashboard';
    currentView = viewId;

    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === viewId));
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      const active = btn.dataset.view === viewId;
      btn.classList.toggle('active', active);
    });

    const titleEl = document.getElementById('topbar-view-title');
    if (titleEl) titleEl.textContent = VIEW_TITLES[viewId] || 'Overview';

    closeMobileSidebar();
    renderView(viewId);
    document.querySelector('.view-scroll').scrollTo({ top: 0, behavior: 'auto' });
  }

  function openMarkChoiceModal() {
    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; padding:6px 0;">
        <p style="font-size:var(--fs-sm); color:var(--ink-secondary); line-height:1.5;">
          Select the attendance category you wish to record for the SY BSc IT batch:
        </p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:4px;">
          <button class="btn btn-outline" id="modal-choice-lecture" style="height:auto; padding:16px 14px; display:flex; flex-direction:column; align-items:flex-start; text-align:left; gap:6px; border-color:var(--border-strong);">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="session-category-icon icon-lecture">${UI.icon('bookOpen')}</div>
              <strong style="font-size:var(--fs-sm); color:var(--ink);">Lecture Attendance</strong>
            </div>
            <span style="font-size:11px; color:var(--ink-secondary); font-weight:normal;">Regular classroom theory lectures.</span>
          </button>

          <button class="btn btn-outline" id="modal-choice-practical" style="height:auto; padding:16px 14px; display:flex; flex-direction:column; align-items:flex-start; text-align:left; gap:6px; border-color:var(--border-strong);">
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="session-category-icon icon-practical">${UI.icon('timetable')}</div>
              <strong style="font-size:var(--fs-sm); color:var(--ink);">Practical Attendance</strong>
            </div>
            <span style="font-size:11px; color:var(--ink-secondary); font-weight:normal;">Laboratory experiments & journal logs.</span>
          </button>
        </div>
      </div>
    `;

    UI.openModal({
      title: 'Mark Attendance — Choose Category',
      desc: 'SY BSc IT · 60 Students',
      bodyHTML,
      footerHTML: '<button class="btn btn-outline" id="btn-cancel-choice">Cancel</button>',
      onOpen: (overlay, close) => {
        overlay.querySelector('#btn-cancel-choice').addEventListener('click', close);
        overlay.querySelector('#modal-choice-lecture').addEventListener('click', () => {
          close();
          navigateToMarkSlot('', '09:00', 'lecture');
        });
        overlay.querySelector('#modal-choice-practical').addEventListener('click', () => {
          close();
          navigateToMarkSlot('', '10:15', 'practical');
        });
      }
    });
  }

  function navigateToMarkSlot(subjectId, startTime, sessionType = 'lecture') {
    const normType = sessionType === 'practical' ? 'practical' : 'lecture';
    currentView = 'mark-attendance';
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === 'mark-attendance'));
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === 'mark-attendance');
    });
    const titleEl = document.getElementById('topbar-view-title');
    if (titleEl) titleEl.textContent = 'Mark Attendance';

    MarkAttendanceView.render('view-mark-attendance', subjectId, null, startTime, normType);
    document.querySelector('.view-scroll').scrollTo({ top: 0, behavior: 'auto' });
  }

  function navigateToMarkSubject(subjectId) {
    navigateToMarkSlot(subjectId, '09:00', 'lecture');
  }

  function navigateToMarkSession(sessionId) {
    currentView = 'mark-attendance';
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === 'mark-attendance'));
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === 'mark-attendance');
    });
    const titleEl = document.getElementById('topbar-view-title');
    if (titleEl) titleEl.textContent = 'Edit Attendance Session';

    MarkAttendanceView.render('view-mark-attendance', null, sessionId);
    document.querySelector('.view-scroll').scrollTo({ top: 0, behavior: 'auto' });
  }

  function bindGlobalSearch() {
    const trigger = document.getElementById('topbar-search-btn');
    if (trigger) trigger.addEventListener('click', openGlobalSearchModal);

    // Keyboard shortcut Ctrl+K / Cmd+K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openGlobalSearchModal();
      }
    });
  }

  function openGlobalSearchModal() {
    const students = State.getAllStudents();
    const subjects = State.get().subjects;
    const sessions = State.getAllSessions();

    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="search-box" style="width:100%;">
          ${UI.icon('search')}
          <input type="text" id="global-search-input" class="input" placeholder="Type student, roll no, subject, or session date..." style="height:36px; font-size:13.5px;" autofocus>
        </div>
        <div id="global-search-results" style="max-height:360px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
          ${renderMultiCategorySearch('', students, subjects, sessions)}
        </div>
      </div>
    `;

    UI.openModal({
      title: 'Global Search',
      desc: 'SY BSc IT · Search Students, Roll Numbers, Subjects & Sessions',
      bodyHTML,
      wide: true,
      footerHTML: '<button class="btn btn-outline" id="btn-close-search">Close</button>',
      onOpen: (overlay, close) => {
        const inp = overlay.querySelector('#global-search-input');
        const res = overlay.querySelector('#global-search-results');
        overlay.querySelector('#btn-close-search').addEventListener('click', close);

        inp.addEventListener('input', Utils.debounce((e) => {
          const q = e.target.value.toLowerCase().trim();
          res.innerHTML = renderMultiCategorySearch(q, students, subjects, sessions);
        }, 100));

        res.addEventListener('click', (e) => {
          const studentRow = e.target.closest('[data-student-id]');
          if (studentRow) {
            close();
            StudentsView.openStudentDetail(studentRow.dataset.studentId);
            return;
          }

          const subjectRow = e.target.closest('[data-subject-id]');
          if (subjectRow) {
            close();
            App.navigateToMarkSubject(subjectRow.dataset.subjectId);
            return;
          }

          const sessionRow = e.target.closest('[data-session-id]');
          if (sessionRow) {
            close();
            App.navigateToMarkSession(sessionRow.dataset.sessionId);
            return;
          }
        });
      }
    });
  }

  function renderMultiCategorySearch(query, students, subjects, sessions) {
    const q = query.toLowerCase().trim();

    // 1. Matched Students
    const matchedStudents = q
      ? students.filter(s => s.name.toLowerCase().includes(q) || String(s.rollNumber).includes(q)).slice(0, 8)
      : students.slice(0, 6);

    // 2. Matched Subjects
    const matchedSubjects = q
      ? subjects.filter(s => s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q)) || (s.teacher && s.teacher.toLowerCase().includes(q))).slice(0, 4)
      : subjects.slice(0, 3);

    // 3. Matched Sessions
    const matchedSessions = q
      ? sessions.filter(sess => {
          const sub = State.getSubject(sess.subjectId);
          const subName = sub ? sub.name.toLowerCase() : '';
          const exp = (sess.experimentTitle || '').toLowerCase();
          const dateStr = sess.date.toLowerCase();
          return subName.includes(q) || exp.includes(q) || dateStr.includes(q);
        }).slice(0, 5)
      : sessions.slice(0, 3);

    if (matchedStudents.length === 0 && matchedSubjects.length === 0 && matchedSessions.length === 0) {
      return '<div style="padding:24px; text-align:center; color:var(--ink-secondary); font-size:12px;">No results found across students, subjects, or sessions.</div>';
    }

    return `
      <!-- Students Section -->
      ${matchedStudents.length > 0 ? `
        <div>
          <div style="font-size:10.5px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase; margin-bottom:4px;">Students (${matchedStudents.length})</div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${matchedStudents.map(s => {
              const stats = Attendance.statsForStudent(s.id);
              return `
                <div class="today-session-row" data-student-id="${s.id}" style="padding:6px 10px; cursor:pointer; border-radius:var(--r-sm); border:1px solid var(--border);">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <strong style="width:24px; font-size:12px; color:var(--ink); font-variant-numeric:tabular-nums;">${s.rollNumber}</strong>
                    <span style="font-weight:600; font-size:12.5px; color:var(--ink);">${Utils.escapeHTML(s.name)}</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:11.5px; color:var(--ink-secondary);">${stats.total > 0 ? stats.pct + '%' : 'No Data'}</span>
                    <span class="badge ${stats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${stats.total > 0 ? Utils.statusLabel(stats.status) : '—'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Subjects Section -->
      ${matchedSubjects.length > 0 ? `
        <div style="margin-top:6px;">
          <div style="font-size:10.5px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase; margin-bottom:4px;">Curriculum Subjects (${matchedSubjects.length})</div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${matchedSubjects.map(sub => `
              <div class="today-session-row" data-subject-id="${sub.id}" style="padding:6px 10px; cursor:pointer; border-radius:var(--r-sm); border:1px solid var(--border);">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="badge badge-neutral" style="font-size:10px;">COURSE</span>
                  <span style="font-weight:600; font-size:12.5px; color:var(--ink);">${Utils.escapeHTML(sub.name)}</span>
                  <span style="font-size:11px; color:var(--ink-tertiary);">${sub.teacher || ''}</span>
                </div>
                <button class="btn btn-primary btn-sm" style="height:22px; padding:0 8px; font-size:11px;">Mark</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Attendance Sessions Section -->
      ${matchedSessions.length > 0 ? `
        <div style="margin-top:6px;">
          <div style="font-size:10.5px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase; margin-bottom:4px;">Attendance Sessions (${matchedSessions.length})</div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            ${matchedSessions.map(sess => {
              const sub = State.getSubject(sess.subjectId);
              const stats = Attendance.statsForSession(sess.id);
              const isPractical = sess.type === 'practical';
              return `
                <div class="today-session-row" data-session-id="${sess.id}" style="padding:6px 10px; cursor:pointer; border-radius:var(--r-sm); border:1px solid var(--border);">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="badge ${isPractical ? 'badge-safe' : 'badge-neutral'}" style="font-size:10px;">${isPractical ? 'PRACTICAL' : 'LECTURE'}</span>
                    <strong style="font-size:12px; color:var(--ink);">${Utils.formatDate(sess.date)}</strong>
                    <span style="font-size:12px; color:var(--ink-secondary);">${sub ? Utils.escapeHTML(sub.name) : ''}</span>
                    ${sess.experimentTitle ? `<span style="font-size:11px; color:var(--ink-tertiary); font-style:italic;">(${Utils.escapeHTML(sess.experimentTitle)})</span>` : ''}
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:11px; font-weight:700; color:var(--ink);">${stats.present}/60</span>
                    <span class="badge ${stats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${stats.pct}%</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  function openProfileModal() {
    const s = State.get().settings;
    const students = State.getAllStudents();
    const stats = Attendance.overallBatchStats();

    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; align-items:center; gap:12px; padding:6px 0;">
          <div style="width:48px; height:48px; border-radius:50%; background:var(--accent-subtle); color:var(--accent); font-weight:800; font-size:18px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--accent-border);">
            AD
          </div>
          <div>
            <div style="font-size:15px; font-weight:700; color:var(--ink);">${Utils.escapeHTML(s.adminName || 'Faculty / Administrator')}</div>
            <div style="font-size:12px; color:var(--ink-secondary);">Department of Information Technology</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; background:var(--surface-subtle); padding:10px 12px; border-radius:var(--r-md); border:1px solid var(--border);">
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Class & Batch</div>
            <div style="font-weight:700; font-size:13px; color:var(--ink);">${Utils.escapeHTML(s.className || 'SY BSc IT')}</div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Students Enrolled</div>
            <div style="font-weight:700; font-size:13px; color:var(--ink);">${students.length} Students</div>
          </div>
          <div style="margin-top:6px;">
            <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Safe Threshold</div>
            <div style="font-weight:700; font-size:13px; color:var(--safe);">${s.thresholdSafe || 75}%</div>
          </div>
          <div style="margin-top:6px;">
            <div style="font-size:10px; font-weight:700; color:var(--ink-tertiary); text-transform:uppercase;">Batch Turnout</div>
            <div style="font-weight:700; font-size:13px; color:var(--ink);">${stats.totalSessions > 0 ? stats.avgPct + '%' : 'No Sessions'}</div>
          </div>
        </div>
      </div>
    `;

    UI.openModal({
      title: 'Administrator Profile',
      desc: 'SY BSc IT Attendance System',
      bodyHTML,
      footerHTML: `
        <div style="display:flex; justify-content:space-between; width:100%;">
          <button class="btn btn-outline" id="btn-profile-to-settings">Open Settings</button>
          <button class="btn btn-primary" id="btn-close-profile">Close</button>
        </div>
      `,
      onOpen: (overlay, close) => {
        overlay.querySelector('#btn-close-profile').addEventListener('click', close);
        overlay.querySelector('#btn-profile-to-settings').addEventListener('click', () => {
          close();
          navigateTo('settings');
        });
      }
    });
  }

  function renderView(viewId) {
    switch (viewId) {
      case 'dashboard': Dashboard.render(); break;
      case 'mark-attendance': MarkAttendanceView.render(); break;
      case 'students': StudentsView.render(); break;
      case 'subjects': Subjects.render(); break;
      case 'history': HistoryView.render(); break;
      case 'analytics': AnalyticsView.render(); break;
      case 'reports': ReportsView.render(); break;
      case 'practical-reports': PracticalReportsView.render(); break;
      case 'timetable': Timetable.render(); break;
      case 'settings': SettingsView.render(); break;
    }
  }

  function init() {
    const { recovered } = State.init();
    UI.applyTheme(State.get().settings.theme || 'light');

    buildShell();

    State.subscribe(() => {
      renderView(currentView);
    });

    navigateTo('dashboard');

    if (recovered) {
      UI.toast('Saved data safely recovered from backup', 'info');
    }
  }

  return {
    init, navigateTo, navigateToMarkSubject, navigateToMarkSlot, navigateToMarkSession,
    openMarkChoiceModal, getCurrentView: () => currentView
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
