import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QuoteForm from '@/components/QuoteForm';
import AppStoreBadge from '@/components/AppStoreBadge';
import {
  getMechanicPage,
  getServices,
  getSharedJobs,
  getVerifiedJobs,
  getReviews,
} from '@/lib/supabase';
import { timeAgo, money, firstName, initials, workTypeLabel } from '@/lib/format';
import { SUPPORT_EMAIL } from '@/lib/site';
import './profile.css';

export const revalidate = 60;

// The mechanic's own storefront, on paper. Myku is the quiet trust layer
// underneath it, never the brand on top of it.
export const viewport: Viewport = {
  // Keep in sync with --paper and the body:has(.mp)/.mp-paper literal in
  // profile.css. This is the Android status-bar tint.
  themeColor: '#FAF7F2',
  colorScheme: 'light',
};

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getMechanicPage(slug);
  if (!page) return { title: 'Page not found' };

  const city = page.service_city?.split(',')[0]?.trim();
  const spec = page.specialization || 'Independent mechanic';
  const first = firstName(page.full_name);
  const title = `${page.full_name} | ${city ? `Mechanic in ${city}` : 'Independent mechanic'}`;
  // States what the page is and what to do on it. Myku does not vouch,
  // including inside a search snippet or a Messenger preview.
  const description = `${spec}${city ? ` in ${city}` : ''}. Describe what you need and get a price from ${first}.`;

  return {
    // `absolute` opts this route out of the root layout's "%s | Myku Auto"
    // template. The tab, the search headline and the preview title all lead
    // with the mechanic; Myku is a 13px whisper on this page, not a suffix.
    title: { absolute: title },
    description,
    alternates: { canonical: `/${page.slug}` },
    robots:
      page.web_status === 'published'
        ? undefined
        : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `/${page.slug}`,
      type: 'profile',
    },
  };
}

