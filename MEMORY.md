# MEMORY — Page Manager Pro (local)

> Har session me ye file parho, kaam ke baad update karo. Secrets kabhi yahan nahi likhne.
> **Branch rule: active kaam `staging` branch me hoga. `main` sirf stable releases (merge + tag). `dev` backup/working branch.**
> Branches: `main` (releases v0.1/v0.2) • `dev` (working) • `staging` (ACTIVE).

## State (24 Sep 2026)
- DOCKER LIVE (local): `docker compose` → postgres:16 + redis:7 + backend + frontend, all healthy. Backend `DATA_DIR=/data` (named volume `backenddata`, node-owned). Full sync verified in container (2797 pages). Frontend standalone build. STOPPED local npm servers (port clash se bachne ke liye docker hi chalao).
- Architecture diagram: `docs/architecture.html` (archify, 9/9 checks; 1440×900 pe 63px scroll caveat).
- Decisions (owner): auth Google+Email, self-hosted Postgres, step-by-step migration, SQLite fallback rakho (`DATA_DIR` unset = local).
- NEXT phases (order): 1) Postgres+Prisma 2) BullMQ+Redis 3) Auth multi-user + token encryption 4) frontend split + React Query.
- GitHub: https://github.com/ShahzaibRao/Page-Manager-Pro.git — main (v0.1, v0.2) + **dev** active. Secrets gitignored; zero tokens staged (sirf `EAAB...` docs placeholders).
- Demo live: https://shahzaibrao.github.io/Page-Manager-Pro/ (`docs/`, workflow deploy). About + homepage set.
- Stack: backend Express :4000 (node:sqlite `data.db`, node-cron Asia/Karachi) + frontend Next.js 14 :3000. Run: `start-all.bat`.
- Mode: LIVE. System User token `.env` me. Sync: "Followers Page BM" → **~2797 pages**, **~19 posting access**.
- Pages tab: Posting Access/All filter + search + **followers sorting** (default high→low) + **pagination 200/page with numbered nav**.
- Selected page + lang + theme **localStorage persisted** (restore post-mount only — hydration fix).
- Global: `/api/overview` + `/api/viral-global`. Dashboard/Insights/Viral me global branches.
- Uploads: photos (single/multi), video, **reels 3-phase** (fallback /videos), progress bar (XHR), schedule (photos FB-side, video local queue + cron).
- Watchers: daily auto-folder (`watchers`) + **Creator Watch instant** (`instant_watchers`, 30s scan, stability check, per_scan 1–20). Delete SIRF FB-id + DB record ke baad.
- Folder **stock alerts**: API `stock` (ok/low<30/watch<20/critical<11) + `days_left`; header bell + dropdown + critical toast; cards pe badge.
- Reports: `/api/history?range=&page_id=` (by_type + daily per-page published/failed/errors). Reports tab + dashboard widget (7/28/90d).
- i18n (en/ur/es/zh/ar, ar=RTL, default ur) + themes (dark/black/light), Settings > Appearance.
- Perf: FB calls parallel (pLimit 6), metrics parallel, TTL cache (insights/overview 5m, viral 3m, health 10m; Sync clears), frontend tab-lazy loading. Measured: insights 1.8s→0.05s warm, top-posts ~4s→0.05s warm.
- `npm run build` dev server chalte hue `.next` corrupt karta hai → `.next` delete + restart. `tsc --noEmit` safe check hai.

## Permissions (token, verified via /me/permissions)
20 granted — pages_manage_posts, pages_show_list, read_insights, business_management,
pages_read_engagement, pages_read_user_content, publish_video, + misc. Sab chahiye wale mojood.

## Known API Facts (v26.0, new Pages experience)
- Page-level calls PAGE TOKEN se; system token se "Page access token required" error. Page tokens sync pe `?ids=` batch se backfill hote hain (re-sync wipe nahi karta).
- Post `type` field deprecated (#12 error) — fields me mat mango.
- Page insights deprecated: page_impressions(_unique), page_engaged_users, page_fans(_adds). Working: `page_views_total`, `page_post_engagements`, `page_video_views(_paid/_organic)`, `page_video_view_time`.
- Post reach (`post_impressions`) unavailable — Viral engagement-based hai (rule text me wazeh).
- `/monetization_eligibility` edge mojood nahi (2500) → public-criteria ESTIMATE.
- `/me/businesses` flaky (kabhi empty) → `FB_BUSINESS_ID` fallback + retry-on-empty + DB persistence. `/me/accounts` + `owned_pages` (paginated, ~2797 total).
- v20.0 deprecated (auto-upgrade hota hai); default v26.0 set hai.

## Incidents
- 9 rapid "hi" test posts → spam block 368 (temporary). Lesson: bulk tests nahi; test ho to foran delete.
- Watcher file-delete bug → fix: DB record PEHLE, unlink AKHIR me (Constitution rule).
- page-token axios dump log file me gaya tha → deleted; full dumps banned.
- Hydration error (Global subtitle) → localStorage restore sirf mount-effect me.
- Dev 404s (JS/CSS) → `.next` corrupt tha → delete + fresh restart.

## Pending / Next
- Baqi pages ko posting access (user: Business Settings → assets assign → Sync).
- Video schedule cron end-to-end test.
