import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';
import { runCopySweep, reportCopySweep } from './scripts/copy-sweep.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Profile photos and job thumbnails render through next/image so a 72px
  // portrait never ships the original multi-MB phone upload. Only Supabase
  // storage hosts go through the optimizer; other hosts render unoptimized.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
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
    // Private previews: never indexed, never cached, and the token in the
    // URL never leaks through a Referer to any link on the page.
    return [
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
