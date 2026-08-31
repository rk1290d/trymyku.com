import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getMechanicPage, SUPABASE_URL } from '@/lib/supabase';
import { initials } from '@/lib/format';

// THE LINK PREVIEW.
// This is the first thing a stranger sees when the link lands in a WhatsApp,
// Messenger or iMessage thread, so it is the mechanic's storefront and not a
// Myku advertisement. Same paper, same ink, same rules as the page itself:
// no orange, no teal, no badges, no pills, no wordmark lockup, and no
// paperwork claim on a page the mechanic has never agreed to.

const PAPER = '#FAF7F2';
const PAPER_2 = '#F1EDE5';
const RULE = '#CDC5B6';
const INK = '#14120F';
const INK_2 = '#57514A';
const INK_3 = '#6F6A61';

export const alt = 'Mechanic profile page';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// HOW LONG THE CARD IS ALLOWED TO BE WRONG.
//
// This card used to be frozen. next/og's ImageResponse constructor sets
// `cache-control: public, immutable, no-transform, max-age=31536000` on
// every response it builds (next/dist/server/og/image-response.js), and
// nothing downstream touched it, so the first CDN node, browser or crawler
// to fetch a mechanic's card pinned that PNG for a year. The og:image URL
// cannot rescue it either: the query token Next appends is a hash of THIS
// FILE, not of his data. It is byte-identical for every mechanic and never
// moves when his photo, business name or city does.
//
// TWO exports, and they do DIFFERENT jobs. Verified by building the site and
// reading the served headers, not assumed:
//
//   `revalidate` below declares this segment's freshness window, which is
//   what a route handler is supposed to carry. On its own it changes
//   NOTHING about the header: a local production build with only this export
//   added still served `immutable, max-age=31536000`, because the header is
//   written inside the ImageResponse constructor.
//
//   CARD_CACHE_CONTROL is the fix. The constructor lets `options.headers`
//   override what it set, and that is the only thing that does.
//
// Sixty seconds is the same window the page's own data already runs on
// (lib/supabase.ts rest(), next: { revalidate: 60 }), so the card and the
// page it advertises can never disagree by more than the page already
// disagrees with itself. A profile changes rarely, but it changes in bursts:
// in the minutes after he publishes, while he is fixing his photo and his
// business name, which is exactly when a frozen card does the damage. The
// cost of the short window is one render per minute per slug, and only when
// somebody actually asks for the card.
export const revalidate = 60;

// public, so shared caches may hold it; max-age=0, so a browser or a scraper
// never treats its own copy as fresh; s-maxage=60 for the CDN; and a short
// stale-while-revalidate so a crawler on a cold edge gets an instant card
// rather than waiting on a re-render. No `immutable`, and no year.
const CARD_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

// Read once per lambda instance, not once per card: a first-ever share of
// a slug already pays cold start plus the photo fetch, and WhatsApp's
// crawler timeout is short.
let fontsPromise: ReturnType<typeof loadFonts> | null = null;

async function loadFonts() {
  const [extraBold, medium] = await Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/Jakarta-ExtraBold.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/Jakarta-Medium.ttf')),
  ]);
  return [
    { name: 'Jakarta', data: extraBold, weight: 800 as const, style: 'normal' as const },
    { name: 'Jakarta', data: medium, weight: 500 as const, style: 'normal' as const },
  ];
}

function fonts() {
  fontsPromise ??= loadFonts();
  return fontsPromise;
}

// The photo is fetched here, defended, and inlined as a data URI. Left as a
// raw URL, a slow bucket, a dead link or a HEIC upload makes satori throw,
// and the crawler gets a 500: the share lands with no card at all. On any
// failure the card degrades to the initials plate instead of vanishing.
// Only these hosts are ever fetched. photo_url is a database value a
// mechanic can influence, and this code runs server-side on Vercel: without
// an allowlist, "https://x" pointing at a private address turns card
// rendering into a server-side request forgery primitive. Scheme and host
// are checked BEFORE the request, because the existing content-type and
// size checks only inspect the response, which is far too late.
function fetchableImage(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  let supabaseHost = '';
  try {
    supabaseHost = new URL(SUPABASE_URL).hostname;
  } catch {
    return null;
  }
  const allowed = u.hostname === supabaseHost || u.hostname === 'images.unsplash.com';
  return allowed ? u.toString() : null;
}

