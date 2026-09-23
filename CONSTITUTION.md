# CONSTITUTION — Page Manager Pro

Ye file project ke usool hain. Har change inhe follow karega.

## 1. Real Data Only
- Koi fake/demo/seed data nahi. Khali DB se start, sirf Facebook Graph API ka real data.
- Estimate ya fallback dikhana ho to clearly label karo (e.g. "estimate", "unavailable + wajah").

## 2. Token Security (sakht)
- `FB_SYSTEM_USER_TOKEN` aur `page_token` SIRF `backend/.env` + backend memory + SQLite me.
- Ye kabhi frontend response, log, error dump, ya chat me print nahi honge.
- Debug karte waqt full axios errors dump nahi karne (sirf `error.message` slice).
- Frontend token ko kabhi touch nahi karta — saari FB calls backend se.

## 3. Policy Compliance
- Sirf apne Business Manager ke pages. No scraping, no bots, no bypass.
- System User Token (never expires), personal token kabhi nahi.
- Post operations hamesha user ke explicit action pe — silent auto-post nahi (cron sirf user-scheduled queue publish karta hai).

## 4. Local-First Stack
- Supabase/BullMQ/Vercel nahi: SQLite file (`backend/data.db`), `node-cron`, localhost.
- Native-build deps nahi (e.g. `better-sqlite3` ban — `node:sqlite` use karo).
- Uploads `backend/uploads/` me; successful publish pe local file delete karo.

## 5. Facebook API Discipline
- Version explicit (`FB_API_VERSION`, current v26.0).
- New Pages experience rules: page-level calls page-token se; `type` field Post pe deprecated — mat mango.
- Deprecated metrics (`page_impressions`, `page_engaged_users`, `page_fans`) mat mango — working set: `page_views_total`, `page_post_engagements`, `page_video_views`.
- Failures pe honest error + `error_note` DB me; user ko toast me wajah batao.
- Spam limits ka khayal: bulk/test posts nahi; test post ho to foran delete karo.

## 6. UI
- Design language `Manager-Pro-Dashboard-Ui.html` jaisa: dark `#0F0F0F`, cards `#1A1A1A`, accent `#1877F2`, Inter.
- Badi lists (hazaron pages) me search + render cap (200) lazmi.
- Destructive/real actions (Publish/Delete) pe toast me FB id confirm karo.
