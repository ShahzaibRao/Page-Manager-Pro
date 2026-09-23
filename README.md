# 📘 Page Manager Pro

A secure, personal **Facebook Business Manager dashboard** — manage all your Business Manager pages from one place: post photos/videos/reels, schedule, auto-upload from folders, insights, monetization, and viral-post analysis.

100% Facebook Platform Policy compliant: everything goes through the official **Graph API** using a **System User Token** (never expires, server-side only). No scraping, no bots.

![Stack](https://img.shields.io/badge/Next.js-14-black) ![Backend](https://img.shields.io/badge/Express-Node-green) ![DB](https://img.shields.io/badge/SQLite-local-blue) ![API](https://img.shields.io/badge/Graph_API-v26.0-1877F2)

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

## 🚀 Run Locally (2 terminals)

**Requirements:** Node.js 20+

**Terminal 1 — Backend (port 4000):**
```bash
cd backend
npm install   # first time only
npm start
```

**Terminal 2 — Frontend (port 3000):**
```bash
cd frontend
npm install   # first time only
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3000** → paste your System User Token on the Connect screen → pages sync automatically.

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
├── backend/            # Express + node:sqlite + node-cron
│   ├── index.js        # all APIs (connect/sync/posts/insights/viral/watchers/overview)
│   ├── fb.js           # live Graph API service (no mocks)
│   ├── db.js           # SQLite schema (pages/posts/logs/watchers)
│   └── uploads/        # local upload staging (git-ignored)
├── frontend/           # Next.js 14 + Tailwind + Recharts
│   ├── app/page.tsx    # full dashboard (all 8 sections)
│   └── lib/i18n.ts     # 5-language dictionary
├── PRD-Page-Manager-Business-Method.md
├── FB-SETUP-GUIDE.md
├── CONSTITUTION.md     # project rules (real data, token security, compliance)
├── MEMORY.md           # maintainer memory (state, API facts, incidents)
└── Manager-Pro-Dashboard-Ui.html   # original UI design reference
```

## 📌 Versions

- `v0.2` — Creator Watch (instant folder → auto-upload on arrival + stability check + per-scan limit), sync auto-retry with warning notes.
- `v0.1` — Local full release: connect+sync (paginated full-BM scan), post/schedule incl. files+reels+progress, auto-folder daily uploader, global overview+viral, 5 languages, 3 themes.

## ⚠️ Notes

- Local-first: SQLite file DB (`backend/data.db`), `node-cron` scheduler — no Supabase/Redis/Vercel needed.
- New Pages experience requires **Page access tokens** for page calls — the app stores them server-side on sync.
- Some classic insights metrics are deprecated by Meta — the app uses working ones (`page_views_total`, `page_post_engagements`, `page_video_views`) with honest labels.
- Avoid rapid test posting — Facebook rate-limits with spam blocks (code 368, temporary).
