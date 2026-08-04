import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppStoreBadge from '@/components/AppStoreBadge';
import ConciergeForm from '@/components/ConciergeForm';

export const metadata: Metadata = {
  title: 'For Mechanics | A professional page for your business, free',
  description:
    'Get a professional page with your real jobs, real prices, and real reviews at trymyku.com/your-name. Share it anywhere in one tap. Your prices, your customers, your reputation.',
  alternates: { canonical: '/mechanics' },
};

const Pin = () => (
  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function MechanicsPage() {
  return (
    <>
      <Header cta={{ href: '/customers', label: 'I Need a Mechanic' }} />
      <main>
        <section className="hero" id="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="pill reveal">
                <span className="pulse" /> Now onboarding across Chicago and the suburbs
              </div>
              <h1 className="h1 reveal d1">
                Your work is good.
                <br />
                <span className="grad">Your page should prove it.</span>
              </h1>
              <p className="lead reveal d1">
                Myku gives you a professional page at trymyku.com/your-name, with your
                real jobs, real prices, and real reviews. One tap to share it anywhere
                you already talk to customers.
              </p>
              <div className="hero-btns reveal d2">
                <AppStoreBadge />
                <a href="#build" className="btn btn-ghost" data-scroll>
                  Or let us build it for you
                </a>
              </div>
              <div className="hero-foot reveal d3">
                <span className="dot" /> Set up in about 10 minutes with photos already on your phone.
              </div>
            </div>

            <div className="hero-visual reveal d2">
              <div className="phone-wrap">
                <div className="phone-glow" aria-hidden="true" />
                <div className="phone" id="phone" aria-hidden="true">
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
        </section>

        <section className="sec tone">
          <div className="container">
            <div className="lede">
              <div className="rule reveal" />
              <h2 className="reveal">Right now, your reputation lives in DMs and comments.</h2>
              <p className="reveal d1">
                Every week you type your services into Facebook groups by hand. The
                customer sees a comment, not a business. <span className="hl">Your years of
                work deserve a page that looks like what you actually are: a
                professional.</span> That page is what Myku gives you, on day one, for
                nothing.
              </p>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="container center">
            <span className="tag reveal">How it works</span>
            <h2 className="title reveal">Four steps to a page worth sharing.</h2>
            <p className="sub reveal d1">
              Everything on it is yours: your prices, your customers, your reputation.
            </p>
            <div className="pgrid">
              <div className="pcard spot reveal">
                <div className="pn">1</div>
                <h3>Build your page</h3>
                <p>
                  Add your services and area, then upload photos of work you&apos;ve
                  already done, straight from your phone. About 10 minutes.
                </p>
              </div>
              <div className="pcard spot reveal d1">
                <div className="pn">2</div>
                <h3>Share your link</h3>
                <p>
                  One tap sends trymyku.com/your-name anywhere: Facebook, Messenger,
                  text. It shows your face, your work, and your reviews.
                </p>
              </div>
              <div className="pcard spot reveal d2">
                <div className="pn">3</div>
                <h3>Requests come to you</h3>
                <p>
                  Customers on your page tap one button to request a quote. It lands in
                  your app, with the vehicle and the problem.
                </p>
              </div>
              <div className="pcard spot reveal d3">
                <div className="pn">4</div>
                <h3>Every job builds the page</h3>
                <p>
                  Work done through Myku gets a verified badge: real job, real price,
                  real date. Nobody can fake that, and it compounds.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec tone">
          <div className="container center">
            <span className="tag reveal">Why Myku</span>
            <h2 className="title reveal">Built around your work, not a boss.</h2>
            <div className="feats">
              <div className="feat spot reveal">
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <path d="M3 9h18M8 14h5" />
                  </svg>
                </div>
                <h3>A page that sells for you.</h3>
                <p>
                  Documented jobs with photos, prices, and dates. It answers the only
                  question customers have: has this person done my repair before.
                </p>
              </div>
              <div className="feat spot reveal d1">
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>
                <h3>Your hours. Your prices.</h3>
                <p>
                  Take jobs when you want. Set your own rate. No one tells you what to
                  charge or when to work.
                </p>
              </div>
              <div className="feat spot reveal d2">
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 17h2l1.5-4.5A2 2 0 0 1 8.4 11h7.2a2 2 0 0 1 1.9 1.5L19 17h2" />
                    <path d="M5 17v2M19 17v2" />
                    <circle cx="7.5" cy="17.5" r="1.5" />
                    <circle cx="16.5" cy="17.5" r="1.5" />
                  </svg>
                </div>
                <h3>Mobile or your own space.</h3>
                <p>
                  Go to the customer or have them come to you. If you have the tools and
                  the space, you have a shop.
                </p>
              </div>
              <div className="feat spot reveal d3">
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2 4 5v6c0 5 3.4 8.4 8 11 4.6-2.6 8-6 8-11V5l-8-3z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3>Verified means verified.</h3>
                <p>
                  ID, license, and insurance checks put facts next to your name. We
                  confirm, customers decide. Your reputation does the rest.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="container center">
            <span className="tag reveal">Questions</span>
            <h2 className="title reveal">Straight answers.</h2>
            <div className="faq-list reveal d1">
              <details className="faq">
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
              <details className="faq">
                <summary>
                  How much does it cost?
                  <span className="chev">
                    <svg viewBox="0 0 24 24" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>
                <div className="a">
                  Nothing. The page, the app, and incoming requests are free.
                </div>
              </details>
              <details className="faq">
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
              <details className="faq">
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
              <details className="faq">
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
              <details className="faq">
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

        <section className="sec tone formsec" id="build">
          <div className="container center">
            <span className="tag reveal">The no-effort option</span>
            <h2 className="title reveal">Want us to build it for you?</h2>
            <p className="sub reveal d1">
              Leave your name and number. We&apos;ll put your page together from
              what&apos;s already out there and send you the link to look over. You fix
              anything we got wrong, and nothing goes live until you say so.
            </p>
            <div className="form-card reveal d1">
              <ConciergeForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
