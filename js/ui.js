/* ============================================================
   ATTENDIFY — ui.js
   Reusable UI primitives: toasts, modal shell, confirm dialogs,
   dropdown handling, theme application, icon helpers.
   ============================================================ */

const UI = (() => {

  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    subjects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
    timetable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></svg>',
    notifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    moreVert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    trendUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>',
    trendDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>',
    xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
    bookOpen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>'
  };

  function icon(name) {
    const raw = ICONS[name];
    if (!raw) return '';
    return raw.replace('<svg ', '<svg class="ui-icon" ');
  }

  /* ---------------- Announcer ---------------- */
  let srAnnouncer = null;
  function ensureAnnouncer() {
    if (!srAnnouncer) {
      srAnnouncer = document.createElement('div');
      srAnnouncer.id = 'sr-announcer';
      srAnnouncer.className = 'sr-only';
      srAnnouncer.setAttribute('role', 'status');
      srAnnouncer.setAttribute('aria-live', 'polite');
      srAnnouncer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(srAnnouncer);
    }
    return srAnnouncer;
  }

  function announce(message) {
    const announcer = ensureAnnouncer();
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 40);
  }

  /* ---------------- Toasts ---------------- */
  let toastRegion = null;
  function ensureToastRegion() {
    if (!toastRegion) {
      toastRegion = document.createElement('div');
      toastRegion.className = 'toast-region';
      toastRegion.setAttribute('role', 'status');
      toastRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastRegion);
    }
    return toastRegion;
  }

  /**
   * Show toast notification.
   * @param {string} message
   * @param {'info'|'success'|'error'|'warn'} type
   * @param {number} duration
   * @param {{ label: string, onClick: () => void }} [action]
   */
  function toast(message, type = 'info', duration = 3200, action = null) {
    const region = ensureToastRegion();
    announce(message);
    const el = document.createElement('div');
    el.className = 'toast';
    const iconName = type === 'success' ? 'checkCircle' : type === 'error' ? 'xCircle' : 'alert';
    const actionBtnHTML = action ? `<button class="toast-action-btn" type="button">${Utils.escapeHTML(action.label)}</button>` : '';
    el.innerHTML = `<span class="toast-icon ${type}">${icon(iconName)}</span><span class="toast-msg">${Utils.escapeHTML(message)}</span>${actionBtnHTML}<button class="toast-close" aria-label="Dismiss">${icon('x')}</button>`;
    region.appendChild(el);

    const remove = () => {
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 180);
    };

    if (action) {
      const actionBtn = el.querySelector('.toast-action-btn');
      if (actionBtn) {
        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          try { action.onClick(); } catch (err) { console.error('Toast action error:', err); }
          remove();
        });
      }
    }

    el.querySelector('.toast-close').addEventListener('click', remove);
    const timer = setTimeout(remove, duration);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  /* ---------------- Modal shell ---------------- */
  let modalRoot = null;
  function ensureModalRoot() {
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'modal-root';
      document.body.appendChild(modalRoot);
    }
    return modalRoot;
  }

  /**
   * Open a modal with focus trap and return-to-trigger on close.
   * @param {{title:string, desc?:string, bodyHTML:string, footerHTML:string, wide?:boolean, onOpen?:(modalEl, closeFn)=>void}} opts
   */
  function openModal(opts) {
    const previousActiveElement = document.activeElement;
    const root = ensureModalRoot();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal ${opts.wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <div>
            <h3 id="modal-title">${Utils.escapeHTML(opts.title)}</h3>
            ${opts.desc ? `<p>${Utils.escapeHTML(opts.desc)}</p>` : ''}
          </div>
          <button class="icon-btn modal-close-btn" aria-label="Close">${icon('x')}</button>
        </div>
        <div class="modal-body">${opts.bodyHTML}</div>
        <div class="modal-footer ${opts.footerSpread ? 'spread' : ''}">${opts.footerHTML}</div>
      </div>
    `;
    root.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    let isClosed = false;
    function close() {
      if (isClosed) return;
      isClosed = true;
      overlay.classList.remove('open');
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        try { previousActiveElement.focus(); } catch (e) { /* noop */ }
      }
    }

    function getFocusableElements() {
      const selectors = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(overlay.querySelectorAll(selectors)).filter(el => {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
      });
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !overlay.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', onKeydown);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.modal-close-btn').addEventListener('click', close);

    if (opts.onOpen) opts.onOpen(overlay, close);

    // Focus first input or action button
    const firstInput = overlay.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button.btn-primary:not([disabled]), button.btn-danger-solid:not([disabled]), button.btn:not([disabled])');
    if (firstInput) setTimeout(() => firstInput.focus(), 40);

    return close;
  }

  /** Confirmation dialog. Returns a Promise<boolean>. */
  function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, requireText = null }) {
    return new Promise((resolve) => {
      const bodyHTML = `
        ${danger ? `<div class="modal-danger-icon">${icon('alert')}</div>` : ''}
        <p style="color:var(--ink-2); font-size:var(--fs-sm); line-height:1.6;">${Utils.escapeHTML(message)}</p>
        ${requireText ? `
          <div class="field" style="margin-top:16px;">
            <label>Type "${Utils.escapeHTML(requireText)}" to confirm</label>
            <input type="text" class="input" id="confirm-text-input" autocomplete="off">
          </div>` : ''}
      `;
      const footerHTML = `
        <button class="btn btn-outline" id="confirm-cancel-btn">Cancel</button>
        <button class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" id="confirm-ok-btn" ${requireText ? 'disabled' : ''}>${Utils.escapeHTML(confirmLabel)}</button>
      `;
      let resolved = false;
      const close = openModal({
        title, bodyHTML, footerHTML,
        onOpen: (overlay, closeFn) => {
          const okBtn = overlay.querySelector('#confirm-ok-btn');
          const cancelBtn = overlay.querySelector('#confirm-cancel-btn');
          if (requireText) {
            const input = overlay.querySelector('#confirm-text-input');
            input.addEventListener('input', () => {
              okBtn.disabled = input.value.trim() !== requireText;
            });
          }
          okBtn.addEventListener('click', () => { resolved = true; closeFn(); resolve(true); });
          cancelBtn.addEventListener('click', () => { closeFn(); });
        }
      });
      const originalClose = close;
      // Patch overlay removal to resolve(false) if closed without confirming
      const observer = new MutationObserver(() => {
        if (!document.body.contains(document.getElementById('confirm-ok-btn')) && !resolved) {
          resolved = true;
          resolve(false);
          observer.disconnect();
        }
      });
      observer.observe(document.getElementById('modal-root'), { childList: true });
    });
  }

  /* ---------------- Dropdown ---------------- */
  function initDropdowns(container = document) {
    container.querySelectorAll('[data-dropdown-trigger]').forEach(trigger => {
      if (trigger.dataset.bound) return;
      trigger.dataset.bound = '1';
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = trigger.parentElement.querySelector('.dropdown-menu');
        const isOpen = menu.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) menu.classList.add('open');
      });
    });
  }
  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  }
  document.addEventListener('click', closeAllDropdowns);

  /* ---------------- Theme ---------------- */
  function applyTheme(theme) {
    const root = document.documentElement;
    let resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.setAttribute('data-theme', resolved);
  }

  function initThemeWatcher(getTheme) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getTheme() === 'system') applyTheme('system');
    });
  }

  /* ---------------- Subject colors ---------------- */
  const SUBJECT_COLORS = ['#C1631A', '#2E7D4F', '#1E66F5', '#B8790A', '#7A4FE0', '#C4351F', '#0E8A82', '#A8437A'];
  function colorForIndex(i) { return SUBJECT_COLORS[i % SUBJECT_COLORS.length]; }

  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const raw = parts.length === 1 ? parts[0].slice(0, 2) : (parts[0][0] + parts[parts.length - 1][0]);
    return Utils.escapeHTML(raw.toUpperCase());
  }

  return {
    icon, toast, announce, openModal, confirmDialog, initDropdowns, closeAllDropdowns,
    applyTheme, initThemeWatcher, SUBJECT_COLORS, colorForIndex, initials
  };
})();
