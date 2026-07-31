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
        !page.includes('search-index') && !page.includes('404') && !page.includes('/rss.xml'),
      serialize(item) {
        const url = item.url;
        if (url === 'https://blxcodes.com/' || url === 'https://blxcodes.com') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (url.includes('/codes/')) {
          item.priority = 0.9;
          item.changefreq = 'daily';
        } else if (url.includes('/blog/')) {
          item.priority = 0.7;
          item.changefreq = 'weekly';
        } else {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        }
        item.lastmod = new Date();
        return item;
      },
    }),
  ],
});
