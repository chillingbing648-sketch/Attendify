/**
 * ATTENDIFY TEST SUITE — CORS & API Configuration Transport Layer
 * Verifies cross-origin safety, allowlist enforcement, preflight headers,
 * and base URL routing for GitHub Pages frontend deployment.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const { getCorsOrigin, getCorsHeaders, ALLOWED_ORIGINS } = require('../cors.js');
const AttendifyConfig = require('../js/api-config.js');
const server = require('../server.js');
const database = require('../database.js');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

test('CORS Spec 1 — Allows authoritative GitHub Pages and local development origins', () => {
  const reqGithub = { headers: { origin: 'https://chillingbing648-sketch.github.io' } };
  assert.equal(getCorsOrigin(reqGithub), 'https://chillingbing648-sketch.github.io');

  const headers = getCorsHeaders(reqGithub);
  assert.equal(headers['Access-Control-Allow-Origin'], 'https://chillingbing648-sketch.github.io');
  assert.equal(headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  assert.ok(headers['Access-Control-Allow-Headers'].includes('Authorization'));
  assert.ok(headers['Access-Control-Allow-Headers'].includes('Content-Type'));

  const reqLocal = { headers: { origin: 'http://localhost:5173' } };
  assert.equal(getCorsOrigin(reqLocal), 'http://localhost:5173');

  const reqLocalCustomPort = { headers: { origin: 'http://127.0.0.1:8080' } };
  assert.equal(getCorsOrigin(reqLocalCustomPort), 'http://127.0.0.1:8080');
});

test('CORS Spec 2 — Strictly blocks and does not reflect untrusted origins', () => {
  const reqUntrusted = { headers: { origin: 'https://malicious-phishing-site.com' } };
  assert.equal(getCorsOrigin(reqUntrusted), '');

  const headers = getCorsHeaders(reqUntrusted);
  assert.deepEqual(headers, {});
  assert.equal(headers['Access-Control-Allow-Origin'], undefined);
});

test('API Config Spec 3 — Base URL sanitization, prefixing, and storage', () => {
  AttendifyConfig.clearApiBaseUrl();
  assert.equal(AttendifyConfig.getApiBaseUrl(), '');
  assert.equal(AttendifyConfig.getApiUrl('/api/qr/health'), '/api/qr/health');
  assert.equal(AttendifyConfig.getApiUrl('api/qr/health'), '/api/qr/health');

  // Set remote deployed backend
  AttendifyConfig.setApiBaseUrl('https://attendify-api.onrender.com/');
  assert.equal(AttendifyConfig.getApiBaseUrl(), 'https://attendify-api.onrender.com');
  assert.equal(
    AttendifyConfig.getApiUrl('/api/qr/health'),
    'https://attendify-api.onrender.com/api/qr/health'
  );
  assert.equal(
    AttendifyConfig.getApiUrl('api/student/submit'),
    'https://attendify-api.onrender.com/api/student/submit'
  );

  // Preserve absolute URLs passed directly
  assert.equal(
    AttendifyConfig.getApiUrl('https://external-service.org/test'),
    'https://external-service.org/test'
  );

  // Reset
  AttendifyConfig.clearApiBaseUrl();
  assert.equal(AttendifyConfig.getApiBaseUrl(), '');
});

test('HTTP Server Spec 4 — OPTIONS Preflight returns 204 with strict CORS headers for GitHub Pages', async () => {
  const port = 3456;
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));

  try {
    const res = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/qr/session/start',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://chillingbing648-sketch.github.io',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });

    assert.equal(res.statusCode, 204);
    assert.equal(res.headers['access-control-allow-origin'], 'https://chillingbing648-sketch.github.io');
    assert.ok(res.headers['access-control-allow-headers'].includes('Authorization'));
    assert.ok(res.headers['access-control-allow-methods'].includes('POST'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('HTTP Server Spec 5 — GET /api/health and /api/qr/health return healthy database status with CORS', async () => {
  const port = 3457;
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));

  try {
    // 1. Global health check
    const healthRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Origin': 'https://chillingbing648-sketch.github.io'
      }
    });

    assert.equal(healthRes.statusCode, 200);
    assert.equal(healthRes.headers['access-control-allow-origin'], 'https://chillingbing648-sketch.github.io');
    const healthJson = JSON.parse(healthRes.body);
    assert.equal(healthJson.ok, true);
    assert.equal(healthJson.status, 'healthy');
    assert.ok(healthJson.database.includes('ACID'));

    // 2. QR backend health check
    const qrHealthRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/qr/health',
      method: 'GET',
      headers: {
        'Origin': 'https://chillingbing648-sketch.github.io'
      }
    });

    assert.equal(qrHealthRes.statusCode, 200);
    assert.equal(qrHealthRes.headers['access-control-allow-origin'], 'https://chillingbing648-sketch.github.io');
    const qrHealthJson = JSON.parse(qrHealthRes.body);
    assert.equal(qrHealthJson.ok, true);
    assert.equal(qrHealthJson.status, 'ok');
    assert.equal(qrHealthJson.backend, 'attendify-trusted-node-backend');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('HTTP Server Spec 6 — Cross-origin student authentication and attendance check-in workflow', async () => {
  const port = 3458;
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));

  try {
    // 1. Start QR session as faculty
    const sessionRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/qr/session/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://chillingbing648-sketch.github.io'
      }
    }, {
      subjectId: 'subj_1',
      sessionType: 'lecture',
      durationMinutes: 10
    });

    assert.equal(sessionRes.statusCode, 200);
    const sessionJson = JSON.parse(sessionRes.body);
    assert.equal(sessionJson.success, true);
    const sessionId = sessionJson.session.id;
    const token = sessionJson.session.token;
    assert.ok(sessionId);
    assert.ok(token);

    // 2. Student login from GitHub Pages origin
    const loginRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/student/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://chillingbing648-sketch.github.io'
      }
    }, {
      rollNumber: 1,
      pin: '1001'
    });

    assert.equal(loginRes.statusCode, 200);
    assert.equal(loginRes.headers['access-control-allow-origin'], 'https://chillingbing648-sketch.github.io');
    const loginJson = JSON.parse(loginRes.body);
    assert.equal(loginJson.success, true);
    const bearerToken = loginJson.token;
    assert.ok(bearerToken);

    // 3. Student submits attendance with Bearer token and current QR token
    const submitRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/student/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'Origin': 'https://chillingbing648-sketch.github.io'
      }
    }, {
      sessionId,
      token
    });

    assert.equal(submitRes.statusCode, 200);
    assert.equal(submitRes.headers['access-control-allow-origin'], 'https://chillingbing648-sketch.github.io');
    const submitJson = JSON.parse(submitRes.body);
    assert.equal(submitJson.success, true);
    assert.equal(submitJson.submissionConfirmed, true);

    // 4. Duplicate submission is blocked
    const duplicateRes = await makeRequest({
      hostname: '127.0.0.1',
      port,
      path: '/api/student/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
        'Origin': 'https://chillingbing648-sketch.github.io'
      }
    }, {
      sessionId,
      token
    });

    assert.equal(duplicateRes.statusCode, 400);
    const dupJson = JSON.parse(duplicateRes.body);
    assert.equal(dupJson.success, false);
    assert.equal(dupJson.error, 'ALREADY_SUBMITTED');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
