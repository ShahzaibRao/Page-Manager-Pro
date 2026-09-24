require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const fb = require('./fb');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;
// CORS: FRONTEND_URL set ho to strict allowlist (comma-separated), warna request Origin reflect.
// (Same-origin proxy ke baad browser origin hamesha frontend ka apna host hota hai,
//  is liye IP change pe .env chherna nahi parta. Auth phase me strict allowlist hogi.)
const ALLOWED = (process.env.FRONTEND_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || !ALLOWED.length || ALLOWED.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true, // cookie-based sessions ke liye lazmi (origin echo hota hai, * nahi)
}));
app.use(express.json({ limit: '50mb' }));
app.use(auth.requireAuth); // /api/health + /api/auth/* open, baqi login lazmi

const log = (action, detail = '', uid = null) => {
  try {
    if (uid) db.prepare('INSERT INTO logs (action, detail, user_id) VALUES (?,?,?)').run(action, detail, uid);
    else db.prepare('INSERT INTO logs (action, detail) VALUES (?,?)').run(action, detail);
  } catch {}
};
// tiny TTL cache — repeated tab switches / reloads FB ko dobara hit nahi karte
const __cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = __cache.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v;
  const v = await fn();
  __cache.set(key, { t: Date.now(), v });
  if (__cache.size > 200) for (const k of [...__cache.keys()].slice(0, 50)) __cache.delete(k);
  return v;
}
const clearCache = () => __cache.clear();
const row = (pageId, uid) => uid === undefined
  ? db.prepare('SELECT * FROM pages WHERE id=? OR fb_page_id=?').get(pageId, pageId)
  : db.prepare('SELECT * FROM pages WHERE (id=? AND user_id=?) OR (fb_page_id=? AND user_id=?)').get(pageId, uid, pageId, uid);
// current user ka FB token (vault) — legacy: koi user nahi to .env
const utoken = (req) => (req.user ? auth.getUserToken(req.user.id) : (process.env.FB_SYSTEM_USER_TOKEN || ''));
const needToken = (req, res) => {
  const t = utoken(req);
  if (!t) { notConn(res); return null; }
  return t;
};
const notConn = (res) => res.status(409).json({ not_connected: true, error: 'System User Token connect nahi hai. Settings > Connect Business Manager me token lagayein.' });

// (global .env token write REMOVED — multi-user me token sirf per-user vault me jata hai)

// ---------- Health ----------
app.get('/api/health', (req, res) => res.json({
  ok: true, time: new Date().toISOString(), tz: process.env.TIMEZONE || 'Asia/Karachi',
  // per-user truth: env token doosre users ko "connected" nahi dikhayega
  connected: req.user ? !!utoken(req) : fb.isConnected(),
}));

// ---------- Auth (email + Google) ----------
const setSession = (res, userId) => {
  res.cookie(auth.COOKIE, auth.signSession(userId), {
    httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000, secure: false, path: '/',
  });
};
app.get('/api/auth/config', (req, res) => res.json({
  google: !!(process.env.GOOGLE_CLIENT_ID || ''),
  google_client_id: process.env.GOOGLE_CLIENT_ID || '',
}));
app.post('/api/auth/signup', (req, res) => {
  const { email = '', password = '', name = '' } = req.body || {};
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Sahi email dein' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password min 6 characters' });
  try {
    const st = db.prepare('INSERT INTO users (email,name,password_hash,provider) VALUES (?,?,?,?)').run(
      email.toLowerCase().trim(), String(name || '').slice(0, 60) || email.split('@')[0], auth.hashPw(password), 'email');
    const user = db.prepare('SELECT id, email, name, provider, created_at FROM users WHERE id=?').get(st.lastInsertRowid);
    auth.adoptLegacy(user.id);
    setSession(res, user.id);
    log('signup', `${user.email} joined`, user.id);
    res.json({ user });
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE')) return res.status(409).json({ error: 'Ye email registered hai — login karein' });
    res.status(500).json({ error: 'Signup failed' });
  }
});
app.post('/api/auth/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(email).toLowerCase().trim());
  if (!user || user.provider !== 'email' || !auth.checkPw(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ya password ghalat' });
  }
  auth.adoptLegacy(user.id);
  setSession(res, user.id);
  log('login', `${user.email}`, user.id);
  res.json({ user: { id: user.id, email: user.email, name: user.name, provider: user.provider, created_at: user.created_at } });
});
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential = '' } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Google credential missing' });
    const g = await auth.verifyGoogle(credential);
    let user = db.prepare('SELECT * FROM users WHERE email=?').get(g.email.toLowerCase());
    if (!user) {
      const st = db.prepare('INSERT INTO users (email,name,password_hash,provider) VALUES (?,?,?,?)').run(g.email.toLowerCase(), g.name, '', 'google');
      user = db.prepare('SELECT * FROM users WHERE id=?').get(st.lastInsertRowid);
      log('signup', `${user.email} joined (google)`, user.id);
    }
    auth.adoptLegacy(user.id);
    setSession(res, user.id);
    res.json({ user: { id: user.id, email: user.email, name: user.name, provider: user.provider, created_at: user.created_at } });
  } catch (e) {
    res.status(401).json({ error: e.message || 'Google login failed' });
  }
});
app.get('/api/auth/me', (req, res) => {
  const u = auth.authUser(req);
  if (!u) return res.status(401).json({ need_login: true });
  res.json({ user: u });
});
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(auth.COOKIE, { path: '/' });
  res.json({ ok: true });
});

// ---------- Module A: Connect + Sync (REAL) ----------
// user ka vault business id
function getUserBiz(userId) {
  try {
    const r = db.prepare('SELECT business_id FROM user_tokens WHERE user_id=?').get(userId);
    return (r && r.business_id) || '';
  } catch { return ''; }
}

async function syncWithRetry(token, userId, userBiz) {
  let r = await syncFromFB(token, userId, userBiz);
  if (r.pages === 0) {
    // FB edge kabhi transiently khali deta hai — ek retry
    await new Promise((res) => setTimeout(res, 3000));
    r = await syncFromFB(token, userId, userBiz);
    if (r.pages > 0) r.notes.push('pehli try khali thi, retry pe mil gaye');
  }
  return r;
}

// POST /api/connect {token, business_id?} — validate, VAULT me save, sync
app.post('/api/connect', async (req, res) => {
  const { token, business_id } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token required (System User Token)' });
  try {
    const me = await fb.validateToken(token);
    db.prepare('INSERT OR REPLACE INTO user_tokens (user_id, token_enc, business_id) VALUES (?,?,?)')
      .run(req.user.id, auth.encToken(token), business_id || '');
    const result = await syncWithRetry(token, req.user.id, business_id || '');
    clearCache();
    log('connected', `System User: ${me.name} (${me.id}) — ${result.pages} pages synced`, req.user.id);
    res.json({ ok: true, me, ...result });
  } catch (e) {
    res.status(401).json({ error: 'Token invalid ya FB unreachable', detail: fb.fbErr(e) });
  }
});

// POST /api/sync — dobara FB se businesses+pages kheenchna
app.post('/api/sync', async (req, res) => {
  const t = utoken(req);
  if (!t) return notConn(res);
  try {
    const result = await syncWithRetry(t, req.user.id, getUserBiz(req.user.id));
    clearCache(); // fresh sync → purana cached data invalid
    log('synced', `${result.pages} pages synced`, req.user.id);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(502).json({ error: 'Sync failed', detail: fb.fbErr(e) });
  }
});

