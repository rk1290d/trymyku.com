// THE VAN DOOR BODY: the sections under the first screen (2026-10-04, stage 2 of
// the approved redesign). Types and small text helpers; the markup is in
// components/vd/Body.tsx. Ported from the design mock (src/view.py: ticket,
// ledger, work, services, reviews, meet) with Rohaan's calls applied: Myku names
// itself only in short source tags and the footer line ("the whole myku does
// this myku does that is very repetitive"), and "On Myku since" shows once a page
// is 100 days old.

export interface Ticket {
  key: string;
  vehicle: string;
  service: string | null;
  /** his own free-text price label ("$210", "quoted per build") */
  price: string | null;
  priceIsNum: boolean;
  when: string | null;
  town: string | null;
  caption: string | null;
  photo: string | null;
  sample: boolean;
  /** the service of his this job is about, so "ask about a job like this" can pick it */
  askService: string | null;
}

export interface LedgerRow {
  key: string;
  vehicle: string;
  job: string | null;
  amount: string | null;
  when: string | null;
}

export interface ReviewItem {
  key: string;
  rating: number;
  text: string | null;
  by: string;
  authorUrl?: string | null;
  author?: string | null;
}

export interface BodyInput {
  first: string;
  name: string;
  claimed: boolean;
  tickets: Ticket[];
  ledger: { rows: LedgerRow[]; total: number } | null;
  services: { label: string; priceFrom: number | null }[];
  myku: { rating: number; count: number; reviews: ReviewItem[] } | null;
  google: { rating: number; count: number; url: string | null; reviews: ReviewItem[] } | null;
  publicRating: { source: string; rating: number; count: number; url: string; highlights: string[] } | null;
  sampleReviews: ReviewItem[];
  meet: {
    face: string | null;
    bio: string[];
    years: number | null;
    area: string | null;
    hours: string | null;
    workType: 'Mobile' | 'Shop' | 'Mobile or drop-off' | null;
    city: string | null;
    certs: string[];
    insurance: boolean;
    socials: { key: string; label: string; url: string }[];
  };
  since: string | null;
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep 2026" from an ISO date; null for a missing or malformed one. */
export function month(s: string | null | undefined): string | null {
  if (!s) return null;
  const y = Number(String(s).slice(0, 4));
  const m = Number(String(s).slice(5, 7));
  if (!y || !m || m < 1 || m > 12) return null;
  return `${MONTHS[m - 1]} ${y}`;
}

/** "$1,250", or null for nothing to show (a missing amount, or 0: a job logged
 *  without an amount is stored as 0, and "$0" reads as a free job). */
export function moneyOrNull(n: number | null | undefined): string | null {
  return typeof n === 'number' && n > 0 ? `$${Math.round(n).toLocaleString('en-US')}` : null;
}

/** Long free text: the part up to the sentence end nearest `cut` (else a clause
 *  end, else a word end), shown first; the whole text sits behind one tap. */
export function clipText(text: string, at: number, cut: number): { head: string; clipped: boolean } {
  if (text.length <= at) return { head: text, clipped: false };
  let best: number | null = null;
  const tries: [RegExp, number, number][] = [
    [/[.!?](?=\s)/g, 140, at + 40],
    [/[,;:](?=\s)/g, 140, at],
  ];
  for (const [rx, lo, hi] of tries) {
    for (const m of text.matchAll(rx)) {
      const i = (m.index ?? 0) + 1;
      if (i >= lo && i <= hi && (best === null || Math.abs(i - cut) < Math.abs(best - cut))) best = i;
    }
    if (best !== null) break;
  }
  if (best === null) {
    const sp = text.lastIndexOf(' ', cut);
    best = sp > 0 ? sp : cut;
  }
  let head = text.slice(0, best).trimEnd();
  if (!/[.!?]$/.test(head)) head = head.replace(/[,;:]+$/, '') + '…';
  return { head, clipped: true };
}

/** Laptop columns that never leave an orphan in the first two rows. */
export function gridCols(n: number): number {
  return n === 1 ? 1 : n === 2 || n === 4 ? 2 : 3;
}

const SOCIAL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  youtube: 'YouTube',
  x: 'X',
  website: 'Website',
};
export function socialLabel(key: string): string {
  return SOCIAL_LABEL[key] ?? 'Website';
}
