/** Shared SEO constants and JSON-LD builders for BLXCodes. */

export const SITE_NAME = 'BLXCodes';
export const SITE_URL = 'https://blxcodes.com';
export const SITE_DESC =
  'Find working Roblox codes for Blox Fruits, Fisch, and more. Copy active codes fast, skip expired junk, and redeem free rewards on BLXCodes.';
export const DEFAULT_OG = `${SITE_URL}/images/og-default.png`;

/** IndexNow API key — also hosted at /{key}.txt */
export const INDEXNOW_KEY = '7c4e9a2f8b1d4e6a9c0f3b5d7e8a1c2f';

export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/favicon.svg'),
    description: SITE_DESC,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESC,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/codes/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleJsonLd(opts: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    mainEntityOfPage: absoluteUrl(opts.path),
    image: opts.image ? absoluteUrl(opts.image) : DEFAULT_OG,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl('/favicon.svg') },
    },
  };
}
