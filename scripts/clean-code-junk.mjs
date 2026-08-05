/**
 * Remove fake "codes" that earlier scraping runs pulled out of article prose.
 *
 * Two signals mark an entry as junk:
 *   1. It is a known prose word ("bookmark", "war-related", stray entity digits).
 *   2. It is an ordinary capitalised word that shows up as expired across many
 *      unrelated games — real codes are game-specific, article boilerplate is not.
 *
 * Only expired entries are touched: an active entry may well be a real code
 * (plenty of games really do use WELCOME or START), so those are reported for
 * manual review instead of deleted. ALL-CAPS tokens and anything containing a
 * digit are always kept, since those are shaped like genuine codes.
 *
 * Usage:
 *   node scripts/clean-code-junk.mjs
 *   node scripts/clean-code-junk.mjs --write
 */
import fs from 'fs';
import path from 'path';
import { isProseToken } from './prose-words.mjs';

const GAMES_DIR = path.join(process.cwd(), 'src/content/games');
const WRITE = process.argv.includes('--write');
/** An expired token seen in at least this many games is article boilerplate. */
const SHARED_ACROSS_GAMES = 4;

const files = fs.readdirSync(GAMES_DIR).filter((f) => f.endsWith('.json'));
const games = files.map((file) => ({
  file,
  data: JSON.parse(fs.readFileSync(path.join(GAMES_DIR, file), 'utf8')),
}));

const expiredReach = new Map();
for (const { data } of games) {
  for (const code of new Set((data.codes || []).filter((c) => c.status !== 'active').map((c) => c.code))) {
    expiredReach.set(code, (expiredReach.get(code) || 0) + 1);
  }
}

/**
 * Plain words keep normal capitalisation; genuine codes shout, carry digits or
 * run words together in camel case ("SorryForBugs").
 */
function isWordShaped(code) {
  const value = String(code);
  if (/[0-9_!]/.test(value)) return false;
  if (/^[A-Z-]+$/.test(value)) return false;
  if ((value.match(/[A-Z]/g) || []).length >= 2) return false;
  return /^[A-Za-z][A-Za-z-]*$/.test(value);
}

function isJunk(entry) {
  if (entry.status === 'active') return false;
  if (isProseToken(entry.code)) return true;
  return isWordShaped(entry.code) && (expiredReach.get(entry.code) || 0) >= SHARED_ACROSS_GAMES;
}

function normalizeReward(reward) {
  if (typeof reward !== 'string') return reward;
  return reward
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let touchedFiles = 0;
let removed = 0;
let rewardsFixed = 0;
const keptActive = new Map();

for (const { file, data } of games) {
  const cleaned = [];
  let fileRemoved = 0;
  let fileRewards = 0;

  for (const entry of data.codes || []) {
    if (isJunk(entry)) {
      fileRemoved += 1;
      continue;
    }
    if (entry.status === 'active' && isProseToken(entry.code)) {
      keptActive.set(entry.code, (keptActive.get(entry.code) || 0) + 1);
    }
    const reward = normalizeReward(entry.reward);
    if (reward !== entry.reward) {
      fileRewards += 1;
      cleaned.push({ ...entry, reward: reward || 'Free rewards' });
    } else {
      cleaned.push(entry);
    }
  }

  if (!fileRemoved && !fileRewards) continue;

  touchedFiles += 1;
  removed += fileRemoved;
  rewardsFixed += fileRewards;
  data.codes = cleaned;
  if (WRITE) fs.writeFileSync(path.join(GAMES_DIR, file), JSON.stringify(data, null, 2) + '\n');
}

console.log(`${WRITE ? 'WRITE' : 'DRY-RUN'} | files touched: ${touchedFiles}/${files.length}`);
console.log(`removed fake expired codes: ${removed}`);
console.log(`normalized rewards: ${rewardsFixed}`);
if (keptActive.size) {
  console.log(
    `\nkept (active, review manually): ${[...keptActive.entries()].map(([c, n]) => `${c}x${n}`).join(', ')}`,
  );
}
if (!WRITE) console.log('\nRe-run with --write to apply.');
