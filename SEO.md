# SEO checklist (technical)

## Built into the site
- Canonical, title, description, robots
- Open Graph + Twitter cards + default OG image
- Organization + WebSite (+ SearchAction) JSON-LD
- FAQ + HowTo + WebPage + BreadcrumbList on game pages
- Article + BreadcrumbList on blog posts
- Sitemap with lastmod / priority / changefreq
- RSS at `/rss.xml`
- IndexNow key + auto-ping on `npm run deploy`
- 404 noindex page
- `llms.txt`

## You must do once (manual)
1. [Google Search Console](https://search.google.com/search-console) → add `blxcodes.com`
2. Verify DNS / HTML tag
3. Submit sitemap: `https://blxcodes.com/sitemap-index.xml`
4. Request indexing for `/` and top `/codes/{game}` pages
5. (Optional) Bing Webmaster Tools → same sitemap / IndexNow

## Ranking note
Technical SEO can be 10/10. Rankings still need real, frequently updated code content and links.
