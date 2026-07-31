import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_DESC, SITE_NAME, SITE_URL } from '../lib/seo';

export async function GET() {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: `${SITE_NAME} Blog`,
    description: SITE_DESC,
    site: SITE_URL,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
  });
}
