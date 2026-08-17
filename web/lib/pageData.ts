import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
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

/* ------------------------------------------------------------------
   PRIVATE PREVIEW
   The mechanic's own unpublished draft, keyed by a short-lived token the
   app minted. One RPC returns the whole bundle, already shaped like the
   public views and already sorted/limited the way the live loaders are.
   The token is hashed server-side and expires, so a garbage, guessed or
   stale token comes back null and the route 404s.
   ------------------------------------------------------------------ */

// Same alphabet and length the app mints. Anything else never leaves this
// process: no request is made for input that cannot possibly be a token.
const PREVIEW_TOKEN_RE = /^[A-Za-z0-9_-]{40,48}$/;

interface PreviewBundle {
  page: MechanicPage;
  // The RPC's service rows carry id/mechanic_id too. ServiceRow is a subset
  // of that shape, so the extra keys ride along harmlessly.
  services: (ServiceRow & { id?: string; mechanic_id?: string })[];
  shared_jobs: SharedJob[];
  verified_jobs: VerifiedJob[];
  reviews: Review[];
}

export async function loadPreviewPage(token: string): Promise<PageData | null> {
  if (!PREVIEW_TOKEN_RE.test(token)) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/web_preview_bundle`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_token: token }),
      // A preview must always show the latest save. Never revalidate-cached.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const b = (await res.json()) as PreviewBundle | null;
    if (!b) return null;
    return {
      page: b.page,
      services: b.services,
      shared: b.shared_jobs,
      verified: b.verified_jobs,
      reviews: b.reviews,
    };
  } catch {
    return null;
  }
}
