import type { PageData } from '@/lib/pageData';
import type { Review, SharedJob } from '@/lib/supabase';

/* ------------------------------------------------------------------
   PITCH SAMPLES  ::  what an UNCLAIMED page shows (added 2026-09-23)

   An unclaimed page is built for ONE named mechanic, and the link is sent to
   him as the pitch. A cold prospect has no work, no reviews and no rate on
   file, so his page was a name and two short sections: it showed him nothing
   worth joining for. Rohaan, 2026-09-23: "we are selling the ideal, not what
   we know... make it look like an actual live page."

   So the empty slots are filled with examples of what a full page looks like.
   The rules below are the whole reason this lives in its own file:

   1. NEVER STORED. Samples are generated at render time and exist nowhere in
      the database. `redeem_page_invite` MOVES a holder draft's shared_jobs onto
      the man's real account, so a sample written as a row would become "his"
      work the moment he claimed. Built here, they vanish on claim with nothing
      to clean up.
   2. UNCLAIMED ONLY, AND ONLY WHERE HE HAS NOTHING REAL. The caller gates on
      web_status, and a real job or a real review always wins over a sample.
      A published page never receives one, and the structured data handed to
      search engines never counts one.
   3. ALWAYS LABELLED. Every sample says "Sample" in the slot a real card uses
      for its source line, so the page reads live and still tells anyone who
      opens the link which parts are examples. A sample that could be mistaken
      for a real customer's review is a fake review.
   4. NO PLACES, NO PEOPLE. No town and no customer name on any sample (the
      marketing rules: no place, ever; and a named reviewer would be a person
      who does not exist).
   ------------------------------------------------------------------ */

export const SAMPLE_PREFIX = 'sample-';
export const isSampleId = (id: string | null | undefined): boolean =>
  typeof id === 'string' && id.startsWith(SAMPLE_PREFIX);

const DAY = 86_400_000;

interface JobTemplate {
  /** Which of his listed services makes this sample the most relevant. */
  fits: RegExp;
  vehicle: string;
  service: string;
  price: string;
  caption: string | null;
  daysAgo: number;
  /** Specialist work: shown only when he lists it, never as filler on a
   *  general mechanic's page (a brake man should not get a '69 Camaro). */
  specialty?: boolean;
}

// How many sample cards a page gets, and the dates they carry, newest first.
const MAX_JOBS = 6;
const MAX_REVIEWS = 4;
const JOB_DAYS = [5, 12, 19, 33, 47, 61];
const REVIEW_DAYS = [6, 15, 27, 44];

// Specialist samples (2026-09-27). The first real pitch page belongs to a
// mechanic whose own listings lead with emissions, electrical, no-crank
// diagnostics and custom muscle-car builds; generic brake-and-battery samples
// made the page read like anybody's. A page leads with the samples that match
// what he lists, and specialist ones never appear on a page that does not.
const SPECIALTY_JOBS: JobTemplate[] = [
  {
    fits: /emission/i,
    vehicle: '2013 Chevrolet Equinox',
    service: 'Failed emissions: found the EVAP leak, passed the retest',
    price: '$240',
    caption: 'Smoke-tested it in the customer’s driveway and found a cracked purge line.',
    daysAgo: 0,
    specialty: true,
  },
  {
    fits: /no.?crank|no.?start/i,
    vehicle: '2011 Honda Civic',
    service: 'No crank, no start: traced to a corroded ground',
    price: '$150',
    caption: 'The quote elsewhere was a new starter. It needed a clean ground.',
    daysAgo: 0,
    specialty: true,
  },
  {
    fits: /electric|wiring/i,
    vehicle: '2008 Ford F-250',
    service: 'Electrical short: rebuilt a chafed wiring harness',
    price: '$340',
    caption: null,
    daysAgo: 0,
    specialty: true,
  },
  {
    fits: /muscle|race|custom/i,
    vehicle: '1969 Chevrolet Camaro',
    service: 'Custom build: carburetor tune and ignition upgrade',
    price: 'Quoted per build',
    caption: null,
    daysAgo: 0,
    specialty: true,
  },
  {
    fits: /transmission/i,
    vehicle: '2012 Jeep Wrangler',
    service: 'Transmission diagnosis and shift solenoid replacement',
    price: '$390',
    caption: null,
    daysAgo: 0,
    specialty: true,
  },
  {
    fits: /tune/i,
    vehicle: '2014 Toyota Tacoma',
    service: 'Complete tune-up: spark plugs, coils and filters',
    price: '$280',
    caption: null,
    daysAgo: 0,
    specialty: true,
  },
];

