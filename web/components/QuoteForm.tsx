'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// The quote composer on every published profile page. It is the only
// conversion event on that page. The ask is "get a price", never "book":
// nothing here may promise the mechanic will reply, confirm or accept, so
// every sentence states either something MYKU does or a fact about where the
// request now sits. Myku cannot compel an independent business to answer.

// The one chip that is always present. It carries the "I don't know what is
// wrong" customer, the persona the whole product exists for, so it can never
// be dropped no matter what the mechanic's service list looks like.
const NOT_SURE = 'Not sure / something else';

// Hardcoded fallbacks for a page whose mechanic listed NOTHING. These are why
// a seeded page converts with zero mechanic data, and that is the only job
// they have. They used to stand in whenever he had fewer than three services,
// which meant the specialist who deliberately lists two things got a form
// asking for oil changes and AC work he does not do, one screen under a
// section headed "What he does" that listed his actual two. The page must
// never offer a service on his behalf that he did not choose.
//
// They ARE still shown when he named nothing at all, because a page that
// converts on zero mechanic data is the entire reason a seeded page exists.
// What stops that from being an assertion on his behalf is the caption that
// renders with them: see the note under the chip row. Do not drop the chips,
// and do not drop the caption either. A published mechanic can reach this
// state too, not only a seeded page - nothing gates publish on having named
// a single service - and he has no way of knowing his page is doing it.
const FALLBACK_SERVICES = [
  "Won't start",
  'Brakes',
  'Check engine light',
  'Oil change',
  'AC or heat',
];

// Service names are free text. Chips WRAP to a second line rather than being
// dropped: the labels that used to exceed the old one-line budget were
// exactly the specialties a mechanic's bio leads with ("Suspension and
// steering", "Batteries and electrical"), so silently removing them from the
// ask cost him the lead or dumped it into "Not sure" one screen below a list
// that advertised them. The cap now only guards against a paragraph pasted
// into a service field.
const MAX_CHIP_CHARS = 34;

export interface ServiceOffer {
  name: string;
  priceFrom: number | null;
}

const GENERIC_ERROR =
  'Something went wrong. Please try again, or email support@trymyku.com.';

// THREE DIFFERENT REFUSALS WORE ONE SENTENCE, AND TWO OF THEM WERE LIES.
// /api/lead returns 429 for three unrelated reasons and tags each one with a
// `scope` and a real `retry_after` (see the header of app/api/lead/route.ts).
// This form used to discard the body and tell everybody "wait a minute",
// which is true for exactly one of the three. A customer stopped by the
// per-sender cap was told to wait a minute and then refused again for the
// next hour, with nothing on screen explaining why, at the only conversion
// point the business has.
//
// Nothing below promises the mechanic will reply. 'mechanic' deliberately
// does not claim the request was kept either: the route records it on a best
// effort basis after the response is already sent, so it may not have been.
//
// AND IT TAKES `unclaimed`, which it did not at first, because the sender
// branch is the one place this component makes a claim about the MECHANIC. On
// an unclaimed page there is no mechanic account and no Myku inbox for him to
// have anything in: the success line one screen earlier says "Myku will pass
// this to <First>", and telling the same person a submission later that he
// "already has your last few requests" contradicts it at the conversion moment.
// The 'mechanic' and 'ip' branches say nothing about him and need no split.
async function refusalMessage(
  res: Response,
  first: string,
  unclaimed: boolean,
): Promise<string> {
  let scope = '';
  let retryAfter = 0;
  try {
    const body = (await res.json()) as { scope?: string; retry_after?: number };
    scope = typeof body.scope === 'string' ? body.scope : '';
    retryAfter = Number(body.retry_after) || 0;
  } catch {
    // An unreadable body is not worth failing over; fall through to the
    // wording that was here before, which is the safest of the three.
  }
  if (scope === 'sender') {
    if (unclaimed) {
      return retryAfter > 3600
        ? `Myku already has your requests from today for ${first}. Please try again tomorrow.`
        : `Myku already has your last few requests for ${first}. Please give it an hour before sending another.`;
    }
    return retryAfter > 3600
      ? `${first} already has your requests from today. Please try again tomorrow.`
      : `${first} already has your last few requests. Please give it an hour before sending another.`;
  }
  if (scope === 'mechanic') {
    return 'This page is taking a lot of requests right now. Please try again later, or email support@trymyku.com.';
  }
  // 'ip', and anything unrecognised: the per-IP burst bucket is a double tap
  // on submit, and a minute is literally its window.
  return 'This page is busy right now. Please wait a minute and try again.';
}

