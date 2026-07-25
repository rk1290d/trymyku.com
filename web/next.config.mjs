/** @type {import('next').NextConfig} */
const nextConfig = {
  // Profile photos come straight from Supabase storage as plain <img> tags,
  // so no remotePatterns config is needed.
  poweredByHeader: false,
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
};

export default nextConfig;