// POST /api/disconnect — SIRF is user ka token + synced pages saaf (doosre users untouched)
app.post('/api/disconnect', (req, res) => {
  const uid = req.user.id;
  db.prepare('DELETE FROM user_tokens WHERE user_id=?').run(uid);
  db.prepare('DELETE FROM pages WHERE user_id=?').run(uid);
  db.prepare('DELETE FROM businesses WHERE user_id=?').run(uid);
  clearCache();
  log('disconnected', 'Token removed, synced pages cleared', uid);
  res.json({ ok: true });
});

async function syncFromFB(token, userId, userBiz) {
  const t = token || (userId ? auth.getUserToken(userId) : fb.getToken());
  const seen = new Map(); // fb_page_id -> page obj
  let businesses = [];
  const notes = [];

  // 1) businesses (business_management ho to)
  try {
    businesses = await fb.getBusinesses(t);
  } catch (e) { notes.push('businesses edge unavailable (business_management permission chahiye ya System User ko business role dein)'); }
  // fallback: .env me fixed business id ho to use hamesha include karo (flaky edge se bachao)
  const fixedBiz = userBiz || process.env.FB_BUSINESS_ID || '';
  if (fixedBiz && !businesses.find((b) => b.id === fixedBiz)) {
    try {
      const axios = require('axios');
      const { data } = await axios.get(`https://graph.facebook.com/${process.env.FB_API_VERSION || 'v20.0'}/${fixedBiz}`, {
        params: { access_token: t, fields: 'id,name' }, timeout: 20000,
      });
      businesses.push(data);
    } catch (e) { notes.push('fixed Business ID read fail'); }
  }
  for (const b of businesses) {
    // per-user row id taake shared BM pe doosre user ki row overwrite na ho
    const bizRowId = userId ? `${userId}:${b.id}` : b.id;
    if (userId) db.prepare('INSERT OR REPLACE INTO businesses (id,name,user_id) VALUES (?,?,?)').run(bizRowId, b.name, userId);
    else db.prepare('INSERT OR REPLACE INTO businesses (id,name) VALUES (?,?)').run(b.id, b.name);
    try {
      for (const p of await fb.getBusinessPages(b.id, t)) {
        if (!seen.has(p.id)) seen.set(p.id, { ...p, business_id: b.id });
        else if (!seen.get(p.id).business_id || seen.get(p.id).business_id === 'direct') seen.get(p.id).business_id = b.id;
      }
    } catch (e) { notes.push(`business ${b.name}: pages read fail`); }
  }

  // 2) direct pages via /me/accounts (pages_show_list) — business ke baghair bhi
  try {
    const direct = await fb.getDirectPages(t);
    if (!direct.length) notes.push('/me/accounts khali — System User ko Pages ke assets/permissions dein');
    for (const p of direct) {
      if (seen.has(p.id)) {
        const old = seen.get(p.id);
        if (p.access_token) old.page_token = p.access_token;
      } else {
        seen.set(p.id, { ...p, business_id: p.business_id || (businesses[0] ? businesses[0].id : 'direct'), page_token: p.access_token || '' });
      }
    }
  } catch (e) { notes.push('/me/accounts fail (pages_show_list permission chahiye): ' + JSON.stringify(fb.fbErr(e)).slice(0, 150)); }

  if (!businesses.length && seen.size) {
    if (userId) db.prepare("INSERT OR REPLACE INTO businesses (id,name,user_id) VALUES (?,?,?)").run(`${userId}:direct`, 'Direct Pages (no Business edge)', userId);
    else db.prepare("INSERT OR REPLACE INTO businesses (id,name) VALUES ('direct','Direct Pages (no Business edge)')").run();
  }

  let pageCount = 0;
  const getOld = userId
    ? db.prepare('SELECT page_token, can_post FROM pages WHERE fb_page_id=? AND user_id=?')
    : db.prepare('SELECT page_token, can_post FROM pages WHERE fb_page_id=?');
  const putPage = userId
    ? db.prepare(`INSERT OR REPLACE INTO pages
      (id,fb_page_id,name,category,business_id,followers_count,is_published,verification_status,link,picture_url,page_token,can_post,user_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    : db.prepare(`INSERT OR REPLACE INTO pages
      (id,fb_page_id,name,category,business_id,followers_count,is_published,verification_status,link,picture_url,page_token,can_post)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const p of seen.values()) {
    const pic = (p.picture && p.picture.data && p.picture.data.url) || p.picture_url || '';
    // purana token mehfooz rakho (business edges me token nahi hota)
    let tok = p.page_token || '';
    if (!tok) {
      const old = userId ? getOld.get(p.id, userId) : getOld.get(p.id);
      if (old && old.page_token) tok = old.page_token;
    }
    putPage.run(
      (userId ? `${userId}:pg_` : 'pg_') + p.id, p.id, p.name, p.category || '', p.business_id || 'direct',
      p.followers_count || 0, p.is_published ? 1 : 0, p.verification_status || '',
      p.link || '', pic, tok, tok ? 1 : 0, ...(userId ? [userId] : [])
    );
    pageCount++;
  }

  // 3) page-token backfill — BATCH (?ids=, 50 per call) taake hazaron pages pe bhi fast ho
  let filled = 0;
  try {
    const missing = (userId
      ? db.prepare("SELECT fb_page_id FROM pages WHERE (page_token='' OR page_token IS NULL) AND user_id=?").all(userId)
      : db.prepare("SELECT fb_page_id FROM pages WHERE page_token='' OR page_token IS NULL").all()
    ).map((r) => r.fb_page_id);
    if (missing.length) {
      const got = await fb.getPageTokensBatch(missing, t);
      const upd = userId
        ? db.prepare('UPDATE pages SET page_token=?, can_post=1 WHERE fb_page_id=? AND user_id=?')
        : db.prepare('UPDATE pages SET page_token=?, can_post=1 WHERE fb_page_id=?');
      for (const [id, tk] of Object.entries(got)) {
        if (userId) upd.run(tk, id, userId); else upd.run(tk, id);
        filled++;
      }
    }
  } catch {}
  if (filled) notes.push(`${filled} pages ke page-tokens backfill hue`);

  const withAccess = (userId
    ? db.prepare('SELECT COUNT(*) c FROM pages WHERE can_post=1 AND user_id=?').get(userId)
    : db.prepare('SELECT COUNT(*) c FROM pages WHERE can_post=1').get()).c;
  const total = (userId
    ? db.prepare('SELECT COUNT(*) c FROM pages WHERE user_id=?').get(userId)
    : db.prepare('SELECT COUNT(*) c FROM pages').get()).c;
  if (pageCount === 0 && total > 0) notes.push('FB se is dafa koi page nahi mila — purana synced data mehfooz hai');
  if (pageCount === 0 && total === 0) notes.push('FB se koi page nahi mila — System User ko pages ke assets dein ya dobara Sync karein');
  return { businesses: businesses.length || (seen.size ? 1 : 0), pages: total, with_access: withAccess, notes };
}

