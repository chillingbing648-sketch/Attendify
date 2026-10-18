/* ============================================================
   ATTENDIFY — rapid-roll.js
   Rapid Roll Call Studio (Speed Roll & Interactive Visual Grid)
   High-efficiency, real-world faculty attendance flow:
   • Mode 1: Speed Roll (Flashcard Focus with 1-Key Auto Advance)
   • Mode 2: Interactive Seating / Visual Grid (60 Tiles 1-Click Toggle)
   • Mode 3: Rapid Absentee Call-Out (Type Roll Numbers: e.g. 4, 12, 35)
   • Web Audio API Sensory Feedback (Zero Dependencies, Subtle Chime)
   • Real-Time Reconciled Session HUD & Progress Metrics
   • Draft Auto-Persistence & Direct State Synchronization
   ============================================================ */

const RapidRollView = (() => {
  let activeMode = 'card'; // 'card' | 'grid' | 'callout'
  let currentIndex = 0; // 0 to 59
  let selectedSubjectId = '';
  let selectedDate = Utils.todayISO();
  let selectedStartTime = '09:00';
  let selectedSessionType = 'lecture'; // 'lecture' | 'practical'
  let experimentTitle = '';
  let studentStatusMap = {}; // { studentId: 'present' | 'absent' | 'late' | 'unmarked' }
  let soundEnabled = true;
  let keyboardBound = false;
  let audioCtx = null;
  const DRAFT_KEY = 'attendify:rapid_roll_draft:v1';

  // Lazy-initialize Web Audio Context for sensory audio feedback
  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSound(type) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'present') {
        // Cheerful soft ascending chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.08); // G5
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'absent') {
        // Subtle muted low tone
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(196, now + 0.1);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'late') {
        // Warm alert chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392, now); // G4
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08); // A4
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'complete') {
        // Completion fanfare
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          o.connect(g);
          g.connect(ctx.destination);
          g.gain.setValueAtTime(0.05, now + idx * 0.06);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.18);
          o.start(now + idx * 0.06);
          o.stop(now + idx * 0.06 + 0.18);
        });
      }
    } catch (e) {
      // Audio not supported or blocked, fail silently
    }
  }

  function initSession(forceReset = false) {
    const students = State.getAllStudents();
    const subjects = State.get().subjects;
    
    // Check for saved sound preference
    try {
      const soundPref = localStorage.getItem('attendify:sound_fx');
      if (soundPref !== null) soundEnabled = soundPref === 'true';
    } catch {}

    // Check for existing draft if not forced reset
    if (!forceReset) {
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (draft && draft.studentStatusMap && Object.keys(draft.studentStatusMap).length > 0) {
            selectedSubjectId = draft.selectedSubjectId || (subjects.length > 0 ? subjects[0].id : '');
            selectedDate = draft.selectedDate || Utils.todayISO();
            selectedStartTime = draft.selectedStartTime || '09:00';
            selectedSessionType = draft.selectedSessionType || 'lecture';
            experimentTitle = draft.experimentTitle || '';
            studentStatusMap = draft.studentStatusMap;
            currentIndex = draft.currentIndex || 0;
            return;
          }
        }
      } catch (e) {}
    }

    selectedSubjectId = subjects.length > 0 ? subjects[0].id : '';
    selectedDate = Utils.todayISO();
    selectedStartTime = '09:00';
    selectedSessionType = 'lecture';
    experimentTitle = '';
    studentStatusMap = {};
    currentIndex = 0;

    // Default all enrolled students to Present for high speed
    students.forEach(s => {
      studentStatusMap[s.id] = 'present';
    });
    saveDraft();
  }

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        selectedSubjectId,
        selectedDate,
        selectedStartTime,
        selectedSessionType,
        experimentTitle,
        studentStatusMap,
        currentIndex,
        savedAt: Date.now()
      }));
    } catch {}
  }

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }

  function calculateCounts() {
    const students = State.getAllStudents();
    let present = 0, absent = 0, late = 0, unmarked = 0;
    students.forEach(s => {
      const status = studentStatusMap[s.id] || 'unmarked';
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else unmarked++;
    });
    const marked = present + absent + late;
    const pct = marked > 0 ? Math.round((present / marked) * 1000) / 10 : 0;
    return { present, absent, late, unmarked, marked, total: students.length, pct };
  }

  function markStudent(studentId, status, autoAdvance = true) {
    studentStatusMap[studentId] = status;
    playSound(status);
    saveDraft();

    if (autoAdvance && activeMode === 'card') {
      const students = State.getAllStudents();
      if (currentIndex < students.length - 1) {
        currentIndex++;
      } else {
        // Reached end of batch
        playSound('complete');
        UI.toast('Reached end of student roster! Review counts and click Save.', 'success', 2500);
      }
    }

    render();
  }

  function render(containerId = 'view-rapid-roll') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const students = State.getAllStudents();
    const subjects = State.get().subjects;

    if (Object.keys(studentStatusMap).length === 0) {
      initSession(false);
    }

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="view-header">
          <div>
            <h1>Rapid Roll Call</h1>
            <p class="view-subtitle">High-efficiency attendance entry for 60 students</p>
          </div>
        </div>
        <div class="card empty-state">
          <div class="empty-state-icon">${UI.icon('subjects')}</div>
          <h3>No Curriculum Courses Configured</h3>
          <p>Please configure curriculum subjects before taking attendance.</p>
          <button class="btn btn-primary" onclick="App.navigateTo('subjects')">Configure Subjects</button>
        </div>
      `;
      return;
    }

    const counts = calculateCounts();
    const currentStudent = students[currentIndex] || students[0];
    const studentStats = currentStudent ? Attendance.statsForStudent(currentStudent.id) : null;
    const progressPct = Math.round(((currentIndex + 1) / students.length) * 100);

    container.innerHTML = `
      <!-- 1. Header with Mode Switcher & Actions -->
      <div class="view-header" style="margin-bottom: 16px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <h1>Rapid Roll Call</h1>
            <span class="badge badge-safe" style="font-size:11px; padding:2px 8px;">FAST ROLL</span>
          </div>
          <p class="view-subtitle">SY BSc IT · Single Batch · ${students.length} Students Enrolled</p>
        </div>

        <div class="view-header-actions">
          <!-- Audio Feedback Toggle -->
          <button class="btn btn-outline btn-sm" id="btn-toggle-sound" title="${soundEnabled ? 'Disable sensory sound chimes' : 'Enable sensory sound chimes'}">
            ${UI.icon(soundEnabled ? 'volume' : 'volumeX')}
            <span>Sound: ${soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <!-- Mode Segmented Switcher -->
          <div class="segmented-control" id="rapid-mode-switcher">
            <button class="segmented-item ${activeMode === 'card' ? 'active' : ''}" data-mode="card" title="Speed Roll: 1 Student at a time with instant hotkeys">
              ${UI.icon('card')} Speed Card
            </button>
            <button class="segmented-item ${activeMode === 'grid' ? 'active' : ''}" data-mode="grid" title="Visual Seating Grid: 60 interactive tiles">
              ${UI.icon('grid')} Visual Grid
            </button>
            <button class="segmented-item ${activeMode === 'callout' ? 'active' : ''}" data-mode="callout" title="Quick Absentee Call-Out: Type absentee roll numbers directly">
              ${UI.icon('sparkles')} Absentee Call-Out
            </button>
          </div>

          <button class="btn btn-outline btn-sm" id="btn-rapid-shortcuts" title="View keyboard shortcuts">
            ${UI.icon('keyboard')} Shortcuts
          </button>
        </div>
      </div>

      <!-- 2. Session Configuration Bar -->
      <div class="register-bar" style="margin-bottom: 16px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg); padding:14px 18px; box-shadow:var(--shadow-xs);">
        <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:14px;">
          <!-- Left: Controls -->
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
            <!-- Category Switcher -->
            <div class="segmented-control">
              <button class="segmented-item ${selectedSessionType === 'lecture' ? 'active' : ''}" id="tab-rapid-lecture">
                ${UI.icon('bookOpen')} Lecture
              </button>
              <button class="segmented-item ${selectedSessionType === 'practical' ? 'active' : ''}" id="tab-rapid-practical">
                ${UI.icon('timetable')} Practical
              </button>
            </div>

            <!-- Subject Dropdown -->
            <div style="display:flex; align-items:center; gap:6px;">
              <select id="rapid-subject-select" class="input" style="height:34px; font-weight:600; min-width:200px;">
                ${subjects.map(sub => `
                  <option value="${sub.id}" ${sub.id === selectedSubjectId ? 'selected' : ''}>
                    ${Utils.escapeHTML(sub.name)} ${sub.code ? `(${sub.code})` : ''}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Date & Time -->
            <input type="date" id="rapid-date-input" class="input" value="${selectedDate}" style="height:34px; width:135px; font-family:var(--font-data);">
            <input type="time" id="rapid-time-input" class="input" value="${selectedStartTime}" style="height:34px; width:100px; font-family:var(--font-data);">

            ${selectedSessionType === 'practical' ? `
              <input type="text" id="rapid-exp-title" class="input" placeholder="Experiment Title (e.g. Lab 4: B-Tree Indexing)..." value="${Utils.escapeHTML(experimentTitle)}" style="height:34px; min-width:220px;">
            ` : ''}
          </div>

          <!-- Right: Bulk Utility Actions -->
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-outline btn-sm" id="btn-rapid-all-present" title="Mark all 60 students as Present">
              ${UI.icon('check')} All Present
            </button>
            <button class="btn btn-outline btn-sm" id="btn-rapid-copy-prev" title="Copy from the last recorded session of this course">
              Copy Previous
            </button>
            <button class="btn btn-outline btn-sm" id="btn-rapid-reset" title="Reset all marks to default">
              Reset
            </button>
          </div>
        </div>
      </div>

      <!-- 3. Live HUD & Headcount Status Bar -->
      <div class="card" style="margin-bottom: 20px; padding:12px 18px; background:var(--surface); border:1px solid var(--border);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <!-- Progress Tracker -->
          <div style="flex:1; min-width:240px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:6px;">
              <span style="font-weight:600; color:var(--ink);">Roster Progress: Student ${currentIndex + 1} of ${students.length}</span>
              <span style="font-family:var(--font-data); font-weight:700; color:var(--accent);">${progressPct}% Complete</span>
            </div>
            <div style="width:100%; height:7px; background:var(--surface-subtle); border-radius:9999px; overflow:hidden; border:1px solid var(--border);">
              <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, var(--accent) 0%, #2CD5A4 100%); border-radius:9999px; transition:width 0.22s var(--ease-spring);"></div>
            </div>
          </div>

          <!-- Real-Time Metrics Pills -->
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span class="badge badge-safe" style="font-size:12px; padding:4px 10px;">
              <strong>${counts.present}</strong> Present
            </span>
            <span class="badge badge-critical" style="font-size:12px; padding:4px 10px;">
              <strong>${counts.absent}</strong> Absent
            </span>
            <span class="badge badge-warn" style="font-size:12px; padding:4px 10px;">
              <strong>${counts.late}</strong> Late
            </span>
            ${counts.unmarked > 0 ? `
              <span class="badge badge-neutral" style="font-size:12px; padding:4px 10px; background:rgba(201, 75, 80, 0.12); color:var(--critical); border-color:var(--critical-border);">
                <strong>${counts.unmarked}</strong> Unmarked
              </span>
            ` : ''}
            <div style="margin-left:6px; padding-left:12px; border-left:1px solid var(--border); font-size:13px; font-weight:700; color:var(--ink); font-family:var(--font-data);">
              Turnout: <span style="color:${counts.pct >= 75 ? 'var(--safe)' : 'var(--critical)'};">${counts.pct}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Active Mode Body -->
      <div id="rapid-mode-container">
        ${activeMode === 'card' ? renderSpeedCardMode(currentStudent, studentStats, students) : ''}
        ${activeMode === 'grid' ? renderVisualGridMode(students) : ''}
        ${activeMode === 'callout' ? renderCalloutMode(students) : ''}
      </div>

      <!-- 5. Bottom Sticky Save Bar -->
      <div class="card" style="margin-top:24px; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; background:var(--surface); border:1px solid var(--border-strong); box-shadow:var(--shadow-md);">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:36px; height:36px; border-radius:50%; background:var(--safe-subtle); color:var(--safe); display:flex; align-items:center; justify-content:center; border:1px solid var(--safe-border);">
            ${UI.icon('checkCircle')}
          </div>
          <div>
            <div style="font-weight:700; font-size:14px; color:var(--ink);">Ready to Record Attendance Session</div>
            <div style="font-size:12px; color:var(--ink-secondary);">
              Reconciled: ${counts.present} Present · ${counts.absent} Absent · ${counts.late} Late (${counts.total} Students)
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <button class="btn btn-outline" id="btn-save-draft" title="Save draft to continue later">
            Save Draft
          </button>
          <button class="btn btn-primary btn-lg" id="btn-commit-rapid-session" style="min-width:180px; box-shadow:0 3px 12px rgba(81, 69, 138, 0.35);">
            ${UI.icon('check')} Save & Commit Session
          </button>
        </div>
      </div>
    `;

    bindEvents(container);
    initKeyboardShortcuts();
  }

  // --- MODE 1: SPEED ROLL (FLASHCARD FOCUS) ---
  function renderSpeedCardMode(student, stats, allStudents) {
    if (!student) return '<div class="card">No student selected.</div>';
    const status = studentStatusMap[student.id] || 'unmarked';
    const avatarStyle = Utils.getAvatarStyle(student.rollNumber);
    const initials = Utils.getInitials(student.name);

    return `
      <div style="display:grid; grid-template-columns: 1fr 320px; gap:20px; align-items:start;">
        <!-- Left: Massive Interactive Student Flashcard -->
        <div class="card" style="padding:28px 32px; background:var(--surface); border:1px solid var(--border); box-shadow:var(--shadow-sm); position:relative; overflow:hidden;">
          <!-- Top subtle badge -->
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="roll-cell" style="font-size:14px; font-weight:700; padding:3px 10px;">Roll No. ${student.rollNumber}</span>
              <span class="badge ${stats.status === 'safe' ? 'badge-safe' : 'badge-critical'}">
                ${stats.total > 0 ? `${stats.pct}% Attendance` : 'No Record'}
              </span>
            </div>
            <div style="font-size:12px; font-weight:600; color:var(--ink-tertiary); font-family:var(--font-data);">
              #${currentIndex + 1} of ${allStudents.length}
            </div>
          </div>

          <!-- Student Profile Focus -->
          <div style="display:flex; align-items:center; gap:20px; margin-bottom:24px;">
            <div class="student-avatar" style="${avatarStyle}; width:72px; height:72px; font-size:24px; font-weight:700; border-radius:var(--r-xl); box-shadow:var(--shadow-xs);">
              ${initials}
            </div>
            <div>
              <h2 style="font-size:24px; font-weight:700; color:var(--ink); line-height:1.2; letter-spacing:-0.02em;">
                ${Utils.escapeHTML(student.name)}
              </h2>
              <div style="font-size:13.5px; color:var(--ink-secondary); margin-top:4px; display:flex; align-items:center; gap:8px;">
                <span>SY BSc IT</span>
                <span>•</span>
                <span>Attended: <strong>${stats.attended}</strong> / ${stats.total} sessions</span>
                <span>•</span>
                <span style="color:${stats.status === 'safe' ? 'var(--safe)' : 'var(--critical)'}; font-weight:600;">
                  ${Utils.statusLabel(stats.status)}
                </span>
              </div>
            </div>
          </div>

          <!-- Current Mark Indicator -->
          <div style="margin-bottom:24px; padding:12px 16px; border-radius:var(--r-md); background:var(--surface-subtle); border:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
            <div style="font-size:13px; font-weight:600; color:var(--ink);">Current Session Mark:</div>
            <div>
              ${status === 'present' ? `<span class="badge badge-safe" style="font-size:13px; padding:4px 12px; font-weight:700;">✓ PRESENT</span>` : ''}
              ${status === 'absent' ? `<span class="badge badge-critical" style="font-size:13px; padding:4px 12px; font-weight:700;">✕ ABSENT</span>` : ''}
              ${status === 'late' ? `<span class="badge badge-warn" style="font-size:13px; padding:4px 12px; font-weight:700;">◷ LATE</span>` : ''}
              ${status === 'unmarked' ? `<span class="badge badge-neutral" style="font-size:13px; padding:4px 12px;">UNMARKED</span>` : ''}
            </div>
          </div>

          <!-- Big Action Buttons (Touch + Keyboard Friendly) -->
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:14px; margin-bottom:20px;">
            <button class="btn btn-primary" id="btn-mark-present-focus" style="height:52px; font-size:15px; font-weight:700; background:var(--safe); border-color:var(--safe); box-shadow:0 2px 8px rgba(23, 133, 104, 0.25);">
              ${UI.icon('check')}
              <span>Present [P / Space]</span>
            </button>
            <button class="btn btn-danger" id="btn-mark-absent-focus" style="height:52px; font-size:15px; font-weight:700; background:var(--critical); border-color:var(--critical); box-shadow:0 2px 8px rgba(201, 75, 80, 0.25);">
              ${UI.icon('x')}
              <span>Absent [A]</span>
            </button>
            <button class="btn btn-outline" id="btn-mark-late-focus" style="height:52px; font-size:15px; font-weight:700; border-color:var(--warn-border); color:var(--warn-ink); background:var(--warn-subtle);">
              ${UI.icon('clock')}
              <span>Late [L]</span>
            </button>
          </div>

          <!-- Navigation Arrow Footer -->
          <div style="display:flex; align-items:center; justify-content:space-between; padding-top:14px; border-top:1px solid var(--border);">
            <button class="btn btn-outline btn-sm" id="btn-prev-student" ${currentIndex === 0 ? 'disabled' : ''}>
              ${UI.icon('arrowLeft')} Previous Student [←]
            </button>
            <span style="font-size:12px; color:var(--ink-tertiary); font-style:italic;">
              Press hotkey to instantly mark & advance
            </span>
            <button class="btn btn-outline btn-sm" id="btn-next-student" ${currentIndex === allStudents.length - 1 ? 'disabled' : ''}>
              Next Student [→] ${UI.icon('arrowRight')}
            </button>
          </div>
        </div>

        <!-- Right: Mini Roster Jump List -->
        <div class="card" style="padding:16px; background:var(--surface); border:1px solid var(--border); max-height:480px; display:flex; flex-direction:column;">
          <div style="font-size:12px; font-weight:700; color:var(--ink-secondary); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <span>Class Roster Jump</span>
            <span style="font-size:11px; font-weight:500; color:var(--ink-tertiary);">Click any to view</span>
          </div>
          <div style="overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:4px; padding-right:4px;">
            ${allStudents.map((s, idx) => {
              const st = studentStatusMap[s.id] || 'unmarked';
              const isCur = idx === currentIndex;
              return `
                <div class="rapid-jump-row ${isCur ? 'active' : ''}" data-index="${idx}" style="display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-radius:var(--r-sm); cursor:pointer; background:${isCur ? 'var(--soft-accent)' : 'transparent'}; border:1px solid ${isCur ? 'var(--accent-border)' : 'transparent'};">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="roll-cell" style="min-width:24px; padding:1px 5px; font-size:11px;">${s.rollNumber}</span>
                    <span style="font-size:12.5px; font-weight:${isCur ? '700' : '500'}; color:var(--ink);">${Utils.escapeHTML(s.name)}</span>
                  </div>
                  <span class="badge ${st === 'present' ? 'badge-safe' : st === 'absent' ? 'badge-critical' : st === 'late' ? 'badge-warn' : 'badge-neutral'}" style="font-size:10px; padding:1px 6px;">
                    ${st.toUpperCase()}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // --- MODE 2: VISUAL SEATING / INTERACTIVE GRID ---
  function renderVisualGridMode(students) {
    return `
      <div class="card" style="padding:20px; background:var(--surface); border:1px solid var(--border);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
          <div>
            <h3 style="font-size:16px; font-weight:700; color:var(--ink);">Interactive Seating & Turnout Grid</h3>
            <p style="font-size:12px; color:var(--ink-secondary);">Click on any student tile to cycle status: <strong>Present → Absent → Late</strong></p>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="btn btn-outline btn-sm" id="btn-grid-invert" title="Invert marks">Invert P/A</button>
            <button class="btn btn-outline btn-sm" id="btn-grid-unmarked-present">Mark Unmarked Present</button>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap:10px;">
          ${students.map(s => {
            const st = studentStatusMap[s.id] || 'unmarked';
            const avatarStyle = Utils.getAvatarStyle(s.rollNumber);
            const initials = Utils.getInitials(s.name);
            const isAbsent = st === 'absent';
            const isLate = st === 'late';
            const isPresent = st === 'present';

            return `
              <div class="rapid-grid-tile ${st}" data-student-id="${s.id}" role="button" tabindex="0" title="Click to cycle status"
                style="padding:10px; border-radius:var(--r-md); border:1.5px solid ${isAbsent ? 'var(--critical-border)' : isLate ? 'var(--warn-border)' : isPresent ? 'var(--safe-border)' : 'var(--border)'}; background:${isAbsent ? 'var(--critical-subtle)' : isLate ? 'var(--warn-subtle)' : isPresent ? 'var(--safe-subtle)' : 'var(--surface)'}; cursor:pointer; user-select:none; transition:all 0.18s var(--ease-spring); display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span class="roll-cell" style="font-weight:700; font-size:11px;">#${s.rollNumber}</span>
                  <span class="badge ${isPresent ? 'badge-safe' : isAbsent ? 'badge-critical' : isLate ? 'badge-warn' : 'badge-neutral'}" style="font-size:10px; padding:1px 6px;">
                    ${st.toUpperCase()}
                  </span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="student-avatar" style="${avatarStyle}; width:28px; height:28px; font-size:10px;">
                    ${initials}
                  </div>
                  <div style="font-size:12px; font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${Utils.escapeHTML(s.name)}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // --- MODE 3: RAPID ABSENTEE CALL-OUT ---
  function renderCalloutMode(students) {
    const currentAbsentees = students.filter(s => studentStatusMap[s.id] === 'absent');
    const absenteeRolls = currentAbsentees.map(s => s.rollNumber).join(', ');

    return `
      <div class="card" style="padding:24px 28px; background:var(--surface); border:1px solid var(--border);">
        <div style="max-width:680px; margin:0 auto; text-align:center;">
          <div style="width:48px; height:48px; border-radius:50%; background:var(--soft-accent); color:var(--accent); display:inline-flex; align-items:center; justify-content:center; margin-bottom:12px;">
            ${UI.icon('sparkles')}
          </div>
          <h2 style="font-size:20px; font-weight:700; color:var(--ink); margin-bottom:6px;">Instant Absentee Call-Out</h2>
          <p style="font-size:13.5px; color:var(--ink-secondary); line-height:1.5; margin-bottom:20px;">
            In high-turnout classrooms, almost everyone is present. Simply type or call out the Roll Numbers of absent students below (separated by commas or spaces):
          </p>

          <div style="display:flex; gap:10px; margin-bottom:16px;">
            <input type="text" id="callout-roll-input" class="input" placeholder="e.g. 4, 12, 19, 45, 52" value="${absenteeRolls}" style="height:44px; font-size:16px; font-family:var(--font-data); font-weight:600; flex:1; text-align:center;">
            <button class="btn btn-primary btn-lg" id="btn-apply-callout">
              Apply Absentees
            </button>
          </div>

          <p style="font-size:12px; color:var(--ink-tertiary); margin-bottom:24px;">
            Tip: Pressing Apply will set these specific roll numbers to <strong>Absent</strong> and all other 50+ students to <strong>Present</strong> in one click.
          </p>

          <!-- Current Absentee Preview Tags -->
          <div style="text-align:left; background:var(--surface-subtle); padding:16px; border-radius:var(--r-md); border:1px solid var(--border);">
            <div style="font-size:12px; font-weight:700; color:var(--ink); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px;">
              Currently Identified Absentees (${currentAbsentees.length}):
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${currentAbsentees.length > 0 ? currentAbsentees.map(s => `
                <span class="badge badge-critical" style="font-size:12px; padding:3px 8px;">
                  Roll ${s.rollNumber} — ${Utils.escapeHTML(s.name)}
                </span>
              `).join('') : '<span style="font-size:12px; color:var(--ink-tertiary);">No absent students marked yet. Full class currently marked present!</span>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents(container) {
    // Mode Switcher
    const modeSwitcher = container.querySelector('#rapid-mode-switcher');
    if (modeSwitcher) {
      modeSwitcher.addEventListener('click', (e) => {
        const item = e.target.closest('.segmented-item[data-mode]');
        if (item) {
          activeMode = item.dataset.mode;
          render();
        }
      });
    }

    // Audio Toggle
    const soundBtn = container.querySelector('#btn-toggle-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        try { localStorage.setItem('attendify:sound_fx', String(soundEnabled)); } catch {}
        if (soundEnabled) playSound('present');
        render();
        UI.toast(`Sound chimes ${soundEnabled ? 'Enabled' : 'Disabled'}`, 'info', 1200);
      });
    }

    // Shortcuts Modal
    const scBtn = container.querySelector('#btn-rapid-shortcuts');
    if (scBtn) {
      scBtn.addEventListener('click', openShortcutsModal);
    }

    // Category Switcher
    const tabLecture = container.querySelector('#tab-rapid-lecture');
    const tabPractical = container.querySelector('#tab-rapid-practical');
    if (tabLecture) {
      tabLecture.addEventListener('click', () => {
        selectedSessionType = 'lecture';
        saveDraft();
        render();
      });
    }
    if (tabPractical) {
      tabPractical.addEventListener('click', () => {
        selectedSessionType = 'practical';
        saveDraft();
        render();
      });
    }

    // Subject, Date, Time, Experiment
    const subSel = container.querySelector('#rapid-subject-select');
    if (subSel) subSel.addEventListener('change', (e) => { selectedSubjectId = e.target.value; saveDraft(); });
    const dateInp = container.querySelector('#rapid-date-input');
    if (dateInp) dateInp.addEventListener('change', (e) => { selectedDate = e.target.value; saveDraft(); });
    const timeInp = container.querySelector('#rapid-time-input');
    if (timeInp) timeInp.addEventListener('change', (e) => { selectedStartTime = e.target.value; saveDraft(); });
    const expInp = container.querySelector('#rapid-exp-title');
    if (expInp) expInp.addEventListener('input', (e) => { experimentTitle = e.target.value; saveDraft(); });

    // Bulk actions
    const allP = container.querySelector('#btn-rapid-all-present');
    if (allP) {
      allP.addEventListener('click', () => {
        State.getAllStudents().forEach(s => { studentStatusMap[s.id] = 'present'; });
        playSound('present');
        saveDraft();
        render();
        UI.toast('All 60 students marked Present', 'info', 1500);
      });
    }

    const resetBtn = container.querySelector('#btn-rapid-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        initSession(true);
        render();
        UI.toast('Reset Rapid Roll to defaults', 'info', 1200);
      });
    }

    const copyPrev = container.querySelector('#btn-rapid-copy-prev');
    if (copyPrev) {
      copyPrev.addEventListener('click', handleCopyPrevious);
    }

    // Mode 1: Flashcard Event Binds
    if (activeMode === 'card') {
      const students = State.getAllStudents();
      const currentStudent = students[currentIndex];
      if (currentStudent) {
        const btnP = container.querySelector('#btn-mark-present-focus');
        if (btnP) btnP.addEventListener('click', () => markStudent(currentStudent.id, 'present', true));
        const btnA = container.querySelector('#btn-mark-absent-focus');
        if (btnA) btnA.addEventListener('click', () => markStudent(currentStudent.id, 'absent', true));
        const btnL = container.querySelector('#btn-mark-late-focus');
        if (btnL) btnL.addEventListener('click', () => markStudent(currentStudent.id, 'late', true));
      }

      const prevBtn = container.querySelector('#btn-prev-student');
      if (prevBtn) prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) { currentIndex--; saveDraft(); render(); }
      });
      const nextBtn = container.querySelector('#btn-next-student');
      if (nextBtn) nextBtn.addEventListener('click', () => {
        if (currentIndex < students.length - 1) { currentIndex++; saveDraft(); render(); }
      });

      // Jump list clicks
      container.querySelectorAll('.rapid-jump-row').forEach(row => {
        row.addEventListener('click', () => {
          currentIndex = parseInt(row.dataset.index, 10);
          saveDraft();
          render();
        });
      });
    }

    // Mode 2: Visual Grid Event Binds
    if (activeMode === 'grid') {
      container.querySelectorAll('.rapid-grid-tile').forEach(tile => {
        tile.addEventListener('click', () => {
          const stuId = tile.dataset.studentId;
          const current = studentStatusMap[stuId] || 'present';
          let next = 'present';
          if (current === 'present') next = 'absent';
          else if (current === 'absent') next = 'late';
          else if (current === 'late') next = 'present';
          markStudent(stuId, next, false);
        });
      });

      const invertBtn = container.querySelector('#btn-grid-invert');
      if (invertBtn) {
        invertBtn.addEventListener('click', () => {
          State.getAllStudents().forEach(s => {
            const cur = studentStatusMap[s.id];
            if (cur === 'present') studentStatusMap[s.id] = 'absent';
            else if (cur === 'absent') studentStatusMap[s.id] = 'present';
          });
          saveDraft();
          render();
          UI.toast('Inverted Present / Absent marks', 'info', 1500);
        });
      }

      const unmarkedP = container.querySelector('#btn-grid-unmarked-present');
      if (unmarkedP) {
        unmarkedP.addEventListener('click', () => {
          State.getAllStudents().forEach(s => {
            if (!studentStatusMap[s.id] || studentStatusMap[s.id] === 'unmarked') {
              studentStatusMap[s.id] = 'present';
            }
          });
          saveDraft();
          render();
          UI.toast('Marked unmarked as Present', 'info', 1500);
        });
      }
    }

    // Mode 3: Callout Apply
    if (activeMode === 'callout') {
      const applyBtn = container.querySelector('#btn-apply-callout');
      if (applyBtn) {
        applyBtn.addEventListener('click', handleApplyCallout);
      }
      const inp = container.querySelector('#callout-roll-input');
      if (inp) {
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleApplyCallout();
        });
      }
    }

    // Bottom Actions
    const saveDraftBtn = container.querySelector('#btn-save-draft');
    if (saveDraftBtn) {
      saveDraftBtn.addEventListener('click', () => {
        saveDraft();
        UI.toast('Draft safely saved to local storage', 'success', 1500);
      });
    }

    const commitBtn = container.querySelector('#btn-commit-rapid-session');
    if (commitBtn) {
      commitBtn.addEventListener('click', handleCommitSession);
    }
  }

  function handleApplyCallout() {
    const inp = document.getElementById('callout-roll-input');
    if (!inp) return;
    const raw = inp.value.trim();
    const students = State.getAllStudents();
    
    // Parse roll numbers from raw string (supports commas, spaces, dashes)
    const rollTokens = raw.split(/[\s,]+/).map(t => parseInt(t.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= 60);
    const absenteeRollSet = new Set(rollTokens);

    students.forEach(s => {
      if (absenteeRollSet.has(s.rollNumber)) {
        studentStatusMap[s.id] = 'absent';
      } else {
        studentStatusMap[s.id] = 'present';
      }
    });

    playSound(absenteeRollSet.size > 0 ? 'absent' : 'present');
    saveDraft();
    render();
    UI.toast(`Applied: ${absenteeRollSet.size} Absent, ${students.length - absenteeRollSet.size} Present`, 'success', 2500);
  }

  function handleCopyPrevious() {
    if (!selectedSubjectId) {
      UI.toast('Please select a course first', 'error');
      return;
    }

    const sessions = State.getSessionsForSubject(selectedSubjectId)
      .filter(s => s.type === selectedSessionType);

    if (sessions.length === 0) {
      UI.toast(`No previous ${selectedSessionType} session found for this course`, 'info', 2500);
      return;
    }

    const prevSession = sessions[0];
    const prevStats = Attendance.statsForSession(prevSession.id);
    const sub = State.getSubject(selectedSubjectId);

    UI.confirmDialog({
      title: 'Copy Previous Attendance?',
      message: `Copy attendance records from session on ${Utils.formatDate(prevSession.date)} (${prevSession.startTime}) for ${sub ? sub.name : 'this subject'} (${prevStats.present} Present, ${prevStats.absent} Absent)? You can modify any exceptions before saving.`,
      confirmLabel: 'Copy Attendance',
      danger: false
    }).then(ok => {
      if (!ok) return;
      const recs = State.getRecordsForSession(prevSession.id);
      recs.forEach(r => { studentStatusMap[r.studentId] = r.status; });
      saveDraft();
      render();
      UI.toast(`Copied attendance from ${Utils.formatDate(prevSession.date)}`, 'success', 2000);
    });
  }

  function handleCommitSession() {
    if (!selectedSubjectId) {
      UI.toast('Please select a course', 'error');
      return;
    }

    if (selectedSessionType === 'practical' && !experimentTitle.trim()) {
      UI.toast('Please enter practical experiment title', 'warn');
      const expInp = document.getElementById('rapid-exp-title');
      if (expInp) expInp.focus();
      return;
    }

    const counts = calculateCounts();
    if (counts.unmarked > 0) {
      UI.confirmDialog({
        title: 'Unmarked Students Detected',
        message: `There are ${counts.unmarked} unmarked students. Would you like to mark them Absent and commit session?`,
        confirmLabel: 'Mark Absent & Save',
        danger: true
      }).then(ok => {
        if (!ok) return;
        State.getAllStudents().forEach(s => {
          if (!studentStatusMap[s.id] || studentStatusMap[s.id] === 'unmarked') {
            studentStatusMap[s.id] = 'absent';
          }
        });
        proceedCommitSave();
      });
      return;
    }

    proceedCommitSave();
  }

  function proceedCommitSave() {
    const dupe = State.findDuplicateSession(selectedSubjectId, selectedDate, selectedStartTime);
    if (dupe) {
      UI.confirmDialog({
        title: 'Duplicate Session Detected',
        message: 'A session for this course, date and time already exists. Overwrite records?',
        confirmLabel: 'Overwrite Records',
        danger: true
      }).then(ok => {
        if (ok) commitSave(dupe.id);
      });
      return;
    }
    commitSave(null);
  }

  function commitSave(existingSessionId) {
    let sessId = existingSessionId;
    if (!sessId) {
      const sess = State.createSession({
        subjectId: selectedSubjectId,
        date: selectedDate,
        startTime: selectedStartTime,
        type: selectedSessionType,
        experimentTitle: experimentTitle
      });
      sessId = sess.id;
    } else {
      State.updateSession(sessId, {
        subjectId: selectedSubjectId,
        date: selectedDate,
        startTime: selectedStartTime,
        type: selectedSessionType,
        experimentTitle: experimentTitle
      });
    }

    State.saveRecords(sessId, studentStatusMap);
    clearDraft();
    playSound('complete');

    const counts = calculateCounts();
    const sub = State.getSubject(selectedSubjectId);

    // Open celebratory summary modal
    UI.openModal({
      title: 'Attendance Session Saved Successfully!',
      desc: `${sub ? sub.name : 'Course'} · ${Utils.formatDate(selectedDate)} at ${selectedStartTime}`,
      bodyHTML: `
        <div style="display:flex; flex-direction:column; gap:16px; padding:6px 0;">
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; text-align:center;">
            <div style="background:var(--safe-subtle); border:1px solid var(--safe-border); border-radius:var(--r-md); padding:12px;">
              <div style="font-size:24px; font-weight:700; color:var(--safe); font-family:var(--font-data);">${counts.present}</div>
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--safe);">Present</div>
            </div>
            <div style="background:var(--critical-subtle); border:1px solid var(--critical-border); border-radius:var(--r-md); padding:12px;">
              <div style="font-size:24px; font-weight:700; color:var(--critical); font-family:var(--font-data);">${counts.absent}</div>
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--critical);">Absent</div>
            </div>
            <div style="background:var(--warn-subtle); border:1px solid var(--warn-border); border-radius:var(--r-md); padding:12px;">
              <div style="font-size:24px; font-weight:700; color:var(--warn-ink); font-family:var(--font-data);">${counts.late}</div>
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--warn-ink);">Late</div>
            </div>
          </div>
          <div style="font-size:13.5px; color:var(--ink-secondary); text-align:center; line-height:1.5;">
            Turnout for this session: <strong style="color:var(--ink);">${counts.pct}%</strong>.<br>
            All 60 student profiles and reports have been updated in real-time.
          </div>
        </div>
      `,
      footerHTML: `
        <div style="display:flex; justify-content:space-between; width:100%;">
          <button class="btn btn-outline" id="modal-btn-view-history">View in History</button>
          <button class="btn btn-primary" id="modal-btn-mark-another">Mark Next Session</button>
        </div>
      `,
      onOpen: (overlay, close) => {
        overlay.querySelector('#modal-btn-view-history').addEventListener('click', () => {
          close();
          App.navigateTo('history');
        });
        overlay.querySelector('#modal-btn-mark-another').addEventListener('click', () => {
          close();
          initSession(true);
          render();
        });
      }
    });
  }

  function openShortcutsModal() {
    UI.openModal({
      title: 'Rapid Roll Call Keyboard Shortcuts',
      desc: 'Speed up attendance recording without touching your mouse',
      bodyHTML: `
        <div style="display:flex; flex-direction:column; gap:10px; padding:4px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
            <span style="font-size:13.5px; color:var(--ink);">Mark Student Present & Advance</span>
            <span class="kbd-shortcut" style="font-size:12px; padding:3px 8px;">P or Space</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
            <span style="font-size:13.5px; color:var(--ink);">Mark Student Absent & Advance</span>
            <span class="kbd-shortcut" style="font-size:12px; padding:3px 8px;">A</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
            <span style="font-size:13.5px; color:var(--ink);">Mark Student Late & Advance</span>
            <span class="kbd-shortcut" style="font-size:12px; padding:3px 8px;">L</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
            <span style="font-size:13.5px; color:var(--ink);">Go to Previous Student</span>
            <span class="kbd-shortcut" style="font-size:12px; padding:3px 8px;">← Left Arrow</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0;">
            <span style="font-size:13.5px; color:var(--ink);">Go to Next Student</span>
            <span class="kbd-shortcut" style="font-size:12px; padding:3px 8px;">→ Right Arrow</span>
          </div>
        </div>
      `,
      footerHTML: '<button class="btn btn-primary" id="btn-close-sc">Got it</button>',
      onOpen: (overlay, close) => {
        overlay.querySelector('#btn-close-sc').addEventListener('click', close);
      }
    });
  }

  function initKeyboardShortcuts() {
    if (keyboardBound) return;
    keyboardBound = true;

    document.addEventListener('keydown', (e) => {
      const view = App.getCurrentView();
      if (view !== 'rapid-roll') return;
      if (activeMode !== 'card') return;

      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const students = State.getAllStudents();
      const currentStudent = students[currentIndex];
      if (!currentStudent) return;

      if (e.key === ' ' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        markStudent(currentStudent.id, 'present', true);
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        markStudent(currentStudent.id, 'absent', true);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        markStudent(currentStudent.id, 'late', true);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) { currentIndex--; saveDraft(); render(); }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < students.length - 1) { currentIndex++; saveDraft(); render(); }
      }
    });
  }

  return { render, initSession };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = RapidRollView;
