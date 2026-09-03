#!/usr/bin/env node
/**
 * copy-sweep — the trust line, enforced at build time.
 *
 *   node scripts/copy-sweep.mjs        (CLI; also `npm run copy-sweep`)
 *
 * It ALSO runs from next.config.mjs during `next build` (PHASE_PRODUCTION_BUILD),
 * so it gates the Vercel deploy whatever build command Vercel invokes.
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

/* ====================================================================
   GEOGRAPHY  ::  the launch metro is not a fact about Myku (2026-09-02)

   Rohaan, 2026-09-02: "this startup is starting from chicago and suburbs
   but mentioning that in the app and website over and over doesnt help
   our long term goal or the short term goal but it hurts us in many
   ways."

   THE PRINCIPLE: GEOGRAPHY IS DERIVED, NEVER DECLARED. A mechanic's own
   page says where HE works, because that is a fact about him and it is
   computed from his row: Storefront's JSON-LD `areaServed` is built from
   his city and that is CORRECT and must keep working. What is refused is
   the SITE declaring where Myku operates.

   Why a gate: the metro had reached eighteen places across this repo and
   the app, and the two worst were not the marketing lines anyone would
   have thought to check. One was the placeholder on the signup form on
   /mechanics, the page whose entire job is converting a mechanic, telling
   him to type "e.g. Naperville or 60540". A mechanic anywhere else reads
   that as "not for you" on the form he was about to fill in.

   SCOPE is deliberately narrow: the metro, its county, the three seed
   towns used as worked examples, the state, and the state code in an
   address-like example. It does NOT try to catch "any place name". A
   mechanic's own town reaches this site as DATA, never as a literal in
   source, so nothing here can collide with it.

   If this ever blocks a genuinely innocent line, REPHRASE THE LINE. Do
   not loosen the rule.
   ==================================================================== */
const GEOGRAPHY = [
  /\bchicago\b/i,
  /\bdupage\b/i,
  /\bnaperville\b/i,
  /\blombard\b/i,
  /\boak\s+brook\b/i,
  /\billinois\b/i,
  /\bsuburb/i, // also catches the Spanish suburbio / suburbios
  /,\s*IL\b/,  // case-sensitive on purpose: the state code in "Naperville, IL"
];

// SELF-PROOF. A gate is worth what the evidence that it FIRES is worth.
// The first four are real strings that shipped on this site and are now
// gone; the last three must stay legal. "independent mechanics" is the one
// that matters in the negative set: it describes the MECHANICS, not Myku's
// coverage, and it is load-bearing copy on the home page.
const GEO_SELFTEST = [
  ['Live across Chicago and the suburbs', true],
  ['Now onboarding across Chicago and the suburbs', true],
  ['e.g. Naperville or 60540', true],
  ['It starts with mechanics in Chicago, and grows from there.', true],
  ['We connect you with independent mechanics, keep the facts transparent, and let you choose.', false],
  ['Town name or ZIP code', false],
  ['Myku is a marketplace, not a repair shop.', false],
];
for (const [sentence, shouldFire] of GEO_SELFTEST) {
  if (!!GEOGRAPHY.find((r) => r.test(sentence)) !== shouldFire) {
    console.error(
      '\ncopy-sweep: THE GEOGRAPHY GATE IS BROKEN. It ' +
        (shouldFire ? 'failed to flag' : 'wrongly flagged') + ': ' + sentence
    );
    process.exit(1);
  }
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

function walkCss(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkCss(p, out);
    else if (/\.css$/.test(name)) out.push(p);
  }
  return out;
}

/* ====================================================================
   AVAILABILITY  ::  the mechanic's "Available now" switch does not exist
   on this website, and this is the thing that keeps it that way.

   Rohaan, 2026-08-19, binding: "the only purpose of the available now
   button is that he is available to take bookings or get request or get
   messages... But the website, which is supposed to be a resume in case
   he wants to offer his work to somebody, that has nothing to do with
   the other."

   So the switch is an operational doorbell inside the app, and this site
   is his resume. Whether he is taking work today is not a fact about his
   business and it is not page content. It came off this site once; the
   only reason it will not drift back is a build that refuses it.

   THREE rules, because it can come back in three different ways:

     1. as COPY, if someone types a presence claim into the page;
     2. as a FIELD, if someone re-types `available` on MechanicPage, or
        re-adds it to the PAGE_COLUMNS select, or reads it to decide
        whether a section renders;
     3. as CSS, if the presence pill and its status dot are put back,
        which is how it looked before: an orange pill with a dot in it.

   Rule 2 permits exactly one thing, and permits it deliberately: DELETING
   the key. lib/pageData.ts strips `available` out of the preview bundle,
   which the site does not choose the shape of, and that line must keep
   working. Deleting the flag is always safe; reading, typing or selecting
   it is what is refused.
   ==================================================================== */
