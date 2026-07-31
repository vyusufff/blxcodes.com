import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const assets = 'C:/Users/vyusu/.cursor/projects/c-Users-vyusu-Desktop-blxcodes-com/assets';
const out = 'public/images/blog/card';

const map = [
  ['cover-recover-account.png', 'recover-account-v2'],
  ['cover-delete-account.png', 'delete-account-v2'],
  ['cover-add-friends.png', 'add-friends-v2'],
  ['cover-private-account.png', 'private-account-v2'],
  ['cover-safe-kids.png', 'safe-for-kids-v2'],
  ['cover-voice-chat.png', 'voice-chat-v2'],
  ['cover-roblox-studio.png', 'roblox-studio-v2'],
  ['cover-block-player.png', 'block-player-v2'],
  ['cover-join-friends.png', 'join-friends-v2'],
  ['cover-verify-email.png', 'verify-email-v2'],
];

fs.mkdirSync(out, { recursive: true });

for (const [src, name] of map) {
  const input = path.join(assets, src);
  if (!fs.existsSync(input)) {
    console.error('missing', input);
    process.exit(1);
  }
  await sharp(input).resize(640, 360, { fit: 'cover' }).webp({ quality: 84 }).toFile(path.join(out, `${name}.webp`));
  await sharp(input).resize(400, 225, { fit: 'cover' }).webp({ quality: 80 }).toFile(path.join(out, `${name}-400.webp`));
  console.log('ok', name, fs.statSync(path.join(out, `${name}.webp`)).size);
}
