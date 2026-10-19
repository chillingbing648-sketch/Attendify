/* ============================================================
   ATTENDIFY — qr-attendance.js
   Rotating QR Code Attendance Dashboard & Faculty Workflow
   Features:
   • Live Server-Backed Cryptographic Token Rotation
   • Configurable Duration (5-30m) & Rotation Interval (15-45s)
   • Seamless Integration with State.createSession & State.saveRecords
   • 60-Student Live Roster with Real-Time Check-In Verification
   • Manual Correction & Exception Overrides
   • Live Security Audit Event Stream
   • Proper Timer & Resource Lifecycle Cleanup on Navigation
   ============================================================ */

const QRAttendanceView = (() => {
  // Session Configuration & Live State
  let activeSession = null;
  let rotationTimer = null;
  let countdownInterval = null;
  let pollInterval = null;
  let serverAvailable = true;

  // Form State
  let selectedSubjectId = '';
  let selectedSessionType = 'lecture'; // 'lecture' | 'practical'
  let selectedDate = Utils.todayISO();
  let selectedStartTime = '09:00';
  let experimentTitle = '';
  let durationMinutes = 15;
  let rotationIntervalSec = 20;

  // Local Attendance Map: studentId -> { rollNumber, name, status, timestamp, flag }
  let studentCheckinMap = new Map();
  let auditLogs = [];

  // Check backend server availability on initialization
  async function checkServerHealth() {
    try {
      const res = await fetch('/api/qr/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        serverAvailable = data && data.status === 'ok';
      } else {
        serverAvailable = false;
      }
    } catch {
      serverAvailable = false;
    }
  }

  function cleanup() {
    if (rotationTimer) {
      clearTimeout(rotationTimer);
      rotationTimer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function initDefaults() {
    const subjects = State.get().subjects;
    if (!selectedSubjectId && subjects.length > 0) {
      selectedSubjectId = subjects[0].id;
    }
    selectedDate = Utils.todayISO();
    const d = new Date();
    selectedStartTime = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  async function startQRSession() {
    if (!selectedSubjectId) {
      UI.toast('Please select a curriculum course', 'error');
      return;
    }

    if (selectedSessionType === 'practical' && !experimentTitle.trim()) {
      UI.toast('Please specify practical experiment title', 'warn');
      const expInput = document.getElementById('qr-exp-title');
      if (expInput) expInput.focus();
      return;
    }

    cleanup();
    studentCheckinMap.clear();
    auditLogs = [];

    // Pre-populate all 60 students as 'pending'
    const enrolled = State.getAllStudents();
    enrolled.forEach(s => {
      studentCheckinMap.set(s.id, {
        rollNumber: s.rollNumber,
        name: s.name,
        status: 'pending',
        timestamp: null,
        flag: null
      });
    });

    const payload = {
      subjectId: selectedSubjectId,
      sessionType: selectedSessionType,
      date: selectedDate,
      startTime: selectedStartTime,
      experimentTitle,
      durationMinutes,
      rotationIntervalSec
    };

    if (serverAvailable) {
      try {
        const res = await fetch('/api/qr/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.session) {
          activeSession = data.session;
          scheduleNextRotation();
          startTimers();
          render();
          UI.toast(`QR Attendance session started (${rotationIntervalSec}s rotation)`, 'success', 2000);
          return;
        }
      } catch (e) {
        console.warn('Backend start failed, falling back to simulated mode:', e);
      }
    }

    // Fallback: Local Client Simulated Mode
    const now = Date.now();
    const mockToken = Array.from(window.crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    activeSession = {
      id: 'qr_local_' + now,
      subjectId: selectedSubjectId,
      sessionType: selectedSessionType,
      date: selectedDate,
      startTime: selectedStartTime,
      experimentTitle,
      durationMinutes,
      rotationIntervalSec,
      createdAt: now,
      expiresAt: now + durationMinutes * 60 * 1000,
      token: mockToken,
      tokenExpiresAt: now + rotationIntervalSec * 1000,
      status: 'active'
    };
    auditLogs.push({
      event: 'SESSION_STARTED',
      timestamp: new Date().toISOString(),
      details: 'Session started (Local Simulated Mode)'
    });
    scheduleNextRotation();
    startTimers();
    render();
    UI.toast('QR Attendance started in local simulation mode', 'info', 2000);
  }

  async function rotateTokenNow() {
    if (!activeSession || activeSession.status !== 'active') return;

    if (serverAvailable && !activeSession.id.startsWith('qr_local_')) {
      try {
        const res = await fetch('/api/qr/session/rotate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSession.id })
        });
        const data = await res.json();
        if (data.success) {
          activeSession.token = data.token;
          activeSession.tokenExpiresAt = data.tokenExpiresAt;
          scheduleNextRotation();
          updateQRDisplay();
          return;
        }
      } catch (e) {
        console.error('Rotate token error:', e);
      }
    }

    // Local Fallback Rotation
    const now = Date.now();
    activeSession.token = Array.from(window.crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    activeSession.tokenExpiresAt = now + activeSession.rotationIntervalSec * 1000;
    auditLogs.push({
      event: 'TOKEN_ROTATED',
      timestamp: new Date().toISOString(),
      details: 'Token rotated locally'
    });
    scheduleNextRotation();
    updateQRDisplay();
  }

  function scheduleNextRotation() {
    if (rotationTimer) clearTimeout(rotationTimer);
    if (!activeSession || activeSession.status !== 'active') return;

    const remainingMs = Math.max(0, activeSession.tokenExpiresAt - Date.now());
    rotationTimer = setTimeout(() => {
      rotateTokenNow();
    }, remainingMs);
  }

  function startTimers() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      if (!activeSession) return;
      const now = Date.now();

      // Check if overall session duration expired
      if (now >= activeSession.expiresAt) {
        activeSession.status = 'expired';
        cleanup();
        render();
        UI.toast('Session check-in duration has expired. Please review and finalize attendance.', 'warn', 4000);
        return;
      }

      updateCountdownElements();
    }, 250);

    // Poll live server status every 2.5s for real student submissions
    if (serverAvailable && pollInterval === null) {
      pollInterval = setInterval(async () => {
        if (!activeSession || activeSession.status !== 'active' || activeSession.id.startsWith('qr_local_')) return;
        try {
          const res = await fetch(`/api/qr/session/status?sessionId=${encodeURIComponent(activeSession.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.session) {
              syncLiveCheckins(data.session.checkedInStudents);
              if (data.session.auditLog) {
                auditLogs = data.session.auditLog;
              }
              updateActivityRoster();
            }
          }
        } catch {}
      }, 2500);
    }
  }

  function syncLiveCheckins(checkedInList) {
    if (!Array.isArray(checkedInList)) return;
    checkedInList.forEach(item => {
      const existing = studentCheckinMap.get(item.studentId);
      if (existing) {
        existing.status = item.status || 'present';
        existing.timestamp = item.timestamp;
        existing.flag = item.flag;
      }
    });
  }

  function updateCountdownElements() {
    if (!activeSession) return;
    const now = Date.now();

    // 1. Rotation Countdown
    const tokenRemainMs = Math.max(0, activeSession.tokenExpiresAt - now);
    const tokenRemainSec = Math.ceil(tokenRemainMs / 1000);
    const rotationPct = Math.min(100, Math.max(0, (tokenRemainMs / (activeSession.rotationIntervalSec * 1000)) * 100));

    const tokenSecEl = document.getElementById('qr-rotation-seconds');
    if (tokenSecEl) tokenSecEl.textContent = tokenRemainSec + 's';

    const tokenBarEl = document.getElementById('qr-rotation-progress-bar');
    if (tokenBarEl) tokenBarEl.style.width = rotationPct + '%';

    // 2. Overall Session Remaining
    const sessRemainMs = Math.max(0, activeSession.expiresAt - now);
    const sessMin = Math.floor(sessRemainMs / 60000);
    const sessSec = Math.floor((sessRemainMs % 60000) / 1000);
    const sessRemainStr = String(sessMin).padStart(2, '0') + ':' + String(sessSec).padStart(2, '0');

    const sessTimeEl = document.getElementById('qr-session-timer-display');
    if (sessTimeEl) sessTimeEl.textContent = sessRemainStr;
  }

  function updateQRDisplay() {
    if (!activeSession) return;
    const qrContainer = document.getElementById('qr-code-graphic');
    const tokenHashEl = document.getElementById('qr-token-hash');
    if (!qrContainer) return;

    const checkinUrl = `${window.location.origin}/checkin.html?s=${encodeURIComponent(activeSession.id)}&t=${encodeURIComponent(activeSession.token)}`;
    const svg = QRCode.generateSVG(checkinUrl, {
      margin: 2,
      darkColor: '#20243A',
      lightColor: '#FFFFFF',
      errorCorrectionLevel: 'M'
    });

    qrContainer.innerHTML = svg;
    if (tokenHashEl) {
      tokenHashEl.textContent = 'Token: ' + activeSession.token.slice(0, 10) + '... (' + new Date().toLocaleTimeString() + ')';
    }
  }

  function getCounts() {
    let checkedIn = 0;
    let pending = 0;
    let late = 0;
    let flagged = 0;

    studentCheckinMap.forEach(item => {
      if (item.status === 'present') checkedIn++;
      else if (item.status === 'late') late++;
      else pending++;
      if (item.flag) flagged++;
    });

    return { checkedIn, pending, late, flagged, total: studentCheckinMap.size };
  }

  function render(containerId = 'view-qr-attendance') {
    const container = document.getElementById(containerId);
    if (!container) return;

    initDefaults();
    const subjects = State.get().subjects;
    const enrolled = State.getAllStudents();
    const currentSubject = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
    const isPractical = selectedSessionType === 'practical';

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="view-header">
          <div>
            <h1>QR Attendance</h1>
            <p class="view-subtitle">Dynamic rotating QR code attendance portal</p>
          </div>
        </div>
        <div class="card empty-state">
          <div class="empty-state-icon">${UI.icon('qrcode')}</div>
          <h3>No Subjects Configured</h3>
          <p>Please configure curriculum subjects before initiating QR attendance.</p>
          <button class="btn btn-primary" onclick="App.navigateTo('subjects')">Configure Subjects</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <!-- 1. View Header -->
      <div class="view-header" style="margin-bottom: 16px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h1>QR Attendance</h1>
            <span class="badge ${activeSession && activeSession.status === 'active' ? 'badge-safe' : 'badge-neutral'}" id="qr-status-pill">
              ${activeSession && activeSession.status === 'active' ? '● LIVE SESSION' : 'READY TO START'}
            </span>
            ${serverAvailable ? `
              <span class="badge badge-safe" style="font-size:10.5px; padding:2px 7px;" title="Connected to trusted server-side crypto validation">
                🔒 BACKEND VERIFIED
              </span>
            ` : `
              <span class="badge badge-warn" style="font-size:10.5px; padding:2px 7px;" title="Running in client demo mode; start node server.js for server validation">
                ⚠️ DEMO SIMULATION
              </span>
            `}
          </div>
          <p class="view-subtitle">SY BSc IT · Rotating token validation for 60 enrolled students</p>
        </div>

        <div class="view-header-actions">
          ${activeSession && activeSession.status === 'active' ? `
            <button class="btn btn-outline btn-sm" id="btn-copy-checkin-link" title="Copy student check-in URL">
              ${UI.icon('download')} Copy Link
            </button>
            <button class="btn btn-outline btn-sm" id="btn-simulate-scan" title="Simulate a student scan for testing">
              ${UI.icon('users')} Test Scan
            </button>
            <button class="btn btn-danger btn-sm" id="btn-end-qr-session">
              ${UI.icon('checkCircle')} End & Review Session
            </button>
          ` : `
            <button class="btn btn-primary btn-sm" id="btn-start-qr-session">
              ${UI.icon('qrcode')} Start QR Session
            </button>
          `}
        </div>
      </div>

      <!-- 2. Session Setup Bar -->
      <div class="card" style="margin-bottom: 18px; padding: 14px 18px; background:var(--surface); border:1px solid var(--border);">
        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px;">
          <!-- Left: Session Parameters -->
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
            <!-- Category Switcher -->
            <div class="segmented-control">
              <button class="segmented-item ${!isPractical ? 'active' : ''}" id="tab-qr-lecture" ${activeSession ? 'disabled' : ''}>
                ${UI.icon('bookOpen')} Lecture
              </button>
              <button class="segmented-item ${isPractical ? 'active' : ''}" id="tab-qr-practical" ${activeSession ? 'disabled' : ''}>
                ${UI.icon('timetable')} Practical
              </button>
            </div>

            <!-- Subject Select -->
            <select id="qr-subject-select" class="input" style="height:34px; font-weight:600; min-width:210px;" ${activeSession ? 'disabled' : ''}>
              ${subjects.map(s => `
                <option value="${s.id}" ${s.id === selectedSubjectId ? 'selected' : ''}>
                  ${Utils.escapeHTML(s.name)} ${s.code ? `(${s.code})` : ''}
                </option>
              `).join('')}
            </select>

            <!-- Date & Time -->
            <input type="date" id="qr-date-input" class="input" value="${selectedDate}" style="height:34px; width:135px; font-family:var(--font-data);" ${activeSession ? 'disabled' : ''}>
            <input type="time" id="qr-time-input" class="input" value="${selectedStartTime}" style="height:34px; width:100px; font-family:var(--font-data);" ${activeSession ? 'disabled' : ''}>

            ${isPractical ? `
              <input type="text" id="qr-exp-title" class="input" placeholder="Experiment Title (e.g. Lab 4: B-Trees)..." value="${Utils.escapeHTML(experimentTitle)}" style="height:34px; min-width:200px;" ${activeSession ? 'disabled' : ''}>
            ` : ''}
          </div>

          <!-- Right: Rotation and Duration Config -->
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--ink-secondary);">
              <label for="qr-duration-select" style="font-weight:600;">Duration:</label>
              <select id="qr-duration-select" class="input" style="height:32px; font-size:12px; padding:0 8px;" ${activeSession ? 'disabled' : ''}>
                <option value="5" ${durationMinutes === 5 ? 'selected' : ''}>5 Mins</option>
                <option value="10" ${durationMinutes === 10 ? 'selected' : ''}>10 Mins</option>
                <option value="15" ${durationMinutes === 15 ? 'selected' : ''}>15 Mins</option>
                <option value="20" ${durationMinutes === 20 ? 'selected' : ''}>20 Mins</option>
                <option value="30" ${durationMinutes === 30 ? 'selected' : ''}>30 Mins</option>
              </select>
            </div>

            <div style="display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--ink-secondary);">
              <label for="qr-interval-select" style="font-weight:600;">Rotate Every:</label>
              <select id="qr-interval-select" class="input" style="height:32px; font-size:12px; padding:0 8px;" ${activeSession ? 'disabled' : ''}>
                <option value="15" ${rotationIntervalSec === 15 ? 'selected' : ''}>15s</option>
                <option value="20" ${rotationIntervalSec === 20 ? 'selected' : ''}>20s (Default)</option>
                <option value="30" ${rotationIntervalSec === 30 ? 'selected' : ''}>30s</option>
                <option value="45" ${rotationIntervalSec === 45 ? 'selected' : ''}>45s</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Main Workspace Area -->
      ${activeSession && activeSession.status === 'active' ? renderActiveSessionWorkspace(currentSubject) : renderInactiveSetupPlaceholder(currentSubject)}
    `;

    bindEvents(container);

    if (activeSession && activeSession.status === 'active') {
      updateQRDisplay();
      updateCountdownElements();
    }
  }

  function renderActiveSessionWorkspace(subject) {
    const counts = getCounts();

    return `
      <div class="qr-workspace-grid" style="display:grid; grid-template-columns: 360px 1fr; gap: 20px; align-items:start;">

        <!-- LEFT: Live Rotating QR Showcase -->
        <div class="card" style="padding:22px; background:var(--surface); border:1px solid var(--border); display:flex; flex-direction:column; align-items:center; text-align:center;">
          <!-- Course & Time Banner -->
          <div style="font-size:15px; font-weight:700; color:var(--ink); line-height:1.2; margin-bottom:2px;">
            ${Utils.escapeHTML(subject ? subject.name : 'Course')}
          </div>
          <div style="font-size:12px; color:var(--ink-secondary); margin-bottom:14px;">
            SY BSc IT · Session Remaining: <strong id="qr-session-timer-display" style="color:var(--accent); font-family:var(--font-data);">--:--</strong>
          </div>

          <!-- High-Contrast Vector QR Code Container -->
          <div id="qr-code-graphic" style="width:240px; height:240px; padding:12px; background:#FFFFFF; border:2px solid var(--border-strong); border-radius:var(--r-md); box-shadow:var(--shadow-sm); margin-bottom:12px; display:flex; align-items:center; justify-content:center;">
            <!-- Generated SVG injected here -->
          </div>

          <!-- Rotation Timer & Progress Bar -->
          <div style="width:100%; max-width:260px; margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:600; color:var(--ink-secondary); margin-bottom:5px;">
              <span>Next QR Rotation:</span>
              <span id="qr-rotation-seconds" style="color:var(--safe); font-family:var(--font-data); font-weight:700;">20s</span>
            </div>
            <div style="width:100%; height:6px; background:var(--surface-subtle); border-radius:9999px; overflow:hidden; border:1px solid var(--border);">
              <div id="qr-rotation-progress-bar" style="width:100%; height:100%; background:linear-gradient(90deg, var(--accent) 0%, #2CD5A4 100%); transition:width 0.25s linear;"></div>
            </div>
          </div>

          <!-- Live Token Fingerprint -->
          <div id="qr-token-hash" style="font-size:10.5px; font-family:var(--font-mono); color:var(--ink-tertiary); background:var(--surface-subtle); padding:4px 8px; border-radius:var(--r-xs); border:1px solid var(--border); margin-bottom:16px;">
            Token: generating...
          </div>

          <!-- Manual Controls -->
          <div style="display:flex; gap:8px; width:100%;">
            <button class="btn btn-outline btn-sm" id="btn-manual-rotate" style="flex:1;">
              ${UI.icon('refresh')} Rotate Now
            </button>
            <button class="btn btn-outline btn-sm" id="btn-extend-time" style="flex:1;">
              +5 Mins
            </button>
          </div>
        </div>

        <!-- RIGHT: Real-Time Roster & Headcount Activity -->
        <div style="display:flex; flex-direction:column; gap:16px;">
          <!-- 4 Summary Counter Cards -->
          <div class="qr-summary-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px;">
            <div class="card" style="padding:12px 14px; background:var(--surface); border:1px solid var(--border);">
              <div style="font-size:11px; font-weight:700; color:var(--ink-secondary); text-transform:uppercase;">Enrolled</div>
              <div style="font-size:24px; font-weight:700; color:var(--ink); font-family:var(--font-data);" class="data-num">${counts.total}</div>
            </div>
            <div class="card" style="padding:12px 14px; background:var(--surface); border:1px solid var(--border);">
              <div style="font-size:11px; font-weight:700; color:var(--safe); text-transform:uppercase;">Checked In</div>
              <div style="font-size:24px; font-weight:700; color:var(--safe); font-family:var(--font-data);" id="count-checkedin" class="data-num">${counts.checkedIn}</div>
            </div>
            <div class="card" style="padding:12px 14px; background:var(--surface); border:1px solid var(--border);">
              <div style="font-size:11px; font-weight:700; color:var(--critical); text-transform:uppercase;">Pending</div>
              <div style="font-size:24px; font-weight:700; color:var(--critical); font-family:var(--font-data);" id="count-pending" class="data-num">${counts.pending}</div>
            </div>
            <div class="card" style="padding:12px 14px; background:var(--surface); border:1px solid var(--border);">
              <div style="font-size:11px; font-weight:700; color:var(--accent); text-transform:uppercase;">Turnout %</div>
              <div style="font-size:24px; font-weight:700; color:var(--accent); font-family:var(--font-data);" id="count-pct" class="data-num">${Math.round((counts.checkedIn / counts.total) * 100)}%</div>
            </div>
          </div>

          <!-- Student Roster Activity Table -->
          <div class="card" style="padding:16px; background:var(--surface); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 style="font-size:15px; font-weight:700; color:var(--ink);">Live Check-In Activity (60 Students)</h3>
              <div style="font-size:12px; color:var(--ink-tertiary);">Click any status to manually correct</div>
            </div>

            <div id="qr-roster-scroll-container" style="max-height:360px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--r-md);">
              ${renderStudentRosterRows()}
            </div>
          </div>

          <!-- Security Audit Event Stream Accordion -->
          <div class="card" style="padding:14px 16px; background:var(--surface); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:var(--ink-secondary); letter-spacing:0.04em;">
                Security Audit Log Stream
              </div>
              <span class="badge badge-neutral" style="font-size:10.5px;">Live Feed</span>
            </div>
            <div id="qr-audit-feed" style="max-height:120px; overflow-y:auto; font-family:var(--font-mono); font-size:11px; display:flex; flex-direction:column; gap:4px; color:var(--ink-secondary);">
              ${auditLogs.slice(-8).reverse().map(l => `
                <div style="display:flex; gap:8px;">
                  <span style="color:var(--ink-tertiary);">${l.timestamp ? new Date(l.timestamp).toLocaleTimeString() : ''}</span>
                  <strong style="color:${l.event.includes('BLOCKED') || l.event.includes('REJECTED') ? 'var(--critical)' : l.event.includes('SUCCESS') ? 'var(--safe)' : 'var(--accent)'};">${l.event}</strong>
                  <span>${Utils.escapeHTML(l.details || '')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderStudentRosterRows() {
    const students = State.getAllStudents();
    return `
      <table class="data-table" style="width:100%; border-collapse:collapse; font-size:12.5px;">
        <thead>
          <tr style="background:var(--surface-subtle); position:sticky; top:0; z-index:2;">
            <th style="padding:8px 12px; text-align:left;">ROLL</th>
            <th style="padding:8px 12px; text-align:left;">STUDENT</th>
            <th style="padding:8px 12px; text-align:left;">VERIFIED STATUS</th>
            <th style="padding:8px 12px; text-align:left;">TIME</th>
            <th style="padding:8px 12px; text-align:right;">MANUAL OVERRIDE</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(s => {
            const checkin = studentCheckinMap.get(s.id) || { status: 'pending' };
            const isPresent = checkin.status === 'present';
            const isLate = checkin.status === 'late';
            const isPending = checkin.status === 'pending';

            return `
              <tr style="border-bottom:1px solid var(--border-subtle); background:${isPresent ? 'rgba(23,133,104,0.04)' : 'transparent'};">
                <td style="padding:6px 12px;">
                  <span class="roll-cell" style="font-size:11px; padding:1px 6px;">${s.rollNumber}</span>
                </td>
                <td style="padding:6px 12px; font-weight:600; color:var(--ink);">
                  ${Utils.escapeHTML(s.name)}
                </td>
                <td style="padding:6px 12px;">
                  <span class="badge ${isPresent ? 'badge-safe' : isLate ? 'badge-warn' : 'badge-neutral'}" style="font-size:10px; padding:2px 7px;">
                    ${isPresent ? '✓ PRESENT' : isLate ? '◷ LATE' : 'PENDING'}
                  </span>
                </td>
                <td style="padding:6px 12px; color:var(--ink-tertiary); font-family:var(--font-data); font-size:11px;">
                  ${checkin.timestamp ? new Date(checkin.timestamp).toLocaleTimeString() : '—'}
                </td>
                <td style="padding:6px 12px; text-align:right;">
                  <button class="btn btn-outline btn-sm btn-override-status" data-student-id="${s.id}" style="height:22px; padding:0 8px; font-size:10.5px;">
                    Toggle
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function renderInactiveSetupPlaceholder(subject) {
    return `
      <div class="card" style="padding:48px 32px; text-align:center; background:var(--surface); border:1px solid var(--border);">
        <div style="width:64px; height:64px; border-radius:50%; background:var(--soft-accent); color:var(--accent); display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
          ${UI.icon('qrcode')}
        </div>
        <h2 style="font-size:22px; font-weight:700; color:var(--ink); margin-bottom:6px;">Ready to Launch QR Attendance</h2>
        <p style="font-size:14px; color:var(--ink-secondary); max-width:540px; margin:0 auto 24px auto; line-height:1.5;">
          Click <strong>Start QR Session</strong> above. Attendify will generate a cryptographically rotating QR code projected in class. Students scan the code to instantly verify physical presence and submit attendance in real time.
        </p>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; max-width:640px; margin:0 auto; text-align:left;">
          <div style="background:var(--surface-subtle); padding:14px; border-radius:var(--r-md); border:1px solid var(--border);">
            <strong style="font-size:12px; color:var(--ink); display:block; margin-bottom:4px;">1. Rotating Tokens</strong>
            <span style="font-size:11.5px; color:var(--ink-secondary);">Rotates every ${rotationIntervalSec}s preventing photograph-sharing and remote check-ins.</span>
          </div>
          <div style="background:var(--surface-subtle); padding:14px; border-radius:var(--r-md); border:1px solid var(--border);">
            <strong style="font-size:12px; color:var(--ink); display:block; margin-bottom:4px;">2. Server Validation</strong>
            <span style="font-size:11.5px; color:var(--ink-secondary);">Every submission is validated server-side for expiry and duplicate prevention.</span>
          </div>
          <div style="background:var(--surface-subtle); padding:14px; border-radius:var(--r-md); border:1px solid var(--border);">
            <strong style="font-size:12px; color:var(--ink); display:block; margin-bottom:4px;">3. Direct Integration</strong>
            <span style="font-size:11.5px; color:var(--ink-secondary);">Finalized attendance commits straight into Attendance History &amp; Analytics.</span>
          </div>
        </div>
      </div>
    `;
  }

  function updateActivityRoster() {
    const counts = getCounts();
    const chkEl = document.getElementById('count-checkedin');
    const pndEl = document.getElementById('count-pending');
    const pctEl = document.getElementById('count-pct');

    if (chkEl) chkEl.textContent = counts.checkedIn;
    if (pndEl) pndEl.textContent = counts.pending;
    if (pctEl) pctEl.textContent = Math.round((counts.checkedIn / counts.total) * 100) + '%';

    const scrollContainer = document.getElementById('qr-roster-scroll-container');
    if (scrollContainer) {
      const scrollPos = scrollContainer.scrollTop;
      scrollContainer.innerHTML = renderStudentRosterRows();
      scrollContainer.scrollTop = scrollPos;
    }
  }

  function bindEvents(container) {
    // Session Category Switcher
    const tabLecture = container.querySelector('#tab-qr-lecture');
    const tabPractical = container.querySelector('#tab-qr-practical');
    if (tabLecture) {
      tabLecture.addEventListener('click', () => {
        selectedSessionType = 'lecture';
        render();
      });
    }
    if (tabPractical) {
      tabPractical.addEventListener('click', () => {
        selectedSessionType = 'practical';
        render();
      });
    }

    // Config input listeners
    const subSel = container.querySelector('#qr-subject-select');
    if (subSel) subSel.addEventListener('change', e => { selectedSubjectId = e.target.value; });
    const dateInp = container.querySelector('#qr-date-input');
    if (dateInp) dateInp.addEventListener('change', e => { selectedDate = e.target.value; });
    const timeInp = container.querySelector('#qr-time-input');
    if (timeInp) timeInp.addEventListener('change', e => { selectedStartTime = e.target.value; });
    const expInp = container.querySelector('#qr-exp-title');
    if (expInp) expInp.addEventListener('input', e => { experimentTitle = e.target.value; });
    const durSel = container.querySelector('#qr-duration-select');
    if (durSel) durSel.addEventListener('change', e => { durationMinutes = parseInt(e.target.value, 10); });
    const intSel = container.querySelector('#qr-interval-select');
    if (intSel) intSel.addEventListener('change', e => { rotationIntervalSec = parseInt(e.target.value, 10); });

    // Start Session Button
    const startBtn = container.querySelector('#btn-start-qr-session');
    if (startBtn) startBtn.addEventListener('click', startQRSession);

    // End Session Button
    const endBtn = container.querySelector('#btn-end-qr-session');
    if (endBtn) endBtn.addEventListener('click', promptEndSession);

    // Manual Rotate
    const rotBtn = container.querySelector('#btn-manual-rotate');
    if (rotBtn) rotBtn.addEventListener('click', rotateTokenNow);

    // Extend 5 Mins
    const extBtn = container.querySelector('#btn-extend-time');
    if (extBtn) {
      extBtn.addEventListener('click', () => {
        if (!activeSession) return;
        activeSession.expiresAt += 5 * 60 * 1000;
        UI.toast('Session extended by 5 minutes', 'info', 1200);
      });
    }

    // Copy Link Button
    const copyBtn = container.querySelector('#btn-copy-checkin-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!activeSession) return;
        const checkinUrl = `${window.location.origin}/checkin.html?s=${encodeURIComponent(activeSession.id)}&t=${encodeURIComponent(activeSession.token)}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(checkinUrl);
          UI.toast('Copied student check-in link to clipboard', 'success', 1500);
        } else {
          prompt('Copy this student check-in link:', checkinUrl);
        }
      });
    }

    // Test Scan / Simulated Student Scan Dialog
    const simBtn = container.querySelector('#btn-simulate-scan');
    if (simBtn) {
      simBtn.addEventListener('click', openSimulateScanModal);
    }

    // Delegate override clicks
    container.addEventListener('click', e => {
      const btn = e.target.closest('.btn-override-status');
      if (!btn) return;
      const stuId = btn.dataset.studentId;
      toggleStudentStatus(stuId);
    });
  }

  function toggleStudentStatus(studentId) {
    const record = studentCheckinMap.get(studentId);
    if (!record) return;

    let nextStatus = 'present';
    if (record.status === 'present') nextStatus = 'late';
    else if (record.status === 'late') nextStatus = 'absent';
    else if (record.status === 'absent') nextStatus = 'present';
    else if (record.status === 'pending') nextStatus = 'present';

    record.status = nextStatus;
    record.timestamp = nextStatus !== 'absent' && nextStatus !== 'pending' ? new Date().toISOString() : null;

    if (serverAvailable && activeSession && !activeSession.id.startsWith('qr_local_')) {
      fetch('/api/qr/session/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          studentId,
          status: nextStatus
        })
      }).catch(() => {});
    }

    updateActivityRoster();
    UI.toast(`Updated ${record.name} to ${nextStatus.toUpperCase()}`, 'info', 1000);
  }

  function openSimulateScanModal() {
    if (!activeSession) return;
    const enrolled = State.getAllStudents();

    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
        <p style="font-size:13px; color:var(--ink-secondary);">
          Simulate a physical phone QR scan for testing. Choose any student from the cohort:
        </p>
        <div style="max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; padding-right:4px;">
          ${enrolled.map(s => {
            const cur = studentCheckinMap.get(s.id);
            const isDone = cur && (cur.status === 'present' || cur.status === 'late');
            return `
              <button class="btn btn-outline btn-simulate-item" data-student-id="${s.id}" data-roll="${s.rollNumber}" data-name="${Utils.escapeHTML(s.name)}"
                style="justify-content:space-between; padding:8px 12px; height:auto; text-align:left; border-color:var(--border);">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="roll-cell" style="font-size:11px;">#${s.rollNumber}</span>
                  <span style="font-weight:600; color:var(--ink);">${Utils.escapeHTML(s.name)}</span>
                </div>
                <span class="badge ${isDone ? 'badge-safe' : 'badge-neutral'}" style="font-size:10px;">
                  ${isDone ? 'CHECKED IN' : 'TAP TO SCAN'}
                </span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    UI.openModal({
      title: 'Simulate Student QR Check-In',
      desc: 'Test real-time token validation and headcount reaction',
      bodyHTML,
      footerHTML: '<button class="btn btn-primary" id="btn-close-sim">Done</button>',
      onOpen: (overlay, close) => {
        overlay.querySelector('#btn-close-sim').addEventListener('click', close);
        overlay.querySelectorAll('.btn-simulate-item').forEach(itemBtn => {
          itemBtn.addEventListener('click', async () => {
            const sid = itemBtn.dataset.studentId;
            const roll = parseInt(itemBtn.dataset.roll, 10);
            const name = itemBtn.dataset.name;

            if (serverAvailable && !activeSession.id.startsWith('qr_local_')) {
              try {
                const res = await fetch('/api/qr/session/checkin', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: activeSession.id,
                    token: activeSession.token,
                    studentId: sid,
                    rollNumber: roll,
                    studentName: name
                  })
                });
                const data = await res.json();
                if (data.success) {
                  const rec = studentCheckinMap.get(sid);
                  if (rec) { rec.status = 'present'; rec.timestamp = data.checkedInAt; }
                  UI.toast(`Verified Roll #${roll} (${name}) via server`, 'success', 1500);
                } else {
                  UI.toast(`Check-in rejected: ${data.message || data.error}`, 'error', 2500);
                }
              } catch {
                toggleStudentStatus(sid);
              }
            } else {
              const rec = studentCheckinMap.get(sid);
              if (rec) { rec.status = 'present'; rec.timestamp = new Date().toISOString(); }
              UI.toast(`Marked Roll #${roll} (${name}) Present (Local)`, 'success', 1500);
            }
            updateActivityRoster();
            close();
          });
        });
      }
    });
  }

  function promptEndSession() {
    if (!activeSession) return;
    const counts = getCounts();

    const bodyHTML = `
      <div style="display:flex; flex-direction:column; gap:16px; padding:4px 0;">
        <p style="font-size:13.5px; color:var(--ink-secondary); line-height:1.5;">
          You are about to close this QR Attendance session. All active QR tokens will be invalidated immediately.
        </p>

        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; text-align:center;">
          <div style="background:var(--safe-subtle); border:1px solid var(--safe-border); border-radius:var(--r-md); padding:10px;">
            <div style="font-size:22px; font-weight:700; color:var(--safe);" class="data-num">${counts.checkedIn}</div>
            <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; color:var(--safe);">Verified Present</div>
          </div>
          <div style="background:var(--critical-subtle); border:1px solid var(--critical-border); border-radius:var(--r-md); padding:10px;">
            <div style="font-size:22px; font-weight:700; color:var(--critical);" class="data-num">${counts.pending}</div>
            <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; color:var(--critical);">Not Checked In</div>
          </div>
          <div style="background:var(--warn-subtle); border:1px solid var(--warn-border); border-radius:var(--r-md); padding:10px;">
            <div style="font-size:22px; font-weight:700; color:var(--warn-ink);" class="data-num">${counts.late}</div>
            <div style="font-size:10.5px; font-weight:700; text-transform:uppercase; color:var(--warn-ink);">Marked Late</div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; background:var(--surface-subtle); padding:10px 12px; border-radius:var(--r-md); border:1px solid var(--border);">
          <input type="checkbox" id="modal-chk-mark-absent" checked style="width:16px; height:16px; cursor:pointer;">
          <label for="modal-chk-mark-absent" style="font-size:12.5px; font-weight:600; cursor:pointer; color:var(--ink);">
            Mark all ${counts.pending} unchecked students as Absent
          </label>
        </div>
      </div>
    `;

    UI.openModal({
      title: 'Finalize Attendance Session',
      desc: 'Review verified student attendance before committing to history',
      bodyHTML,
      footerHTML: `
        <div style="display:flex; justify-content:space-between; width:100%;">
          <button class="btn btn-outline" id="btn-cancel-finalize">Continue Session</button>
          <button class="btn btn-primary" id="btn-commit-finalize">Commit to Ledger</button>
        </div>
      `,
      onOpen: (overlay, close) => {
        overlay.querySelector('#btn-cancel-finalize').addEventListener('click', close);
        overlay.querySelector('#btn-commit-finalize').addEventListener('click', () => {
          const markUncheckedAbsent = overlay.querySelector('#modal-chk-mark-absent').checked;
          close();
          finalizeAndCommitSession(markUncheckedAbsent);
        });
      }
    });
  }

  async function finalizeAndCommitSession(markUncheckedAbsent) {
    if (!activeSession) return;

    // 1. Invalidate tokens on server
    if (serverAvailable && !activeSession.id.startsWith('qr_local_')) {
      try {
        await fetch('/api/qr/session/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSession.id })
        });
      } catch {}
    }

    // 2. Prepare status map for State.saveRecords
    const statusMap = {};
    studentCheckinMap.forEach((rec, studentId) => {
      if (rec.status === 'present') {
        statusMap[studentId] = 'present';
      } else if (rec.status === 'late') {
        statusMap[studentId] = 'late';
      } else {
        statusMap[studentId] = markUncheckedAbsent ? 'absent' : 'unmarked';
      }
    });

    // 3. Create persistent Session in Attendify state engine
    const sessionRecord = State.createSession({
      subjectId: selectedSubjectId,
      date: selectedDate,
      startTime: selectedStartTime,
      type: selectedSessionType,
      experimentTitle
    });

    // 4. Save confirmed student records into state
    State.saveRecords(sessionRecord.id, statusMap);

    const counts = getCounts();
    cleanup();
    activeSession = null;

    UI.toast(`QR Attendance finalized: ${counts.checkedIn} Present, ${markUncheckedAbsent ? counts.pending : 0} Absent`, 'success', 3000);
    App.navigateTo('history');
  }

  return {
    render,
    cleanup,
    checkServerHealth,
    getActiveSession: () => activeSession
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = QRAttendanceView;
