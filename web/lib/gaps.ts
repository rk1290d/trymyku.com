import { isEmptyHours, parseHours } from '@/lib/hours';
import { socialLinks } from '@/lib/socials';
import type { PageData } from '@/lib/pageData';

/* ------------------------------------------------------------------
   THE GAP LIST  ::  MIRROR OF lib/pageGaps.ts IN THE MYKU APP REPO

   THE APP FILE IS THE CANONICAL ONE. `lib/pageGaps.ts` in the Myku repo
   holds the same thirteen keys, in the same order, with the same two
   minimums and the same core/more split; this file is its twin on the
   website and exists only so the preview can draw the gap in the slot it
   would occupy. Same pattern, and same reason, as MIN_JOBS_SHOWN in
   components/Storefront.tsx.

   IF THE TWO LISTS EVER DISAGREE, THE PREVIEW TELLS A MECHANIC TO FIX
   SOMETHING THE APP HAS NO EDITOR FOR. That is the exact failure this
   contract exists to prevent: every marker on the preview deep-links into
   an app editor by key, so a key that only exists here is a dead end, and
   a key that only exists there is a gap he is never shown. Change one file
   and you must change the other in the same pass.

   The PREDICATES are allowed to differ, and do. The app reads the cause
   (his stored row, and whether he has confirmed his numbers); the website
   reads the effect (what the page can actually print). They land on the
   same key, which is the only thing the two sides exchange.

   WHAT IS NOT HERE: the sample content. A ghost's markup is the host
   section's own markup with the ghost skin over it, so it lives beside
   that section in Storefront.tsx. This module carries keys, tiers, fix
   targets and the words for where in the app each one is edited, so the
   twin stays a plain list that can be diffed against the app's.

   THE `appPath` STRINGS QUOTE REAL LABELS FROM THE APP, WORD FOR WORD.
   On anything that is not an iPhone no deep link is emitted at all, so those
   words are the ONLY instruction he gets. Five of them originally named
   screens that do not exist ("Headline", "Links", "City", "Note to
   customers", "Past work"), which is a treasure hunt, not a path. If a row
   is renamed in the app, rename it here in the same pass.
   ------------------------------------------------------------------ */

// PAGE ORDER, and it is load-bearing: the ledger counts these and the
// preview draws them top to bottom in this order.
export const PAGE_GAP_KEYS = [
  'photo',
  'headline',
  'numbers',
  'work',
  'bio',
  'verify',
  'links',
  'city',
  'hours',
  'radius',
  'services',
  'reviews',
  'note',
] as const;

export type PageGapKey = (typeof PAGE_GAP_KEYS)[number];

// Everything except reviews. Reviews are the one gap he cannot close by
// typing: they arrive when a customer rates a job that ran through Myku,
// so there is no editor to open and no deep link to offer.
export type PageFixKey = Exclude<PageGapKey, 'reviews'>;

// Three jobs is when the work wall starts to carry the page, and it is the
// same floor the fact strip already uses for confirmed jobs (MIN_JOBS_SHOWN
// in Storefront.tsx, MIN_JOBS_SHOWN in the app's constants/config.ts).
export const GAP_JOBS_MIN = 3;
export const GAP_SERVICES_MIN = 3;

// The four the app's readiness card has always led with. Everything else is
// the 'more' tier, which the card keeps behind one collapsed row.
const CORE_KEYS: readonly PageGapKey[] = ['photo', 'numbers', 'work', 'hours'];

/** The app's transit route. It closes the browser, then opens that editor. */
export function appFixUrl(key: PageFixKey): string {
  return `myku://page-fix?fix=${key}`;
}

/** `numbers` only: which of the three cells the page is not printing. */
export interface NumbersGapSub {
  rate: boolean;
  years: boolean;
  workType: boolean;
}

/** `services` only: WHICH of the two ways the list falls short. They need
 *  different examples and a different sentence, so the renderer must not have
 *  to re-derive it from the rows and risk landing on the other answer.
 *  - `few`: fewer than GAP_SERVICES_MIN services. Example rows fill the list
 *    to three, prices included.
 *  - `unpriced`: three or more, and not one of them names a starting price.
 *    One example row shows what a priced line looks like, and it is never
 *    one of his. */
export interface ServicesGapSub {
  reason: 'few' | 'unpriced';
}

interface PageGapBase {
  tier: 'core' | 'more';
  /** null for `reviews` only: there is nothing for him to open. */
  fix: PageFixKey | null;
  /** Where in the app it is edited, in words, for anyone not on an iPhone.
   *  Empty for `reviews`, which has no editor to name. */
  appPath: string;
}

// The keys that carry nothing beyond the base. Spread over a mapped type so
// each is its OWN union member: that is what lets `Extract<PageGap, { key: K }>`
// narrow to one member, and it is how Storefront's `gap('numbers')` hands back
// a `sub` it can read without a cast.
type PlainGapKey = Exclude<PageGapKey, 'numbers' | 'services'>;

export type PageGap =
  | (PageGapBase & { key: 'numbers'; sub: NumbersGapSub })
  | (PageGapBase & { key: 'services'; sub: ServicesGapSub })
  | { [K in PlainGapKey]: PageGapBase & { key: K } }[PlainGapKey];

