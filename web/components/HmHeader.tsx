import Link from 'next/link';

// The marketing pages' shared top bar in the storefront language: the REAL
// logo (never redrawn), the wordmark with its orange dot, one CTA. Sticky
// opaque ink; the styles live in home.css under .hm-hdr.
export default function HmHeader({ cta }: { cta: { href: string; label: string } }) {
  return (
    <header className="hm-hdr">
      <div className="hm-hdr-in">
        <Link href="/" className="logo" aria-label="Myku home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-img" src="/logo.png" alt="" width={30} height={30} />
          <b className="brandword">
            Myku<span className="branddot">.</span>
          </b>
        </Link>
        <Link className="hm-btn hm-btn-o hm-btn-sm hm-hdr-cta hm-mag" href={cta.href}>
          <span className="lbl">
            {cta.label}
            <span className="hm-arrow" aria-hidden="true">
              &#8594;
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
