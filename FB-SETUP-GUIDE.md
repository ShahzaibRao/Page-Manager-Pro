# Facebook Business Method — Setup Guide (Local)
**MaQsad:** System User Token banana taake app 100% Policy Compliant rahe. Personal User Token use NAHI karna.

## Step 1 — Business Manager ready karein
1. `business.facebook.com` pe jayein, apna Business account banayein/verify karein.
2. **Business Settings > Pages > Add** — apne saare Pages add karein (ye PRD ka Security Rule #1 hai).
3. Business Verification: **Business Settings > Security Center > Start Verification** — documents (business license / utility bill / domain) upload karein. App Review ke liye ye LAZMI hai.

## Step 2 — Facebook App banayein (Business Type)
1. `developers.facebook.com > My Apps > Create App` — **App Type: Business** select karein.
2. App ko apne Business Manager se link karein: **App Settings > Business Manager** me business select karein.
3. **Products:** Facebook Login add karein (local testing ke liye `http://localhost:3000` Valid OAuth Redirect me add karein).

## Step 3 — Permissions (Official, PRD ke mutabiq)
App Review me ye permissions mangein:
- `pages_manage_posts` — post + schedule
- `pages_read_engagement` — reach/engagement read
- `pages_show_list` — pages list
- `read_insights` — insights dashboard
- `business_management` — business/pages fetch
- `pages_read_user_content` — top posts read

## Step 4 — System User + Token (kabhi expire NAHI hota)
1. **Business Settings > Users > System Users > Add** — naam: `PageManager Server`, Role: **Admin**.
2. **Add Assets:** apne Pages select karein + permissions dein (Manage Page, Create content, Read insights).
3. System User pe click > **Generate New Token** > App select karein > upar wali permissions tick karein > **Generate**.
4. Token copy karke **sirf** `backend/.env` me rakhein:
```env
FB_APP_ID=1234567890
FB_BUSINESS_ID=your_business_id
FB_SYSTEM_USER_TOKEN=EAAB... (ye wala)
```
> ⚠️ Token kabhi frontend code, GitHub, ya screenshot me NAHI dalna. Ye sirf backend `.env` me rehta hai — hamara frontend ise kabhi fetch nahi karta.

## Step 5 — Local me Live mode check
1. `cd backend && npm start`
2. Browser: `http://localhost:4000/api/token/health` — `{"mode":"LIVE","valid":true}` aana chahiye.
3. Frontend header pe **"Business Manager Connected"** green pill ajayegi (MOCK ki jagah LIVE).

## Step 6 — App Review (jab publish karna ho)
- **Use case line:** "My app helps me manage my own Facebook Pages that are part of my Business Manager."
- **Screencast:** Login > Select Business > Select Page > Create Post > Show Insights (2-3 min video).
- **Data handling note:** "We don't store other people's data, only our own page insights."
- Jab tak review approve na ho, App **Development Mode** me rakhein — sirf apne added Test Users/Pages kaam karenge, jo local testing ke liye kaafi hai.

## Quick answers
| Sawal | Jawab |
|---|---|
| Token expire hoga? | Nahi — System User Token never expires (personal token 60 din me expire hota hai, is liye wo use nahi karte) |
| Frontend ko token chahiye? | Nahi — saari FB calls backend karta hai |
| Scheduling kaise hoti hai local me? | `node-cron` har minute due posts publish karta hai (Asia/Karachi). Server me BullMQ/Redis ki jagah yehi hai |
| DB kahan hai? | `backend/data.db` (SQLite file). Delete karne se fresh demo data dobara seed ho jayega |
