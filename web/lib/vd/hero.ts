import { fitName, glue, lines, nameLh, width, type NameClass } from './measure';
import { DAY_KEYS, parseHours } from '@/lib/hours';

// THE VAN DOOR HERO: WHAT GOES ON SCREEN ONE, AND HOW TIGHT IT HAS TO BE (2026-10-04).
//
// Ported from the approved design mock (design-mocks/mechanic-page-2026-10-04 in
// the app repo, src/view.py: hero_photo, hero_door, est_photo_hero,
// est_door_hero, proof_height, pick_tiers, GEO). Rohaan approved the design on
// 2026-10-04 with nine calls that override the mock; the ones that touch this
// file: no stitched name patch anywhere (the van door is lettering only), and
// far less "Myku does this, Myku does that" (the note under the button is
// "Free. No account.", the ID panel is one sentence).
//
// The page's one hard geometric promise: on a phone inside Facebook's in-app
// browser (390x660, and 360x660), the orange button AND the line under it sit
// above y=640. The hero has tiers per width bucket; the build picks the most
// generous tier whose estimated note bottom stays above the fold, from real
// glyph widths. The estimate was calibrated against Chrome on 180 versions of
// the mock page (long names, Spanish, long towns, no photos).

export type ProofKind = 'myku' | 'google' | 'jobs' | 'public';
export interface ProofCell {
  kind: ProofKind;
  num: number;
  label: string;
  href: string | null;
  count: number;
}

export type WorkType = 'Mobile' | 'Shop' | 'Mobile or drop-off' | null;

export interface HeroInput {
  name: string;
  first: string;
  /** null when he gave none, or when it is only his own name */
  biz: string | null;
  claimed: boolean;
  face: string | null;
  cover: { src: string; label: string; href: string }[];
  chip: boolean;
  docs: 'both' | 'ins' | 'cert' | null;
  workType: WorkType;
  city: string | null;
  radius: number | null;
  hoursJson: unknown;
  hoursNote: string | null;
  headline: string | null;
  cells: ProofCell[];
  years: number | null;
  rate: number | null;
  fee: number | null;
}

/* ------------------------------------------------------------------ copy */
export const T = {
  cta: (first: string) => `Get a price from ${first}`,
  ctaNote: 'Free. No account.',
  share: 'Share',
  shareAria: (first: string) => `Share ${first}’s page`,
  idChip: 'ID checked by Myku',
  idExplain: (first: string, docs: HeroInput['docs']) =>
    docs
      ? `Myku checked that ${first}’s government ID matches this name, and has ${first}’s ${
          docs === 'both' ? 'insurance and certifications' : docs === 'ins' ? 'insurance' : 'certifications'
        } on file. None of it is a review of ${first}’s work.`
      : `Myku checked that ${first}’s government ID matches this name. It is not a review of ${first}’s work.`,
  ownNumbers: (first: string) => `${first}’s own numbers`,
  fromPublicLong: 'From public listings. Myku has not confirmed them.',
  sharedBy: (first: string) => `Shared by ${first}`,
  srcPublic: 'From public listings',
  pfMyku: (n: number) => `${n.toLocaleString('en-US')} review${n === 1 ? '' : 's'} on Myku`,
  pfGoogle: (n: number) => `${n.toLocaleString('en-US')} review${n === 1 ? '' : 's'} on Google`,
  pfJobs: (n: number) => `job${n === 1 ? '' : 's'} completed through Myku`,
  pfJobsLine: (n: number) => `${n.toLocaleString('en-US')} job${n === 1 ? '' : 's'} completed through Myku`,
  pfPublic: (n: number, source: string) => `${n.toLocaleString('en-US')} review${n === 1 ? '' : 's'} on ${source}`,
  years: (n: number) => `${n} year${n === 1 ? '' : 's'}`,
  rate: '/hr labor',
  fee: ' to diagnose',
};

const money = (n: number | null) =>
  typeof n === 'number' && n > 0 ? `$${Math.round(n).toLocaleString('en-US')}` : null;

/** "Comes to you within 20 mi of Aurora, IL". A page with no work type says only
 *  where he is based: it never claims he comes to you. */
