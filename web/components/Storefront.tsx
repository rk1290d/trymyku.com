import Image from 'next/image';
import Link from 'next/link';
import QuoteForm from '@/components/QuoteForm';
import StorefrontFx from '@/components/StorefrontFx';
import { timeAgo, money, firstName, workTypeLabel } from '@/lib/format';
import { SUPPORT_EMAIL, SITE_URL } from '@/lib/site';
import { socialLinks } from '@/lib/socials';
import type { PageData } from '@/lib/pageData';

/* ------------------------------------------------------------------
   GLYPHS
   ------------------------------------------------------------------ */

// Filled teal check. The ONLY check on this page, and it means exactly one
// thing: this job ran through Myku. It never migrates onto paperwork.
function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M7.4 12.3l3.2 3.3 6-6.8"
        fill="none"
        stroke="#F6FAFA"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Info circle. Explicitly NOT a warning: the mechanic's own listings are
// never flagged as suspect on his own storefront.
function InfoMark({ w = 2 }: { w?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={w} />
      <path d="M12 11v5M12 8v.1" stroke="currentColor" strokeWidth={w + 0.2} strokeLinecap="round" />
    </svg>
  );
}

// Neutral check for the paperwork line. Deliberately a different mark from
// the teal job-provenance check: a reviewed document is not a completed job.
function DocCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="10" r="2.6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function VanGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 16V9h13v7M15 11h4l3 4v1h-7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="17.5" r="2.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// Decorative quote glyph, recessed behind the review's words.
function QuoteGlyph() {
  return (
    <svg className="mp-rev-q" viewBox="0 0 32 28" aria-hidden="true">
      <path d="M13.8 4.4C8 7 4.2 12 4.2 17.6c0 3.9 2.4 6.4 5.7 6.4 3 0 5.1-2.1 5.1-5.1 0-2.8-1.9-4.7-4.7-4.7-.4 0-.8 0-1.2.1.8-2.9 3.1-5.5 6.1-6.9l-1.4-3zm13.4 0C21.4 7 17.6 12 17.6 17.6c0 3.9 2.4 6.4 5.7 6.4 3 0 5.1-2.1 5.1-5.1 0-2.8-1.9-4.7-4.7-4.7-.4 0-.8 0-1.2.1.8-2.9 3.1-5.5 6.1-6.9l-1.4-3z" />
    </svg>
  );
}

/* ------------------------------------------------------------------
   BLUEPRINT PLATES

   A plate is Myku-authored line art. It therefore illustrates the
   mechanic's job in MYKU's hand, on a card that says the job is HIS. A
   fuzzy service-to-art map would draw work that did not happen that way, so
   a drawing is only used on a confident keyword match against a small
   curated set. Everything else gets the neutral plate, which asserts
   nothing about what was done.
   ------------------------------------------------------------------ */
type PlateKey = 'brake' | 'oil' | 'battery' | 'belt' | 'tire' | 'ac' | 'plug' | 'susp' | 'neutral';

const PLATE_RULES: [RegExp, PlateKey][] = [
  [/\b(brakes?|rotors?|calipers?|brake pads?)\b/, 'brake'],
  [/\b(oil|oil change|oil filter)\b/, 'oil'],
  [/\b(batter(y|ies)|alternator|starter|no.?start|jump ?start)\b/, 'battery'],
  [/\b(serpentine|belts?|tensioner|pulley)\b/, 'belt'],
  [/\b(tires?|tyres?|wheels?|alignment|rotation|balanc\w*)\b/, 'tire'],
  [/(\ba\/?c\b|air ?condition|heater|heating|hvac)/, 'ac'],
  [/\b(spark ?plugs?|ignition|coil ?packs?|tune.?up)\b/, 'plug'],
  [/\b(suspension|struts?|shocks?|coil ?springs?|steering|control ?arms?)\b/, 'susp'],
];

function plateKey(service: string | null): PlateKey {
  if (!service) return 'neutral';
  const s = service.toLowerCase();
  for (const [re, key] of PLATE_RULES) if (re.test(s)) return key;
  return 'neutral';
}

function Plate({ kind }: { kind: PlateKey }) {
  const box = kind === 'oil' ? '0 0 200 162' : '0 0 200 150';
  return (
    <svg className="mp-plate" viewBox={box} aria-hidden="true">
      {PLATE_ART[kind]}
    </svg>
  );
}

