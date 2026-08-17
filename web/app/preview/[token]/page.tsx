import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import Storefront from '@/components/Storefront';
import { loadPreviewPage } from '@/lib/pageData';
import '@/app/[slug]/profile.css';

// PRIVATE PREVIEW  ::  trymyku.com/preview/<token>
//
// The mechanic's own draft, seen exactly as visitors will see it. This
// route renders the SAME Storefront component the live page renders, from
// a bundle keyed by the token in the URL rather than by slug. The token is
// minted by the app, hashed server-side, and expires; a missing, expired or
// garbage token yields no bundle and the route 404s. force-dynamic so every
// open shows the latest save (the loader also fetches with no-store), and
// noindex because this is nobody's public listing.
export const dynamic = 'force-dynamic';

// Same as the live route: the header band runs to the very top of the page.
export const viewport: Viewport = {
  themeColor: '#08090B',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  title: { absolute: 'Preview' },
  robots: { index: false, follow: false, nocache: true },
};

type Params = { token: string };

export default async function PreviewPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const data = await loadPreviewPage(token);
  if (!data) notFound();
  return <Storefront data={data} mode="preview" />;
}
