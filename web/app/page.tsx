import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import HmHeader from '@/components/HmHeader';
import AppStoreBadge from '@/components/AppStoreBadge';
import StorefrontFx from '@/components/StorefrontFx';
import './home.css';

// Title and description come from the root layout. The canonical is the one
// thing the layout cannot give this page: www and the apex both serve it, and
// without this the two count as separate pages.
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// The front page, in the storefront's own language. The mechanic pages set
// the visual bar for the whole ecosystem; the page that introduces Myku
// speaks exactly the same ink-and-ember system: same tokens, same motion
// discipline, same zero-JS guarantees, the REAL logo. Copy is unchanged
// from the approved version; only the presentation moved.

const Arrow = () => (
  <span className="hm-arrow" aria-hidden="true">
    &#8594;
  </span>
);

const Wrench = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const Car = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 11l1.5-4.2A2 2 0 0 1 8.4 5.5h7.2a2 2 0 0 1 1.9 1.3L19 11M5 11h14v5H5zM7.5 16v1.5M16.5 16v1.5" />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const Pin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const SERVICES = [
  'Brakes', 'Diagnostics', 'Oil changes', 'Suspension', 'Electrical',
  'Engine', 'A/C and heating', 'Batteries', 'Tires', 'Transmission',
];

export default function Home() {
  return (
    <div className="hm">
      <HmHeader cta={{ href: '/mechanics', label: "I'm a Mechanic" }} />

      <main>
        {/* ---------- HERO: the ink band, alive ---------- */}
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
              <g strokeWidth="1.4" opacity=".85">
                <path d="M200 38v16M200 346v16M38 200h16M346 200h16M92 92l12 12M296 296l-12-12M92 308l12-12M296 104l-12 12" />
              </g>
            </g>
          </svg>

          <div className="hm-wrap hm-hero-in">
            <div className="hm-hero-grid">
              <div>
                <div className="hm-hero-eyebrow">
                  <p className="hm-eyebrow">
                    <span>A marketplace for car repair</span>
                  </p>
                  <span className="hm-ln" aria-hidden="true" />
                </div>

                <h1 className="hm-name nm-long">
                  <span>Something wrong{" "}</span>
                  <span className="r2">with your car?</span>
                </h1>

                <svg className="hm-underink" viewBox="0 0 560 16" preserveAspectRatio="none" aria-hidden="true">
                  <path pathLength="100" d="M4 11 C 90 4, 168 14, 252 8 S 420 3, 556 9" />
                </svg>

                <p className="hm-pitch">
                  Open <b>Myku.</b>
                </p>

                <p className="hm-lead">
                  Post the problem, or just describe the symptom. Compare real prices from
                  independent mechanics who want the job, and you choose.
                </p>

                <div className="hm-hero-cta">
                  <AppStoreBadge />
                  <Link className="hm-btn hm-btn-ghost hm-mag" href="/mechanics">
                    <span className="lbl">
                      I&apos;m a Mechanic
                      <Arrow />
                    </span>
                  </Link>
                </div>

                <p className="hm-hero-foot">
                  <span className="dot" aria-hidden="true" />
                  Free to download. Mechanics quote, you pick.
                </p>
              </div>

              {/* The product itself, standing in the mesh. Hidden on phones:
                  the person holding a phone does not need a picture of one. */}
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
                        <div>
                          <div className="t">Your quotes</div>
                          <div className="sub">3 mechanics responded</div>
                        </div>
                        <span className="ph-choose">You choose</span>
                      </div>
                      <div className="ph-job-strip">
                        <span className="ic">
                          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                          </svg>
                        </span>
                        <div>
                          <div className="jt">2015 Honda Civic</div>
                          <div className="js">Front brake pads and rotors</div>
                        </div>
                      </div>

                      <div className="ph-quote fresh">
                        <span className="pq-new">
                          <span /> New
                        </span>
                        <div className="pq-r1">
                          <span className="pq-av" style={{ background: 'linear-gradient(150deg,#ffb877,#f97316)' }}>M</span>
                          <div>
                            <div className="pq-name">Andre V.</div>
                            <div className="pq-stars">
                              <b>4.9</b> ★★★★★ · 41 jobs
                            </div>
                          </div>
                          <span className="pq-price tnum">$210</span>
                        </div>
                        <div className="pq-r2">
                          <span className="pq-meta">
                            <Pin />
                            <span className="tnum">2.1 mi · Today</span>
                          </span>
                          <span className="pq-verified">
                            <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                            Verified
                          </span>
                        </div>
                      </div>

                      <div className="ph-quote">
                        <div className="pq-r1">
                          <span className="pq-av" style={{ background: 'linear-gradient(150deg,#7af0e0,#2dd4bf)' }}>D</span>
                          <div>
                            <div className="pq-name">Devin K.</div>
                            <div className="pq-stars">
                              <b>4.8</b> ★★★★★ · 63 jobs
                            </div>
                          </div>
                          <span className="pq-price tnum">$240</span>
                        </div>
                        <div className="pq-r2">
                          <span className="pq-meta">
                            <Pin />
                            <span className="tnum">3.4 mi · Aurora · Tomorrow</span>
                          </span>
                          <span className="pq-verified">
                            <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                            Verified
                          </span>
                        </div>
                      </div>

                      <div className="ph-quote">
                        <div className="pq-r1">
                          <span className="pq-av" style={{ background: 'linear-gradient(150deg,#c9c4bd,#8a857e)' }}>S</span>
                          <div>
                            <div className="pq-name">Sandra P.</div>
                            <div className="pq-stars">
                              <b>5.0</b> ★★★★★ · 28 jobs
                            </div>
                          </div>
                          <span className="pq-price teal tnum">Diagnosis</span>
                        </div>
                        <div className="pq-r2">
                          <span className="pq-meta">
                            <Pin />
                            <span className="tnum">5.0 mi · Wheaton · Today</span>
                          </span>
                          <span className="pq-verified">
                            <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                            Verified
                          </span>
                        </div>
                      </div>
                      <div className="ph-fade" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service tape rides the bottom edge of the band. */}
          <div className="hm-mq" aria-hidden="true">
            <div className="hm-mq-track">
              {[0, 1].map((i) => (
                <span key={i} style={{ display: 'contents' }}>
                  {SERVICES.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                  <span className="soon">and more, over time</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 01 HOW IT WORKS: drafting paper ---------- */}
        <section className="hm-work">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv">
              <span className="hm-sec-num">01 · How it works</span>
              <h2>Start here.</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>
            <p className="hm-trust-note hm-rv" style={{ marginTop: 10 }}>
              You do not need to know what is wrong. Just where to start.
            </p>

            <div className="hm-steps">
              <div className="hm-card hm-step">
                <svg className="hm-step-plate" viewBox="0 0 200 130" aria-hidden="true">
                  <g className="ln">
                    <path d="M40 30h96a12 12 0 0 1 12 12v34a12 12 0 0 1-12 12H74l-22 18v-18h-12a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12z" />
                    <path d="M52 50h72M52 64h44" />
                  </g>
                  <g className="acc">
                    <path d="M158 76c10 2 18 8 22 16" />
                    <circle cx="184" cy="98" r="3.4" />
                  </g>
                </svg>
                <div className="num">01</div>
                <h3>Post the problem</h3>
                <p>Describe what is wrong, or just the symptom.</p>
              </div>

              <div className="hm-card hm-step">
                <svg className="hm-step-plate" viewBox="0 0 200 130" aria-hidden="true">
                  <g className="ln">
                    <path d="M36 36h84M36 65h128M36 94h64" />
                    <circle cx="150" cy="36" r="9" />
                    <circle cx="124" cy="94" r="9" />
                  </g>
                  <g className="acc">
                    <circle cx="176" cy="65" r="9" />
                    <path d="M172.5 65l2.6 2.6 4.4-4.8" />
                  </g>
                </svg>
                <div className="num">02</div>
                <h3>Compare quotes</h3>
                <p>Mechanics who want the job reply with a price and availability.</p>
              </div>

              <div className="hm-card hm-step">
                <svg className="hm-step-plate" viewBox="0 0 200 130" aria-hidden="true">
                  <g className="ln">
                    <path d="M100 18l44 18v26c0 28-19 47-44 56-25-9-44-28-44-56V36z" />
                  </g>
                  <g className="acc">
                    <path d="M84 64l12 12 22-24" />
                  </g>
                </svg>
                <div className="num">03</div>
                <h3>Pick who you trust</h3>
                <p>Check the facts and reviews, then choose.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 02 TWO SIDES: ink ---------- */}
        <section className="hm-ink hm-bio">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv" style={{ color: '#fff' }}>
              <span className="hm-sec-num">02 · Two sides, one platform</span>
              <h2>Which one are you?</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>

            <div className="hm-doors">
              <div className="hm-door mech hm-rv">
                <span className="k">
                  <Wrench />
                  For mechanics
                </span>
                <h3>Your business deserves more than a Facebook comment.</h3>
                <p>
                  Get a professional page with your real work, real reviews, and a link
                  you can share anywhere. Your prices, your customers, your reputation.
                  It is yours from day one.
                </p>
                <Link className="hm-btn hm-btn-o hm-mag" href="/mechanics">
                  <span className="lbl">
                    See your page
                    <Arrow />
                  </span>
                </Link>
              </div>

              <div className="hm-door hm-rv">
                <span className="k">
                  <Car />
                  For car owners
                </span>
                <h3>Describe the problem. Let mechanics come to you.</h3>
                <p>
                  Post a job, or just say what is wrong. Mechanics near you reply with a
                  price, so you can compare and choose the one you trust.
                </p>
                <Link className="hm-btn hm-btn-ghost hm-mag" href="/customers">
                  <span className="lbl">
                    See how it works
                    <Arrow />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 03 TRUST: paper ---------- */}
        <section className="hm-work">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv">
              <span className="hm-sec-num">03 · How trust works here</span>
              <h2>The paperwork, checked.</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>

            <div className="hm-trust-chips hm-rv">
              <span className="hm-tchip">
                <Check /> ID verified
              </span>
              <span className="hm-tchip">
                <Check /> Insurance on file
              </span>
              <span className="hm-tchip">
                <Check /> Certifications on file
              </span>
            </div>

            <p className="hm-trust-line hm-rv">
              We confirm facts. We do not endorse. <b>You decide.</b>
            </p>
            <p className="hm-trust-note hm-rv">
              Verification means we checked the paperwork, not that we vouch for the
              work. You see the facts and the reviews, then decide for yourself.
            </p>
          </div>
        </section>

        {/* ---------- 04 MISSION + CTA: the closing ink band ---------- */}
        <section className="hm-ink hm-quote hm-final">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv" style={{ color: '#fff' }}>
              <span className="hm-sec-num">04 · Why this exists</span>
              <h2>Be the first name in your area.</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>

            <div className="hm-mission" style={{ marginTop: 'clamp(22px, 3.4vw, 34px)' }}>
              <p className="hm-rv">
                Finding a mechanic used to mean knowing someone, or gambling on a shop
                and hoping. <span className="hl">The problem was never a shortage of
                mechanics. It was that finding the right one was left to chance.</span>
              </p>
              <p className="hm-rv">
                <b>Myku is a marketplace, not a repair shop.</b> We connect you with
                independent mechanics, keep the facts transparent, and let you choose.
                We do not employ them, set their prices, or do the work.
              </p>
            </div>

            <div className="hm-cta-row hm-rv">
              <Link className="hm-btn hm-btn-o hm-mag" href="/mechanics">
                <span className="lbl">
                  Get Your Page
                  <Arrow />
                </span>
              </Link>
              <AppStoreBadge />
            </div>
            <p className="hm-cta-note hm-rv">
              Mechanics: your work, impossible to ignore. Car owners: the next time
              something rattles, you know where to start.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
