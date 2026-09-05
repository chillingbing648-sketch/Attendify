const test = require('node:test');
const assert = require('node:assert/strict');

test('Reactivity Dispatcher - re-renders active view when dependent changeType fires, and does not over-render', () => {
  const VIEW_DEPENDENCIES = {
    dashboard: ['attendance', 'subjects', 'timetable', 'settings', 'all'],
    subjects: ['attendance', 'subjects', 'settings', 'all'],
    'subject-detail': ['attendance', 'subjects', 'settings', 'all'],
    analytics: ['attendance', 'subjects', 'settings', 'all'],
    timetable: ['subjects', 'timetable', 'all'],
    calendar: ['attendance', 'subjects', 'all'],
    notifications: ['notifications', 'all'],
    settings: ['settings', 'all']
  };

  let currentView = 'dashboard';
  let renderCounts = {
    dashboard: 0,
    subjects: 0,
    settings: 0,
    timetable: 0
  };

  function refreshCurrentView() {
    if (renderCounts[currentView] !== undefined) {
      renderCounts[currentView]++;
    }
  }

  function dispatchStateChange(changeType) {
    const deps = VIEW_DEPENDENCIES[currentView];
    if (deps && deps.includes(changeType)) {
      refreshCurrentView();
    }
  }

  // 1. Dashboard is active. 'attendance' fires -> should re-render dashboard
  currentView = 'dashboard';
  dispatchStateChange('attendance');
  assert.equal(renderCounts.dashboard, 1);
  assert.equal(renderCounts.settings, 0);

  // 2. Settings is active. 'attendance' fires -> should NOT re-render dashboard or settings
  currentView = 'settings';
  dispatchStateChange('attendance');
  assert.equal(renderCounts.dashboard, 1); // unchanged
  assert.equal(renderCounts.settings, 0);  // settings does not depend on attendance

  // 3. Settings is active. 'settings' fires -> should re-render settings
  dispatchStateChange('settings');
  assert.equal(renderCounts.settings, 1);
  assert.equal(renderCounts.dashboard, 1); // dashboard not re-rendered while inactive

  // 4. Timetable is active. 'timetable' fires -> should re-render timetable
  currentView = 'timetable';
  dispatchStateChange('timetable');
  assert.equal(renderCounts.timetable, 1);

  // 5. 'notifications' fires -> timetable does not re-render
  dispatchStateChange('notifications');
  assert.equal(renderCounts.timetable, 1);
});
