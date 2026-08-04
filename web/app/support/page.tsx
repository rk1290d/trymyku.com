import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with the Myku app.',
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return (
    <>
      <Header />
      <main>
        <div className="page">
          <h1>Myku Support</h1>
          <p style={{ marginTop: 6 }}>Need help with the Myku app? We&apos;re here.</p>

          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '18px 20px',
              marginTop: 18,
            }}
          >
            <p>
              <strong>Email us:</strong>{' '}
              <a href="mailto:support@trymyku.com">support@trymyku.com</a>
              <br />
              We aim to respond within 1 to 2 business days.
            </p>
          </div>

          <h2>Common questions</h2>
          <p>
            <strong>How do I post a job?</strong> Open the app, tap &quot;Post a
            Job,&quot; and follow the steps: vehicle details, what you need, and your
            location.
          </p>
          <p>
            <strong>How does pricing work?</strong> Mechanics send you bids. You choose
            the one you like and arrange payment directly with the mechanic.
          </p>
          <p>
            <strong>How is my address protected?</strong> Mechanics only see your
            approximate area until you accept a bid. Your exact address is shared only
            with the mechanic you choose.
          </p>
          <p>
            <strong>What is a mechanic page?</strong> A public page at
            trymyku.com/their-name showing a mechanic&apos;s services, reviews, and job
            history. You can request a quote from it without downloading anything.
          </p>
          <p>
            <strong>How do I delete my account?</strong> Go to Settings → Delete
            Account. This permanently removes your profile, jobs, messages, and
            reviews.
          </p>
          <p>
            <strong>How do I report a problem with a user?</strong> Use the report or
            block option in the chat menu. Reports are reviewed within 24 hours.
          </p>

          <p style={{ marginTop: 36 }}>
            <Link href="/privacy">Privacy Policy</Link> ·{' '}
            <Link href="/terms">Terms of Service</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
