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
      { ...size, fonts: fontList }
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
            <div
              style={{
                display: 'flex',
                color: INK,
                fontSize: page.full_name.length > 18 ? 62 : 76,
                fontWeight: 800,
                letterSpacing: -3,
                lineHeight: 1.05,
              }}
            >
              {page.full_name}
            </div>
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
    { ...size, fonts: fontList }
  );
}
