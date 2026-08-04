import Link from 'next/link';
import AppStoreBadge from './AppStoreBadge';
import { INSTAGRAM_URL, SUPPORT_EMAIL } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="site">
      <div className="container">
        <Link href="/" className="foot-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Myku logo" width={34} height={34} />
          <span className="wm">Myku</span>
        </Link>
        <div className="foot-badge">
          <AppStoreBadge />
        </div>
        <div className="foot-social">
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener" aria-label="Myku Auto on Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5.5" />
              <circle cx="12" cy="12" r="4" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
        </div>
        <div className="foot-links">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/support">Support</Link>
        </div>
        <a className="foot-email" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
        <div className="foot-copy">&copy; 2026 Myku Auto. All rights reserved.</div>
      </div>
    </footer>
  );
}
