import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of Myku.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main>
        <div className="page">
          <h1>Terms of Service</h1>
          <p className="updated">Last updated: May 2026</p>

          <h2>Agreement</h2>
          <p>By using Myku you agree to these Terms. If you do not agree, do not use the app.</p>

          <h2>The service</h2>
          <p>
            Myku is a marketplace that connects customers with independent local
            mechanics. Myku is not the mechanic and does not perform repairs. Mechanics
            are independent and solely responsible for the work they agree to and
            perform.
          </p>

          <h2>Eligibility</h2>
          <p>
            You must be 18 or older and provide accurate information. You are
            responsible for activity on your account.
          </p>

          <h2>Community standards: zero tolerance</h2>
          <p>
            There is no tolerance for objectionable content or abusive behavior. You
            agree not to post harassing, hateful, fraudulent, illegal, or sexually
            explicit content, and not to harass other users. Violations result in
            content removal and account termination. You can report content or block
            any user from the chat menu; reports are reviewed within 24 hours.
          </p>

          <h2>Public mechanic pages</h2>
          <p>
            Mechanics may have a public profile page on trymyku.com. Job history a
            mechanic uploads themselves is labeled as self-reported and must be
            truthful; misrepresenting work, prices, or credentials violates these
            Terms. Jobs completed through Myku are marked verified. Quote requests
            submitted on a page are delivered to that mechanic; submitting spam or
            fraudulent requests is prohibited.
          </p>

          <h2>Payments</h2>
          <p>
            Prices are agreed between you and the mechanic. While in-app payments are
            disabled, payment for completed work is arranged directly between you and
            the mechanic. If in-app payments are enabled later, any platform fees will
            be disclosed before you pay.
          </p>

          <h2>Cancellations</h2>
          <p>
            You may cancel a job per the cancellation terms shown in the app. Repeated
            no-shows or abusive cancellations may affect your standing.
          </p>

          <h2>Disclaimers</h2>
          <p>
            Myku provides the platform &quot;as is&quot; and does not guarantee any
            mechanic&apos;s work. Disputes can be filed in the app and we will help
            mediate, but Myku is not liable for the quality of independent
            mechanics&apos; services to the extent permitted by law.
          </p>

          <h2>Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these Terms or create
            risk for the community.
          </p>

          <h2>Contact</h2>
          <p>
            <a href="mailto:support@trymyku.com">support@trymyku.com</a>
          </p>

          <p style={{ marginTop: 36 }}>
            <Link href="/privacy">Privacy Policy</Link> ·{' '}
            <Link href="/support">Support</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
