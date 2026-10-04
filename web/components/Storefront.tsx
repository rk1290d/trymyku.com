import Image from 'next/image';
import { resolveCity, townsWithin } from '@/lib/geo';
import { formatHours, parseHours } from '@/lib/hours';
import Link from 'next/link';
import StorefrontFx from '@/components/StorefrontFx';
import { timeAgo, money, firstName, workTypeLabel } from '@/lib/format';
import { SUPPORT_EMAIL, SITE_URL } from '@/lib/site';
import { socialLinks } from '@/lib/socials';
import { appFixUrl, pageGaps, GAP_JOBS_MIN, GAP_SERVICES_MIN } from '@/lib/gaps';
import type { PageGap, PageGapKey } from '@/lib/gaps';
import type { PageData } from '@/lib/pageData';
import { isSampleId, pitchSamples, samplePrice } from '@/lib/samples';
import Hero from '@/components/vd/Hero';
import { BodySections, Footer, SampleNotice } from '@/components/vd/Body';
import Viewer from '@/components/vd/Viewer';
import Request from '@/components/vd/Request';
import Dock from '@/components/vd/Dock';
import { vdSign, vdText, vdVoice } from '@/components/vd/fonts';
import { MONTHS, month as vdMonth, moneyOrNull, type BodyInput } from '@/lib/vd/body';
import { planHero, T as VD, type HeroInput, type ProofCell, type WorkType } from '@/lib/vd/hero';

// The smallest confirmed-job count the fact strip will print. Mirrors
// MIN_JOBS_SHOWN in the app (constants/config.ts) so the page and the app
// never disagree about whether his ledger is big enough to show.
const MIN_JOBS_SHOWN = 3;

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

// The empty portrait slot on a preview. A featureless silhouette on purpose:
// it stands for "a photo goes here", and it must not look like a person, an
// initial or a placeholder avatar the page might have chosen for him.
function PersonGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.4" r="3.9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  /** A pitch sample from lib/samples.ts, labelled "Sample" in its chip slot. */
  sample: boolean;
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
    return u.protocol === 'https:' && u.hostname === 'fioiaoxaozqfwdqukoho.supabase.co';
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
   SERVICE-AREA LABEL LAYOUT

   The drawing places every town pin at its REAL distance and REAL bearing
   from the mechanic's city, and the outer ring is the radius he lists. That
   is the whole point of it and none of it is negotiable here: this file must
   never move a pin to make the picture prettier.

   It follows that a page with no radius gets no rings and no pins, not a
   decorative set of them. Both are gated on `toScale` in the component below,
   which is the same flag that lets the caption say "drawn to scale", so the
   drawing and the sentence under it cannot disagree. Everything in this block
   describes the drawing WHEN IT IS DRAWN TO SCALE; there is no other kind.

   But a pin's position and a pin's NAME are two different things. Oak Brook's
   five nearest towns are all under four miles out inside a 25-mile ring, so on
   an 88-unit plate the five pins land inside a box 13 units across, and the
   five names, up to 94 units wide each, printed on top of each other and on
   top of the home city. Live on trymyku.com/fort-nite it read as one smear.

   So the names get laid out properly while the pins stay exactly where the
   arithmetic put them: each name is pushed along its own town's bearing until
   its box is clear of every other box, and a hairline leader ties it back to
   its dot once it has actually moved. A name that cannot find room on its own
   bearing takes the nearest free spot anywhere on the plate instead, because
   the DOT is what carries the claim and the leader still points at the right
   one. Nothing is claimed that was not claimed before, and the radar keeps its
   drawn-in, stylised character.

   TWO RULES THE SEARCH KEEPS, AND WHY EACH ONE IS THERE.

   1. A NAME IS NEVER BLOCKED BY ITS OWN DOT. The other four pins, the home
      city label and the centre glyph are obstacles for it; its own pin is not.
      Seeding a label's own dot into the obstacle list meant any name lying
      more east-west than north-south had to clear roughly half its own width
      from the pin it belongs to before a candidate was accepted, so names
      travelled and grew leaders on maps that had all the room in the world. A
      name sitting over its own dot is the pairing this drawing wants.

   2. A NAME NEVER LEAVES THE PLATE. townsWithin() only ever returns towns
      INSIDE the ring, and the caption under the drawing says exactly that, so
      a town name printed out past the ring invites the one reading the caption
      denies. Every candidate box has to fit inside the drawn plate, corners
      included. A name that fits nowhere is dropped WITH its dot, because an
      unnamed grey dot is a mark that says nothing at all.
   ------------------------------------------------------------------ */

// The outer ring IS the radius. Everything else is measured against it, so a
// pin's distance from the centre is its real distance, to scale.
const R_OUTER = 88;
// The drawn plate: the dot field is clipped to this circle and the ring he
// lists sits 4 units inside it. Label boxes are held inside it, corners and
// all, so no name is printed in the margin outside his own coverage.
const R_PLATE = 92;

// Advance width per character, in SVG user units, for the two label styles in
// profile.css. Both are var(--mp-mono) so a glyph is 0.6em wide: .lbl-s is
// font-size 7.5 with letter-spacing 1.5 (4.5 + 1.5), .lbl-t is font-size 9
// with letter-spacing 1.9 (5.4 + 1.9). The old estimate was 5.4/char under a
// hard 92-unit cap, which sat BELOW the real width of a sixteen-character
// town, so the knockout masks were narrower than the words they cleared.
const CH_S = 6.0;
const CH_T = 7.3;
const LINE_H = 9.2;

type LBox = { x: number; y: number; w: number; h: number };

// Centre-anchored overlap test with a breathing gap.
function boxHits(a: LBox, b: LBox, gap = 2.5): boolean {
  return (
    Math.abs(a.x - b.x) * 2 < a.w + b.w + gap * 2 &&
    Math.abs(a.y - b.y) * 2 < a.h + b.h + gap * 2
  );
}

// The home-city label under the centre glyph. Fixed position, so it is an
// obstacle every town label has to route around rather than one that moves.
function cityLabelBox(cityUpper: string): LBox {
  return { x: 110, y: 132.5, w: cityUpper.length * CH_T + 10, h: 13 };
}

// How far the box's FARTHEST corner sits from the centre of the plate. A
// centre-distance test would let a wide name hang half of itself over the
// edge, which is the version a reader actually sees.
function cornerReach(b: LBox): number {
  return Math.hypot(Math.abs(b.x - 110) + b.w / 2, Math.abs(b.y - 110) + b.h / 2);
}

// "WESTERN SPRINGS" sets 90 units wide on one line, which is more than a
// third of the 220-unit plate; stacked on two lines its widest word is 42.
// Two lines keep a long town name inside the plate at full size, instead of
// shrinking the type or truncating a real place name.
function splitLabel(s: string): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [s];
  let cut = 1;
  let best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const wide = Math.max(
      words.slice(0, i).join(' ').length,
      words.slice(i).join(' ').length
    );
    if (wide < best) {
      best = wide;
      cut = i;
    }
  }
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

type RawPin = { x: number; y: number; r: number; a: number; label: string };
// Only pins that found a slot come back, so `lines` is never empty here: a
// named pin is information, and a bare grey dot with nothing beside it is a
// mark the reader cannot resolve into anything.
type PlacedPin = {
  x: number;
  y: number;
  label: string;
  lines: string[];
  lx: number;
  ly: number;
  w: number;
  h: number;
  baseline: number;
  leader: { x1: number; y1: number; x2: number; y2: number } | null;
};

