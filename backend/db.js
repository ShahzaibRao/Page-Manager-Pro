// SQLite local DB — Supabase ki jagah. File: backend/data.db
// Uses built-in node:sqlite (Node 22.5+) — koi native build nahi chahiye.
// NOTE: Koi fake/demo data seed NAHI hota. Saara data real Business Manager se sync hoga.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// DATA_DIR set ho (docker) to DB + uploads wahan; warna local folder (SQLite fallback)
const DATA_DIR = process.env.DATA_DIR || __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}

const db = new DatabaseSync(path.join(DATA_DIR, 'data.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  fb_page_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  business_id TEXT,
  followers_count INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 1,
  verification_status TEXT DEFAULT '',
  link TEXT DEFAULT '',
  picture_url TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fb_post_id TEXT DEFAULT '',
  page_id TEXT NOT NULL,
  message TEXT DEFAULT '',
  type TEXT DEFAULT 'text',
  link_url TEXT DEFAULT '',
  status TEXT DEFAULT 'published',
  scheduled_time TEXT DEFAULT '',
  error_note TEXT DEFAULT '',
  insights_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS watchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  folder_path TEXT NOT NULL,
  page_id TEXT NOT NULL,
  daily_time TEXT NOT NULL,
  post_as TEXT DEFAULT 'reel',
  caption_template TEXT DEFAULT '{filename}',
  per_run INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  last_run TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS instant_watchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  folder_path TEXT NOT NULL,
  page_id TEXT NOT NULL,
  post_as TEXT DEFAULT 'reel',
  caption_template TEXT DEFAULT '{filename}',
  per_scan INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active',
  last_scan TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  password_hash TEXT DEFAULT '',
  provider TEXT DEFAULT 'email',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id INTEGER PRIMARY KEY,
  token_enc TEXT NOT NULL,
  business_id TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

// fresh columns for old DBs (safe: ignores if already exists)
for (const [table, col] of [
  ['posts', 'link_url TEXT DEFAULT ""'],
  ['posts', 'error_note TEXT DEFAULT ""'],
  ['pages', 'link TEXT DEFAULT ""'],
  ['pages', 'picture_url TEXT DEFAULT ""'],
  ['pages', 'page_token TEXT DEFAULT ""'],
  ['pages', 'can_post INTEGER DEFAULT 0'],
  ['posts', 'file_paths TEXT DEFAULT "[]"'],
  ['posts', 'post_as TEXT DEFAULT "feed"'],
  ['businesses', 'user_id INTEGER'],
  ['pages', 'user_id INTEGER'],
  ['posts', 'user_id INTEGER'],
  ['logs', 'user_id INTEGER'],
  ['watchers', 'user_id INTEGER'],
  ['instant_watchers', 'user_id INTEGER'],
]) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col}`); } catch {}
}

// v2 migration: per-user row identity (shared BM pe do users ki rows overwrite na hon).
// pages.id = userId:pg_fbid, businesses.id = userId:bizid. fb unique constraint khatam.
try {
  const ver = db.prepare('PRAGMA user_version').get().user_version || 0;
  if (ver < 2) {
    // posts/watchers ke page refs naye ids pe remap (purani pages table se)
    db.exec(`UPDATE posts SET page_id = (
      SELECT CASE WHEN p.user_id IS NULL THEN p.id ELSE p.user_id || ':pg_' || p.fb_page_id END
      FROM pages p WHERE p.id = posts.page_id
    ) WHERE EXISTS (SELECT 1 FROM pages p WHERE p.id = posts.page_id)`);
    db.exec(`UPDATE watchers SET page_id = (
      SELECT CASE WHEN p.user_id IS NULL THEN p.id ELSE p.user_id || ':pg_' || p.fb_page_id END
      FROM pages p WHERE p.id = watchers.page_id
    ) WHERE EXISTS (SELECT 1 FROM pages p WHERE p.id = watchers.page_id)`);
    db.exec(`UPDATE instant_watchers SET page_id = (
      SELECT CASE WHEN p.user_id IS NULL THEN p.id ELSE p.user_id || ':pg_' || p.fb_page_id END
      FROM pages p WHERE p.id = instant_watchers.page_id
    ) WHERE EXISTS (SELECT 1 FROM pages p WHERE p.id = instant_watchers.page_id)`);
    db.exec(`CREATE TABLE pages_new (id TEXT PRIMARY KEY, fb_page_id TEXT NOT NULL, name TEXT NOT NULL,
      category TEXT DEFAULT '', business_id TEXT, followers_count INTEGER DEFAULT 0, is_published INTEGER DEFAULT 1,
      verification_status TEXT DEFAULT '', link TEXT DEFAULT '', picture_url TEXT DEFAULT '',
      page_token TEXT DEFAULT '', can_post INTEGER DEFAULT 0, user_id INTEGER)`);
    db.exec(`INSERT INTO pages_new SELECT
      CASE WHEN user_id IS NULL THEN id ELSE user_id || ':pg_' || fb_page_id END,
      fb_page_id, name, category, business_id, followers_count, is_published,
      verification_status, link, picture_url, page_token, can_post, user_id FROM pages`);
    db.exec('DROP TABLE pages');
    db.exec('ALTER TABLE pages_new RENAME TO pages');
    db.exec('CREATE INDEX IF NOT EXISTS idx_pages_user_fb ON pages(user_id, fb_page_id)');
    db.exec(`CREATE TABLE businesses_new (id TEXT PRIMARY KEY, name TEXT NOT NULL, user_id INTEGER)`);
    db.exec(`INSERT INTO businesses_new SELECT
      CASE WHEN user_id IS NULL THEN id ELSE user_id || ':' || id END, name, user_id FROM businesses`);
    db.exec('DROP TABLE businesses');
    db.exec('ALTER TABLE businesses_new RENAME TO businesses');
    db.exec('PRAGMA user_version = 2');
  }
} catch (e) { console.log('migration v2 note:', e.message); }

module.exports = db;
