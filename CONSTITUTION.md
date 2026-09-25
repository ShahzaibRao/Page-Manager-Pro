# CONSTITUTION — Page Manager Pro

Ye file project ke usool hain. Har change inhe follow karega.

## 1. Real Data Only
- Koi fake/demo/seed data nahi. Khali DB se start, sirf Facebook Graph API ka real data.
- Estimate ya fallback dikhana ho to clearly label karo (e.g. "estimate", "unavailable + wajah").

## 2. Token Security (sakht)
- `FB_SYSTEM_USER_TOKEN` aur `page_token` SIRF `backend/.env` + backend memory + SQLite me.
- Ye kabhi frontend response (`PUB_COLS` me token column nahi), log, error dump, ya chat me print nahi honge.
- Debug karte waqt full axios errors dump nahi karne (sirf `error.message` slice).
- Frontend token ko kabhi touch nahi karta — saari FB calls backend se.

## 3. Policy Compliance
- Sirf apne Business Manager ke pages. No scraping, no bots, no bypass.
- System User Token (never expires), personal token kabhi nahi.
- Post operations hamesha user ke explicit action pe — silent auto-post nahi (cron sirf user-scheduled queue + user-configured watchers chalata hai).
- Spam limits: bulk/test posts nahi; test post ho to foran delete karo.

## 4. Local-First Stack
- Supabase/BullMQ/Vercel nahi: SQLite file (`backend/data.db`), `node-cron`, localhost.
- Native-build deps nahi (e.g. `better-sqlite3` ban — `node:sqlite` use karo).
- Uploads `backend/uploads/` me; successful publish pe local file delete karo.

## 5. Facebook API Discipline
- Version explicit (`FB_API_VERSION`, current v26.0).
- New Pages experience: page-level calls page-token se; `type` field Post pe mat mango.
- Deprecated metrics mat mango — working set: `page_views_total`, `page_post_engagements`, `page_video_views`.
- Sync me pagination lazmi (`getAll` cursor loop); batch endpoints (`?ids=`, 50/call) prefer karo.
- Empty sync result pe ek retry; purana synced data kabhi delete nahi hota (sirf explicit Disconnect wipe karta hai).
- Failures pe honest error + `error_note` DB me; user ko toast me wajah batao.

## 6. Performance
- Sequential FB loops nahi — `pLimit` concurrency (default 6) ya `Promise.all`.
- Repeated reads pe TTL cache (insights/overview 5m, viral 3m, health 10m); Sync cache clear karta hai.
- Heavy calls tab-lazy load karo (top-posts sirf Viral tab, health sirf Settings).
- `npm run build` dev server ke sath nahi — pehle dev band karo (`.next` corrupt hota hai). Type check ke liye `tsc --noEmit`.

## 7. File Safety (watchers/uploads)
- User file delete SIRF is order me: FB success id → DB record → unlink.
- Instant scan me stability check lazmi (size stable across scans) — copy-hoti file skip.
- Bulk auto-uploads me per-run/scan cap rakho (spam block se bachao).

## 8. UI
- Design language `Manager-Pro-Dashboard-Ui.html` jaisa: theme vars (`t-*` utilities), accent `#1877F2`, Inter. Hardcoded dark hex wapas nahi lane.
- Badi lists me search + sort + pagination (200/page, numbered nav) lazmi; render cap ke baghair full list render nahi karni.
- localStorage state (page/lang/theme) SIRF mount-effect me restore karo — warna hydration mismatch.
- Selected page persist karo; change sirf explicit user action pe.
- Destructive/real actions (Publish/Delete) pe toast me FB id confirm karo.
- Har visible string `i18n.ts` se (`t(lang, key)`); nayi string = 5 languages me keys. Toasts me dynamic data ke sath wajah batao.
