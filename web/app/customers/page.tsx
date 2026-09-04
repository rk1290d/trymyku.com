import type { Metadata } from 'next';
import HmHeader from '@/components/HmHeader';
import Footer from '@/components/Footer';
import AppStoreBadge from '@/components/AppStoreBadge';
import StorefrontFx from '@/components/StorefrontFx';
import '../home.css';

export const metadata: Metadata = {
  title: 'For Car Owners | Your mechanic, without the runaround',
  description:
    'Post the problem, or just describe the symptom. Compare prices from independent mechanics who want the job, and pick who you trust. Free on iOS.',
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
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function CustomersPage() {
  return (
    <div className="hm">
      <HmHeader cta={{ href: '/mechanics', label: "I'm a Mechanic" }} />
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
                    <span>Live on iOS</span>
                  </p>
                  <span className="hm-ln" aria-hidden="true" />
                </div>

                <h1 className="hm-name nm-long">
                  <span>Your mechanic,</span>
                </h1>

                <svg className="hm-underink" viewBox="0 0 560 16" preserveAspectRatio="none" aria-hidden="true">
                  <path pathLength="100" d="M4 11 C 90 4, 168 14, 252 8 S 420 3, 556 9" />
                </svg>

                <p className="hm-pitch">
                  without the <b>runaround.</b>
                </p>

                <p className="hm-lead">
                  Post the problem, or just describe the symptom. Compare prices from
                  mechanics who want the job, and pick who you trust.
                </p>

                <div className="hm-hero-cta">
                  <AppStoreBadge />
                </div>

                <p className="hm-hero-foot">
                  <span className="dot" aria-hidden="true" />
                  See who the mechanic is before you book.
                </p>
              </div>

              <div className="hm-phone-col" aria-hidden="true">
                <div className="qstack">
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
                      <div className="nm">Andre V.</div>
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
          </div>
        </section>

        {/* ---------- 01: the three steps, on paper ---------- */}
        <section className="hm-work">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv">
              <span className="hm-sec-num">01 · How it works</span>
              <h2>Three steps, zero guesswork.</h2>
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
                <p>Know what you need? Post it. Not sure? Describe the symptom and ask for a diagnosis.</p>
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
                <p>Mechanics who want the job reply with a price and availability. See their ratings and reviews.</p>
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
                <p>They come to you, or you drop off at their shop. Your car, your call.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 02: why customers use it, on ink ---------- */}
        <section className="hm-ink hm-bio">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv" style={{ color: '#fff' }}>
              <span className="hm-sec-num">02 · Why customers use it</span>
              <h2>Repair, on your terms.</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>

            <div className="hm-doors four">
              <div className="hm-door hm-rv">
                <span className="k">Upfront</span>
                <h3>See the price upfront.</h3>
                <p>
                  Independent mechanics often charge far less than the dealership, and
                  you see the quote before anyone touches your car.
                </p>
              </div>
              <div className="hm-door hm-rv">
                <span className="k">At your door</span>
                <h3>Mechanics come to you.</h3>
                <p>
                  Mobile mechanics drive to your location. No tow truck, no rental car,
                  no waiting room.
                </p>
              </div>
              <div className="hm-door hm-rv">
                <span className="k">Facts on file</span>
                <h3>Verified, not vouched.</h3>
                {/* Per-mechanic facts, never a blanket guarantee: the product
                    shows exactly which checks each mechanic has cleared, and
                    some pages show none. The copy must not promise more than
                    the storefront can show. */}
                <p>
                  ID checks, insurance on file, badges on jobs done through Myku. What was
                  confirmed sits on each mechanic&rsquo;s page, and the reviews come from real
                  customers, not us.
                </p>
              </div>
              <div className="hm-door hm-rv">
                <span className="k">Your call</span>
                <h3>You stay in control.</h3>
                <p>You choose the mechanic, the price, and the timing. Every time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 03: trust, on paper ---------- */}
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

        {/* ---------- 04: get the app, closing ink band ---------- */}
        <section className="hm-ink hm-quote hm-final">
          <div className="hm-wrap">
            <div className="hm-sec-head hm-rv" style={{ color: '#fff' }}>
              <span className="hm-sec-num">04 · Get the app</span>
              <h2>The next time something rattles, start here.</h2>
              <span className="hm-rule" aria-hidden="true" />
            </div>
            <p className="hm-lead hm-rv">Free on iPhone. Post your first problem in under two minutes.</p>
            <div className="hm-cta-row hm-rv">
              <AppStoreBadge />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
