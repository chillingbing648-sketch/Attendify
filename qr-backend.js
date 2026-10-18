/**
 * ATTENDIFY — qr-backend.js
 * Trusted Server-Side Rotating QR Attendance Engine
 * Security Features:
 * • Cryptographically unpredictable tokens (crypto.randomBytes)
 * • Strict token rotation with 5-second grace window
 * • Server-side timestamp & overall session expiry enforcement
 * • Server-side roster enrollment validation (SY BSc IT Roll 1–60)
 * • Duplicate check-in rejection
 * • Replay detection & blocking
 * • IP-based sliding rate-limiting
 * • Security event audit ledger
 */

const crypto = require('crypto');

// In-memory active sessions store
const sessions = new Map();

// In-memory rate limiting map: ip -> { count, windowStart }
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimits.get(ip) || { count: 0, windowStart: now };

  if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    record.count = 1;
    record.windowStart = now;
  } else {
    record.count++;
  }

  rateLimits.set(ip, record);
  return record.count <= MAX_REQUESTS_PER_WINDOW;
}

function generateSecureToken() {
  return crypto.randomBytes(24).toString('hex');
}

function startSession(params = {}, clientIp = '127.0.0.1') {
  const now = Date.now();
  const durationMin = Math.min(180, Math.max(1, parseInt(params.durationMinutes, 10) || 15));
  const rotationSec = Math.min(120, Math.max(5, parseInt(params.rotationIntervalSec, 10) || 20));
  const sessionId = 'qr_sess_' + now + '_' + crypto.randomBytes(4).toString('hex');
  const initialToken = generateSecureToken();

  const session = {
    id: sessionId,
    subjectId: params.subjectId || '',
    sessionType: params.sessionType === 'practical' ? 'practical' : 'lecture',
    date: params.date || new Date().toISOString().slice(0, 10),
    startTime: params.startTime || '09:00',
    experimentTitle: (params.experimentTitle || '').trim(),
    durationMinutes: durationMin,
    rotationIntervalSec: rotationSec,
    createdAt: now,
    expiresAt: now + durationMin * 60 * 1000,
    currentToken: initialToken,
    tokenExpiresAt: now + rotationSec * 1000,
    previousTokens: new Map(), // token -> graceExpiresAt
    replayedTokens: new Set(), // expired tokens specifically tracked
    checkedInStudents: new Map(), // studentId -> { rollNumber, name, timestamp, ip, status, flag }
    status: 'active',
    auditLog: [
      {
        event: 'SESSION_STARTED',
        timestamp: new Date().toISOString(),
        clientIp,
        details: `Session initialized for subject "${params.subjectId || 'N/A'}" (${durationMin} min duration, ${rotationSec}s rotation)`
      }
    ]
  };

  sessions.set(sessionId, session);
  return {
    success: true,
    session: sanitizeSession(session)
  };
}

function rotateToken(sessionId, clientIp = '127.0.0.1') {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND', message: 'Session does not exist.' };
  }

  const now = Date.now();
  if (session.status !== 'active') {
    return { success: false, error: 'SESSION_INACTIVE', message: `Session status is ${session.status}.` };
  }

  if (now >= session.expiresAt) {
    session.status = 'expired';
    session.auditLog.push({
      event: 'SESSION_EXPIRED',
      timestamp: new Date().toISOString(),
      clientIp,
      details: 'Overall session duration expired.'
    });
    return { success: false, error: 'SESSION_EXPIRED', message: 'Session duration has expired.' };
  }

  // Grace window: retain old token for 5 seconds to prevent race conditions during cellular transit
  const GRACE_PERIOD_MS = 5000;
  if (session.currentToken) {
    session.previousTokens.set(session.currentToken, now + GRACE_PERIOD_MS);
  }

  // Purge previousTokens older than grace period and mark as replayedTokens
  for (const [token, graceExpiry] of session.previousTokens.entries()) {
    if (now > graceExpiry) {
      session.replayedTokens.add(token);
      session.previousTokens.delete(token);
    }
  }

  const newToken = generateSecureToken();
  session.currentToken = newToken;
  session.tokenExpiresAt = now + session.rotationIntervalSec * 1000;

  session.auditLog.push({
    event: 'TOKEN_ROTATED',
    timestamp: new Date().toISOString(),
    clientIp,
    details: `Token rotated (expires in ${session.rotationIntervalSec}s)`
  });

  return {
    success: true,
    token: newToken,
    tokenExpiresAt: session.tokenExpiresAt,
    expiresAt: session.expiresAt
  };
}

