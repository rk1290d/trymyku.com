import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

// Accepts a quote request from a public profile page and stores it in
// profile_leads. Inserts run under the anon key: row-level security only
// allows inserts for web-visible mechanics, and nothing can be read back.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Legacy anon JWT (public by design): the notify-lead edge function sits
// behind verify_jwt, which the modern publishable key can't satisfy.
const SUPABASE_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb2lhb3hhb3pxZndkcXVrb2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk1OTksImV4cCI6MjA5NDk4NTU5OX0.CiVafVFbEaW5s8ejGtvDtg8c6guMeYKHaLL6eiDjwq8';

// First-line rate limit: a tiny per-IP token bucket held in module memory.
// Imperfect across serverless instances by design; it exists to blunt the
// dumb single-source flood, not to be the real defense (that belongs in a
// DB-side per-mechanic cap, which cannot be bypassed by hitting PostgREST
// directly).
const BUCKET_MAX = 3;
const BUCKET_WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (buckets.get(ip) ?? []).filter((t) => now - t < BUCKET_WINDOW_MS);
  if (hits.length >= BUCKET_MAX) {
    buckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  buckets.set(ip, hits);
  // Keep the map from growing without bound under an IP-rotating flood.
  if (buckets.size > 5000) buckets.clear();
  return false;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'too many requests' }, { status: 429 });
  }

  // Honeypot, now enforced server-side: a bot POSTing the form fields
  // directly gets the same success it would get in the browser, and
  // nothing is stored.
  if (typeof body.hp === 'string' && body.hp.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const mechanicId = typeof body.mechanic_id === 'string' ? body.mechanic_id : '';
  const slug = typeof body.slug === 'string' ? body.slug.slice(0, 60) : null;
  const name =
    typeof body.customer_name === 'string' && body.customer_name.trim()
      ? body.customer_name.trim().slice(0, 80)
      : null;
  const phone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : '';
  const vehicle =
    typeof body.vehicle === 'string' && body.vehicle.trim()
      ? body.vehicle.trim().slice(0, 80)
      : null;
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 1500) : '';

  // Canonical phone: strip any extension ("ext 22", "x22") from the
  // dialable value, then keep digits only with a single leading + allowed.
  // Stored canonically so the app's tel: link dials what the customer meant
  // and a future per-phone dedupe has one shape to compare.
  const dialable = phone.replace(/(?:ext|extension|x)[.:]?\s*\d+\s*$/i, '');
  const digits = dialable.replace(/[^\d]/g, '');
  const normalizedPhone = (dialable.trim().startsWith('+') ? '+' : '') + digits;
  // Bounds live on the DIGITS (7-15, the real shape of a phone number). The
  // raw cap only exists to bound garbage: a formatted number with an
  // extension ("+1 (208) 555-0142 ext 9") is 23 chars and must not bounce.
  if (
    !UUID_RE.test(mechanicId) ||
    digits.length < 7 ||
    digits.length > 15 ||
    phone.length > 32 ||
    description.length < 5
  ) {
    return NextResponse.json({ error: 'invalid fields' }, { status: 400 });
  }

  // Generate the id here: anon can insert but never read rows back, and the
  // push notifier needs the id to target this exact lead.
  const leadId = crypto.randomUUID();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profile_leads`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id: leadId,
      mechanic_id: mechanicId,
      slug,
      customer_name: name,
      customer_phone: normalizedPhone,
      vehicle,
      description,
      source: 'web',
    }),
  });

  if (!res.ok) {
    // An RLS rejection means the page is web-visible no longer (mechanic
    // unpublished; a cached copy of the page still rendered the composer).
    // That is a permanent no, not a retryable hiccup, and the client shows
    // a different sentence for it.
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: 'page not accepting requests' }, { status: 410 });
    }
    console.error(`lead insert failed: status ${res.status} mechanic=${mechanicId}`);
    return NextResponse.json({ error: 'could not save' }, { status: 502 });
  }

  // Buzz the mechanic's phone. Genuinely fire-and-forget now: after() runs
  // once the 201 is on the wire, so a slow edge function never holds the
  // customer's "Request sent." hostage. A non-OK response is logged so a
  // dead notification ladder shows up in Vercel logs instead of nowhere.
  after(async () => {
    try {
      const notifyRes = await fetch(`${SUPABASE_URL}/functions/v1/notify-lead`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_JWT,
          Authorization: `Bearer ${SUPABASE_ANON_JWT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lead_id: leadId }),
      });
      if (!notifyRes.ok) {
        console.error(`notify-lead failed: status ${notifyRes.status} lead=${leadId}`);
      }
    } catch (e) {
      console.error(`notify-lead unreachable: lead=${leadId}`, e);
    }
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
