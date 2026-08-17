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

export default nextConfig;