function checkin(params = {}, clientIp = '127.0.0.1') {
  if (!checkRateLimit(clientIp)) {
    return {
      success: false,
      error: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a few seconds before trying again.'
    };
  }

  const { sessionId, token, studentId, rollNumber, studentName } = params;
  const session = sessions.get(sessionId);

  if (!session) {
    return {
      success: false,
      error: 'SESSION_NOT_FOUND',
      message: 'Invalid session ID. Please scan the current code.'
    };
  }

  const now = Date.now();

  // 1. Session status & overall duration check
  if (session.status !== 'active') {
    return {
      success: false,
      error: 'SESSION_CLOSED',
      message: 'This attendance session has already been closed by faculty.'
    };
  }

  if (now > session.expiresAt) {
    session.status = 'expired';
    session.auditLog.push({
      event: 'SESSION_EXPIRED',
      timestamp: new Date().toISOString(),
      clientIp
    });
    return {
      success: false,
      error: 'SESSION_EXPIRED',
      message: 'The check-in window for this session has closed.'
    };
  }

  // 2. Token authenticity & freshness check
  const isCurrentValid = (token === session.currentToken) && (now <= session.tokenExpiresAt);
  const isGraceValid = session.previousTokens.has(token) && (now <= session.previousTokens.get(token));

  if (!isCurrentValid && !isGraceValid) {
    const isReplay = session.replayedTokens.has(token);
    session.auditLog.push({
      event: isReplay ? 'REPLAY_ATTEMPT_BLOCKED' : 'INVALID_TOKEN_REJECTED',
      timestamp: new Date().toISOString(),
      clientIp,
      details: isReplay ? `Replay of expired token for Roll #${rollNumber}` : `Invalid/expired token attempt for Roll #${rollNumber}`
    });

    return {
      success: false,
      error: isReplay ? 'REPLAYED_TOKEN' : 'TOKEN_EXPIRED_OR_INVALID',
      message: 'This QR code has already expired. Please scan the current active QR code on screen.'
    };
  }

  // 3. Roster enrollment validation
  const parsedRoll = parseInt(rollNumber, 10);
  if (isNaN(parsedRoll) || parsedRoll < 1 || parsedRoll > 60 || !studentId) {
    session.auditLog.push({
      event: 'UNENROLLED_STUDENT_REJECTED',
      timestamp: new Date().toISOString(),
      clientIp,
      details: `Attempt with invalid roll number: ${rollNumber}`
    });

    return {
      success: false,
      error: 'NOT_ENROLLED',
      message: 'Roll number is not enrolled in the SY BSc IT batch roster (Roll 1 to 60).'
    };
  }

  // 4. Duplicate check-in prevention
  const alreadyCheckedInById = session.checkedInStudents.has(studentId);
  let alreadyCheckedInByRoll = false;
  for (const s of session.checkedInStudents.values()) {
    if (s.rollNumber === parsedRoll) {
      alreadyCheckedInByRoll = true;
      break;
    }
  }

  if (alreadyCheckedInById || alreadyCheckedInByRoll) {
    session.auditLog.push({
      event: 'DUPLICATE_CHECKIN_BLOCKED',
      timestamp: new Date().toISOString(),
      clientIp,
      details: `Duplicate check-in blocked for Roll #${parsedRoll}`
    });

    return {
      success: false,
      error: 'ALREADY_CHECKED_IN',
      message: `Student Roll #${parsedRoll} has already checked in for this session.`
    };
  }

  // 5. Successful check-in registration
  const checkedInRecord = {
    studentId,
    rollNumber: parsedRoll,
    name: studentName || `Student #${parsedRoll}`,
    timestamp: new Date().toISOString(),
    ip: clientIp,
    status: 'present',
    flag: null
  };

  session.checkedInStudents.set(studentId, checkedInRecord);
  session.auditLog.push({
    event: 'CHECKIN_SUCCESS',
    timestamp: new Date().toISOString(),
    clientIp,
    rollNumber: parsedRoll,
    details: `Roll #${parsedRoll} (${checkedInRecord.name}) verified and recorded`
  });

  return {
    success: true,
    studentId,
    rollNumber: parsedRoll,
    name: checkedInRecord.name,
    checkedInAt: checkedInRecord.timestamp
  };
}

function getSessionStatus(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }

  const now = Date.now();
  if (session.status === 'active' && now > session.expiresAt) {
    session.status = 'expired';
  }

  return {
    success: true,
    session: sanitizeSession(session)
  };
}

