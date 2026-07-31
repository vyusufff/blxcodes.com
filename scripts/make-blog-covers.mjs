import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT = 'public/images/blog/card';
fs.mkdirSync(OUT, { recursive: true });

const cards = [
  {
    file: 'change-username',
    line1: 'Change your',
    accent: 'Username',
    sub: 'Display name & handle tips',
  },
  {
    file: 'enable-2fa',
    line1: 'Lock down with',
    accent: '2FA',
    sub: 'Authenticator setup guide',
  },
  {
    file: 'trade-roblox',
    line1: 'How to',
    accent: 'Trade',
    sub: 'Limited items without scams',
  },
  {
    file: 'free-avatar-items',
    line1: 'Get free',
    accent: 'Avatar items',
    sub: 'Catalog filters & promos',
  },
  {
    file: 'redeem-gift-card',
    line1: 'Redeem a',
    accent: 'Gift card',
    sub: 'Robux on the right account',
  },
  {
    file: 'premium-worth-it',
    line1: 'Is Premium',
    accent: 'Worth it',
    sub: 'Stipend & perks — 2026',
  },
  {
    file: 'fix-not-loading',
    line1: 'Fix Roblox',
    accent: 'Not loading',
    sub: 'PC & mobile troubleshooting',
  },
  {
    file: 'make-avatar',
    line1: 'Customize',
    accent: 'Your avatar',
    sub: 'Looks on a budget',
  },
  {
    file: 'create-group',
    line1: 'Create a',
    accent: 'Group',
    sub: 'Roles, ranks, setup',
  },
  {
    file: 'report-players',
    line1: 'How to',
    accent: 'Report',
    sub: 'Abuse the right way',
  },
  {
    file: 'play-anywhere',
    line1: 'Play Roblox',
    accent: 'Anywhere',
    sub: 'PC, phone & console',
  },
  {
    file: 'private-servers',
    line1: 'What are',
    accent: 'Private servers',
    sub: 'VIP lobbies explained',
  },
];

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgFor({ line1, accent, sub }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="360" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="b" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="42"/>
    </filter>
  </defs>
  <rect width="640" height="360" fill="#0B1016"/>
  <circle cx="80" cy="320" r="160" fill="#0D7377" opacity="0.45" filter="url(#b)"/>
  <circle cx="560" cy="40" r="150" fill="#FF5A1F" opacity="0.35" filter="url(#b)"/>
  <text x="48" y="140" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="800" fill="#FFFFFF">${esc(line1)}</text>
  <text x="48" y="198" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="800" fill="#FF5A1F">${esc(accent)}</text>
  <text x="48" y="250" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="600" fill="#E8EEF5">${esc(sub)}</text>
</svg>`;
}

for (const card of cards) {
  const svg = Buffer.from(svgFor(card));
  const full = path.join(OUT, `${card.file}.webp`);
  const small = path.join(OUT, `${card.file}-400.webp`);
  await sharp(svg).webp({ quality: 82 }).toFile(full);
  await sharp(svg).resize(400).webp({ quality: 80 }).toFile(small);
  console.log('ok', card.file);
}
console.log('done', cards.length);
