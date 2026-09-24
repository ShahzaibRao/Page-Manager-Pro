// Auth: email/password (bcrypt) + Google (GIS id_token verify) + JWT httpOnly cookie sessions.
// FB tokens per-user AES-256-GCM vault me. Legacy single-user data pehle user ko adopt hota hai.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('./db');

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-change-me-in-prod';
const COOKIE = 'pmp_session';

// token encryption key: TOKEN_KEY (64 hex) warna SESSION_SECRET se derived
function tokenKey() {
  if (process.env.TOKEN_KEY && /^[0-9a-f]{64}$/i.test(process.env.TOKEN_KEY)) {
    return Buffer.from(process.env.TOKEN_KEY, 'hex');
  }
  return crypto.scryptSync(SESSION_SECRET, 'pmp-token-vault', 32);
}
function encToken(plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return iv.toString('hex') + ':' + c.getAuthTag().toString('hex') + ':' + enc.toString('hex');
}
function decToken(stored) {
  const [iv, tag, data] = String(stored || '').split(':');
  if (!iv || !tag || !data) return '';
  const d = crypto.createDecipheriv('aes-256-gcm', tokenKey(), Buffer.from(iv, 'hex'));
  d.setAuthTag(Buffer.from(tag, 'hex'));
  return d.update(Buffer.from(data, 'hex'), undefined, 'utf8') + d.final('utf8');
}

const hashPw = (pw) => bcrypt.hashSync(String(pw), 10);
const checkPw = (pw, h) => { try { return bcrypt.compareSync(String(pw), h || ''); } catch { return false; } };
const signSession = (userId) => jwt.sign({ uid: userId }, SESSION_SECRET, { expiresIn: '30d' });
function getCookie(req, name) {
  try {
    const h = req.headers.cookie || '';
    const m = h.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  } catch { return ''; }
}
function authUser(req) {
  try {
    const t = getCookie(req, COOKIE) || (req.headers.authorization || '').replace(/^Bearer /i, '');
    if (!t) return null;
    const d = jwt.verify(t, SESSION_SECRET);
    return db.prepare('SELECT id, email, name, provider, created_at FROM users WHERE id=?').get(d.uid) || null;
  } catch { return null; }
}
function requireAuth(req, res, next) {
  if (req.path === '/api/health' || req.path.startsWith('/api/auth/')) return next();
  if (!req.path.startsWith('/api/')) return next();
  const u = authUser(req);
  if (!u) return res.status(401).json({ need_login: true, error: 'Login required' });
  req.user = u;
  next();
}

// legacy adopt: pehle user ko purana (user_id NULL) data + .env token de do
function adoptLegacy(userId) {
  try {
    const nUsers = db.prepare('SELECT COUNT(*) c FROM users').get().c;
    if (nUsers !== 1) return;
    for (const t of ['businesses', 'pages', 'posts', 'logs', 'watchers', 'instant_watchers']) {
      try { db.prepare(`UPDATE ${t} SET user_id=? WHERE user_id IS NULL`).run(userId); } catch {}
    }
    const has = db.prepare('SELECT user_id FROM user_tokens WHERE user_id=?').get(userId);
    if (!has && process.env.FB_SYSTEM_USER_TOKEN) {
      db.prepare('INSERT INTO user_tokens (user_id, token_enc, business_id) VALUES (?,?,?)').run(
        userId, encToken(process.env.FB_SYSTEM_USER_TOKEN), process.env.FB_BUSINESS_ID || '');
    }
  } catch {}
}

// user ka FB token (vault) — nahi mila to null (env fallback SIRF user-less legacy mode me)
function getUserToken(userId) {
  try {
    const r = db.prepare('SELECT token_enc FROM user_tokens WHERE user_id=?').get(userId);
    if (r && r.token_enc) return decToken(r.token_enc);
  } catch {}
  try {
    if (db.prepare('SELECT COUNT(*) c FROM users').get().c === 0 && process.env.FB_SYSTEM_USER_TOKEN) {
      return process.env.FB_SYSTEM_USER_TOKEN;
    }
  } catch {}
  return '';
}

let googleClient = null;
async function verifyGoogle(credential) {
  const cid = process.env.GOOGLE_CLIENT_ID || '';
  if (!cid) throw new Error('Google login server pe configure nahi (GOOGLE_CLIENT_ID)');
  if (!googleClient) googleClient = new OAuth2Client(cid);
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: cid });
  const p = ticket.getPayload() || {};
  if (!p.email) throw new Error('Google email nahi mili');
  return { email: p.email, name: p.name || p.email.split('@')[0] };
}

module.exports = {
  COOKIE, hashPw, checkPw, signSession, authUser, requireAuth,
  adoptLegacy, getUserToken, verifyGoogle, encToken,
};
