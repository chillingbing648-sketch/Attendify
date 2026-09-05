/* ============================================================
   ATTENDIFY — calendar.js
   Month calendar showing attendance status per day (present /
   absent / holiday / no-class), with day drill-down.
   ============================================================ */

const CalendarView = (() => {
  let viewDate = new Date(); // first-of-month tracker
  viewDate.setDate(1);

  function render() {
    const container = document.getElementById('view-calendar');
    const subjects = State.get().subjects;

    container.innerHTML = `
      <div class="view-header">
        <div>
          <h1>Calendar</h1>
          <p class="view-subtitle">Browse your attendance history by date.</p>
        </div>
        <div class="view-header-actions">
          <button class="icon-btn" id="cal-prev" aria-label="Previous month">‹</button>
          <div style="font-weight:600; font-size:var(--fs-sm); min-width:130px; text-align:center;" id="cal-month-label"></div>
          <button class="icon-btn" id="cal-next" aria-label="Next month">›</button>
        </div>
      </div>

      ${subjects.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">${UI.icon('calendar')}</div>
          <h3>Add a subject first</h3>
          <p>Once you start marking attendance, your calendar will populate automatically.</p>
        </div>
      ` : `
        <div class="card">
          <div class="calendar-grid" id="cal-grid"></div>
          <div class="calendar-legend">
            <span><i class="cal-dot dot-present"></i>Present</span>
            <span><i class="cal-dot dot-absent"></i>Absent</span>
            <span><i class="cal-dot dot-holiday"></i>Holiday</span>
            <span><i class="cal-dot dot-noclass"></i>No class</span>
          </div>
        </div>
        <div class="section" id="cal-day-detail" style="margin-top:24px;"></div>
      `}
    `;

    if (subjects.length === 0) return;

    container.querySelector('#cal-prev').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); render(); });
    container.querySelector('#cal-next').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); render(); });

    renderGrid();
  }

  function renderGrid() {
    const label = document.getElementById('cal-month-label');
    label.textContent = viewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    const grid = document.getElementById('cal-grid');
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayISO = Utils.todayISO();

    let html = Utils.DAY_SHORT.slice(1).concat(Utils.DAY_SHORT[0]).map(d => `<div class="calendar-dow">${d}</div>`).join('');
    for (let i = 0; i < startOffset; i++) html += `<div class="calendar-cell empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const iso = Utils.toISODate(dateObj);
      const records = State.attendanceOnDate(iso);
      const isToday = iso === todayISO;
      const statuses = [...new Set(records.map(r => r.status))];
      const dots = statuses.slice(0, 4).map(s => `<span class="cal-dot dot-${s}"></span>`).join('');
      html += `
        <div class="calendar-cell ${isToday ? 'today' : ''}" data-date="${iso}" role="button" tabindex="0">
          <span>${d}</span>
          <span class="cal-dot-row">${dots}</span>
        </div>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll('.calendar-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => renderDayDetail(cell.dataset.date));
      cell.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); renderDayDetail(cell.dataset.date); } });
    });

    // Auto-select today if in view
    if (year === new Date().getFullYear() && month === new Date().getMonth()) {
      renderDayDetail(todayISO);
    } else {
      document.getElementById('cal-day-detail').innerHTML = '';
    }
  }

  function renderDayDetail(iso) {
    const el = document.getElementById('cal-day-detail');
    const records = State.attendanceOnDate(iso);
    const dateLabel = Utils.formatDate(iso);
    const subjects = State.get().subjects;

    const rows = records.map(rec => {
      const subject = State.getSubject(rec.subjectId);
      const statusMap = { present: 'badge-safe', absent: 'badge-critical', holiday: 'badge-neutral', noclass: 'badge-neutral' };
      return `
        <div class="log-item">
          <div class="log-date">${Utils.escapeHTML(subject ? subject.name : 'Deleted subject')}</div>
          <div class="log-status"><span class="badge ${statusMap[rec.status] || 'badge-neutral'}">${rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}</span></div>
          <div class="log-actions"><button class="icon-btn cal-del-entry" data-id="${rec.id}" aria-label="Delete entry">${UI.icon('trash')}</button></div>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="section-title-row">
        <div class="section-title">${dateLabel}</div>
        <button class="btn btn-outline btn-sm" id="cal-mark-day-btn">${UI.icon('plus')} Mark this day</button>
      </div>
      <div class="card">
        ${records.length === 0
          ? `<div class="empty-state" style="padding:var(--sp-6);"><p>No attendance recorded for this day.</p></div>`
          : `<div class="log-list">${rows}</div>`}
      </div>
    `;

    el.querySelector('#cal-mark-day-btn').addEventListener('click', () => openMarkDayForm(iso, subjects));
    el.querySelectorAll('.cal-del-entry').forEach(btn => {
      btn.addEventListener('click', () => {
        State.deleteAttendance(btn.dataset.id);
        UI.toast('Entry removed', 'success');
        renderDayDetail(iso);
      });
    });
  }

  function openMarkDayForm(iso, subjects) {
    if (subjects.length === 0) return;
    const subjectOptions = subjects.map(s => `<option value="${s.id}">${Utils.escapeHTML(s.name)}</option>`).join('');
    const bodyHTML = `
      <form id="mark-day-form">
        <div class="field">
          <label for="md-subject">Subject</label>
          <select id="md-subject" class="input">${subjectOptions}</select>
        </div>
        <div class="field">
          <label for="md-status">Status</label>
          <select id="md-status" class="input">
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="holiday">Holiday</option>
            <option value="noclass">No class</option>
          </select>
        </div>
      </form>
    `;
    const footerHTML = `<button class="btn btn-outline" id="md-cancel">Cancel</button><button class="btn btn-primary" id="md-save">Save</button>`;
    UI.openModal({
      title: `Mark attendance — ${Utils.formatDate(iso)}`,
      bodyHTML, footerHTML,
      onOpen: (overlay, close) => {
        overlay.querySelector('#md-cancel').addEventListener('click', close);
        overlay.querySelector('#md-save').addEventListener('click', () => {
          const subjectId = overlay.querySelector('#md-subject').value;
          const status = overlay.querySelector('#md-status').value;
          State.markAttendance(subjectId, status, iso);
          Notifications.checkThresholdChange(subjectId);
          UI.toast('Attendance marked', 'success');
          close();
          renderDayDetail(iso);
        });
      }
    });
  }

  return { render };
})();
