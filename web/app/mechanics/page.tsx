import type { Metadata } from 'next';
import HmHeader from '@/components/HmHeader';
import Footer from '@/components/Footer';
import AppStoreBadge from '@/components/AppStoreBadge';
import ConciergeForm from '@/components/ConciergeForm';
import StorefrontFx from '@/components/StorefrontFx';
import '../home.css';

export const metadata: Metadata = {
  title: 'For Mechanics | A professional page for your business, free',
  description:
    'Get a professional page with your real jobs, real prices, and real reviews at trymyku.com/your-name. Share it anywhere in one tap. Your prices, your customers, your reputation.',
  alternates: { canonical: '/mechanics' },
};

const Arrow = () => (
  <span className="hm-arrow" aria-hidden="true">
    &#8594;
  </span>
);

const Pin = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function MechanicsPage() {
  return (
    <div className="hm">
      <HmHeader cta={{ href: '/customers', label: 'I Need a Mechanic' }} />
      <main>
        {/* ---------- HERO ---------- */}
        <section className="hm-ink hm-hero">
          <StorefrontFx prefix="hm" />
          <svg className="hm-hero-mark" viewBox="0 0 400 400" aria-hidden="true">
            <g fill="none" stroke="#F97316" strokeWidth="1.2">
              <circle cx="200" cy="200" r="198" />
              <circle cx="200" cy="200" r="162" />
              <circle cx="200" cy="200" r="112" />
              <circle cx="200" cy="200" r="64" />
              <circle cx="200" cy="200" r="22" />
              <g strokeWidth="2.4">
                <path d="M200 2v26M200 372v26M2 200h26M372 200h26" />
              </g>
            </g>
          </svg>

          <div className="hm-wrap hm-hero-in">
            <div className="hm-hero-grid">
              <div>
                <div className="hm-hero-eyebrow">
                  <p className="hm-eyebrow">
                    <span>Now onboarding independent mechanics</span>
                  </p>
                  <span className="hm-ln" aria-hidden="true" />
                </div>

                <h1 className="hm-name nm-long">
                  <span>Your work{" "}</span>
                  <span className="r2">is good.</span>
                </h1>

                <svg className="hm-underink" viewBox="0 0 560 16" preserveAspectRatio="none" aria-hidden="true">
                  <path pathLength="100" d="M4 11 C 90 4, 168 14, 252 8 S 420 3, 556 9" />
                </svg>

                <p className="hm-pitch">
                  Your page should <b>prove it.</b>
                </p>

                <p className="hm-lead">
                  Myku gives you a professional page at trymyku.com/your-name, with your
                  real jobs, real prices, and real reviews. One tap to share it anywhere
                  you already talk to customers.
                </p>

                <div className="hm-hero-cta">
                  <AppStoreBadge />
                  <a className="hm-btn hm-btn-ghost hm-mag" href="#build">
                    <span className="lbl">
                      Or let us build it for you
                      <Arrow />
                    </span>
                  </a>
                </div>

                <p className="hm-hero-foot">
                  <span className="dot" aria-hidden="true" />
                  Set up in about 10 minutes with photos already on your phone.
                </p>
              </div>

              <div className="hm-phone-col" aria-hidden="true">
                <div className="phone-wrap">
                  <div className="phone" id="phone">
                    <div className="ph-screen">
                      <div className="ph-status">
                        <span>9:41</span>
                        <span>5G</span>
                      </div>
                      <div className="ph-island" />
                      <div className="ph-head">
                        <span className="t">Your jobs</span>
                        <span className="ph-bell">
                          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                          </svg>
                          <span className="bdg">2</span>
                        </span>
                      </div>
                      <div className="ph-card hot">
                        <div className="ph-new">
                          <span className="d" /> New request from your link
                        </div>
                        <div className="ph-r1">
                          <span className="ph-car">2015 Honda Civic</span>
                          <span className="ph-price tnum">$220</span>
                        </div>
                        <div className="ph-jobline">Front brake pads and rotors</div>
                        <div className="ph-meta">
                          <span>
                            <Pin />
                            <span className="tnum">2.1 mi away</span>
                          </span>
                          <span>Just now</span>
                        </div>
                        <span className="ph-act">Send your offer</span>
                      </div>
                      <div className="ph-card">
                        <div className="ph-r1">
                          <span className="ph-car">2012 Jeep Wrangler</span>
                          <span className="ph-price tnum">$45</span>
                        </div>
                        <div className="ph-jobline">Diagnosis: won&apos;t start, clicking sound</div>
                        <div className="ph-meta">
                          <span>
                            <Pin />
                            <span className="tnum">4.8 mi away</span>
                          </span>
                          <span>12 min ago</span>
                        </div>
                        <span className="ph-state sent">
                          <svg viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 2 11 13" />
                            <path d="M22 2 15 22l-4-9-9-4 20-7z" />
                          </svg>
                          Offer sent, awaiting customer
                        </span>
                      </div>
                      <div className="ph-card">
                        <div className="ph-r1">
                          <span className="ph-car">2019 Toyota Camry</span>
                          <span className="ph-price tnum">$85</span>
                        </div>
                        <div className="ph-jobline">Full synthetic oil change, at the driveway</div>
                        <div className="ph-meta">
                          <span>
                            <Pin />
                            <span className="tnum">6.3 mi away</span>
                          </span>
                        </div>
                        <span className="ph-state booked">
                          <svg viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m5 13 4 4L19 7" />
                          </svg>
                          Booked, Tue 2:30 PM
                        </span>
                      </div>
                      <div className="ph-fade" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 01: the problem + the four steps, on paper ---------- */}
        <section className="hm-work">
          <div className="hm-wrap">
            <div className="hm-lede hm-rv">
              <h2>Right now, your reputation lives in DMs and comments.</h2>
              <p>
                Every week you type your services into Facebook groups by hand. The
                customer sees a comment, not a business. <span className="hl">Your years
                of work deserve a page that looks like what you actually are: a
                professional.</span> That page is what Myku gives you, on day one, for
                nothing.
              </p>
            </div>

            <div className="hm-sec-head hm-rv" style={{ marginTop: 'clamp(44px, 7vw, 72px)' }}>
              <span className="hm-sec-num">01 · How it works</span>
              <h2>Four steps to a page worth sharing.</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>
            <p className="hm-trust-note hm-rv" style={{ marginTop: 10 }}>
              Everything on it is yours: your prices, your customers, your reputation.
            </p>

            <div className="hm-steps four">
              <div className="hm-card hm-step">
                <div className="num">01</div>
                <h3>Build your page</h3>
                <p>
                  Add your services and area, then upload photos of work you&apos;ve
                  already done, straight from your phone. About 10 minutes.
                </p>
              </div>
              <div className="hm-card hm-step">
                <div className="num">02</div>
                <h3>Share your link</h3>
                <p>
                  One tap sends trymyku.com/your-name anywhere: Facebook, Messenger,
                  text. It shows your face, your work, and your reviews.
                </p>
              </div>
              <div className="hm-card hm-step">
                <div className="num">03</div>
                <h3>Requests come to you</h3>
                <p>
                  Customers on your page tap one button to request a quote. It lands in
                  your app, with the vehicle and the problem.
                </p>
              </div>
              <div className="hm-card hm-step">
                <div className="num">04</div>
                <h3>Every job builds the page</h3>
                <p>
                  Work done through Myku gets a verified badge: real job, real price,
                  real date. Tied to a real customer, and it compounds.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 02: why Myku, on ink ---------- */}
        <section className="hm-ink hm-bio">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv" style={{ color: '#fff' }}>
              <span className="hm-sec-num">02 · Why Myku</span>
              <h2>Built around your work, not a boss.</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>

            <div className="hm-doors four">
              <div className="hm-door hm-rv">
                <span className="k">A page that sells</span>
                <h3>A page that sells for you.</h3>
                <p>
                  Documented jobs with photos, prices, and dates. It answers the only
                  question customers have: has this person done my repair before.
                </p>
              </div>
              <div className="hm-door hm-rv">
                <span className="k">Independent</span>
                <h3>Your hours. Your prices.</h3>
                <p>
                  Take jobs when you want. Set your own rate. No one tells you what to
                  charge or when to work.
                </p>
              </div>
              <div className="hm-door hm-rv">
                <span className="k">Anywhere</span>
                <h3>Mobile or your own space.</h3>
                <p>
                  Go to the customer or have them come to you. If you have the tools and
                  the space, you have a shop.
                </p>
              </div>
              <div className="hm-door hm-rv">
                <span className="k">Facts on file</span>
                {/* Same vocabulary as the customer page, on purpose: one
                    trust phrase across the whole site. "Verified means
                    verified" was circular and read as Myku's guarantee. */}
                <h3>Verified, not vouched.</h3>
                <p>
                  ID and insurance checks put facts next to your name. We
                  confirm, customers decide. Your reputation does the rest.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 03: FAQ, on paper ---------- */}
        <section className="hm-work">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv">
              <span className="hm-sec-num">03 · Questions</span>
              <h2>Straight answers.</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>

            <div className="hm-faq hm-rv">
              <details>
                <summary>
                  What do I get on day one?
                  <span className="chev">
                    <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="a">
                  A live page at trymyku.com/your-name with your services, your area,
                  and photos of work you&apos;ve already done. It looks like a real
                  business because it is one. You can share the link the same day.
                </div>
              </details>
              <details>
                <summary>
                  How much does it cost?
                  <span className="chev">
                    <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="a">Nothing. The page, the app, and incoming requests are free.</div>
              </details>
              <details>
                <summary>
                  Do you take a cut of my jobs?
                  <span className="chev">
                    <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="a">
                  No. You set your price, the customer pays you directly, and you keep
                  100% of it.
                </div>
              </details>
              <details>
                <summary>
                  Do I need my own shop?
                  <span className="chev">
                    <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="a">
                  No. Work mobile, out of your own shop or home garage, or both. If you
                  have the tools and the space, you have a shop.
                </div>
              </details>
              <details>
                <summary>
                  How do customers reach me?
                  <span className="chev">
                    <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="a">
                  Two ways. People near you post jobs in the app and you respond with
                  your price. And anyone who opens your page can request a quote in one
                  tap, which lands straight in your app.
                </div>
              </details>
              <details>
                <summary>
                  What does &quot;verified job&quot; mean on my page?
                  <span className="chev">
                    <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="a">
                  Jobs completed through Myku are timestamped and tied to a real
                  customer, so they carry a verified badge. Past work you upload
                  yourself shows too, labeled as shared by you. Both make the page
                  stronger; only one can&apos;t be faked.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* ---------- 04: the concierge, closing ink band ---------- */}
        <section className="hm-ink hm-quote hm-final" id="build">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv" style={{ color: '#fff' }}>
              <span className="hm-sec-num">04 · The no-effort option</span>
              <h2>Want us to build it for you?</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>
            <p className="hm-lead hm-rv" style={{ maxWidth: '56ch' }}>
              Leave your name and number. We&apos;ll put your page together from
              what&apos;s already out there and send you the link to look over. You fix
              anything we got wrong, and nothing goes live until you say so.
            </p>
            <div className="hm-formpanel hm-rv">
              <ConciergeForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
