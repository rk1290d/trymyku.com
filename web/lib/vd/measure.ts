import metricsJson from './metrics.json';

// TEXT MEASUREMENT FOR THE VAN DOOR HERO (2026-10-04).
//
// Ported from the approved design mock (design-mocks/mechanic-page-2026-10-04 in
// the app repo, src/view.py: Ctx.width, Ctx.lines, Ctx.ink, Ctx.name_lh,
// Ctx.fit_name). The widths are real glyph advances of the page's own fonts,
// measured in Chrome at 100px (tools/metrics.mjs in the mock), so the server can
// decide, before the page is sent, how big his name can be and how tight the
// first screen has to be for the orange button to stay on screen one inside
// Facebook's in-app browser. Nothing here runs in the browser.

type Face = 'sign800' | 'text400' | 'text500' | 'text600' | 'voice';
type FaceMetrics = { adv: Record<string, number>; vb?: Record<string, [number, number]> };
const M = metricsJson as unknown as Record<Face, FaceMetrics>;

/** A measuring-only space that does not break: a run the page keeps on one line
 *  ("7 AM", a town in .nw) is measured as one word. */
export const GLUE = '';
export const NB = ' ';

export function width(s: string, face: Face, size: number, track = 0): number {
  const adv = M[face].adv;
  const fallback = adv.n ?? 50;
  const sp = adv[' '] ?? fallback;
  // emoji and symbols are not in the measured fonts: about 1.37em in an emoji font
  const wide = 137;
  let sum = 0;
  let n = 0;
  for (const ch of s) {
    n++;
    if (ch === GLUE || ch === NB) sum += sp;
    else sum += adv[ch] ?? ((ch.codePointAt(0) ?? 0) >= 0x2190 ? wide : fallback);
  }
  return (sum * size) / 100 + track * size * n;
}

export function glue(s: string | null | undefined): string {
  return (s ?? '').replace(/ /g, GLUE).replace(/ /g, GLUE);
}

// Where one long unbroken token (a web address, a handle, CamelCase) may break:
// after . / _ @ and where lower case meets upper case.
const SOFT_RX = /(?<=[./_@])(?=[^\s./_@])|(?<=[a-z])(?=[A-Z])/;
export function pieces(word: string): string[] {
  return word.split(SOFT_RX).filter(Boolean);
}

/** Greedy word wrap with measured widths: [line count, every unbreakable piece fits]. */
export function lines(
  s: string,
  face: Face,
  size: number,
  col: number,
  track = 0,
  soft = false,
  anywhere = false
): [number, boolean] {
  const words = s.split(/[ \t\r\n]+/).filter(Boolean);
  let n = 0;
  let cur = '';
  let ok = true;
  for (const w of words) {
    const parts = soft || anywhere ? pieces(w) : [w];
    parts.forEach((p, i) => {
      const pw = width(p, face, size, track);
      if (pw > col) {
        ok = false;
        if (anywhere) {
          if (cur) n += 1;
          n += Math.ceil(pw / col) - 1;
          cur = p;
          return;
        }
      }
      const cand = cur ? cur + (i ? '' : ' ') + p : p;
      if (width(cand, face, size, track) <= col) cur = cand;
      else {
        n += 1;
        cur = p;
      }
    });
  }
  if (cur) n += 1;
  return [Math.max(n, 1), ok];
}

/** [ascent, descent] of a signage glyph's ink, in em. */
function ink(ch: string): [number, number] {
  const vb = M.sign800.vb ?? {};
  const v = vb[ch] ?? ((ch.codePointAt(0) ?? 0) >= 0x2190 ? [90, 25] : [81, 21]);
  return [v[0] / 100, v[1] / 100];
}

const LEAD_GAP = 3;
const LEAD_GAP_EM = 0.08;

/** The name's line-height: wherever a wrapped name breaks, the ink hanging below
 *  one line (a Q's tail, a comma) clears the ink rising on the next (a capital, an
 *  accent) by LEAD_GAP px at px. Never tighter than .96 (caps) / 1.04 (title case). */
export function nameLh(text: string, upper: boolean, px: number, soft = false): number {
  const base = upper ? 0.96 : 1.04;
  const t = upper ? text.toUpperCase() : text;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2 && !soft) return base;
  const above = soft ? t : words.slice(0, -1).join(' ');
  const below = soft ? t : words.slice(1).join(' ');
  let desc = 0;
  for (const ch of above) if (!/\s/.test(ch)) desc = Math.max(desc, ink(ch)[1]);
  let asc = 0;
  for (const ch of below) if (!/\s/.test(ch)) asc = Math.max(asc, ink(ch)[0]);
  const need = asc + desc + Math.max(LEAD_GAP / px, LEAD_GAP_EM);
  return need <= base ? base : Math.ceil(need * 1000) / 1000;
}

export type NameClass = [cls: string, px: number, upper: boolean, maxLines: number];

/** The biggest length class whose wrap stays within its line cap. Names longer
 *  than longAt are set in title case only. soft = a token too wide at every size
 *  (a typed web address) breaks at its own seams, never mid-word. */
export function fitName(
  text: string,
  col: number,
  classes: NameClass[],
  emergency: NameClass[] = [],
  longAt = 28
): { cls: string; upper: boolean; lines: number; px: number; soft: boolean } {
  for (const [cls, px, upper, cap] of classes) {
    if (upper && text.length > longAt) continue;
    const s = upper ? text.toUpperCase() : text;
    const [n, ok] = lines(s, 'sign800', px, col, 0.004);
    if (ok && n <= cap) return { cls, upper, lines: n, px, soft: false };
  }
  for (const [cls, px, upper, cap] of [...classes, ...emergency]) {
    if (upper) continue;
    const [n, ok] = lines(text, 'sign800', px, col, 0.004, true);
    if (ok && n <= cap) return { cls, upper: false, lines: n, px, soft: true };
  }
  const last = (emergency.length ? emergency : classes)[(emergency.length ? emergency : classes).length - 1];
  const [n] = lines(text, 'sign800', last[1], col, 0.004, true);
  return { cls: last[0], upper: false, lines: n, px: last[1], soft: true };
}
