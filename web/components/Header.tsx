import Link from 'next/link';
import AppStoreBadge from './AppStoreBadge';

export default function Header({
  cta,
}: {
  cta?: { href: string; label: string };
}) {
  return (
    <header className="site" id="hdr">
      <div className="container nav">
        {/* Logo + wordmark, matching HmHeader: the shared Footer went
            logo-only, so if the header also carried the mark alone, the
            legacy routes (privacy, terms, support, 404) would never spell
            the brand's name anywhere on the page. */}
        <Link href="/" className="brand" aria-label="Myku home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={40} height={40} />
          <span className="wm">
            Myku<span className="dot">.</span>
          </span>
        </Link>
        <span className="nav-right">
          {cta ? (
            <Link href={cta.href} className="nav-cta">
              {cta.label}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ) : null}
          <AppStoreBadge small />
        </span>
      </div>
    </header>
  );
}
