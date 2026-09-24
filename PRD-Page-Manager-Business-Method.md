# PRD - My Page Manager WebApp
### Secure Business Manager Integration
**Version:** 2.0 Living (implements v1.0 spec) | **Date:** 24 Sep 2026 | **Owner:** Shahzaib Rao
> v1.0 Final (23 Sep 2026) original spec thi. Ye v2.0 built reality document karta hai — har module ki implementation status ke sath.

### 1. Product Overview
Ek secure personal webapp dashboard jo Facebook Business Manager ke through pages ko manage karta hai. Saare pages Business Manager me add hain aur saara access System User Token ke zariye hai taake 100% Facebook Policy compliant rahe.

Problem: Rozana Business Suite kholna, alag alag pages check karna, monetization status aur viral posts ka pata lagana mushkil hai.
Solution: Ek single dashboard jahan saare Business Manager ke pages ka control ho — post, schedule, auto-upload, insights, monetization, viral analysis ek jagah.

### 2. Goals & Non-Goals
**Goals (all met):**
- 100% Facebook Platform Policy Compliant solution ✅
- Saare pages Business Manager me centralized (paginated full-BM scan, ~2797 pages) ✅
- Post, Schedule, Insights, Monetization, Viral Analysis ek jagah ✅
- Apni language + theme me UI (5 languages, 3 themes) ✅

**Non-Goals (V1 me nahi kiya — same as v1.0):**
- Kisi aur ke pages manage karna (sirf apne business ke)
- Facebook ko bypass karna ya scraping
- Auto like/follow bots

### 3. Architecture - Secure & Compliant (BUILT)

**Flow:**
[User Browser] -> [Next.js 14 Frontend :3000] -> [Express Backend API :4000] -> [Facebook Graph API v26.0 using System User Token + Page Tokens] -> [Business Manager Pages]

**Security Rules (enforced):**
1. Saare Pages `business.facebook.com > Pages` me add hain.
2. Token: System User Token (never expires). Personal User Token kabhi nahi.
3. Token Storage: sirf Backend `.env` + SQLite `page_token` column. Frontend responses me zero token fields (verified). API class `PUB_COLS` token column exclude karti hai.
4. App Type: Business App, Business Manager se linked.
5. Permissions (verified 20 granted): pages_manage_posts, publish_video, pages_read_engagement, pages_show_list, read_insights, business_management, pages_read_user_content + misc.

### 4. Features - Detailed (BUILT STATUS)

**Module A: Business Manager Connection ✅**
- Connect screen (token paste → validate → `.env` save → auto-sync)
- `/me/accounts` + `owned_pages`/`client_pages` (cursor pagination) + `FB_BUSINESS_ID` fallback + retry-on-empty
- Header: Connected pill, page switcher (posting-access + 🌐 Global), Sync, selected-page persistence

**Module B: Post & Schedule Manager ✅ (+files)**
- Text, Link, Photo URL, local Photos (multi), local Video, Reels (3-phase, fallback /videos)
- Upload progress bar (XHR), 4GB limit, schedule (Asia/Karachi; photos FB-side, video local queue + cron)
- Queue: local + FB `scheduled_posts`, Delete (FB + local)

**Module C: Page Health & Monetization Checker ✅ (adapted)**
- Page Status: `is_published`, `verification_status`, real `followers_count`
- NOTE: `/monetization_eligibility` edge exist nahi karta (2500) → public-criteria ESTIMATE, clearly labeled

**Module D: Full Insights Dashboard ✅ (adapted)**
- Date Range: 7/28/90 days; KPIs: Followers, Page Views, Post Engagements, Video Views
- Charts: Views vs Engagements (Line + Area)
- NOTE: Meta deprecated metrics (`page_impressions`, `page_engaged_users`, `page_fans`) → working set (`page_views_total`, `page_post_engagements`, `page_video_views`), honest labels
- Audience split API me available nahi raha → dropped (honest, no fake charts)

