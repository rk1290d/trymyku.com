import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <Header cta={{ href: '/mechanics', label: "I'm a Mechanic" }} />
      <main>
        <div className="page" style={{ textAlign: 'center', paddingTop: 90, paddingBottom: 110 }}>
          <h1>Page not found</h1>
          <p style={{ marginTop: 10 }}>
            This link doesn&apos;t go anywhere, or the page it pointed to is no longer
            live.
          </p>
          <p style={{ marginTop: 22 }}>
            <Link href="/" className="btn btn-primary" style={{ display: 'inline-flex' }}>
              Back to Myku
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
