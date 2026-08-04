import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-disp',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Myku Auto | The first place you go for car trouble',
    template: '%s | Myku Auto',
  },
  description:
    'Something wrong with your car? Open Myku. A marketplace that connects vehicle owners with independent, verified mechanics who set their own prices and win your work.',
  icons: { icon: '/logo.png', apple: '/logo.png' },
  openGraph: {
    type: 'website',
    siteName: 'Myku Auto',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export const viewport: Viewport = {
  // The ink band runs to the very top of every page, marketing and
  // storefront alike, so the browser chrome merges into the band.
  themeColor: '#14120F',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body>
        {children}
        <Script src="/track.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
