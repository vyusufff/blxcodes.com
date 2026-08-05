/**
 * Sync existing games + discover NEW games from Beebom hub.
 *
 * Usage:
 *   node scripts/check-codes.mjs
 *   node scripts/check-codes.mjs --write
 *   node scripts/check-codes.mjs --discover-only
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { isProseToken } from './prose-words.mjs';

const ROOT = process.cwd();
const GAMES_DIR = path.join(ROOT, 'src/content/games');
const SOURCES_PATH = path.join(ROOT, 'scripts/sources.json');
const WRITE = process.argv.includes('--write');
const DISCOVER_ONLY = process.argv.includes('--discover-only');
const TODAY = new Date().toISOString().slice(0, 10);
const MAX_NEW_GAMES = Number(process.env.MAX_NEW_GAMES || 5);
const MAX_SCAN = Number(process.env.MAX_SCAN || Math.max(MAX_NEW_GAMES * 8, 40));
const MIN_PLAYING = Number(process.env.MIN_PLAYING || 50);
/**
 * Catch-up: if the CCU number is missing, still add games whose place was verified on
 * Roblox and that have active codes. Identity is never waived, only the CCU threshold.
 */
const ALLOW_UNKNOWN_CCU =
  process.env.ALLOW_UNKNOWN_CCU === '1' || Number(process.env.MAX_NEW_GAMES || 5) >= 50;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function curlJson(url) {
  try {
    const raw = execFileSync(
      process.platform === 'win32' ? 'curl.exe' : 'curl',
      ['-ksL4', url, '--max-time', '20', '-H', `user-agent: ${UA}`],
      { encoding: 'utf8' },
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
const BEEBOM_HUB = 'https://beebom.com/roblox-games-codes-list/';

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
  note notes blox fruits minutes hours hour double stat refund title in of to is on
  you your we our they their as at by if into about after before between through
  `.trim().split(/\s+/),
);

const SKIP_URLS = new Set([
  BEEBOM_HUB,
  'https://beebom.com/roblox-games-codes-list/amp/',
  'https://beebom.com/tag/roblox-codes/',
]);

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    // Smart quotes and ellipses arrive as numeric entities; left undecoded their
    // digits survive tokenizing and look like codes ("8216", "8230").
    .replace(/&#(\d{2,5});/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-f]{2,5});/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
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

/** Prose sections that follow the expired list; scanning them yields fake codes. */
const AFTER_EXPIRED = [
  /how to redeem/i,
  /how to use/i,
  /how to get (more|new)/i,
  /how do (i|you)/i,
  /how can (i|you)/i,
  /other free rewards/i,
  /where to find/i,
  /related articles/i,
  /recommended articles/i,
  /more in gaming/i,
  /frequently asked/i,
  /leave a comment/i,
  /about the author/i,
];

function findExpiredEnd(text, from) {
  const tail = text.slice(from);
  let end = text.length;
  for (const re of AFTER_EXPIRED) {
    const m = re.exec(tail);
    // Skip a match at the very start: that is the heading we just split on.
    if (m && m.index > 0) end = Math.min(end, from + m.index);
  }
  return end;
}

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
    // Stripping the "NEW" badge can leave empty brackets behind.
    const reward = m[2]
      .replace(/\(\s*\)/g, '')
      .replace(/\[\s*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!looksLikeCode(code)) continue;
    if (!reward || reward.length < 2 || reward.length > 180) continue;
    pairs.set(code, reward);
  }
  return pairs;
}

/**
 * A bare token (no "code - reward" pair to vouch for it) is only trusted when it
 * carries code-like shape. Plain prose words are the main source of fake codes.
 */
function looksLikeBareCode(token) {
  if (isProseToken(token)) return false;
  // Hyphens are common in prose ("step-by-step"), so they do not vouch for a code.
  if (/[0-9_!]/.test(token)) return true;
  if (/^[A-Z]+$/.test(token)) return token.length >= 4;
  const uppercase = (token.match(/[A-Z]/g) || []).length;
  return uppercase >= 3 && token.length >= 8;
}

function parseBareCodes(section) {
  const out = new Map();
  const tokens = section.match(/[A-Za-z0-9!_\-/]{3,48}/g) || [];
  for (const t of tokens) {
    if (!looksLikeCode(t)) continue;
    if (!looksLikeBareCode(t)) continue;
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
  const expiredText = idx >= 0 ? text.slice(idx, findExpiredEnd(text, idx)) : '';
  const working =
    /all\s+working[\s\w]*codes|working\s+[\w\s]{0,40}codes|active\s+[\w\s]{0,40}codes|all\s+new[\s\w]*codes/i.exec(
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

async function fetchHtml(url) {
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
  return await res.text();
}

async function fetchText(url) {
  return htmlToText(await fetchHtml(url));
}

function extractPlaceIdFromHtml(html) {
  const matches = [...html.matchAll(/roblox\.com\/games\/(\d{5,})/gi)];
  if (!matches.length) return null;
  // Prefer the most common placeId on the page (usually the game CTA)
  const counts = new Map();
  for (const m of matches) {
    const id = m[1];
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return Number([...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]);
}

function slugFromBeebomUrl(url) {
  const u = new URL(url);
  let slug = u.pathname.replace(/\/+$/, '').split('/').pop() || '';
  slug = slug.replace(/-codes$/, '').replace(/^roblox-/, '');
  return slug;
}

function titleCaseSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function discoverBeebomLinks(html) {
  const found = new Map(); // slug -> { url, gameName, fresh }
  const weekAt = html.search(/Roblox Game Codes This Week|codes from this week/i);
  const alphaAt = html.search(/Roblox Game Codes for Top Experiences|alphabetical list/i);
  const re = /href="(https:\/\/beebom\.com\/[^"#?][^"]*?-codes\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1].replace(/\/amp\/?$/, '/');
    if (SKIP_URLS.has(url) || url.includes('/tag/') || url.includes('/amp/')) continue;
    if (!/beebom\.com\/[a-z0-9-]+-codes\/?$/i.test(url)) continue;
    const slug = slugFromBeebomUrl(url);
    if (!slug || slug.length < 2) continue;
    const label = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const gameName = label.replace(/\s*codes\s*$/i, '').trim() || titleCaseSlug(slug);
    const pos = m.index;
    const fresh =
      weekAt >= 0 && pos > weekAt && (alphaAt < 0 || pos < alphaAt);
    if (!found.has(slug)) found.set(slug, { url, gameName, fresh: !!fresh });
    else if (fresh) found.get(slug).fresh = true;
  }
  return found;
}

async function getPlaceStats(placeId) {
  if (!placeId) return { playing: null, name: null };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(400 * attempt);
      let universeId = null;
      try {
        const uniRes = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`, {
          headers: { 'user-agent': UA },
          signal: AbortSignal.timeout(12000),
        });
        if (uniRes.ok) universeId = (await uniRes.json())?.universeId;
      } catch {
        /* curl fallback below */
      }
      if (!universeId) {
        universeId = curlJson(
          `https://apis.roblox.com/universes/v1/places/${placeId}/universe`,
        )?.universeId;
      }
      if (!universeId) continue;

      let info = null;
      try {
        const gRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`, {
          headers: { 'user-agent': UA },
          signal: AbortSignal.timeout(12000),
        });
        if (gRes.ok) info = (await gRes.json())?.data?.[0];
      } catch {
        /* curl fallback below */
      }
      if (!info?.name) {
        info = curlJson(`https://games.roblox.com/v1/games?universeIds=${universeId}`)?.data?.[0];
      }
      if (info?.name) {
        return { playing: typeof info.playing === 'number' ? info.playing : null, name: info.name };
      }
    } catch {
      /* retry */
    }
  }
  return { playing: null, name: null };
}

