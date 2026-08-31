import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// On-demand ISR revalidation for a mechanic's storefront. The database calls
// this (pg_net trigger, storefront plan slice 4) the moment a page-relevant
// row changes, so an edit reaches visitors in seconds instead of within the
// 60-second window the storefront's Supabase reads otherwise run on. That
// window stays as the fallback: if this route is unreachable, misconfigured,
// or refuses the call, nothing is lost, the page just refreshes on the old
// schedule. A revalidation hiccup can never break a save.
//
// FAIL CLOSED. The shared secret lives in Supabase Vault on the caller's side
// and in the REVALIDATE_SECRET env var here. Until that env var exists, every
// call is refused with 503, and the database trigger swallows the failure.
// The secret is compared in constant time.
//
// FAIL LOUD, which it did not before. Failing closed and failing silently are
// different things, and this route was doing both: the database fired a
// webhook on every edit, the site refused every one of them, and nobody
// learned. Now a refusal writes a full explanation to the server log, and a
// plain GET on this URL answers the question "is on-demand revalidation
// actually on?" in one line, without a secret and without a deploy.

// A GET that reports configuration must never be prerendered at build time:
// a statically generated answer would freeze the state the deployment had
// BEFORE the env var was set, and go on reporting "off" forever.
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

// Written once so the log line and the status endpoint can never drift apart.
// Deliberately names the env var and not the vault entry it is copied from:
// an env var name is not a secret, the storage location of the value is
// nobody's business but the owner's.
const NOT_CONFIGURED_HINT =
  'REVALIDATE_SECRET is not set on this deployment, so on-demand page ' +
  'revalidation is OFF. Storefront pages and link-preview cards refresh on ' +
  'the time-based fallback only. Set the variable in the Vercel project ' +
  'environment and redeploy: Vercel binds environment variables at deploy ' +
  'time, so setting it without a redeploy changes nothing.';

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Is on-demand revalidation armed? No secret required, because the answer is
// already readable from the 503 a POST returns, and a boolean about whether
// an env var exists grants nobody anything. Point a browser at
// https://trymyku.com/api/revalidate and read the sentence.
export async function GET() {
  const configured = Boolean(process.env.REVALIDATE_SECRET);
  return NextResponse.json(
    {
      ok: configured,
      configured,
      status: configured
        ? 'On-demand page revalidation is armed. A mechanic edit reaches the public page and its link-preview card within seconds.'
        : NOT_CONFIGURED_HINT,
    },
    { status: configured ? 200 : 503, headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    // Not configured yet. Say so plainly rather than 401, so the DB-side log
    // distinguishes "not set up" from "wrong secret" -- and say it in the
    // server log too, because until now this was a page-changed signal that
    // died in silence on every single edit.
    console.error(`[revalidate] REFUSED a page-changed call. ${NOT_CONFIGURED_HINT}`);
    return NextResponse.json(
      { ok: false, error: 'not_configured', hint: NOT_CONFIGURED_HINT },
      { status: 503, headers: NO_STORE }
    );
  }

  const provided = req.headers.get('x-revalidate-secret') ?? '';
  if (!timingSafeEqual(provided, secret)) {
    // Never log either value. The fact of the mismatch is the whole message:
    // it means the two halves have drifted, which is a different repair from
    // the one above and used to be indistinguishable from it in practice.
    console.error(
      '[revalidate] REFUSED a page-changed call: the x-revalidate-secret ' +
        'header did not match REVALIDATE_SECRET. The value on the database ' +
        'side and the value on this deployment have drifted apart. Edits are ' +
        'reaching pages on the time-based fallback only.'
    );
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400, headers: NO_STORE });
  }

  // Accept one slug or a small list (a rename revalidates old and new).
  const raw = (body as { slugs?: unknown; slug?: unknown }) ?? {};
  const list: unknown[] = Array.isArray(raw.slugs) ? raw.slugs : raw.slug != null ? [raw.slug] : [];
  const slugs = Array.from(
    new Set(list.filter((s): s is string => typeof s === 'string' && SLUG_RE.test(s)))
  ).slice(0, 10);

  if (slugs.length === 0) {
    console.error(
      '[revalidate] a page-changed call arrived with no usable slug in it. ' +
        'The caller sent a body this route could not read; nothing was refreshed.'
    );
    return NextResponse.json(
      { ok: false, error: 'no_valid_slug' },
      { status: 400, headers: NO_STORE }
    );
  }

  for (const slug of slugs) {
    // The page and its OG image share the cache key prefix; revalidate both.
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/opengraph-image`);
  }

  // The positive trace. Without it there is no way to tell a working loop
  // from a database that simply stopped calling, which is the same blind
  // spot from the other side.
  console.log(`[revalidate] refreshed: ${slugs.join(', ')}`);

  return NextResponse.json({ ok: true, revalidated: slugs }, { headers: NO_STORE });
}