const TIMING_OPTIONS: { value: string; label: string }[] = [
  { value: 'asap', label: 'As soon as possible' },
  { value: 'this_week', label: 'This week' },
  { value: 'flexible', label: 'Flexible' },
];

export default function QuoteForm({
  mechanicId,
  slug,
  mechanicFirstName,
  unclaimed = false,
  services = [],
  sectionNum,
}: {
  mechanicId: string;
  slug: string;
  mechanicFirstName: string;
  unclaimed?: boolean;
  services?: ServiceOffer[];
  sectionNum?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [timing, setTiming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [desc, setDesc] = useState('');
  const [hp, setHp] = useState('');
  const [err, setErr] = useState('');
  const [bad, setBad] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [showOpt, setShowOpt] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const sentRef = useRef<HTMLHeadingElement | null>(null);

  const focusTextarea = useCallback((ensureVisible = false) => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    const end = ta.value.length;
    try {
      ta.setSelectionRange(end, end);
    } catch {
      /* some browsers refuse setSelectionRange on an unfocused control */
    }
    if (ensureVisible) {
      ta.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, []);

  // The in-page asks land as a keyboard, not a shrug. Deliberately NOT run on
  // mount: a cold load of /slug#quote must not open the keyboard before the
  // visitor has read the mechanic's name (WCAG 3.2.1). The delegated click
  // covers a repeat tap, where the hash is already set and no hashchange
  // fires.
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#ask' || h === '#quote') focusTextarea();
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('a[href="#ask"], a[href="#quote"]')) {
        requestAnimationFrame(() => focusTextarea());
      }
    };
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick);
    };
  }, [focusTextarea]);

  // Two separate questions, and conflating them is what put words in his
  // mouth. `named` asks whether he listed anything at all: that is the ONLY
  // thing the generic fallback may answer. `offered` then drops anything too
  // long to sit on a chip, which is a paste guard, not a reason to start
  // advertising services he never chose.
  const named = services.filter((s) => s.name.trim().length > 0);
  const offered = named.filter((s) => s.name.trim().length <= MAX_CHIP_CHARS);
  const usingFallback = named.length === 0;
  // One service or two: he gets his own chips plus the always-appended
  // "Not sure / something else" below, which is a coherent ask on its own.
  // Nothing here can ever produce an empty group: NOT_SURE is appended
  // unconditionally where the chips are rendered.
  const chipServices: ServiceOffer[] = usingFallback
    ? FALLBACK_SERVICES.map((n) => ({ name: n, priceFrom: null }))
    : offered.slice(0, 5);

  // Deep link: /slug?service=brakes-and-rotors preselects the matching chip
  // so the mechanic can answer a "how much for brakes?" comment with a link
  // that opens already set to brakes. Selection only: no focus, no keyboard,
  // no scroll on a cold load. Runs once; read from window so the page stays
  // fully static/ISR (no useSearchParams bailout).
  useEffect(() => {
    let want = '';
    try {
      want = new URLSearchParams(window.location.search).get('service') ?? '';
    } catch {
      return;
    }
    if (!want) return;
    const norm = (v: string) =>
      v
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const target = norm(want);
    if (!target) return;
    // Match against EVERY service he offers, not just the five that became
    // chips. The mechanic builds these links from his own service list, so a
    // link to a real service must never land on a page with nothing selected.
    // A service outside the chip row still preselects and still shows its
    // price hint; it simply has no chip to light up.
    const hit =
      chipServices.find((s) => norm(s.name) === target) ??
      services.find((s) => norm(s.name) === target);
    if (hit) setSelected(hit.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // Also looks beyond the chip row: a deep link can select a service that has
  // no chip, and it must still carry its price hint and its exact name into
  // the payload.
  const selectedOffer =
    selected && selected !== NOT_SURE
      ? chipServices.find((s) => s.name === selected) ??
        services.find((s) => s.name === selected) ??
        null
      : null;

  const taPlaceholder =
    selected === null
      ? 'Grinding noise when I brake, started last week.'
      : selected === NOT_SURE
        ? 'What is the car doing? Even one sentence helps.'
        : `Anything ${mechanicFirstName} should know? Optional.`;

  function toggleService(nameToSet: string) {
    setSelected((cur) => (cur === nameToSet ? null : nameToSet));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    setErr('');
    setBad(null);
    // Validate in DOM order: the job first, then phone, so a visitor fixing
    // an empty form walks top to bottom instead of bouncing.
    const described = desc.trim().length >= 5;
    if (!selected && !described) {
      setBad('desc');
      setErr('Pick a service above, or describe what you need.');
      taRef.current?.focus();
      return;
    }
    if (selected === NOT_SURE && !described) {
      setBad('desc');
      setErr(
        `Tell ${mechanicFirstName} what the car is doing. Even one sentence helps.`
      );
      taRef.current?.focus();
      return;
    }
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setBad('phone');
      // Describes only what MYKU does with the number. It must never promise
      // that the mechanic will send back a price, least of all in the one
      // message a visitor is guaranteed to read.
      setErr('Please enter a valid phone number.');
      phoneRef.current?.focus();
      return;
    }
    if (name.trim().length < 2) {
      setBad('name');
      setErr(`Add your name so ${mechanicFirstName} knows who is calling.`);
      nameRef.current?.focus();
      return;
    }
    // Optional, so an empty box passes. Only a filled one has to look like an
    // address, and the check stays deliberately loose: the point is to catch a
    // typo, not to adjudicate what a valid address is.
    const emailTrimmed = email.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setBad('email');
      setErr('That email does not look right. Leave it blank if you prefer.');
      setShowOpt(true);
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    // AbortController, NOT AbortSignal.timeout. That helper does not exist on
    // Safari before 16 or Chrome before 103, Next does not polyfill it, and
    // building these options threw a TypeError before the request was ever
    // made - so on an older phone every submit landed in the catch below as
    // "something went wrong", forever, no matter what was typed, and no lead
    // row and no log line existed to say the customer had tried. The one
    // conversion event on the mechanic's page is not gated on a 2022 API.
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          mechanic_id: mechanicId,
          slug,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: emailTrimmed || null,
          vehicle: vehicle.trim() || null,
          description: desc.trim(),
          // Structured fields. NOT_SURE deliberately maps to null: "not sure"
          // is an absence of a service, not a service.
          service: selectedOffer ? selectedOffer.name : null,
          preferred_timing: timing,
          hp,
        }),
      });
      if (!res.ok) {
        setBusy(false);
        if (res.status === 400) {
          setErr('Check your phone number and the details, then try again.');
        } else if (res.status === 410) {
          setErr('This page is no longer taking quote requests.');
        } else if (res.status === 429) {
          setErr(await refusalMessage(res, mechanicFirstName, unclaimed));
        } else if (res.status === 503) {
          // Ours, not his and not theirs. The route sends this when a lookup
          // it needs did not answer, which used to be reported as the
          // permanent 410 above, closing the conversion over a blip.
          setErr('Myku could not be reached just now. Wait a moment and send it again.');
        } else {
          setErr(GENERIC_ERROR);
        }
        return;
      }
      setDone(true);
    } catch {
      // Network failure or the 15s timeout. There is no response to read, so
      // nothing more specific is honest here.
      setBusy(false);
      setErr(GENERIC_ERROR);
    } finally {
      clearTimeout(timeout);
    }
  }

  useEffect(() => {
    if (!done) return;
    document.body.dataset.leadSent = '1';
    sentRef.current?.focus({ preventScroll: true });
  }, [done]);

  if (done) {
    // No app pitch here. This is the customer's FIRST job, and a download ask
    // at the moment of conversion costs the customer and, downstream, costs
    // the mechanic the reason he shares the link at all. Nothing promises the
    // mechanic will reply.
    return (
      <div className="mp-sent">
        <h2 tabIndex={-1} ref={sentRef}>
          Request sent.
        </h2>
        <p>
          {unclaimed
            ? `Myku will pass this to ${mechanicFirstName} with the number you left.`
            : `Your request is in ${mechanicFirstName}'s Myku inbox, with the number you left.`}
        </p>
      </div>
    );
  }

  return (
    <>
      {sectionNum ? <span className="mp-sec-num">{sectionNum} · Your quote</span> : null}
      <h2>Get a price from {mechanicFirstName}</h2>
      <p className="mp-lead">
        {unclaimed
          ? `Pick the job and leave your number. Myku passes the request to ${mechanicFirstName}.`
          : `Pick the job and leave your number. Myku passes it to ${mechanicFirstName}, who sets the price.`}
      </p>

      {/* Submitting requires JS. Giving the fields `name` attributes so a
          no-JS submit "worked" would put the customer's phone number into a
          URL query string, which is the one place it must never go. So the
          form says so plainly instead of silently discarding what they
          typed. Everything else on this page reads fine without JS. */}
      <noscript>
        <p className="mp-noscript">
          Sending needs JavaScript switched on. Turn it on and reload, and this
          form will reach {mechanicFirstName}.
        </p>
      </noscript>
      <form className="mp-form" onSubmit={submit} noValidate>
        {/* Structured selection, not text injection: the chip IS the answer.
            One selectable at a time; tapping again releases it. */}
        <div className="mp-fgroup">
          <span className="mp-flabel" id="qf-job-lbl">
            The job
          </span>
          <div className="mp-chips" role="group" aria-labelledby="qf-job-lbl">
            {[...chipServices.map((s) => s.name), NOT_SURE].map((c) => {
              const sel = selected === c;
              return (
                <button
                  className={sel ? 'mp-chip sel' : 'mp-chip'}
                  type="button"
                  key={c}
                  aria-pressed={sel}
                  onClick={() => toggleService(c)}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {/* WHOSE LIST IS THIS. When he has named nothing, the five chips
              above are Myku's, not his, and they were presented in exactly
              the same type as a real service list. A visitor reasonably read
              them as work he offers, and a lead sent from one arrives tagged
              with that service name. Myku was asserting a service on the
              mechanic's behalf, which is the one thing the product may never
              do. The chips stay, because they are why a page with no data
              still converts; what changes is that the page stops claiming
              they came from him. Only rendered when he named nothing, so it
              never contradicts a real list. */}
          {usingFallback ? (
            <p className="mp-chip-note">
              Common requests, not a list of {mechanicFirstName}&apos;s services. Pick the
              closest one.
            </p>
          ) : null}
          {/* The quoting tax dies here: when the mechanic chose to price this
              service, the ballpark answers before anyone has to ask it. */}
          {selectedOffer?.priceFrom ? (
            <p className="mp-price-hint">
              Starts at ${selectedOffer.priceFrom}. {mechanicFirstName} sets the exact price for
              your job.
            </p>
          ) : null}
        </div>

        <div className="mp-fgroup">
          <label className="mp-flabel" htmlFor="qf-desc">
            What is going on
          </label>
          <textarea
            ref={taRef}
            className={`mp-inp${bad === 'desc' ? ' bad' : ''}`}
            id="qf-desc"
            aria-label="Describe what you need"
            aria-invalid={bad === 'desc'}
            aria-describedby="qf-err"
            placeholder={taPlaceholder}
            enterKeyHint="enter"
            maxLength={1500}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {/* Timing is one tap and optional, but it is the mechanic's triage
            signal: "today" and "whenever" are different phone calls. */}
        <div className="mp-fgroup">
          <span className="mp-flabel" id="qf-when-lbl">
            When
          </span>
          <div className="mp-chips seg" role="group" aria-labelledby="qf-when-lbl">
            {TIMING_OPTIONS.map((t) => {
              const sel = timing === t.value;
              return (
                <button
                  className={sel ? 'mp-chip sel' : 'mp-chip'}
                  type="button"
                  key={t.value}
                  aria-pressed={sel}
                  onClick={() => setTiming((cur) => (cur === t.value ? null : t.value))}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Vehicle, phone and name. The vehicle is optional; an empty box must
            never block the send. Phone and name are both required: the phone
            because Call and Text are the mechanic's only two actions on a lead,
            and the name because he is about to ring a stranger and should be
            able to open with theirs. Email is optional, below. */}
        <div className="mp-fgroup mp-two">
          <div>
            <label className="mp-flabel" htmlFor="qf-vehicle">
              Your vehicle
            </label>
            <input
              className="mp-inp"
              id="qf-vehicle"
              type="text"
              autoComplete="off"
              placeholder="2015 Honda Civic"
              maxLength={80}
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            />
          </div>
          <div>
            <label className="mp-flabel" htmlFor="qf-phone">
              Your number <span className="req">*</span>
            </label>
            <input
              ref={phoneRef}
              className={`mp-inp${bad === 'phone' ? ' bad' : ''}`}
              id="qf-phone"
              aria-invalid={bad === 'phone'}
              aria-describedby="qf-err"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="send"
              placeholder="(555) 555-5555"
              maxLength={32}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="mp-fgroup">
          <label className="mp-flabel" htmlFor="qf-name">
            Your name <span className="req">*</span>
          </label>
          <input
            ref={nameRef}
            className={`mp-inp${bad === 'name' ? ' bad' : ''}`}
            id="qf-name"
            aria-invalid={bad === 'name'}
            aria-describedby="qf-err"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <button
          className="mp-optlink"
          type="button"
          aria-expanded={showOpt}
          aria-controls="qf-opt"
          onClick={() => {
            const next = !showOpt;
            setShowOpt(next);
            if (next)
              requestAnimationFrame(() => {
                const el = emailRef.current;
                if (!el) return;
                el.focus({ preventScroll: true });
                el.scrollIntoView({ block: 'center', behavior: 'auto' });
              });
          }}
        >
          + Add your email
          <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div id="qf-opt" hidden={!showOpt}>
          <div className="mp-fgroup">
            <label className="mp-flabel" htmlFor="qf-email">
              Your email
            </label>
            <input
              ref={emailRef}
              className={`mp-inp${bad === 'email' ? ' bad' : ''}`}
              id="qf-email"
              aria-invalid={bad === 'email'}
              aria-describedby="qf-err"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              maxLength={160}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Honeypot: the field name maps to nothing in any autofill
            vocabulary. The API returns a fake 201 when it arrives non-empty,
            so a bot sees success and nothing is stored. Both halves must
            survive any restyle: the spam lands on the mechanic, not on Myku. */}
        <div className="mp-hp" aria-hidden="true">
          <label htmlFor="qf-note">Leave this field empty</label>
          <input
            id="qf-note"
            name="contact_preference_note"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
        </div>

        <div className="mp-submit">
          <button className="mp-btn mp-btn-o mp-btn-xl mp-mag" type="submit" disabled={busy}>
            <span className="lbl">
              {busy ? 'Sending…' : 'Get my price'}
              {busy ? null : (
                <span className="mp-arrow" aria-hidden="true">
                  &#8594;
                </span>
              )}
            </span>
          </button>
          {/* Never "your number goes to him only": when the mechanic has no
              reachable device Myku's own safety net routes the request to
              admin so it does not die silently, so exclusivity is a promise
              the system is built to break. */}
          <p className="mp-sub">
            {unclaimed
              ? `Free · No account needed · Myku passes your request to ${mechanicFirstName}`
              : `Free · No account needed · Myku delivers your number to ${mechanicFirstName}`}
          </p>
        </div>

        {/* ALWAYS in the DOM with height reserved, so the layout never jumps
            and the live region is not created at announce time. */}
        <div className="mp-err" id="qf-err" role="alert">
          {err}
        </div>
      </form>
    </>
  );
}
