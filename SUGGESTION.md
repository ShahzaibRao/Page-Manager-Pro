# SUGGESTION — Page Manager Pro ko 1000+ Pages + Public Traffic ke liye Redesign

> Date: 24 Sep 2026 | Status: discussion draft — implement se pehle owner se approve karwana hai.
> Context: current app single-user LOCAL tool hai (SQLite, node-cron, no login).
> Goal: login/signup (multi-user), queues, auth, cloud DB, caching, compression, rendering, containerization.

---

## 1. Target Architecture (cloud-ready)

```
Browser ──> CDN (static) ──> Next.js (SSR/SSG + React Query)
                                    |
                                    v
                            API (Node + JWT auth, gzip/brotli, rate-limit)
                             ┌──────┴──────┐
                             v             v
                    Postgres (Supabase)  Redis (cache + BullMQ)
                             |             |
                             v             v
                    User data +        Workers: publish-queue,
                    encrypted tokens   insights-sync, page-sync
                                           |
                                           v
                                    Facebook Graph API
                                    (batch + webhooks)
```

## 2. Auth + Multi-User (login/signup)
- **NextAuth.js (Auth.js)** — Google + email/password (credentials). Har user ka apna account.
- **Multi-tenant data:** har table me `user_id` column — user sirf apna data dekhega.
- **Tokens encrypted at rest:** har user ka FB token AES-256-GCM se encrypt karke DB me (key server env/KMS me). Abhi plaintext hai — public karne se pehle ye **LAZMI**.
- Roles (baad me): `owner` (full) / `viewer` (sirf insights, no publish) — teams ke kaam ayega.

## 3. Database: SQLite → Postgres
- **Supabase Postgres** (free tier se start) ya **Neon**. `user_id` scoping + indexes on `(user_id, fb_page_id)`, `(user_id, created_at)`.
- Prisma ORM (type-safe migrations). SQLite file concurrent writes + heavy traffic handle nahi karegi.

## 4. Queue: cron → BullMQ + Redis
Alag queues, alag priority/concurrency:

| Queue | Kaam | Setting |
|---|---|---|
| `publish` | post/schedule/reel upload | concurrency 3, retry 3x backoff, spam-safe delay |
| `insights-sync` | nightly per-page insights refresh | repeatable cron, chunked |
| `page-sync` | full BM scan (paginated) | concurrency 2, ek user ek waqt me ek |
| `watchers` | folder jobs (daily + instant) | existing logic worker me move |

- **Rate limiting:** FB ~200 calls/user/hour — BullMQ `limiter` lagao taake block na lage.
- **Webhooks (cost ka sab se bara cut):** FB `page feed` webhook subscribe karo — change pe data aye, polling khatam. Polling = paisa + slow.

## 5. Caching (cost + speed)
- Redis TTL (jo in-memory cache banaya hai, wahi pattern migrate hoga): insights 30–60min, pages list 15min, viral 15min. Key format `u:{user}:insights:{page}:{range}`.
- **Stale-while-revalidate:** pehle cache dikhao, background me refresh — UI hamesha fast.
- Frontend: **React Query** (client cache + dedupe + background refetch) — abhi har tab switch pe refetch hota hai.

## 6. Frontend Rendering (1000+ pages, heavy traffic)
- **Sab se zaroori:** `page.tsx` (~150KB single component) ko **tab-wise split + `dynamic()` lazy import** — pehli load pe sirf Dashboard aye, baqi on-demand. Initial JS aadha ho jayega.
- **Virtualized lists:** hazaron rows DOM me render mat karo — `react-window`/`virtua` (sirf visible rows render).
- **next/image** (auto WebP/resize), skeleton loaders, pagination (already hai).
- **Compression:** gzip/brotli on (Next + API dono), API responses me sirf chahiye wale fields.

## 7. Containerize (updates + performance)
- **3 Docker images** (multi-stage builds): `web` (Next standalone), `api` (Express), `worker` (BullMQ). `docker-compose.yml` local parity ke liye.
- **CI/CD (GitHub Actions):** push → lint+build+test → GHCR push → deploy. Existing `pages.yml` ke sath `deploy.yml` add hoga.
- **Hosting (cost-wise):**
  - Start: **VPS (Hetzner ~€5–10/mo)** + single compose (Postgres+Redis containers) — sab se sasta, full control.
  - Scale: **Cloud Run** (api/worker, pay-per-use) + **Supabase** + **Upstash Redis** — traffic pe auto-scale, idle pe ~zero.
- Rolling updates + healthchecks (`/api/health` already hai) → zero-downtime deploys.

## 8. Observability + Safety (public se pehle must)
- Sentry (errors), request logs, per-user rate limits/quotas (free vs paid tiers baad me).
- Backup: Postgres daily backups (Supabase auto) + `.env`/keys alag secret manager me.

## 9. Migration Phases (staging pe, tarteeb se — har phase independently testable)
1. **Frontend split** — tabs lazy + React Query + virtualized pages list (speed, zero infra change, zero kharcha).
2. **Postgres + Prisma** — schema + migrate (SQLite code isolated hai, easy swap).
3. **Redis + BullMQ** — queues + cache (cron logic workers me move).
4. **Auth multi-user** — signup/login + token encryption + user_id scoping.
5. **Docker + CI/CD + cloud deploy** — compose, GHCR, VPS/Cloud Run.

## 10. Open Questions (owner se discuss)
- [ ] Phase 1 se start? (recommendation: YES — sirf code, foran speed boost)
- [ ] Hosting: VPS (sasta, fixed) vs serverless (scale, variable)?
- [ ] Free/paid tiers abhi se ya baad me?
- [ ] Teams/roles (viewer) V1 me ya baad me?