// Ordinary mobile-mechanic work at ordinary prices. The service wording is
// chosen so each card draws a different plate illustration (brake, battery,
// plug, belt, oil, ac) rather than six copies of the same drawing.
const GENERIC_JOBS: JobTemplate[] = [
  {
    fits: /brake/i,
    vehicle: '2016 Honda Accord',
    service: 'Front brake pads and rotors',
    price: '$240',
    caption: 'Done in the customer’s driveway in about an hour.',
    daysAgo: 5,
  },
  {
    fits: /alternator|charging|battery/i,
    vehicle: '2014 Chevrolet Silverado',
    service: 'Alternator replacement',
    price: '$410',
    caption: 'Battery light on, dead by morning. Tested it, replaced it, charging again.',
    daysAgo: 12,
  },
  {
    fits: /diagnos|engine/i,
    vehicle: '2019 Toyota Camry',
    service: 'Check engine light: misfire, spark plugs and coil',
    price: '$185',
    caption: null,
    daysAgo: 19,
  },
  {
    fits: /starter|roadside|battery/i,
    vehicle: '2012 Nissan Altima',
    service: 'No-start at work, starter replacement',
    price: '$320',
    caption: null,
    daysAgo: 33,
  },
  {
    fits: /engine|belt/i,
    vehicle: '2017 Ford Escape',
    service: 'Serpentine belt and tensioner',
    price: '$210',
    caption: null,
    daysAgo: 47,
  },
  {
    fits: /oil|maint/i,
    vehicle: '2015 Jeep Grand Cherokee',
    service: 'Oil change and filter at the customer’s home',
    price: '$90',
    caption: null,
    daysAgo: 61,
  },
];

const JOBS: JobTemplate[] = [...SPECIALTY_JOBS, ...GENERIC_JOBS];

interface ReviewTemplate { rating: number; text: string; daysAgo: number; fits?: RegExp }

// What a customer writes after a job that went fine. No names, no places,
// nothing a real review would need to be believed as real. The ones with
// `fits` speak to a specialty and appear only when he lists it.
const REVIEWS: ReviewTemplate[] = [
  {
    rating: 5,
    fits: /emission/i,
    text: 'Failed emissions twice somewhere else. He found the leak in my driveway and I passed the next day.',
    daysAgo: 0,
  },
  {
    rating: 5,
    fits: /no.?crank|no.?start|electric|wiring/i,
    text: 'Truck wouldn’t crank and nobody could tell me why. He traced it to a bad ground in under an hour.',
    daysAgo: 0,
  },
  {
    // Four stars on purpose: four straight fives averages a perfect 5.0, which
    // reads as invented next to any real rating the mechanic has in public.
    rating: 4,
    fits: /muscle|race|custom/i,
    text: 'Tuned my old muscle car and it has never run better. Took a little longer than planned, but worth it.',
    daysAgo: 0,
  },
  {
    rating: 5,
    text: 'Came to my work parking lot and had my brakes done before my shift ended. Price was what he said it would be.',
    daysAgo: 6,
  },
  {
    rating: 5,
    text: 'Car wouldn’t start. He figured out it was the alternator and had it running the same afternoon.',
    daysAgo: 15,
  },
  {
    rating: 5,
    text: 'Explained what was wrong before touching anything and didn’t try to upsell me.',
    daysAgo: 27,
  },
  {
    rating: 4,
    text: 'Showed up when he said he would and cleaned up after. I’d call him again.',
    daysAgo: 44,
  },
];