function manualOverride(params = {}, clientIp = '127.0.0.1') {
  const { sessionId, studentId, status, flag } = params;
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }

  let record = session.checkedInStudents.get(studentId);
  if (!record) {
    // If student hadn't checked in, faculty can manually add them
    const roll = parseInt(params.rollNumber, 10);
    record = {
      studentId,
      rollNumber: !isNaN(roll) ? roll : 0,
      name: params.studentName || 'Student',
      timestamp: new Date().toISOString(),
      ip: clientIp + ' (faculty override)',
      status: status || 'present',
      flag: flag || null
    };
    session.checkedInStudents.set(studentId, record);
  } else {
    if (status) record.status = status;
    if (flag !== undefined) record.flag = flag;
  }

  session.auditLog.push({
    event: 'MANUAL_FACULTY_OVERRIDE',
    timestamp: new Date().toISOString(),
    clientIp,
    details: `Faculty manually adjusted status of student ${studentId} to "${status || record.status}"`
  });

  return { success: true, record };
}

function endSession(sessionId, clientIp = '127.0.0.1') {
  const session = sessions.get(sessionId);
  if (!session) {
    return { success: false, error: 'SESSION_NOT_FOUND' };
  }

  session.status = 'ended';
  session.currentToken = null;
  session.previousTokens.clear();

  session.auditLog.push({
    event: 'SESSION_ENDED',
    timestamp: new Date().toISOString(),
    clientIp,
    details: `Session finalized by faculty. Total verified check-ins: ${session.checkedInStudents.size}`
  });

  return {
    success: true,
    session: sanitizeSession(session)
  };
}

function sanitizeSession(session) {
  const now = Date.now();
  return {
    id: session.id,
    subjectId: session.subjectId,
    sessionType: session.sessionType,
    date: session.date,
    startTime: session.startTime,
    experimentTitle: session.experimentTitle,
    durationMinutes: session.durationMinutes,
    rotationIntervalSec: session.rotationIntervalSec,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    remainingSeconds: Math.max(0, Math.round((session.expiresAt - now) / 1000)),
    token: session.currentToken,
    tokenExpiresAt: session.tokenExpiresAt,
    tokenRemainingSeconds: Math.max(0, Math.round((session.tokenExpiresAt - now) / 1000)),
    status: session.status,
    checkedInStudents: Array.from(session.checkedInStudents.values()),
    checkedInCount: session.checkedInStudents.size,
    auditLog: session.auditLog.slice(-30)
  };
}

// HTTP request handler for server.js
function handleApiRequest(req, res, parsedUrl) {
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  const pathname = parsedUrl.pathname;

  function json(status, data) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(data));
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Health check
  if (pathname === '/api/qr/health' && req.method === 'GET') {
    json(200, {
      status: 'ok',
      backend: 'attendify-trusted-node-backend',
      serverTime: new Date().toISOString(),
      activeSessions: sessions.size
    });
    return;
  }

  // GET Session status
  if (pathname === '/api/qr/session/status' && req.method === 'GET') {
    const sessionId = parsedUrl.searchParams.get('sessionId');
    const result = getSessionStatus(sessionId);
    json(result.success ? 200 : 404, result);
    return;
  }

  // POST requests require body
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let payload = {};
    if (body) {
      try { payload = JSON.parse(body); } catch (e) {
        json(400, { success: false, error: 'INVALID_JSON' });
        return;
      }
    }

    if (pathname === '/api/qr/session/start' && req.method === 'POST') {
      const result = startSession(payload, clientIp);
      json(200, result);
    } else if (pathname === '/api/qr/session/rotate' && req.method === 'POST') {
      const result = rotateToken(payload.sessionId, clientIp);
      json(result.success ? 200 : 400, result);
    } else if (pathname === '/api/qr/session/checkin' && req.method === 'POST') {
      const result = checkin(payload, clientIp);
      json(result.success ? 200 : 400, result);
    } else if (pathname === '/api/qr/session/end' && req.method === 'POST') {
      const result = endSession(payload.sessionId, clientIp);
      json(result.success ? 200 : 400, result);
    } else if (pathname === '/api/qr/session/correct' && req.method === 'POST') {
      const result = manualOverride(payload, clientIp);
      json(result.success ? 200 : 400, result);
    } else {
      json(404, { success: false, error: 'NOT_FOUND', message: 'API route not found' });
    }
  });
}

module.exports = {
  startSession,
  rotateToken,
  checkin,
  getSessionStatus,
  manualOverride,
  endSession,
  handleApiRequest,
  _resetStore: () => { sessions.clear(); rateLimits.clear(); }
};
