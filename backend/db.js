// SQLite local DB — Supabase ki jagah. File: backend/data.db
// Uses built-in node:sqlite (Node 22.5+) — koi native build nahi chahiye.
// NOTE: Koi fake/demo data seed NAHI hota. Saara data real Business Manager se sync hoga.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'data.db'));

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
]) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${col}`); } catch {}
}

module.exports = db;
