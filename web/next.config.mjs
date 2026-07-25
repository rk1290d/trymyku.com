/** @type {import('next').NextConfig} */
const nextConfig = {
  // Profile photos come straight from Supabase storage as plain <img> tags,
  // so no remotePatterns config is needed.
  poweredByHeader: false,
  async rewrites() {
    // The analytics dashboard stays a self-contained static page,
    // served at the same /stats URL it had on GitHub Pages.
    return [{ source: '/stats', destination: '/stats.html' }];
  },
};

export default nextConfig;