// page_token KABHI frontend ko nahi jata (server-side only)
const PUB_COLS = 'id,fb_page_id,name,category,business_id,followers_count,is_published,verification_status,link,picture_url,can_post';
const lastSyncAt = (uid) => {
  try {
    const r = uid === undefined
      ? db.prepare("SELECT created_at FROM logs WHERE action IN ('synced','connected') ORDER BY id DESC LIMIT 1").get()
      : db.prepare("SELECT created_at FROM logs WHERE action IN ('synced','connected') AND (user_id=? OR user_id IS NULL) ORDER BY id DESC LIMIT 1").get(uid);
    return (r && r.created_at) || '';
  } catch { return ''; }
};

app.get('/api/businesses', (req, res) => {
  const uid = req.user.id;
  const businesses = db.prepare('SELECT * FROM businesses WHERE user_id=?').all(uid).map(b => ({
    ...b,
    pages: db.prepare(`SELECT ${PUB_COLS} FROM pages WHERE business_id=? AND user_id=?`).all(b.id, uid),
    status: utoken(req) ? 'Connected (Live)' : 'Not Connected',
  }));
  res.json({ connected: !!utoken(req), businesses, synced_at: lastSyncAt(req.user.id) });
});
app.get('/api/pages', (req, res) => {
  const uid = req.user.id;
  if (!utoken(req) && db.prepare('SELECT COUNT(*) c FROM pages WHERE user_id=?').get(uid).c === 0) return notConn(res);
  if (req.query.posting === '1') {
    return res.json({ pages: db.prepare(`SELECT ${PUB_COLS} FROM pages WHERE can_post=1 AND user_id=? ORDER BY name`).all(uid), synced_at: lastSyncAt(uid) });
  }
  res.json({ pages: db.prepare(`SELECT ${PUB_COLS} FROM pages WHERE user_id=? ORDER BY name`).all(uid), synced_at: lastSyncAt(uid) });
});
app.get('/api/pages/:id', (req, res) => {
  const p = db.prepare(`SELECT ${PUB_COLS} FROM pages WHERE (id=? OR fb_page_id=?) AND user_id=?`).get(req.params.id, req.params.id, req.user.id);
  if (!p) return res.status(404).json({ error: 'Page not found' });
  res.json({ page: p });
});

// ---------- Module B: Post & Schedule (REAL FB publish, files included) ----------
const multer = require('multer');
const DATA_DIR = process.env.DATA_DIR || __dirname;
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const d = path.join(DATA_DIR, 'uploads');
      try { fs.mkdirSync(d, { recursive: true }); } catch {}
      cb(null, d);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')),
  }),
  fileFilter: (req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype || '')) cb(null, true);
    else cb(new Error('Sirf photo/video files allowed'));
  },
  limits: { fileSize: 4 * 1024 * 1024 * 1024, files: 10 },
});
const cleanupFiles = (paths) => { for (const f of paths || []) { try { fs.unlinkSync(f); } catch {} } };
const isVideoFile = (f) => /^video\//.test(f.mimetype || '') || /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(f.originalname || f.path || '');
const getPost = (id) => db.prepare('SELECT * FROM posts WHERE id=?').get(id);

// shared: local files → FB publish (endpoint + cron dono)
async function publishFilesNow(page, { message, files, post_as }) {
  const pt = page.page_token || undefined;
  const imgs = files.filter((f) => !isVideoFile(f));
  const vids = files.filter(isVideoFile);
  if (vids.length > 1) throw new Error('Ek post me sirf 1 video allowed');
  if (vids.length && imgs.length) throw new Error('Video ke sath photos mix nahi — alag post banayein');
  if (vids.length) {
    const v = vids[0];
    if (post_as === 'reel') {
      try {
        const r = await fb.publishReelFile(page.fb_page_id, v.path, message, pt);
        return { fb: r };
      } catch (e) {
        const r = await fb.uploadVideoFile(page.fb_page_id, v.path, message, pt);
        return { fb: r, note: 'Reel upload fail — normal video post ho gaya' };
      }
    }
    return { fb: await fb.uploadVideoFile(page.fb_page_id, v.path, message, pt) };
  }
  if (imgs.length === 1) {
    return { fb: await fb.uploadPhotoFile(page.fb_page_id, imgs[0].path, message, {}, pt) };
  }
  const ids = [];
  for (const img of imgs) {
    const u = await fb.uploadPhotoFile(page.fb_page_id, img.path, '', { unpublished: true }, pt);
    if (!u.id) throw new Error('Photo upload fail');
    ids.push(u.id);
  }
  return { fb: await fb.publishFeedWithMedia(page.fb_page_id, message, ids, pt) };
}