const PLATE_ART: Record<PlateKey, React.ReactNode> = {
  oil: (
    <>
      <g className="ln">
        <path pathLength="100" d="M76 46h48a10 10 0 0 1 10 10v58a10 10 0 0 1-10 10H76a10 10 0 0 1-10-10V56a10 10 0 0 1 10-10z" />
        <ellipse pathLength="100" cx="100" cy="46" rx="34" ry="9" />
        <path pathLength="100" d="M68 64h64" />
        <path pathLength="100" d="M68 78h64" />
        <path pathLength="100" d="M68 92h64" />
        <path pathLength="100" d="M84 124h32v12H84z" />
        <path pathLength="100" className="dash" d="M40 46h20M40 124h20M50 46v78" />
      </g>
      <g className="acc">
        <path pathLength="100" d="M100 138c5 7 8 10 8 13.5a8 8 0 0 1-16 0c0-3.5 3-6.5 8-13.5z" />
        <circle pathLength="100" cx="100" cy="46" r="7" />
      </g>
    </>
  ),
  belt: (
    <>
      <g className="ln">
        <circle pathLength="100" cx="62" cy="98" r="30" />
        <circle pathLength="100" cx="62" cy="98" r="11" />
        <circle pathLength="100" cx="150" cy="60" r="18" />
        <circle pathLength="100" cx="150" cy="60" r="6" />
        <circle pathLength="100" cx="156" cy="114" r="11" />
        <path pathLength="100" d="M32 104A30 30 0 0 1 52 72l40-28a13 13 0 0 1 22 4l14 6a18 18 0 0 1 34 10 18 18 0 0 1-8 14l7 26a11 11 0 0 1-16 12l-64 10A30 30 0 0 1 32 104z" />
        <path pathLength="100" className="dash" d="M103 22v14" />
      </g>
      <g className="acc">
        <circle pathLength="100" cx="103" cy="50" r="13" />
        <path pathLength="100" d="M103 37V24" />
      </g>
    </>
  ),
  battery: (
    <>
      <g className="ln">
        <path pathLength="100" d="M46 58h108a6 6 0 0 1 6 6v56a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6V64a6 6 0 0 1 6-6z" />
        <path pathLength="100" d="M40 76h120" />
        <path pathLength="100" d="M60 44h18v14H60z" />
        <path pathLength="100" d="M122 44h18v14h-18z" />
        <path pathLength="100" d="M56 92h44" />
        <path pathLength="100" d="M56 104h44" />
        <path pathLength="100" d="M56 116h28" />
        <circle pathLength="100" cx="130" cy="104" r="20" />
        <path pathLength="100" className="dash" d="M64 30h10M69 25v10M127 30h10" />
      </g>
      <g className="acc">
        <path pathLength="100" d="M134 90l-12 17h10l-6 13 14-18h-9z" />
      </g>
    </>
  ),
  brake: (
    <>
      <g className="ln">
        <circle pathLength="100" cx="132" cy="82" r="46" />
        <circle pathLength="100" cx="132" cy="82" r="36" />
        <circle pathLength="100" cx="132" cy="82" r="15" />
        <circle pathLength="100" cx="132" cy="60" r="3.4" />
        <circle pathLength="100" cx="153" cy="76" r="3.4" />
        <circle pathLength="100" cx="145" cy="101" r="3.4" />
        <circle pathLength="100" cx="119" cy="101" r="3.4" />
        <circle pathLength="100" cx="111" cy="76" r="3.4" />
        <path pathLength="100" d="M14 128h30a14 14 0 0 0 14-14V74a14 14 0 0 1 14-14h20" />
        <path pathLength="100" className="dash" d="M46 60h24M46 128h-8" />
      </g>
      <g className="acc">
        <path pathLength="100" d="M116 24h30a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8h-30a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8z" />
        <path pathLength="100" d="M92 60h16" />
      </g>
    </>
  ),
  tire: (
    <>
      <g className="ln">
        <circle pathLength="100" cx="128" cy="76" r="48" />
        <circle pathLength="100" cx="128" cy="76" r="31" />
        <circle pathLength="100" cx="128" cy="76" r="11" />
        <path pathLength="100" d="M128 45v-9M159 76h9M128 107v9M97 76h-9" />
        <path pathLength="100" d="M106 54l-6-7M150 54l6-7M150 98l6 7M106 98l-6 7" />
        <path pathLength="100" d="M46 130h132" />
        <path pathLength="100" className="dash" d="M46 28v102M46 28h34" />
      </g>
      <g className="acc">
        <path pathLength="100" d="M128 28a48 48 0 0 1 42 25" />
      </g>
    </>
  ),
  ac: (
    <>
      <g className="ln">
        <circle pathLength="100" cx="124" cy="74" r="42" />
        <circle pathLength="100" cx="124" cy="74" r="9" />
        <path pathLength="100" d="M124 65c0-20 5-30 16-30s14 12 3 21-19 9-19 9z" />
        <path pathLength="100" transform="rotate(120 124 74)" d="M124 65c0-20 5-30 16-30s14 12 3 21-19 9-19 9z" />
        <path pathLength="100" transform="rotate(240 124 74)" d="M124 65c0-20 5-30 16-30s14 12 3 21-19 9-19 9z" />
        <path pathLength="100" d="M32 44h34v60H32z" />
        <path pathLength="100" d="M66 60h16v28H66z" />
        <path pathLength="100" className="dash" d="M20 44h12M20 104h12M26 44v60" />
      </g>
      <g className="acc">
        <path pathLength="100" d="M96 122h56" />
      </g>
    </>
  ),
  plug: (
    <>
      <g className="ln">
        <path pathLength="100" d="M100 18h26v30h-26z" />
        <path pathLength="100" d="M94 48h38v26H94z" />
        <path pathLength="100" d="M100 74h26v30h-26z" />
        <path pathLength="100" d="M98 82h30M98 90h30M98 98h30" />
        <path pathLength="100" d="M107 104h12v18h-12z" />
        <path pathLength="100" className="dash" d="M56 18h30M56 122h30M68 18v104" />
      </g>
      <g className="acc">
        <path pathLength="100" d="M113 122v10h12" />
        <circle pathLength="100" cx="113" cy="140" r="6" />
      </g>
    </>
  ),
  susp: (
    <>
      <g className="ln">
        <path pathLength="100" d="M82 34h48" />
        <path pathLength="100" d="M82 128h48" />
        <path pathLength="100" d="M84 44l44 12-44 12 44 12-44 12 44 12-44 12" />
        <path pathLength="100" d="M106 34V14" />
        <path pathLength="100" d="M96 14h20" />
        <path pathLength="100" d="M150 40v88" />
        <path pathLength="100" className="dash" d="M56 34h26M56 128h26M64 34v94" />
      </g>
      <g className="acc">
        <circle pathLength="100" cx="150" cy="34" r="8" />
      </g>
    </>
  ),
  // Neutral plate. Drafting geometry only: it says "this is a job ticket",
  // never "this is what the job was".
  neutral: (
    <>
      <g className="ln">
        <circle pathLength="100" cx="122" cy="76" r="46" />
        <circle pathLength="100" cx="122" cy="76" r="30" />
        <path pathLength="100" d="M122 46l26 15v30l-26 15-26-15V61z" />
        <path pathLength="100" d="M122 30v-12M122 122v12M76 76H64M168 76h12" />
        <path pathLength="100" d="M40 34v-14h16M188 20h-16" />
        <path pathLength="100" className="dash" d="M40 34v98M40 132h20" />
      </g>
      <g className="acc">
        <circle pathLength="100" cx="122" cy="76" r="11" />
      </g>
    </>
  ),
};

/* ------------------------------------------------------------------
   DATA SHAPES
   ------------------------------------------------------------------ */
interface WallJob {
  key: string;
  vehicle: string;
  service: string | null;
  price: string | null;
  when: string | null;
  town: string | null;
  verified: boolean;
  photo: string | null;
  // The mechanic's own words about his own job. Shared cards only: a
  // verified card carries Myku's record of the job, not his caption of it.
  caption: string | null;
  ts: number;
}

// ONE absolute date format on the work wall. Relative dates flatter: they
// make older work read as recent, and the cutoff where "last month" becomes
// a date is invisible to the reader, so the same page would present two jobs
// three months apart in formats that imply different recency.
function jobDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  if (d.getTime() > Date.now()) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// A PARSED host check, not a substring test. `url.includes('.supabase.co/')`
// also matches https://evil.example/.supabase.co/x.jpg, which then routes to
// the image optimizer before next.config's remotePatterns rejects it.
function isSupabaseImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

// Oxford-free plain list: "a", "a and b", "a, b and c".
function listOf(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}


