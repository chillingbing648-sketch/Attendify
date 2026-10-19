/**
 * ATTENDIFY — cors.js
 * Strict Cross-Origin Resource Sharing (CORS) Configuration & Validation
 * 
 * Enforces authoritative origin validation to allow GitHub Pages frontend
 * (https://chillingbing648-sketch.github.io) and local development tools
 * while strictly rejecting untrusted origins.
 */

const rawAllowed = process.env.ALLOWED_ORIGINS || '';
const ALLOWED_ORIGINS = rawAllowed
  ? rawAllowed.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'https://chillingbing648-sketch.github.io',
      'https://harshportfolio404.netlify.app'
    ];

function getCorsOrigin(req) {
  const origin = (req && req.headers && req.headers.origin) || '';
  if (!origin) return '';
  const lower = origin.toLowerCase().trim();
  if (
    ALLOWED_ORIGINS.includes(lower) ||
    lower.startsWith('http://localhost:') ||
    lower.startsWith('http://127.0.0.1:')
  ) {
    return origin;
  }
  return '';
}

function getCorsHeaders(req) {
  const origin = getCorsOrigin(req);
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

module.exports = {
  ALLOWED_ORIGINS,
  getCorsOrigin,
  getCorsHeaders
};