export function areaLine(wt: WorkType, r: number | null, city: string | null): string | null {
  if (!city) {
    if (wt === 'Mobile') return 'Comes to you';
    if (wt === 'Mobile or drop-off') return 'Comes to you, or drop off';
    return null;
  }
  if (wt === 'Shop') return `Shop in ${city}`;
  if (wt === 'Mobile or drop-off')
    return r ? `Comes to you within ${r} mi of ${city}, or drop off` : `Comes to you around ${city}, or drop off`;
  if (wt === 'Mobile') return r ? `Comes to you within ${r} mi of ${city}` : `Comes to you around ${city}`;
  return `Based in ${city}`;
}

/** The van door's lettering: "Comes to you · Aurora, IL". [before the dot, city] */
export function doorParts(wt: WorkType, city: string | null): [string | null, string | null] {
  const pre = wt === 'Shop' ? 'Shop' : wt === 'Mobile or drop-off' ? 'Comes to you or drop off' : wt === 'Mobile' ? 'Comes to you' : null;
  return [pre, city];
}
const doorLine = (wt: WorkType, city: string | null) => doorParts(wt, city).filter(Boolean).join(' · ');

/* ------------------------------------------------------------------ hours */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function clock(m: number): string {
  if (m % 1440 === 0) return 'midnight';
  const hh = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  return `${hh % 12 || 12}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${hh < 12 ? 'AM' : 'PM'}`;
}
/** His hours as one line: "Mon to Sat, 7 AM to 7 PM". A day open midnight to
 *  midnight reads "open 24 hours"; 24:00 reads "midnight", never "12 AM". */
export function hoursLine(json: unknown, note: string | null): string | null {
  const h = parseHours(json);
  if (h?.mode === 'appointment') return 'By appointment';
  if (h?.mode === 'weekly') {
    const groups: { v: [number, number]; start: number; end: number }[] = [];
    DAY_KEYS.forEach((k, i) => {
      const v = h.days[k];
      if (!v) return;
      const last = groups[groups.length - 1];
      if (last && last.v[0] === v[0] && last.v[1] === v[1] && last.end === i - 1) last.end = i;
      else groups.push({ v: [v[0], v[1]], start: i, end: i });
    });
    const out = groups.map((g) => {
      const d = g.start === g.end ? DAYS[g.start] : `${DAYS[g.start]} to ${DAYS[g.end]}`;
      const whole = g.v[0] === 0 && g.v[1] >= 1439;
      return whole ? `${d}, open 24 hours` : `${d}, ${clock(g.v[0])} to ${clock(g.v[1])}`;
    });
    if (out.length) return out.join('; ');
  }
  return note?.trim() || null;
}
/** For measuring: every "Mon to Sat" is one unbreakable run, as the page keeps it. */
function hoursMeasure(s: string): string {
  return s.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun) to (Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g, (m) => glue(m)).replace(/ /g, '');
}

/* ------------------------------------------------------------------ geometry */
const PHONE_NAME: NameClass[] = [
  ['n-xl', 38, true, 2], ['n-l', 33, true, 2], ['n-m', 28, true, 2],
  ['n-s', 25, false, 3], ['n-xs', 22, false, 3], ['n-xxs', 19, false, 3],
];
const DOOR_NAME: NameClass[] = [
  ['d-xl', 54, true, 2], ['d-l', 46, true, 2], ['d-m', 39, true, 2],
  ['d-s', 32, false, 3], ['d-xs', 27, false, 3], ['d-xxs', 23, false, 3],
];
const PHONE_NAME_X: NameClass[] = [['n-xxxs', 16, false, 4]];
const DOOR_NAME_X: NameClass[] = [['d-xxxs', 19, false, 4]];
const DOOR_NAME_COL = 328;
export const SMALL_COUNT = 5;
const FOLD = 640;
const SAFETY = 4;
const CAL_PHOTO = 3;
const CAL_DOOR = 0;

