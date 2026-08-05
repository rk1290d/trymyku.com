'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AppStoreBadge from '@/components/AppStoreBadge';

// The booking composer on every public profile page. It is the only
// conversion event on that page, so it sits in normal document flow in the
// upper third rather than behind an anchor jump. The ask changed on
// 2026-08-04: the mechanic shares this link with people he is already
// talking to, so "leave your number and he will reply" undersold the
// moment. The page now takes a booking request: pick the job, say when,
// leave the number. Works identically on claimed and unclaimed pages; on
// unclaimed pages the request is the reason the mechanic signs up.

// The one chip that is always present. It carries the "I don't know what
// is wrong" customer, the persona the whole product exists for, so it can
// never be dropped no matter what the mechanic's service list looks like.
const NOT_SURE = 'Not sure / something else';

// Hardcoded fallbacks for pages with no usable service list. These are why
// the page converts with zero mechanic data.
const FALLBACK_SERVICES = [
  "Won't start",
  'Brakes',
  'Check engine light',
  'Oil change',
  'AC or heat',
];

// Service names are free text. A chip is one nowrap line, and the composer's
// whole fold budget assumes at most two chip rows on a 390px screen, so only
// chip-sized labels are allowed to drive the set. Anything longer falls back
// to the hardcoded five, which is the same safety net the sparse page uses.
const MAX_CHIP_CHARS = 22;

export interface ServiceOffer {
  name: string;
  priceFrom: number | null;
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
}: {
  mechanicId: string;
  slug: string;
  mechanicFirstName: string;
  unclaimed?: boolean;
  services?: ServiceOffer[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [timing, setTiming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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

  // The bottom repeat-ask anchor lands as a keyboard, not a shrug.
  // Deliberately NOT run on mount: a cold load of /slug#ask must not open
  // the keyboard before the visitor has read the mechanic's name (WCAG
  // 3.2.1). The delegated click covers the repeat tap, where the hash is
  // already '#ask' and no hashchange fires.
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

  const offered = services.filter(
    (s) => s.name.trim().length > 0 && s.name.trim().length <= MAX_CHIP_CHARS
  );
  const usingFallback = offered.length < 3;
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
    const hit = chipServices.find((s) => norm(s.name) === target);
    if (hit) setSelected(hit.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  const selectedOffer =
    selected && selected !== NOT_SURE
      ? chipServices.find((s) => s.name === selected) ?? null
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
      setErr('Please enter a valid phone number.');
      phoneRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          mechanic_id: mechanicId,
          slug,
          customer_name: name.trim() || null,
          customer_phone: phone.trim(),
          vehicle: vehicle.trim() || null,
          description: desc.trim(),
          // Structured booking fields. NOT_SURE deliberately maps to null:
          // "not sure" is an absence of a service, not a service.
          service: selectedOffer ? selectedOffer.name : null,
          preferred_timing: timing,
          hp,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setDone(true);
    } catch (thrown) {
      setBusy(false);
      const status = thrown instanceof Error ? Number(thrown.message) : NaN;
      if (status === 400) {
        setErr('Check your phone number and the details, then try again.');
      } else if (status === 410) {
        setErr('This page is no longer taking booking requests.');
      } else if (status === 429) {
        setErr('This page is busy right now. Please wait a minute and try again.');
      } else {
        setErr('Something went wrong. Please try again, or email support@trymyku.com.');
      }
    }
  }

  useEffect(() => {
    if (!done) return;
    document.body.dataset.leadSent = '1';
    sentRef.current?.focus({ preventScroll: true });
  }, [done]);

  if (done) {
    // The install ask lives after the conversion, never before it. Every
    // sentence here states something MYKU does or a fact about where the
    // request now sits. Nothing promises the mechanic will reply: Myku
    // cannot compel an independent business to answer, so it must not
    // promise on his behalf.
    return (
      <div className="mp-sent">
        <h2 tabIndex={-1} ref={sentRef}>
          Booking request sent.
        </h2>
        <p>
          {unclaimed
            ? `Myku will pass this to ${mechanicFirstName}. Nothing is booked until the two of you agree.`
            : `Your request is in ${mechanicFirstName}'s Myku inbox, with your number. Nothing is booked until the two of you agree.`}
        </p>
        <p className="inst">
          Myku is the free app behind this page. It keeps your request, the
          reply, and the record of the work in one place.
        </p>
        <div className="badgewrap">
          <AppStoreBadge />
        </div>
      </div>
    );
  }

  return (
    <>
      <h2>
        <svg className="mp-wrench" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        Book {mechanicFirstName} on Myku
      </h2>
      <p className="mp-ask-sub">
        {unclaimed
          ? `Pick the job and leave your number. Myku passes the request to ${mechanicFirstName}.`
          : `Pick the job and leave your number. ${mechanicFirstName} sets the price.`}
      </p>

      {/* Structured selection, not text injection: the chip IS the answer.
          One selectable at a time; tapping again releases it. */}
      <div className="mp-chips" role="group" aria-label="What do you need done?">
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
      {/* The quoting tax dies here: when the mechanic chose to price this
          service, the ballpark answers before anyone has to ask it. */}
      {selectedOffer?.priceFrom ? (
        <p className="mp-price-hint">
          Starts at ${selectedOffer.priceFrom}. {mechanicFirstName} sets the
          exact price for your job.
        </p>
      ) : null}

      <form className="mp-form" onSubmit={submit} noValidate>
        <textarea
          ref={taRef}
          className={`mp-inp ta${bad === 'desc' ? ' bad' : ''}`}
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

        {/* Timing is one tap and optional, but it is the mechanic's triage
            signal: "today" and "whenever" are different phone calls. */}
        <div className="mp-field">
          <span className="mp-lbl" id="qf-when-lbl">
            When do you need it?
          </span>
          <div
            className="mp-chips when"
            role="group"
            aria-labelledby="qf-when-lbl"
          >
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

        {/* Vehicle is promoted out of the disclosure: a booking without the
            car is a phone call the mechanic still has to make. Optional all
            the same; an empty box must never block the send. */}
        <div className="mp-field">
          <label className="mp-lbl" htmlFor="qf-vehicle">
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

        <div className="mp-field">
          <label className="mp-lbl" htmlFor="qf-phone">
            Your number
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
                const el = nameRef.current;
                if (!el) return;
                el.focus({ preventScroll: true });
                el.scrollIntoView({ block: 'center', behavior: 'auto' });
              });
          }}
        >
          + Add your name
          <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div id="qf-opt" hidden={!showOpt}>
          <div className="mp-field">
            <label className="mp-lbl" htmlFor="qf-name">
              Your name
            </label>
            <input
              ref={nameRef}
              className="mp-inp"
              id="qf-name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        {/* Honeypot: name maps to nothing in any autofill vocabulary. */}
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

        <button className="mp-send" type="submit" disabled={busy}>
          {busy ? 'Sending…' : `Book ${mechanicFirstName}`}
        </button>
        <div className="mp-err" id="qf-err" role="alert">
          {err}
        </div>
        {/* Never "your number goes to him only": when the mechanic has no
            reachable device Myku's own safety net routes the request to
            admin so it does not die silently, so exclusivity is a promise
            the system is built to break. */}
        <p className="mp-reassure">
          {unclaimed
            ? `Free. No account needed. Myku passes your request to ${mechanicFirstName}.`
            : `Free. No account needed. Myku delivers your number to ${mechanicFirstName}.`}
        </p>
      </form>
    </>
  );
}
