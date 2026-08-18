#!/usr/bin/env node
/**
 * copy-sweep — the trust line, enforced at build time.
 *
 *   node scripts/copy-sweep.mjs        (runs before `next build`, see package.json)
 *
 * VISION.md: Myku confirms facts and shows them; it never vouches. These
 * phrases turn a checked fact into an endorsement and are refused in every
 * string the site ships, in either language. The app enforces the same list
 * in scripts/i18n-parity.mjs (Myku repo); keep the two lists identical.
 *
 * Scans app/, components/ and lib/ (.ts/.tsx). Comments are stripped first
 * so a comment that EXPLAINS the rule ("never say verified profile") does
 * not trip it; only string and JSX text can. Exit 1 on any hit.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIRS = ['app', 'components', 'lib'];

const VOUCHING = [
  /verified\s+profile/i,
  /official\s+page/i,
  /myku\s+recommends?/i,
  /recommended\s+by\s+myku/i,
  /perfil\s+verificad[oa]/i,
  /p[aá]gina\s+oficial/i,
  /myku\s+(lo\s+|la\s+|te\s+)?recomienda/i,
  /recomendad[oa]\s+por\s+myku/i,
];

// A DISCLOSURE that negates the claim is not a claim: "They do not mean Myku
// recommends the work" is exactly the sentence the trust line wants. A hit
// preceded on its line by not / never / no (or nunca / ni / tampoco) within
// forty characters is left alone.
const NEGATED = /\b(not|never|no|nunca|ni|tampoco)\b[^.]{0,40}$/i;
function isClaim(line, re) {
  const m = re.exec(line);
  if (!m) return false;
  return !NEGATED.test(line.slice(Math.max(0, m.index - 40), m.index));
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs|js)$/.test(name)) out.push(p);
  }
  return out;
}

// Strip // line comments and /* block */ comments. Crude but sufficient: the
// site's source has no string literal that legitimately contains "//" ahead
// of one of these phrases, and a false negative here would still be caught
// by a reader, while a false positive would block a deploy.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const hits = [];
for (const d of DIRS) {
  let files = [];
  try { files = walk(join(ROOT, d)); } catch { continue; }
  for (const f of files) {
    const src = stripComments(readFileSync(f, 'utf8'));
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      const re = VOUCHING.find((r) => isClaim(line, r));
      if (re) hits.push(`${relative(ROOT, f)}:${i + 1}  ${re}  ${line.trim().slice(0, 100)}`);
    });
  }
}

if (hits.length) {
  console.error('\ncopy-sweep: vouching phrase in site copy (Myku confirms facts, it never endorses):');
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log('copy-sweep: clean.');
