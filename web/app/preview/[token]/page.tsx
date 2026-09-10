import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
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

// NO DEAD CONTROLS. The gap markers on a preview offer "Open in the app",
// which is a myku:// link into the app's page-fix route. That link only
// resolves on a device with the app installed, and the app is iOS only, so
// anywhere else the control would do visibly nothing and read as broken.
// Off an iPhone the marker prints the path through the app in words
// instead, which works everywhere. Reading a header costs nothing here: the
// route is already force-dynamic, so there was never a static render for it
// to spoil.
function wantsAppLinks(ua: string | null): boolean {
  return /iPhone|iPad|iPod/.test(ua ?? '');
}

export default async function PreviewPage({ params }: { params: Promise<Params> }) {
  const { token } = await params;
  const [data, h] = await Promise.all([loadPreviewPage(token), headers()]);
  if (!data) notFound();
  return <Storefront data={data} mode="preview" appLinks={wantsAppLinks(h.get('user-agent'))} />;
}