/** A sample labour rate, shown only while he has not stated one. */
export const SAMPLE_RATE = 85;

// Sample "from" prices for his listed services, by keyword, first match wins.
// Ordinary mobile-mechanic starting prices, round on purpose. A service that
// is really a description ("Foreign and domestic") matches nothing and stays
// unpriced. DISPLAY ONLY: these never reach the quote form, so a customer who
// sends a request is never quoted a number Myku made up.
const SAMPLE_PRICES: [RegExp, number][] = [
  [/emission/i, 80],
  [/no.?crank|no.?start/i, 95],
  [/electric|wiring/i, 120],
  [/transmission/i, 350],
  [/tune/i, 180],
  [/kill.?switch|gps/i, 150],
  [/4x4|four.?wheel/i, 150],
  [/tint/i, 150],
  [/alternator|starter/i, 280],
  [/brake/i, 180],
  [/batter|charging/i, 120],
  [/diagnos|check.?engine/i, 60],
  [/engine/i, 250],
  [/body/i, 150],
  [/roadside|jump|lockout/i, 75],
  [/oil/i, 60],
  [/tire|wheel/i, 40],
  [/belt/i, 140],
  // Word-bounded: an unbounded /a\/?c/ matched the "ac" inside "race" and priced
  // a custom race-car build as A/C work.
  [/\ba\/?c\b|air ?condition|\bheat/i, 130],
];

// Work that is always quoted per job and must never carry a "from" figure.
const QUOTED_ONLY = /custom|build|restor|race|muscle/i;

export function samplePrice(label: string): number | null {
  if (QUOTED_ONLY.test(label)) return null;
  for (const [re, price] of SAMPLE_PRICES) if (re.test(label)) return price;
  return null;
}

export interface PitchSamples {
  shared: SharedJob[];
  reviews: Review[];
  rate: number;
}

export function pitchSamples(data: PageData, now = Date.now()): PitchSamples {
  const { page, services } = data;
  const listed = services.map((s) => (s.service ?? '').toLowerCase()).join(' | ');

  // The samples that match what he actually lists go first, so a brake man's
  // page leads with a brake job; generic filler follows; a specialist sample
  // he does NOT list never appears at all.
  const ranked = [
    ...JOBS.filter((j) => j.fits.test(listed)),
    ...JOBS.filter((j) => !j.fits.test(listed) && !j.specialty),
  ].slice(0, MAX_JOBS);

  // The wall sorts newest first, so the dates are handed out in RANK order:
  // the best-matching sample is the most recent card, not whichever template
  // happened to carry the smallest number.
  const shared: SharedJob[] = ranked.map((j, i) => ({
    id: `${SAMPLE_PREFIX}job-${i}`,
    mechanic_id: page.id,
    vehicle: j.vehicle,
    service: j.service,
    price_label: j.price,
    done_on: new Date(now - (JOB_DAYS[i] ?? 60) * DAY).toISOString().slice(0, 10),
    town: null,
    photo_url: null,
    caption: j.caption,
  }));

  // Same rule as the jobs: specialty reviews first when he lists the specialty,
  // then the general ones, and a specialty review he does not list never shows.
  const pickedReviews = [
    ...REVIEWS.filter((r) => r.fits && r.fits.test(listed)),
    ...REVIEWS.filter((r) => !r.fits),
  ].slice(0, MAX_REVIEWS);
  const reviews: Review[] = pickedReviews.map((r, i) => ({
    id: `${SAMPLE_PREFIX}review-${i}`,
    mechanic_id: page.id,
    rating: r.rating,
    text: r.text,
    created_at: new Date(now - (REVIEW_DAYS[i] ?? 45) * DAY).toISOString(),
  }));

  return { shared, reviews, rate: SAMPLE_RATE };
}
