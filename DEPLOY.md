# DEPLOY — kisi bhi server pe (Ubuntu + Docker)

> Koi IP configure nahi karna. Browser relative `/api` mangta hai,
> Next.js server-side backend pe proxy karta hai. IP change pe rebuild nahi chahiye.

## 1. Server ready karo

- Ubuntu 22.04 (4GB+ RAM recommended), Docker + Compose plugin:
  ```bash
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER   # phir dobara login karo (ya sudo lagao)
  ```
- Firewall me ye ports kholo (apne provider ke panel + `ufw` dono dekho):
  - `3000` — dashboard
  - `4000` — API (optional, debugging ke liye)
- Tip: jab tak app me login nahi, ports sirf **apne IP** ke liye kholo (`0.0.0.0/0` nahi).

## 2. Code + token

```bash
git clone -b staging https://github.com/ShahzaibRao/Page-Manager-Pro.git
cd Page-Manager-Pro
cp backend/.env.example backend/.env
nano backend/.env
```

`.env` me lazmi:

```env
FB_SYSTEM_USER_TOKEN=EAAB...   # System User Token (FB-SETUP-GUIDE.md dekho)
FB_BUSINESS_ID=...             # optional — auto-detect bhi hota hai
POSTGRES_PASSWORD=mazboot-password-yahan
```

> `.env` git me nahi jata — har server pe khud banana hota hai. Iske baghair
> "not connected" ayega.

## 3. Run

```bash
docker compose up --build -d
docker compose ps              # sab healthy hone chahiye
```

Kholo: `http://SERVER-IP:3000` → token Connect screen me paste karo (ya `.env`
me pehle se ho to sidha Sync).

## 4. Verify (server ke andar se)

```bash
curl http://localhost:4000/api/health          # {"ok":true,...,"connected":true}
curl http://localhost:3000/api/health          # proxy check — same JSON ana chahiye
```

## 5. Update (baad me)

```bash
cd Page-Manager-Pro
git pull origin staging
docker compose up --build -d
```

Data (`data.db` + uploads) volumes me persist rehta hai — update pe nahi urta.

## Masle

| Error | Hal |
|---|---|
| Browser me "Backend offline" | Frontend purana build? `docker compose up --build -d` dobara. Phir bhi ho to server pe Step 4 check karo |
| "Not connected" | `.env` me token nahi — Step 2 |
| Connect pe "0 pages" | Header **Sync** dobara (retry built-in hai) |
| Port bahir se band | Provider firewall (AWS SG / OCI SL / ufw) me 3000 khula hona chahiye |
| Purana data chahiye | Volumes mat delete karo (`down` me `-v` mat lagao) |
