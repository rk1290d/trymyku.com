import { Big_Shoulders, Geist, Newsreader } from 'next/font/google';

// The van door's three faces, downloaded at build time and served from our own
// origin (the CSP allows no font host). Type is provenance on this page:
// Big Shoulders is the signage (his name, the numbers), Geist is facts and the
// interface, and Newsreader italic is HIS words only (his headline, captions,
// bio, request note). lib/vd/metrics.json holds these same fonts' glyph widths.
// Google merged Big Shoulders Display into one variable family with an optical
// size axis. The design (and lib/vd/metrics.json) is the Display cut, so the
// signage pins opsz 72 in vandoor.css rather than letting the size choose.
export const vdSign = Big_Shoulders({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--vd-sign',
  display: 'swap',
  // next/font has no fallback metrics for this family; the stack in vandoor.css is condensed faces
  adjustFontFallback: false,
});

export const vdText = Geist({
  subsets: ['latin'],
  variable: '--vd-text',
  display: 'swap',
});

export const vdVoice = Newsreader({
  subsets: ['latin'],
  style: ['italic', 'normal'],
  weight: ['400', '500'],
  variable: '--vd-voice',
  display: 'swap',
});
