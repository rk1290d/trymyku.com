// Server-side reads against the restricted public views, using the same
// publishable (anon) key the marketing site has always shipped in track.js.
// These views are the security boundary: published/unclaimed profiles only,
// safe columns only. Never point this at a base table.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fioiaoxaozqfwdqukoho.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_Wp39xMC488ds7jL9MY4HfA_GksslO4S';

export interface MechanicPage {
  id: string;
  slug: string;
  web_status: 'unclaimed' | 'published';
  full_name: string;
  photo_url: string | null;
  bio: string | null;
  specialization: string | null;
  years_experience: number | null;
  service_city: string | null;
  work_type: string | null;
  rating: string | number | null;
  review_count: number | null;
  jobs_done: number | null;
  id_verified: boolean;
  has_insurance: boolean | null;
  has_certifications: boolean | null;
  certifications: string[] | null;
  hourly_rate: number | null;
  diagnostic_fee: number | null;
  // NO `available`. The mechanic's "Available now" switch is an in-app
  // doorbell about inbound work; it is not a fact about his business and it
  // is not page content. The website is his resume and has nothing to do
  // with it, so the field is neither typed here nor requested below.
  socials: Record<string, string> | null;
  created_at: string;
  // Content slots. Every one of these is optional on the page: the
  // storefront renders a slot only when its value is present, so a row with
  // all of them null renders exactly as it did before the columns existed.
  business_name: string | null;
  hours_note: string | null;
  request_note: string | null;
  /** Kept on the type until the column is dropped server-side. No longer read. */
  service_towns: string[];
  /** Miles he travels from his city. null = not set, and the storefront then
   *  draws no ring and no town pins rather than inventing them. */
  service_radius_mi: number | null;
  /** Structured weekly hours (minutes from midnight). Preferred over
   *  hours_note, which stays for anyone who typed a line before the picker. */
  hours_json: unknown | null;
  show_photo: boolean;
  page_lang: 'en' | 'es';
}

export interface SharedJob {
  id: string;
  mechanic_id: string;
  vehicle: string;
  service: string;
  price_label: string | null;
  done_on: string | null;
  town: string | null;
  photo_url: string | null;
  caption: string | null;
}

export interface VerifiedJob {
  id: string;
  mechanic_id: string;
  vehicle: string;
  service: string | null;
  town: string | null;
  price: number | null;
  completed_at: string;
}

export interface Review {
  id: string;
  mechanic_id: string;
  rating: number;
  text: string | null;
  created_at: string;
}

