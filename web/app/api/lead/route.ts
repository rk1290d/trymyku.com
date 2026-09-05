import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

// Accepts a quote request from a public profile page and stores it in
// profile_leads. Inserts run under the anon key: row-level security only
// allows inserts for web-visible mechanics, and nothing can be read back.
//
// THE THREE LIMITS A REQUEST PASSES, AND WHY THEY ARE DIFFERENT.
// This is the conversion moment for the whole business, so a refusal here is
// never just an error code. There are three, and until migration 118 they were
// indistinguishable to everyone downstream:
//
//   scope 'ip'       the per-IP burst bucket below, 3 a minute. A customer who
//                    double-taps submit. "Wait a minute" is literally true.
//   scope 'sender'   the database cap on one phone number to one mechanic,
//                    3 an hour. He is not losing a lead: the mechanic already
//                    has this person's last three requests.
//   scope 'mechanic' the database flood ceiling on one mechanic, 60 an hour
//                    and 90 a day. THIS ONE IS A LOST LEAD. It is the only one
//                    that costs the mechanic a customer, so it is logged, and
//                    the request itself is written to profile_lead_refusals so
//                    he can still be handed the person's name and number. The
//                    other two are NOT recorded, on purpose: see the note at
//                    the recorder below and section D of migration 118.
//
// Every 429 carries its scope and a real retry_after in the body and in the
// Retry-After header, and the composer now reads both: refusalMessage() in
// components/QuoteForm.tsx says something different, and true, for each of the
// three. That mapping is by scope STRING, so renaming a scope here goes stale
// there silently. Change the two together.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Deliberately loose. This exists to catch a typo in an OPTIONAL field, not to
// adjudicate RFC 5322 — a real address wrongly refused here costs a lead, and
// the address is a fallback channel rather than something we authenticate.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Legacy anon JWT (public by design): the notify-lead edge function sits
// behind verify_jwt, which the modern publishable key can't satisfy.
const SUPABASE_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb2lhb3hhb3pxZndkcXVrb2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk1OTksImV4cCI6MjA5NDk4NTU5OX0.CiVafVFbEaW5s8ejGtvDtg8c6guMeYKHaLL6eiDjwq8';

// First-line rate limit: a tiny per-IP token bucket held in module memory.
// Imperfect across serverless instances by design; it exists to blunt the
// dumb single-source flood, not to be the real defense. The real one is in the
// database, because profile_leads takes anon inserts through PostgREST and a
// bot talking straight to that endpoint never reaches this file at all.
//
// That DB-side guard used to count every lead for a mechanic against one
// shared allowance of five an hour, on a created_at the inserter was allowed
// to choose. So it stopped honest customers and not the flooder. Migration 118
// counts a clock the sender cannot set, keys the tight cap on the sender's own
// phone number, and raises the per-mechanic ceiling to sixty an hour so that a
// page shared in a busy group cannot trip it. Its daily ceiling is ninety, kept
// deliberately below the hundred rows the app reads for the mechanic's Inbox.
//
// SO WHY DOES THIS ONE STILL KEY ON THE IP, when 118's own header argues at
// length that an IP is the wrong key - two neighbours on one home connection,
// or two people on the same carrier NAT, look identical from the server?
// Because these are not the same kind of limit, and only one of them is a cap.
// 118's caps decide how much a page may take in an hour and a day; keying THAT
// on an IP would lock a real customer out for an hour over a stranger's
// traffic, which is the failure 118 is named after. This is a burst window:
// three in sixty seconds, per serverless instance, in front of an
// unauthenticated POST, applied before the body has been parsed or the mechanic
// identified. Its whole worst case is one refusal that clears in under a
// minute, and it is the one refusal in this file whose message to the customer
// is literally true ("wait a minute", refusalMessage() in QuoteForm.tsx).
//
// It is still a lost request with no record - see the note where it fires - so
// the honest reading is that the IP key survives on the strength of its short
// window, not on the strength of the key. If a busy shared connection ever
// turns out to cost more than the dumb flood this blunts, RAISE BUCKET_MAX
// rather than moving the key: after 118 the database carries a real per-sender
// cap behind this, which it did not when the number 3 was chosen.
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

