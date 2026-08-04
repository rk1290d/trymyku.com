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
        {/* The top bar carries the mark alone; the wordmark lives in the
            footer. The logo IS the brand up here. */}
        <Link href="/" className="brand" aria-label="Myku home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Myku" width={40} height={40} />
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
