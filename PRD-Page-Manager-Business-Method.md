# PRD - My Page Manager WebApp
### Secure Business Manager Integration
**Version:** 1.0 Final | **Date:** 23 Sep 2026 | **Owner:** Shahzaib Rao

### 1. Product Overview
Ek secure personal webapp dashboard jo Facebook Business Manager ke through pages ko manage karega. Saare pages Business Manager me add honge aur saara access System User Token ke zariye hoga taake 100% Facebook Policy compliant rahe.

Problem: Rozana Business Suite kholna, alag alag pages check karna, monetization status aur viral posts ka pata lagana mushkil hai.
Solution: Ek single dashboard jahan saare Business Manager ke pages ka control ho.

### 2. Goals & Non-Goals
**Goals:**
- 100% Facebook Platform Policy Compliant solution
- Saare pages Business Manager me centralized
- Post, Schedule, Insights, Monetization, Viral Analysis ek jagah

**Non-Goals (V1 me nahi karna):**
- Kisi aur ke pages manage karna (sirf apne business ke)
- Facebook ko bypass karna ya scraping
- Auto like/follow bots

### 3. Architecture - Secure & Compliant

**Flow:**
[User Browser] -> [Our WebApp Frontend - Next.js] -> [Our Backend API - Node.js] -> [Facebook Graph API v20.0 using System User Token] -> [Business Manager Pages]

**Security Rules:**
1.  Saare Pages `business.facebook.com > Pages` me add honge.
2.  Token: System User Token use hoga, jo kabhi expire nahi hota. Personal User Token use nahi hoga.
3.  Token Storage: Sirf Backend ke .env me, Frontend pe kabhi nahi ayega.
4.  App Type: Business App, jo Business Manager se linked hoga.
5.  Permissions (Official): pages_manage_posts, pages_read_engagement, pages_show_list, read_insights, business_management, pages_read_user_content

### 4. Features - Detailed

**Module A: Business Manager Connection**
- FB Login -> Business List fetch -> Pages List fetch
- UI pe dikhana: Kaunsa page kaunse Business me hai
- Status: Connected / Not Connected

**Module B: Post & Schedule Manager**
- Create Post: Text, Photo (single/multiple), Video (upto 4GB), Link Preview
- API Endpoint: POST /{page-id}/feed, POST /{page-id}/photos, POST /{page-id}/videos
- Schedule: DateTime picker (Asia/Karachi timezone). Backend pe cron se publish hoga.
- Queue: /{page-id}/scheduled_posts se scheduled posts ki list
- Actions: Edit Scheduled Time, Delete

**Module C: Page Health & Monetization Checker**
- Page Status: Page restriction, Quality tab data. API: /{page-id}?fields=is_published,verification_status
- Monetization Eligibility: API: /{page-id}/monetization_eligibility
- Cards Show:
  - In-Stream Ads: Eligible / Not Eligible + Remaining Criteria (e.g. 10k followers, 600k minutes viewed)
  - Stars, Subscriptions, Branded Content status
  - Payout account connected hai ya nahi

**Module D: Full Insights Dashboard**
- Date Range Filter: Last 7, 28, 90 Days
- KPI Cards: Total Followers, Page Reach, Page Engagement, 3-Second Video Views
- Charts: Daily Reach, Engagement Trend (Line Chart)
- Audience: Age/Gender split, Top Cities, When Fans Are Online
- API: /{page-id}/insights?metric=page_impressions,page_engaged_users,page_fans etc.

**Module E: Viral Content & Top Posts Analyzer**
- Table: All posts with columns: Post Message, Type, Created Time, Reach, Likes, Comments, Shares, Views
- Sort By: Highest Reach, Highest Engagement Rate (Engagement/Reach)
- Viral Logic: Agar kisi post ka Reach > (Avg Reach * 2.5) to Viral Tag
- API: /{page-id}/posts?fields=message,full_picture,created_time,insights.metric(post_impressions,post_engaged_users)

**Module F: Admin & Logs**
- Activity Log: Kis time kaunsi post hui
- Token Health Check: System User token valid hai ya nahi

### 5. User Stories
- As an Admin, I want to connect my Business Manager so that all my pages are listed securely.
- As an Admin, I want to schedule a post for tomorrow 8PM so that I don't have to be online.
- As an Admin, I want to see if my page is eligible for monetization so that I can track criteria.
- As an Admin, I want to see my most viral post of last 30 days so that I can create similar content.

### 6. Data Model
- businesses {id, name}
- pages {id, fb_page_id, name, category, business_id, followers_count}
- posts {id, fb_post_id, page_id, message, type, status (published/scheduled/draft), scheduled_time, insights_json}
- system_user {token_encrypted, last_validated_at}

### 7. Tech Stack
Frontend: Next.js 14, Tailwind, Shadcn UI, Recharts
Backend: Node.js + Express, Prisma ORM
DB: Supabase (Postgres)
Queue: BullMQ + Redis for scheduled posting
Auth: NextAuth.js (Facebook Provider)
Hosting: Vercel (Frontend+Backend), Supabase DB

### 8. Facebook App Review Plan (Important for Policy Compliance)
App ko review me bhejte waqt ye batana hai:
- Use Case: "My app helps me manage my own Facebook Pages that are part of my Business Manager"
- Screencast: Login > Select Business > Select Page > Create Post > Show Insights
- Business Verification: Business Manager verified hona chahiye (Documents upload)
- Data Handling: We don't store user data of other people, only our own page insights.

### 9. Milestones
Phase 1 (Week 1): Business Manager setup, App creation, System User token generation, Login flow
Phase 2 (Week 2): Post & Schedule module complete
Phase 3 (Week 3): Insights + Monetization + Viral module
Phase 4 (Week 4): UI polish, Security audit, Deploy

### 10. Success Metrics
- Post publish success rate > 99%
- Insights load time < 2 sec
- Zero Policy Violations
