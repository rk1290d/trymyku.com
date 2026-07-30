'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AppStoreBadge from '@/components/AppStoreBadge';

// The composer on every public profile page. It is the only conversion
// event on that page, so it sits in normal document flow in the upper
// third rather than behind an anchor jump. Works identically on claimed
// and unclaimed pages: the request is stored either way, and on unclaimed
// pages it becomes the reason the mechanic signs up.

// Hardcoded starters. These are why the page converts with zero mechanic
// data: a blank textarea is the number one abandonment point in a
// free-text lead form, and this turns it into a two-tap problem.
const FALLBACK_CHIPS = [
  "Won't start",
  'Brakes',
  'Check engine light',
  'Oil change',
  'AC or heat',
  'Something else',
];

// Prototype-free: a service literally named "constructor" or "toString"
// would otherwise return a function here and throw on the next line.
const SENTENCES: Record<string, string> = Object.assign(
  Object.create(null) as Record<string, string>,
  {
    "Won't start": "My car won't start. ",
    Brakes: 'I need help with brakes. ',
    'Check engine light': 'My check engine light is on. ',
    'Oil change': 'I need an oil change. ',
    'AC or heat': 'I need help with AC or heat. ',
    'Something else': '',
  }
);

function starterFor(chip: string): string {
  const s = SENTENCES[chip];
  if (typeof s === 'string') return s;
  return `I need help with ${chip.toLowerCase()}. `;
}

// Service names are free text. A chip is one nowrap line, and the composer's
// whole fold budget assumes at most two rows on a 390px screen, so only
// chip-sized labels are allowed to drive the set. Anything longer falls back
// to the hardcoded six, which is the same safety net the sparse page uses.
const MAX_CHIP_CHARS = 22;

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
  services?: string[];
}) {
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

  const focusTextarea = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    const end = ta.value.length;
    try {
      ta.setSelectionRange(end, end);
    } catch {
      /* some browsers refuse setSelectionRange on an unfocused control */
    }
  }, []);

  // The bottom repeat-ask anchor lands as a keyboard, not a shrug.
  // Deliberately NOT called on mount: a cold load of a legacy /slug#quote
  // link would then open the keyboard before the visitor has read the
  // mechanic's name, which is the classic WCAG 3.2.1 on-focus complaint.
  // The delegated click covers the repeat tap, where the hash is already
  // '#ask' and no hashchange fires.
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#ask' || h === '#quote') focusTextarea();
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('a[href="#ask"], a[href="#quote"]')) {
        requestAnimationFrame(focusTextarea);
      }
    };
    window.addEventListener('hashchange', onHash);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('click', onClick);
    };
  }, [focusTextarea]);

  const shortServices = services.filter(
    (s) => s.trim().length > 0 && s.trim().length <= MAX_CHIP_CHARS
  );
  const chips =
    shortServices.length >= 3
      ? [...shortServices.slice(0, 5), 'Something else']
      : FALLBACK_CHIPS;

  function addStarter(chip: string) {
    const sentence = starterFor(chip);
    if (sentence && !desc.includes(sentence.trim())) {
      setDesc((d) => (d ? `${d.trimEnd()} ${sentence}` : sentence));
    }
    // The proof of the interaction is the words now sitting in the box.
    requestAnimationFrame(focusTextarea);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBad(null);
    const digits = phone.replace(/[^\d]/g, '');
    // The error line sits below the send button, so on a phone with the
    // keyboard up the field it refers to can be off screen. Focusing it
    // scrolls it back into view for free.
    if (digits.length < 7 || digits.length > 15) {
      setBad('phone');
      setErr('Please enter a valid phone number.');
      phoneRef.current?.focus();
      return;
    }
    if (desc.trim().length < 5) {
      setBad('desc');
      setErr('Please describe what you need. Even one sentence helps.');
      taRef.current?.focus();
      return;
    }
    // Honeypot: bots fill this hidden field. Pretend success, store nothing.
    if (hp) {
      setDone(true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mechanic_id: mechanicId,
          slug,
          customer_name: name.trim() || null,
          customer_phone: phone.trim(),
          vehicle: vehicle.trim() || null,
          description: desc.trim(),
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setDone(true);
    } catch {
      setBusy(false);
      setErr('Something went wrong. Please try again, or email support@trymyku.com.');
    }
  }

  if (done) {
    // The install ask lives after the conversion, never before it.
    return (
      <div className="mp-sent">
        <h3>Request sent.</h3>
        <p>
          {unclaimed
            ? `Myku will pass this to ${mechanicFirstName} and text you at that number with an answer either way.`
            : `${mechanicFirstName} will call or text the number you left. Nothing else to do.`}
        </p>
        <p className="inst">
          Myku is the free app behind this page. It keeps your request and the
          reply in one place.
        </p>
        <div className="badgewrap">
          <AppStoreBadge />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* The heading and sub-line belong to the ask, so they live here and
          disappear with it when the request is sent. */}
      <h2>Tell {mechanicFirstName} what you need</h2>
      <p className="mp-ask-sub">
        {unclaimed
          ? `Describe the problem and leave your number. Myku will pass it to ${mechanicFirstName} and text you either way.`
          : `Describe the problem and leave your number. ${mechanicFirstName} replies with a price.`}
      </p>

      <div className="mp-chips">
        {chips.map((c, i) => (
          <button
            className="mp-chip"
            type="button"
            key={`${c}-${i}`}
            onClick={() => addStarter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <form className="mp-form" onSubmit={submit} noValidate>
        {/* No visible label: the 22px heading above is the label. */}
        <textarea
          ref={taRef}
          className={`mp-inp ta${bad === 'desc' ? ' bad' : ''}`}
          id="qf-desc"
          aria-label="Describe what you need"
          aria-invalid={bad === 'desc'}
          aria-describedby="qf-err"
          placeholder="Grinding noise when I brake, started last week."
          maxLength={1500}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        {/* The phone field keeps its label. A bare number box with no label
            is the scariest element on the page. */}
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
            placeholder="(555) 555-5555"
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* The resting composer is three things: message, number, send. */}
        {!showOpt ? (
          <button
            className="mp-optlink"
            type="button"
            onClick={() => {
              // This control unmounts itself, so without this a keyboard or
              // screen-reader user is dropped to <body> and has to tab back
              // from the top of the document to reach the fields they just
              // revealed.
              setShowOpt(true);
              requestAnimationFrame(() =>
                nameRef.current?.focus({ preventScroll: true })
              );
            }}
          >
            + Add your name and vehicle
          </button>
        ) : null}
        <div hidden={!showOpt}>
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
        </div>

        <div className="mp-hp" aria-hidden="true">
          <label htmlFor="qf-company">Company</label>
          <input
            id="qf-company"
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
          />
        </div>

        <button className="mp-send" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send request'}
        </button>
        <div className="mp-err" id="qf-err" role="alert">
          {err}
        </div>
        <p className="mp-reassure">
          {unclaimed
            ? `Free. No account, no download. Myku passes your request to ${mechanicFirstName}.`
            : `Free. No account, no download. Your number goes to ${mechanicFirstName} only.`}
        </p>
      </form>
    </>
  );
}