// The only two SVGs on the page. Neutral on the credential line,
// var(--verified) on the job-provenance mark and its legend.
function Check({ v = false }: { v?: boolean }) {
  return (
    <svg className={v ? 'mp-ck v' : 'mp-ck'} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

interface WallJob {
  key: string;
  vehicle: string;
  service: string | null;
  price: string | null;
  when: string | null;
  town: string | null;
  verified: boolean;
  photo: string | null;
  ts: number;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const page = await getMechanicPage(slug);
  if (!page) notFound();

  const [rawServices, shared, verified, rawReviews] = await Promise.all([
    getServices(page.id),
    getSharedJobs(page.id),
    getVerifiedJobs(page.id),
    getReviews(page.id),
  ]);

  // Non-empty content only. A blank service string renders an empty ruled
  // row, and a rating with no words renders a hollow review row: an eyebrow,
  // 24px of padding and an attribution with no voice in it. Both are the
  // "empty box with a heading" the sparse brief forbids, reached through a
  // data shape rather than a missing section.
  const services = Array.from(
    new Set(rawServices.map((s) => (s ?? '').trim()).filter(Boolean))
  );
  const reviews = rawReviews.filter((r) => Boolean(r.text?.trim()));

  // Strictly chronological across both kinds. Platform jobs are never
  // floated to the top: ranking them would read as Myku promoting them.
  const wall: WallJob[] = [
    ...verified.map((j) => ({
      key: `v-${j.id}`,
      vehicle: j.vehicle || 'Vehicle',
      service: j.service,
      price: money(j.price),
      when: timeAgo(j.completed_at),
      town: j.town,
      verified: true,
      photo: null,
      ts: new Date(j.completed_at).getTime() || 0,
    })),
    ...shared.map((j) => ({
      key: `s-${j.id}`,
      vehicle: j.vehicle,
      service: j.service,
      price: j.price_label,
      when: timeAgo(j.done_on),
      town: j.town,
      verified: false,
      photo: j.photo_url,
      ts: j.done_on ? new Date(j.done_on).getTime() || 0 : 0,
    })),
  ].sort((a, b) => b.ts - a.ts);

  const first = firstName(page.full_name);
  const ratingNum =
    typeof page.rating === 'string' ? parseFloat(page.rating) : page.rating ?? 0;
  const reviewCount = page.review_count ?? 0;
  const hasRating = reviewCount > 0 && ratingNum > 0;
  const work = workTypeLabel(page.work_type);
  const city = page.service_city?.trim() || null;
  const cityShort = city?.split(',')[0]?.trim() || null;
  const unclaimed = page.web_status !== 'published';
  // Suppresses the repeat ask, so a short page carries exactly one orange
  // rectangle. Spec definition, unchanged.
  const isSparse = wall.length === 0 && reviews.length === 0;

  // Paperwork checks are suppressed entirely on unclaimed pages. Attaching
  // document claims to someone who has not agreed to the page is the worst
  // trust failure available here.
  const credentials: string[] = [];
  if (!unclaimed) {
    if (page.id_verified) credentials.push('ID verified');
    if (page.has_insurance) credentials.push('Insurance on file');
    if (page.has_certifications) credentials.push('Certifications on file');
  }

  // Eyebrow. Answers "is this a person near me" in under a second, and
  // carries the unconfirmed state so it survives the banner scrolling away.
  const eyebrow = [
    cityShort ? `MECHANIC · ${cityShort.toUpperCase()}` : 'INDEPENDENT MECHANIC',
    unclaimed ? 'UNCONFIRMED' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Facts line. Fragment 1 has a literal fallback, so this line can never
  // be empty. There is no "unavailable" state anywhere on this page.
  const factFragments: React.ReactNode[] = [
    page.specialization || 'Independent mechanic',
  ];
  if (work) factFragments.push(work);
  if (page.available === true)
    factFragments.push(
      <span className="mp-avail" key="avail">
        <span className="dot" aria-hidden="true" />
        Taking new work
      </span>
    );

  // Fact strip, fixed priority order, maximum 4 cells. Money first: it is
  // the question every stranger arrives with.
  const cells: { value: string; caption: string }[] = [];
  if ((page.hourly_rate ?? 0) > 0)
    cells.push({ value: `$${page.hourly_rate}/hr`, caption: 'Labor rate' });
  if ((page.diagnostic_fee ?? 0) > 0)
    cells.push({ value: `$${page.diagnostic_fee}`, caption: 'Diagnostic' });
  if (hasRating)
    cells.push({
      value: ratingNum.toFixed(1),
      caption: `${reviewCount} review${reviewCount === 1 ? '' : 's'}`,
    });
  if (wall.length > 0)
    cells.push({ value: String(wall.length), caption: 'Jobs listed' });
  const strip = cells.slice(0, 4);

  // Gated on the paragraphs that actually render, not on the raw column. A
  // whitespace-only bio is truthy and renders nothing, which would leave
  // ABOUT as an eyebrow over an ink rule with no content beneath it.
  const bioParas = (page.bio ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const years = page.years_experience ?? 0;

  const hasAbout =
    bioParas.length > 0 ||
    Boolean(city) ||
    Boolean(work) ||
    years > 0 ||
    (page.certifications?.length ?? 0) > 0;

  // The desktop 640/360 grid only makes sense when the left column has
  // something in it. isSparse alone would collapse a page that has a full
  // bio, a service area and a services list, costing it the sticky composer.
  const thinColumn =
    wall.length === 0 &&
    reviews.length === 0 &&
    services.length === 0 &&
    !hasAbout;

  // The disclosure never defines a mark that does not appear on this page.
  const howParas: string[] = [
    `${first} is an independent business. ${first} sets the prices, does the work, and owns the reputation.`,
    // On an unclaimed page Myku has confirmed nothing, so it must not claim
    // it has. Saying so here and denying it three screens down would be an
    // overclaim by Myku about its own diligence.
    unclaimed
      ? 'Myku shows you what it has. Myku does not endorse or guarantee anyone’s work. You decide.'
      : 'Myku confirms facts and shows them to you. Myku does not endorse or guarantee anyone’s work. You decide.',
  ];
  if (wall.length > 0)
    howParas.push(
      `Jobs marked Completed through Myku were done through the Myku platform. Jobs marked Shared by ${first} were listed by ${first}.`
    );
  if (credentials.length > 0)
    howParas.push(
      'ID verified, insurance on file and certifications on file mean Myku reviewed documents. They do not mean Myku recommends the work.'
    );
  if (unclaimed)
    howParas.push(
      // Carries the sentence the banner used to spend three lines on, so the
      // banner can shrink to one line without losing the disclosure.
      `${first} has not claimed this page. The details here came from public listings, and nothing on the page has been confirmed by ${first}.`
    );

  const jobRow = (j: WallJob) => (
    <div className="mp-job" key={j.key}>
      <div className="mp-job-b">
        <div className="mp-job-r1">
          <span className="mp-job-veh">{j.vehicle}</span>
          {j.price ? <span className="mp-job-price tnum">{j.price}</span> : null}
        </div>
        {j.service ? <div className="mp-job-svc">{j.service}</div> : null}
        {j.when || j.town ? (
          <div className="mp-job-meta tnum">
            {[j.when, j.town].filter(Boolean).join(' · ')}
          </div>
        ) : null}
        {j.verified ? (
          <div className="mp-prov v">
            <Check v />
            Completed through Myku
          </div>
        ) : (
          <div className="mp-prov">Shared by {first}</div>
        )}
      </div>
      {j.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="mp-job-thumb"
          src={j.photo}
          alt={`${j.vehicle}: ${j.service ?? 'job photo'}`}
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
        />
      ) : null}
    </div>
  );

  const reviewRow = (r: (typeof reviews)[number]) => {
    const ago = timeAgo(r.created_at);
    return (
      <div className="mp-rev" key={r.id}>
        {r.text ? <p>{r.text}</p> : null}
        <div className="att tnum">
          {`${r.rating} out of 5${ago ? ` · ${ago}` : ''}`}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mp-paper" aria-hidden="true" />
      <main className={thinColumn ? 'mp mp--sparse' : 'mp'}>
        {/* Nothing above the composer navigates off-page. */}
        <div className="mp-topbar">
          <div className="mp-wrap">
            <span>myku</span>
          </div>
        </div>

        <div className="mp-wrap">
          {/* One line. The full explanation lives in HOW MYKU WORKS and the
              eyebrow carries UNCONFIRMED, so three lines of preamble above the
              mechanic's own name buys nothing and costs the composer the
              first screen. */}
          {unclaimed ? (
            <div className="mp-claim">
              Not claimed yet. Are you {first}?{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Claiming my Myku page (${page.slug})`}
              >
                Claim this page
              </a>
            </div>
          ) : null}

          <div className="mp-id">
            <div className="mp-eyebrow">{eyebrow}</div>
            <div className="mp-idrow">
              {page.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="mp-portrait"
                  src={page.photo_url}
                  alt={`${page.full_name}, mechanic`}
                  width={72}
                  height={72}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="mp-portrait ph" aria-hidden="true">
                  {initials(page.full_name)}
                </div>
              )}
              <div className="mp-idcol">
                <h1 className="mp-name">{page.full_name}</h1>
              </div>
            </div>

            <div className="mp-factline">
              {factFragments.map((f, i) => (
                // The separator is NOT aria-hidden: without it a screen
                // reader runs the fragments together as one string.
                <span key={i}>
                  {i > 0 ? <span className="sep">·</span> : null}
                  {f}
                </span>
              ))}
            </div>

            {credentials.length > 0 ? (
              <>
                <div className="mp-cred">
                  <Check />
                  {credentials.join(' · ')}
                </div>
                <div className="mp-qual">
                  Myku checked these documents. That is not a recommendation.
                </div>
              </>
            ) : null}
          </div>
        </div>

        {/* The money question is never silent: this band always renders. */}
        <div className="mp-band">
          <div className="mp-band-in">
            <div className={`mp-strip n${strip.length || 1}`}>
              {strip.length > 0 ? (
                strip.map((c) => (
                  <div className="mp-cell" key={c.caption}>
                    <b className="tnum">{c.value}</b>
                    <span>{c.caption}</span>
                  </div>
                ))
              ) : (
                <div className="mp-cell fb">
                  {first} prices each job individually. Describe the work and you
                  will get a number back.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mp-wrap">
          <div className="mp-body">
            <section className="mp-ask" id="ask">
              <span className="mp-anchor" id="quote" aria-hidden="true" />
              {/* The heading and sub-line live INSIDE QuoteForm so the sent
                  state swaps the whole ask at once. Left here they would sit
                  above "Request sent." telling the visitor to fill in a form
                  that no longer exists. */}
              <QuoteForm
                mechanicId={page.id}
                slug={page.slug}
                mechanicFirstName={first}
                unclaimed={unclaimed}
                services={services}
              />
            </section>

            <div className="mp-col">
              {wall.length > 0 ? (
                <section className="mp-sec">
                  <div className="mp-sec-h">
                    <h2 className="mp-eyebrow">Work</h2>
                    <span className="mp-sec-n tnum">{wall.length} listed</span>
                  </div>
                  <div className="mp-list">
                    {/* Each mark name is set the way the mark itself is set,
                        and the check glyph marks only the claim it belongs
                        to rather than the whole sentence. */}
                    <div className="mp-legend">
                      <span className="m v">
                        <Check v />
                        Completed through Myku
                      </span>{' '}
                      means the job was done through the Myku platform.{' '}
                      <span className="m">Shared by {first}</span> means {first}{' '}
                      listed it.
                    </div>
                    {wall.slice(0, 10).map(jobRow)}
                    {wall.length > 10 ? (
                      <details className="mp-more">
                        <summary>Show all {wall.length} jobs</summary>
                        {wall.slice(10).map(jobRow)}
                      </details>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {hasAbout ? (
                <section className="mp-sec">
                  <div className="mp-sec-h">
                    <h2 className="mp-eyebrow">About</h2>
                  </div>
                  <div className="mp-list">
                    {bioParas.length > 0 ? (
                      <div className="mp-bio">
                        {bioParas.map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    ) : null}
                    {city ? (
                      <div className="mp-row">
                        <span className="k">Service area</span>
                        <span className="v">{city}</span>
                      </div>
                    ) : null}
                    {work ? (
                      <div className="mp-row">
                        <span className="k">How {first} works</span>
                        <span className="v">{work}</span>
                      </div>
                    ) : null}
                    {/* Hourly rate and diagnostic fee live in the fact strip,
                        which always wins them on priority. Never print a
                        price twice. */}
                    {years > 0 ? (
                      <div className="mp-row">
                        <span className="k">Years working</span>
                        <span className="v tnum">
                          {years} {years === 1 ? 'year' : 'years'}
                        </span>
                      </div>
                    ) : null}
                    {(page.certifications?.length ?? 0) > 0 ? (
                      <div className="mp-row">
                        <span className="k">Certifications</span>
                        <span className="v">
                          {page.certifications!.join(', ')}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {services.length > 0 ? (
                <section className="mp-sec">
                  <div className="mp-sec-h">
                    <h2 className="mp-eyebrow">Services</h2>
                  </div>
                  <div className="mp-list">
                    <div className="mp-svcs">
                      {services.map((s, i) => (
                        <div key={`${s}-${i}`}>{s}</div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {reviews.length > 0 ? (
                <section className="mp-sec">
                  <div className="mp-sec-h">
                    <h2 className="mp-eyebrow">Reviews</h2>
                    {hasRating ? (
                      <span className="mp-sec-meta tnum">
                        {ratingNum.toFixed(1)} out of 5 · {reviewCount} review
                        {reviewCount === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                  <div className="mp-list">
                    {reviews.slice(0, 5).map(reviewRow)}
                    {reviews.length > 5 ? (
                      // A delta, not a total: the query is capped at 20 while
                      // the header prints the true review_count, so "Show all
                      // 20" under "43 reviews" would read as a data error.
                      <details className="mp-more">
                        <summary>Show {reviews.length - 5} more reviews</summary>
                        {reviews.slice(5).map(reviewRow)}
                      </details>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <section className="mp-how">
                <h2 className="mp-eyebrow">How Myku works</h2>
                {howParas.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </section>

              {/* One orange rectangle exists on a sparse page. On a rich page
                  the two are separated by the whole evidence body, so they can
                  never be co-visible on a phone. */}
              {!isSparse ? (
                <section className="mp-repeat">
                  <h2>Ready to ask {first}?</h2>
                  <a className="mp-send" href="#ask">
                    Send a request
                  </a>
                </section>
              ) : null}
            </div>
          </div>

          <footer className="mp-footer">
            <div className="who">
              {page.full_name}
              {cityShort ? ` · ${cityShort}` : ''}
            </div>
            <div className="note">
              This page is hosted by <Link href="/">Myku</Link>.{' '}
              {unclaimed
                ? 'Myku does not endorse or guarantee anyone’s work.'
                : 'Myku confirms facts and does not endorse or guarantee anyone’s work.'}
            </div>
            <div className="badgewrap">
              <AppStoreBadge />
            </div>
            <div className="links">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/support">Support</Link>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
