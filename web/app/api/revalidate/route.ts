import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// On-demand ISR revalidation for a mechanic's storefront. The database calls
// this (pg_net trigger, storefront plan slice 4) the moment a page-relevant
// row changes, so an edit reaches visitors in seconds instead of within the
// 60-second ISR window. ISR 60 stays as the fallback: if this route is
// unreachable, misconfigured, or refuses the call, nothing is lost, the page
// just refreshes on the old schedule. A revalidation hiccup can never break a
// save.
//
// FAIL CLOSED. The shared secret lives in Supabase Vault on the caller's side
// and in the REVALIDATE_SECRET env var here. Until that env var exists, every
// call is refused with 503, and the database trigger swallows the failure.
// The secret is compared in constant time.

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    // Not configured yet. Say so plainly rather than 401, so the DB-side log
    // distinguishes "not set up" from "wrong secret".
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  const provided = req.headers.get('x-revalidate-secret') ?? '';
  if (!timingSafeEqual(provided, secret)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  // Accept one slug or a small list (a rename revalidates old and new).
  const raw = (body as { slugs?: unknown; slug?: unknown }) ?? {};
  const list: unknown[] = Array.isArray(raw.slugs) ? raw.slugs : raw.slug != null ? [raw.slug] : [];
  const slugs = Array.from(
    new Set(list.filter((s): s is string => typeof s === 'string' && SLUG_RE.test(s)))
  ).slice(0, 10);

  if (slugs.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_valid_slug' }, { status: 400 });
  }

  for (const slug of slugs) {
    // The page and its OG image share the cache key prefix; revalidate both.
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/opengraph-image`);
  }

  return NextResponse.json({ ok: true, revalidated: slugs });
}