/**
 * Beebom's Roblox hub also links code guides for non-Roblox titles, and those pages
 * still carry a stray roblox.com link that extractPlaceIdFromHtml happily grabs. The
 * place then resolves to some unrelated game, so compare the two names before trusting it.
 */
function namesMatch(articleName, robloxName) {
  const squash = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const article = squash(articleName);
  const roblox = squash(robloxName);
  if (!article || !roblox) return false;
  if (roblox.includes(article) || article.includes(roblox)) return true;
  // Roblox titles get decorated ("[UPDATE 3] Mini War RNG!!"), so fall back to word overlap.
  const words = (String(articleName).toLowerCase().match(/[a-z0-9]+/g) || []).filter(
    (w) => w.length >= 3,
  );
  if (!words.length) return false;
  const hits = words.filter((w) => roblox.includes(w)).length;
  return hits / words.length >= 0.6;
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
      if (!existing) continue;
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

async function resolvePlaceId(gameName) {
  try {
    const url = `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(gameName)}&sessionId=00000000-0000-0000-0000-000000000001&pageType=all`;
    const res = await fetch(url, {
      headers: { 'user-agent': UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const contents = json?.searchResults || json?.data || [];
    const flat = Array.isArray(contents) ? contents : [];
    for (const group of flat) {
      const contentsArr = group?.contents || group?.entries || [group];
      for (const item of contentsArr) {
        const placeId =
          item?.rootPlaceId ||
          item?.placeId ||
          item?.contentId ||
          item?.universeRootPlaceId;
        if (placeId && Number(placeId) > 0) return Number(placeId);
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function saveIcon(slug, placeId) {
  try {
    const sharp = (await import('sharp')).default;
    const api = `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`;

    let imageUrl = null;
    try {
      const meta = await fetch(api, { signal: AbortSignal.timeout(20000) }).then((r) => r.json());
      imageUrl = meta?.data?.[0]?.imageUrl;
    } catch {
      /* fall through to curl */
    }
    if (!imageUrl) {
      const raw = execFileSync(
        process.platform === 'win32' ? 'curl.exe' : 'curl',
        ['-ksL4', api, '--max-time', '25'],
        { encoding: 'utf8' },
      );
      imageUrl = JSON.parse(raw)?.data?.[0]?.imageUrl;
    }
    if (!imageUrl) return null;

    const tmp = path.join(ROOT, 'public/images/games', `${slug}-raw.png`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    execFileSync(
      process.platform === 'win32' ? 'curl.exe' : 'curl',
      ['-ksL4', '-o', tmp, imageUrl, '--max-time', '40'],
    );
    if (!fs.existsSync(tmp) || fs.statSync(tmp).size < 1000) {
      try {
        fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      return null;
    }

    const buf = fs.readFileSync(tmp);
    const dir = path.join(ROOT, 'public/images/games/card');
    fs.mkdirSync(dir, { recursive: true });
    await sharp(buf).resize(512, 512, { fit: 'cover' }).webp({ quality: 82 }).toFile(
      path.join(ROOT, 'public/images/games', `${slug}.webp`),
    );
    await sharp(buf).resize(320, 320, { fit: 'cover' }).webp({ quality: 68 }).toFile(
      path.join(dir, `${slug}.webp`),
    );
    await sharp(buf).resize(192, 192, { fit: 'cover' }).webp({ quality: 65 }).toFile(
      path.join(dir, `${slug}-192.webp`),
    );
    fs.unlinkSync(tmp);
    return `/images/games/card/${slug}.webp`;
  } catch (err) {
    console.error('saveIcon', slug, err.message);
    return null;
  }
}

function buildNewGame({ slug, gameName, activeMap, expiredMap, placeId, cover }) {
  const month = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const codes = [];
  for (const [code, reward] of activeMap) {
    codes.push({ code, reward, status: 'active' });
  }
  // keep expired list light for brand-new pages
  let n = 0;
  for (const [code] of expiredMap) {
    if (activeMap.has(code)) continue;
    codes.push({ code, reward: 'Expired reward', status: 'expired' });
    if (++n >= 40) break;
  }
  return {
    title: `${gameName} Codes (${month})`,
    gameName,
    description: `Working ${gameName} codes for free in-game rewards. Updated regularly.`,
    updatedAt: TODAY,
    checkedAt: TODAY,
    featured: activeMap.size > 0,
    ...(cover ? { cover } : {}),
    ...(placeId ? { placeId } : {}),
    howTo: [
      `Launch ${gameName} on Roblox.`,
      'Open the codes or redeem menu in the game UI.',
      'Paste a working code exactly as shown.',
      'Confirm to claim your rewards.',
    ],
    faq: [
      {
        q: `Are these ${gameName} codes free?`,
        a: 'Yes. Promo codes unlock free in-game rewards when they are still active.',
      },
      {
        q: `Why did a ${gameName} code not work?`,
        a: 'It is usually expired, mistyped, or already redeemed on your account.',
      },
      {
        q: `How often are ${gameName} codes updated?`,
        a: 'We refresh this page when new codes drop or old ones expire. Check the Updated date above.',
      },
    ],
    codes,
  };
}

async function syncOne(slug, urls, report) {
  const game = loadGame(slug);
  if (!game) {
    report.push(`skip ${slug} (no json)`);
    return false;
  }
  const activeMap = new Map();
  const expiredMap = new Map();
  const errors = [];
  let blocked = 0;

  for (const url of urls) {
    try {
      const text = await fetchText(url);
      const parsed = parseSource(text);
      if (parsed.blocked) {
        blocked += 1;
        errors.push(`${url} → cookie wall`);
        continue;
      }
      for (const [k, v] of parsed.active) if (!activeMap.has(k)) activeMap.set(k, v);
      for (const [k, v] of parsed.expired) if (!expiredMap.has(k)) expiredMap.set(k, v);
      for (const k of activeMap.keys()) expiredMap.delete(k);
    } catch (err) {
      errors.push(`${url} → ${err.message}`);
    }
  }

  if (activeMap.size === 0 && expiredMap.size === 0) {
    report.push(`! ${slug}: nothing usable${errors.length ? ` (${errors.join('; ')})` : ''}`);
    return false;
  }

  const allowExpire = activeMap.size > 0;
  const changes = mergeGame(game.data, activeMap, expiredMap, { allowExpire });
  if (changes.length) {
    report.push(
      `* ${slug}: ${changes.slice(0, 12).join(', ')}${changes.length > 12 ? ` …+${changes.length - 12}` : ''}`,
    );
    if (WRITE) fs.writeFileSync(game.file, JSON.stringify(game.data, null, 2) + '\n');
    return true;
  }
  // Do NOT rewrite JSON just to bump checkedAt — that forces a 500+ file deploy every run.
  report.push(
    `= ${slug}: no diff (${activeMap.size} active${blocked ? `, ${blocked} blocked` : ''})`,
  );
  return false;
}

async function discoverNew(sources, report) {
  let html;
  try {
    html = await fetchHtml(BEEBOM_HUB);
  } catch (err) {
    report.push(`! discover hub failed: ${err.message}`);
    return 0;
  }

  const links = discoverBeebomLinks(html);
  const existing = new Set([
    ...Object.keys(sources),
    ...fs.readdirSync(GAMES_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')),
  ]);

  const missing = [...links.entries()].filter(([slug]) => !existing.has(slug));
  // Always scan "This Week" first. Rotate the older backlog every two hours so
  // repeated runs do not spend MAX_SCAN on the same low-CCU candidates forever.
  const freshCandidates = missing.filter(([, meta]) => meta.fresh);
  const backlog = missing.filter(([, meta]) => !meta.fresh);
  const twoHourSlot = Math.floor(Date.now() / (2 * 60 * 60 * 1000));
  const backlogOffset = backlog.length ? (twoHourSlot * MAX_SCAN) % backlog.length : 0;
  const rotatedBacklog = backlog.length
    ? [...backlog.slice(backlogOffset), ...backlog.slice(0, backlogOffset)]
    : [];
  const candidates = [...freshCandidates, ...rotatedBacklog];

  const freshCount = freshCandidates.length;
  report.push(
    `discover: ${links.size} beebom games, ${candidates.length} missing (${freshCount} from this-week section, backlog offset ${backlogOffset}/${backlog.length})`,
  );

  let added = 0;
  let scanned = 0;
  for (const [slug, meta] of candidates) {
    if (added >= MAX_NEW_GAMES) break;
    // Don't burn the whole hub every run — sample a limited window
    if (scanned >= MAX_SCAN) break;
    scanned += 1;

    let activeMap = new Map();
    let expiredMap = new Map();
    let placeId = null;
    try {
      const pageHtml = await fetchHtml(meta.url);
      placeId = extractPlaceIdFromHtml(pageHtml);
      const parsed = parseSource(htmlToText(pageHtml));
      if (parsed.blocked) {
        report.push(`! new ${slug}: cookie/blocked`);
        continue;
      }
      activeMap = parsed.active;
      expiredMap = parsed.expired;
    } catch (err) {
      report.push(`! new ${slug}: ${err.message}`);
      continue;
    }

    if (activeMap.size === 0) {
      report.push(`skip new ${slug}: 0 active codes`);
      continue;
    }

    if (!placeId) placeId = await resolvePlaceId(meta.gameName);
    if (!placeId) {
      report.push(`skip new ${slug}: no placeId`);
      continue;
    }

    await sleep(120);
    const { playing, name: robloxName } = await getPlaceStats(placeId);
    if (!robloxName) {
      // An unverified place is how a non-Roblox game slipped in once; the next run
      // retries this candidate anyway, so refuse rather than guess.
      report.push(`skip new ${slug}: could not verify placeId ${placeId} on Roblox`);
      continue;
    }
    if (!namesMatch(meta.gameName, robloxName)) {
      report.push(`skip new ${slug}: placeId ${placeId} is "${robloxName}", not "${meta.gameName}"`);
      continue;
    }
    if (playing !== null && playing < MIN_PLAYING) {
      report.push(`skip new ${slug}: ${playing} playing (< ${MIN_PLAYING})`);
      continue;
    }
    if (playing === null && !meta.fresh && !ALLOW_UNKNOWN_CCU) {
      // Without CCU signal, only allow "this week" (or catch-up mode)
      report.push(`skip new ${slug}: unknown players + not in this-week`);
      continue;
    }
    if (playing === null && ALLOW_UNKNOWN_CCU) {
      report.push(`warn new ${slug}: CCU unknown — adding (catch-up, has active codes)`);
    }

    let cover = null;
    if (WRITE) cover = await saveIcon(slug, placeId);

    const data = buildNewGame({
      slug,
      gameName: meta.gameName,
      activeMap,
      expiredMap,
      placeId,
      cover,
    });

    report.push(
      `+ NEW ${slug} (${activeMap.size} active, ${playing ?? '?'} playing${meta.fresh ? ', this-week' : ''}) ← ${meta.url}`,
    );
    if (WRITE) {
      fs.writeFileSync(path.join(GAMES_DIR, `${slug}.json`), JSON.stringify(data, null, 2) + '\n');
      sources[slug] = { sources: [meta.url] };
      fs.writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2) + '\n');
    }
    added += 1;
  }
  return added;
}

async function backfillCovers(sources, report) {
  let n = 0;
  for (const file of fs.readdirSync(GAMES_DIR).filter((f) => f.endsWith('.json'))) {
    const slug = file.replace(/\.json$/, '');
    const game = loadGame(slug);
    if (!game || game.data.cover) continue;

    let placeId = game.data.placeId || null;
    const urls = sources[slug]?.sources || [];
    for (const url of urls) {
      if (placeId) break;
      try {
        const html = await fetchHtml(url);
        placeId = extractPlaceIdFromHtml(html);
      } catch {
        /* ignore */
      }
    }
    if (!placeId) placeId = await resolvePlaceId(game.data.gameName);
    if (!placeId) {
      report.push(`! cover ${slug}: no placeId`);
      continue;
    }

    if (!WRITE) {
      report.push(`~ cover ${slug}: would fetch placeId ${placeId}`);
      n += 1;
      continue;
    }

    const cover = await saveIcon(slug, placeId);
    if (!cover) {
      report.push(`! cover ${slug}: icon download failed (${placeId})`);
      continue;
    }
    game.data.placeId = placeId;
    game.data.cover = cover;
    fs.writeFileSync(game.file, JSON.stringify(game.data, null, 2) + '\n');
    report.push(`~ cover ${slug}: ${cover}`);
    n += 1;
  }
  return n;
}

async function main() {
  const sources = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
  const report = [];
  let changed = 0;

  // 1) Priority: refresh codes for games already on the site
  if (!DISCOVER_ONLY) {
    for (const [slug, cfg] of Object.entries(sources)) {
      if (!cfg.sources?.length) continue;
      const did = await syncOne(slug, cfg.sources, report);
      if (did) changed += 1;
      await sleep(80);
    }
  }

  // 2) Then discover new games (this-week first, skip dead/low CCU)
  const sourcesNow = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
  const added = await discoverNew(sourcesNow, report);
  changed += added;

  // 3) Backfill missing covers/icons
  if (!DISCOVER_ONLY) {
    const sourcesFinal = JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8'));
    changed += await backfillCovers(sourcesFinal, report);
  }

  console.log(report.join('\n'));
  console.log(
    `\nMode: ${WRITE ? 'WRITE' : 'DRY-RUN'} | changed/new: ${changed} | maxNew/run: ${MAX_NEW_GAMES} | maxScan: ${MAX_SCAN} | minPlaying: ${MIN_PLAYING} | allowUnknownCcu: ${ALLOW_UNKNOWN_CCU}`,
  );
  if (!WRITE && changed > 0) console.log('Re-run with --write to apply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
