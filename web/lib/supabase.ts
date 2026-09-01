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

async function rest<T>(path: string, revalidate = 60): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
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

export async function getMechanicPage(slug: string): Promise<MechanicPage | null> {
  const rows = await rest<MechanicPage[]>(
    `web_mechanic_pages?slug=eq.${encodeURIComponent(normalizeSlug(slug))}` +
      `&select=${PAGE_COLUMNS}&limit=1`
  );
  return rows?.[0] ?? null;
}

export interface ServiceRow {
  service: string;
  price_from: number | null;
  sort_order: number;
}

// The mechanic's own order first, then name, so two rows he never reordered
// still come back in a stable order.
export async function getServices(mechanicId: string): Promise<ServiceRow[]> {
  const rows = await rest<ServiceRow[]>(
    `web_mechanic_services?mechanic_id=eq.${mechanicId}&select=service,price_from,sort_order&order=sort_order.asc,service.asc`
  );
  return rows ?? [];
}

export async function getSharedJobs(mechanicId: string): Promise<SharedJob[]> {
  return (
    (await rest<SharedJob[]>(
      `web_shared_jobs?mechanic_id=eq.${mechanicId}&order=done_on.desc.nullslast&limit=40`
    )) ?? []
  );
}

export async function getVerifiedJobs(mechanicId: string): Promise<VerifiedJob[]> {
  return (
    (await rest<VerifiedJob[]>(
      `web_verified_jobs?mechanic_id=eq.${mechanicId}&order=completed_at.desc&limit=40`
    )) ?? []
  );
}

export async function getReviews(mechanicId: string): Promise<Review[]> {
  return (
    (await rest<Review[]>(
      `web_mechanic_reviews?mechanic_id=eq.${mechanicId}&order=created_at.desc&limit=20`
    )) ?? []
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
      // A redirect must follow the latest rename. Never revalidate-cached.
      cache: 'no-store',
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