function layoutTownLabels(pins: RawPin[], cityUpper: string | null): PlacedPin[] {
  const taken: LBox[] = [];
  if (cityUpper) taken.push(cityLabelBox(cityUpper));
  // The centre map-pin glyph and its halo. A town name parked on the
  // mechanic's own location is the one collision the rings cannot hide.
  taken.push({ x: 110, y: 108, w: 34, h: 36 });
  // The dots, kept SEPARATE from the fixed obstacles and indexed by pin, so a
  // name can be tested against every dot except the one it belongs to. Rule 1
  // in the block above: a name is never blocked by its own pin.
  const dots: LBox[] = pins.map((p) => ({ x: p.x, y: p.y, w: 9, h: 9 }));

  // Outermost first. A pin that already sits near the ring has room where it
  // is and keeps it; the crushed inner pins are the ones that have to travel.
  const order = pins.map((_, i) => i).sort((i, j) => pins[j].r - pins[i].r);
  const placed: PlacedPin[] = pins.map((p) => ({
    x: p.x,
    y: p.y,
    label: p.label,
    lines: [],
    lx: p.x,
    ly: p.y,
    w: 0,
    h: 0,
    baseline: p.y,
    leader: null,
  }));

  for (const i of order) {
    const p = pins[i];
    const lines = splitLabel(p.label);
    const w = Math.max(...lines.map((l) => l.length)) * CH_S + 9;
    const h = lines.length * LINE_H + 5;
    // Candidate distances from the centre, along the town's OWN bearing so the
    // name stays in the direction the town actually lies in. Outward first for
    // a pin crushed near the middle, inward first for one already out by the
    // ring. The opposite direction is then tried too, and after that the whole
    // plate: a real place name is never dropped while a slot for it exists.
    const dir = p.r > R_OUTER * 0.55 ? -1 : 1;
    const off = 8 + h / 2;
    const ladder: number[] = [];
    for (let step = 0; step < 7; step++) ladder.push(p.r + dir * (off + step * 13));
    for (let step = 0; step < 7; step++) ladder.push(p.r - dir * (off + step * 13));

    // Everything this name has to miss. Its OWN dot is not on the list.
    const clear = (cand: LBox, gap: number) =>
      taken.every((t) => !boxHits(cand, t, gap)) &&
      dots.every((d, j) => j === i || !boxHits(cand, d, gap));

    // FIRST CHOICE: on the town's own bearing, nearest rung first, so the name
    // sits in the direction the town actually lies in. Rule 2 is enforced by
    // cornerReach on every candidate: no part of the name may sit outside the
    // drawn plate. That also keeps every box inside the 220 viewBox, so the
    // old square clamp is gone with it; that clamp used to slide a box off its
    // own bearing, which left the leader pointing at nothing in particular.
    let box: LBox | null = null;
    search: for (let k = 0; k < ladder.length; k++) {
      // The very first candidate sits just off its own pin, on its own
      // bearing, unskewed. Only a name that cannot find room on its own
      // bearing gets skewed off it, and never by more than 32 degrees.
      for (const skew of k === 0 ? [0] : [0, 16, -16, 32, -32]) {
        const ang = p.a + skew * (Math.PI / 180);
        const rad = Math.max(0, ladder[k]);
        const cand: LBox = { x: 110 + rad * Math.cos(ang), y: 110 + rad * Math.sin(ang), w, h };
        if (cornerReach(cand) > R_PLATE) continue;
        if (clear(cand, 2.5)) {
          box = cand;
          break search;
        }
      }
    }

    // SECOND CHOICE: anywhere on the plate at all, closest to its own dot
    // first, then closest again with the boxes allowed to touch.
    //
    // A name that has left its own bearing is still tied to the right dot by
    // its leader, and the dot is what carries the claim; a name that has been
    // deleted carries nothing. Losing the bearing is a cost to the picture,
    // losing the town is a cost to the reader, and the reader wins.
    if (!box) {
      const anywhere: LBox[] = [];
      for (let rad = 0; rad <= R_PLATE; rad += 6) {
        for (let deg = 0; deg < 360; deg += 15) {
          const ang = deg * (Math.PI / 180);
          const cand: LBox = { x: 110 + rad * Math.cos(ang), y: 110 + rad * Math.sin(ang), w, h };
          if (cornerReach(cand) > R_PLATE) continue;
          anywhere.push(cand);
        }
      }
      anywhere.sort(
        (a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)
      );
      box = anywhere.find((c) => clear(c, 2.5)) ?? anywhere.find((c) => clear(c, 0)) ?? null;
    }

    // Nowhere on the plate this name fits. The dot goes with it (filtered out
    // below): a dot with no name is a mark the reader cannot resolve.
    if (!box) continue;
    taken.push(box);

    // Leader from just outside the dot to the edge of the name's box, drawn
    // only when the name actually travelled.
    const dx = box.x - p.x;
    const dy = box.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const tx = Math.abs(dx) > 1e-6 ? box.w / (2 * Math.abs(dx)) : Infinity;
    const ty = Math.abs(dy) > 1e-6 ? box.h / (2 * Math.abs(dy)) : Infinity;
    const back = Math.min(tx, ty, 1);
    const x1 = p.x + (dx / len) * 4.8;
    const y1 = p.y + (dy / len) * 4.8;
    const x2 = box.x - dx * back;
    const y2 = box.y - dy * back;
    // A name allowed to sit ON its own dot has no travel to draw, and the
    // segment computed above would fall INSIDE the box and run a hairline
    // behind the letters. This is the pairing the drawing wants; it needs no
    // leader to explain it.
    const dotInsideBox = Math.abs(dx) * 2 <= box.w && Math.abs(dy) * 2 <= box.h;

    placed[i] = {
      ...placed[i],
      lines,
      lx: box.x,
      ly: box.y,
      w,
      h,
      // Optical centring: cap height at 7.5 is about 5.4, so the single-line
      // baseline sits 2.7 below the box centre.
      baseline: box.y + 2.7 - ((lines.length - 1) * LINE_H) / 2,
      leader:
        !dotInsideBox && Math.hypot(x2 - x1, y2 - y1) > 4.5 ? { x1, y1, x2, y2 } : null,
    };
  }

  // Named pins only. A pin that found no slot never reaches the drawing, so
  // nothing downstream has to ask whether a pin has a name.
  return placed.filter((p) => p.lines.length > 0);
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
  appLinks = false,
}: {
  data: PageData;
  mode?: 'live' | 'preview';
  /** iPhone only, decided by the preview route. Adds the myku:// deep link
   *  beside each marker; everywhere else the path is printed in words. */
  appLinks?: boolean;
}) {
  const { page, services: rawServices, shared: realShared, verified, reviews: realReviews } = data;

  // PITCH SAMPLES (lib/samples.ts, 2026-09-23). An unclaimed page is the pitch
  // to the one man it was built for, so the slots he has nothing in are filled
  // with LABELLED examples of what a full page looks like: work, reviews, a
  // rate. Never stored, never on a published page, never in the structured
  // data below, and a real row always wins over a sample.
  const pitch = page.web_status !== 'published' ? pitchSamples(data) : null;
  const shared = realShared.length === 0 && pitch ? pitch.shared : realShared;
  // HIS REAL PUBLIC RATING (migration 151, pitch pages only): the aggregate of
  // his reviews on another site, plus up to three highlights Myku wrote as a
  // summary. Real beats sample, so when it exists the sample reviews do not
  // render. Validated here as well as by the column's CHECK.
  const pr = page.web_status !== 'published' ? page.public_rating : null;
  const publicRating =
    pr && /^https:\/\//.test(pr.url) && Number(pr.rating) > 0 && Number(pr.count) > 0
      ? {
          source: String(pr.source),
          rating: Number(pr.rating),
          count: Number(pr.count),
          url: pr.url,
          highlights: (pr.highlights ?? []).filter((h) => typeof h === 'string' && h.trim()).slice(0, 3),
        }
      : null;
  // HIS LIVE GOOGLE REVIEWS (migration 152): Google's own feed, shown as Google
  // returns them (every review it returns, bad ones included, credited to
  // Google and to their authors), never stored by Myku. The best evidence a
  // page can carry short of reviews earned on Myku, so it outranks the rating
  // summary above and the samples.
  const google = data.google && data.google.reviews.length > 0 ? data.google : null;
  const rawReviews =
    realReviews.length === 0 && pitch && !publicRating && !google ? pitch.reviews : realReviews;

  // Non-empty services only. A blank service string renders an empty ruled
  // row, the "empty box with a heading" the brief forbids, reached through a
  // data shape rather than a missing section. (Reviews are handled below and
  // follow a different rule: a wordless rating is still a review.)
  // Dedupe by trimmed name, first row wins its price. A null price prints the
  // name alone. WHO chose that price depends on the page: on a published page
  // it is the mechanic's own figure out of his own editor, and on an unclaimed
  // page Myku typed it off a listing. This pass does not know which, so it
  // says nothing about authorship; the source line under the rendered list
  // does (see `servicesSource`).
  const seen = new Map<string, number | null>();
  for (const row of rawServices) {
    const label = (row.service ?? '').trim();
    if (!label || seen.has(label)) continue;
    const p = typeof row.price_from === 'number' && row.price_from > 0 ? row.price_from : null;
    seen.set(label, p);
  }
  const services = Array.from(seen, ([label, priceFrom]) => ({ label, priceFrom }));
  // DISPLAY ONLY (lib/samples.ts): on a pitch page, a listed service with no
  // price shows a sample "from" price, and the source line under the list says
  // so. `services` itself stays real, because it is what the quote form offers
  // a customer, and a request must never be priced by a number Myku invented.
  const shownServices = pitch
    ? services.map((s) => (s.priceFrom ? s : { ...s, priceFrom: samplePrice(s.label) }))
    : services;
  const samplePriced = pitch !== null && shownServices.some((s, i) => s.priceFrom && !services[i].priceFrom);
  // A review is a rating; the words are optional (the app lets a customer
  // submit stars alone). Every rated row is kept, so a star-only review gets a
  // card carrying its rating and date and no quote, and the number of cards on
  // the page is the number the page claims. Dropping the textless ones while
  // still counting them let the page say "3 reviews" over two cards.
  const reviews = rawReviews
    .map((r) => ({ ...r, text: r.text?.trim() || null }))
    .filter((r) => r.rating > 0);

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
      sample: false,
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
      sample: isSampleId(j.id),
    })),
  ].sort((a, b) => b.ts - a.ts);

  const first = firstName(page.full_name);
  const ratingNum =
    typeof page.rating === 'string' ? parseFloat(page.rating) : page.rating ?? 0;
  // Counted from the rows actually fetched, NOT from page.review_count. The
  // stored counter is a trigger-maintained column that survives deleted rows
  // and seeded profiles, so a page could print "94 reviews" over an empty
  // section, and hand the same figure to search engines in the JSON-LD below.
  // The app applies the same rule (reviewCountUnbacked in app/mechanic/[id]):
  // when the counter and the rows disagree, the rows win. The fact-strip cell,
  // the reviews heading and the aggregateRating all key off these two values,
  // so none of them can claim a review the page does not show.
  // Both sources now cap at 100 (getReviews in lib/supabase for the live page,
  // the web_preview_bundle RPC for the mechanic's own preview), so the preview
  // and the live page print the same figure. Both are honest counts of cards
  // actually rendered.
  const reviewCount = reviews.length;
  const hasRating = reviewCount > 0 && ratingNum > 0;
  // DISPLAY ONLY. Pitch-sample reviews get an average for the strip and the
  // reviews heading, labelled Sample in both. `hasRating` stays false for them
  // (page.rating is 0 on a page with no real reviews), and it is `hasRating`
  // alone that feeds the aggregateRating handed to search engines.
  const sampleReviews = reviewCount > 0 && reviews.every((r) => isSampleId(r.id));
  const sampleRating = sampleReviews
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;
  const work = workTypeLabel(page.work_type);
  const city = page.service_city?.trim() || null;
  const cityShort = city?.split(',')[0]?.trim() || null;
  // Fail CLOSED: any unexpected status is treated as unclaimed.
  const unclaimed = page.web_status !== 'published';
  // AVAILABILITY IS NOT PAGE CONTENT, AND MUST NOT COME BACK HERE.
  // "Available now" is an operational doorbell inside the app: it governs
  // whether the mechanic shows up in the app's browse list and on its map,
  // and whether a new booking, quote request or first message can reach him.
  // This page is his resume. Whether he is taking work today has nothing to
  // do with it, so nothing on this page reads, derives or renders that flag:
  // no hero pill, no status row, and no hidden participation in whether a
  // section renders. It is not a column on MechanicPage either.
  const verifiedCount = wall.filter((j) => j.verified).length;
  const hasSharedJob = wall.some((j) => !j.verified);

  /* ── THE BEFORE AND AFTER  ::  ONE GATE, AND IT IS THIS LINE ─────────────
     Rohaan, 2026-09-09: the preview should show a mechanic what a section
     WOULD look like filled in, so a page that degrades gracefully stops
     hiding the gap from the only person who can close it.

     THIS IS THE ONLY PLACE THE FEATURE IS SWITCHED ON, on purpose. Every
     ghost below is keyed on `gap(...)`, which reads this array and nothing
     else, so on a live page and on an unclaimed page the array is empty and
     not one byte of ghost markup exists. There is exactly one condition to
     get right rather than a dozen scattered `mode === 'preview'` tests that
     drift apart.

     WHY BOTH HALVES OF THE CONDITION:
     - `mode === 'preview'` because a customer he sent the link to must never
       see his page annotated with what he has not done. VISION.md: a thin
       page loses him the customer and loses us the mechanic. A page dressed
       in sample content would be worse than a thin one, because it would be
       a page that lies.
     - `!unclaimed` because a holder draft belongs to a man who does not know
       it exists. There is nobody to send to an editor, and the page already
       carries the claim panel, which is the only thing it can honestly ask.

     TRIED AND REVERTED, 2026-09-22: switching the ghosts on for unclaimed
     pages, on the theory that a recruiting page IS sent to the man himself.
     It made the pitch worse, not better. The ledger speaks to an owner, so
     the first line of the first page a recruited mechanic ever sees became
     "Your page is missing 9 things", and the hero led with "Add a photo of
     yourself" and an app path he has no account for. A pitch cannot open by
     listing what is wrong with him. The thin-page problem is real; the fix
     is content the page can honestly carry (see the ad band below), not an
     editing aid pointed at a stranger.

     The deploy check that proves it: `curl trymyku.com/<any-slug> |
     grep -c mp-gap` must be 0, and > 0 on a fresh preview token. */
  const gaps: PageGap[] = mode === 'preview' && !unclaimed ? pageGaps(data) : [];
  // Narrowed by key, so `gap('numbers')` and `gap('services')` hand back the
  // `sub` that key carries, typed, and the renderer never re-derives from the
  // rows a case the gap list has already decided.
  const gap = <K extends PageGapKey>(k: K) =>
    gaps.find((g): g is Extract<PageGap, { key: K }> => g.key === k);
  const numbersGap = gap('numbers');

  // The tag that makes a ghost unmistakable. NEVER a check mark and never
  // `.ver`: a check on this page means Myku confirmed a job, and the teal is
  // the one semantic colour on it. Orange is Myku's own voice, which is
  // exactly what a labelled example is: Myku talking to him about his page,
  // not the page making a claim about him.
  // The `gaps.length` test is belt and braces, and deliberately so. Every
  // caller is already inside a `gap(...)` branch, but this tag is the one
  // piece of ghost markup that is not itself a gap check, and a future edit
  // that drops one would print EXAMPLE on a real page. It cannot: with no
  // gaps there is no tag, on any route.
  const gapTag = (text = 'Example') =>
    gaps.length === 0 ? null : <span className="mp-gap-tag">{text}</span>;

  // The line under every ghost. It names the screen in words (works on any
  // device) and, on an iPhone, adds the one-tap route into that same editor.
  // Without the route this feature is nagging; with it, it closes the loop.
  //
  // THE ROUTE HAS TO LOOK LIKE ONE. Rohaan, 2026-09-11, on his own preview:
  // only one "Open in the app" was a different colour, and every other one
  // "is the same color as the rest of the text... I thought it was just
  // text." A CSS specificity loss had coloured it like the sentence around it
  // in most sections (see .mp a.mp-gap-open in profile.css). The arrow is the
  // same glyph every CTA on this page ends in, so it reads as "tap this" in
  // the page's own vocabulary, and it sits inside the link so the two can
  // never wrap apart.
  const gapFix = (k: PageGapKey, lead: string, extra?: string) => {
    const g = gap(k);
    if (!g) return null;
    return (
      <p className="mp-gap-fix">
        {extra ? `${extra} ` : ''}
        {g.appPath ? `${lead} ${g.appPath}.` : lead}
        {appLinks && g.fix ? (
          <>
            {' '}
            <a className="mp-gap-open" href={appFixUrl(g.fix)}>
              Open in the app
              <span className="mp-arrow" aria-hidden="true">
                &#8594;
              </span>
            </a>
          </>
        ) : null}
      </p>
    );
  };

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
  // "Unconfirmed" left the eyebrow on 2026-09-23 with the rest of the preview
  // furniture: an unclaimed page is now the pitch and reads as a live page.
  // Its honesty moved to where the content is: "Sample" on every example, the
  // "From public listings" line under what came from his listing, and the How
  // Myku Works paragraph that explains both.
  const eyebrowBits = [
    cityShort ? `Mechanic · ${cityShort}` : 'Independent mechanic',
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
  // Structured hours win over the legacy typed line, so a mechanic who used
  // the picker gets a generated sentence and anyone who typed one before the
  // picker existed keeps theirs. Minutes are stored, not English, so slice 8
  // can render this same value in Spanish.
  const hours =
    formatHours(parseHours(page.hours_json), {
      day: { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' },
      appointment: 'By appointment',
      closed: 'Closed',
      range: (a, b) => `${a} to ${b}`,
      span: (a, b) => `${a} to ${b}`,
      use24: false,
    }) ||
    page.hours_note?.trim() ||
    null;
  // Typed by the mechanic for the rows only. NOT fed to the radar: the pins
  // stay job-derived, so the drawing never asserts coverage he merely listed.
  const towns = (page.service_towns ?? []).map((t) => (t ?? '').trim()).filter(Boolean);
  const requestNote = page.request_note?.trim() || null;
  const links = socialLinks(page.socials);

  // A ROW LABEL THAT NAMES AN AUTHOR HAS TO NAME THE RIGHT ONE.
  //
  // "Hours {first} lists" and "Towns {first} covers" say the mechanic put them
  // there, and on a published page he did, out of his own editor. On an
  // unclaimed page he did not: Myku typed them off a listing for a man who
  // does not know the page exists, so the label names the DATUM and stops. The
  // claim strip at the top, the Unconfirmed eyebrow, How Myku Works and the
  // preview panel already say where all of it came from; what they cannot
  // undo is a label that puts the words in his mouth.
  //
  // The line this draws, everywhere on an unclaimed page: a label may name the
  // mechanic as the SUBJECT ("How {first} works", "About {first}"), never as
  // the AUTHOR ("{first} lists", "{first} covers", "{first}'s own numbers").
  const hoursLabel = unclaimed ? 'Hours in the listing' : `Hours ${first} lists`;
  const townsLabel = unclaimed ? 'Towns in the listing' : `Towns ${first} covers`;
  // The bio is the one block written in the first person, so on an unclaimed
  // page it reads as a direct quotation from a man who has never used the
  // product. Same sourcing sentence as the job cards, directly under the words
  // it qualifies, the way the paperwork qualification sits under the paperwork.
  const bioSource = unclaimed ? 'From public listings. Myku has not confirmed it.' : null;

  // THE PRICE LIST IS THE SAME FAULT AS THE FACT STRIP, ONE SECTION LOWER.
  //
  // "What {first} does" names him as the SUBJECT, which is allowed, but the
  // rows under it print dollar figures, and a price with no source beside it
  // reads as the price its subject set. On a published page it is: those
  // numbers came out of his own editor. On an unclaimed page Myku copied them
  // off a listing for a man who has never seen the page, so the section was
  // showing Myku's numbers as his, three screens after the page said he has
  // confirmed nothing on it.
  //
  // The rows KEEP RENDERING, for the reason the fact strip keeps rendering:
  // hiding the money question makes the page less useful without making it
  // more honest, and an unclaimed page exists so the mechanic can be shown
  // what Myku built for him. Only the sourcing changes, and it changes to the
  // sentence the fact strip, the job cards and the bio already carry, so the
  // page has ONE way of saying "Myku copied this from a listing".
  const servicesSource = unclaimed
    ? samplePriced
      ? 'Services from public listings, prices are samples. Myku has not confirmed them.'
      : 'From public listings. Myku has not confirmed them.'
    : null;

  // FACT STRIP, fixed priority order, maximum 4 cells. The panel always
  // renders: the money question is never silent. `self` marks the cells the
  // mechanic typed himself, which the note below the strip then attributes.
  const cells: { value: string; unit?: string; caption: string; self?: boolean }[] = [];
  if ((page.hourly_rate ?? 0) > 0)
    cells.push({ value: `$${page.hourly_rate}`, unit: '/hr', caption: 'Labor rate', self: true });
  else if (pitch)
    cells.push({ value: `$${pitch.rate}`, unit: '/hr', caption: 'Labor rate · Sample' });
  if ((page.diagnostic_fee ?? 0) > 0)
    cells.push({ value: `$${page.diagnostic_fee}`, caption: 'Diagnostic', self: true });
  if (hasRating)
    cells.push({
      value: ratingNum.toFixed(1),
      caption: `${reviewCount} review${reviewCount === 1 ? '' : 's'}`,
    });
  else if (google)
    cells.push({ value: google.rating.toFixed(1), caption: `${google.count} reviews on Google` });
  else if (publicRating)
    cells.push({
      value: publicRating.rating.toFixed(1),
      caption: `${publicRating.count} reviews on ${publicRating.source}`,
    });
  else if (sampleRating > 0)
    cells.push({ value: sampleRating.toFixed(1), caption: `${reviewCount} reviews · Sample` });
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
  // Same floor as the app (MIN_JOBS_SHOWN in the app's constants/config.ts):
  // a count under three is withheld. "1 | Job through Myku" in the page's
  // most authoritative slot reads as a mechanic who has barely worked, and the
  // app already refuses to print it; the page he actually shares must not be
  // the one surface that does.
  if (verifiedCount >= MIN_JOBS_SHOWN)
    cells.push({
      value: String(verifiedCount),
      caption: 'Jobs through Myku',
    });
  const strip = cells.slice(0, 4);
  // Never print a fact twice: the About rows only carry years when the strip
  // had no room for it.
  const yearsInStrip = strip.some((c) => c.caption.endsWith('working'));

  // GHOST CELLS. A ghost NEVER displaces a real cell: it takes what is left of
  // the four slots after his own numbers have taken theirs, so the strip he is
  // looking at is still the strip a visitor gets, with the empty slots drawn
  // in. Only the rate and the years get a cell; the work type has no number to
  // show and is illustrated as an About row instead.
  const ghostCells: { value: string; unit?: string; caption: string }[] = [];
  if (numbersGap?.sub?.rate) ghostCells.push({ value: '$85', unit: '/hr', caption: 'Labor rate' });
  if (numbersGap?.sub?.years) ghostCells.push({ value: '12', unit: 'yrs', caption: 'Years working' });
  const ghostStrip = ghostCells.slice(0, Math.max(0, 4 - strip.length));
  // Same rule as yearsInStrip, one line down: a years ghost that found room up
  // here must not be drawn a second time in the About rows.
  const yearsGhostInStrip = ghostStrip.some((c) => c.caption === 'Years working');

  // The rate, the fee and the years sit directly under the Myku mark. The page
  // is scrupulous about his work history two screens down; it must not be
  // silent about where his numbers came from here.
  const selfBits: string[] = [];
  if (strip.some((c) => c.caption === 'Labor rate')) selfBits.push('the labor rate');
  if (strip.some((c) => c.caption === 'Diagnostic')) selfBits.push('the diagnostic fee');
  if (yearsInStrip) selfBits.push('the years working');
  // THE NOTE NAMES THE SOURCE, AND THE SOURCE IS NOT THE SAME ON BOTH PAGES.
  //
  // On a published page these three came out of the mechanic's own editor, so
  // "{first}'s own numbers" is simply true. On an UNCLAIMED page they did not:
  // Myku typed them off a public listing onto a page the man has never seen.
  // Captioning them as his made the product assert something he never said,
  // by name, on a page that says in four other places that he has confirmed
  // nothing on it. Migration 088 refuses to stamp a holder draft for exactly
  // this reason, and mp_fact_visible cannot tell "he typed 85" from "Myku
  // typed 85": web_status can, so the renderer is the only layer that can put
  // this right.
  //
  // The cells KEEP RENDERING. Hiding the money question would make the page
  // less useful without making it more honest, and an unclaimed page exists so
  // the mechanic can be shown what Myku built for him. Only the attribution
  // changes, and it changes to the same sentence the job cards already carry,
  // so the page does not contradict itself one screen apart.
  const factsNote = !selfBits.length
    ? null
    : unclaimed
      ? 'From public listings. Myku has not confirmed them.'
      : `${first}’s own numbers.`;

  // Zero cells. The panel still says something positive about how the business
  // prices, and never goes blank.
  //
  // The published wording says what HE has not done and what MYKU will do with
  // a request. Neither half is true on an unclaimed page: he has not published
  // anything anywhere, and the page takes no requests, so "describe the job"
  // points at a composer that three screens down says it is not live yet.
  const stripFallback = unclaimed
    ? `No rate in the public listing. Ask ${first} about pricing.`
    : `${first} has not published a rate. Describe the job and Myku passes it to ${first}.`;

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
  // The panel is worth drawing only when it has something to say, and only
  // real area content counts. This test used to treat availability as one of
  // those reasons, so a mechanic with no city, no work type, no hours and no
  // towns still got a Service area block on the strength of a doorbell flag.
  const hasArea =
    Boolean(city) ||
    Boolean(work) ||
    townSet.length > 0 ||
    Boolean(hours) ||
    towns.length > 0;

  const hasAbout =
    bioParas.length > 0 ||
    hasArea ||
    years > 0 ||
    certs.length > 0 ||
    credentials.length > 0 ||
    links.length > 0;

  // WHICH GHOSTS THE ABOUT BAND HAS TO HOLD. A section that renders only
  // because of them is marked with .mp-gap-sec, so "show the page as visitors
  // see it" takes the whole frame away rather than leaving an empty heading
  // over nothing, which is the one thing that view must never show.
  const workTypeGhost = Boolean(numbersGap?.sub?.workType) && !work;
  const yearsGhost = Boolean(numbersGap?.sub?.years) && !yearsInStrip && !yearsGhostInStrip;
  const hasAreaGhost =
    Boolean(gap('city')) || Boolean(gap('hours')) || Boolean(gap('radius')) || workTypeGhost || yearsGhost;
  const hasAboutGhost =
    hasAreaGhost || Boolean(gap('bio')) || Boolean(gap('verify')) || Boolean(gap('links'));

  // The disclosure never defines a mark that does not appear on this page.
  const howParas: string[] = [
    // THIS ONE NAMES HIM AS THE AUTHOR, so it splits like every other label on
    // the page. "{first} sets the prices" is simply true on a published page:
    // the rate, the fee and every service price came out of his own editor. On
    // an unclaimed page it is not, and it lands two paragraphs under a price
    // list that has just said Myku copied it off a listing, so the published
    // wording would hand those figures straight back to a man who never typed
    // them. The unclaimed wording keeps the entire point of the sentence,
    // which is that Myku is not the seller and does not price the work.
    unclaimed
      ? `${first} is an independent business. Myku does not set the prices, do the work, or speak for ${first}.`
      : `${first} is an independent business. ${first} sets the prices, does the work, and owns the reputation.`,
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
  // Samples are neither kind: they carry their own "Sample" chip and are
  // explained by the unclaimed paragraph below, never by the listing sentence.
  const sampleCount = wall.filter((j) => j.sample).length;
  const sharedCount = wall.length - verifiedCount - sampleCount;
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
  // Built from the marks that ACTUALLY rendered, for the same reason the job
  // provenance above branches on its counts. The fixed sentence named all
  // three on every page that carried any one of them, so a page showing only
  // "ID verified" told the visitor, in Myku's voice, that Myku had insurance
  // and certifications on file for a man it holds neither for.
  if (credentials.length > 0) {
    // Sentence case: the marks print title-cased in the About strip, but
    // mid-sentence only the initialism keeps its capital.
    const marks = credentials.map((c) => (c === 'ID verified' ? c : c.toLowerCase()));
    const list =
      marks.length === 1
        ? marks[0]
        : `${marks.slice(0, -1).join(', ')} and ${marks[marks.length - 1]}`;
    howParas.push(
      marks.length === 1
        ? `${list} means Myku reviewed documents. It does not mean Myku recommends the work.`
        : `${list} mean Myku reviewed documents. They do not mean Myku recommends the work.`
    );
  }
  if (unclaimed)
    howParas.push(
      sampleCount > 0 || sampleReviews
        ? `Anything marked Sample is an example of how ${first}’s page looks once it is full, not a real job or a real review. The rest came from public listings, and Myku has not confirmed it.`
        : `${first} has not claimed this page. The details here came from public listings, and nothing on the page has been confirmed by ${first}.`
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
        // Gated on the SAME derived flag the portrait uses, not on the raw
        // column. "Show my photo" is read as a privacy control, and it was
        // honoured on the page and on the link-preview card but not here, so
        // switching it off left his full-resolution portrait handed to search
        // engines inside the structured data, where he can neither see it nor
        // take it down. Every surface that publishes the photo now asks the
        // same question.
        ...(showPortrait && page.photo_url ? { image: page.photo_url } : {}),
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
  // Myku reviews first; otherwise his Google reviews; otherwise the rating summary.
  const externalReviews = reviews.length === 0 && (google || publicRating);
  const numReviews = reviews.length > 0 || externalReviews ? nextNum() : null;
  const numAsk = nextNum();

  // The claim mailto and the #claim anchor were removed on 2026-09-23 with the
  // claim buttons and the claim panel they pointed at. The man an unclaimed
  // page is built for gets his claim code in the conversation that sends him
  // the link; the report door below is the one that must stay on every page.
  // On EVERY page, claimed or not. A visitor who thinks the page is wrong
  // about someone needs a door, and it is the one link here that is not
  // gated on the mechanic's data. This is now the CONVENIENCE path only: it
  // lives inside the .mp-report disclosure in the footer, whose visible text
  // is the address itself, so the door still works on a machine where a
  // mailto click does nothing.
  const reportMailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Reporting a Myku page (${page.slug})`
  )}`;

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
          ) : j.sample ? (
            // A pitch sample (lib/samples.ts). Same chip, same slot, same tap
            // as a real card's source line, so the wall reads live; the word
            // in it is what keeps an example from passing as his work.
            <details className="mp-provx">
              <summary className="mp-badge">
                <InfoMark />
                Sample
              </summary>
              <span className="mp-notconf">
                An example of how {first}’s jobs show here. Not a real job.
              </span>
            </details>
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

  // THE SAMPLE WORK WALL. Three ordinary jobs, in the third person, with no
  // name, no town and no customer on them: the point is the SHAPE of the
  // section he is not using, not a history he did not do. They are drawn with
  // Myku's own plate art, which is what an empty card would have used anyway,
  // so the "after" is the real layout with the ghost skin over it.
  const GHOST_JOBS: {
    key: string;
    plate: PlateKey;
    vehicle: string;
    job: string;
    price: string;
    when: string;
  }[] = [
    { key: 'g-brake', plate: 'brake', vehicle: '2015 Honda Civic', job: 'Front brake pads and rotors', price: '$260', when: 'Jun 2026' },
    { key: 'g-oil', plate: 'oil', vehicle: '2018 Ford F-150', job: 'Oil and filter change', price: '$70', when: 'Jun 2026' },
    { key: 'g-batt', plate: 'battery', vehicle: '2012 Toyota Camry', job: 'Battery replacement', price: '$180', when: 'Jun 2026' },
  ];

  // Ordinary jobs, priced as a starting figure. The first three are the list
  // an empty page gets; the rest exist so there is still a sample left
  // when he already offers most of the first three.
  //
  // `covers` is the SUBJECT, not the label, and a sample is dropped when any
  // of his own rows is about the same thing. An exact-label test is not
  // enough: a page listing "Oil Change" with a dashed "Oil and filter change"
  // under it reads as the same job twice, one priced by Myku, which is the
  // page appearing to put a price on work he has chosen not to price.
  const GHOST_SERVICES: { label: string; priceFrom: number; covers: RegExp }[] = [
    { label: 'Brake pads and rotors', priceFrom: 180, covers: /brake|rotor/i },
    { label: 'Oil and filter change', priceFrom: 60, covers: /\boil\b/i },
    { label: 'Check-engine diagnostic', priceFrom: 55, covers: /diagnos|check.?engine/i },
    { label: 'Battery replacement', priceFrom: 120, covers: /batter/i },
    // /spark/, not /spark|plug/: "Tire plug" is a common listing, and matching
    // it dropped this sample for a job it has nothing to do with.
    { label: 'Spark plug replacement', priceFrom: 90, covers: /spark/i },
    // Two more, so a mechanic who already covers every subject above still
    // gets ONE priced example in the unpriced case. An empty pool there
    // printed the "add a price" line with no example beside it, which is the
    // exact thing Rohaan asked this for.
    { label: 'Coolant flush', priceFrom: 110, covers: /coolant|radiator|flush/i },
    { label: 'Serpentine belt replacement', priceFrom: 140, covers: /belt/i },
  ];
  const servicesGap = gap('services');
  const ghostServicePool = GHOST_SERVICES.filter(
    (g) => !services.some((s) => g.covers.test(s.label))
  );
  // Two cases, and the gap list names which one this is (see ServicesGapSub):
  // - few: fill the list to three, as it always has.
  // - unpriced: he has a real list and has priced none of it, so ONE sample
  //   shows what a priced line looks like. Exactly one, and always AFTER his
  //   rows in its own dashed box: an invented figure must never sit on, or
  //   read as belonging to, a service he actually listed.
  const ghostServiceRows = !servicesGap
    ? []
    : servicesGap.sub.reason === 'few'
      ? ghostServicePool.slice(0, Math.max(0, GAP_SERVICES_MIN - services.length))
      : ghostServicePool.slice(0, 1);

  const ghostJobCard = (j: (typeof GHOST_JOBS)[number], tag: string) => (
    <article className="mp-card mp-gap" key={j.key}>
      <Plate kind={j.plate} />
      <span className="mp-rail" aria-hidden="true" />
      <div className="mp-card-body">
        <div className="mp-card-top">
          {/* InfoMark, never CheckMark, and never the `ver` class. The check
              and the teal on this page mean one thing only: Myku confirmed
              this job ran through the platform. Nothing about a drawing is
              confirmed, and a sample wearing that mark would be the page
              telling him a lie about itself. */}
          <span className="mp-badge mp-gap-badge">
            <InfoMark />
            {tag}
          </span>
        </div>
        <h3>{j.vehicle}</h3>
        <p className="job">{j.job}</p>
      </div>
      <div className="mp-card-foot">
        <span className="mp-price">{j.price}</span>
        <span className="mp-when">{j.when}</span>
      </div>
    </article>
  );

  const reviewCard = (r: (typeof reviews)[number]) => {
    const ago = timeAgo(r.created_at);
    return (
      <div className="mp-rev mp-rv" key={r.id}>
        {/* The glyph frames words. A star-only review has none, so it gets
            the rating and date alone rather than quotation marks around
            nothing. */}
        {r.text ? <QuoteGlyph /> : null}
        {r.text ? <p>{r.text}</p> : null}
        <div className="att">{`${r.rating} out of 5${ago ? ` · ${ago}` : ''}${isSampleId(r.id) ? ' · Sample' : ''}`}</div>
      </div>
    );
  };

  // ── THE SERVICE-AREA DRAWING, MADE TRUE ────────────────────────────────────
  // It used to place town names in four HARDCODED corners inside rings of a
  // FIXED pixel radius, so it drew the same picture for a mechanic who travels
  // 3 miles and one who travels 60, anywhere in the country. The look is kept
  // exactly as it was, on purpose; only the numbers behind it changed.
  //
  // Centre: the official centroid of the city he already publishes, resolved
  // from the service_city STRING. His stored coordinate is never published and
  // never reaches this process (see web/lib/geo.ts for why that distinction is
  // load-bearing).
  //
  // Radius: what he picked in the app. Without a radius, or without a city we
  // can resolve, we draw NO ring and NO pins rather than inventing them.
  //
  // THE RING HALF OF THAT SENTENCE WAS NOT TRUE UNTIL NOW, and it showed on the
  // one page that most needed it to be. The pins were gated on the radius from
  // the day the drawing was made true; the three rings never were, so they drew
  // themselves on every page, radius or not. On trymyku.com/marcus-reed, whose
  // service_radius_mi is null, that put a set of concentric range rings around
  // his city on a page whose entire premise is that nothing on it is asserted.
  // Concentric rings centred on a mechanic are the standard grammar of "this is
  // how far he travels", and the caption underneath does not undo it: "A
  // drawing, not a live map" denies liveness, not scale.
  //
  // ONE FLAG NOW GOVERNS BOTH, so the picture and the sentence under it can
  // never disagree: the rings render exactly when the caption is entitled to
  // say "drawn to scale", and never otherwise. Without them the plate keeps its
  // crosshair, ticks, corner brackets, dot field and city name, so it still
  // reads as a located point, which is precisely what the page knows.
  const areaCentre = resolveCity(page.service_city);
  const radiusMi =
    typeof page.service_radius_mi === 'number' && page.service_radius_mi > 0
      ? page.service_radius_mi
      : null;
  const areaTowns = areaCentre && radiusMi ? townsWithin(areaCentre, radiusMi, 5) : [];
  const toScale = Boolean(radiusMi && areaCentre);

  // Pin positions are pure arithmetic on his real numbers: R_OUTER is the
  // radius he lists, so a pin's distance from the centre is its real distance,
  // to scale. Nothing below this line moves a pin. With no radius there are no
  // pins to place, and `toScale` above keeps the rings out too.
  const cityUpper = cityShort ? cityShort.toUpperCase() : null;
  const townPins = layoutTownLabels(
    areaTowns.map((t) => {
      const r = radiusMi ? Math.min(R_OUTER, (t.miles / radiusMi) * R_OUTER) : 0;
      const a = (t.bearing - 90) * (Math.PI / 180); // 0deg = north, SVG y grows down
      return { x: 110 + r * Math.cos(a), y: 110 + r * Math.sin(a), r, a, label: t.name.toUpperCase() };
    }),
    cityUpper
  );

  /* ── THE VAN DOOR HERO (2026-10-04, stage 1 of the approved redesign) ──────
     Fed only from values derived above, so every honesty rule this file already
     enforces carries over: counts come from rows actually rendered, the jobs
     count needs MIN_JOBS_SHOWN, samples never count as proof, paperwork claims
     never appear on a page he has not claimed, and nothing reads availability. */
  const vdWorkType: WorkType = (() => {
    const w = (page.work_type ?? '').trim().toLowerCase();
    if (w === 'mobile') return 'Mobile';
    if (w === 'hybrid') return 'Mobile or drop-off';
    if (w && workTypeLabel(w)) return 'Shop';
    return null;
  })();
  const vdCells: ProofCell[] = [];
  if (hasRating)
    vdCells.push({ kind: 'myku', num: ratingNum, label: VD.pfMyku(reviewCount), href: '#reviews', count: reviewCount });
  if (google)
    vdCells.push({ kind: 'google', num: google.rating, label: VD.pfGoogle(google.count), href: '#reviews', count: google.count });
  if (!unclaimed && verifiedCount >= MIN_JOBS_SHOWN)
    vdCells.push({ kind: 'jobs', num: verifiedCount, label: VD.pfJobs(verifiedCount), href: '#work', count: verifiedCount });
  if (unclaimed && publicRating && !google)
    vdCells.push({
      kind: 'public',
      num: publicRating.rating,
      label: VD.pfPublic(publicRating.count, publicRating.source),
      href: null,
      count: publicRating.count,
    });
  const sameAsName = (a: string | null, b: string) =>
    Boolean(a) && (a ?? '').toLowerCase().replace(/[\W_]+/g, ' ').trim() === b.toLowerCase().replace(/[\W_]+/g, ' ').trim();
  const vdCover = unclaimed
    ? []
    : realShared
        .filter((j) => j.photo_url)
        .slice(0, 5)
        .map((j) => ({
          src: j.photo_url as string,
          href: '#work',
          label: j.service?.trim()
            ? `${j.vehicle?.trim() || 'Vehicle'}: ${j.service.trim()}`
            : j.vehicle?.trim() || 'His work',
        }));
  const heroInput: HeroInput = {
    name: page.full_name,
    first,
    biz: bizName && !sameAsName(bizName, page.full_name) ? bizName : null,
    claimed: !unclaimed,
    face: !unclaimed && showPortrait && page.photo_url ? page.photo_url : null,
    cover: vdCover,
    chip: !unclaimed && page.id_verified,
    docs: unclaimed
      ? null
      : page.has_insurance && certs.length
        ? 'both'
        : page.has_insurance
          ? 'ins'
          : certs.length
            ? 'cert'
            : null,
    workType: vdWorkType,
    city,
    radius: typeof page.service_radius_mi === 'number' && page.service_radius_mi > 0 ? page.service_radius_mi : null,
    hoursJson: page.hours_json,
    hoursNote: page.hours_note?.trim() || null,
    headline: page.specialization?.trim() || null,
    cells: vdCells,
    years: page.years_experience ?? null,
    rate: page.hourly_rate ?? null,
    fee: page.diagnostic_fee ?? null,
  };
  const heroPlan = planHero(heroInput);
  const heroTitle = `${heroInput.biz ?? page.full_name}${cityShort ? ` | Mechanic in ${cityShort}` : ''}`;

  /* ── THE VAN DOOR BODY (2026-10-04, stage 2) ─────────────────────────────
     Same rule as the hero: built only from values derived above, so the honesty
     rules this file enforces carry over (samples only on a pitch page and always
     labelled, the record only on a page he claimed, counts from rows rendered). */
  const svcByName = new Map(services.map((x) => [x.label.toLowerCase(), x.label]));
  const vdTickets: BodyInput['tickets'] = shared.map((j) => {
    const sample = isSampleId(j.id);
    const price = sample ? null : j.price_label?.trim() || null;
    return {
      key: j.id,
      vehicle: j.vehicle?.trim() || 'Vehicle',
      service: j.service?.trim() || null,
      price,
      priceIsNum: Boolean(price && /^\$[\d,]+$/.test(price)),
      when: sample ? null : vdMonth(j.done_on),
      town: sample ? null : j.town?.trim() || null,
      caption: sample ? null : j.caption?.trim() || null,
      photo: sample || unclaimed ? null : j.photo_url || null,
      sample,
      askService: j.service ? svcByName.get(j.service.trim().toLowerCase()) ?? null : null,
    };
  });
  const vdLedgerRows = unclaimed
    ? []
    : verified.slice(0, 12).map((v) => ({
        key: v.id,
        vehicle: v.vehicle?.trim() || 'Vehicle',
        job: [v.service?.trim(), v.town?.trim()].filter(Boolean).join(', ') || null,
        amount: moneyOrNull(v.price),
        when: vdMonth(v.completed_at),
      }));
  const createdMs = page.created_at ? new Date(page.created_at).getTime() : NaN;
  const vdSince =
    !unclaimed && Number.isFinite(createdMs) && Date.now() - createdMs >= 100 * 86_400_000
      ? `On Myku since ${MONTHS[new Date(createdMs).getMonth()]} ${new Date(createdMs).getFullYear()}`
      : null;
  const bodyInput: BodyInput = {
    first,
    name: page.full_name,
    claimed: !unclaimed,
    tickets: vdTickets,
    ledger: vdLedgerRows.length ? { rows: vdLedgerRows, total: verified.length } : null,
    services,
    myku:
      hasRating && !sampleReviews
        ? {
            rating: ratingNum,
            count: reviewCount,
            reviews: reviews.map((r) => ({ key: r.id, rating: r.rating, text: r.text, by: vdMonth(r.created_at) ?? '' })),
          }
        : null,
    google: google
      ? {
          rating: google.rating,
          count: google.count,
          url: google.url,
          reviews: google.reviews.map((r, i) => ({
            key: `g${i}`,
            rating: r.rating ?? 0,
            text: r.text?.trim() || null,
            author: r.author?.trim() || null,
            authorUrl: r.author && r.authorUrl && /^https:\/\//.test(r.authorUrl) ? r.authorUrl : null,
            by: r.author?.trim()
              ? r.when
                ? ` on Google, ${r.when}`
                : ' on Google'
              : r.when
                ? `A Google user, ${r.when}`
                : 'A Google user',
          })),
        }
      : null,
    publicRating: unclaimed ? publicRating : null,
    sampleReviews: sampleReviews
      ? reviews.map((r) => ({ key: r.id, rating: r.rating, text: r.text, by: 'Sample' }))
      : [],
    meet: {
      face: !unclaimed && showPortrait && page.photo_url ? page.photo_url : null,
      bio: bioParas,
      years: page.years_experience ?? null,
      area: heroPlan.area,
      hours: heroPlan.hours,
      workType: vdWorkType,
      city,
      certs,
      insurance: !unclaimed && Boolean(page.has_insurance),
      socials: links.map((l) => ({ key: l.key, label: l.label, url: l.url })),
    },
    since: vdSince,
  };
  const vdFonts = `${vdSign.variable} ${vdText.variable} ${vdVoice.variable}`;

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

        {/* THE LEDGER, and the way back out of it. It counts the gaps once, at
            the top, so he is not left to add up dashed boxes as he scrolls,
            and the checkbox strips every one of them so he can see the page a
            visitor actually gets. Native checkbox, CSS only: no JavaScript, so
            it works on the same terms as the rest of this page. A browser
            without :has() keeps the examples on screen, which is the safe way
            round: the annotation staying is a nuisance, the annotation
            wrongly vanishing would hide the whole feature. */}
        {gaps.length > 0 ? (
          <div className="mp-gap-ledger">
            <div className="mp-wrap">
              <p className="on">
                Your page is missing {gaps.length} {gaps.length === 1 ? 'thing' : 'things'}. The
                dashed boxes below show what each would look like filled in. Visitors never see
                them.
              </p>
              <p className="off">
                Examples hidden. This is exactly what someone opening your link sees.
              </p>
              <label htmlFor="mp-gaps-off">
                <input type="checkbox" id="mp-gaps-off" />
                Show the page as visitors see it
              </label>
            </div>
          </div>
        ) : null}

        {/* One slim line ABOVE everything. The full explanation lives in HOW
            MYKU WORKS and the eyebrow carries UNCONFIRMED, so three lines of
            preamble above the mechanic's own name buys nothing. */}
        {/* The "Not claimed yet. Are you X? Claim this page" strip that sat
            here was removed on 2026-09-23 with the other claim prompts. An
            unclaimed page is the pitch, sent by hand to the one man it is
            for; he is handed his claim code in that conversation, and a page
            that opens by asking a stranger to claim it reads as a stub. */}

        <Hero input={heroInput} plan={heroPlan} pageUrl={`${SITE_URL}/${page.slug}`} pageTitle={heroTitle} />

        {/* HIS OWN AD, on an unclaimed pitch page only (2026-09-22). Kept from the earlier hero: the view
            returns ad_image_url only while the page is unclaimed, and only from our own storage. */}
        <div className="mp-ink">
          {unclaimed && page.ad_image_url && /^(\/|https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/)/.test(page.ad_image_url) ? (
            <figure className="mp-wrap mp-ad">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.ad_image_url} alt={`${first}’s own ad`} loading="eager" decoding="async" />
              <figcaption className="mp-bio-src">From {first}’s own ad. Myku has not confirmed it.</figcaption>
            </figure>
          ) : null}
        </div>

        {/* ============ THE VAN DOOR BODY (stage 2) ============ */}
        <div className={`vd vd-body ${vdFonts}`}>
          <div className="vd-page">
            <div className="vd-main">
              <SampleNotice show={unclaimed && (sampleCount > 0 || sampleReviews)} />
              <BodySections b={bodyInput} />
            </div>
            <aside className="vd-rail" aria-label={`Get a price from ${first}`}>
              {mode === 'preview' ? (
                <div className="vd-inert">
                  <span className="vd-anchor" id="quote" aria-hidden="true" />
                  <h2>{`Get a price from ${first}`}</h2>
                  <p>Requests turn on when you publish. Visitors pick the job and leave a number here, and it lands in your Myku inbox.</p>
                  {requestNote ? <p className="vd-inert-note">{requestNote}</p> : null}
                </div>
              ) : (
                <Request
                  mechanicId={page.id}
                  slug={page.slug}
                  first={first}
                  face={heroInput.face}
                  services={services}
                  requestNote={requestNote}
                  workType={vdWorkType}
                  unclaimed={unclaimed}
                />
              )}
            </aside>
          </div>
          <Footer b={bodyInput}>
            <details className="ft-report">
              <summary>Report this page</summary>
              <p>
                Something wrong here? Write to <a href={reportMailto}>{SUPPORT_EMAIL}</a> with the page address,{' '}
                <span className="nw">trymyku.com/{page.slug}</span>, and what is wrong. If this page is about you and
                you did not ask for it, say so.
              </p>
            </details>
          </Footer>
          <Viewer />
          {mode === 'live' ? <Dock first={first} face={heroInput.face} /> : null}
        </div>
      </main>
    </>
  );
}