// NULL means "this page is not saying it", and nothing else does.
//
// The three fact columns are NOT NULL in the table (rate defaults to 75, years
// to 1, work type to mobile). The public view is what turns an unconfirmed fact
// into a null, so a null here is precisely "the visitor never sees this".
//
// A ZERO IS NOT A NULL, and reading it as one was a real bug on a real page.
// The app offers "I quote per job", which deliberately stores a rate of 0 and
// prints no rate cell. Treating that as a gap put a dashed "$85 /hr" example on
// the preview of a mechanic who HAD confirmed his numbers, told him to go and
// confirm them, and left him a chore he could only clear by abandoning the
// choice the app had just offered him. The app's twin scored the same page as
// done, so the two ledgers disagreed permanently, which is the exact failure
// the twin contract exists to prevent.
function missing(n: number | null | undefined): boolean {
  return n == null;
}

function blank(s: string | null | undefined): boolean {
  return !(s ?? '').trim();
}

/**
 * What this page is not saying yet, in page order.
 *
 * PREVIEW ONLY. The caller gates it (Storefront computes it once, for the
 * mechanic's own published draft and nothing else); this module has no idea
 * which route it is on and must never be asked to decide.
 */
export function pageGaps(data: PageData): PageGap[] {
  const { page, services: rawServices, shared, verified, reviews } = data;
  const gaps: PageGap[] = [];

  const base = (key: PageGapKey, appPath: string): PageGapBase => ({
    tier: CORE_KEYS.includes(key) ? 'core' : 'more',
    fix: key === 'reviews' ? null : (key as PageFixKey),
    appPath,
  });
  const add = (key: PlainGapKey, appPath: string) => {
    gaps.push({ key, ...base(key, appPath) });
  };

  // A photo he has switched off is a choice he made, not a gap. Only the
  // absence of one is something the preview can offer to fix.
  if (!page.photo_url) add('photo', 'Profile, My page, Your photo');

  if (blank(page.specialization)) add('headline', 'Profile, My page, What you do');

  const rate = missing(page.hourly_rate);
  const years = missing(page.years_experience);
  const workType = blank(page.work_type);
  if (rate || years || workType) {
    gaps.push({
      key: 'numbers',
      ...base('numbers', 'Profile, My page, Your numbers'),
      sub: { rate, years, workType },
    });
  }

  // Both kinds of card count. The wall does not care which half a job came
  // from, and neither does the visitor scrolling it.
  if (shared.length + verified.length < GAP_JOBS_MIN) {
    add('work', 'Profile, My page, Past jobs');
  }

  if (blank(page.bio)) add('bio', 'Profile, My page, About you');

  if (!page.id_verified) add('verify', 'Profile, Get Verified');

  // The rendered links, not the stored object: a stored handle that fails the
  // per-platform host allowlist prints nothing, so the row is empty either way.
  if (socialLinks(page.socials).length === 0) add('links', 'Profile, My page, Where to find you online');

  if (blank(page.service_city)) add('city', 'Profile, My page, Your town');

  // Same test the renderer makes: structured hours first, then the typed line
  // anyone who set one before the picker existed still has.
  if (isEmptyHours(parseHours(page.hours_json)) && blank(page.hours_note)) {
    add('hours', 'Profile, My page, Hours and towns');
  }

  // Null, not "zero or less": the app's twin tests `serviceRadiusMi != null`,
  // and a radius is a column he either set or did not.
  if (missing(page.service_radius_mi)) add('radius', 'Profile, My page, How far you travel');

  // Counted the way the section counts them: trimmed, deduped, blanks dropped,
  // and FIRST ROW WINS ITS PRICE. That last clause is not pedantry: the section
  // keeps the first row's price for a repeated label and discards the rest, so
  // a price that only sits on the duplicate is never printed and must not
  // count as one here. The price test is the renderer's own, character for
  // character: a positive number is exactly when the row prints "from $X".
  const seen = new Set<string>();
  let priced = 0;
  for (const row of rawServices) {
    const label = (row.service ?? '').trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    if (typeof row.price_from === 'number' && row.price_from > 0) priced++;
  }
  // OPEN while the list is short, OR while nothing on it names a price.
  // Rohaan, 2026-09-11: the preview showed no example in the pricing column,
  // so a mechanic with five bare names never saw what a "from $X" line looks
  // like. ONE priced row closes the second half, and that is deliberate:
  // prices are optional per service by design (some jobs he will only quote
  // after he has seen the car), so a rule of "every row priced" would turn a
  // choice the editor offers him into a chore he can only clear by giving it
  // up. That is the same trap the numbers gap fell into over "I quote per
  // job", described above `missing`. The app's twin uses this same rule.
  const few = seen.size < GAP_SERVICES_MIN;
  if (few || priced === 0) {
    gaps.push({
      key: 'services',
      ...base('services', 'Profile, My Services'),
      sub: { reason: few ? 'few' : 'unpriced' },
    });
  }

  // A rating with no stars is not a review, and the section drops it, so it
  // must not count towards one here either.
  // No path, because there is no editor: the marker for this one explains
  // how reviews arrive instead of pointing him at a screen.
  if (reviews.filter((r) => r.rating > 0).length === 0) add('reviews', '');

  if (blank(page.request_note)) add('note', 'Profile, My page, Your note');

  return gaps;
}
