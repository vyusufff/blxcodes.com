/**
 * Sync codes from Beebom / Eurogamer / Fandom into src/content/games/*.json
 *
 * Usage:
 *   node scripts/check-codes.mjs
 *   node scripts/check-codes.mjs --write
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src/content/games');
const SOURCES_PATH = path.join(ROOT, 'scripts/sources.json');
const WRITE = process.argv.includes('--write');
const TODAY = new Date().toISOString().slice(0, 10);

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const STOP = new Set(
  `
  a an the and or for with from how all working here codes code july june may april march
  january february august september october november december new copy redeem reward rewards
  free active expired update updated latest skip main content release schedule best more
  roblox eurogamer beebom fandom wiki net www https http com html page pages guide guides
  game games experience developer discord server official list lists click share read
  cookie cookies enable targeting manage settings please see this content while its
  note notes latest january february august september october november december
  blox fruits minigames keyboard escape garden grow steal brainrot anime expeditions
  volleyball legends knockout gakuran adopt murder mystery epic throw coin titan
  attack revolution speed minutes hours hour double stat refund title in of to is on
  you your we our they their as at by if into about after before between through
  `.trim().split(/\s+/),
);

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h\d|tr|ul|ol)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' '),
  );
}

function looksLikeCode(code) {
  if (!code || code.length < 3 || code.length > 48) return false;
  if (STOP.has(code.toLowerCase())) return false;
  if (!/^[A-Za-z0-9!_\-/]+$/.test(code)) return false;
  // Prefer codes that aren't plain English words
  if (/^[a-z]+$/.test(code) && code.length < 6) return false;
  return true;
}

function findExpiredSplit(text) {
  const patterns = [
    /all\s+expired[\s\w]*codes/i,
    /expired\s+[\w\s]{0,40}codes/i,
    /\bexpired codes\b/i,
  ];
  let best = -1;
  for (const re of patterns) {
    const m = re.exec(text);
    if (m && (best < 0 || m.index < best)) best = m.index;
  }
  return best;
}

/** Only CODE: reward / CODE - reward pairs (strict). */
function parseRewardPairs(section) {
  const pairs = new Map();
  const lines = section.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const cleaned = line
      .replace(/\bNEWCopy\b/gi, '')
      .replace(/\bCopy\b/gi, '')
      .replace(/\bNEW\b/gi, '')
      .trim();
    const m = cleaned.match(
      /^([A-Za-z0-9!_][A-Za-z0-9!_\-/]{2,47})\s*(?:[:–—-]|\u2013|\u2014)\s+(.+)$/,
    );
    if (!m) continue;
    const code = m[1].trim();
    const reward = m[2].replace(/\s+/g, ' ').trim();
    if (!looksLikeCode(code)) continue;
    if (!reward || reward.length < 2 || reward.length > 180) continue;
    if (/^(and|the|for|with|from|how|all|working|here|codes)$/i.test(reward)) continue;
    pairs.set(code, reward);
  }
  return pairs;
}

/** Expired walls are often space-separated bare codes. */
function parseBareCodes(section) {
  const out = new Map();
  const tokens = section.match(/[A-Za-z0-9!_\-/]{3,48}/g) || [];
  for (const t of tokens) {
    if (!looksLikeCode(t)) continue;
    // Bare English-looking lowercase words are weak; require digit, underscore, or Capitals
    if (/^[a-z]+$/.test(t) && t.length < 8) continue;
    out.set(t, 'Expired reward');
  }
  return out;
}

function parseSource(text) {
  if (/enable targeting cookies|manage cookie settings/i.test(text) && !/:\s+.+/m.test(text)) {
    return { active: new Map(), expired: new Map(), blocked: true };
  }

  const idx = findExpiredSplit(text);
  const activeText = idx >= 0 ? text.slice(0, idx) : text;
  const expiredText = idx >= 0 ? text.slice(idx) : '';

  const working = /all\s+working[\s\w]*codes|working\s+[\w\s]{0,40}codes|active\s+[\w\s]{0,40}codes|all\s+new[\s\w]*codes/i.exec(
    activeText,
  );
  const activeSlice = working ? activeText.slice(working.index) : activeText;

  const active = parseRewardPairs(activeSlice);
  let expired = parseRewardPairs(expiredText);
  if (expired.size < 3) {
    for (const [k, v] of parseBareCodes(expiredText)) {
      if (!expired.has(k)) expired.set(k, v);
    }
  }

  for (const k of active.keys()) expired.delete(k);
  return { active, expired, blocked: false };
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': UA,
      accept: 'text/html,application/xhtml+xml',
      'accept-language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return htmlToText(await res.text());
}

