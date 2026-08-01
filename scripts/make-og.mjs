/**
 * Regenerate default OG (1200×630) — SVG fallback if the designed PNG is missing.
 * Designed asset lives at public/images/og-default-v2.png
 */
import sharp from 'sharp';
import fs from 'fs';

const out = 'public/images/og-default-v2.png';
fs.mkdirSync('public/images', { recursive: true });

if (fs.existsSync(out) && process.argv.includes('--force') === false) {
  console.log(out, 'already exists — pass --force to rebuild from SVG');
  process.exit(0);
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1018"/>
      <stop offset="55%" stop-color="#151c28"/>
      <stop offset="100%" stop-color="#1e2a3a"/>
    </linearGradient>
    <radialGradient id="glow" cx="32%" cy="42%" r="45%">
      <stop offset="0%" stop-color="#FF5A1F" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#FF5A1F" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="teal" cx="88%" cy="70%" r="35%">
      <stop offset="0%" stop-color="#0d7377" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#0d7377" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <rect width="1200" height="630" fill="url(#teal)"/>
  <path d="M340 95 L175 320 h145 L250 535 L520 275 H365 L340 95z" fill="#FF5A1F"/>
  <text x="560" y="300" font-family="Arial Black, Arial, sans-serif" font-size="88" font-weight="700" fill="#ffffff">BLX</text>
  <text x="760" y="300" font-family="Arial Black, Arial, sans-serif" font-size="88" font-weight="700" fill="#FF5A1F">Codes</text>
  <text x="560" y="360" font-family="Arial, sans-serif" font-size="28" letter-spacing="2" fill="#9aa8b8">Working Roblox codes</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(out);
console.log('wrote', out, fs.statSync(out).size);