// ── Refusals ────────────────────────────────────────────────────────────────
// Which limit turned this customer away, how long it actually lasts, and what
// to file it under. `reason` matches the check constraint on
// profile_lead_refusals.reason exactly; anything else would bounce the record.
type CapScope = 'ip' | 'sender' | 'mechanic';

interface Cap {
  scope: CapScope;
  reason: 'sender_hour' | 'sender_day' | 'mechanic_hour' | 'mechanic_day' | 'unknown';
  retryAfter: number; // seconds, and true rather than optimistic
}

const IP_BURST: Cap = { scope: 'ip', reason: 'unknown', retryAfter: 60 };

const DB_CAPS: Record<string, Cap> = {
  sender_hour: { scope: 'sender', reason: 'sender_hour', retryAfter: 3600 },
  sender_day: { scope: 'sender', reason: 'sender_day', retryAfter: 86_400 },
  mechanic_hour: { scope: 'mechanic', reason: 'mechanic_hour', retryAfter: 3600 },
  mechanic_day: { scope: 'mechanic', reason: 'mechanic_day', retryAfter: 86_400 },
};

// PostgREST hands the database's error back as JSON with a `hint` field, and
// migration 118 puts a stable token there. Read the token first; fall back to
// the wording only because this file can deploy before that migration is
// applied, and the guard it replaces raises the same 23514 with no hint at all.
// An unrecognised 23514 is a genuine constraint violation, not a cap, and is
// told apart from one here rather than being reported to the customer as
// "too many requests" the way it used to be.
function classifyCap(detail: string): Cap | null {
  const token = detail.match(/myku_cap=([a-z_]+)/);
  if (token && DB_CAPS[token[1]]) return DB_CAPS[token[1]];
  const lower = detail.toLowerCase();
  if (detail.includes('23514') && (lower.includes('too many requests') || lower.includes('rate'))) {
    return { scope: 'mechanic', reason: 'unknown', retryAfter: 3600 };
  }
  return null;
}

function tooManyRequests(cap: Cap) {
  return NextResponse.json(
    { error: 'too many requests', scope: cap.scope, retry_after: cap.retryAfter },
    { status: 429, headers: { 'Retry-After': String(cap.retryAfter) } },
  );
}