/* ------------------------------------------------------------------
   PAGE

   `mode` is 'live' for the public route and 'preview' for the mechanic's
   own token-keyed draft. Every preview difference is gated on
   mode === 'preview' (or mode === 'live' where something is withheld), so
   the live render is byte-for-byte what it was before the prop existed.
   ------------------------------------------------------------------ */
export default function Storefront({
  data,
  mode = 'live',
}: {
  data: PageData;
  mode?: 'live' | 'preview';
}) {
  const { page, services: rawServices, shared, verified, reviews: rawReviews } = data;

  // Non-empty content only. A blank service string renders an empty ruled
  // row, and a rating with no words renders a hollow review card. Both are
  // the "empty box with a heading" the brief forbids, reached through a data
  // shape rather than a missing section.
  // Dedupe by trimmed name, first row wins its price. The price is the
  // mechanic's own choice per service: null means he chose not to say.
  const seen = new Map<string, number | null>();
  for (const row of rawServices) {
    const label = (row.service ?? '').trim();
    if (!label || seen.has(label)) continue;
    const p = typeof row.price_from === 'number' && row.price_from > 0 ? row.price_from : null;
    seen.set(label, p);
  }
  const services = Array.from(seen, ([label, priceFrom]) => ({ label, priceFrom }));
  const reviews = rawReviews.filter((r) => Boolean(r.text?.trim()));

  // Strictly chronological across both kinds. Platform jobs are never
  // floated to the top: ranking them would read as Myku promoting them.
  // Whitespace-only fields are trimmed to null here so a shared job gets the
  // same defenses a verified one does: no blank bold lead line, no empty
  // price span, no dangling "May 2026 · " separator.
  const wall: WallJob[] = [
    ...verified.map((j) => ({
      key: `v-${j.id}`,
      vehicle: j.vehicle?.trim() || 'Vehicle',
      service: j.service?.trim() || null,
      price: money(j.price),
      when: jobDate(j.completed_at),
      town: j.town?.trim() || null,
      verified: true,
      photo: null,
      caption: null,
      ts: new Date(j.completed_at).getTime() || 0,
    })),
    ...shared.map((j) => ({
      key: `s-${j.id}`,
      vehicle: j.vehicle?.trim() || 'Vehicle',
      service: j.service?.trim() || null,
      // Free text the mechanic typed. It may read "80-120", "parts only" or
      // "call me", so it prints verbatim with no Myku-authored caption.
      price: j.price_label?.trim() || null,
      when: jobDate(j.done_on),
      town: j.town?.trim() || null,
      verified: false,
      photo: j.photo_url,
      caption: j.caption?.trim() || null,
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
  // Fail CLOSED: any unexpected status is treated as unclaimed.
  const unclaimed = page.web_status !== 'published';
  // An unclaimed page is not taking requests, so it must not also announce
  // that the mechanic is taking new work. Availability is suppressed with
  // the composer, not left behind it.
  const showAvailable = page.available === true && !unclaimed;
  const verifiedCount = wall.filter((j) => j.verified).length;
  const hasSharedJob = wall.some((j) => !j.verified);

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
  // carries the unconfirmed state so it survives the claim strip scrolling
  // away. This is the PERSISTENT unclaimed signal.
  const eyebrowBits = [
    cityShort ? `Mechanic · ${cityShort}` : 'Independent mechanic',
    unclaimed ? 'Unconfirmed' : null,
  ].filter(Boolean) as string[];

  // The specialization line has a literal fallback, so it can never be
  // empty. There is no "unavailable" state anywhere on this page.
  const specLine = page.specialization || 'Independent mechanic';

  // The headline is the BUSINESS name when he gave one, else the person.
  // Attribution never moves with it: `first` above stays the person's own
  // first name, so "Shared by", "About", "How ... works" and the note under
  // the facts keep naming the human, not the shingle.
  const bizName = page.business_name?.trim() || null;
  const headline = bizName ?? page.full_name;

  // The name sets in two lines, the way the design draws it. Long names step
  // the type scale down; they are never truncated or ellipsized.
  const nameParts = headline.trim().split(/\s+/).filter(Boolean);
  const nameLine1 = nameParts[0] || headline;
  const nameLine2 = nameParts.slice(1).join(' ');
  const longestToken = Math.max(...(nameParts.length ? nameParts : [headline]).map((t) => t.length));
  const nameClass =
    longestToken > 12 ? 'mp-name nm-long' : longestToken > 9 ? 'mp-name nm-mid' : 'mp-name';

  // Content slots. Each is trimmed to null here so a whitespace-only value
  // never conjures a row, and every slot below renders only when its value
  // survived. A page with none of them set renders exactly as before the
  // columns existed.
  const showPortrait = Boolean(page.photo_url) && page.show_photo === true;
  const hours = page.hours_note?.trim() || null;
  // Typed by the mechanic for the rows only. NOT fed to the radar: the pins
  // stay job-derived, so the drawing never asserts coverage he merely listed.
  const towns = (page.service_towns ?? []).map((t) => (t ?? '').trim()).filter(Boolean);
  const requestNote = page.request_note?.trim() || null;
  const links = socialLinks(page.socials);

  // FACT STRIP, fixed priority order, maximum 4 cells. The panel always
  // renders: the money question is never silent. `self` marks the cells the
  // mechanic typed himself, which the note below the strip then attributes.
  const cells: { value: string; unit?: string; caption: string; self?: boolean }[] = [];
  if ((page.hourly_rate ?? 0) > 0)
    cells.push({ value: `$${page.hourly_rate}`, unit: '/hr', caption: 'Labor rate', self: true });
  if ((page.diagnostic_fee ?? 0) > 0)
    cells.push({ value: `$${page.diagnostic_fee}`, caption: 'Diagnostic', self: true });
  if (hasRating)
    cells.push({
      value: ratingNum.toFixed(1),
      caption: `${reviewCount} review${reviewCount === 1 ? '' : 's'}`,
    });
  if ((page.years_experience ?? 0) > 0)
    cells.push({
      value: String(page.years_experience),
      unit: 'yrs',
      caption: `Year${page.years_experience === 1 ? '' : 's'} working`,
      self: true,
    });
  // Only the CONFIRMED half is counted. A single number merging Myku-verified
  // jobs with the mechanic's own listings would let the unverified half
  // borrow the authority of the verified half, in the page's most
  // authoritative slot.
  // Caption is a NOUN like every other cell ("Labor rate", "Years working").
  // A bare number over "Confirmed by Myku" in the page's most authoritative
  // slot reads as Myku confirming the mechanic, not the jobs.
  if (verifiedCount > 0)
    cells.push({
      value: String(verifiedCount),
      caption: verifiedCount === 1 ? 'Job through Myku' : 'Jobs through Myku',
    });
  const strip = cells.slice(0, 4);
  // Never print a fact twice: the About rows only carry years when the strip
  // had no room for it.
  const yearsInStrip = strip.some((c) => c.caption.endsWith('working'));

  // The rate, the fee and the years are mechanic-entered and sit directly
  // under the Myku mark. The page is scrupulous about his work history two
  // screens down; it must not be silent about his numbers here.
  const selfBits: string[] = [];
  if (strip.some((c) => c.caption === 'Labor rate')) selfBits.push('the labor rate');
  if (strip.some((c) => c.caption === 'Diagnostic')) selfBits.push('the diagnostic fee');
  if (yearsInStrip) selfBits.push('the years working');
  // Three words, not a deposition. The full sentence lives in How Myku
  // Works; this is just quiet attribution on the numbers themselves.
  const factsNote = selfBits.length ? `${first}’s own numbers.` : null;

  // Gated on the paragraphs that actually render, not on the raw column. A
  // whitespace-only bio is truthy and renders nothing, which would leave the
  // ABOUT headline over an empty band.
  const bioParas = (page.bio ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const years = page.years_experience ?? 0;

  // Certifications get the same trim-and-drop pass services and reviews get:
  // [''] must not conjure a row, and ['ASE', ''] must not print a dangling
  // comma.
  // Same guard as `credentials` above, for the same reason. These names are
  // typed by the mechanic, but "Certifications" printed next to a page that
  // elsewhere says Myku reviewed documents reads as a Myku-checked fact.
  // A preview page attaches no credential-shaped claim to anyone.
  const certs = unclaimed
    ? []
    : (page.certifications ?? []).map((c) => (c ?? '').trim()).filter(Boolean);

  // Towns for the service-area drawing, first appearance wins, home town
  // excluded. Capped at four so the plate never collides with itself.
  const townSet: string[] = [];
  for (const j of wall) {
    const t = j.town?.trim();
    if (!t) continue;
    if (cityShort && t.toLowerCase() === cityShort.toLowerCase()) continue;
    if (townSet.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    townSet.push(t);
    if (townSet.length === 4) break;
  }
  // The panel is worth drawing only when it has something to say.
  const hasArea =
    Boolean(city) ||
    Boolean(work) ||
    showAvailable ||
    townSet.length > 0 ||
    Boolean(page.hours_note?.trim()) ||
    towns.length > 0;

  const hasAbout =
    bioParas.length > 0 ||
    hasArea ||
    years > 0 ||
    certs.length > 0 ||
    credentials.length > 0 ||
    links.length > 0;

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
  // The self-reported chip names its SOURCE, and the source differs by state.
  // On a published page the mechanic himself listed the job: "Shared by
  // {first}". On an unclaimed page he has never touched it; the rows were
  // seeded from public listings by Myku, and saying "{first} listed this" or
  // "Shared by {first}" attributes to him an act he did not perform, on a page
  // he does not know exists. The How Myku Works block below already says the
  // details "came from public listings"; the chip and its definition must say
  // the same thing, or the page contradicts itself one screen apart.
  const sharedChip = unclaimed ? 'From public listings' : `Shared by ${first}`;
  const sharedNote = unclaimed
    ? 'From a public listing. Myku has not confirmed it.'
    : `${first} listed this job. Myku has not confirmed it.`;
  const sharedDef = unclaimed
    ? 'Jobs marked From public listings were found in public listings.'
    : `Jobs marked Shared by ${first} were listed by ${first}.`;
  // Gated on which marks ACTUALLY render, not on the wall existing. Defining
  // "Completed through Myku" on a page where every card is self-reported
  // implies a confirmed job is present somewhere, which is the exact blur
  // this block exists to prevent.
  const sharedCount = wall.length - verifiedCount;
  if (verifiedCount > 0 && sharedCount > 0)
    howParas.push(
      `Jobs marked Completed through Myku were done through the Myku platform. ${sharedDef}`
    );
  else if (verifiedCount > 0)
    howParas.push(
      'Jobs marked Completed through Myku were done through the Myku platform.'
    );
  else if (sharedCount > 0)
    howParas.push(`${sharedDef} Myku has not confirmed them.`);
  if (credentials.length > 0)
    howParas.push(
      'ID verified, insurance on file and certifications on file mean Myku reviewed documents. They do not mean Myku recommends the work.'
    );
  if (unclaimed)
    howParas.push(
      `${first} has not claimed this page. The details here came from public listings, and nothing on the page has been confirmed by ${first}.`
    );

  // Structured data, PUBLISHED pages only. Attaching business schema to a
  // person who never agreed to the page would be a trust violation. Every
  // field restates an on-page fact. No priceRange, telephone or hours: not
  // held, never fabricated. The service-area drawing adds no geo claim.
  const jsonLd = unclaimed
    ? null
    : {
        '@context': 'https://schema.org',
        '@type': 'AutoRepair',
        name: page.full_name,
        url: `${SITE_URL}/${page.slug}`,
        ...(page.photo_url ? { image: page.photo_url } : {}),
        description: `${specLine}${cityShort ? ` in ${cityShort}` : ''}. Independent mechanic on Myku.`,
        ...(cityShort
          ? { address: { '@type': 'PostalAddress', addressLocality: cityShort } }
          : {}),
        ...(city ? { areaServed: city } : {}),
        ...(hasRating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: ratingNum.toFixed(1),
                reviewCount,
              },
            }
          : {}),
      };

  // Section numbers are assigned to the sections that actually render, so a
  // sparse page never shows 01 followed by 04.
  let secN = 0;
  const nextNum = () => String(++secN).padStart(2, '0');
  const numWork = wall.length > 0 ? nextNum() : null;
  const numAbout = hasAbout ? nextNum() : null;
  const numServices = services.length > 0 ? nextNum() : null;
  const numReviews = reviews.length > 0 ? nextNum() : null;
  const numAsk = nextNum();

  const claimMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Claiming my Myku page (${page.slug})`
  )}`;
  // On EVERY page, claimed or not. A visitor who thinks the page is wrong
  // about someone needs a door, and it is the one link here that is not
  // gated on the mechanic's data.
  const reportMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Reporting a Myku page (${page.slug})`
  )}`;
  // The claim BUTTONS scroll to the panel instead of firing the mailto
  // directly: on a machine with no mail app a mailto click does visibly
  // nothing, which reads as a dead button. The panel spells the address out
  // so the action always works even when the link cannot.
  const claimHref = '#claim';

  const jobCard = (j: WallJob) => (
    <article className={`mp-card${j.verified ? ' ver' : ''}${j.photo ? ' pic' : ''}`} key={j.key}>
      {j.photo ? (
        // The mechanic's own photograph of his own job. It is the one image
        // on this card that is actually his, so it takes the plate slot
        // rather than being dropped in favour of a drawing Myku made up.
        <Image
          className="mp-pic"
          src={j.photo}
          alt={`${j.vehicle}: ${j.service ?? 'job photo'}`}
          width={304}
          height={228}
          loading="lazy"
          unoptimized={!isSupabaseImage(j.photo)}
        />
      ) : (
        <Plate kind={plateKey(j.service)} />
      )}
      <span className="mp-rail" aria-hidden="true" />
      <div className="mp-card-body">
        <div className="mp-card-top">
          {j.verified ? (
            <>
              <span className="mp-badge ver" title="This job was completed through the Myku platform">
                <CheckMark />
                Completed through Myku
              </span>
            </>
          ) : (
            // The provenance sentence is one tap away, not stamped on every
            // card: repeated across the wall it stopped being information and
            // became the page apologizing for its own mechanic. The chip
            // still names the source, the How Myku Works block still defines
            // it, and the tap answers anyone who wants the fine print.
            <details className="mp-provx">
              <summary className="mp-badge">
                <InfoMark />
                {sharedChip}
              </summary>
              <span className="mp-notconf">{sharedNote}</span>
            </details>
          )}
        </div>
        <h3>{j.vehicle}</h3>
        {j.service ? <p className="job">{j.service}</p> : null}
        {/* Shared cards only: verified cards are built with caption null. */}
        {j.caption ? <p className="mp-cap">{j.caption}</p> : null}
      </div>
      {/* A card with no published price is not a card with a hole in it: the
          footer becomes one deliberate left-aligned block. */}
      <div className={`mp-card-foot${j.price ? '' : ' noprice'}`}>
        {j.price ? (
          <span className="mp-price">
            {j.verified ? <span className="lbl">Job total</span> : null}
            {j.price}
          </span>
        ) : null}
        {j.when || j.town ? (
          <span className="mp-when">
            {j.price ? (
              <>
                {j.when}
                {j.when && j.town ? <br /> : null}
                {j.town}
              </>
            ) : (
              [j.when, j.town].filter(Boolean).join(' · ')
            )}
          </span>
        ) : null}
      </div>
    </article>
  );

  const reviewCard = (r: (typeof reviews)[number]) => {
    const ago = timeAgo(r.created_at);
    return (
      <div className="mp-rev mp-rv" key={r.id}>
        <QuoteGlyph />
        {r.text ? <p>{r.text}</p> : null}
        <div className="att">{`${r.rating} out of 5${ago ? ` · ${ago}` : ''}`}</div>
      </div>
    );
  };

  // Radar label slots. Fixed positions, so the drawing can never collide
  // with itself no matter what the town names are.
  const SLOTS = [
    { x: 50, y: 66, lx: 54, ly: 56 },
    { x: 164, y: 72, lx: 156, ly: 62 },
    { x: 54, y: 156, lx: 58, ly: 178 },
    { x: 162, y: 152, lx: 152, ly: 174 },
  ];
  const townPins = townSet.map((t, i) => ({ ...SLOTS[i], label: t.toUpperCase() }));
  const labelW = (s: string) => Math.min(92, s.length * 5.4 + 14);

  return (
    <>
      {/* Live only. A preview is not a public business listing, so it
          carries no structured data even when the draft is published. */}
      {mode === 'live' && jsonLd ? (
        <script
          type="application/ld+json"
          // Escape < so a hostile display name can never close the tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
      ) : null}
      <div className="mp-paper-fallback" aria-hidden="true" />
      <main className="mp">
        {/* Preview only. Says what this link is, who can see it and that it
            takes no requests, before anything else on the page. */}
        {mode === 'preview' ? (
          <div className="mp-preview-ribbon" role="status">
            <div className="mp-wrap">
              Preview. Only someone with this link can see it, and it stops working in 30
              minutes. It is not taking requests.
            </div>
          </div>
        ) : null}

        {/* One slim line ABOVE everything. The full explanation lives in HOW
            MYKU WORKS and the eyebrow carries UNCONFIRMED, so three lines of
            preamble above the mechanic's own name buys nothing. */}
        {unclaimed ? (
          <div className="mp-claim">
            <div className="mp-wrap">
              Not claimed yet. Are you {first}? <a href={claimHref}>Claim this page</a>
            </div>
          </div>
        ) : null}

        <header className="mp-hdr">
          <div className="mp-hdr-in">
            {/* The mark does NOT navigate. It is the one thread tying this
                storefront back to the platform, but the Myku homepage
                recruits customers into a multi-quote flow that lists his
                competitors, and a visitor who arrived on a link HE shared
                must never be one tap from that. */}
            <span className="mp-brand">
              <span className="mp-tile">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Myku" width={30} height={30} />
              </span>
            </span>
            {unclaimed ? (
              <a className="mp-btn mp-btn-o mp-btn-sm mp-hdr-cta mp-mag" href={claimHref}>
                <span className="lbl">Claim this page</span>
              </a>
            ) : (
              <a className="mp-btn mp-btn-o mp-btn-sm mp-hdr-cta mp-mag" href="#quote">
                <span className="lbl">
                  Get a quote
                  <span className="mp-arrow" aria-hidden="true">
                    &#8594;
                  </span>
                </span>
              </a>
            )}
          </div>
        </header>

        {/* ============ HERO ============ */}
        <section className="mp-ink mp-hero">
          <StorefrontFx />
          <svg className="mp-hero-mark" viewBox="0 0 400 400" aria-hidden="true">
            <g fill="none" stroke="#F97316" strokeWidth="1.2">
              <circle cx="200" cy="200" r="198" />
              <circle cx="200" cy="200" r="162" />
              <circle cx="200" cy="200" r="112" />
              <circle cx="200" cy="200" r="64" />
              <circle cx="200" cy="200" r="22" />
              <g strokeWidth="2.4">
                <path d="M200 2v26M200 372v26M2 200h26M372 200h26" />
              </g>
              <g strokeWidth="1.4" opacity=".85">
                <path d="M200 38v16M200 346v16M38 200h16M346 200h16M92 92l12 12M296 296l-12-12M92 308l12-12M296 104l-12 12" />
              </g>
            </g>
          </svg>

          <div className="mp-wrap mp-hero-in">
            <div className="mp-hero-eyebrow">
              <p className="mp-eyebrow">
                {eyebrowBits.map((b, i) => (
                  <span key={b}>
                    {i > 0 ? <span className="sep"> · </span> : null}
                    {b}
                  </span>
                ))}
              </p>
              <span className="mp-ln" aria-hidden="true" />
            </div>

            {/* alt="" on purpose: the name is set directly beneath, and a
                screen reader must not hear it twice. */}
            {showPortrait && page.photo_url ? (
              <div className="mp-portrait">
                <Image
                  className="mp-portrait-img"
                  src={page.photo_url}
                  alt=""
                  width={96}
                  height={96}
                  unoptimized={!isSupabaseImage(page.photo_url)}
                  priority
                />
              </div>
            ) : null}

            <h1 className={nameClass}>
              <span>{nameLine1}</span>
              {nameLine2 ? <span className="r2">{nameLine2}</span> : null}
            </h1>

            {/* Only when the headline is the business: the person then gets
                his own line so the page still says who you are talking to. */}
            {bizName ? <p className="mp-person">{page.full_name}</p> : null}

            <svg className="mp-underink" viewBox="0 0 560 16" preserveAspectRatio="none" aria-hidden="true">
              <path pathLength="100" d="M4 11 C 90 4, 168 14, 252 8 S 420 3, 556 9" />
            </svg>

            <p className="mp-spec">{specLine}</p>

            {work || showAvailable ? (
              <div className="mp-meta">
                {work ? <span className="mp-pill">{work}</span> : null}
                {showAvailable ? (
                  <span className="mp-pill live">
                    <span className="mp-dot" aria-hidden="true" />
                    Taking new work
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mp-hero-cta">
              {unclaimed ? (
                <a className="mp-btn mp-btn-o mp-mag" href={claimHref}>
                  <span className="lbl">
                    Claim this page
                    <span className="mp-arrow" aria-hidden="true">
                      &#8594;
                    </span>
                  </span>
                </a>
              ) : (
                <a className="mp-btn mp-btn-o mp-mag" href="#quote">
                  <span className="lbl">
                    Get a quote
                    <span className="mp-arrow" aria-hidden="true">
                      &#8594;
                    </span>
                  </span>
                </a>
              )}
              {wall.length > 0 ? (
                <a className="mp-btn mp-btn-ghost mp-mag" href="#work">
                  <span className="lbl">See the work</span>
                </a>
              ) : null}
            </div>
          </div>

          {/* The panel ALWAYS renders. The money question is never silent. */}
          <div className="mp-facts">
            <div className="mp-wrap">
              <div className={`mp-facts-in n${strip.length || 1}`}>
                {strip.length > 0 ? (
                  strip.map((c) => (
                    <div className="mp-fact" key={c.caption}>
                      <span className="v">
                        <span className="mp-msk">
                          <i>{c.value}</i>
                        </span>
                        {c.unit ? <span className="u">{c.unit}</span> : null}
                      </span>
                      <span className="k">{c.caption}</span>
                    </div>
                  ))
                ) : (
                  // Zero cells: a positive statement about how the business
                  // prices, never a blank and never an "unavailable".
                  <div className="mp-fact fb">
                    {/* States how HE prices, and what MYKU does with a
                        request. It must not promise he will answer: Myku
                        cannot compel an independent business to reply. */}
                    {first} has not published a rate. Describe the job and Myku
                    passes it to {first}.
                  </div>
                )}
              </div>
              {factsNote ? <p className="mp-facts-note">{factsNote}</p> : null}
            </div>
          </div>
        </section>

        {/* ============ WORK ============ */}
        {wall.length > 0 ? (
          <section className="mp-work" id="work">
            <div className="mp-wrap">
              <div className="mp-sec-head mp-rv">
                <span className="mp-sec-num">{numWork}</span>
                <h2>The work</h2>
                <span className="mp-rule" aria-hidden="true" />
                <span className="mp-sec-meta tnum">{wall.length} listed</span>
              </div>
              <div className="mp-cards">{wall.slice(0, 10).map(jobCard)}</div>
              {wall.length > 10 ? (
                // Native <details>. Zero JavaScript, so the overflow opens
                // with scripting disabled.
                <details className="mp-more">
                  <summary>Show all {wall.length} jobs</summary>
                  <div className="mp-cards">{wall.slice(10).map(jobCard)}</div>
                </details>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ============ ABOUT ============ */}
        {hasAbout ? (
          <section className="mp-ink mp-bio">
            <svg className="mp-bio-mark" viewBox="0 0 400 400" aria-hidden="true">
              <g fill="none" stroke="#F97316" strokeWidth="1">
                <circle cx="200" cy="200" r="196" />
                <circle cx="200" cy="200" r="150" />
                <circle cx="200" cy="200" r="104" />
                <circle cx="200" cy="200" r="58" />
                <g strokeWidth="2">
                  <path d="M200 4v22M200 374v22M4 200h22M374 200h22" />
                  <path d="M62 62l16 16M338 62l-16 16M62 338l16-16M338 338l-16-16" />
                </g>
              </g>
            </svg>
            <div className="mp-wrap">
              {/* "About {first}", never "Who you get". The second is the
                  language of an assignment: it says Myku is sending you this
                  person and presupposes the job will happen. */}
              <div className="mp-sec-head mp-rv" style={{ color: '#fff' }}>
                <span className="mp-sec-num">{numAbout}</span>
                <h2>About {first}</h2>
                <span className="mp-rule" aria-hidden="true" />
              </div>

              <div className="mp-bio-inner">
                <div>
                  {bioParas.length > 0 ? (
                    <div className="mp-rv">
                      {bioParas.map((p, i) => (
                        <p className="mp-bio-p" key={i}>
                          {p}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {/* Paperwork. The qualification sits adjacent to the claim,
                      same size, same breath. That adjacency IS the feature:
                      never render one without the other. */}
                  {credentials.length > 0 ? (
                    <div className="mp-rv mp-rv-d1">
                      <div className="mp-cred">
                        <DocCheck />
                        <span>{credentials.join(' · ')}</span>
                      </div>
                      <p className="mp-qual">
                        Myku checked these documents. That is not a recommendation.
                      </p>
                    </div>
                  ) : null}

                  {/* Every href here passed the per-platform host allowlist
                      in socialLinks(); the label is Myku's word for where the
                      link goes, so the host must actually be that place. */}
                  {links.length > 0 ? (
                    <div className="mp-rv mp-rv-d1 mp-find">
                      <span className="k">Find {first} online</span>
                      <span className="v">
                        {links.map((l, i) => (
                          <span key={l.key}>
                            {i > 0 ? <span className="sep"> · </span> : null}
                            <a href={l.url} rel="noopener nofollow ugc" target="_blank">
                              {l.label}
                            </a>
                          </span>
                        ))}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div>
                  {hasArea ? (
                    <div className="mp-area mp-rv mp-rv-d2">
                      <div className="mp-area-head">
                        <span className="k">Service area</span>
                        <span className="mp-rule" aria-hidden="true" />
                      </div>

                      <div className="mp-area-in">
                        <div className="mp-radar" aria-hidden="true">
                          <svg viewBox="0 0 220 220" preserveAspectRatio="xMidYMid meet" role="presentation" focusable="false">
                            <defs>
                              {/* Knocks the rings and crosshair out from
                                  behind the labels so the geometry never
                                  strikes through the words. */}
                              <mask id="mp-rlab" maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="220">
                                <rect width="220" height="220" fill="#fff" />
                                {cityShort ? (
                                  <rect
                                    x={110 - labelW(cityShort) / 2}
                                    y={126}
                                    width={labelW(cityShort)}
                                    height="13"
                                    rx="6"
                                    fill="#000"
                                  />
                                ) : null}
                                {townPins.map((p) => (
                                  <rect
                                    key={p.label}
                                    x={p.lx - labelW(p.label) / 2}
                                    y={p.ly - 10}
                                    width={labelW(p.label)}
                                    height="13"
                                    rx="6"
                                    fill="#000"
                                  />
                                ))}
                              </mask>
                              <pattern id="mp-rdots" width="13" height="13" patternUnits="userSpaceOnUse">
                                <circle cx="1.3" cy="1.3" r="1" fill="rgba(214,222,232,.16)" />
                              </pattern>
                              <clipPath id="mp-rclip">
                                <circle cx="110" cy="110" r="92" />
                              </clipPath>
                            </defs>

                            <g clipPath="url(#mp-rclip)">
                              <rect x="0" y="0" width="220" height="220" fill="url(#mp-rdots)" />
                            </g>

                            <g mask="url(#mp-rlab)">
                              <path className="fld dr d1" pathLength="100" d="M110 20v70M110 130v70M20 110h70M130 110h70" />
                              <circle className="ring dr d2" pathLength="100" cx="110" cy="110" r="88" />
                              <circle className="ring dash fade" cx="110" cy="110" r="62" />
                              <circle className="ring dr d3" pathLength="100" cx="110" cy="110" r="36" />
                            </g>

                            <g className="fld fade" strokeWidth="1.4">
                              <path d="M110 14v10M110 196v10M14 110h10M196 110h10" />
                            </g>
                            <g className="fld fade" strokeWidth="1.2" opacity=".7">
                              <path d="M16 32V16h16M188 16h16v16M204 188v16h-16M32 204H16v-16" />
                            </g>

                            <g className="fade">
                              {townPins.map((p) => (
                                <g key={p.label}>
                                  <circle className="twn" cx={p.x} cy={p.y} r="2.8" />
                                  <text className="lbl-s" x={p.lx} y={p.ly} textAnchor="middle" fontSize="7.5">
                                    {p.label}
                                  </text>
                                </g>
                              ))}
                            </g>

                            <circle className="halo fade" cx="110" cy="110" r="15" strokeDasharray="2 5" />
                            <g className="acc" transform="translate(110,110) scale(.92) translate(-12,-13)">
                              <path className="dr d4" pathLength="100" d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
                              <circle className="dr d4" pathLength="100" cx="12" cy="10" r="2.7" />
                            </g>
                            {cityShort ? (
                              <text className="lbl-t fade" x="110" y="134" textAnchor="middle" fontSize="9">
                                {cityShort.toUpperCase()}
                              </text>
                            ) : null}
                          </svg>
                        </div>

                        <div className="mp-area-rows">
                          {/* The FULL city string, not the short form. */}
                          {city ? (
                            <div className="mp-arow">
                              <span className="k">Based in</span>
                              <span className="v">
                                <PinGlyph /> {city}
                              </span>
                            </div>
                          ) : null}
                          {work ? (
                            <div className="mp-arow">
                              <span className="k">How {first} works</span>
                              <span className="v">
                                <VanGlyph /> {work}
                              </span>
                            </div>
                          ) : null}
                          {/* Both labelled as HIS listing, like the
                              certifications row: typed hours and typed towns
                              are his claims, not Myku's confirmation. */}
                          {hours ? (
                            <div className="mp-arow">
                              <span className="k">Hours {first} lists</span>
                              <span className="v">{hours}</span>
                            </div>
                          ) : null}
                          {towns.length > 0 ? (
                            <div className="mp-arow">
                              <span className="k">Towns {first} covers</span>
                              <span className="v">{listOf(towns)}</span>
                            </div>
                          ) : null}
                          {/* Strictly available === true, so null and false
                              never fall through to "Taking new work". */}
                          {showAvailable ? (
                            <div className="mp-arow">
                              <span className="k">Status</span>
                              <span className="v">
                                <span className="mp-dot" aria-hidden="true" /> Taking new work
                              </span>
                            </div>
                          ) : null}
                          {years > 0 && !yearsInStrip ? (
                            <div className="mp-arow">
                              <span className="k">Years working</span>
                              <span className="v tnum">
                                {years} {years === 1 ? 'year' : 'years'}
                              </span>
                            </div>
                          ) : null}
                          {certs.length > 0 ? (
                            <div className="mp-arow">
                              {/* Labelled as HIS claim. The paperwork line in
                                  the other column is the only place Myku says
                                  it reviewed anything, and these typed names
                                  are not that. */}
                              <span className="k">Certifications {first} lists</span>
                              <span className="v">{certs.join(', ')}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* The one sentence that stops a range ring reading as
                          a coverage guarantee. Job provenance is NOT restated
                          here: the cards and the How Myku Works block already
                          carry it, and a third repetition made the page sound
                          like it was apologizing for its own mechanic. */}
                      <p className="mp-area-note">
                        A drawing, not a live map.{' '}
                        {townPins.length > 0
                          ? 'The pins are towns from jobs on this page. '
                          : ''}
                        Ask {first} about your address.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ============ SERVICES ============ */}
        {services.length > 0 ? (
          <section className="mp-services mp-grain" id="services">
            <div className="mp-wrap" style={{ position: 'relative' }}>
              <div className="mp-sec-head mp-rv">
                <span className="mp-sec-num">{numServices}</span>
                <h2>What {first} does</h2>
                <span className="mp-rule" aria-hidden="true" />
              </div>
              <div className="mp-srv-list">
                {/* A row with no price prints the name alone. A price is the
                    mechanic's own choice per service, and no price means he
                    chose not to say. The two kinds sit together without
                    apology, and the page never invents a "Quoted". */}
                {services.map((s) => (
                  <div className={s.priceFrom ? 'mp-srv mp-rv' : 'mp-srv np mp-rv'} key={s.label}>
                    <span className="n">{s.label}</span>
                    <span className="dots" aria-hidden="true" />
                    {s.priceFrom ? (
                      <span className="p">
                        from <b>${s.priceFrom}</b>
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ============ REVIEWS ============ */}
        {reviews.length > 0 ? (
          <section className="mp-reviews" id="reviews">
            <div className="mp-wrap">
              <div className="mp-sec-head mp-rv">
                <span className="mp-sec-num">{numReviews}</span>
                <h2>What people said</h2>
                <span className="mp-rule" aria-hidden="true" />
                {hasRating ? (
                  <span className="mp-sec-meta tnum">
                    {ratingNum.toFixed(1)} out of 5 · {reviewCount} review
                    {reviewCount === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
              <div className="mp-rev-list">{reviews.slice(0, 5).map(reviewCard)}</div>
              {reviews.length > 5 ? (
                // A DELTA, not a total: the query is capped at 20 while the
                // header prints the true review_count, so "Show all 20" under
                // "43 reviews" would read as a data error.
                <details className="mp-more">
                  <summary>Show {reviews.length - 5} more reviews</summary>
                  <div className="mp-rev-list">{reviews.slice(5).map(reviewCard)}</div>
                </details>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* ============ THE ASK ============ */}
        <section className="mp-ink mp-quote" id="ask">
          <span className="mp-anchor" id="quote" aria-hidden="true" />
          <div className="mp-glow" aria-hidden="true" />
          <div className="mp-wrap">
            {/* An unclaimed page is a PREVIEW: it exists so the mechanic can
                be shown his own page before he decides. He has not agreed to
                be listed and does not know it exists, so it must not take
                requests on his behalf. */}
            {unclaimed ? (
              <div className="mp-preview">
                <span className="mp-sec-num">{numAsk} · Preview</span>
                <h2 id="claim">This page is not live yet</h2>
                <p>
                  {first} has not claimed it, so it is not taking requests. The details here came
                  from public listings and none of them have been confirmed by {first}.
                </p>
                <p>
                  Are you {first}? Write to{' '}
                  <a href={claimMailto}>{SUPPORT_EMAIL}</a> and we hand you the keys. You decide
                  what the page says before anyone sees it.
                </p>
              </div>
            ) : mode === 'preview' ? (
              // The mechanic's own preview of a published-shaped page. Same
              // number, same heading, so he sees the shape of what visitors
              // get, but no live form: a preview takes no requests.
              <div className="mp-composer mp-composer-inert" aria-disabled="true">
                {numAsk ? <span className="mp-sec-num">{numAsk} · Your quote</span> : null}
                <h2>Get a price from {first}</h2>
                <p className="mp-lead">
                  Requests turn on when you publish. Visitors will pick the job and leave a
                  number here, and it lands in your Myku inbox.
                </p>
              </div>
            ) : (
              <div className="mp-composer">
                {/* His own words above the form. Live branch only: a page
                    that takes no requests has no business printing a note
                    about how to send one. */}
                {requestNote && !unclaimed ? (
                  <p className="mp-note">
                    <span className="k">A note from {first}</span> {requestNote}
                  </p>
                ) : null}
                {/* The heading and sub-line live INSIDE QuoteForm so the sent
                    state swaps the whole ask at once. Left here they would sit
                    above "Request sent." telling the visitor to fill in a form
                    that no longer exists. */}
                <QuoteForm
                  mechanicId={page.id}
                  slug={page.slug}
                  mechanicFirstName={first}
                  unclaimed={unclaimed}
                  sectionNum={numAsk}
                  services={services.map((s) => ({ name: s.label, priceFrom: s.priceFrom }))}
                />
              </div>
            )}

            <div className="mp-trust">
              <div className="mp-trust-h">
                {/* Info mark, never a shield or a check: this panel says Myku
                    does NOT vouch, and a protection badge would assert the
                    opposite of the sentence it introduces. */}
                <InfoMark w={1.9} />
                <h2>How Myku works</h2>
              </div>
              {howParas.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <div className="mp-wrap mp-ft">
            {/* No disclaimer down here. Ending the page on "does not endorse
                or guarantee" made the last word a warning, which reads as
                shady exactly where a visitor decides whether to trust the
                page. The full statement lives once, in How Myku Works,
                directly above. The footer just says whose page this is. */}
            <div className="note">
              {page.full_name}
              {cityShort ? ` · ${cityShort}` : ''}.{' '}
              {/* "His page" is an ownership claim, so a preview he has not
                  claimed cannot say it. */}
              {unclaimed ? 'A preview, hosted by ' : `${first}’s page, hosted by `}
              <Link href="/">Myku</Link>.
            </div>
            {/* No App Store badge on a mechanic's storefront. A customer's
                first job must never hit a download pitch: it costs the
                conversion, and the mechanic stops sharing a link that loses
                him work. The app is pitched on the customer's SECOND job.
                No phone number and no tel: link either. Contact runs through
                the composer. */}
            <div className="links">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/support">Support</Link>
              <a href={reportMailto}>Report this page</a>
            </div>
          </div>
        </section>

        {/* Sticky ask. Hidden whenever the hero or the composer is on screen,
            hidden entirely on desktop and after a successful send, and never
            rendered on a preview page, which takes no requests. It carries no
            numbers: the labor rate is the mechanic's own figure and must not
            repeat down the whole page in Myku's voice. */}
        {!unclaimed && mode === 'live' ? (
          <div className="mp-dock" id="mp-dock">
            <span className="note">
              Free to send
              <br />
              No account
            </span>
            <a className="mp-btn mp-btn-o" href="#quote">
              <span className="lbl">
                Get a quote
                <span className="mp-arrow" aria-hidden="true">
                  &#8594;
                </span>
              </span>
            </a>
          </div>
        ) : null}
      </main>
    </>
  );
}