type Geo = Record<'cov' | 'ov' | 'fw' | 'fh' | 'cg' | 'np' | 'who' | 'fm' | 'fg' | 'hm' | 'hs' | 'pm' | 'nm' | 'am' | 'ah' | 'cm', number>;
const GEO_SM: Geo[] = [
  { cov: 158, ov: 50, fw: 86, fh: 108, cg: 12, np: 51, who: 10, fm: 12, fg: 3, hm: 10, hs: 20, pm: 15, nm: 10, am: 12, ah: 54, cm: 6 },
  { cov: 124, ov: 44, fw: 80, fh: 100, cg: 12, np: 50, who: 8, fm: 8, fg: 1, hm: 8, hs: 19, pm: 12, nm: 8, am: 12, ah: 52, cm: 5 },
  { cov: 100, ov: 40, fw: 72, fh: 90, cg: 12, np: 46, who: 8, fm: 6, fg: 0, hm: 6, hs: 18, pm: 10, nm: 6, am: 10, ah: 50, cm: 4 },
];
const GEO: Record<Bucket, Geo[]> = {
  xs: GEO_SM,
  sm: GEO_SM,
  md: [
    { cov: 166, ov: 54, fw: 96, fh: 120, cg: 14, np: 52, who: 10, fm: 12, fg: 3, hm: 10, hs: 20, pm: 15, nm: 10, am: 12, ah: 54, cm: 6 },
    { cov: 132, ov: 48, fw: 88, fh: 110, cg: 12, np: 52, who: 8, fm: 8, fg: 1, hm: 8, hs: 19, pm: 12, nm: 8, am: 12, ah: 52, cm: 5 },
    { cov: 108, ov: 42, fw: 80, fh: 100, cg: 12, np: 48, who: 8, fm: 6, fg: 0, hm: 6, hs: 18, pm: 10, nm: 6, am: 10, ah: 50, cm: 4 },
  ],
};
export type Bucket = 'xs' | 'sm' | 'md';
export const BUCKETS: Bucket[] = ['xs', 'sm', 'md'];
const BUCKET_W: Record<Bucket, number> = { xs: 344, sm: 360, md: 390 };
// The van door without the patch (removed 2026-10-04): tiers trade spacing, and tier
// 3 sets the name 14% smaller in the same case.
const DOOR_GEO = [
  { dp: 22, lm: 12, hm: 14, am: 18, cm: 8, nz: 1 },
  { dp: 16, lm: 8, hm: 10, am: 14, cm: 6, nz: 1 },
  { dp: 10, lm: 6, hm: 8, am: 12, cm: 4, nz: 1 },
  { dp: 10, lm: 6, hm: 8, am: 12, cm: 4, nz: 0.86 },
];

/* ------------------------------------------------------------------ the plan */
export interface HeroPlan {
  kind: 'photo' | 'door';
  nameText: string;
  nameCls: string;
  upper: boolean;
  soft: boolean;
  lead: number;
  tiers: Record<Bucket, number>;
  estimates: Record<Bucket, number>;
  /** buckets whose short area line ("Comes to you · town") stacks its halves */
  areaStack: Bucket[];
  /** buckets whose van-door lettering stacks its halves */
  letterStack: Bucket[];
  ctaSize: '' | 'cta-long' | 'cta-xlong';
  area: string | null;
  door: [string | null, string | null];
  hours: string | null;
  big: ProofCell[];
  small: ProofCell[];
  numbers: { years: string | null; rate: string | null; fee: string | null };
  /** the van door carries his radius and hours (a door page has no other place for them on screen one) */
  doorSub: { radius: string | null; hours: string | null };
}

