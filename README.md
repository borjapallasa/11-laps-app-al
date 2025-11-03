# ElevenLabs TTS — Private Repo (Client + Server)

This repo contains:
- **client/** — Vite + React + TypeScript + Tailwind frontend.
- **server/** — Express proxy so your ElevenLabs API key stays private.

> ⚠️ Never expose your ElevenLabs API key in frontend code. Keep it in the server `.env` only.

---

## 1) Local Setup

```bash
# in repo root
npm install
cp server/.env.example server/.env
# edit server/.env and set ELEVENLABS_API_KEY=sk_xxx

# run both server and client
npm run dev
```
- Server runs on **http://localhost:8787**
- Client runs on **http://localhost:5173** (Vite)

The client is configured to call `/api/*` which Vite proxies to `http://localhost:8787` in dev.

---

## 2) Create a **Private** GitHub Repo and Push

```bash
# from repo root
git init
git add .
git commit -m "init: ElevenLabs TTS (client + server)"
# create a private repo on GitHub first (Settings > Repositories > New > Private)
git remote add origin git@github.com:<your-username>/<your-private-repo>.git
git branch -M main
git push -u origin main
```

---

## 3) Production Notes

- For production, deploy **server/** to your Node host (Render, Fly.io, Railway, VPS, etc.).
- Then build the client and serve it from any static host (Netlify, Vercel, Cloudflare Pages) with the client pointing to your server URL (set `VITE_API_BASE`).
- Your API key **must** remain on the server. Do **not** bundle it into client builds.

---

## 4) Where is the page?

The page exported as `ElevenLabsTTSPage` is rendered at the app root (`/`). You can move it into your own routing if needed.