// null means THE READ FAILED, and nothing else: PostgREST answers "there is
// no such row" with an empty array, which comes back as [] and is a perfectly
// good answer. Callers must keep the two apart. Reporting a failed read as
// "no such page" is how a Supabase blip turns a link the mechanic texted
// somebody into "This link doesn't go anywhere".
//
// Retries ONCE, because the failures that actually happen here are transient:
// a 5xx, a saturated connection pool, a rate limit, a DNS hiccup. A 4xx is a
// settled answer - a revoked grant will refuse the retry too - so it is not
// retried, only shouted about.
async function rest<T>(path: string, revalidate = 60): Promise<T | null> {
  let why = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        next: { revalidate },
      });
      if (res.ok) return (await res.json()) as T;
      why = `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) break;
    } catch (e) {
      why = e instanceof Error ? e.message : 'fetch threw';
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 250));
  }
  // LOUD, and the same argument the lead route makes for its own refusals: a
  // one-minute wobble and a grant that has been revoked on one of the web_*
  // views look identical from the outside, and the second is losing every
  // visitor to every mechanic. The difference is only visible if it is
  // written down. Table only, never the query: the row filter carries the
  // mechanic's id.
  console.error(`[supabase] read failed: ${path.split('?')[0]} - ${why}`);
  return null;
}

// A slug is MINTED lowercase and stored lowercase: the database CHECK
// constraint mechanic_profiles_slug_format is
// `^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$`, so no stored slug can contain an
// uppercase letter. Folding case here therefore can never resolve to the
// wrong mechanic's page: there is no second row it could collide with.
//
// It rescues the one link the product does not control. Everything Myku
// emits is already lowercase, but a link retyped off a business card, an
// invoice line or a van decal arrives in title case, and until now that
// went straight to the 404 page that reads "This link doesn't go anywhere."
// The database already folded case on its side (web_resolve_slug compares
// `h.old_slug = lower(p_slug)`); this layer was the only one that did not.
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

// EXPLICIT, not `*`, for exactly one reason: the view still carries an
// `available` column and this site must never receive it. Availability is
// the app's inbound doorbell, not page content, so it does not cross onto
// the website's infrastructure at all - not into the render, not into the
// link-preview card, not into a fetch nobody reads.
//
// The cost of being explicit is that a NEW column added to
// web_mechanic_pages will not appear here until it is added to this list.
// That is the trade: a forgotten column renders nothing, where `*` silently
// pulls the one column that must not travel. Keep this list in the same
// order as the MechanicPage interface above.
const PAGE_COLUMNS = [
  'id',
  'slug',
  'web_status',
  'full_name',
  'photo_url',
  'bio',
  'specialization',
  'years_experience',
  'service_city',
  'work_type',
  'rating',
  'review_count',
  'jobs_done',
  'id_verified',
  'has_insurance',
  'has_certifications',
  'certifications',
  'hourly_rate',
  'diagnostic_fee',
  'socials',
  'created_at',
  'business_name',
  'hours_note',
  'request_note',
  'service_towns',
  'service_radius_mi',
  'hours_json',
  'show_photo',
  'page_lang',
].join(',');

/** `ok: false` means the read never got an answer. It is NOT "no such page",
 *  and the two must not produce the same page for the visitor. */
export type PageRead =
  | { ok: true; page: MechanicPage | null }
  | { ok: false };

export async function readMechanicPage(slug: string): Promise<PageRead> {
  const rows = await rest<MechanicPage[]>(
    `web_mechanic_pages?slug=eq.${encodeURIComponent(normalizeSlug(slug))}` +
      `&select=${PAGE_COLUMNS}&limit=1`
  );
  if (rows === null) return { ok: false };
  return { ok: true, page: rows[0] ?? null };
}

// Collapses the two back together for the callers that cannot act on the
// difference: the link-preview card draws the same generic tile either way,
// and the metadata pass has no page to title either way. The route that
// decides whether a visitor is told the link is dead uses readMechanicPage.
export async function getMechanicPage(slug: string): Promise<MechanicPage | null> {
  const read = await readMechanicPage(slug);
  return read.ok ? read.page : null;
}

export interface ServiceRow {
  service: string;
  price_from: number | null;
  sort_order: number;
}

// The mechanic's own order first, then name, so two rows he never reordered
// still come back in a stable order.
// NULL MEANS THE READ FAILED, and it is no longer folded into "he has none".
// That conflation became dangerous the moment /[slug] started being cached: a
// one-second Supabase blip during a revalidation would be frozen into the CDN as a
// mechanic with no services, no past work and no reviews, and served for the next
// minute to everyone he sent the link to. readMechanicPage already refuses to make
// this mistake one level up; these four now match it. The page route turns a null
// into a throw, which is an uncached 500 that self-heals and lets
// stale-while-revalidate keep serving the last good copy. The link-preview card
// coerces to [] instead, because a generic card beats no card at all.
export async function getServices(mechanicId: string): Promise<ServiceRow[] | null> {
  const rows = await rest<ServiceRow[]>(
    `web_mechanic_services?mechanic_id=eq.${mechanicId}&select=service,price_from,sort_order&order=sort_order.asc,service.asc`
  );
  return rows;
}

export async function getSharedJobs(mechanicId: string): Promise<SharedJob[] | null> {
  return (
    (await rest<SharedJob[]>(
      `web_shared_jobs?mechanic_id=eq.${mechanicId}&order=done_on.desc.nullslast&limit=40`
    ))
  );
}

export async function getVerifiedJobs(mechanicId: string): Promise<VerifiedJob[] | null> {
  return (
    (await rest<VerifiedJob[]>(
      `web_verified_jobs?mechanic_id=eq.${mechanicId}&order=completed_at.desc&limit=40`
    ))
  );
}

export async function getReviews(mechanicId: string): Promise<Review[] | null> {
  return (
    (await rest<Review[]>(
      // 100, not 20. The page and the link-preview card now count reviews from
      // the rows this returns rather than from the stored counter, so the cap
      // here is the number a mechanic can be shown to have on the LIVE page.
      // Twenty would have printed "20 reviews" for anyone with more, in the
      // headline stats and in the rating Google reads. 100 matches what the
      // app loads, and what the web_preview_bundle RPC returns to the
      // mechanic's own preview, so the two surfaces print the same figure.
      `web_mechanic_reviews?mechanic_id=eq.${mechanicId}&order=created_at.desc&limit=100`
    ))
  );
}

export async function getPublishedSlugs(): Promise<
  { slug: string; created_at: string | null }[]
> {
  const rows = await rest<{ slug: string; created_at: string | null }[]>(
    `web_mechanic_pages?web_status=eq.published&select=slug,created_at&limit=1000`,
    300
  );
  return rows ?? [];
}

// Same shape a slug is minted in. Anything else never leaves this process:
// no request is made for input that cannot possibly be a slug.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

// A RETIRED slug resolves to the page's current slug, but only while that
// page is publicly visible; otherwise null. The RPC is the boundary: it
// never reveals a slug for a page the public view would not serve.
export async function resolveRetiredSlug(slug: string): Promise<string | null> {
  // Fold case BEFORE the guard. The guard is deliberately the minted shape,
  // which is lowercase, so testing the raw param made a capitalised retired
  // link fail here and never reach the RPC at all, even though the RPC
  // itself already lowercases what it is given.
  const normalized = normalizeSlug(slug);
  if (!SLUG_RE.test(normalized)) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/web_resolve_slug`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_slug: normalized }),
      // 60s, NOT no-store, and the reason is structural. This runs inside
      // /[slug], which is now an ISR route (generateStaticParams there), and
      // a no-store fetch inside a static render is dynamic usage: Next
      // answered "Page changed from static to dynamic at runtime" and served
      // a 500 where a retired link had been redirecting and an unknown slug
      // had been 404ing. Measured on a production build, not reasoned about.
      // Nothing is lost by caching it either: the render this sits inside is
      // itself held for 60 seconds, so a no-store read here could never make
      // the redirect any fresher than the page around it.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const out = (await res.json()) as unknown;
    // The caller builds a redirect from this, so it must itself be a slug:
    // never a path, never a protocol-relative "//host".
    return typeof out === 'string' && SLUG_RE.test(out) ? out : null;
  } catch {
    return null;
  }
}
