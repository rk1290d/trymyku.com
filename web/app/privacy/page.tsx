import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Myku collects, uses, and protects your information.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main>
        <div className="page">
          <h1>Privacy Policy</h1>
          <p className="updated">Last updated: May 2026</p>

          <h2>Overview</h2>
          <p>
            Myku connects vehicle owners with independent local mechanics. This policy
            explains what we collect, why we collect it, and the choices you have.
            Questions? Email <a href="mailto:support@trymyku.com">support@trymyku.com</a>.
          </p>

          <h2>Information we collect</h2>
          <p>
            Account details (name, email, phone number), your vehicles, job details and
            photos, messages you send, reviews you write, your approximate location
            and, only after you accept a mechanic, your precise location, and device
            push-notification tokens. Mechanics also provide service details and
            verification documents (such as ID and certifications).
          </p>

          <h2>How we use it</h2>
          <p>
            To match you with nearby mechanics, show your job to mechanics, enable
            messaging, coordinate bookings, send notifications, prevent fraud and
            abuse, and improve the service.
          </p>

          <h2>Public mechanic pages</h2>
          <p>
            Mechanics can have a public profile page on trymyku.com showing their name,
            photo, services, service area, verification status, reviews, and job
            history they choose to share. Public pages never show a mechanic&apos;s
            contact details, documents, or precise location. Quote requests submitted
            on a public page (your name, phone number, and job description) are shared
            only with that mechanic.
          </p>

          <h2>Location privacy</h2>
          <p>
            Until you accept a mechanic, only your approximate area is shared with
            mechanics, never your exact address. Your precise address is revealed to a
            mechanic only after you accept their bid, so they can reach you for the
            job.
          </p>

          <h2>Who we share with</h2>
          <p>
            Service providers that help us run the app: Supabase (database and
            authentication), a payment processor (for transactions, when in-app
            payments are enabled), and mapping/geocoding providers (to find and display
            nearby jobs and mechanics). We do not sell your personal data.
          </p>

          <h2>Data retention &amp; deletion</h2>
          <p>
            We keep your data while your account is active. You can permanently delete
            your account anytime in <strong>Settings → Delete Account</strong>, which
            removes your profile, jobs, messages, and reviews.
          </p>

          <h2>Your choices</h2>
          <p>
            You can edit your profile, manage notification preferences in Settings, and
            revoke location, camera, photo, and microphone permissions in your device
            settings at any time.
          </p>

          <h2>Children</h2>
          <p>Myku is not intended for anyone under 18.</p>

          <h2>Contact</h2>
          <p>
            Questions about this policy:{' '}
            <a href="mailto:support@trymyku.com">support@trymyku.com</a>
          </p>

          <p style={{ marginTop: 36 }}>
            <Link href="/terms">Terms of Service</Link> ·{' '}
            <Link href="/support">Support</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
