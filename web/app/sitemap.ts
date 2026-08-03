import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getPublishedSlugs } from '@/lib/supabase';

// Only published (claimed) profiles are listed. Unclaimed pages are
// reachable by direct link only: never indexed, never discoverable.
//
// lastModified is a real timestamp or absent. Stamping every entry with
// "now" on every generation tells crawlers the whole site changes
// constantly, which teaches them to distrust the field.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await getPublishedSlugs();
  return [
    { url: `${SITE_URL}/`, priority: 1 },
    { url: `${SITE_URL}/mechanics`, priority: 0.9 },
    { url: `${SITE_URL}/customers`, priority: 0.9 },
    { url: `${SITE_URL}/support`, priority: 0.4 },
    { url: `${SITE_URL}/privacy`, priority: 0.2 },
    { url: `${SITE_URL}/terms`, priority: 0.2 },
    ...pages.map(({ slug, created_at }) => ({
      url: `${SITE_URL}/${slug}`,
      ...(created_at ? { lastModified: new Date(created_at) } : {}),
      priority: 0.8,
    })),
  ];
}
