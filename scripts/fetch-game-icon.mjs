import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const placeId = process.argv[2];
const slug = process.argv[3];
if (!placeId || !slug) {
  console.error('Usage: node scripts/fetch-game-icon.mjs <placeId> <slug>');
  process.exit(1);
}

const api = `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`;
const res = await fetch(api);
const json = await res.json();
const url = json?.data?.[0]?.imageUrl;
if (!url) {
  console.error('No icon URL', json);
  process.exit(1);
}

const img = await fetch(url);
const buf = Buffer.from(await img.arrayBuffer());
const dir = 'public/images/games/card';
fs.mkdirSync(dir, { recursive: true });
const full = path.join('public/images/games', `${slug}.webp`);
const card = path.join(dir, `${slug}.webp`);
const card192 = path.join(dir, `${slug}-192.webp`);

await sharp(buf).resize(512, 512, { fit: 'cover' }).webp({ quality: 82 }).toFile(full);
await sharp(buf).resize(320, 320, { fit: 'cover' }).webp({ quality: 68 }).toFile(card);
await sharp(buf).resize(192, 192, { fit: 'cover' }).webp({ quality: 65 }).toFile(card192);
console.log('ok', slug, url);
