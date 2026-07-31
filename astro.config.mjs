// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://blxcodes.com',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('search-index') &&
        !page.includes('404') &&
        !page.includes('/rss.xml') &&
        // Pagination lists are for humans; avoid flooding the crawl with /codes/page/N
        !page.includes('/codes/page/'),
      serialize(item) {
        const url = item.url;
        if (url === 'https://blxcodes.com/' || url === 'https://blxcodes.com') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (
          url.includes('/codes/popular') ||
          url.includes('/codes/updated') ||
          url.endsWith('/codes/') ||
          url.endsWith('/codes')
        ) {
          item.priority = 0.95;
          item.changefreq = 'daily';
        } else if (url.includes('/codes/')) {
          item.priority = 0.85;
          item.changefreq = 'daily';
        } else if (url.includes('/blog/')) {
          // Support content — don't outrank money pages in the sitemap signal
          item.priority = 0.45;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.4;
          item.changefreq = 'monthly';
        }
        // Do NOT stamp lastmod = now on every URL (fake freshness wastes crawl).
        return item;
      },
    }),
  ],
});
