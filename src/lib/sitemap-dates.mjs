/** Build real lastmod dates for @astrojs/sitemap (content dates, not build time). */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://blxcodes.com';

/**
 * Map sitemap <loc> URLs → Date from game/blog content.
 * Google ignores lastmod when every URL shares the same build timestamp.
 */
export function buildSitemapLastmodMap() {
  /** @type {Map<string, Date>} */
  const map = new Map();
  let maxGameMs = 0;
  let maxBlogMs = 0;

  const gamesDir = join(process.cwd(), 'src/content/games');
  for (const file of readdirSync(gamesDir)) {
    if (!file.endsWith('.json')) continue;
    const slug = file.slice(0, -'.json'.length);
    try {
      const data = JSON.parse(readFileSync(join(gamesDir, file), 'utf8'));
      const raw = data.checkedAt || data.updatedAt;
      const d = new Date(raw);
      if (Number.isNaN(d.valueOf())) continue;
      map.set(`${SITE}/codes/${slug}/`, d);
      maxGameMs = Math.max(maxGameMs, d.valueOf());
    } catch {
      /* skip corrupt file */
    }
  }

  const blogDir = join(process.cwd(), 'src/content/blog');
  for (const file of readdirSync(blogDir)) {
    if (!/\.mdx?$/.test(file)) continue;
    const slug = file.replace(/\.mdx?$/, '');
    const text = readFileSync(join(blogDir, file), 'utf8');
    const updated = text.match(/^updatedDate:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
    const published = text.match(/^pubDate:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
    const raw = updated?.[1] || published?.[1];
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.valueOf())) continue;
    map.set(`${SITE}/blog/${slug}/`, d);
    maxBlogMs = Math.max(maxBlogMs, d.valueOf());
  }

  if (maxGameMs > 0) {
    const hub = new Date(maxGameMs);
    map.set(`${SITE}/`, hub);
    map.set(`${SITE}/codes/`, hub);
  }
  if (maxBlogMs > 0) {
    map.set(`${SITE}/blog/`, new Date(maxBlogMs));
  }

  return map;
}
