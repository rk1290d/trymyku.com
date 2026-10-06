import Image from 'next/image';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './icons';
import { Plate, plateKind } from './Plates';
import { clipText, gridCols, moneyOrNull, type BodyInput, type ReviewItem, type Ticket } from '@/lib/vd/body';

// THE VAN DOOR BODY (2026-10-04, stage 2): his work, the Myku record, his services
// as doors into the request, reviews by source, Meet him, and the footer. Every
// section renders only when it has something real to show (nothing ever prints a
// zero, "new" or "pending"), and every claim says where it came from:
// - his work says "Shared by {first}"; a page he has not claimed says "From
//   public listings" and credits nothing to him; samples say "Sample".
// - the Myku record is its own teal object: jobs completed through Myku.
// - Myku reviews and Google reviews are never merged or re-ordered, and the low
//   ones are in the first set because the order is fixed (newest first; Google's
//   own order), not chosen.
// - Myku names itself in short source tags only, plus the one footer line.

function isSupabaseImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'fioiaoxaozqfwdqukoho.supabase.co';
  } catch {
    return false;
  }
}

function Disclosure({ closed, opened, children, className = 'more' }: { closed: string; opened: string; children: ReactNode; className?: string }) {
  return (
    <details className={`${className} disc`}>
      <summary>
        <span className="when-closed">{closed}</span>
        <span className="when-open">{opened}</span>
        <Icon name="caret-down" />
      </summary>
      {children}
    </details>
  );
}

function SrcLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <p className="src-line">
      <Icon name={icon} />
      <span>{children}</span>
    </p>
  );
}

