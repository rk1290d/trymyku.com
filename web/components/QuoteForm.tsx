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
  // Lowercase the leading character only when the label looks like a plain
  // word. "AC repair" and "ABS diagnostics" keep their acronyms intact in
  // the customer's own sentence.
  const t = chip.trim();
  const looksAcronym = t.length > 1 && t[1] !== t[1].toLowerCase();
  const label = looksAcronym ? t : t.charAt(0).toLowerCase() + t.slice(1);
  return `I need help with ${label}. `;
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
  const sentRef = useRef<HTMLHeadingElement | null>(null);

  // ensureVisible: chip and disclosure taps must leave their target on
  // screen even when the keyboard opens. Hash navigation keeps
  // preventScroll alone because the anchor jump already positioned the
  // card. behavior 'auto' so reduced-motion users get no animated pan.
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
    // The proof of the interaction is the words now sitting in the box,
    // so the box must not be left under the keyboard the tap just opened.
    requestAnimationFrame(() => focusTextarea(true));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Any second submit event during flight (requestSubmit, implicit Enter
    // submission racing the disabled repaint) must be a no-op.
    if (busy || done) return;
    setErr('');
    setBad(null);
    // Validate in DOM order: description first, then phone, so a visitor
    // fixing an empty form walks top to bottom instead of bouncing.
    // The error line sits below the send button, so on a phone with the
    // keyboard up the field it refers to can be off screen. Focusing it
    // scrolls it back into view for free.
    if (desc.trim().length < 5) {
      setBad('desc');
      setErr('Please describe what you need. Even one sentence helps.');
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
        // A hung server must fall into the recoverable catch branch, not
        // hold the button on "Sending…" forever.
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          mechanic_id: mechanicId,
          slug,
          customer_name: name.trim() || null,
          customer_phone: phone.trim(),
          vehicle: vehicle.trim() || null,
          description: desc.trim(),
          // Honeypot travels to the server, which decides. The server fakes
          // success for bots so a direct POST learns nothing.
          hp,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setDone(true);
    } catch (thrown) {
      setBusy(false);
      const status = thrown instanceof Error ? Number(thrown.message) : NaN;
      if (status === 400) {
        setErr('Check your phone number and description and try again.');
      } else if (status === 410) {
        setErr('This page is no longer taking requests.');
      } else if (status === 429) {
        setErr('Too many requests from this connection. Please wait a minute and try again.');
      } else {
        setErr('Something went wrong. Please try again, or email support@trymyku.com.');
      }
    }
  }

  // A screen reader user who pressed Send must hear the confirmation: the
  // form branch (send button included) unmounts, so focus would otherwise
  // drop silently to <body>. The body flag also lets CSS retire the
  // server-rendered repeat ask, whose target no longer exists.
  useEffect(() => {
    if (!done) return;
    document.body.dataset.leadSent = '1';
    sentRef.current?.focus({ preventScroll: true });
  }, [done]);

  if (done) {
    // The install ask lives after the conversion, never before it.
    // h2, not h3: the composer heading it replaces is an h2, and the page
    // outline must not skip a level in the sent state.
    return (
      <div className="mp-sent">
        <h2 tabIndex={-1} ref={sentRef}>
          Request sent.
        </h2>
        <p>
          {unclaimed
            ? `Myku will pass this to ${mechanicFirstName}. If ${mechanicFirstName} can take the job, you will hear back at the number you left.`
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
          disappear with it when the request is sent. The wrench is the
          composer card's anchor glyph: ink, decorative. */}
      <h2>
        <svg className="mp-wrench" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        Tell {mechanicFirstName} what you need
      </h2>
      <p className="mp-ask-sub">
        {unclaimed
          ? `Describe the problem and leave your number. Myku will pass it to ${mechanicFirstName}.`
          : `Describe the problem and leave your number. ${mechanicFirstName} replies with a price.`}
      </p>

      <div className="mp-chips">
        {chips.map((c, i) => {
          // Used state: the chip's sentence is currently sitting in the
          // textarea. Reactive on desc, so deleting the words releases the
          // chip. "Something else" adds no sentence and never marks.
          const s = starterFor(c).trim();
          const used = s.length > 0 && desc.includes(s);
          return (
            <button
              className={used ? 'mp-chip used' : 'mp-chip'}
              type="button"
              key={`${c}-${i}`}
              aria-pressed={used}
              onClick={() => addStarter(c)}
            >
              {c}
            </button>
          );
        })}
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
          enterKeyHint="enter"
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
            enterKeyHint="send"
            placeholder="(555) 555-5555"
            maxLength={32}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* The resting composer is three things: message, number, send.
            This disclosure is a real toggle: it stays in place, keeps
            focus order intact, and its chevron rotates when open. */}
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
                // Same keyboard rule as the chips: the field the tap just
                // revealed must not open under the keyboard.
                el.scrollIntoView({ block: 'center', behavior: 'auto' });
              });
          }}
        >
          + Add your name and vehicle
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

        {/* Honeypot. The old name "company" was a real autofill token, so a
            password manager could fill it for a human and silently eat the
            lead. This name maps to nothing in any autofill vocabulary. */}
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
