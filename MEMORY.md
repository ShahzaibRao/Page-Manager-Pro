# MEMORY — Page Manager Pro (local)

> Har session me ye file parho, kaam ke baad update karo. Secrets kabhi yahan nahi likhne.

## State (23 Sep 2026)
- GitHub: https://github.com/ShahzaibRao/Page-Manager-Pro.git — main pushed + tags **v0.1, v0.2**. Secrets gitignored (.env, *.db, uploads/*, node_modules); verified zero tokens staged.
- Demo live: https://shahzaibrao.github.io/Page-Manager-Pro/ (`docs/index.html` = current dashboard replica, deploys via `.github/workflows/pages.yml`). About description + homepage set via API.
- Stack: backend Express :4000 (node:sqlite `data.db`, node-cron Asia/Karachi) + frontend Next.js 14 :3000.
- Mode: LIVE. System User token `.env` me (same user id `122105...`, naam "admin"). Token valid.
- Sync: Business "Followers Page BM" (id `.env` me `FB_BUSINESS_ID`) → **~2797 pages**, **~19 posting access** (page_token wale).
- Frontend default filter: Posting Access. Header switcher: access pages + **🌐 All Pages (Global)** option.
- Global: `/api/overview` (totals + merged series + per-page) aur `/api/viral-global` (top N by engagement, 19 pages scan). Dashboard/Insights/Viral tabs me global branches.
- i18n: `frontend/lib/i18n.ts` (en/ur/es/zh/ar, ar=RTL), default ur, localStorage `pmp_lang`. Themes dark/black/light via CSS vars + t-* utilities (`globals.css`), localStorage `pmp_theme`, selector Settings > Appearance me. Toasts + FB-provided texts untranslated rehte hain.
- Instant folders: `instant_watchers` table + `/api/instant` CRUD + scan-now. 30s cron. Stability check (size stable across scans) taake copy-hoti file aadhi upload na ho. per_scan 1–20. Upload confirm + DB record ke BAAD hi delete.
- Sidebar me **Creator Watch** tab (instant folder UI yahan moved; Auto Folder tab me sirf daily wale).

## Permissions (token, verified via /me/permissions)
20 granted — pages_manage_posts, pages_show_list, read_insights, business_management,
pages_read_engagement, pages_read_user_content, publish_video, + misc. Sab chahiye wale mojood.

## Known API Facts (v26.0, new Pages experience)
- Page-level calls (posts/insights/publish) PAGE TOKEN se; system token se "Page access token required" error.
- Post `type` field deprecated (#12 error) — fields me mat mango.
- Page insights deprecated: page_impressions, page_impressions_unique, page_engaged_users, page_fans, page_fan_adds.
- Working: `page_views_total`, `page_post_engagements`, `page_video_views(_paid/_organic)`, `page_video_view_time`, `page_actions_post_reactions_like_total`.
- Post reach (`post_impressions`) unavailable — Viral tab engagement numbers pe chalta hai, rule text me bataya gaya hai.
- `/monetization_eligibility` edge mojood nahi (code 2500) → public-criteria ESTIMATE dikhate hain.
- v20.0 deprecated — FB auto-upgrade karta hai; default v26.0 set hai.

## Incidents
- 9 rapid "hi" test posts → Elaf pe spam block 368 (temporary, lift ho gaya). Lesson: bulk tests nahi.
- Watcher bug (23 Sep): DB insert column mismatch se file delete ho gayi bila record → fix: DB record PEHLE, unlink AKHIR me. Rule: user files sirf confirmed FB id + DB record ke baad delete hon.
- `/me/businesses` kabhi empty deta hai (flaky) → `FB_BUSINESS_ID` fallback + DB persistence hai. Re-sync tokens wipe nahi karta.
- Debug me ek dafa page-token axios dump me log file me gaya tha → file delete ki; ab full dumps banned (Constitution #2).

## Pending / Next
- 95+ pages ko posting access dilana (user ka kaam: Business Settings → System Users → assets assign → Sync).
- Reels 3-phase implemented, fallback /videos — Elaf pe reel test OK? user ne reel upload ki (fb id ...696? verify pending).
- Video schedule → local queue + cron upload (code ready, end-to-end test nahi hua).
