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
  available: boolean | null;
  socials: Record<string, string> | null;
  created_at: string;
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

export async function getMechanicPage(slug: string): Promise<MechanicPage | null> {
  const rows = await rest<MechanicPage[]>(
    `web_mechanic_pages?slug=eq.${encodeURIComponent(slug)}&limit=1`
  );
  return rows?.[0] ?? null;
}

export async function getServices(mechanicId: string): Promise<string[]> {
  const rows = await rest<{ service: string }[]>(
    `web_mechanic_services?mechanic_id=eq.${mechanicId}&select=service`
  );
  return rows?.map((r) => r.service) ?? [];
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

export async function getPublishedSlugs(): Promise<string[]> {
  const rows = await rest<{ slug: string }[]>(
    `web_mechanic_pages?web_status=eq.published&select=slug&limit=1000`,
    300
  );
  return rows?.map((r) => r.slug) ?? [];
}
