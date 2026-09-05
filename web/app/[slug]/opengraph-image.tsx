import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getMechanicPage, getReviews, SUPABASE_URL } from '@/lib/supabase';
import { firstName, initials } from '@/lib/format';

// THE LINK PREVIEW.
// This is the first thing a stranger sees when the link lands in a WhatsApp,
// Messenger or iMessage thread, so it is the mechanic's storefront and not a
// Myku advertisement. Same paper, same ink, same rules as the page itself:
// no orange, no teal, no badges, no pills, no wordmark lockup, and no
// paperwork claim on a page the mechanic has never agreed to.
//
// AN UNCLAIMED CARD MUST SAY SO, AND IT MUST SAY SO IN THE IMAGE.
// An unclaimed page is one Myku built for a mechanic who has not signed up:
// his real name, his trade, his town and his years, typed by Myku off a
// public listing. The page body carries five separate signals of that state
// (the claim strip, "Unconfirmed" in the eyebrow, the "From public listings"
// chip, the softened How Myku Works paragraph, and no structured data). This
// card used to carry NONE of them - it suppressed the paperwork line and
// stopped there, so an unclaimed card and a claimed card for a mechanic with
// no documents on file were byte-identical, and a real person's name went
// into a group chat on a card that read as a live, agreed profile.
//
// The route's og:description does carry the caveat, and WhatsApp, Slack,
// Discord, Facebook, X and LinkedIn all render it. iMessage does not: it
// shows the IMAGE, the title and the domain. So the state has to live in the
// pixels, and it has to survive the scale a chat bubble renders them at.
//
// That last part was measured, not guessed: this card was rendered and
// downsampled to 300px wide, roughly an iMessage bubble. At that size the
// uppercase letter-spaced eyebrow still reads; the 26/22px sourcing lines
// beneath it are at or past the edge of legible. Hence BOTH placements, each
// doing a different job - the eyebrow directly above the name for the
// scaled-down case, the sourcing sentence in the slot the paperwork line
// vacated for anyone who opens the card at size. The route's <title> carries
// the same marker in real text, for the surfaces that shrink the image
// hardest.
//
// The wording is the page body's own disclosure sentence, recased and
// repunctuated to stand alone on a card: the page says "nothing on the page
// has been confirmed by {first}", the card says "Nothing on this page has
// been confirmed by {first}." Copied rather than reworded on purpose, because
// two independently phrased versions of the same disclosure drift apart.
//
// WHAT THAT DOES AND DOES NOT GUARANTEE, because the difference matters and
// an earlier version of this comment overstated it. It guarantees the card
// repeats the page's own disclosure, so the card can never be the MORE
// confident of the two surfaces. It does not by itself make the pair
// consistent: that depends on what the PAGE says, and it has to be re-checked
// whenever the page's attribution copy moves. As of 2026-09-01 the two do
// agree, checked in the rendered page and not only in source: on an unclaimed
// page the facts strip captions the Myku-typed numbers (hourly rate,
// diagnostic fee, years) "From public listings. Myku has not confirmed them."
// rather than as his own - see `factsNote` in components/Storefront.tsx. So
// the card and the page now say the same thing one tap apart. If they ever
// disagree again, fix the page. Do NOT resolve it by weakening the card.
//
// It is a disclosure, not a redaction. The card still leads with his name,
// his trade and his town, and it should still look good - an unclaimed page
// exists so a mechanic can be shown what Myku made for him. Nothing is
// hidden; it is only correctly attributed.

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
  // The review rows are fetched alongside the photo, not read off the
  // page row. page.review_count is a trigger-maintained counter that
  // survives deleted rows and seeded profiles, so the card could print
  // "4.8 out of 5 (94)" for a mechanic whose page shows no review at all.
  // The page body (components/Storefront.tsx) now counts the rows it fetched
  // through the same getReviews call, keeping every rated row, so the card
  // counts the same rows the same way and the two cannot disagree. A failed
  // fetch comes back as [] and the rating line simply stays off the card.
  const [photo, reviewRows] = await Promise.all([
    page.photo_url && page.show_photo !== false ? safePhoto(page.photo_url) : null,
    getReviews(page.id).then((r) => r ?? []),
  ]);

  const ratingNum =
    typeof page.rating === 'string' ? parseFloat(page.rating) : page.rating ?? 0;
  const reviewCount = reviewRows.filter((r) => r.rating > 0).length;
  const hasRating = reviewCount > 0 && ratingNum > 0;
  const city = page.service_city?.split(',')[0]?.trim();
  const years = page.years_experience ?? 0;

  // Same rule the page body uses, so the card cannot contradict the page.
  const bizName = page.business_name?.trim() || null;
  const bizLeads = Boolean(bizName);
  const headline = bizName ?? page.full_name;
  // Same literal fallback the page body uses, so the card can never print an
  // empty trade line and never disagrees with the page about what it says.
  const specLine = page.specialization || 'Independent mechanic';
  const headlineSize =
    headline.length > 40 ? 38 : headline.length > 28 ? 48 : headline.length > 18 ? 62 : 76;

  // The town, the years and the rating. These are on the page for claimed and
  // unclaimed pages alike, so they travel with the card either way - but WHO
  // said them differs, and the card must not be silent about that. On a
  // published page the mechanic typed them. On an unclaimed page Myku typed
  // them off a public listing, and the block below the meta line says exactly
  // that rather than letting them read as his.
  const meta = [
    city || null,
    years > 0 ? `${years} yrs working` : null,
    hasRating ? `${ratingNum.toFixed(1)} out of 5 (${reviewCount})` : null,
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
            {/* THE STATE, ABOVE THE NAME. The page body puts "Unconfirmed" in
                its eyebrow so the signal survives the claim strip scrolling
                away; the card puts it in the same place for the same reason,
                and because this is the one line of qualifying text that was
                still readable when the rendered card was downsampled to a
                chat-bubble 300px. So it is set as display type, not fine
                print: uppercase and letter-spaced like the page's own
                eyebrow, at the full extra-bold weight, in ink rather than a
                badge or a pill. The file's rules at the top forbid a badge
                anyway, and a badge would read as a Myku stamp on the one
                kind of page Myku is explicitly vouching for nothing on.
                The middot is carried by both font files; checked in their
                cmap tables, not assumed. */}
            {unclaimed ? (
              <div
                style={{
                  display: 'flex',
                  color: INK_2,
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: 3,
                  marginBottom: 14,
                }}
              >
                PREVIEW · NOT CLAIMED
              </div>
            ) : null}
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
                old 62px would have run straight off the card.

                The tracking scales with the step. It used to be a fixed -3px,
                which is a tight display setting at 76px and, at 38px, eight
                percent of the em: a long business name on the smallest step
                rendered with its word gaps closed, one run-on word across
                the card. -0.04em keeps the 76px step exactly where it was
                (-3px) and eases the 38px step to -1.5px. Satori takes
                letterSpacing as pixels only, so the em value is applied by
                hand. */}
            <div
              style={{
                display: 'flex',
                color: INK,
                fontSize: headlineSize,
                fontWeight: 800,
                letterSpacing: Math.round(headlineSize * -0.04 * 10) / 10,
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
            {/* THE ONE FIELD ON THIS CARD THAT CAN GROW WITHOUT LIMIT.
                `specialization` is plain `text` in the database with no
                length CHECK and no cap in the app, and this column has a
                fixed height. A size ramp alone only moves the breaking point
                and never removes it, which is what was here before and what
                was measured on 2026-09-01 by rendering this exact layout with
                the real font files at a range of lengths:

                  * 160 characters: the last line of the block below sat ON
                    the footer rule, the rule running through its descenders.
                  * 219 characters: the rule struck clean THROUGH the middle
                    of that line.

                Which line that is decides how bad it is, and it is the worst
                one either way. On an unclaimed card it is "Nothing on this
                page has been confirmed by {first}." On a published card with
                three documents on file it is "Myku checked these documents.
                That is not a recommendation." - rendered and confirmed struck
                through at 300 characters. So an unbounded field the mechanic
                types was able to deface, on the first thing anyone sees, the
                one sentence that stops a document check reading as a Myku
                endorsement. That is the trust line, not a layout nit.

                So the block is BOUNDED rather than merely shrunk. `lineClamp`
                is a hard three-line budget satori honours (verified: at 300
                and at 400 characters the rendered PNGs are byte-identical, so
                nothing below can move again however long the field gets), and
                the ellipsis says plainly that there is more. The extra 20px
                step is not a fix on its own; it exists so more of his own
                words survive inside those three lines before the clamp bites.

                Truncating here reverses an earlier decision in this file, on
                purpose. The words are still all on the page one tap away; the
                disclosure has nowhere else to go. When the two compete for
                the last line of a share card, the disclosure wins.

                Neither live card moves: rendered old and new for marcus-reed
                (40 characters) and fort-nite (35), both byte-identical. */}
            <div
              style={{
                display: 'block',
                lineClamp: 3,
                textOverflow: 'ellipsis',
                color: INK_2,
                fontSize:
                  specLine.length > 150 ? 20 : specLine.length > 100 ? 24 : specLine.length > 48 ? 28 : 32,
                fontWeight: 500,
                marginTop: 16,
              }}
            >
              {specLine}
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
            ) : unclaimed ? (
              // WHERE THE NUMBERS CAME FROM, in the slot the paperwork line
              // vacated. Same two-line shape as the block above - a statement
              // with its qualification in the same breath - so the card never
              // has an empty space where its state should be. The two branches
              // are mutually exclusive by construction: `credentials` is forced
              // to [] whenever `unclaimed` is true.
              //
              // Both sentences are the page body's own words (its How Myku
              // Works block reads "{first} has not claimed this page. The
              // details here came from public listings, and nothing on the page
              // has been confirmed by {first}."), split across the two lines.
              // Copied rather than reworded on purpose: the card and the page
              // are one tap apart, and the moment they are phrased
              // independently they start to drift.
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 20,
                }}
              >
                <div style={{ display: 'flex', color: INK_2, fontSize: 26, fontWeight: 500 }}>
                  The details here came from public listings.
                </div>
                <div
                  style={{
                    display: 'flex',
                    color: INK_3,
                    fontSize: 22,
                    fontWeight: 500,
                    marginTop: 8,
                  }}
                >
                  Nothing on this page has been confirmed by {firstName(page.full_name)}.
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