// Write the refused request down. A cap that fires BEFORE INSERT leaves no
// row, no notification and no trace, so until now a mechanic could lose a
// customer off his own page and never learn it happened. This is best effort
// on purpose: it runs after the response is on the wire, it cannot delay or
// fail the customer's request, and if the table is not there yet (this file
// deploying ahead of migration 118) it logs one line and stops.
function recordRefusal(row: Record<string, unknown>, cap: Cap) {
  after(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profile_lead_refusals`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ ...row, reason: cap.reason }),
      });
      if (!res.ok) {
        console.error(
          `[lead] refusal NOT recorded: status ${res.status} reason=${cap.reason} ` +
            `mechanic=${String(row.mechanic_id)}`,
        );
      }
    } catch (e) {
      console.error(`[lead] refusal recorder unreachable: mechanic=${String(row.mechanic_id)}`, e);
    }
  });
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
    // Nothing is recorded here and that is deliberate: this fires before the
    // body has been checked, so there is no verified request to file, and the
    // customer's first submission a few seconds ago almost certainly landed.
    // The IP itself is never logged.
    console.error(
      `[lead] refused by the per-IP burst limit (3 a minute) mechanic=${
        typeof body.mechanic_id === 'string' ? body.mechanic_id : 'unknown'
      }`,
    );
    return tooManyRequests(IP_BURST);
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
  // Optional. Stored lowercased so a future per-address dedupe has one shape to
  // compare, the same reason the phone is normalised below.
  const email =
    typeof body.customer_email === 'string' && body.customer_email.trim()
      ? body.customer_email.trim().toLowerCase().slice(0, 160)
      : null;
  const vehicle =
    typeof body.vehicle === 'string' && body.vehicle.trim()
      ? body.vehicle.trim().slice(0, 80)
      : null;
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 1500) : '';
  // Structured booking fields (2026-08-04). Service is free text from the
  // mechanic's own list; timing is a closed enum mirrored by a DB CHECK.
  const service =
    typeof body.service === 'string' && body.service.trim()
      ? body.service.trim().slice(0, 120)
      : null;
  const timing =
    typeof body.preferred_timing === 'string' &&
    ['asap', 'this_week', 'flexible'].includes(body.preferred_timing)
      ? body.preferred_timing
      : null;

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
  // A booking is valid with a service and no prose, or prose and no
  // service. Mirrors the DB check exactly: rejecting here what the DB
  // would accept (or vice versa) turns into a user-facing 502.
  if (
    !UUID_RE.test(mechanicId) ||
    digits.length < 7 ||
    digits.length > 15 ||
    phone.length > 32 ||
    // The name is REQUIRED as of 2026-08-22. The browser already enforces this,
    // but the browser is not the authority: this endpoint is public and takes
    // nothing on trust.
    name === null ||
    name.length < 2 ||
    // Optional, so null passes. A present one must look like an address, and
    // must fit the column's 5..160 CHECK or the insert would 502 instead of 400.
    (email !== null && (!EMAIL_RE.test(email) || email.length < 5)) ||
    (description.length < 5 && service === null)
  ) {
    return NextResponse.json({ error: 'invalid fields' }, { status: 400 });
  }

  // Resolve the mechanic server-side before storing anything. Two things
  // arrive from the browser that must never be taken on trust:
  //   - slug: stored on the row and printed into the notification ("a
  //     request came in from trymyku.com/<slug>"). A forged value would put
  //     an attacker-chosen string in a Myku-branded message, so the real
  //     slug is read from the mechanic's own row and the body's is ignored.
  //   - service: becomes the headline of the mechanic's push. Only his own
  //     service list, the fixed fallback chips, or the not-sure sentinel are
  //     allowed through; anything else is dropped rather than rejected, so a
  //     surprising value never costs the customer their booking.
  // Missing from the public view also means not web-visible: a permanent no.
  const [pageRes, svcRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/web_mechanic_pages?id=eq.${mechanicId}&select=slug&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/web_mechanic_services?mechanic_id=eq.${mechanicId}&select=service`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    ),
  ]);
  // A non-200 is NOT "he is not taking requests". The same argument the RLS
  // branch below makes: a wobble and a revoked grant on web_mechanic_pages
  // look identical from here, and the second is destroying EVERY lead on the
  // site while telling every customer the mechanic has stopped taking work.
  // So it is logged, and it comes back retryable rather than as the permanent
  // 410 the composer renders as a closed door.
  if (!pageRes.ok) {
    console.error(
      `[lead] page lookup failed with ${pageRes.status} mechanic=${mechanicId}: ` +
        `${(await pageRes.text()).slice(0, 300)}`,
    );
    return NextResponse.json({ error: 'temporarily unavailable' }, { status: 503 });
  }
  const pageRows = (await pageRes.json()) as { slug: string | null }[];
  if (pageRows.length === 0) {
    return NextResponse.json({ error: 'page not accepting requests' }, { status: 410 });
  }
  const realSlug = pageRows[0].slug ?? null;

  // Its own failure is survivable - the chip is dropped, the description
  // carries the job - but it must not be silent, because the one case where
  // it is NOT survivable is handled forty lines down.
  if (!svcRes.ok) {
    console.error(
      `[lead] service list lookup failed with ${svcRes.status} mechanic=${mechanicId}. ` +
        `His own services cannot be recognised on this request.`,
    );
  }
  const ownServices = svcRes.ok
    ? ((await svcRes.json()) as { service: string }[]).map((r) => (r.service ?? '').trim())
    : [];
  const ALLOWED_FALLBACK = [
    "Won't start",
    'Brakes',
    'Check engine light',
    'Oil change',
    'AC or heat',
    'Not sure / something else',
  ];
  const serviceAllowed =
    service !== null &&
    [...ownServices, ...ALLOWED_FALLBACK].some(
      (s) => s.toLowerCase() === service.toLowerCase(),
    );
  const safeService = serviceAllowed ? service : null;
  // Dropping an unrecognised service must not also drop the whole request:
  // if it was the only thing describing the job, the prose rule applies.
  if (safeService === null && description.length < 5) {
    // Unless the only reason we cannot recognise it is that his service list
    // never loaded. A chip and a phone number is a complete submission as far
    // as the composer is concerned, so answering it with "invalid fields"
    // blames the customer for a form they filled in correctly, on our fault.
    if (service !== null && !svcRes.ok) {
      return NextResponse.json({ error: 'temporarily unavailable' }, { status: 503 });
    }
    return NextResponse.json({ error: 'invalid fields' }, { status: 400 });
  }

  // Generate the id here: anon can insert but never read rows back, and the
  // push notifier needs the id to target this exact lead.
  const leadId = crypto.randomUUID();

  // NO created_at. The database stamps it, and as of migration 118 anon is not
  // granted the column at all: the rate guard counts on it, so a value the
  // sender could choose made every cap optional. Adding it here would 403.
  const leadRow = {
    id: leadId,
    mechanic_id: mechanicId,
    slug: realSlug,
    customer_name: name,
    customer_phone: normalizedPhone,
    customer_email: email,
    vehicle,
    description,
    service: safeService,
    preferred_timing: timing,
    source: 'web',
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profile_leads`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(leadRow),
  });

  if (!res.ok) {
    // An RLS rejection means the page is web-visible no longer (mechanic
    // unpublished; a cached copy of the page still rendered the composer).
    // That is a permanent no, not a retryable hiccup, and the client shows
    // a different sentence for it.
    if (res.status === 401 || res.status === 403) {
      // Logged, which it was not before. An unpublished page and a broken
      // column grant both land here and look identical to the customer, and a
      // broken grant means EVERY lead is being lost rather than one. The
      // reason is in the body; the difference is only visible if it is
      // written down.
      console.error(
        `[lead] insert refused with ${res.status} mechanic=${mechanicId}: ` +
          `${(await res.text()).slice(0, 300)}`,
      );
      return NextResponse.json({ error: 'page not accepting requests' }, { status: 410 });
    }
    // A DB-side cap raises check_violation, which PostgREST returns as 400.
    // Telling that customer "could not save" reads as a bug in Myku and loses
    // the booking, so a cap becomes a 429 carrying which cap fired and how
    // long it really lasts.
    if (res.status === 400) {
      const detail = await res.text();
      const cap = classifyCap(detail);
      if (cap) {
        console.error(
          `[lead] refused by the ${cap.scope} cap (${cap.reason}) mechanic=${mechanicId} ` +
            `slug=${realSlug ?? 'none'}`,
        );
        // Only the per-mechanic ceiling is a lost customer: the per-sender cap
        // means this person's last three requests are already in his Inbox,
        // and filing those again would bury the ones he can act on.
        if (cap.scope === 'mechanic') {
          // Every field of the request except the lead id, which belongs to a
          // row that was never written. profile_lead_refusals grants insert on
          // exactly these columns and stamps its own created_at.
          recordRefusal(
            {
              mechanic_id: leadRow.mechanic_id,
              slug: leadRow.slug,
              customer_name: leadRow.customer_name,
              customer_phone: leadRow.customer_phone,
              customer_email: leadRow.customer_email,
              vehicle: leadRow.vehicle,
              description: leadRow.description,
              service: leadRow.service,
              preferred_timing: leadRow.preferred_timing,
              source: leadRow.source,
            },
            cap,
          );
        }
        return tooManyRequests(cap);
      }
      console.error(`lead insert rejected: ${detail.slice(0, 200)} mechanic=${mechanicId}`);
      return NextResponse.json({ error: 'invalid fields' }, { status: 400 });
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
