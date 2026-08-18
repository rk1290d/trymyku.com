import type { Metadata, Viewport } from 'next';
import { notFound, redirect } from 'next/navigation';
import Storefront from '@/components/Storefront';
import { getMechanicPage, resolveRetiredSlug } from '@/lib/supabase';
import { loadPublicPage } from '@/lib/pageData';
import { firstName } from '@/lib/format';
import './profile.css';

export const revalidate = 60;

// The mechanic's own storefront. Myku is the quiet trust layer underneath
// it, never the brand on top of it.
export const viewport: Viewport = {
  // Keep in sync with --mp-ink in profile.css. The header band runs to the
  // very top of the page, so the Android status bar merges into it.
  themeColor: '#08090B',
  colorScheme: 'dark',
};

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getMechanicPage(slug);
  if (!page) {
    // Metadata cannot redirect; the page function below does. This only
    // keeps the tab from reading "Page not found" during the hop.
    const current = await resolveRetiredSlug(slug);
    if (current && current !== slug) return { title: 'Redirecting' };
    return { title: 'Page not found' };
  }

  const city = page.service_city?.split(',')[0]?.trim();
  const spec = page.specialization || 'Independent mechanic';
  const first = firstName(page.full_name);
  // The business name leads here too when he has set one (decision 4), so the
  // tab, the Google result and the link preview all agree with the H1 his page
  // renders. Without this a mechanic trading under a shop name was absent from
  // every surface a stranger sees BEFORE tapping, which is the only surface
  // that decides whether they tap at all.
  const headline = page.business_name?.trim() || page.full_name;
  const title = `${headline} | ${city ? `Mechanic in ${city}` : 'Independent mechanic'}`;
  // States what the page is and what to do on it. Myku does not vouch,
  // including inside a search snippet or a Messenger preview. The unclaimed
  // variant mirrors the composer's own promise: the mechanic has not agreed
  // to reply, so the preview must not say they will.
  const description =
    page.web_status === 'published'
      ? `${spec}${city ? ` in ${city}` : ''}. Pick the job and get a price from ${first} through Myku.`
      : `${spec}${city ? ` in ${city}` : ''}. A preview page. ${first} has not claimed it and it is not taking requests.`;

  return {
    // `absolute` opts this route out of the root layout's "%s | Myku Auto"
    // template. The tab, the search headline and the preview title all lead
    // with the mechanic; Myku is a whisper on this page, not a suffix.
    title: { absolute: title },
    description,
    alternates: { canonical: `/${page.slug}` },
    robots:
      page.web_status === 'published'
        ? undefined
        : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `/${page.slug}`,
      type: 'profile',
    },
  };
}

/* ------------------------------------------------------------------
   PAGE
   ------------------------------------------------------------------ */
// The route only loads and gates. The page itself is components/Storefront.tsx,
// so the private preview route can render the same component from the same
// data.
export default async function ProfilePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const data = await loadPublicPage(slug);
  if (!data) {
    // A retired slug follows the page to its current address. redirect(),
    // not permanentRedirect(): a 308 is cached by browsers, and a rename
    // A -> B -> A would then loop on the cached hop.
    const current = await resolveRetiredSlug(slug);
    if (current && current !== slug) redirect('/' + current);
    notFound();
  }
  return <Storefront data={data} />;
}
