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
}

// Ordinary mobile-mechanic work at ordinary prices. The service wording is
// chosen so each card draws a different plate illustration (brake, battery,
// plug, belt, oil, ac) rather than six copies of the same drawing.
const JOBS: JobTemplate[] = [
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

// What a customer writes after a job that went fine. No names, no places,
// nothing a real review would need to be believed as real.
const REVIEWS: { rating: number; text: string; daysAgo: number }[] = [
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

export interface PitchSamples {
  shared: SharedJob[];
  reviews: Review[];
  rate: number;
}

export function pitchSamples(data: PageData, now = Date.now()): PitchSamples {
  const { page, services } = data;
  const listed = services.map((s) => (s.service ?? '').toLowerCase()).join(' | ');

  // The samples that match what he actually lists go first, so a brake man's
  // page leads with a brake job; the rest keep their order behind them.
  const ranked = [
    ...JOBS.filter((j) => j.fits.test(listed)),
    ...JOBS.filter((j) => !j.fits.test(listed)),
  ];

  // The wall sorts newest first, so the dates are handed out in RANK order:
  // the best-matching sample is the most recent card, not whichever template
  // happened to carry the smallest number.
  const shared: SharedJob[] = ranked.map((j, i) => ({
    id: `${SAMPLE_PREFIX}job-${i}`,
    mechanic_id: page.id,
    vehicle: j.vehicle,
    service: j.service,
    price_label: j.price,
    done_on: new Date(now - (JOBS[i]?.daysAgo ?? 60) * DAY).toISOString().slice(0, 10),
    town: null,
    photo_url: null,
    caption: j.caption,
  }));

  const reviews: Review[] = REVIEWS.map((r, i) => ({
    id: `${SAMPLE_PREFIX}review-${i}`,
    mechanic_id: page.id,
    rating: r.rating,
    text: r.text,
    created_at: new Date(now - r.daysAgo * DAY).toISOString(),
  }));

  return { shared, reviews, rate: SAMPLE_RATE };
}
