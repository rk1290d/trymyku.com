import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import { runCopySweep, reportCopySweep } from './scripts/copy-sweep.mjs';

// WHAT THE SITE IS ALLOWED TO LOAD, AND WHY EACH LINE IS THERE.
// Until 2026-09-13 the only content policy here was frame-ancestors, so an
// injected tag could have pulled a script from anywhere. Everything the site
// actually needs is same-origin or our own Supabase project:
//   script-src   'unsafe-inline' is required by Next's own hydration bootstrap,
//                which is inlined into every page. It is not a nonce, but it
//                still stops a script being fetched from another host, which
//                is the half an injection needs.
//   style-src    same reason: Next inlines critical CSS.
//   font-src     next/font/google downloads the two typefaces at BUILD time
//                and serves them from our own origin, so no font host is
//                needed at runtime.
//   img-src      profile photos and job thumbnails come from our Supabase
//                storage, either straight or through the optimizer.
//   connect-src  track.js posts a page view to our Supabase project; the quote
//                form posts to our own /api/lead.
//   object-src / base-uri / form-action close the three classic injection
//                escape hatches: a plugin, a rewritten relative-URL base, and
//                a form retargeted at someone else's server.
// JSON-LD is a data block rather than executable script, so it is unaffected.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://fioiaoxaozqfwdqukoho.supabase.co",
  "connect-src 'self' https://fioiaoxaozqfwdqukoho.supabase.co",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

// /stats is the one page that loads a typeface at runtime.
const STATS_CSP = CSP.replace(
  "style-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
).replace("font-src 'self' data:", "font-src 'self' data: https://fonts.gstatic.com");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Profile photos and job thumbnails render through next/image so a 72px
  // portrait never ships the original multi-MB phone upload. Only Supabase
  // storage hosts go through the optimizer; other hosts render unoptimized.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'fioiaoxaozqfwdqukoho.supabase.co' }],
  },
  // The OG-image routes read display fonts from disk at runtime; make sure
  // the TTFs ship inside the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    // Note: keys are globs, so [slug] would parse as a character class.
    // The ** pattern covers both the root and per-profile OG routes.
    '/opengraph-image': ['./assets/fonts/*.ttf'],
    '/**/opengraph-image': ['./assets/fonts/*.ttf'],
  },
  async rewrites() {
    // The analytics dashboard stays a self-contained static page,
    // served at the same /stats URL it had on GitHub Pages.
    return [{ source: '/stats', destination: '/stats.html' }];
  },
  async headers() {
    return [
      // Every page: nobody else's site gets to frame a mechanic's page, the
      // browser never sniffs a response into a different type, and a Referer
      // sent off-site carries the origin only. The /preview entry below wins
      // on Referrer-Policy for its own paths because it is listed later.
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // A mechanic's page never asks for a camera, a microphone or a
          // location, so the browser should refuse on our behalf if a script
          // ever does.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          // Two years, every subdomain, and eligible for the browser preload
          // list. A mechanic hands this link to a customer who types it by
          // hand; the first request is the one worth protecting.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      // The stats dashboard is a static page that pulls its typeface from
      // Google Fonts and carries its own stricter meta policy. Listed after
      // the block above so this value wins for its own two paths.
      {
        source: '/stats',
        headers: [{ key: 'Content-Security-Policy', value: STATS_CSP }],
      },
      {
        source: '/stats.html',
        headers: [{ key: 'Content-Security-Policy', value: STATS_CSP }],
      },
      // Private previews: never indexed, never cached, and the token in the
      // URL never leaks through a Referer to any link on the page.
      {
        source: '/preview/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

// A deploy with no REVALIDATE_SECRET builds and serves perfectly well. It just
// runs with on-demand revalidation switched OFF: the database fires a webhook
// at app/api/revalidate on every mechanic edit and this site refuses every one
// of them, and until now that was invisible from both ends. It is deliberately
// NOT a build failure. The time-based fallback is real, and a hard gate on an
// operational variable would block an unrelated fix from ever shipping. But it
// is not allowed to be quiet either, and the Vercel build log is the one place
// the owner is definitely looking on the day this matters.
function reportRevalidateSecret() {
  const rule = '='.repeat(72);
  if (process.env.REVALIDATE_SECRET) {
    console.log('revalidate: REVALIDATE_SECRET is set. On-demand page updates are armed.');
    return;
  }
  console.warn(`\n${rule}`);
  console.warn('  REVALIDATE_SECRET IS NOT SET ON THIS DEPLOYMENT.');
  console.warn('');
  console.warn('  On-demand page revalidation is OFF. The database calls');
  console.warn('  /api/revalidate on every mechanic edit and this build will');
  console.warn('  refuse every one of those calls with 503 not_configured.');
  console.warn('');
  console.warn('  Consequence: a storefront page catches up on the time-based');
  console.warn('  fallback (up to 60 seconds), and its link-preview card only');
  console.warn('  when its own cache window lapses. Nothing is lost and no save');
  console.warn('  breaks; edits are just slower to appear than they should be.');
  console.warn('');
  console.warn('  Fix: add REVALIDATE_SECRET to the Vercel project environment');
  console.warn('  (Production and Preview) and redeploy. Its value is the shared');
  console.warn('  secret already stored on the database side.');
  console.warn('');
  console.warn('  Check afterwards: GET https://trymyku.com/api/revalidate');
  console.warn(`${rule}\n`);
}

// The trust-line copy sweep runs inside the production build itself, so it
// gates the deploy no matter which build command Vercel invokes (a package
// script alone is bypassed by a bare `next build`).
export default function config(phase) {
  if (phase === PHASE_PRODUCTION_BUILD && !reportCopySweep(runCopySweep())) {
    process.exit(1);
  }
  if (phase === PHASE_PRODUCTION_BUILD) reportRevalidateSecret();
  return nextConfig;
}
