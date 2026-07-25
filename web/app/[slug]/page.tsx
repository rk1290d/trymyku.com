import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import QuoteForm from '@/components/QuoteForm';
import {
  getMechanicPage,
  getServices,
  getSharedJobs,
  getVerifiedJobs,
  getReviews,
} from '@/lib/supabase';
import {
  timeAgo,
  money,
  firstName,
  initials,
  ratingStars,
  workTypeLabel,
} from '@/lib/format';
import { SUPPORT_EMAIL } from '@/lib/site';

export const revalidate = 60;

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
  const title = `${page.full_name} | ${city ? `Mechanic in ${city}` : 'Independent Mechanic'}`;
  const description = `${spec}${city ? ` serving ${city} and nearby` : ''}. Real jobs, real prices, real reviews on Myku. Request a quote in one tap.`;

  return {
    title,
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

const PinIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

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

  const [services, shared, verified, reviews] = await Promise.all([
    getServices(page.id),
    getSharedJobs(page.id),
    getVerifiedJobs(page.id),
    getReviews(page.id),
  ]);

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
  const hasRating = (page.review_count ?? 0) > 0 && ratingNum > 0;
  const facts: string[] = [];
  if (page.id_verified) facts.push('ID verified');
  if (page.has_insurance) facts.push('Insurance on file');
  if (page.has_certifications) facts.push('Certifications on file');
  const work = workTypeLabel(page.work_type);
  const city = page.service_city?.trim() || null;
  const unclaimed = page.web_status === 'unclaimed';

  return (
    <>
      <Header cta={{ href: '#quote', label: 'Request a Quote' }} />
      <main>
        <div className="pp">
          {unclaimed ? (
            <div className="pp-claim">
              <div>
                <b>This page hasn&apos;t been claimed yet.</b> The details come from
                public listings and haven&apos;t been confirmed by {first}. Are you{' '}
                {first}?{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Claiming my Myku page (${page.slug})`}
                >
                  Claim this page
                </a>
              </div>
            </div>
          ) : null}

          <div className="pp-head">
            {page.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="pp-avatar"
                src={page.photo_url}
                alt={`${page.full_name} profile photo`}
              />
            ) : (
              <div className="pp-avatar ph" aria-hidden="true">
                {initials(page.full_name)}
              </div>
            )}
            <div className="pp-id">
              <h1 className="pp-name">{page.full_name}</h1>
              {page.specialization ? (
                <div className="pp-spec">{page.specialization}</div>
              ) : null}
              {city ? (
                <span className="pp-city">
                  <PinIcon />
                  {city}
                </span>
              ) : null}
            </div>
          </div>

          {(hasRating || (page.years_experience ?? 0) > 0 || (page.jobs_done ?? 0) > 0) && (
            <div className="pp-stats">
              {hasRating ? (
                <span className="pp-stat">
                  <b className="tnum">
                    {ratingNum.toFixed(1)} <span className="st">{ratingStars(ratingNum)}</span>
                  </b>
                  <span>
                    {page.review_count} review{(page.review_count ?? 0) === 1 ? '' : 's'}
                  </span>
                </span>
              ) : null}
              {(page.years_experience ?? 0) > 0 ? (
                <span className="pp-stat">
                  <b className="tnum">{page.years_experience}</b>
                  <span>years experience</span>
                </span>
              ) : null}
              {(page.jobs_done ?? 0) > 0 ? (
                <span className="pp-stat">
                  <b className="tnum">{page.jobs_done}</b>
                  <span>jobs on Myku</span>
                </span>
              ) : null}
            </div>
          )}

          {facts.length > 0 ? (
            <div className="pp-facts">
              {facts.map((f) => (
                <span className="pp-fact" key={f}>
                  <CheckIcon />
                  {f}
                </span>
              ))}
            </div>
          ) : null}

          <div className="pp-ctas">
            <a href="#quote" className="btn btn-primary">
              Request a Quote
            </a>
          </div>
          <p className="pp-note">
            Free to ask. {first} replies with a real price, and you decide.
          </p>

          {(page.bio || work || (page.hourly_rate ?? 0) > 0 || (page.diagnostic_fee ?? 0) > 0 || (page.certifications?.length ?? 0) > 0) && (
            <section className="pp-sec">
              <div className="pp-sec-t">
                <h2>About</h2>
              </div>
              {page.bio ? <p className="pp-bio">{page.bio}</p> : null}
              <div className="pp-meta-rows">
                {city ? (
                  <div className="pp-meta-row">
                    <span className="k2">Service area</span>
                    <span className="v">{city}</span>
                  </div>
                ) : null}
                {work ? (
                  <div className="pp-meta-row">
                    <span className="k2">How they work</span>
                    <span className="v">{work}</span>
                  </div>
                ) : null}
                {(page.hourly_rate ?? 0) > 0 ? (
                  <div className="pp-meta-row">
                    <span className="k2">Hourly rate</span>
                    <span className="v tnum">${page.hourly_rate}/hr</span>
                  </div>
                ) : null}
                {(page.diagnostic_fee ?? 0) > 0 ? (
                  <div className="pp-meta-row">
                    <span className="k2">Diagnostic fee</span>
                    <span className="v tnum">${page.diagnostic_fee}</span>
                  </div>
                ) : null}
                {(page.certifications?.length ?? 0) > 0 ? (
                  <div className="pp-meta-row">
                    <span className="k2">Certifications</span>
                    <span className="v">{page.certifications!.join(', ')}</span>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {services.length > 0 ? (
            <section className="pp-sec">
              <div className="pp-sec-t">
                <h2>Services</h2>
              </div>
              <div className="pp-services">
                {services.map((s) => (
                  <span className="pp-service" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="pp-sec">
            <div className="pp-sec-t">
              <h2>Job history</h2>
              {wall.length > 0 ? <span className="n">{wall.length} documented</span> : null}
            </div>
            {wall.length > 0 ? (
              <div className="pp-jobs">
                {wall.map((j) => (
                  <div className={`pp-job${j.verified ? ' vf' : ''}`} key={j.key}>
                    <div className="pp-job-r1">
                      <span className="pp-job-veh">{j.vehicle}</span>
                      {j.price ? (
                        <span className="pp-job-price tnum">{j.price}</span>
                      ) : null}
                    </div>
                    {j.service ? <div className="pp-job-svc">{j.service}</div> : null}
                    <div className="pp-job-r2">
                      <span className="pp-job-meta tnum">
                        {[j.when, j.town].filter(Boolean).join(' · ')}
                      </span>
                      {j.verified ? (
                        <span className="pp-job-badge vf">
                          <CheckIcon />
                          Myku verified
                        </span>
                      ) : (
                        <span className="pp-job-badge sr">Shared by {first}</span>
                      )}
                    </div>
                    {j.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className="pp-job-photo"
                        src={j.photo}
                        alt={`${j.vehicle}: ${j.service ?? 'job photo'}`}
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="pp-empty">
                {first} hasn&apos;t added job history yet. You can still request a
                quote below.
              </div>
            )}
          </section>

          {reviews.length > 0 ? (
            <section className="pp-sec">
              <div className="pp-sec-t">
                <h2>Reviews</h2>
                <span className="n">{reviews.length} shown</span>
              </div>
              <div className="pp-reviews">
                {reviews.map((r) => (
                  <div className="pp-review" key={r.id}>
                    <span className="st">{ratingStars(r.rating)}</span>
                    {r.text ? <p>{r.text}</p> : null}
                    <div className="dt">{timeAgo(r.created_at)}</div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="pp-quote-sec" id="quote">
            <div className="pp-form-card">
              <h2>Request a quote from {first}</h2>
              <p className="s">
                Describe the job and leave your number. {first} gets the request and
                replies with a real price. Your number is shared with {first} only.
              </p>
              <QuoteForm
                mechanicId={page.id}
                slug={page.slug}
                mechanicFirstName={first}
              />
            </div>
          </section>

          <div className="pp-trust">
            <b>
              We confirm facts. We do not endorse.{' '}
              <span className="a">You decide.</span>
            </b>
            <p>
              Myku is a marketplace. {first} is an independent business: their prices,
              their work, their reputation. Verification means we checked paperwork,
              not that we vouch for the work. Jobs marked &quot;Shared by {first}&quot; are
              self-reported; &quot;Myku verified&quot; jobs were completed through the platform.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
