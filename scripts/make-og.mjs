import sharp from 'sharp';
import fs from 'fs';

fs.mkdirSync('public/images', { recursive: true });

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#10141c"/>
      <stop offset="100%" stop-color="#243041"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <path d="M620 90 L420 330 h170 L470 540 L780 280 H600 L620 90z" fill="#FF5A1F"/>
  <text x="80" y="520" font-family="Arial Black, Arial, sans-serif" font-size="96" font-weight="700" fill="#ffffff">BLX</text>
  <text x="320" y="520" font-family="Arial Black, Arial, sans-serif" font-size="96" font-weight="700" fill="#FF5A1F">Codes</text>
  <text x="80" y="580" font-family="Arial, sans-serif" font-size="32" fill="#9aa8b8">Working Roblox codes</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/images/og-default.png');
console.log('wrote og-default.png', fs.statSync('public/images/og-default.png').size);
