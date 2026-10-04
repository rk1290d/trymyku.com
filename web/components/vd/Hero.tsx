import Image from 'next/image';
import type { CSSProperties } from 'react';
import { Icon } from './icons';
import ShareButton from './ShareButton';
import { BUCKETS, T, namePieces, type HeroInput, type HeroPlan, type ProofCell } from '@/lib/vd/hero';
import { vdSign, vdText, vdVoice } from './fonts';

// THE VAN DOOR HERO: the first screen of his page (2026-10-04, stage 1 of the
// redesign Rohaan approved). His work, his face, his name lettered like a van
// door, where he works, his own words, proof that names its source, his own
// numbers marked as his, and one orange button. Built from lib/vd/hero.ts,
// which decides every size on the server from real glyph widths.
//
// THE RULES IT CARRIES (VISION.md, the trust principle, and his calls):
// - Myku informs, never vouches: the ID chip says what was checked and that it
//   is not a review of his work; proof cells name their source; his numbers say
//   they are his. On a page he has not claimed nothing is credited to him.
// - No availability in any form. Nothing here reads that flag.
// - The Myku tile is a mark, not a link: his page never sends a visitor to a
//   page that lists other mechanics.
// - Myku names itself only in short source tags (Rohaan, 2026-10-04: "the whole
//   myku does this myku does that is very repetitive").

function isSupabaseImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'fioiaoxaozqfwdqukoho.supabase.co';
  } catch {
    return false;
  }
}

const MK = (
  <span className="mk" role="img" aria-label="Myku">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M4.2 19V5h3.1l4.7 6.9L16.7 5h3.1v14h-3.2v-8.7l-4 5.8h-1.2l-4-5.8V19z" />
    </svg>
  </span>
);

