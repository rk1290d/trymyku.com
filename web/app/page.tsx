import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppStoreBadge from '@/components/AppStoreBadge';

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Pin = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path className="ck" d="M20 6L9 17l-5-5" />
  </svg>
);

export default function Home() {
  return (
    <>
      <Header cta={{ href: '/mechanics', label: "I'm a Mechanic" }} />
      <main>
        <section className="hero" id="hero">
          <div className="aurora a1" aria-hidden="true" />
          <div className="aurora a2" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="pill reveal">
                <span className="pulse" /> Live across Chicago and the suburbs
              </div>
              <h1 className="h1 reveal d1">
                Something wrong with your car?
                <br />
                <span className="grad">Open Myku.</span>
              </h1>
              <p className="lead reveal d1">
                Post the problem, or just describe the symptom. Independent, verified
                mechanics near you send back a real price, and you choose.
              </p>
              <div className="hero-btns reveal d2">
                <AppStoreBadge />
                <Link href="/mechanics" className="btn btn-ghost">
                  I&apos;m a Mechanic
                  <Arrow />
                </Link>
              </div>
              <div className="hero-foot reveal d3">
                <span className="dot" /> Free to download. Mechanics quote, you pick.
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
                          <div className="pq-name">Marcus R.</div>
                          <div className="pq-stars">
                            <b>4.9</b> ★★★★★ · 41 jobs
                          </div>
                        </div>
                        <span className="pq-price tnum">$210</span>
                      </div>
                      <div className="pq-r2">
                        <span className="pq-meta">
                          <Pin />
                          <span className="tnum">2.1 mi · Naperville · Today</span>
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
        </section>

        <div className="marquee" aria-hidden="true">
          <div className="mq-track">
            {[0, 1].map((i) => (
              <span key={i} style={{ display: 'contents' }}>
                <span>Brakes</span><span>Diagnostics</span><span>Oil changes</span><span>Suspension</span><span>Electrical</span><span>Engine</span><span>A/C and heating</span><span>Batteries</span><span>Tires</span><span>Transmission</span><span className="soon">and more, over time</span>
              </span>
            ))}
          </div>
        </div>

        <section className="sec">
          <div className="container center">
            <span className="tag reveal">How it works</span>
            <h2 className="title reveal">Start here.</h2>
            <p className="sub reveal">You do not need to know what is wrong. Just where to start.</p>
            <div className="steps" id="steps">
              <div className="step reveal d1">
                <div className="s-node">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M8.5 9h7M8.5 12.5h4" />
                  </svg>
                </div>
                <div className="s-num">01</div>
                <h3>Post the problem</h3>
                <p>Describe what is wrong, or just the symptom.</p>
              </div>
              <div className="step reveal d2">
                <div className="s-node">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h9M4 12h16M4 17h6" />
                    <circle cx="17" cy="7" r="2.1" />
                    <circle cx="14" cy="17" r="2.1" />
                  </svg>
                </div>
                <div className="s-num">02</div>
                <h3>Compare quotes</h3>
                <p>Mechanics near you reply with a price and availability.</p>
              </div>
              <div className="step reveal d3">
                <div className="s-node">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="s-num">03</div>
                <h3>Pick who you trust</h3>
                <p>Check the facts and reviews, then choose.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec tone">
          <div className="container center">
            <span className="tag reveal">Two sides, one platform</span>
            <h2 className="title reveal">Which one are you?</h2>
            <div className="cards">
              <div className="card card-mech spot reveal d1">
                <div className="k">
                  <svg className="ki" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                  </svg>
                  For mechanics
                </div>
                <h2>Your business deserves more than a Facebook comment.</h2>
                <p>
                  Get a professional page with your real work, real reviews, and a link
                  you can share anywhere. Your prices, your customers, your reputation.
                  It is yours from day one.
                </p>
                <Link href="/mechanics" className="btn">
                  See your page
                  <Arrow />
                </Link>
              </div>
              <div className="card card-cust spot reveal d2">
                <div className="k">
                  <svg className="ki" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 11l1.5-4.2A2 2 0 0 1 8.4 5.5h7.2a2 2 0 0 1 1.9 1.3L19 11M5 11h14v5H5zM7.5 16v1.5M16.5 16v1.5" />
                    <circle cx="8" cy="13.5" r="0.4" />
                    <circle cx="16" cy="13.5" r="0.4" />
                  </svg>
                  For car owners
                </div>
                <h2>Describe the problem. Let mechanics come to you.</h2>
                <p>
                  Post a job, or just say what is wrong. Mechanics near you reply with a
                  price, so you can compare and choose the one you trust.
                </p>
                <Link href="/customers" className="btn btn-ghost">
                  See how it works
                  <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="container">
            <div className="trust-panel reveal">
              <div className="trust-tag">How trust works here</div>
              <div className="trust-chips">
                <span className="tchip"><Check /> License confirmed</span>
                <span className="tchip"><Check /> Insurance on file</span>
                <span className="tchip"><Check /> ID verified</span>
              </div>
              <div className="trust-line">
                We confirm facts. We do not endorse. <span className="a">You decide.</span>
              </div>
              <p className="trust-note">
                Verification means we checked the paperwork, not that we vouch for the
                work. You see the facts and the reviews, then decide for yourself.
              </p>
            </div>
          </div>
        </section>

        <section className="sec tone">
          <div className="container">
            <div className="lede">
              <div className="rule reveal" />
              <p className="reveal" style={{ fontSize: 'clamp(18px, 2.5vw, 23px)', fontWeight: 500, letterSpacing: '-0.015em', lineHeight: 1.5, color: 'var(--text-2)', marginBottom: 26 }}>
                Finding a mechanic used to mean knowing someone, or gambling on a shop
                and hoping. <span className="hl">The problem was never a shortage of mechanics. It was that finding the right one was left to chance.</span>
              </p>
              <p className="reveal" style={{ fontSize: 'clamp(18px, 2.5vw, 23px)', fontWeight: 500, letterSpacing: '-0.015em', lineHeight: 1.5, color: 'var(--text-2)', marginBottom: 0 }}>
                Myku is a marketplace, not a repair shop. We connect you with independent
                mechanics, keep the facts transparent, and let you choose. We do not
                employ them, set their prices, or do the work. It starts with mechanics
                in Chicago, and grows from there.
              </p>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="container">
            <div className="cta-panel reveal">
              <h2>Be the first name in your area.</h2>
              <p className="sub">
                Mechanics: get a page that makes your work impossible to ignore. Car
                owners: the next time something rattles, you know where to start.
              </p>
              <div className="cta-btns">
                <Link href="/mechanics" className="btn btn-primary">
                  Get Your Page
                  <Arrow />
                </Link>
                <AppStoreBadge />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
