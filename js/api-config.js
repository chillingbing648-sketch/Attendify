/**
 * ATTENDIFY — api-config.js
 * Centralized API Configuration & Cross-Origin Transport Layer
 * 
 * Solves the GitHub Pages static host limitation by transparently routing
 * frontend API requests to a deployed backend (Render / Railway / Fly.io / VPS)
 * while preserving local development same-origin workflows.
 * 
 * Resolution Priority:
 * 1. URL Query Param: ?api=https://my-backend.onrender.com (auto-persists to localStorage)
 * 2. Window Global: window.ATTENDIFY_API_BASE_URL
 * 3. Local Storage: localStorage.getItem('attendify_api_base_url')
 * 4. Default: "" (same-origin relative) when on localhost/127.0.0.1
 */

(function (global) {
  'use strict';

  const STORAGE_KEY = 'attendify_api_base_url';
  let inMemoryBaseUrl = null;

  function sanitizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    let trimmed = url.trim();
    // Remove trailing slashes
    trimmed = trimmed.replace(/\/+$/, '');
    return trimmed;
  }

  function detectQueryParamUrl() {
    if (typeof window === 'undefined' || !window.location || !window.location.search) {
      return '';
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const queryApi = params.get('api') || params.get('backend');
      if (queryApi) {
        const sanitized = sanitizeUrl(queryApi);
        if (sanitized && (sanitized.startsWith('http://') || sanitized.startsWith('https://'))) {
          // Persist so subsequent page navigations also use this backend
          try {
            localStorage.setItem(STORAGE_KEY, sanitized);
          } catch {}
          return sanitized;
        }
      }
    } catch {}
    return '';
  }

  function getApiBaseUrl() {
    // 1. In-memory override if explicitly set in runtime
    if (inMemoryBaseUrl !== null) {
      return inMemoryBaseUrl;
    }

    // 2. Query parameter (?api=https://...)
    const queryUrl = detectQueryParamUrl();
    if (queryUrl) {
      inMemoryBaseUrl = queryUrl;
      return inMemoryBaseUrl;
    }

    // 3. Pre-configured window global
    if (typeof window !== 'undefined' && window.ATTENDIFY_API_BASE_URL) {
      const globalUrl = sanitizeUrl(window.ATTENDIFY_API_BASE_URL);
      if (globalUrl) {
        inMemoryBaseUrl = globalUrl;
        return inMemoryBaseUrl;
      }
    }

    // 4. LocalStorage persisted URL
    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const sanitizedStored = sanitizeUrl(stored);
          if (sanitizedStored) {
            inMemoryBaseUrl = sanitizedStored;
            return inMemoryBaseUrl;
          }
        }
      } catch {}
    }

    // 5. Environment variable in Node test runner
    if (typeof process !== 'undefined' && process.env && (process.env.ATTENDIFY_API_BASE_URL || process.env.API_BASE_URL)) {
      return sanitizeUrl(process.env.ATTENDIFY_API_BASE_URL || process.env.API_BASE_URL);
    }

    // 6. Default: empty string (same-origin relative) for local host
    return '';
  }

  function setApiBaseUrl(url) {
    const sanitized = sanitizeUrl(url);
    inMemoryBaseUrl = sanitized;
    if (typeof localStorage !== 'undefined') {
      try {
        if (sanitized) {
          localStorage.setItem(STORAGE_KEY, sanitized);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
    }
    return sanitized;
  }

  function clearApiBaseUrl() {
    return setApiBaseUrl('');
  }

  function getApiUrl(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') return '';
    
    // If endpoint is already a full absolute URL, return it as-is
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }

    const base = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    if (!base) {
      return cleanEndpoint;
    }

    return `${base}${cleanEndpoint}`;
  }

  /**
   * Resilient fetch wrapper with URL prefixing, JSON defaults, timeout, and friendly errors
   */
  async function apiFetch(endpoint, options = {}) {
    const targetUrl = getApiUrl(endpoint);
    const timeoutMs = options.timeoutMs || 12000;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const signal = controller ? controller.signal : options.signal;

    let timeoutId = null;
    if (controller && timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    }

    const headers = { ...(options.headers || {}) };
    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
      ...options,
      headers,
      signal
    };
    delete fetchOptions.timeoutMs;

    try {
      const response = await fetch(targetUrl, fetchOptions);
      if (timeoutId) clearTimeout(timeoutId);
      return response;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      
      const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
      const errorMsg = isAbort
        ? `Request timed out after ${timeoutMs}ms connecting to backend (${targetUrl})`
        : `Network error connecting to Attendify backend (${targetUrl}). Please ensure the server is online and CORS is configured.`;

      const enhancedError = new Error(errorMsg);
      enhancedError.originalError = err;
      enhancedError.isNetworkError = true;
      enhancedError.isTimeout = isAbort;
      enhancedError.targetUrl = targetUrl;
      throw enhancedError;
    }
  }

  async function checkHealth() {
    try {
      const res = await apiFetch('/api/health', { cache: 'no-store', timeoutMs: 5000 });
      if (!res.ok) {
        // Fallback check to /api/qr/health
        const qrRes = await apiFetch('/api/qr/health', { cache: 'no-store', timeoutMs: 5000 });
        if (qrRes.ok) {
          const data = await qrRes.json();
          return { ok: true, data };
        }
        return { ok: false, status: res.status, message: `Server returned HTTP ${res.status}` };
      }
      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, isNetworkError: true, message: err.message };
    }
  }

  function isStaticHost() {
    if (typeof window === 'undefined' || !window.location) return false;
    const host = window.location.hostname;
    return host.endsWith('.github.io') || host.endsWith('.netlify.app') || (host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.'));
  }

  const AttendifyConfig = {
    getApiBaseUrl,
    setApiBaseUrl,
    clearApiBaseUrl,
    getApiUrl,
    apiFetch,
    checkHealth,
    isStaticHost,
    STORAGE_KEY
  };

  // Expose to window in browsers
  if (typeof window !== 'undefined') {
    window.AttendifyConfig = AttendifyConfig;
  }

  // CommonJS export for Node test runner
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AttendifyConfig;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
