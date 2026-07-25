import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getPublishedSlugs } from '@/lib/supabase';

// Only published (claimed) profiles are listed. Unclaimed pages are
// reachable by direct link only: never indexed, never discoverable.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getPublishedSlugs();
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1 },
    { url: `${SITE_URL}/mechanics`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/customers`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/support`, lastModified: now, priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified: now, priority: 0.2 },
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/${slug}`,
      lastModified: now,
      priority: 0.8,
    })),
  ];
}