function loadGame(slug) {
  const file = path.join(GAMES_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

function mergeGame(data, activeMap, expiredMap, { allowExpire }) {
  const byCode = new Map(data.codes.map((c) => [c.code, { ...c }]));
  const changes = [];

  for (const [code, reward] of activeMap) {
    const existing = byCode.get(code);
    if (!existing) {
      byCode.set(code, { code, reward, status: 'active' });
      changes.push(`+ ${code}`);
    } else if (existing.status === 'expired') {
      existing.status = 'active';
      existing.reward = reward;
      changes.push(`revive ${code}`);
    } else if (
      reward &&
      (existing.reward === 'Expired reward' || existing.reward === 'In-game reward')
    ) {
      existing.reward = reward;
      changes.push(`reward ${code}`);
    }
  }

  if (allowExpire) {
    for (const [code] of expiredMap) {
      const existing = byCode.get(code);
      if (!existing) continue; // don't flood with hundreds of historical expired
      if (existing.status === 'active' && !activeMap.has(code)) {
        existing.status = 'expired';
        changes.push(`expire ${code}`);
      }
    }
  }

  if (activeMap.size > 0 || (allowExpire && expiredMap.size > 0)) {
    data.checkedAt = TODAY;
    if (changes.some((c) => c.startsWith('+') || c.startsWith('revive') || c.startsWith('expire'))) {
      data.updatedAt = TODAY;
      if (data.title) {
        const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
        data.title = data.title.replace(/\([A-Za-z]+ \d{4}\)/, `(${month})`);
      }
    }
  }

  data.codes = [...byCode.values()].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return a.code.localeCompare(b.code);
  });
  return changes;
}

async function main() {
  const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
  const report = [];
  let changedFiles = 0;

  for (const [slug, cfg] of Object.entries(sources)) {
    const game = loadGame(slug);
    if (!game) {
      report.push(`skip ${slug} (no json)`);
      continue;
    }
    if (!cfg.sources?.length) {
      report.push(`skip ${slug} (no sources)`);
      continue;
    }

    const activeMap = new Map();
    const expiredMap = new Map();
    const errors = [];
    let blocked = 0;

    for (const url of cfg.sources) {
      try {
        const text = await fetchText(url);
        const parsed = parseSource(text);
        if (parsed.blocked) {
          blocked += 1;
          errors.push(`${url} → cookie wall`);
          continue;
        }
        for (const [k, v] of parsed.active) {
          if (!activeMap.has(k)) activeMap.set(k, v);
        }
        for (const [k, v] of parsed.expired) {
          if (!expiredMap.has(k)) expiredMap.set(k, v);
        }
        for (const k of activeMap.keys()) expiredMap.delete(k);
      } catch (err) {
        errors.push(`${url} → ${err.message}`);
      }
    }

    if (activeMap.size === 0 && expiredMap.size === 0) {
      report.push(
        `! ${slug}: nothing usable${errors.length ? ` (${errors.join('; ')})` : ''}`,
      );
      continue;
    }

    const allowExpire = activeMap.size > 0; // never expire if we couldn't read working list
    const changes = mergeGame(game.data, activeMap, expiredMap, { allowExpire });

    if (changes.length) {
      changedFiles += 1;
      report.push(
        `* ${slug}: ${changes.slice(0, 15).join(', ')}${changes.length > 15 ? ` …+${changes.length - 15}` : ''}`,
      );
      if (WRITE) fs.writeFileSync(game.file, JSON.stringify(game.data, null, 2) + '\n');
    } else if (WRITE && activeMap.size > 0) {
      game.data.checkedAt = TODAY;
      fs.writeFileSync(game.file, JSON.stringify(game.data, null, 2) + '\n');
      report.push(`= ${slug}: checked ${TODAY} (${activeMap.size} active from sources)`);
    } else {
      report.push(
        `= ${slug}: no diff (${activeMap.size} active, ${expiredMap.size} expired seen${blocked ? `, ${blocked} blocked` : ''})`,
      );
    }
  }

  console.log(report.join('\n'));
  console.log(`\nMode: ${WRITE ? 'WRITE' : 'DRY-RUN'} | changed games: ${changedFiles}`);
  if (!WRITE && changedFiles > 0) console.log('Re-run with --write to apply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