function Stars({ r }: { r: number }) {
  const v = Math.max(0, Math.min(5, r));
  const full = Math.floor(v + 1e-9);
  const w = full * 1.14 + (v - full);
  const row = [0, 1, 2, 3, 4].map((i) => <Icon key={i} name="star-fill" />);
  return (
    <span className="stars" role="img" aria-label={`${v.toFixed(1).replace(/\.0$/, '')} out of 5 stars`}>
      <span className="st-off">{row}</span>
      <span className="st-on" style={{ width: `${w.toFixed(3)}em` }}>
        {row}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ his work */
function TicketCard({ t, first }: { t: Ticket; first: string }) {
  const stub =
    t.price || t.when ? (
      <>
        <div className="tk-perf" aria-hidden="true" />
        <p className="tk-meta">
          {t.sample ? (
            <span className="sample-tag">Sample</span>
          ) : t.price ? (
            <b className={`tk-price${t.priceIsNum ? '' : ' txt'}`}>{t.price}</b>
          ) : (
            <span />
          )}
          <span className="tk-when">{t.sample ? '' : t.when}</span>
        </p>
      </>
    ) : null;
  const body = (
    <div className={`tk-b${stub ? '' : ' no-stub'}`}>
      <h3 className="tk-veh">{t.vehicle}</h3>
      {t.service ? <p className="tk-job">{t.service}</p> : null}
      {t.town && !t.sample ? <p className="tk-job">{t.town}</p> : null}
      {t.caption && !t.sample ? <p className="tk-cap">{t.caption}</p> : null}
      {stub}
    </div>
  );
  if (t.sample) {
    return (
      <article className="tk tk--sample" role="listitem">
        <span className="tk-ph">
          <Plate kind={plateKind(t.service)} board={boardFor(t.service)} />
          <span className="sample-tag on-plate">Sample</span>
        </span>
        {body}
      </article>
    );
  }
  if (t.photo) {
    const alt = t.vehicle + (t.service ? `, ${t.service}` : '');
    return (
      <a
        className="tk"
        role="listitem"
        href={t.askService ? `?service=${encodeURIComponent(t.askService)}#quote` : '#quote'}
        data-story=""
        data-photo={t.photo}
        data-veh={t.vehicle}
        data-job={t.service ?? ''}
        data-cap={t.caption ?? ''}
        data-when={t.when ?? ''}
        data-ask-service={t.askService ?? ''}
        data-first={first}
        aria-label={`See ${alt}`}
      >
        <span className="tk-ph">
          <Image
            src={t.photo}
            alt={alt}
            fill
            sizes="(max-width: 639px) 78vw, (max-width: 1023px) 44vw, 300px"
            unoptimized={!isSupabaseImage(t.photo)}
          />
        </span>
        {body}
      </a>
    );
  }
  return (
    <article className="tk" role="listitem">
      {body}
    </article>
  );
}

function boardFor(service: string | null): string {
  switch (plateKind(service)) {
    case 'disc':
      return 'Brakes';
    case 'car-battery':
      return 'Battery';
    case 'gauge':
      return 'Diagnosis';
    default:
      return 'Electrical';
  }
}

function workSource(tickets: Ticket[], first: string, claimed: boolean): { icon: IconName; text: string } {
  const items: string[] = [];
  if (tickets.some((t) => t.photo)) items.push('photos');
  if (tickets.some((t) => t.caption)) items.push('notes');
  if (tickets.some((t) => t.price)) items.push('prices');
  const list = items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
  if (claimed) return { icon: items.includes('photos') ? 'camera' : 'user', text: items.length ? `Shared by ${first}: ${list}.` : `Shared by ${first}.` };
  return { icon: 'info', text: items.length ? `From public listings: ${list}. Myku has not confirmed them.` : 'From public listings. Myku has not confirmed them.' };
}

function Work({ b }: { b: BodyInput }) {
  const samples = b.tickets.filter((t) => t.sample);
  const real = b.tickets.filter((t) => !t.sample);
  if (!real.length && !samples.length && !b.ledger) return null;
  const list = real.length ? real : samples;
  const cols = gridCols(list.length);
  const capped = cols === 3 && list.length > 6;
  const src = real.length ? workSource(real, b.first, b.claimed) : null;
  return (
    <section className="sec work" id="work" aria-labelledby="work-h">
      <div className="sec-h">
        <p className="kicker">{real.length || b.ledger ? 'The work' : 'Examples'}</p>
        <h2 id="work-h">{real.length || b.ledger ? `${b.first}’s work` : 'Sample work'}</h2>
        {src ? <SrcLine icon={src.icon}>{src.text}</SrcLine> : null}
        {!real.length && samples.length ? (
          <SrcLine icon="info">{`Examples of how shared jobs look on a Myku page. Not ${b.first}’s real jobs.`}</SrcLine>
        ) : null}
      </div>
      {list.length ? (
        <div className={`tickets n${Math.min(list.length, 3)} cols${cols}${capped ? ' capped' : ''}`} role="list">
          {list.map((t) => (
            <TicketCard key={t.key} t={t} first={b.first} />
          ))}
        </div>
      ) : null}
      {b.ledger ? <Ledger l={b.ledger} /> : null}
    </section>
  );
}

function Ledger({ l }: { l: NonNullable<BodyInput['ledger']> }) {
  const row = (r: (typeof l.rows)[number]) => (
    <li key={r.key} className={r.amount ? undefined : 'no-amt'}>
      <span className="lg-veh">{r.vehicle}</span>
      {r.job ? <span className="lg-job">{r.job}</span> : null}
      {r.amount ? <b className="lg-amt">{r.amount}</b> : null}
      {r.when ? <span className="lg-when">{r.when}</span> : null}
      <span className="lg-mark">
        <Icon name="receipt-bold" />
        Completed through Myku
      </span>
    </li>
  );
  const vis = l.rows.slice(0, 3);
  const rest = l.rows.slice(3);
  return (
    <div className="ledger" id="record">
      <div className="lg-h">
        <Icon name="receipt" />
        <b>Completed through Myku</b>
        <span className="lg-n">{`${l.total.toLocaleString('en-US')} job${l.total === 1 ? '' : 's'}`}</span>
      </div>
      <ul className="lg-rows">{vis.map(row)}</ul>
      {rest.length ? (
        <Disclosure
          closed={rest.length === 1 ? 'Show 1 more job' : `Show ${rest.length} more jobs`}
          opened="Show fewer jobs"
          className="more lg-more"
        >
          <ul className="lg-rows">{rest.map(row)}</ul>
        </Disclosure>
      ) : null}
      {l.rows.length < l.total ? (
        <p className="lg-foot">{`Showing the latest ${l.rows.length} of ${l.total.toLocaleString('en-US')}.`}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ services */
function Services({ b }: { b: BodyInput }) {
  if (!b.services.length) return null;
  const priced = b.services.some((s) => moneyOrNull(s.priceFrom));
  const row = (s: BodyInput['services'][number]) => {
    const price = moneyOrNull(s.priceFrom);
    return (
      <li key={s.label}>
        <a className="brow" href={`?service=${encodeURIComponent(s.label)}#quote`} data-ask="" data-ask-service={s.label}>
          <span className="brow-n">{s.label}</span>
          {/* With no price anywhere on his list, "Ask for a price" on every row only crowds the names: the board is
              then a clean list of what he does, and each row is still a door into the request. */}
          {priced ? (
            <>
              <span className="brow-dots" aria-hidden="true" />
              <span className="brow-p">
                {price ? (
                  <>
                    <small>from</small>
                    <b>{price}</b>
                  </>
                ) : (
                  <span className="ask">Ask for a price</span>
                )}
              </span>
            </>
          ) : (
            <span className="brow-fill" aria-hidden="true" />
          )}
          <span className="brow-go">
            <Icon name="caret-right" />
          </span>
        </a>
      </li>
    );
  };
  const head = b.services.slice(0, 6);
  const rest = b.services.slice(6);
  return (
    <section className="sec svc" id="services" aria-labelledby="svc-h">
      <div className="sec-h">
        <p className="kicker">{priced ? 'Price list' : 'Services'}</p>
        <h2 id="svc-h">{priced ? 'Services and prices' : `What ${b.first} does`}</h2>
        {!b.claimed ? (
          <SrcLine icon="info">From public listings. Myku has not confirmed them.</SrcLine>
        ) : priced ? (
          <SrcLine icon="tag">{`${b.first}’s own prices. ${b.first} sets the final price for your car.`}</SrcLine>
        ) : (
          <SrcLine icon="tag">{`Tap one to ask ${b.first} for a price.`}</SrcLine>
        )}
      </div>
      <div className="board">
        <ul className="board-rows">{head.map(row)}</ul>
        {rest.length ? (
          <Disclosure closed={`All ${b.services.length} services`} opened="Show fewer" className="more board-more">
            <ul className="board-rows">{rest.map(row)}</ul>
          </Disclosure>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ reviews */
function ReviewLi({ r, cls = '' }: { r: ReviewItem; cls?: string }) {
  let text: ReactNode = null;
  if (r.text) {
    const { head, clipped } = clipText(r.text, 280, 240);
    text = clipped ? (
      <>
        <p className="rv-t rv-head-t">{head}</p>
        <Disclosure closed="Read the whole review" opened="Show less" className="rv-more">
          <p className="rv-t">{r.text}</p>
        </Disclosure>
      </>
    ) : (
      <p className="rv-t">{r.text}</p>
    );
  }
  const by =
    r.author && r.authorUrl ? (
      <>
        <a href={r.authorUrl} rel="nofollow noopener" target="_blank">
          {r.author}
        </a>
        {r.by}
      </>
    ) : (
      <>
        {r.author ?? ''}
        {r.by}
      </>
    );
  return (
    <li className={`rv ${cls}${r.text ? '' : ' rv--bare'}`}>
      <p className="rv-by">
        <Stars r={r.rating} />
        <span>{by}</span>
      </p>
      {text}
    </li>
  );
}

function ReviewList({ items, cls }: { items: ReviewItem[]; cls?: string }) {
  if (!items.length) return null;
  if (items.length <= 4)
    return (
      <ul className="rv-list">
        {items.map((r) => (
          <ReviewLi key={r.key} r={r} cls={cls} />
        ))}
      </ul>
    );
  return (
    <>
      <ul className="rv-list">
        {items.slice(0, 3).map((r) => (
          <ReviewLi key={r.key} r={r} cls={cls} />
        ))}
      </ul>
      <Disclosure closed="More reviews" opened="Fewer reviews">
        <ul className="rv-list">
          {items.slice(3).map((r) => (
            <ReviewLi key={r.key} r={r} cls={cls} />
          ))}
        </ul>
      </Disclosure>
    </>
  );
}

function RvHead({ rating, src, sub }: { rating: number; src: string; sub: string | null }) {
  return (
    <div className={`rv-head${sub ? ' has-sub' : ''}`}>
      <b className="rv-num">{rating.toFixed(1)}</b>
      <Stars r={rating} />
      <span className="rv-src">{src}</span>
      {sub ? <span className="rv-sub">{sub}</span> : null}
    </div>
  );
}

function Reviews({ b }: { b: BodyInput }) {
  const blocks: ReactNode[] = [];
  if (b.myku) {
    const n = b.myku.reviews.length;
    const sub = [n > 1 ? 'Newest first.' : null, n > 0 && n < b.myku.count ? `Showing the latest ${n} of ${b.myku.count}.` : null]
      .filter(Boolean)
      .join(' ');
    blocks.push(
      <div className="rv-block rv-block--myku" id="reviews-myku" key="myku">
        <RvHead rating={b.myku.rating} src={`${b.myku.count} review${b.myku.count === 1 ? '' : 's'} on Myku`} sub={sub || null} />
        <div className="rv-body">
          <ReviewList items={b.myku.reviews} />
        </div>
      </div>
    );
  }
  if (b.google) {
    blocks.push(
      <div className="rv-block rv-block--google" id="reviews-google" key="google">
        <RvHead
          rating={b.google.rating}
          src={`${b.google.count} review${b.google.count === 1 ? '' : 's'} on Google`}
          sub={b.google.reviews.length ? 'As Google shows them.' : null}
        />
        <div className="rv-body">
          <ReviewList items={b.google.reviews} />
          {b.google.url ? (
            <a className="ext" href={b.google.url} rel="nofollow noopener" target="_blank">
              {b.google.count === 1 ? 'See it on Google' : `See all ${b.google.count} on Google`}
              <Icon name="arrow-up-right" />
            </a>
          ) : null}
        </div>
      </div>
    );
  }
  if (b.publicRating && !b.claimed) {
    const pr = b.publicRating;
    blocks.push(
      <div className="rv-block rv-block--public" id="reviews-public" key="public">
        <RvHead rating={pr.rating} src={`${pr.count} review${pr.count === 1 ? '' : 's'} on ${pr.source}`} sub={null} />
        <div className="rv-body">
          <p className="rv-note">
            <Icon name="info" />
            <span>From public listings. Myku has not confirmed them.</span>
          </p>
          <a className="ext" href={pr.url} rel="nofollow noopener" target="_blank">
            {`See them on ${pr.source}`}
            <Icon name="arrow-up-right" />
          </a>
        </div>
      </div>
    );
  }
  if (!blocks.length) return null;
  return (
    <section className="sec rv-sec" id="reviews" aria-labelledby="rv-h">
      <div className="sec-h">
        <p className="kicker">Reviews</p>
        <h2 id="rv-h">{b.myku || b.google ? 'What customers said' : 'Reviews'}</h2>
      </div>
      <div className="reviews-cols">{blocks}</div>
    </section>
  );
}

function SampleReviews({ b }: { b: BodyInput }) {
  if (!b.sampleReviews.length || b.claimed) return null;
  return (
    <section className="sec rv-samples" aria-labelledby="rvs-h">
      <div className="sec-h">
        <h3 className="h3" id="rvs-h">
          Sample reviews
        </h3>
        <SrcLine icon="info">Examples of what a review looks like here. Not real reviews.</SrcLine>
      </div>
      <ul className="rv-list">
        {b.sampleReviews.map((r) => (
          <ReviewLi key={r.key} r={{ ...r, by: '' }} cls="rv--sample" />
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ meet him */
function Meet({ b }: { b: BodyInput }) {
  const m = b.meet;
  const personal = Boolean(m.bio.length || m.years || m.certs.length || (b.claimed && m.insurance) || m.face || m.socials.length);
  if (!personal && !m.area && !m.hours) return null;
  const tiles: { key: string; icon: IconName; k: string; v: ReactNode; wide: boolean }[] = [];
  if (m.years && m.years > 0)
    tiles.push({ key: 'exp', icon: 'wrench', k: 'Experience', v: `${Math.round(m.years)} year${Math.round(m.years) === 1 ? '' : 's'}`, wide: false });
  const where = [m.area, m.hours].filter(Boolean).join('. ');
  if (where)
    tiles.push({
      key: 'area',
      icon: m.workType === 'Shop' ? 'storefront' : m.workType ? 'van' : 'map-pin',
      k: m.hours && m.area ? 'Area and hours' : m.hours ? 'Hours' : 'Area',
      v: where,
      wide: true,
    });
  let bio: ReactNode = null;
  if (m.bio.length) {
    const { head, clipped } = clipText(m.bio[0], 320, 280);
    if (clipped) {
      bio = (
        <div className="bio">
          <p className="bio-head">{head}</p>
          <Disclosure closed="Read more" opened="Show less" className="bio-more bio-full">
            {m.bio.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </Disclosure>
          {!b.claimed ? <SrcLine icon="info">Copied from public listings.</SrcLine> : null}
        </div>
      );
    } else {
      const restLen = m.bio.slice(1).reduce((s, p) => s + p.length, 0);
      const inline = restLen < 200 ? m.bio : m.bio.slice(0, 1);
      const rest = restLen < 200 ? [] : m.bio.slice(1);
      bio = (
        <div className="bio">
          {inline.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {rest.length ? (
            <Disclosure closed="Read more" opened="Show less" className="bio-more">
              {rest.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Disclosure>
          ) : null}
          {!b.claimed ? <SrcLine icon="info">Copied from public listings.</SrcLine> : null}
        </div>
      );
    }
  }
  const onfile =
    b.claimed && (m.insurance || m.certs.length) ? (
      <div className="onfile">
        <p className="of-h">
          <Icon name="file-text" />
          <b>On file with Myku</b>
        </p>
        <ul className="of-rows">
          {m.insurance ? (
            <li>
              <b>Insurance</b>
            </li>
          ) : null}
          {m.certs.length ? (
            <li className="of-certs">
              <span className="of-k">Certifications</span>
              {m.certs.map((c) => (
                <b key={c}>{c}</b>
              ))}
            </li>
          ) : null}
        </ul>
        <p className="of-foot">{`Not a review of ${b.first}’s work.`}</p>
      </div>
    ) : null;
  const socialIcon: Record<string, IconName> = {
    instagram: 'instagram-logo',
    tiktok: 'tiktok-logo',
    facebook: 'facebook-logo',
    youtube: 'youtube-logo',
    x: 'x-logo',
    website: 'globe',
  };
  return (
    <section className="sec meet" id="about" aria-labelledby="meet-h">
      <div className="sec-h">
        <p className="kicker">{personal ? 'About' : 'Where and when'}</p>
        <h2 id="meet-h">{personal ? `Meet ${b.first}` : tiles[0]?.k ?? 'Area'}</h2>
      </div>
      {m.face || bio ? (
        <div className="meet-grid">
          {m.face ? (
            <figure className="meet-ph">
              <Image
                src={m.face}
                alt={b.name}
                width={600}
                height={750}
                sizes="(max-width: 1023px) 92vw, 360px"
                unoptimized={!isSupabaseImage(m.face)}
              />
            </figure>
          ) : null}
          {bio}
        </div>
      ) : null}
      {tiles.length ? (
        <ul className="facts-grid">
          {tiles.map((t) => (
            <li key={t.key} className={`fct${t.wide ? ' wide' : ''}`}>
              <span className="fct-k">
                <Icon name={t.icon} />
                {t.k}
              </span>
              <p className="fct-v">
                <b>{t.v}</b>
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {tiles.length ? (
        b.claimed ? (
          m.years ? (
            <p className="claims">
              <Icon name="tag" />
              <span>{`${b.first}’s own details.`}</span>
            </p>
          ) : null
        ) : (
          <p className="claims">
            <Icon name="info" />
            <span>From public listings. Myku has not confirmed them.</span>
          </p>
        )
      ) : null}
      {onfile}
      {m.socials.length ? (
        <div className="socials">
          <span>{`See ${b.first} on`}</span>
          {m.socials.map((s) => (
            <a key={s.key} className="soc" href={s.url} rel="nofollow noopener" target="_blank">
              <Icon name={socialIcon[s.key] ?? 'globe'} />
              {s.label}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ the page */
export function SampleNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="notice">
      <Icon name="info" />
      <span>Some of this page is sample content. Anything marked Sample is an example, not a real job or review.</span>
    </p>
  );
}

export function BodySections({ b }: { b: BodyInput }) {
  return (
    <>
      <Work b={b} />
      <Services b={b} />
      <Reviews b={b} />
      <SampleReviews b={b} />
      <Meet b={b} />
    </>
  );
}

export function Footer({ b, children }: { b: BodyInput; children?: ReactNode }) {
  return (
    <footer className="ft">
      <div className="ft-in">
        <span className="mk mk--on" role="img" aria-label="Myku">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M4.2 19V5h3.1l4.7 6.9L16.7 5h3.1v14h-3.2v-8.7l-4 5.8h-1.2l-4-5.8V19z" />
          </svg>
        </span>
        <p className="ft-line">
          {b.claimed
            ? `This is ${b.name}’s page. Myku does not do the work, set prices or recommend mechanics.`
            : `This page is about ${b.name}, made by Myku from public listings. Myku does not do the work, set prices or recommend mechanics.`}
        </p>
        {b.since ? <p className="ft-since">{b.since}</p> : null}
        <p className="ft-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/support">Support</a>
        </p>
        {children ? <div className="ft-more">{children}</div> : null}
      </div>
    </footer>
  );
}