async function safePhoto(rawUrl: string): Promise<string | null> {
  const url = fetchableImage(rawUrl);
  if (!url) return null;
  try {
    // redirect: 'error' closes the bypass where an allowlisted host 302s to
    // an internal address.
    const res = await fetch(url, { signal: AbortSignal.timeout(2500), redirect: 'error' });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') ?? '').split(';')[0].trim();
    if (ct !== 'image/png' && ct !== 'image/jpeg') return null;
    const buf = await res.arrayBuffer();
    // 0-byte legacy uploads exist; a >8MB original would bloat the render.
    if (buf.byteLength === 0 || buf.byteLength > 8_000_000) return null;
    return `data:${ct};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getMechanicPage(slug);
  const fontList = await fonts();

  if (!page) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: PAPER,
            color: INK_3,
            fontFamily: 'Jakarta',
            fontSize: 48,
            fontWeight: 500,
          }}
        >
          myku
        </div>
      ),
      // The placeholder card gets the short window too. A slug with no page
      // today may have one tomorrow, and a year-long pin would keep serving
      // this blank plate to everyone who shares his link after he publishes.
      { ...size, fonts: fontList, headers: { 'cache-control': CARD_CACHE_CONTROL } }
    );
  }

  const unclaimed = page.web_status !== 'published';
  // The portrait honours his "show my photo on the page" switch here too:
  // the link preview IS the page to everyone who never taps it, so a photo
  // he hid from the page must not keep riding on every share of the link.
  // Missing (older rows) reads as shown, the same default the page uses.
  const photo =
    page.photo_url && page.show_photo !== false ? await safePhoto(page.photo_url) : null;

  const ratingNum =
    typeof page.rating === 'string' ? parseFloat(page.rating) : page.rating ?? 0;
  const hasRating = (page.review_count ?? 0) > 0 && ratingNum > 0;
  const city = page.service_city?.split(',')[0]?.trim();
  const years = page.years_experience ?? 0;

  // Same rule the page body uses, so the card cannot contradict the page.
  const bizName = page.business_name?.trim() || null;
  const bizLeads = Boolean(bizName);
  const headline = bizName ?? page.full_name;

  // Self-reported facts. These are on the page for claimed and unclaimed
  // pages alike, so they travel with the card either way.
  const meta = [
    city || null,
    years > 0 ? `${years} yrs working` : null,
    hasRating ? `${ratingNum.toFixed(1)} out of 5 (${page.review_count})` : null,
  ].filter(Boolean) as string[];

  // Myku's document checks. SUPPRESSED ENTIRELY on unclaimed pages, exactly
  // as the page body suppresses them, and rendered as one plain line with the
  // qualification directly beneath it rather than as badges.
  const credentials = unclaimed
    ? []
    : ([
        page.id_verified ? 'ID verified' : null,
        page.has_insurance ? 'Insurance on file' : null,
        page.has_certifications ? 'Certifications on file' : null,
      ].filter(Boolean) as string[]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: PAPER,
          fontFamily: 'Jakarta',
          padding: '64px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 56 }}>
          {photo ? (
            <div
              style={{
                display: 'flex',
                width: 240,
                height: 240,
                borderRadius: 12,
                overflow: 'hidden',
                border: `2px solid ${RULE}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt=""
                width={240}
                height={240}
                style={{ objectFit: 'cover', width: 240, height: 240 }}
              />
            </div>
          ) : (
            // Square plate, flat fill, no gradient and no ring. A circle reads
            // social profile; a square reads business.
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 240,
                height: 240,
                borderRadius: 12,
                background: PAPER_2,
                border: `2px solid ${RULE}`,
                color: INK_3,
                fontSize: 88,
                fontWeight: 800,
              }}
            >
              {initials(page.full_name)}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* The headline follows the PAGE's rule (decision 4): the business
                name leads when he has set one, with his own name beneath it.
                The card used to print full_name unconditionally, so a mechanic
                trading as "Reed Auto Repair" set the name, watched his page
                body obey, then pasted the link into a group chat and saw a card
                headed with his personal name instead.

                Attribution never moves to the business: the person's name stays
                on the card whenever the business name displaces it, because a
                company cannot share a job and Myku confirms nothing about a
                trading name.

                The size ramp is wider than the old two-step because these are
                different lengths of thing: a full name is short, while
                business_name is CHECKed at up to 60 characters, which at the
                old 62px would have run straight off the card. */}
            <div
              style={{
                display: 'flex',
                color: INK,
                fontSize: headline.length > 40 ? 38 : headline.length > 28 ? 48 : headline.length > 18 ? 62 : 76,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1.05,
              }}
            >
              {headline}
            </div>
            {bizLeads ? (
              <div
                style={{
                  display: 'flex',
                  color: INK_2,
                  fontSize: 30,
                  fontWeight: 500,
                  marginTop: 10,
                }}
              >
                {page.full_name}
              </div>
            ) : null}
            <div
              style={{
                display: 'flex',
                color: INK_2,
                fontSize: 32,
                fontWeight: 500,
                marginTop: 16,
              }}
            >
              {page.specialization || 'Independent mechanic'}
            </div>
            {meta.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  color: INK_3,
                  fontSize: 28,
                  fontWeight: 500,
                  marginTop: 18,
                }}
              >
                {meta.join(' · ')}
              </div>
            ) : null}
            {credentials.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 26,
                }}
              >
                <div style={{ display: 'flex', color: INK_2, fontSize: 26, fontWeight: 500 }}>
                  {credentials.join(' · ')}
                </div>
                {/* The qualification sits in the same breath as the claim. */}
                <div
                  style={{
                    display: 'flex',
                    color: INK_3,
                    fontSize: 22,
                    fontWeight: 500,
                    marginTop: 8,
                  }}
                >
                  Myku checked these documents. That is not a recommendation.
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: `2px solid ${RULE}`,
            paddingTop: 28,
          }}
        >
          <div style={{ display: 'flex', color: INK_3, fontSize: 24, fontWeight: 500 }}>
            myku
          </div>
          <div style={{ display: 'flex', color: INK_3, fontSize: 28, fontWeight: 500 }}>
            trymyku.com/{page.slug}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fontList, headers: { 'cache-control': CARD_CACHE_CONTROL } }
  );
}
