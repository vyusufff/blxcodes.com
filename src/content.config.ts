import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const codeItem = z.object({
  code: z.string(),
  reward: z.string(),
  status: z.enum(['active', 'expired']),
});

const faqItem = z.object({
  q: z.string(),
  a: z.string(),
});

/** One JSON file per game — scales to thousands without MDX overhead. */
const games = defineCollection({
  loader: glob({ base: './src/content/games', pattern: '**/*.json' }),
  schema: z.object({
    title: z.string(),
    gameName: z.string(),
    description: z.string(),
    updatedAt: z.coerce.date(),
    /** Last time the list was reviewed (even if codes did not change). */
    checkedAt: z.coerce.date().optional(),
    featured: z.boolean().default(false),
    cover: z.string().optional(),
    placeId: z.number().optional(),
    howTo: z.array(z.string()).default([]),
    faq: z.array(faqItem).default([]),
    codes: z.array(codeItem),
  }),
});

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    cover: z.string().optional(),
  }),
});

export const collections = { games, blog };