// If one of these ever blocks a genuinely innocent line ("the app is available
// now on the App Store"), REPHRASE THE LINE. Do not loosen the rule. The whole
// value of this gate is that it is not negotiable at the moment somebody is in
// a hurry, which is the moment the pill came back last time. Nothing on the
// site says any of these today, checked at the time this was written.
const PRESENCE_COPY = [
  /taking new work/i,
  /accepting new work/i,
  /available now/i,
  /currently available/i,
];

// The one permitted mention: throwing the key away.
const AVAILABLE_DELETE = /delete\s*\(.*\)\.available\s*[;,]?/;
const AVAILABLE_WORD = /\bavailable\b/;

// The visual vocabulary of live presence. Both sheets had a copy of it.
const PRESENCE_CSS = [/\.(?:mp|hm)-pill\.live\b/, /\.(?:mp|hm)-dot\b/];

function stripCssComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Strip // line comments and /* block */ comments. Crude but sufficient: the
// site's source has no string literal that legitimately contains "//" ahead
// of one of these phrases, and a false negative here would still be caught
// by a reader, while a false positive would block a deploy.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

export function runCopySweep() {
  const hits = [];
  for (const d of DIRS) {
    let files = [];
    try { files = walk(join(ROOT, d)); } catch { continue; }
    for (const f of files) {
      const src = stripComments(readFileSync(f, 'utf8'));
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        const where = `${relative(ROOT, f)}:${i + 1}`;
        const snip = line.trim().slice(0, 100);

        const re = VOUCHING.find((r) => isClaim(line, r));
        if (re) hits.push({ rule: 'vouching', text: `${where}  ${re}  ${snip}` });

        const pres = PRESENCE_COPY.find((r) => r.test(line));
        if (pres) hits.push({ rule: 'availability', text: `${where}  ${pres}  ${snip}` });

        if (AVAILABLE_WORD.test(line) && !AVAILABLE_DELETE.test(line)) {
          hits.push({ rule: 'availability', text: `${where}  \`available\` field  ${snip}` });
        }

        const geo = GEOGRAPHY.find((r) => r.test(line));
        if (geo) hits.push({ rule: 'geography', text: `${where}  ${geo}  ${snip}` });
      });
    }
  }

  // The presence pill and its dot, in any stylesheet the site ships.
  let cssFiles = [];
  try { cssFiles = walkCss(join(ROOT, 'app')); } catch { cssFiles = []; }
  for (const f of cssFiles) {
    const lines = stripCssComments(readFileSync(f, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      const re = PRESENCE_CSS.find((r) => r.test(line));
      if (re) {
        hits.push({
          rule: 'availability',
          text: `${relative(ROOT, f)}:${i + 1}  presence pill / status dot  ${line.trim().slice(0, 100)}`,
        });
      }
    });
  }

  return hits;
}

export function reportCopySweep(hits) {
  const vouching = hits.filter((h) => h.rule === 'vouching');
  const availability = hits.filter((h) => h.rule === 'availability');
  const geography = hits.filter((h) => h.rule === 'geography');

  if (vouching.length) {
    console.error('\ncopy-sweep: vouching phrase in site copy (Myku confirms facts, it never endorses):');
    for (const h of vouching) console.error('  ' + h.text);
  }
  if (availability.length) {
    console.error(
      '\ncopy-sweep: availability is back on the website. It must not be.\n' +
        '  The "Available now" switch is an in-app doorbell about inbound work.\n' +
        '  This site is the mechanic\'s resume and has nothing to do with it: no\n' +
        '  presence copy, no `available` field, no status pill or dot. The only\n' +
        '  permitted mention is deleting the key out of the preview bundle.'
    );
    for (const h of availability) console.error('  ' + h.text);
  }
  if (geography.length) {
    console.error(
      '\ncopy-sweep: the launch metro is declared in site copy. It must not be.\n' +
        '  Geography is DERIVED, never declared. A mechanic\'s page says where HE\n' +
        '  works, computed from his own row, and Storefront\'s areaServed is built\n' +
        '  that way on purpose. The SITE never says where Myku operates: it caps\n' +
        '  the ambition, it reads as a coverage promise the product cannot keep,\n' +
        '  and on /mechanics it tells the next mechanic he is in the wrong place.'
    );
    for (const h of geography) console.error('  ' + h.text);
  }
  if (vouching.length || availability.length || geography.length) return false;

  console.log('copy-sweep: clean.');
  return true;
}

// CLI entry (node scripts/copy-sweep.mjs); the build imports the functions.
const invokedDirectly =
  typeof process.argv[1] === 'string' &&
  /copy-sweep\.mjs$/.test(process.argv[1].replace(/\\/g, '/'));
if (invokedDirectly) {
  process.exit(reportCopySweep(runCopySweep()) ? 0 : 1);
}
