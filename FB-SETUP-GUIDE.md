# Facebook Business Method — Setup Guide (Local)
**MaQsad:** System User Token banana taake app 100% Policy Compliant rahe. Personal User Token use NAHI karna.

## Step 1 — Business Manager ready karein
1. `business.facebook.com` pe jayein, apna Business account banayein/verify karein.
2. **Business Settings > Pages > Add** — apne saare Pages add karein (ye PRD ka Security Rule #1 hai).
3. Business Verification: **Business Settings > Security Center > Start Verification** — documents upload karein. App Review ke liye LAZMI hai.

## Step 2 — Facebook App banayein (Business Type)
1. `developers.facebook.com > My Apps > Create App` — **App Type: Business** select karein.
2. App ko Business Manager se link karein: **App Settings > Business Manager**.
3. Graph API version: **v26.0** (v20 deprecated hai — app default v26.0 use karti hai).

## Step 3 — Permissions (20, verified working set)
Token generate karte waqt ye tick karein (plus App Review me yehi mangein):
- `pages_manage_posts` — post + schedule + delete
- `publish_video` — video/reel upload
- `pages_read_engagement` — likes/comments/shares read
- `pages_show_list` — pages list (`/me/accounts`)
- `read_insights` — insights (note: purani reach metrics Meta ne deprecate ki hain; app working metrics use karti hai)
- `business_management` — business/pages fetch
- `pages_read_user_content` — top posts read
- Baqi helpful: `pages_manage_metadata`, `pages_manage_engagement`, `pages_messaging`, `ads_read`

## Step 4 — System User + Token (kabhi expire NAHI hota)
1. **Business Settings > Users > System Users > Add** — naam: `PageManager Server`, Role: **Admin**.
2. **Add Assets (LAZMI — posting access ke liye):** jin pages pe post karna hai wo select karein + permissions dein (Manage Page, Create content, Read insights). Assets ke baghair page list me ayega lekin post nahi hoga.
3. System User > **Generate New Token** > App select > Step-3 wali permissions tick > **Generate**.
4. Token copy karke **sirf** `backend/.env` me rakhein (ya app ki Connect screen me paste karein — wahan se khud `.env` me save hota hai):
```env
FB_APP_ID=1234567890
FB_BUSINESS_ID=your_business_id
FB_SYSTEM_USER_TOKEN=EAAB... (ye wala)
```
> ⚠️ Token kabhi frontend code, GitHub, screenshot, ya chat me forward NAHI karna. Ye sirf backend `.env` me rehta hai — hamara frontend ise kabhi fetch nahi karta (verify: API responses me zero token fields).

## Step 5 — Local me Live mode check
1. `start-all.bat` double-click karein (ya 2 terminals: `cd backend && npm start`, `cd frontend && npm run dev`).
2. Browser: `http://localhost:4000/api/token/health` — `{"connected":true,"valid":true}` aana chahiye.
3. Dashboard: header pe **"Business Manager Connected"** green pill + pages sync. Pehle Sync me time lag sakta hai (hazaron pages + pagination).

## Step 6 — App Review (jab publish karna ho)
- **Use case:** "My app helps me manage my own Facebook Pages that are part of my Business Manager."
- **Screencast:** Connect > Select Page > Create Post > Schedule > Insights > Viral (2-3 min).
- **Business Verification:** verified hona chahiye (documents).
- **Data handling:** "We don't store other people's data, only our own page insights."
- Jab tak review approve na ho, App **Development Mode** me rakhein.

## Troubleshooting (dekhe gaye masle + hal)
| Masla | Wajah / Hal |
|---|---|
| Connect pe "0 pages synced" | FB edge transiently khali deta hai — app auto-retry karti hai; na ho to header **Sync** dobara dabayein |
| Page list me hai, post nahi hota | System User ko us page ka asset access nahi — Step 4.2 karein, phir Sync |
| "Page access token required" | Purana sync — dobara Sync karein (page-tokens auto backfill hote hain) |
| Post fail code 368 | Facebook spam block (rapid posting) — kuch waqt rukein, bulk tests na karein |
| Insights me 0 / unavailable | Purani metrics (`page_impressions` etc.) deprecated hain — app working metrics dikhati hai; kuch pages pe data waqai zero hota hai |
| Disconnect button | Sirf token badalne ke liye — ye synced pages bhi wipe karta hai. Normal refresh ke liye **Sync** use karein |

## Quick answers
| Sawal | Jawab |
|---|---|
| Token expire hoga? | Nahi — System User Token never expires |
| Frontend ko token chahiye? | Nahi — saari FB calls backend karta hai |
| Scheduling kaise hoti hai? | Photos FB pe schedule; videos local queue → `node-cron` (Asia/Karachi, har minute). Server on rakhna hoga |
| Auto-folder kaise kaam karta hai? | Daily time pe purani files upload + delete; Creator Watch me file ate hi (~30s) upload + delete |
| DB kahan hai? | `backend/data.db` (SQLite). Delete = khali fresh DB (koi seed nahi) |
