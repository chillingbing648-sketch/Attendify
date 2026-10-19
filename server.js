const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const database = require('./database.js');
const qrBackend = require('./qr-backend.js');
const studentBackend = require('./student-backend.js');
const { getCorsOrigin, getCorsHeaders } = require('./cors.js');

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Handle preflight OPTIONS requests with strict CORS headers
  if (req.method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(req);
    res.writeHead(204, {
      ...corsHeaders,
      'Content-Length': '0'
    });
    res.end();
    return;
  }

  // Global Backend & Database Health Check
  if (pathname === '/api/health' && req.method === 'GET') {
    const corsHeaders = getCorsHeaders(req);
    try {
      const active = database.getActiveSessions();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...corsHeaders
      });
      res.end(JSON.stringify({
        ok: true,
        status: 'healthy',
        database: 'connected (node:sqlite ACID)',
        serverTime: new Date().toISOString(),
        activeSessions: active.length
      }));
    } catch (err) {
      res.writeHead(503, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...corsHeaders
      });
      res.end(JSON.stringify({
        ok: false,
        status: 'unhealthy',
        error: 'Database connection failure: ' + (err.message || 'unknown error'),
        serverTime: new Date().toISOString()
      }));
    }
    return;
  }

  // Intercept QR Code Attendance Backend API routes
  if (pathname.startsWith('/api/qr/')) {
    qrBackend.handleApiRequest(req, res, parsedUrl);
    return;
  }

  // Intercept Student Portal API routes
  if (pathname.startsWith('/api/student/')) {
    studentBackend.handleApiRequest(req, res, parsedUrl);
    return;
  }

  // Intercept Faculty Auth API routes
  if (pathname.startsWith('/api/faculty/')) {
    qrBackend.handleApiRequest(req, res, parsedUrl);
    return;
  }

  // Route /student to student.html
  if (pathname === '/student' || pathname === '/student/') {
    pathname = '/student.html';
  }

  // Route /checkin to checkin.html
  if (pathname === '/checkin' || pathname === '/checkin/') {
    pathname = '/checkin.html';
  }

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const filePath = path.join(ROOT, pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA navigation
      const fallbackPath = path.join(ROOT, 'index.html');
      fs.readFile(fallbackPath, (fallbackErr, data) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      const corsHeaders = getCorsHeaders(req);
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        ...corsHeaders
      };

      res.writeHead(200, headers);
      res.end(data);
    });
  });
});

function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down Attendify server...`);
  server.close(() => {
    try {
      database.closeDatabaseConnection();
    } catch {}
    console.log('Database connection closed. Attendify server stopped.');
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(0);
  }, 5000).unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Attendify live production server running at http://${HOST}:${PORT}/`);
  });
}

module.exports = server;
