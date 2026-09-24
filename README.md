# 📘 Page Manager Pro

A secure, personal **Facebook Business Manager dashboard** — manage all your Business Manager pages from one place: post photos/videos/reels, schedule, auto-upload from folders, insights, monetization, and viral-post analysis.

100% Facebook Platform Policy compliant: everything goes through the official **Graph API** using a **System User Token** (never expires, server-side only). No scraping, no bots.

![Stack](https://img.shields.io/badge/Next.js-14-black) ![Backend](https://img.shields.io/badge/Express-Node-green) ![DB](https://img.shields.io/badge/SQLite-local-blue) ![API](https://img.shields.io/badge/Graph_API-v26.0-1877F2)

## 🖥 Live Demo (sample data)

👉 **https://shahzaibrao.github.io/Page-Manager-Pro/**

Interactive static preview of the dashboard (all 9 sections, dark theme). For real data, run locally with your System User Token.

---

## ✨ Features (PRD Modules A–H)

| Section | What it does |
|---|---|
| 🌐 **Global view** | Header switcher → *All Pages*: total followers, views, engagements, video views, combined chart, pages breakdown |
| 📄 **Pages** | Full BM scan (2800+ pages supported via pagination) + **Posting Access** filter + search |
| ✍️ **Create Post** | Text, link, photo URL, **local photo/video/reel files** with **upload progress bar**, schedule (Asia/Karachi) |
| 🕒 **Scheduled** | Local queue + Facebook-scheduled posts, delete/reschedule |
| 📁 **Auto Folder** | Daily time → oldest file in your folder auto-uploads to a page, **file deleted after success** |
| 📊 **Insights** | 7/28/90-day charts (Page Views vs Post Engagements), per-page + global |
| 💰 **Monetization** | Live eligibility check, public-criteria estimate where API unavailable |
| 🔥 **Viral Posts** | Top posts by engagement with VIRAL tags — per page + global Top 10 |
| ⚙️ **Settings** | Token health, page health, activity log, disconnect |

---

## 🌍 Multi-Language UI (5 languages)

Switch anytime in **Settings → Appearance** (saved in browser). Arabic switches the whole layout to **RTL**.

| Language | Code | Status |
|---|---|---|
| English | `en` | ✅ Full UI |
| Roman Urdu | `ur` | ✅ Full UI (default) |
| Español | `es` | ✅ Full UI |
| 中文 (Chinese) | `zh` | ✅ Full UI |
| العربية (Arabic) | `ar` | ✅ Full UI + RTL |

> Dynamic content (your post texts, Facebook error details, toast data) stays as received.

## 🎨 Themes (3)

**Settings → Appearance**: `Dark` (default) • `Black` (pure) • `Light`. Charts and brand blue stay consistent everywhere.

---

## 🚀 Run (Docker — recommended)

**Requirements:** Docker + Docker Compose

```bash
# 1. token lagao (sirf pehli dafa) — backend/.env banao (.env.example se), token dalo
# 2. Windows: start-all.bat  |  ya:
docker compose up --build -d
```

| Service | URL | Notes |
|---|---|---|
| Dashboard | http://localhost:3000 | token Connect screen me paste karo → auto-sync |
| API | http://localhost:4000/api/health | |
| Postgres 16 | localhost:5432 | user `pmp`, db `pagemanager` (next phases ke liye ready) |
| Redis 7 | localhost:6379 | next phases (BullMQ/cache) ke liye ready |

```bash
docker compose ps          # status
docker compose logs -f     # logs
docker compose down        # stop (data volumes me mehfooz rehta hai)
```

> Backend data (`data.db` + uploads) `backenddata` volume me persist hota hai.
> Oracle/server pe yehi file chalegi — sirf `backend/.env` me asal token + strong `POSTGRES_PASSWORD`, aur build me `NEXT_PUBLIC_API_URL=http://SERVER-IP:4000` set karna hai.

### Alternative: bina Docker (npm, quick dev)

**Requirements:** Node.js 22+

```bash
# Terminal 1
cd backend && npm install && npm start        # :4000
# Terminal 2
cd frontend && npm install && cp .env.example .env.local && npm run dev   # :3000
```
Windows one-click: `start-all.bat`. NOTE: `npm run build` dev server chalte hue mat chalao (`.next` corrupt hota hai) — pehle dev band karo.

### Environment

`backend/.env` (create from `.env.example` — **never commit this file**):
```env
PORT=4000
TIMEZONE=Asia/Karachi
FB_API_VERSION=v26.0
FB_APP_ID=
FB_BUSINESS_ID=
FB_SYSTEM_USER_TOKEN=EAAB...   # server-side only, never sent to frontend
FRONTEND_URL=http://localhost:3000
```

---

## 🔑 Facebook Setup (summary)

Full step-by-step: [`FB-SETUP-GUIDE.md`](FB-SETUP-GUIDE.md)

1. `business.facebook.com` → add your Pages under Business Settings → verify business.
2. `developers.facebook.com` → create **Business** type app, link to your Business Manager.
3. Business Settings → Users → **System Users** → create `PageManager Server` (Admin) → assign Pages as assets → **Generate token** with: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `read_insights`, `business_management`, `pages_read_user_content`.
4. Paste token in the app (Connect screen) or `backend/.env` → Sync.

> The token is stored only in `backend/.env` and SQLite `page_token` column — the frontend never receives it (verified: API responses contain zero token fields).

---

## 🗂 Project Structure

```
CMS/
├── docker-compose.yml      # postgres + redis + backend + frontend (Oracle-ready)
├── backend/Dockerfile      # node:24-alpine, DATA_DIR=/data, healthcheck
├── frontend/Dockerfile     # multi-stage standalone build
├── backend/                # Express + node:sqlite + node-cron
│   ├── index.js            # all APIs (connect/sync/posts/insights/viral/watchers/overview/history)
│   ├── fb.js               # live Graph API service (no mocks)
│   ├── db.js               # SQLite schema (DATA_DIR aware)
│   └── uploads/            # local upload staging (git-ignored)
├── frontend/               # Next.js 14 + Tailwind + Recharts
│   ├── app/page.tsx        # full dashboard (11 sections)
│   └── lib/i18n.ts         # 5-language dictionary
├── docs/                   # Pages demo (index.html) + architecture.html
├── PRD-Page-Manager-Business-Method.md   # v2.0 living spec
├── FB-SETUP-GUIDE.md       # token + troubleshooting
├── CONSTITUTION.md         # project rules
├── MEMORY.md               # maintainer memory
├── SUGGESTION.md           # cloud-scale plan
└── Manager-Pro-Dashboard-Ui.html   # original UI design reference
```

## 📌 Versions

- `v0.2` — Creator Watch (instant folder → auto-upload on arrival + stability check + per-scan limit), sync auto-retry with warning notes.
- `v0.1` — Local full release: connect+sync (paginated full-BM scan), post/schedule incl. files+reels+progress, auto-folder daily uploader, global overview+viral, 5 languages, 3 themes.

## ⚠️ Notes

- Docker (recommended): sab kuch containers me; data volumes me persist.
- Local npm: SQLite file DB (`backend/data.db`), `node-cron` scheduler.
- New Pages experience requires **Page access tokens** for page calls — the app stores them server-side on sync.
- Some classic insights metrics are deprecated by Meta — the app uses working ones (`page_views_total`, `page_post_engagements`, `page_video_views`) with honest labels.
- Avoid rapid test posting — Facebook rate-limits with spam blocks (code 368, temporary).