**Module E: Viral Content & Top Posts Analyzer ✅ (adapted)**
- Table: Message, Created, Reach, Likes, Comments, Shares, Eng Rate; sort by Reach/Engagement
- Viral Logic: Reach > Avg×2.5 (reach mile to), warna engagement-based, rule text UI me
- NOTE: Post `type` field deprecated (#12) — nahi manga jata

**Module F: Admin & Logs ✅**
- Activity Log (DB), Token Health (`/me` validate), Disconnect (wipe — sirf token change ke liye)

**Module G: Auto-Folder + Creator Watch ✅ (NEW beyond v1.0)**
- Daily watcher: fixed time pe oldest files upload + delete-after-success
- Creator Watch: file ate hi (~30s scan, stability-checked) upload + delete, per-scan cap
- Folder stock alerts: ok/low(<30)/watch(<20)/critical(<11) + days-left estimate + header bell + critical toast

**Module H: Global Overview ✅ (NEW beyond v1.0)**
- 🌐 All Pages: summed KPIs, merged chart, per-page breakdown, Global Top-10 Viral

**Module I: Posting Reports ✅ (NEW beyond v1.0)**
- `/api/history`: by-type breakdown (text/photo/video/reel) + daily per-page published/failed/errors, 7/28/90d
- Reports tab + dashboard widget

**Module J: i18n + Themes ✅ (NEW beyond v1.0)**
- 5 languages (en/ur/es/zh/ar; ar = RTL), default Roman Urdu, persisted
- 3 themes (dark/black/light) via CSS vars, persisted, Settings > Appearance

### 5. User Stories (all covered + extras)
- Connect BM → pages listed securely ✅
- Schedule post for tomorrow 8PM ✅ (+file uploads, +auto-folders)
- Monetization eligibility track ✅ (estimate labeled)
- Most viral post of 30 days ✅ (per-page + global top 10)
- Folder drop → auto-post + delete ✅
- Daily posting report: kis page pe hui/fail ✅

### 6. Data Model (BUILT)
- businesses {id, name}
- pages {id, fb_page_id, name, category, business_id, followers_count, is_published, verification_status, link, picture_url, page_token (server-only), can_post}
- posts {id, fb_post_id, page_id, message, type (text/link/photo/video/reel), link_url, status, scheduled_time, error_note, file_paths, post_as, insights_json, created_at}
- logs {id, action, detail, created_at}
- watchers {id, name, folder_path, page_id, daily_time, post_as, caption_template, per_run, status, last_run}
- instant_watchers {id, name, folder_path, page_id, post_as, caption_template, per_scan, status, last_scan}

### 7. Tech Stack (BUILT — local-first, v1.0 cloud plan skipped per owner)
Frontend: Next.js 14, Tailwind, Recharts (Shadcn/NextAuth skipped — local single-user, no login needed)
Backend: Node.js + Express, node:sqlite (Prisma/Supabase skipped)
DB: SQLite file (`backend/data.db`)
Queue: node-cron (BullMQ/Redis skipped) — 1min schedule queue, 1min daily watchers, 30s instant scan
Auth: System User Token only (NextAuth/FB Login skipped — direct token connect)
Hosting: localhost (`start-all.bat`); static demo on GitHub Pages (`docs/`, workflow deploy)

### 8. Facebook App Review Plan (unchanged from v1.0)
- Use Case: "My app helps me manage my own Facebook Pages that are part of my Business Manager"
- Screencast: Connect > Select Page > Create Post > Schedule > Insights > Viral
- Business Verification: verified (documents)
- Data Handling: only own page insights stored.

### 9. Milestones (STATUS)
- Phase 1: BM setup, App, System User token, Login→Connect flow ✅ DONE
- Phase 2: Post & Schedule (+files/reels/auto-folders) ✅ DONE
- Phase 3: Insights + Monetization + Viral (+Global + Reports) ✅ DONE
- Phase 4: UI polish (themes/i18n), Security audit (token scan clean), Deploy (local + Pages demo) ✅ DONE

### 10. Success Metrics (STATUS)
- Post publish success rate > 99% — holding (failures honest-logged with FB reason)
- Insights load time < 2 sec — warm cache ~0.05s; cold ~2–4s (parallel + lazy)
- Zero Policy Violations — holding (official APIs only; one transient spam-block 368 during bulk testing, lifted; rule: no bulk tests)