app.post('/api/posts', upload.array('files', 10), async (req, res) => {
  const files = req.files || [];
  const paths = files.map((f) => f.path);
  const uid = req.user.id;
  if (!utoken(req)) { cleanupFiles(paths); return notConn(res); }
  const { page_id, message = '', type = 'text', link_url = '', photo_url = '', scheduled_time = '', post_as = 'feed' } = req.body || {};
  const page = row(page_id, uid);
  if (!page) { cleanupFiles(paths); return res.status(404).json({ error: 'Page not found' }); }
  if (!String(message || '').trim() && !photo_url && !link_url && !files.length) { cleanupFiles(paths); return res.status(400).json({ error: 'Message, photo, video ya link required' }); }
  const isSched = scheduled_time && new Date(scheduled_time) > new Date();
  const kind = files.length ? (files.some(isVideoFile) ? 'video' : 'photo') : (photo_url ? 'photo' : (link_url ? 'link' : 'text'));
  const filePaths = JSON.stringify(paths);
  const saveRow = (fbId, status, schedISO, err) => db.prepare(
    `INSERT INTO posts (fb_post_id,page_id,message,type,link_url,status,scheduled_time,error_note,file_paths,post_as,insights_json,created_at,user_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    fbId || '', page.id, message, kind === 'video' && post_as === 'reel' ? 'reel' : kind, link_url,
    status, schedISO || '', err || '', filePaths, post_as, '{}', new Date().toISOString(), uid
  );

  // VIDEO + schedule → local queue (cron time pe file upload karega)
  if (files.length && kind === 'video' && isSched) {
    const st = saveRow('', 'scheduled', new Date(scheduled_time).toISOString(), '');
    log('post_scheduled', `${page.name}: ${post_as} video file queued`, uid);
    return res.json({ post: getPost(st.lastInsertRowid), note: 'Video schedule ho gayi — time pe auto-upload hogi' });
  }

  try {
    if (files.length) {
      if (isSched) {
        // PHOTOS FB pe schedule
        const pt = page.page_token || undefined;
        const imgs = files.filter((f) => !isVideoFile(f));
        let r;
        if (imgs.length === 1 && imgs.length === files.length) {
          r = await fb.uploadPhotoFile(page.fb_page_id, imgs[0].path, message, { scheduled_time }, pt);
        } else {
          const ids = [];
          for (const img of imgs) {
            const u = await fb.uploadPhotoFile(page.fb_page_id, img.path, '', { unpublished: true }, pt);
            if (!u.id) throw new Error('Photo upload fail');
            ids.push(u.id);
          }
          r = await fb.scheduleFeedWithMedia(page.fb_page_id, message, ids, scheduled_time, pt);
        }
        cleanupFiles(paths);
        const st = saveRow(r.id || '', 'scheduled', new Date(scheduled_time).toISOString(), '');
        log('post_scheduled', `${page.name}: photo post scheduled (${message.slice(0, 60)})`, uid);
        return res.json({ post: getPost(st.lastInsertRowid), fb: r });
      }
      // files abhi publish
      const out = await publishFilesNow(page, { message, files, post_as });
      cleanupFiles(paths);
      const st = saveRow(out.fb.id || out.fb.post_id || '', 'published', '', '');
      log('post_published', `${page.name}: ${kind} file post (fb:${out.fb.id || out.fb.post_id})`, uid);
      return res.json({ post: getPost(st.lastInsertRowid), fb: out.fb, note: out.note });
    }
    if (isSched) {
      // FB pe schedule (FB khud publish karega) + local copy
      const r = await fb.scheduleOnFB(page.fb_page_id, { message, link_url, photo_url, scheduled_time }, page.page_token || undefined);
      const st = saveRow(r.id || '', 'scheduled', new Date(scheduled_time).toISOString(), '');
      log('post_scheduled', `${page.name}: ${message.slice(0, 80)}`, uid);
      return res.json({ post: getPost(st.lastInsertRowid), fb: r });
    }
    // abhi publish
    const r = await fb.publishNow(page.fb_page_id, { message, link_url, photo_url }, page.page_token || undefined);
    const st = saveRow(r.id || r.post_id || '', 'published', '', '');
    log('post_published', `${page.name}: ${message.slice(0, 80)} (fb:${r.id || r.post_id})`, uid);
    res.json({ post: getPost(st.lastInsertRowid), fb: r });
  } catch (e) {
    // schedule fail ho to local queue me rakho taake cron retry kare (sirf text/link wale)
    if (isSched && !files.length) {
      const st = saveRow('', 'scheduled', new Date(scheduled_time).toISOString(), 'FB schedule fail — cron retry karega');
      log('schedule_queued_local', `${page.name}: FB error, local queue me`, uid);
      return res.json({ post: getPost(st.lastInsertRowid), warning: fb.fbErr(e) });
    }
    if (files.length) cleanupFiles(paths);
    try { log('post_failed', `${page ? page.name : page_id}: ${(e.message || JSON.stringify(fb.fbErr(e))).slice(0, 200)}`); } catch {}
    res.status(502).json({ error: 'FB publish failed', detail: fb.fbErr(e) });
  }
});

app.get('/api/posts', (req, res) => {
  const uid = req.user.id;
  const { page_id, status } = req.query;
  let q = 'SELECT * FROM posts WHERE user_id=?', w = [], p = [uid];
  if (page_id) { w.push('(page_id=? OR page_id=(SELECT id FROM pages WHERE fb_page_id=? AND user_id=?))'); p.push(page_id, page_id, uid); }
  if (status) { w.push('status=?'); p.push(status); }
  if (w.length) q += ' AND ' + w.join(' AND ');
  q += ' ORDER BY created_at DESC';
  res.json({ posts: db.prepare(q).all(...p) });
});

// local queue + FB scheduled_posts combined
app.get('/api/fb/:pageId/scheduled_posts', async (req, res) => {
  const page = row(req.params.pageId, req.user.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  const local = db.prepare("SELECT * FROM posts WHERE page_id=? AND user_id=? AND status='scheduled' ORDER BY scheduled_time").all(page.id, req.user.id);
  let remote = [];
  if (utoken(req)) remote = await fb.getScheduledPosts(page.fb_page_id, page.page_token || undefined);
  res.json({ local, remote });
});

app.delete('/api/posts/:id', async (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.fb_post_id && utoken(req)) {
    const pg = db.prepare('SELECT * FROM pages WHERE id=?').get(post.page_id);
    try { await fb.deletePost(post.fb_post_id, (pg && pg.page_token) || undefined); } catch (e) { /* local se phir bhi delete */ }
  }
  db.prepare('DELETE FROM posts WHERE id=?').run(post.id);
  log('post_deleted', `Post #${post.id} deleted`, req.user.id);
  res.json({ ok: true });
});

// ---------- Module C: Health & Monetization (REAL) ----------
app.get('/api/fb/:pageId/health', async (req, res) => {
  const page = row(req.params.pageId, req.user.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  if (!utoken(req)) return notConn(res);
  try {
    const info = await cached(`health:${page.id}`, 10 * 60 * 1000, () => fb.getPageInfo(page.fb_page_id, page.page_token || undefined));
    db.prepare('UPDATE pages SET followers_count=?, is_published=?, verification_status=? WHERE id=?')
      .run(info.followers_count || 0, info.is_published ? 1 : 0, info.verification_status || '', page.id);
    res.json({ mode: 'LIVE', page_status: info });
  } catch (e) { res.status(502).json({ error: 'FB Graph error', detail: fb.fbErr(e) }); }
});

app.get('/api/fb/:pageId/monetization', async (req, res) => {
  const page = row(req.params.pageId, req.user.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  if (!utoken(req)) return notConn(res);
  try {
    const m = await fb.getMonetization(page.fb_page_id, page.followers_count || 0, page.page_token || undefined);
    res.json(m);
  } catch (e) { res.status(502).json({ error: 'FB Graph error', detail: fb.fbErr(e) }); }
});

// ---------- Module D: Insights (REAL) ----------
app.get('/api/fb/:pageId/insights', async (req, res) => {
  const page = row(req.params.pageId, req.user.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  if (!utoken(req)) return notConn(res);
  const days = [7, 28, 90].includes(+req.query.range) ? +req.query.range : 28;
  try {
    const data = await cached(`insights:${page.id}:${days}`, 5 * 60 * 1000, async () => {
      const pt = page.page_token || undefined;
      // followers + series parallel (pehle sequential thay)
      const [info, series] = await Promise.all([
        fb.getPageInfo(page.fb_page_id, pt).catch(() => null),
        fb.getPageInsights(page.fb_page_id, days, pt),
      ]);
      let followers = page.followers_count || 0;
      if (info) {
        followers = info.followers_count ?? info.fan_count ?? followers;
        try { db.prepare('UPDATE pages SET followers_count=? WHERE id=?').run(followers, page.id); } catch {}
      }
      return { followers, series };
    });
    const { followers, series } = data;
    const byDate = {};
    const push = (arr, key) => {
      if (!Array.isArray(arr)) return;
      for (const v of arr) {
        const d = (v.end_time || '').slice(0, 10);
        if (!d) continue;
        byDate[d] = byDate[d] || {};
        byDate[d][key] = v.value || 0;
      }
    };
    push(series.views, 'reach');
    push(series.engagements, 'engagement');
    const labels = Object.keys(byDate).sort();
    const reach = labels.map((d) => byDate[d].reach || 0);
    const engagement = labels.map((d) => byDate[d].engagement || 0);
    let videoViews = 0;
    if (Array.isArray(series.video)) for (const v of series.video) videoViews += v.value || 0;
    res.json({
      mode: 'LIVE', range_days: days,
      metric_labels: { reach: 'Page Views', engagement: 'Post Engagements' },
      kpis: {
        followers,
        reach: reach.reduce((a, b) => a + b, 0),
        engagement: engagement.reduce((a, b) => a + b, 0),
        video_views_3s: videoViews,
      },
      series: { labels: labels.map((d) => d.slice(5)), reach, engagement },
      warnings: [
        ...(Array.isArray(series.views) ? [] : ['page views unavailable']),
        ...(Array.isArray(series.engagements) ? [] : ['post engagements unavailable']),
      ],
    });
  } catch (e) { res.status(502).json({ error: 'FB Graph error', detail: fb.fbErr(e) }); }
});

// ---------- Module E: Viral / Top posts (REAL) ----------
app.get('/api/fb/:pageId/top-posts', async (req, res) => {
  const page = row(req.params.pageId, req.user.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  if (!utoken(req)) return notConn(res);
  const sort = req.query.sort === 'engagement' ? 'engagement' : 'reach';
  try {
    const out = await cached(`top:${page.id}:${sort}`, 3 * 60 * 1000, async () => {
      const raw = await fb.getPagePosts(page.fb_page_id, 25, page.page_token || undefined);
      // per-post reach PARALLEL (pehle sequential loop tha — sab se bara bottleneck)
      const lim = fb.pLimit(6);
      const posts = await Promise.all(raw.map((p) => lim(async () => {
        const likes = (p.likes && p.likes.summary && p.likes.summary.total_count) || 0;
        const comments = (p.comments && p.comments.summary && p.comments.summary.total_count) || 0;
        const shares = (p.shares && p.shares.count) || 0;
        const pr = await fb.getPostReach(p.id, page.page_token || undefined);
        const reach = pr ? pr.reach : 0;
        const eng = (pr && pr.eng ? pr.eng : 0) || (likes + comments + shares);
        return {
          fb_post_id: p.id, message: p.message || '', type: p.type || 'post',
          created_time: p.created_time, picture: p.full_picture || '', permalink: p.permalink_url || '',
          reach, likes, comments, shares, engagement: eng,
          rate: reach ? +(eng / reach).toFixed(3) : 0, _hasReach: !!(pr && pr.reach > 0),
        };
      })));
      const reachAvailable = posts.some((p) => p._hasReach);
      const avg = posts.length && reachAvailable ? posts.reduce((a, b) => a + b.reach, 0) / posts.length : 0;
      const sorted = posts.map((p) => ({ ...p, viral: reachAvailable && avg > 0 && p.reach > avg * 2.5 }));
      sorted.sort((a, b) => sort === 'engagement' ? b.rate - a.rate : b.reach - a.reach);
      return { posts: sorted, avg, reachAvailable };
    });
    res.json({
      mode: 'LIVE', avg_reach: Math.round(out.avg), reach_available: out.reachAvailable,
      viral_rule: out.reachAvailable ? 'Reach > Avg Reach x 2.5 = Viral' : 'Reach insights unavailable (read_insights chahiye) — engagement numbers real hain',
      posts: out.posts,
    });
  } catch (e) { res.status(502).json({ error: 'FB Graph error', detail: fb.fbErr(e) }); }
});

// ---------- Module H: GLOBAL overview (sab posting-access pages ka total) ----------
app.get('/api/overview', async (req, res) => {
  if (!utoken(req)) return notConn(res);
  const days = [7, 28, 90].includes(+req.query.range) ? +req.query.range : 28;
  const pages = db.prepare('SELECT * FROM pages WHERE can_post=1 AND user_id=?').all(req.user.id);
  const empty = { mode: 'LIVE', range_days: days, pages: 0,
    metric_labels: { reach: 'Page Views', engagement: 'Post Engagements' },
    kpis: { followers: 0, reach: 0, engagement: 0, video_views_3s: 0 },
    series: { labels: [], reach: [], engagement: [] }, per_page: [] };
  if (!pages.length) return res.json(empty);

  const per = await cached(`overview:${req.user.id}:${days}`, 5 * 60 * 1000, () =>
    Promise.all(pages.map(async (pg) => {
      const pt = pg.page_token || undefined;
      // page info + insights parallel
      const [info, s] = await Promise.all([
        fb.getPageInfo(pg.fb_page_id, pt).catch(() => null),
        fb.getPageInsights(pg.fb_page_id, days, pt).catch(() => ({})),
      ]);
      let followers = pg.followers_count || 0;
      if (info) followers = info.followers_count ?? info.fan_count ?? followers;
      const byDate = {};
      const push = (arr, key) => {
        if (!Array.isArray(arr)) return;
        for (const v of arr) {
          const d = (v.end_time || '').slice(0, 10);
          if (!d) continue;
          byDate[d] = byDate[d] || {};
          byDate[d][key] = (byDate[d][key] || 0) + (v.value || 0);
        }
      };
      push(s.views, 'reach'); push(s.engagements, 'engagement');
      let video = 0;
      if (Array.isArray(s.video)) for (const v of s.video) video += v.value || 0;
    const views = Object.values(byDate).reduce((a, b) => a + (b.reach || 0), 0);
    const engs = Object.values(byDate).reduce((a, b) => a + (b.engagement || 0), 0);
    try { db.prepare('UPDATE pages SET followers_count=? WHERE id=?').run(followers, pg.id); } catch {}
    return { id: pg.id, name: pg.name, followers, views, engagements: engs, video, byDate };
  })));

  // dates union → summed series
  const allDates = [...new Set(per.flatMap((p) => Object.keys(p.byDate)))].sort();
  const reach = allDates.map((d) => per.reduce((a, p) => a + ((p.byDate[d] && p.byDate[d].reach) || 0), 0));
  const engagement = allDates.map((d) => per.reduce((a, p) => a + ((p.byDate[d] && p.byDate[d].engagement) || 0), 0));
  res.json({
    mode: 'LIVE', range_days: days, pages: per.length,
    metric_labels: { reach: 'Page Views', engagement: 'Post Engagements' },
    kpis: {
      followers: per.reduce((a, p) => a + p.followers, 0),
      reach: reach.reduce((a, b) => a + b, 0),
      engagement: engagement.reduce((a, b) => a + b, 0),
      video_views_3s: per.reduce((a, p) => a + p.video, 0),
    },
    series: { labels: allDates.map((d) => d.slice(5)), reach, engagement },
    per_page: per.map(({ byDate, ...rest }) => rest).sort((a, b) => b.followers - a.followers),
  });
});

// ---------- Module H2: GLOBAL viral top posts (sab pages se top N by engagement) ----------
app.get('/api/viral-global', async (req, res) => {
  if (!utoken(req)) return notConn(res);
  const limit = Math.min(25, +req.query.limit || 10);
  const pages = db.prepare('SELECT * FROM pages WHERE can_post=1 AND user_id=?').all(req.user.id);
  const { all, failed } = await cached(`viral:${req.user.id}:${limit}`, 3 * 60 * 1000, async () => {
    const all = [];
    const failed = [];
  await Promise.all(pages.map(async (pg) => {
    try {
      const raw = await fb.getPagePosts(pg.fb_page_id, 10, pg.page_token || undefined);
      for (const p of raw) {
        const likes = (p.likes && p.likes.summary && p.likes.summary.total_count) || 0;
        const comments = (p.comments && p.comments.summary && p.comments.summary.total_count) || 0;
        const shares = (p.shares && p.shares.count) || 0;
        all.push({
          page_id: pg.id, page_name: pg.name,
          fb_post_id: p.id, message: p.message || '',
          created_time: p.created_time, picture: p.full_picture || '', permalink: p.permalink_url || '',
          likes, comments, shares, engagement: likes + comments + shares,
        });
      }
    } catch { failed.push(pg.name); }
  }));
  return { all, failed };
  });
  all.sort((a, b) => b.engagement - a.engagement);
  const avg = all.length ? all.reduce((a, p) => a + p.engagement, 0) / all.length : 0;
  res.json({
    mode: 'LIVE', pages_scanned: pages.length, posts_found: all.length,
    avg_engagement: Math.round(avg),
    rule: 'Ranked by engagement (likes+comments+shares) • Viral = Eng > Avg × 2.5 (post reach insights unavailable)',
    skipped: failed,
    posts: all.slice(0, limit).map((p) => ({ ...p, viral: avg > 0 && p.engagement > avg * 2.5 })),
  });
});

// ---------- Module I: Posting history (auto-folder/creator/manual sab ka daily report) ----------
// GET /api/history?range=7|28|90&page_id=(optional)
app.get('/api/history', (req, res) => {
  const days = [7, 28, 90].includes(+req.query.range) ? +req.query.range : 28;
  const { page_id } = req.query;
  const uid = req.user.id;
  const w = [`datetime(created_at) >= datetime('now','-${days} days')`, 'user_id=?'];
  const p = [uid];
  if (page_id) { w.push('(page_id=? OR page_id=(SELECT id FROM pages WHERE fb_page_id=? AND user_id=?))'); p.push(page_id, page_id, uid); }
  const where = 'WHERE ' + w.join(' AND ');
  const breakdown = db.prepare(
    `SELECT type, COUNT(*) c FROM posts ${where} AND status='published' AND (error_note='' OR error_note IS NULL) GROUP BY type`
  ).all(...p);
  const byType = { text: 0, link: 0, photo: 0, video: 0, reel: 0 };
  for (const r of breakdown) if (r.type in byType) byType[r.type] = r.c;
  const daily = db.prepare(
    `SELECT date(created_at) d, page_id,
      SUM(CASE WHEN status='published' AND (error_note='' OR error_note IS NULL) THEN 1 ELSE 0 END) published,
      SUM(CASE WHEN error_note<>'' AND error_note IS NOT NULL THEN 1 ELSE 0 END) failed,
      GROUP_CONCAT(CASE WHEN error_note<>'' AND error_note IS NOT NULL THEN substr(error_note,1,120) END, ' || ') errors
     FROM posts ${where} GROUP BY d, page_id ORDER BY d DESC`
  ).all(...p).map((r) => {
    const pg = db.prepare('SELECT name FROM pages WHERE id=?').get(r.page_id);
    return { date: r.d, page_id: r.page_id, page_name: pg ? pg.name : r.page_id, published: r.published, failed: r.failed, errors: r.errors || '' };
  });
  const total = byType.text + byType.link + byType.photo + byType.video + byType.reel;
  res.json({ range_days: days, total, by_type: byType, daily });
});

// ---------- Module F: Logs + Token health ----------
app.get('/api/logs', (req, res) => res.json({ logs: db.prepare('SELECT * FROM logs WHERE user_id=? OR user_id IS NULL ORDER BY id DESC LIMIT 100').all(req.user.id) }));
app.get('/api/token/health', async (req, res) => {
  const t = utoken(req);
  if (!t) return res.json({ connected: false, error: 'Token connect nahi hai' });
  try {
    const me = await fb.validateToken(t);
    res.json({ connected: true, mode: 'LIVE', valid: true, me });
  } catch (e) {
    res.json({ connected: true, valid: false, error: fb.fbErr(e) });
  }
});

// ---------- Module G: Auto-Folder Watchers (bulk daily upload + delete after success) ----------
const MEDIA_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp'];
const isMediaPath = (fp) => MEDIA_EXT.includes(path.extname(String(fp)).toLowerCase());
function listMediaFiles(dir) {
  try {
    return fs.readdirSync(dir)
      .map((n) => path.join(dir, n))
      .filter((fp) => { try { return fs.statSync(fp).isFile() && isMediaPath(fp); } catch { return false; } })
      .map((fp) => ({ path: fp, name: path.basename(fp), size: fs.statSync(fp).size, mtime: fs.statSync(fp).mtimeMs }))
      .sort((a, b) => a.mtime - b.mtime); // sab se purani file pehle
  } catch { return []; }
}

async function processWatcher(w) {
  const page = db.prepare('SELECT * FROM pages WHERE id=?').get(w.page_id);
  if (!page) { log('watcher_skip', `#${w.id} ${w.name}: page missing`, w.user_id); return { ok: false, error: 'Page not found' }; }
  if (!page.page_token) { log('watcher_skip', `#${w.id}: ${page.name} ka posting access nahi`, w.user_id); return { ok: false, error: 'Page ka posting access nahi' }; }
  if (!fs.existsSync(w.folder_path) || !fs.statSync(w.folder_path).isDirectory()) {
    log('watcher_skip', `#${w.id}: folder nahi mila: ${w.folder_path}`, w.user_id);
    return { ok: false, error: 'Folder nahi mila' };
  }
  const media = listMediaFiles(w.folder_path);
  if (!media.length) { log('watcher_empty', `#${w.id} ${w.name}: folder khali`, w.user_id); return { ok: true, uploaded: 0 }; }
  const batch = media.slice(0, Math.max(1, w.per_run || 1));
  let done = 0;
  for (const f of batch) {
    const isV = isVideoFile({ path: f.path });
    const caption = String(w.caption_template || '{filename}').replace('{filename}', path.parse(f.name).name);
    try {
      const mode = isV ? (w.post_as === 'feed' ? 'feed' : 'reel') : 'feed';
      const out = await publishFilesNow(page, {
        message: caption,
        files: [{ path: f.path, mimetype: isV ? 'video/mp4' : 'image/jpeg', originalname: f.name }],
        post_as: mode,
      });
      const fbId = out.fb.id || out.fb.post_id || '';
      if (!fbId) throw new Error('FB id nahi mila');
      // pehle DB record, PHIR file delete (taake fail pe file mehfooz rahe)
      db.prepare(`INSERT INTO posts (fb_post_id,page_id,message,type,status,file_paths,post_as,insights_json,created_at)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(
        fbId, page.id, caption, isV ? (mode === 'reel' ? 'reel' : 'video') : 'photo',
        'published', '[]', mode, '{}', new Date().toISOString()
      );
      fs.unlinkSync(f.path); // delete SIRF confirmed success + record ke baad
      log('watcher_published', `${page.name}: ${f.name} (fb:${fbId}) — file deleted`, w.user_id);
      done++;
    } catch (e) {
      log('watcher_failed', `${f.name}: ${(e.message || JSON.stringify(fb.fbErr(e))).slice(0, 150)}`, w.user_id);
      break;
    }
  }
  return { ok: true, uploaded: done };
}

app.get('/api/watchers', (req, res) => {
  const uid0 = req.user.id;
  const list = db.prepare('SELECT * FROM watchers WHERE user_id=? ORDER BY id DESC').all(uid0).map((w) => {
    const page = db.prepare('SELECT id, name FROM pages WHERE id=?').get(w.page_id);
    const files = listMediaFiles(w.folder_path).length;
    const per = Math.max(1, w.per_run || 1);
    // stock levels: <30 add-more, <20 monitoring, <11 critical
    const stock = files < 11 ? 'critical' : files < 20 ? 'watch' : files < 30 ? 'low' : 'ok';
    return { ...w, page_name: page ? page.name : '(page missing)', files, days_left: Math.floor(files / per), stock };
  });
  res.json({ watchers: list });
});
app.post('/api/watchers', (req, res) => {
  const { name = '', folder_path = '', page_id = '', daily_time = '', post_as = 'reel', caption_template = '{filename}', per_run = 1 } = req.body || {};
  if (!folder_path || !fs.existsSync(folder_path) || !fs.statSync(folder_path).isDirectory())
    return res.status(400).json({ error: 'Folder mojood nahi — sahi local path dein (e.g. C:\\Videos\\Uploads)' });
  const page = db.prepare('SELECT * FROM pages WHERE id=? AND user_id=?').get(page_id, req.user.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  if (!/^\d{2}:\d{2}$/.test(daily_time || '')) return res.status(400).json({ error: 'daily_time HH:MM format me dein (e.g. 20:00)' });
  const st = db.prepare(`INSERT INTO watchers (name,folder_path,page_id,daily_time,post_as,caption_template,per_run,status,user_id)
    VALUES (?,?,?,?,?,?,?,'active',?)`).run(
    name || path.basename(folder_path), folder_path, page_id, daily_time,
    post_as === 'feed' ? 'feed' : 'reel', caption_template || '{filename}', Math.max(1, Math.min(20, +per_run || 1)), req.user.id
  );
  const w = db.prepare('SELECT * FROM watchers WHERE id=?').get(st.lastInsertRowid);
  log('watcher_created', `#${w.id} ${w.name} → ${page.name} @ ${daily_time} (${listMediaFiles(folder_path).length} files)`, req.user.id);
  const fc = listMediaFiles(folder_path).length;
  const stockOf = fc < 11 ? 'critical' : fc < 20 ? 'watch' : fc < 30 ? 'low' : 'ok';
  res.json({ watcher: { ...w, files: fc, days_left: Math.floor(fc / Math.max(1, w.per_run || 1)), stock: stockOf } });
});
app.put('/api/watchers/:id', (req, res) => {
  const w = db.prepare('SELECT * FROM watchers WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!w) return res.status(404).json({ error: 'Watcher not found' });
  const { name, daily_time, page_id, post_as, caption_template, per_run, status } = req.body || {};
  if (daily_time && !/^\d{2}:\d{2}$/.test(daily_time)) return res.status(400).json({ error: 'daily_time HH:MM me dein' });
  if (page_id && !db.prepare('SELECT id FROM pages WHERE id=? AND user_id=?').get(page_id, req.user.id)) return res.status(404).json({ error: 'Page not found' });
  db.prepare(`UPDATE watchers SET name=?, daily_time=?, page_id=?, post_as=?, caption_template=?, per_run=?, status=? WHERE id=?`).run(
    name ?? w.name, daily_time ?? w.daily_time, page_id ?? w.page_id,
    post_as ? (post_as === 'feed' ? 'feed' : 'reel') : w.post_as,
    caption_template ?? w.caption_template, per_run ? Math.max(1, Math.min(20, +per_run)) : w.per_run,
    status === 'paused' ? 'paused' : 'active', w.id
  );
  log('watcher_updated', `#${w.id} updated`, req.user.id);
  res.json({ watcher: db.prepare('SELECT * FROM watchers WHERE id=?').get(w.id) });
});
app.delete('/api/watchers/:id', (req, res) => {
  db.prepare('DELETE FROM watchers WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  log('watcher_deleted', `#${req.params.id} deleted (files untouched)`, req.user.id);
  res.json({ ok: true });
});
app.post('/api/watchers/:id/run', async (req, res) => {
  const w = db.prepare('SELECT * FROM watchers WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!w) return res.status(404).json({ error: 'Watcher not found' });
  const r = await processWatcher(w);
  if (!r.ok) return res.status(502).json(r);
  res.json(r);
});

// ---------- Module G2: INSTANT folder watchers (file ate hi foran upload + delete) ----------
// Folder queue ki tarah kaam karta hai: jo file mojood hai wo upload hogi.
// Stability check: copy hoti file (size badal raha ho) skip — agli scan me pakri jayegi.
const fileSeen = new Map(); // path -> {size, t}
const instantBusy = new Set(); // watcher ids currently processing
function isStable(fp) {
  try {
    const size = fs.statSync(fp).size;
    const now = Date.now();
    const prev = fileSeen.get(fp);
    fileSeen.set(fp, { size, t: now });
    if (!prev) return false; // pehli dafa dekha — agli scan me stable hoga
    if (prev.size !== size) return false; // abhi copy ho rahi hai
    return true;
  } catch { return false; }
}
setInterval(() => {
  // purani entries saaf (memory leak se bachao)
  const now = Date.now();
  for (const [k, v] of fileSeen) if (now - v.t > 10 * 60 * 1000) fileSeen.delete(k);
}, 5 * 60 * 1000);

async function processInstant(w) {
  if (instantBusy.has(w.id)) return { ok: true, uploaded: 0, skipped: 'busy' };
  instantBusy.add(w.id);
  try {
    const page = db.prepare('SELECT * FROM pages WHERE id=?').get(w.page_id);
    if (!page) return { ok: false, error: 'Page not found' };
    if (!page.page_token) return { ok: false, error: 'Page ka posting access nahi' };
    if (!fs.existsSync(w.folder_path) || !fs.statSync(w.folder_path).isDirectory())
      return { ok: false, error: 'Folder nahi mila' };
    const stable = listMediaFiles(w.folder_path).filter((f) => isStable(f.path));
    if (!stable.length) return { ok: true, uploaded: 0 };
    const batch = stable.slice(0, Math.max(1, Math.min(20, w.per_scan || 5)));
    let done = 0;
    for (const f of batch) {
      const isV = isVideoFile({ path: f.path });
      const caption = String(w.caption_template || '{filename}').replace('{filename}', path.parse(f.name).name);
      try {
        const mode = isV ? (w.post_as === 'feed' ? 'feed' : 'reel') : 'feed';
        const out = await publishFilesNow(page, {
          message: caption,
          files: [{ path: f.path, mimetype: isV ? 'video/mp4' : 'image/jpeg', originalname: f.name }],
          post_as: mode,
        });
        const fbId = out.fb.id || out.fb.post_id || '';
        if (!fbId) throw new Error('FB id nahi mila');
        db.prepare(`INSERT INTO posts (fb_post_id,page_id,message,type,status,file_paths,post_as,insights_json,created_at)
          VALUES (?,?,?,?,?,?,?,?,?)`).run(
          fbId, page.id, caption, isV ? (mode === 'reel' ? 'reel' : 'video') : 'photo',
          'published', '[]', mode, '{}', new Date().toISOString()
        );
        fs.unlinkSync(f.path); // delete SIRF record ke baad
        fileSeen.delete(f.path);
        log('instant_published', `${page.name}: ${f.name} (fb:${fbId}) — file deleted`, w.user_id);
        done++;
      } catch (e) {
        log('instant_failed', `${f.name}: ${(e.message || JSON.stringify(fb.fbErr(e))).slice(0, 150)}`, w.user_id);
        break;
      }
    }
    db.prepare('UPDATE instant_watchers SET last_scan=? WHERE id=?').run(new Date().toISOString(), w.id);
    return { ok: true, uploaded: done };
  } finally {
    instantBusy.delete(w.id);
  }
}

app.get('/api/instant', (req, res) => {
  const list = db.prepare('SELECT * FROM instant_watchers WHERE user_id=? ORDER BY id DESC').all(req.user.id).map((w) => {
    const page = db.prepare('SELECT id, name FROM pages WHERE id=?').get(w.page_id);
    return { ...w, page_name: page ? page.name : '(page missing)', files: listMediaFiles(w.folder_path).length };
  });
  res.json({ watchers: list });
});
app.post('/api/instant', (req, res) => {
  const { name = '', folder_path = '', page_id = '', post_as = 'reel', caption_template = '{filename}', per_scan = 5 } = req.body || {};
  if (!folder_path || !fs.existsSync(folder_path) || !fs.statSync(folder_path).isDirectory())
    return res.status(400).json({ error: 'Folder mojood nahi — sahi local path dein (e.g. C:\\Videos\\Instant)' });
  const page = db.prepare('SELECT * FROM pages WHERE id=? AND user_id=?').get(page_id, req.user.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  const st = db.prepare(`INSERT INTO instant_watchers (name,folder_path,page_id,post_as,caption_template,per_scan,status,user_id)
    VALUES (?,?,?,?,?,?,'active',?)`).run(
    name || path.basename(folder_path), folder_path, page_id,
    post_as === 'feed' ? 'feed' : 'reel', caption_template || '{filename}', Math.max(1, Math.min(20, +per_scan || 5)), req.user.id
  );
  const w = db.prepare('SELECT * FROM instant_watchers WHERE id=?').get(st.lastInsertRowid);
  log('instant_created', `#${w.id} ${w.name} → ${page.name} (instant, ${listMediaFiles(folder_path).length} files pending)`, req.user.id);
  res.json({ watcher: { ...w, files: listMediaFiles(folder_path).length } });
});
app.put('/api/instant/:id', (req, res) => {
  const w = db.prepare('SELECT * FROM instant_watchers WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!w) return res.status(404).json({ error: 'Watcher not found' });
  const { name, page_id, post_as, caption_template, per_scan, status } = req.body || {};
  if (page_id && !db.prepare('SELECT id FROM pages WHERE id=? AND user_id=?').get(page_id, req.user.id)) return res.status(404).json({ error: 'Page not found' });
  db.prepare('UPDATE instant_watchers SET name=?, page_id=?, post_as=?, caption_template=?, per_scan=?, status=? WHERE id=?').run(
    name ?? w.name, page_id ?? w.page_id,
    post_as ? (post_as === 'feed' ? 'feed' : 'reel') : w.post_as,
    caption_template ?? w.caption_template, per_scan ? Math.max(1, Math.min(20, +per_scan)) : w.per_scan,
    status === 'paused' ? 'paused' : 'active', w.id
  );
  log('instant_updated', `#${w.id} updated`, req.user.id);
  res.json({ watcher: db.prepare('SELECT * FROM instant_watchers WHERE id=?').get(w.id) });
});
app.delete('/api/instant/:id', (req, res) => {
  db.prepare('DELETE FROM instant_watchers WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  log('instant_deleted', `#${req.params.id} deleted (files untouched)`, req.user.id);
  res.json({ ok: true });
});
app.post('/api/instant/:id/scan', async (req, res) => {
  const w = db.prepare('SELECT * FROM instant_watchers WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!w) return res.status(404).json({ error: 'Watcher not found' });
  const r = await processInstant(w);
  if (!r.ok) return res.status(502).json(r);
  res.json(r);
});

// ---------- Cron: local scheduled queue → FB publish (Asia/Karachi, har minute) ----------
// SIRF local queue (fb_post_id khali) — FB-scheduled posts FB khud publish karta hai.
cron.schedule('* * * * *', async () => {
  // auth nahi — sab users ki due queue process hoti hai (page-token page-level hai)
  const due = db.prepare("SELECT * FROM posts WHERE status='scheduled' AND scheduled_time<>'' AND datetime(scheduled_time)<=datetime('now') AND (fb_post_id='' OR fb_post_id IS NULL)").all();
  for (const p of due) {
    const page = db.prepare('SELECT * FROM pages WHERE id=?').get(p.page_id);
    if (!page) continue;
    try {
      let fbId = '';
      const files = JSON.parse(p.file_paths || '[]');
      if (files.length) {
        const missing = files.filter((f) => !fs.existsSync(f));
        if (missing.length) throw new Error('Local file missing — dobara schedule karein');
        const fileObjs = files.map((fp) => ({ path: fp, mimetype: isVideoFile({ path: fp }) ? 'video/mp4' : 'image/jpeg', originalname: path.basename(fp) }));
        const out = await publishFilesNow(page, { message: p.message, files: fileObjs, post_as: p.post_as || 'feed' });
        fbId = out.fb.id || out.fb.post_id || '';
        cleanupFiles(files);
      } else {
        const r = await fb.publishNow(page.fb_page_id, { message: p.message, link_url: p.link_url || '' }, page.page_token || undefined);
        fbId = r.id || r.post_id || '';
      }
      db.prepare("UPDATE posts SET status='published', fb_post_id=?, error_note='' WHERE id=?").run(fbId, p.id);
      log('post_auto_published', `${page.name}: ${p.message.slice(0, 80)}`);
    } catch (e) {
      db.prepare('UPDATE posts SET error_note=? WHERE id=?').run('Auto-publish fail: ' + JSON.stringify(fb.fbErr(e) || e.message).slice(0, 200), p.id);
      log('post_auto_failed', `Post #${p.id}: FB error`);
    }
  }
}, { timezone: process.env.TIMEZONE || 'Asia/Karachi' });

// ---------- Cron: daily folder watchers (Asia/Karachi time) ----------
const TZ = process.env.TIMEZONE || 'Asia/Karachi';
cron.schedule('* * * * *', async () => {
  try {
    const hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
    const due = db.prepare("SELECT * FROM watchers WHERE status='active' AND daily_time=? AND (last_run IS NULL OR last_run<>?)").all(hm, today);
    for (const w of due) {
      db.prepare('UPDATE watchers SET last_run=? WHERE id=?').run(today, w.id);
      log('watcher_fired', `#${w.id} ${w.name} @ ${hm}`, w.user_id);
      await processWatcher(w);
    }
  } catch (e) { log('watcher_cron_error', String(e.message || e).slice(0, 150)); }
}, { timezone: TZ });

// ---------- Cron: INSTANT folder scan (har 30 second — file ate hi upload) ----------
cron.schedule('*/30 * * * * *', async () => {
  try {
    const active = db.prepare("SELECT * FROM instant_watchers WHERE status='active'").all();
    for (const w of active) {
      try { await processInstant(w); } catch (e) { log('instant_cron_error', `#${w.id}: ${String(e.message || e).slice(0, 120)}`); }
    }
  } catch {}
});

// multer/file errors → JSON
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
  next();
});

app.listen(PORT, () => console.log(`Backend running: http://localhost:${PORT} | FB: ${fb.isConnected() ? 'CONNECTED (live)' : 'NOT CONNECTED (token lagayein)'} | TZ: ${process.env.TIMEZONE || 'Asia/Karachi'}`));
