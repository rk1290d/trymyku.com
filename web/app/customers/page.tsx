import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppStoreBadge from '@/components/AppStoreBadge';

export const metadata: Metadata = {
  title: 'For Car Owners | Your mechanic, without the runaround',
  description:
    'Post the problem, or just describe the symptom. Verified independent mechanics near you respond with a price, and you pick who you trust. Free on iOS.',
  alternates: { canonical: '/customers' },
};

const Vf = () => (
  <div className="vf">
    <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
    Verified
  </div>
);

const Check = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path className="ck" d="M20 6L9 17l-5-5" />
  </svg>
);

export default function CustomersPage() {
  return (
    <>
      <Header cta={{ href: '/mechanics', label: "I'm a Mechanic" }} />
      <main>
        <section className="hero">
          <div className="aurora a1" aria-hidden="true" />
          <div className="aurora a2" aria-hidden="true" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="pill reveal">
                <span className="pulse" /> Live on iOS
              </div>
              <h1 className="h1 reveal d1">
                Your mechanic,
                <br />
                <span className="grad">without the runaround.</span>
              </h1>
              <p className="lead reveal d1">
                Post the problem, or just describe the symptom. Verified mechanics near
                you respond with a price, and you pick who you trust.
              </p>
              <div className="hero-btns reveal d2">
                <AppStoreBadge />
              </div>
              <div className="hero-foot reveal d3">
                <span className="dot" /> Live across Chicago and the suburbs.
              </div>
            </div>

            <div className="hero-visual reveal d2">
              <div className="qstack" aria-hidden="true">
                <div className="qpost">
                  <div className="yt">Your post</div>
                  <div className="car">2016 Jeep Cherokee</div>
                  <div className="issue">
                    Won&apos;t start, clicking sound when I turn the key. Need a diagnosis.
                  </div>
                </div>
                <div className="qlbl">
                  <span className="d" /> Mechanics are responding
                </div>
                <div className="quote q1">
                  <div className="av">M</div>
                  <div className="mid">
                    <div className="nm">Marcus R.</div>
                    <div className="rt">
                      <span className="st">★★★★★</span> <span className="tnum">4.9 · 2.3 mi</span>
                    </div>
                    <Vf />
                  </div>
                  <div className="pr">
                    <div className="amt tnum">$45</div>
                    <div className="when">Today, 4 PM</div>
                  </div>
                </div>
                <div className="quote q2">
                  <div className="av">D</div>
                  <div className="mid">
                    <div className="nm">Dave T.</div>
                    <div className="rt">
                      <span className="st">★★★★★</span> <span className="tnum">4.8 · 5.1 mi</span>
                    </div>
                    <Vf />
                  </div>
                  <div className="pr">
                    <div className="amt tnum">$40</div>
                    <div className="when">Tomorrow, 9 AM</div>
                  </div>
                </div>
                <div className="quote q3">
                  <div className="av">A</div>
                  <div className="mid">
                    <div className="nm">Alex L.</div>
                    <div className="rt">
                      <span className="st">★★★★★</span> <span className="tnum">5.0 · 3.7 mi</span>
                    </div>
                    <Vf />
                  </div>
                  <span className="pick">Choose</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec">
          <div className="container center">
            <span className="tag reveal">How it works</span>
            <h2 className="title reveal">Three steps, zero guesswork.</h2>
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
                <p>Know what you need? Post it. Not sure? Describe the symptom and ask for a diagnosis.</p>
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
                <p>Mechanics near you reply with a price and availability. See their ratings and reviews.</p>
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
                <p>They come to you, or you drop off at their shop. Your car, your call.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec tone">
          <div className="container center">
            <span className="tag reveal">Why customers use it</span>
            <h2 className="title reveal">Repair, on your terms.</h2>
            <div className="feats">
              <div className="feat spot reveal">
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 1v22" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <h3>See the price upfront.</h3>
                <p>
                  Independent mechanics often charge far less than the dealership, and
                  you see the quote before anyone touches your car.
                </p>
              </div>
              <div className="feat spot reveal d1">
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h3>Mechanics come to you.</h3>
                <p>
                  Mobile mechanics drive to your location. No tow truck, no rental car,
                  no waiting room.
                </p>
              </div>
              <div className="feat spot reveal d2">
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2 4 5v6c0 5 3.4 8.4 8 11 4.6-2.6 8-6 8-11V5l-8-3z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3>Verified, not vouched.</h3>
                <p>
                  Every mechanic is ID-verified, with license and insurance on file. The
                  reviews come from real customers, not us.
                </p>
              </div>
              <div className="feat spot reveal d3">
                <div className="ic">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3>You stay in control.</h3>
                <p>You choose the mechanic, the price, and the timing. Every time.</p>
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

        <section className="sec tone formsec">
          <div className="container center">
            <span className="tag reveal">Get the app</span>
            <h2 className="title reveal">The next time something rattles, start here.</h2>
            <p className="sub reveal d1">
              Free on iPhone. Post your first problem in under two minutes.
            </p>
            <div className="cta-btns reveal d1" style={{ marginTop: 26 }}>
              <AppStoreBadge />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