function Name({ plan }: { plan: HeroPlan }) {
  const base = plan.upper ? 0.96 : 1.04;
  const style = Math.abs(plan.lead - base) > 1e-6 ? ({ '--lh': String(plan.lead) } as CSSProperties) : undefined;
  return (
    <h1 className={`biz ${plan.nameCls} ${plan.upper ? 'u' : 't'}`} style={style}>
      {namePieces(plan.nameText, plan.soft).map((word, i) => (
        <span key={i}>
          {i > 0 ? ' ' : ''}
          {word.map((p, j) => (
            <span key={j}>
              {j > 0 ? <wbr /> : null}
              {p}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}

function IdChip({ first, docs }: { first: string; docs: HeroInput['docs'] }) {
  return (
    <details className="idc">
      <summary>
        <Icon name="identification-card" />
        <span>{T.idChip}</span>
        <Icon name="caret-down" className="cv-d" />
      </summary>
      <div className="idc-panel">
        <p>{T.idExplain(first, docs)}</p>
      </div>
    </details>
  );
}

function Proof({ cells }: { cells: ProofCell[] }) {
  if (!cells.length) return null;
  const jobs = cells[cells.length - 1].kind === 'jobs' && cells.length > 1 ? ' has-jobs' : '';
  return (
    <div className={`proof proof--${cells.length}${jobs}`}>
      {cells.map((c) => {
        const inner = (
          <>
            <span className="pf-n">
              {c.kind === 'jobs' ? c.num.toLocaleString('en-US') : c.num.toFixed(1)}
              <Icon name={c.kind === 'jobs' ? 'receipt-bold' : 'star-fill'} />
            </span>
            <span className="pf-l">{c.label}</span>
          </>
        );
        return c.href ? (
          <a key={c.kind} className={`pf pf--${c.kind}`} href={c.href}>
            {inner}
          </a>
        ) : (
          <div key={c.kind} className={`pf pf--${c.kind}`}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function ProofLines({ cells }: { cells: ProofCell[] }) {
  if (!cells.length) return null;
  return (
    <ul className="pf-lines">
      {cells.map((c) => {
        const body =
          c.kind === 'jobs' ? (
            <>
              <Icon name="receipt-bold" />
              <span>{T.pfJobsLine(c.count)}</span>
            </>
          ) : (
            <>
              <Icon name="star-fill" />
              <span>
                <b>{c.num.toFixed(1)}</b> · {c.label}
              </span>
            </>
          );
        return (
          <li key={c.kind}>
            {c.href ? (
              <a className={`pfl pfl--${c.kind}`} href={c.href}>
                {body}
              </a>
            ) : (
              <span className={`pfl pfl--${c.kind}`}>{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Numbers({ plan, first, claimed }: { plan: HeroPlan; first: string; claimed: boolean }) {
  const { years, rate, fee } = plan.numbers;
  const parts: React.ReactNode[] = [];
  if (years) parts.push(years);
  if (rate)
    parts.push(
      <>
        <b>{rate}</b>
        {T.rate}
      </>
    );
  if (fee)
    parts.push(
      <>
        <b>{fee}</b>
        {T.fee}
      </>
    );
  if (!parts.length) return null;
  return (
    <p className="nums">
      <span className="nums-v">
        {parts.map((p, i) => (
          <span className="nb" key={i}>
            {p}
            {i < parts.length - 1 ? (
              <span className="sep" aria-hidden="true">
                {' '}
                ·
              </span>
            ) : null}{' '}
          </span>
        ))}
      </span>
      {claimed ? (
        <span className="attr">
          <Icon name="tag" />
          {T.ownNumbers(first)}
        </span>
      ) : null}
    </p>
  );
}

function DoorText({ door }: { door: HeroPlan['door'] }) {
  const [pre, city] = door;
  return (
    <>
      {pre ? <span className="ds-a">{pre}</span> : null}
      {pre && city ? <span className="ds-sep"> · </span> : null}
      {city ? <span className="nw">{city}</span> : null}
    </>
  );
}

function HoursText({ hours }: { hours: string }) {
  // every "Mon to Sat" stays on one line, as the estimate measured it
  const parts = hours.split(/(\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) to (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b)/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span className="nw" key={i}>
            {p}
          </span>
        ) : (
          p
        )
      )}
    </>
  );
}

function AreaText({ area, city }: { area: string; city: string | null }) {
  if (!city || !area.includes(city)) return <>{area}</>;
  const i = area.indexOf(city);
  return (
    <>
      {area.slice(0, i)}
      <span className="nw">{city}</span>
      {area.slice(i + city.length)}
    </>
  );
}

function tierClass(plan: HeroPlan): string {
  return BUCKETS.filter((b) => plan.tiers[b]).map((b) => ` t${b}${plan.tiers[b]}`).join('');
}

export default function Hero({
  input,
  plan,
  pageUrl,
  pageTitle,
}: {
  input: HeroInput;
  plan: HeroPlan;
  pageUrl: string;
  pageTitle: string;
}) {
  const { first } = input;
  const topbar = (
    <div className="topbar">
      {MK}
      <ShareButton label={T.share} aria={T.shareAria(first)} url={pageUrl} title={pageTitle} />
    </div>
  );
  const ask = (
    <>
      <a className={`cta hero-ask${plan.ctaSize ? ` ${plan.ctaSize}` : ''}`} href="#quote" id="hero-ask">
        <span className="cta-t">{T.cta(first)}</span>
        <span className="cta-ic">
          <Icon name="arrow-right" />
        </span>
      </a>
      <p className="cta-note">{T.ctaNote}</p>
    </>
  );
  const fonts = `vd ${vdSign.variable} ${vdText.variable} ${vdVoice.variable}`;
  const headline = input.headline ? <p className="headline">{input.headline}</p> : null;

  if (plan.kind === 'door') {
    const stack = plan.letterStack.map((b) => ` ls${b}`).join('');
    const listingRating = input.cells.some((c) => c.kind === 'public');
    const fromListings =
      listingRating ||
      Boolean(plan.doorSub.hours || plan.doorSub.radius || input.headline) ||
      Boolean(plan.numbers.years || plan.numbers.rate || plan.numbers.fee);
    const listingNote = fromListings ? (
      <p className="listing-note">
        <Icon name="info" />
        <span>{T.fromPublicLong}</span>
      </p>
    ) : null;
    return (
      <div className={fonts}>
        <header className={`band band--door${tierClass(plan)}${stack}`} id="top" data-fx-hero>
          {topbar}
          <div className="door">
            <Name plan={plan} />
            {input.biz ? <p className="person">{input.name}</p> : null}
            {input.chip ? (
              <div className="who">
                <IdChip first={first} docs={input.docs} />
              </div>
            ) : null}
            {plan.door[0] || plan.door[1] ? (
              <p className="lettering">
                <Icon name={input.workType === 'Shop' ? 'storefront' : input.workType ? 'van' : 'map-pin'} />
                <span>
                  <DoorText door={plan.door} />
                </span>
              </p>
            ) : null}
            {plan.doorSub.radius || plan.doorSub.hours ? (
              <ul className="door-sub">
                {plan.doorSub.radius ? (
                  <li>
                    <Icon name="map-pin" />
                    <span>
                      <AreaText area={plan.doorSub.radius} city={input.city} />
                    </span>
                  </li>
                ) : null}
                {plan.doorSub.hours ? (
                  <li>
                    <Icon name="clock" />
                    <span>
                      <HoursText hours={plan.doorSub.hours} />
                    </span>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
          {headline}
          {input.claimed ? (
            <>
              <Proof cells={plan.big} />
              <ProofLines cells={plan.small} />
              <Numbers plan={plan} first={first} claimed />
            </>
          ) : (
            <>
              {/* A page he has not claimed: everything Myku copied from his public listings (his hours, his radius,
                  his headline, any numbers, a listing's rating) sits above one line that says so, and nothing is
                  credited to him. A Google rating names Google as its source, so it sits after that line rather
                  than under a sentence that would call Google's numbers unconfirmed listing data. */}
              {listingRating ? null : <Numbers plan={plan} first={first} claimed={false} />}
              {listingRating ? null : listingNote}
              <Proof cells={plan.big} />
              <ProofLines cells={plan.small} />
              {listingRating ? <Numbers plan={plan} first={first} claimed={false} /> : null}
              {listingRating ? listingNote : null}
            </>
          )}
          {ask}
        </header>
      </div>
    );
  }

  const n = input.cover.length;
  const short = Object.values(plan.tiers).includes(2);
  const stack = plan.areaStack.map((b) => ` ds${b}`).join('');
  return (
    <div className={fonts}>
      <header className={`band${n ? '' : ' band--nocover'}${tierClass(plan)}${stack}`} id="top" data-fx-hero>
        {topbar}
        {n ? (
          <div className={`cover cover--${Math.min(n, 4)}`}>
            {input.cover.map((c, i) => (
              <a className="cv" href={c.href} key={c.src} aria-label={c.label}>
                <Image
                  src={c.src}
                  alt=""
                  fill
                  sizes={i === 0 ? '(max-width: 1023px) 62vw, 560px' : '(max-width: 1023px) 40vw, 360px'}
                  priority={i === 0}
                  unoptimized={!isSupabaseImage(c.src)}
                />
              </a>
            ))}
            <span className="cover-src">
              <Icon name="camera" />
              <span>{T.sharedBy(first)}</span>
            </span>
          </div>
        ) : null}
        <div className={`ident${input.face ? '' : ' noface'}`}>
          {input.face ? (
            <figure className="face">
              <Image
                src={input.face}
                alt={input.name}
                width={192}
                height={240}
                sizes="(max-width: 1023px) 96px, 140px"
                priority
                unoptimized={!isSupabaseImage(input.face)}
              />
            </figure>
          ) : null}
          <Name plan={plan} />
        </div>
        {input.biz || input.chip ? (
          <div className="who">
            {input.biz ? <span className="person">{input.name}</span> : null}
            {input.chip ? <IdChip first={first} docs={input.docs} /> : null}
          </div>
        ) : null}
        {plan.area || plan.hours ? (
          <ul className="facts">
            {plan.area ? (
              <li className="fact-area">
                <Icon name={input.workType === 'Shop' ? 'storefront' : input.workType ? 'van' : 'map-pin'} />
                <span>
                  <span className="area-l">
                    <AreaText area={plan.area} city={input.city} />
                  </span>
                  {short ? (
                    <span className="area-s">
                      <DoorText door={plan.door} />
                    </span>
                  ) : null}
                </span>
              </li>
            ) : null}
            {plan.hours ? (
              <li className="fact-hours">
                <Icon name="clock" />
                <span>
                  <HoursText hours={plan.hours} />
                </span>
              </li>
            ) : null}
          </ul>
        ) : null}
        {headline}
        <Proof cells={plan.big} />
        <ProofLines cells={plan.small} />
        <Numbers plan={plan} first={first} claimed={input.claimed} />
        {ask}
      </header>
    </div>
  );
}
