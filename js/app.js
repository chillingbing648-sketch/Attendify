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
            <button class="icon-btn" id="topbar-menu-btn" aria-label="Open menu">${UI.icon('menu')}</button>
            <div class="topbar-breadcrumb">
              <span>Attendify</span>
              <span class="topbar-breadcrumb-sep">/</span>
              <span id="topbar-view-title">${VIEW_TITLES[currentView] || 'Dashboard'}</span>
            </div>
            <div class="topbar-badge">
              <span class="topbar-badge-dot"></span>
              ${Utils.escapeHTML(settings.className || 'SY BSc IT')} · 60 Students
            </div>
          </div>

          <div class="topbar-right">
            <!-- Global Search Trigger -->
            <button class="topbar-search-trigger" id="topbar-search-btn" title="Quick Search">
              ${UI.icon('search')}
              <span>Search roll no. / student...</span>
              <span class="kbd-shortcut">Ctrl+K</span>
            </button>

            <span class="topbar-date">${Utils.formatDate(new Date())}</span>

            <button class="icon-btn" id="topbar-theme-btn" aria-label="Toggle theme" title="Toggle Theme">
              ${UI.icon('sun')}
            </button>

            <!-- Admin Profile Indicator -->
            <div style="width:28px; height:28px; border-radius:50%; background:var(--accent-subtle); color:var(--accent); font-weight:700; font-size:11px; display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--accent-border);" title="Admin Account">
              AD
            </div>
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
    currentView = 'mark-attendance';
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === 'mark-attendance'));
    document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === 'mark-attendance');
    });
    const titleEl = document.getElementById('topbar-view-title');
    if (titleEl) titleEl.textContent = 'Mark Attendance';

    MarkAttendanceView.render('view-mark-attendance', subjectId, null, startTime, sessionType);
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
    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div class="search-box" style="width:100%;">
          ${UI.icon('search')}
          <input type="text" id="global-search-input" class="input" placeholder="Type roll number or name..." style="height:36px; font-size:14px;" autofocus>
        </div>
        <div id="global-search-results" style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:4px;">
          ${renderGlobalSearchResults(students.slice(0, 8))}
        </div>
      </div>
    `;

    UI.openModal({
      title: 'Quick Search Student Directory',
      desc: 'SY BSc IT · 60 Students',
      bodyHTML,
      footerHTML: '<button class="btn btn-outline" id="btn-close-search">Close</button>',
      onOpen: (overlay, close) => {
        const inp = overlay.querySelector('#global-search-input');
        const res = overlay.querySelector('#global-search-results');
        overlay.querySelector('#btn-close-search').addEventListener('click', close);

        inp.addEventListener('input', Utils.debounce((e) => {
          const q = e.target.value.toLowerCase().trim();
          const matches = students.filter(s => s.name.toLowerCase().includes(q) || String(s.rollNumber).includes(q));
          res.innerHTML = renderGlobalSearchResults(matches.slice(0, 10));
        }, 100));

        res.addEventListener('click', (e) => {
          const row = e.target.closest('[data-student-id]');
          if (!row) return;
          const stuId = row.dataset.studentId;
          close();
          StudentsView.openStudentDetail(stuId);
        });
      }
    });
  }

  function renderGlobalSearchResults(list) {
    if (list.length === 0) {
      return '<div style="padding:16px; text-align:center; color:var(--ink-tertiary); font-size:12px;">No matching students found</div>';
    }
    return list.map(s => {
      const stats = Attendance.statsForStudent(s.id);
      return `
        <div class="today-session-row" data-student-id="${s.id}" style="padding:8px 12px; cursor:pointer; border-radius:var(--r-md); border:1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="width:24px; font-size:12px; color:var(--ink);">${s.rollNumber}</strong>
            <span style="font-weight:600; font-size:13px; color:var(--ink);">${Utils.escapeHTML(s.name)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:11.5px; color:var(--ink-secondary);">${stats.total > 0 ? stats.pct + '%' : 'No Data'}</span>
            <span class="badge ${stats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">${stats.total > 0 ? Utils.statusLabel(stats.status) : '—'}</span>
          </div>
        </div>
      `;
    }).join('');
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
