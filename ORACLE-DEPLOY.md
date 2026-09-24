# Oracle Cloud Deploy (Ubuntu, Docker Compose)

Server: `92.5.169.113` (example — apna IP rakhein). Repo: `/home/ubuntu/Page-Manager-Pro`.

## 1. Pehli dafa — backend env (LAZMI, ye git se nahi ata)

```bash
cd /home/ubuntu/Page-Manager-Pro
cp backend/.env.example backend/.env
nano backend/.env
```

Ye values set karein:

```env
FB_SYSTEM_USER_TOKEN=EAAB...   # apna real token
FB_BUSINESS_ID=...
FRONTEND_URL=http://92.5.169.113:3000
```

> `.env` gitignored hai — clone me nahi ata, har server pe khud banana hota hai.
> Isi liye "not connected" araha tha: token hi nahi tha.

## 2. Frontend ko backend ka address batana (LAZMI)

Browser `localhost:4000` ko **apna laptop** samajhta hai, server nahi. Is liye
frontend image server ke IP ke sath build karo:

```bash
cd /home/ubuntu/Page-Manager-Pro
NEXT_PUBLIC_API_URL=http://92.5.169.113:4000 FRONTEND_URL=http://92.5.169.113:3000 docker compose up --build -d
```

> `NEXT_PUBLIC_API_URL` build-time pe bundle me bake hota hai — IP badle to
> frontend **dobara build** karna hoga (`--build`).

## 3. Firewall kholna (2 jagah)

```bash
sudo ufw allow 3000/tcp
sudo ufw allow 4000/tcp
```

OCI Console → Virtual Cloud Network → Security List → **Ingress Rules** add:
- `0.0.0.0/0`, TCP, port `3000` (dashboard)
- `0.0.0.0/0`, TCP, port `4000` (API)

> Dono me se ek bhi band hui to page nahi khulega / backend offline dikhega.

## 4. Check

```bash
docker compose ps
curl http://localhost:4000/api/health     # server ke andar se
```

Browser me kholein: **http://92.5.169.113:3000** → Connect screen pe token
paste karein (ya `.env` me pehle se ho to sidha Sync).

## 5. Update deploy (baad me)

```bash
cd /home/ubuntu/Page-Manager-Pro
git pull origin staging   # ya main, jo branch use ho
NEXT_PUBLIC_API_URL=http://92.5.169.113:4000 docker compose up --build -d
```

## Masle

| Error | Hal |
|---|---|
| "Backend offline" (browser me) | Step 2 + 3 — API URL ya firewall |
| "Not connected" | Step 1 — `.env` me token nahi |
| Connect pe "0 pages" | Sync dobara (retry built-in hai) |