export function planHero(h: HeroInput): HeroPlan {
  const nameText = h.biz || h.name;
  const big = h.cells.filter((c) => c.count >= SMALL_COUNT);
  const small = h.cells.filter((c) => c.count < SMALL_COUNT);
  const hours = hoursLine(h.hoursJson, h.hoursNote);
  const area = areaLine(h.workType, h.radius, h.city);
  const numbers = {
    years: h.years && h.years > 0 ? T.years(Math.round(h.years)) : null,
    rate: money(h.rate),
    fee: money(h.fee),
  };
  const numParts = [numbers.years, numbers.rate && `${numbers.rate}${T.rate}`, numbers.fee && `${numbers.fee}${T.fee}`].filter(
    Boolean
  ) as string[];
  const numbersM = numParts.map((p, i) => glue(p + (i < numParts.length - 1 ? ' ·' : ''))).join(' ');
  const cta = T.cta(h.first);
  const ctaSize: HeroPlan['ctaSize'] =
    width(cta, 'text600', 17) <= 236 ? '' : width(cta, 'text600', 16) <= 248 ? 'cta-long' : 'cta-xlong';
  const kind: HeroPlan['kind'] = h.claimed && (h.face || h.cover.length) ? 'photo' : 'door';

  // the proof rail and the small-count lines, as tall as they wrap
  const proofHeight = (W: number, margin: number) => {
    let y = 0;
    if (big.length) {
      const n = big.length;
      const widths = big.map(() => 1);
      if (big[n - 1].kind === 'jobs' && n > 1) widths[n - 1] = 1.34;
      const tot = widths.reduce((a, b) => a + b, 0);
      let ml = 1;
      big.forEach((c, i) => {
        const cw = (W * widths[i]) / tot - (n > 1 ? 22 : 0);
        ml = Math.max(ml, lines(c.label, 'text500', 13, cw)[0]);
      });
      y += margin + (n > 1 ? 30 + 5 + ml * 16.9 : 34);
    }
    if (small.length) {
      y += 10;
      for (const c of small) {
        const txt = c.kind === 'jobs' ? T.pfJobsLine(c.count) : `${c.num.toFixed(1)} · ${c.label}`;
        y += Math.max(30, lines(txt, 'text500', 16, W - 26)[0] * 20.8);
      }
      y += 14 * (small.length - 1);
    }
    return y;
  };
  const noteH = (W: number) => lines(T.ctaNote, 'text400', 16, W)[0] * 21.6;
  const doorL = doorLine(h.workType, h.city);
  const areaStacks = (b: Bucket) => width(doorL, 'text400', 16) > BUCKET_W[b] - 32 - 27;
  const letteringStacks = (b: Bucket) => width(doorL.toUpperCase(), 'sign800', 18, 0.07) > BUCKET_W[b] - 32 - 31;

  let fit: ReturnType<typeof fitName>;
  let lead: number;
  let est: (b: Bucket, tier: number) => number;
  let nTiers: number;

  if (kind === 'photo') {
    const face = Boolean(h.face);
    const cover = h.cover.length > 0;
    const col = BUCKET_W.sm - 32 - (face ? GEO.sm[0].fw + GEO.sm[0].cg : 0);
    fit = fitName(nameText, col, PHONE_NAME, PHONE_NAME_X);
    lead = nameLh(nameText, fit.upper, fit.px, fit.soft);
    nTiers = 3;
    est = (b, tier) => {
      const g = GEO[b][tier];
      const W = BUCKET_W[b] - 32;
      const top = cover ? g.cov - g.ov : 54 + 18;
      const nameTop = cover ? top + g.np : top;
      const ncol = W - (face ? g.fw + g.cg : 0);
      const nl = lines(fit.upper ? nameText.toUpperCase() : nameText, 'sign800', fit.px, ncol, 0.004, fit.soft)[0];
      const nameH = nl * lead * fit.px;
      let y = cover ? Math.max(top + (face ? g.fh : 0), nameTop + nameH) : top + Math.max(face ? g.fh : 0, nameH);
      if (h.biz || h.chip) {
        const pw = h.biz ? width(h.name, 'text600', 16) : 0;
        const pl = h.biz ? lines(h.name, 'text600', 16, W)[0] : 0;
        const cw = h.chip ? width(T.idChip, 'text600', 13) + 64 : 0;
        if (pl && cw && (pl > 1 || pw + 10 + cw > W)) y += g.who + pl * 20 + 6 + 30;
        else y += g.who + Math.max(cw ? 30 : 0, pl * 20);
      }
      let fl = 0;
      let nf = 0;
      if (tier === 2) {
        if (doorL) {
          fl = areaStacks(b) && h.city ? 1 + lines(glue(h.city), 'text400', 16, W - 27)[0] : 1;
          nf = 1;
        }
      } else if (area) {
        fl = lines(area.replace(h.city ?? '\u0000', glue(h.city)), 'text400', 16, W - 27)[0];
        nf = 1;
      }
      if (hours && tier < 2) {
        fl += lines(hoursMeasure(hours), 'text400', 16, W - 27)[0];
        nf += 1;
      }
      if (nf) y += g.fm + fl * 22.4 + (nf - 1) * g.fg;
      if (h.headline) y += g.hm + lines(h.headline, 'voice', g.hs, W, 0, false, true)[0] * g.hs * 1.3;
      y += proofHeight(W, g.pm);
      if (numParts.length) y += g.nm + lines(numbersM, 'text400', 16, W)[0] * 22.4 + 19;
      y += g.am + g.ah;
      y += g.cm + noteH(W);
      return y + CAL_PHOTO;
    };
  } else {
    fit = fitName(nameText, DOOR_NAME_COL, DOOR_NAME, DOOR_NAME_X);
    lead = nameLh(nameText, fit.upper, fit.px * DOOR_GEO[DOOR_GEO.length - 1].nz, fit.soft);
    nTiers = DOOR_GEO.length;
    const radiusRow = h.radius && h.workType !== 'Shop' && h.workType && h.city ? `Within ${h.radius} mi of ${h.city}` : null;
    est = (b, tier) => {
      const g = DOOR_GEO[tier];
      const W = BUCKET_W[b] - 32;
      let y = 54 + g.dp;
      const px = fit.px * g.nz;
      const nl = lines(fit.upper ? nameText.toUpperCase() : nameText, 'sign800', px, W, 0.004, fit.soft)[0];
      y += 2 + nl * lead * px;
      if (h.biz) y += 8 + lines(h.name, 'text600', 17, W)[0] * 21;
      if (h.chip) y += 10 + 30;
      if (doorL) {
        const ll = letteringStacks(b) && h.city ? 1 + lines(glue(h.city.toUpperCase()), 'sign800', 18, W - 31, 0.07)[0] : 1;
        y += g.lm + ll * 21;
      }
      const rows = [radiusRow && radiusRow.replace(h.city ?? '\u0000', glue(h.city)), hours && hoursMeasure(hours)].filter(
        Boolean
      ) as string[];
      if (rows.length) y += 10 + rows.reduce((s, m) => s + lines(m, 'text400', 16, W - 27)[0] * 22.4, 0) + 3 * (rows.length - 1);
      y += g.dp;
      if (h.headline) y += g.hm + lines(h.headline, 'voice', 20, W, 0, false, true)[0] * 26;
      y += proofHeight(W, 16);
      if (!h.claimed) y += 10 + lines(T.fromPublicLong, 'text400', 16, W - 24)[0] * 22.4;
      if (numParts.length) y += 10 + lines(numbersM, 'text400', 16, W)[0] * 22.4 + (h.claimed ? 19 : 0);
      y += g.am + 54;
      y += g.cm + noteH(W);
      return y + CAL_DOOR;
    };
  }

  const tiers = {} as Record<Bucket, number>;
  const estimates = {} as Record<Bucket, number>;
  for (const b of BUCKETS) {
    let chosen = nTiers - 1;
    for (let t = 0; t < nTiers; t++) {
      if (est(b, t) + SAFETY <= FOLD) {
        chosen = t;
        break;
      }
    }
    tiers[b] = chosen;
    estimates[b] = Math.round(est(b, chosen));
  }

  const radiusRow =
    kind === 'door' && h.radius && h.workType && h.workType !== 'Shop' && h.city ? `Within ${h.radius} mi of ${h.city}` : null;
  return {
    kind,
    nameText,
    nameCls: fit.cls,
    upper: fit.upper,
    soft: fit.soft,
    lead,
    tiers,
    estimates,
    areaStack: BUCKETS.filter((b) => tiers[b] === 2 && kind === 'photo' && areaStacks(b)),
    letterStack: BUCKETS.filter((b) => kind === 'door' && letteringStacks(b)),
    ctaSize,
    area,
    door: doorParts(h.workType, h.city),
    hours,
    big,
    small,
    numbers,
    doorSub: { radius: radiusRow, hours: kind === 'door' ? hours : null },
  };
}

/** The name, with <wbr> opportunities only where a one-token name may break. */
export function namePieces(text: string, soft: boolean): string[][] {
  if (!soft) return [[text]];
  return text.split(' ').map((w) => w.split(/(?<=[./_@])(?=[^\s./_@])|(?<=[a-z])(?=[A-Z])/).filter(Boolean));
}
