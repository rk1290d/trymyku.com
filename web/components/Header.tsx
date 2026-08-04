import Link from 'next/link';

// The marketing top bar: the same quiet band strip the storefront
// pages open with. One wordmark, one audience link, nothing sticky,
// no logo box. The band below (the hero) carries the loud part.
export default function Header({
  cta,
}: {
  cta?: { href: string; label: string };
}) {
  return (
    <header className="site">
      <div className="container nav">
        <Link href="/" className="brand" aria-label="Myku home">
          <span className="wm">myku</span>
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
        </span>
      </div>
    </header>
  );
}
