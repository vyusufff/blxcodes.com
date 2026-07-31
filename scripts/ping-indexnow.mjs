import { readFileSync, existsSync } from 'node:fs';

const INDEXNOW_KEY = '7c4e9a2f8b1d4e6a9c0f3b5d7e8a1c2f';
const SITE_URL = 'https://blxcodes.com';

const sitemapPath = 'dist/sitemap-0.xml';
if (!existsSync(sitemapPath)) {
  console.warn('[indexnow] sitemap missing, skip ping');
  process.exit(0);
}

const xml = readFileSync(sitemapPath, 'utf8');
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

if (urls.length === 0) {
  console.warn('[indexnow] no urls, skip ping');
  process.exit(0);
}

const body = {
  host: 'blxcodes.com',
  key: INDEXNOW_KEY,
  keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
  urlList: urls.slice(0, 10000),
};

try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  console.log(`[indexnow] ${res.status} — submitted ${body.urlList.length} urls`);
} catch (err) {
  console.warn('[indexnow] ping failed (non-fatal):', err?.message ?? err);
}
