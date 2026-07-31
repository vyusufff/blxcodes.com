# BLX Codes

Roblox codes site for [blxcodes.com](https://blxcodes.com) — Astro + Tailwind, hosted on Cloudflare Pages.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy to Cloudflare Pages

1. Push this repo to GitHub (optional but recommended).
2. In Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect repo  
   **or** deploy from CLI:

```bash
npx wrangler login
npm run deploy
```

Build settings if connecting Git:
- Framework preset: Astro
- Build command: `npm run build`
- Output directory: `dist`

Point domain `blxcodes.com` to the Pages project in Cloudflare DNS.
