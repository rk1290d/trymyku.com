import {
  getMechanicPage,
  getServices,
  getSharedJobs,
  getVerifiedJobs,
  getReviews,
} from '@/lib/supabase';
import type { MechanicPage, ServiceRow, SharedJob, VerifiedJob, Review } from '@/lib/supabase';

// Everything a storefront needs, fetched once. The arrays are RAW: the
// trim/dedupe/filter passes live in the renderer, not here.
export interface PageData {
  page: MechanicPage;
  services: ServiceRow[];
  shared: SharedJob[];
  verified: VerifiedJob[];
  reviews: Review[];
}

export async function loadPublicPage(slug: string): Promise<PageData | null> {
  const page = await getMechanicPage(slug);
  if (!page) return null;

  const [rawServices, shared, verified, rawReviews] = await Promise.all([
    getServices(page.id),
    getSharedJobs(page.id),
    getVerifiedJobs(page.id),
    getReviews(page.id),
  ]);

  return { page, services: rawServices, shared, verified, reviews: rawReviews };
}
