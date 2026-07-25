/** @type {import('next').NextConfig} */
const nextConfig = {
  // Profile photos come straight from Supabase storage as plain <img> tags,
  // so no remotePatterns config is needed.
  poweredByHeader: false,
  // The OG-image routes read display fonts from disk at runtime; make sure
  // the TTFs ship inside the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    '/opengraph-image': ['./assets/fonts/*.ttf'],
    '/[slug]/opengraph-image': ['./assets/fonts/*.ttf'],
  },
  async rewrites() {
    // The analytics dashboard stays a self-contained static page,
    // served at the same /stats URL it had on GitHub Pages.
    return [{ source: '/stats', destination: '/stats.html' }];
  },
};

export default nextConfig;
