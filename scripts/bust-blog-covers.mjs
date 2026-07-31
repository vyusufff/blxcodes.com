import fs from 'fs';
import path from 'path';

const dir = 'public/images/blog/card';
const posts = [
  ['how-to-change-roblox-username.md', 'change-username'],
  ['how-to-enable-2fa-roblox.md', 'enable-2fa'],
  ['how-to-trade-on-roblox.md', 'trade-roblox'],
  ['how-to-get-free-roblox-avatar-items.md', 'free-avatar-items'],
  ['how-to-redeem-roblox-gift-card.md', 'redeem-gift-card'],
  ['is-roblox-premium-worth-it.md', 'premium-worth-it'],
  ['how-to-fix-roblox-not-loading.md', 'fix-not-loading'],
  ['how-to-make-roblox-avatar.md', 'make-avatar'],
  ['how-to-create-roblox-group.md', 'create-group'],
  ['how-to-report-players-on-roblox.md', 'report-players'],
  ['how-to-play-roblox-on-pc-and-phone.md', 'play-anywhere'],
  ['what-are-roblox-private-servers.md', 'private-servers'],
];

for (const [md, base] of posts) {
  for (const suffix of ['', '-400']) {
    const from = path.join(dir, `${base}${suffix}.webp`);
    const to = path.join(dir, `${base}-v2${suffix}.webp`);
    if (!fs.existsSync(from)) {
      console.log('missing', from);
      continue;
    }
    if (fs.existsSync(to)) fs.unlinkSync(to);
    fs.renameSync(from, to);
  }
  const mdPath = path.join('src/content/blog', md);
  let text = fs.readFileSync(mdPath, 'utf8');
  const oldCover = `cover: "/images/blog/card/${base}.webp"`;
  const newCover = `cover: "/images/blog/card/${base}-v2.webp"`;
  if (!text.includes(oldCover) && !text.includes(newCover)) {
    console.log('cover line missing in', md);
  }
  text = text.replace(oldCover, newCover);
  fs.writeFileSync(mdPath, text);
  console.log('ok', base, fs.statSync(path.join(dir, `${base}-v2.webp`)).size);
}
