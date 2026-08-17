import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Shown when the token is missing, expired or not a token at all. Same
// shape as the site's root not-found so it reuses the marketing styling.
// No CTA in the header: the only person who lands here is the mechanic.
export default function PreviewNotFound() {
  return (
    <>
      <Header />
      <main>
        <div className="page" style={{ textAlign: 'center', paddingTop: 90, paddingBottom: 110 }}>
          <h1>Preview expired</h1>
          <p style={{ marginTop: 10 }}>This preview has expired. Open the app and tap Preview again.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
