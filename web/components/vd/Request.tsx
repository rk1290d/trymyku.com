'use client';

import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FocusEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, TouchEvent as ReactTouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import { vdSign, vdText, vdVoice } from './fonts';
import {
  acquireRequestLayer,
  publishRequest,
  registerRequestOpener,
  releaseRequestLayer,
  type OpenRequest,
} from './requestBus';

// THE WORK ORDER: the price request on the mechanic's page (2026-10-04, the van door redesign Rohaan approved).
//
// This is the conversion moment of the whole product: a stranger who opened his page from a Facebook thread asks him
// for a price. Ported from the approved mock (design-mocks/mechanic-page-2026-10-04 in the app repo: src/view.py
// work_order, src/page.css "the request", "the sheet", "the dock", the laptop rail, src/page.js), adapted to React.
//
// ONE instance, three presentations:
// - inline, where the page puts it: at the end of the page on a phone, in the right-hand column on a laptop;
// - on a phone (under 1024px) with the script on, opening it lifts the same work order into a bottom sheet over the
//   page, in two steps: pick the job, then the details. Back, the X, the scrim or a swipe down closes it;
// - on a laptop it is the rail: everything at once, compact, Send pinned in view at the card's bottom edge.
// Without the script it is one plain form at the end of the page that says sending needs the script (below).
//
// WHAT IT KEEPS FROM components/QuoteForm.tsx, unchanged, because that is the contract with app/api/lead/route.ts:
// the POST body (mechanic_id, slug, customer_name, customer_phone, customer_email, vehicle, description, service,
// preferred_timing, hp), "Not sure / something else" posting as no service, the client rules (a job or five
// characters of description, a phone of 7 to 15 digits, a name of two letters, an optional email that looks like
// one), the 15 second timeout, and the status-coded refusals word for word. "Where's the car?" has no column: it
// rides at the start of the description as "Car is in: <town>.", inside the route's 1,500 characters.
//
// RULES THE COPY KEEPS (Rohaan, and VISION.md): it never promises a reply, a response time or a price; it never
// mentions deposits; it names Myku as little as it can; on a page he has not claimed nothing is credited to him (his
// note does not render, and Myku is the one passing the request on).

export interface RequestService {
  label: string;
  priceFrom: number | null;
}

export interface RequestProps {
  mechanicId: string;
  slug: string;
  first: string;
  face: string | null;
  services: RequestService[];
  requestNote: string | null;
  workType: 'Mobile' | 'Shop' | 'Mobile or drop-off' | null;
  unclaimed: boolean;
}

type Field = 'desc' | 'where' | 'name' | 'phone' | 'email';
type Errs = Partial<Record<Field, string>>;
type Pending = 'sheet' | 'heading' | 'picked' | 'tile' | 'box' | 'opener' | 'fix' | Field;

// The route's own fallback value (route.ts ALLOWED_FALLBACK). With the script it posts as service: null, as the old
// composer did: "not sure" is the absence of a service, and the description then has to carry the job.
const NOT_SURE = 'Not sure / something else';
// Tiles before "N more services". Not sure always sits right after them, so it is in the first set she sees.
const FIRST_TILES = 6;
// The route's limits (app/api/lead/route.ts). The description's 1,500 is shared with the "Car is in: <town>. " prefix,
// so the box stops at 1,420 and the town at 60: the two together can never be cut by the route.
const DESC_MAX = 1420;
const WHERE_MAX = 60;
const CAR_MAX = 80;
const NAME_MAX = 80;
const PHONE_MAX = 32;
const EMAIL_MAX = 160;
const SERVICE_MAX = 120; // the route slices a service to 120 characters; a longer one would never match his list
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DRAFT_TTL = 24 * 60 * 60 * 1000; // her number never outlives the day
const DESK = '(min-width: 1024px)';

const TIMING: { value: 'asap' | 'this_week' | 'flexible'; label: string }[] = [
  { value: 'asap', label: 'As soon as you can' },
  { value: 'this_week', label: 'This week' },
  { value: 'flexible', label: 'Flexible' },
];

// The box's placeholder is written for the job she picked: a format hint for what to write, never sample data.
// Order matters: the AC test runs before the engine one, so "AC recharge and diagnosis" gets the AC hint.
const HINT_RULES: [RegExp, string][] = [
  [/brake|fren/i, 'What you hear or feel when you brake, and since when'],
  [/no[- ]?start|crank/i, 'What happens when you turn the key: a click, a crank or nothing'],
  [/starter|alternator/i, 'What happens when you turn the key, and any warning lights'],
  [/batter/i, 'How it starts, or doesn’t, and since when'],
  [/\bac\b|a\/c|air[- ]?con|climate|\baire\b/i, 'What the air does (warm, weak, a smell), and since when'],
  [/check engine|engine light|engine diagnos|diagnos/i, 'When the light came on, and anything else you notice'],
  [/\boil/i, 'Miles since the last change, if you know'],
  [/suspension|steering/i, 'Noises over bumps, pulling, and since when'],
  [/inspection|pre-purchase/i, 'The car you’re looking at, and where it is'],
  [/build|custom|race|muscle|restor/i, 'The car, and what you want done'],
];
const DEFAULT_HINT = 'What you hear, see or feel, and since when';

function hintFor(job: string | null): string {
  if (!job || job === NOT_SURE) return DEFAULT_HINT;
  for (const [re, hint] of HINT_RULES) if (re.test(job)) return hint;
  return DEFAULT_HINT;
}

const GENERIC_ERROR = 'Something went wrong. Please try again, or email support@trymyku.com.';

// Word for word from components/QuoteForm.tsx (its header explains each branch). The route tags every 429 with the
// limit that fired and how long it really lasts, and each one gets the sentence that is true for it. The 'mechanic'
// line says nothing about how busy he is (Rohaan, 2026-10-04).
async function refusalMessage(res: Response, first: string, unclaimed: boolean): Promise<string> {
  let scope = '';
  let retryAfter = 0;
  try {
    const body = (await res.json()) as { scope?: string; retry_after?: number };
    scope = typeof body.scope === 'string' ? body.scope : '';
    retryAfter = Number(body.retry_after) || 0;
  } catch {
    // an unreadable body falls through to the safest of the three
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
    return 'Myku could not take this request. Please try again in an hour, or email support@trymyku.com.';
  }
  return 'That went through too fast. Please wait a minute and try again.';
}

// The same normalisation QuoteForm used for ?service= links, so a link he already shared keeps working.
function norm(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Mirrors the route: an extension ("ext 22", "x22") is not part of the number it counts.
function phoneDigits(phone: string): string {
  return phone.replace(/(?:ext|extension|x)[.:]?\s*\d+\s*$/i, '').replace(/[^\d]/g, '');
}

function prettyPhone(phone: string): string {
  const g = phone.replace(/[^\d]/g, '');
  if (g.length === 10) return `(${g.slice(0, 3)}) ${g.slice(3, 6)}-${g.slice(6)}`;
  if (g.length === 11 && g[0] === '1') return `+1 (${g.slice(1, 4)}) ${g.slice(4, 7)}-${g.slice(7)}`;
  return phone.trim();
}

function money(n: number | null): string | null {
  if (n === null || !Number.isFinite(n) || n <= 0) return null;
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function isSupabaseImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'fioiaoxaozqfwdqukoho.supabase.co';
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- the draft
   What she typed is kept on this phone, so the request is still there when she comes back from the Facebook thread
   (an in-app browser often reloads the page). Every read and write is wrapped: a private window or blocked site data
   throws, and the form must work exactly the same without it. Cleared the moment a request goes through. */
interface Draft {
  at: number;
  job: string;
  desc: string;
  car: string;
  where: string;
  when: string;
  name: string;
  phone: string;
  email: string;
}

const draftKey = (slug: string) => `myku-draft:${slug}`;

function readDraft(slug: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(slug));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Draft> | null;
    if (!v || typeof v !== 'object' || typeof v.at !== 'number' || Date.now() - v.at > DRAFT_TTL) {
      window.localStorage.removeItem(draftKey(slug));
      return null;
    }
    const s = (x: unknown) => (typeof x === 'string' ? x : '');
    return {
      at: v.at,
      job: s(v.job),
      desc: s(v.desc),
      car: s(v.car),
      where: s(v.where),
      when: s(v.when),
      name: s(v.name),
      phone: s(v.phone),
      email: s(v.email),
    };
  } catch {
    return null;
  }
}

function writeDraft(slug: string, d: Omit<Draft, 'at'> | null): void {
  try {
    const empty = !d || Object.values(d).every((x) => !x);
    if (empty) window.localStorage.removeItem(draftKey(slug));
    else window.localStorage.setItem(draftKey(slug), JSON.stringify({ at: Date.now(), ...d }));
  } catch {
    // nothing kept, and nothing on screen claims it was
  }
}

const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};
const smooth = (): ScrollBehavior => (reducedMotion() ? 'auto' : 'smooth');

export default function Request({
  mechanicId,
  slug,
  first,
  face,
  services,
  requestNote,
  workType,
  unclaimed,
}: RequestProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const fid = (k: string) => `rq${uid}-${k}`;
  const hId = fid('h');

  /* ---------------- what he offers ---------------- */
  // His own labels, trimmed and deduped (first wins its price). Nothing is ever offered on his behalf: a page with no
  // services skips the job step and opens on "What's the car doing?".
  const tiles = useMemo(() => {
    const seen = new Set<string>();
    const out: RequestService[] = [];
    for (const s of services) {
      const label = (s.label ?? '').trim();
      const key = label.toLowerCase();
      if (!label || label.length > SERVICE_MAX || label === NOT_SURE || seen.has(key)) continue;
      seen.add(key);
      out.push({ label, priceFrom: typeof s.priceFrom === 'number' && s.priceFrom > 0 ? s.priceFrom : null });
    }
    return out;
  }, [services]);
  const hasTiles = tiles.length > 0;
  const firstSet = tiles.slice(0, FIRST_TILES);
  const rest = tiles.slice(FIRST_TILES);
  // "Where's the car?": a mobile mechanic's first question. Asked of a driveway-only mechanic, optional for one who
  // also takes drop-offs, and not asked at all of a shop (or when his work type is unknown).
  const whereMode: 'required' | 'optional' | null =
    workType === 'Mobile' ? 'required' : workType === 'Mobile or drop-off' ? 'optional' : null;
  // His own words. Never on a page he has not claimed: there they would be words Myku copied, credited to him.
  const note = unclaimed ? null : requestNote?.trim() || null;
  const noteAsksPhoto = note ? /photo|picture|\bpic|foto|imagen/i.test(note) : false;
  const noteAsksDash = noteAsksPhoto && /dash|tablero/i.test(note ?? '');

  const findJob = (v: string | null | undefined): string | null => {
    const raw = (v ?? '').trim();
    if (!raw || !hasTiles) return null;
    if (raw === NOT_SURE || norm(raw) === 'not-sure' || norm(raw) === norm(NOT_SURE)) return NOT_SURE;
    const hit =
      tiles.find((t) => t.label === raw) ??
      tiles.find((t) => t.label.toLowerCase() === raw.toLowerCase()) ??
      (norm(raw) ? tiles.find((t) => norm(t.label) === norm(raw)) : undefined);
    return hit ? hit.label : null;
  };
  const stepFor = (j: string | null): 1 | 2 => (!hasTiles || j ? 2 : 1);

  /* ---------------- state ---------------- */
  const [js, setJs] = useState(false);
  const [desk, setDesk] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const [step, setStep] = useState<1 | 2>(hasTiles ? 1 : 2);
  const [job, setJob] = useState<string | null>(null);
  const [mine, setMine] = useState(false); // she chose the job herself (a link's ?service= is not her choice yet)
  const [showTiles, setShowTiles] = useState(false); // the laptop rail folds its tiles once a job is picked
  const [moreOpen, setMoreOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [car, setCar] = useState('');
  const [where, setWhere] = useState('');
  const [timing, setTiming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [hp, setHp] = useState('');
  const [errs, setErrs] = useState<Errs>({});
  const [sendErr, setSendErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [recap, setRecap] = useState<[string, string][]>([]);

  const rootRef = useRef<HTMLElement | null>(null);
  const woRef = useRef<HTMLDivElement | null>(null);
  const hRef = useRef<HTMLHeadingElement | null>(null);
  const pickedRef = useRef<HTMLParagraphElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const whereRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const sendBarRef = useRef<HTMLDivElement | null>(null);

  const pending = useRef<Pending | null>(null); // what gets focus once the next render is on screen
  const pendingAt = useRef(0);
  const emailByHand = useRef(false); // "Add email" was tapped (not reopened by a remount or a restored draft)
  const toTop = useRef(false); // scroll the sheet or the rail back to its top
  const toCard = useRef(false); // bring the inline card into view (a phone, no sheet)
  const toRail = useRef(false); // bring the laptop rail into view, and ring it
  const opener = useRef<HTMLElement | null>(null);
  const mode = useRef(''); // how the last job tile was reached: 'pointer', or the key that was pressed
  const touched = useRef(false); // she has typed or picked something since the page loaded (the draft is hers)
  const sentJob = useRef<string | null>(null);
  const pushed = useRef(false); // our entry is on top of the browser history
  const pendingBack = useRef(false); // we called history.back() ourselves
  const drag = useRef<{ y0: number; dy: number } | null>(null);

  /* ---------------- focus and scrolling, once React has painted ---------------- */
  const reveal = (el: HTMLElement | null) => {
    // The laptop rail scrolls inside itself under a pinned Send: a field she is sent to, with its error line, is
    // brought up clear of the bar rather than left under it.
    const wo = woRef.current;
    if (!desk || sheet || !el || !wo || !wo.contains(el)) return;
    const f = (el.closest('.rq-fld') as HTMLElement | null) ?? el;
    const er = f.querySelector('.rq-err');
    const erBottom = er && er.textContent ? er.getBoundingClientRect().bottom : 0;
    const bottom = Math.max(f.getBoundingClientRect().bottom, erBottom);
    const limit = sendBarRef.current ? sendBarRef.current.getBoundingClientRect().top - 12 : window.innerHeight - 12;
    if (bottom > limit) wo.scrollTop += bottom - limit;
    const top = f.getBoundingClientRect().top;
    const woTop = wo.getBoundingClientRect().top + 8;
    if (top < woTop) wo.scrollTop -= woTop - top;
  };

  const applyPending = () => {
    const wo = woRef.current;
    if (!wo) return;
    if (toTop.current) {
      toTop.current = false;
      wo.scrollTop = 0;
    }
    if (toCard.current) {
      toCard.current = false;
      if (!sheet && !desk) {
        window.scrollTo({ top: wo.getBoundingClientRect().top + window.scrollY - 16, behavior: smooth() });
      }
    }
    if (toRail.current) {
      toRail.current = false;
      if (desk) {
        // a rail that has scrolled away (a short page, or a click near the end of it) comes back into view first
        const r = wo.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight - 160) {
          window.scrollTo({ top: r.top + window.scrollY - 16, behavior: smooth() });
        }
        wo.classList.remove('rq-flash');
        void wo.offsetWidth;
        wo.classList.add('rq-flash');
      }
    }
    const p = pending.current;
    if (!p) return;
    // A focus that cannot land yet (its step is still hidden, its field not rendered) waits for the render that
    // shows it, but never more than a second: a stale one must not grab focus later out of nowhere.
    if (Date.now() - pendingAt.current > 1000) {
      pending.current = null;
      return;
    }
    const tileEl =
      wo.querySelector<HTMLInputElement>('input[name="service"]:checked') ??
      wo.querySelector<HTMLInputElement>('input[name="service"]');
    const target: HTMLElement | null =
      p === 'sheet'
        ? wo
        : p === 'heading'
          ? hRef.current
          : p === 'picked'
            ? pickedRef.current ?? hRef.current
            : p === 'tile'
              ? tileEl ?? descRef.current
              : p === 'opener'
                ? opener.current
                : p === 'fix'
                  ? phoneRef.current
                  : p === 'box'
                    ? descRef.current
                    : { desc: descRef.current, where: whereRef.current, name: nameRef.current, phone: phoneRef.current, email: emailRef.current }[p];
    if (p === 'opener') {
      pending.current = null;
      opener.current = null;
      if (target && target.isConnected) target.focus({ preventScroll: true });
      return;
    }
    // the card itself is focusable in the sheet; anything else has to be on screen to take focus
    if (!target || (target !== wo && target.getClientRects().length === 0)) return;
    pending.current = null;
    if (p === 'fix') {
      // a wrong number: the phone field comes into view (never the top of the form), selected, ready to retype
      const box = target.closest('.rq-fld') ?? target;
      if (sheet || desk) {
        wo.scrollTop += box.getBoundingClientRect().top - wo.getBoundingClientRect().top - 96;
      } else {
        window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - 140, behavior: 'auto' });
      }
      target.focus({ preventScroll: true });
      try {
        (target as HTMLInputElement).select();
      } catch {
        /* nothing to select */
      }
      return;
    }
    if (p === 'sheet' || p === 'heading' || p === 'picked') {
      target.focus({ preventScroll: true });
      return;
    }
    if (p === 'tile' || p === 'box') {
      target.focus({ preventScroll: true });
      reveal(target);
      return;
    }
    // A field with an error: the WHOLE field (its label, the box and the error line) comes into view, not just the
    // caret. Chrome's own focus scroll stops at the caret line of a textarea, which left the box under the sheet's
    // top edge with its label out of sight.
    target.focus({ preventScroll: true });
    const f = (target.closest('.rq-fld') as HTMLElement | null) ?? target;
    if (desk && !sheet) {
      reveal(target);
    } else if (sheet) {
      const fr = f.getBoundingClientRect();
      const wr = wo.getBoundingClientRect();
      if (fr.top < wr.top + 16 || fr.bottom > wr.bottom - 16) wo.scrollTop += fr.top - wr.top - 16;
    } else {
      const fr = f.getBoundingClientRect();
      if (fr.top < 16 || fr.bottom > window.innerHeight - 16) {
        window.scrollTo({ top: fr.top + window.scrollY - 24, behavior: 'auto' });
      }
    }
  };
  useEffect(() => {
    applyPending();
  });
  // Ask for a focus after the next render. `kick` also tries on the next frame, for a change that does not re-render
  // at all (Enter on the job already chosen, a door on a laptop for the job already picked).
  const focusNext = (p: Pending, kick = false) => {
    pending.current = p;
    pendingAt.current = Date.now();
    if (kick) requestAnimationFrame(() => applyPending());
  };

  /* ---------------- the job ---------------- */
  function pickJob(label: string | null, byHer: boolean) {
    setJob(label);
    if (byHer) {
      setMine(true);
      touched.current = true;
    }
    setShowTiles(false);
    if (label && rest.some((t) => t.label === label)) setMoreOpen(true);
    if (label) setErrs((e) => (e.desc ? { ...e, desc: undefined } : e));
  }

  function toStep2() {
    setStep(2);
    if (sheet) toTop.current = true;
    else toCard.current = true;
    focusNext('picked');
  }

  // How the job was chosen decides whether to move on: a tap, Enter or Space advances; the arrow keys only move the
  // choice, so keyboard focus is never stranded on a step that just disappeared.
  function advance(wait: number) {
    if (desk) {
      focusNext('box', true);
      return;
    }
    window.setTimeout(toStep2, wait);
  }

  function onTileChange(label: string) {
    pickJob(label, true);
    const m = mode.current;
    mode.current = '';
    if (m === 'pointer' || m === ' ' || m === '') advance(m === 'pointer' ? 170 : 0);
    else if (desk) setShowTiles(true); // arrows on a laptop: the tiles stay while she moves through them
  }

  function onTileClick(label: string) {
    // the job she already chose fires no change event: a tap on it still takes her on
    if (label === job && (mode.current === 'pointer' || mode.current === ' ')) {
      mode.current = '';
      if (desk) setShowTiles(false);
      advance(0);
    }
  }

  function onTilesKeyDown(e: ReactKeyboardEvent<HTMLFieldSetElement>) {
    mode.current = e.key;
    const t = e.target as HTMLInputElement;
    if (t.name !== 'service') return;
    if (e.key === 'Enter' || (e.key === ' ' && t.checked)) {
      e.preventDefault();
      if (job !== t.value) pickJob(t.value, true);
      setShowTiles(false);
      mode.current = '';
      advance(0);
    }
  }

  function change() {
    setStep(1);
    setShowTiles(true);
    if (job && rest.some((t) => t.label === job)) setMoreOpen(true);
    if (sheet) toTop.current = true;
    focusNext('tile');
  }

  /* ---------------- open and close ---------------- */
  function pushOverlay() {
    try {
      window.history.pushState({ mykuOverlay: 'ask' }, '');
      pushed.current = true;
    } catch {
      pushed.current = false;
    }
  }

  function popOverlay() {
    if (!pushed.current) return;
    pushed.current = false;
    pendingBack.current = true;
    try {
      window.history.back();
    } catch {
      pendingBack.current = false;
    }
  }

  function startAnother(withJob: string | null) {
    setDone(false);
    setFixing(false);
    sentJob.current = null;
    setJob(withJob);
    setMine(Boolean(withJob));
    setTiming(null);
    setDesc('');
    setShowTiles(false);
    setMoreOpen(Boolean(withJob && rest.some((t) => t.label === withJob)));
    setErrs({});
    setSendErr('');
    setStep(stepFor(withJob));
  }

  function openAsk(o: OpenRequest = {}) {
    if (!js) return;
    opener.current = o.from ?? null;
    const want = findJob(o.service);
    // after a send, a door for a different job starts a new request (her name, number and car kept); anything else
    // shows what she sent
    const another = done && want !== null && want !== sentJob.current;
    const showSent = done && !another;
    let j = job;
    if (another) {
      startAnother(want);
      j = want;
    } else if (!done && want) {
      pickJob(want, true);
      j = want;
    }
    if (desk) {
      toRail.current = true;
      focusNext(showSent ? 'heading' : j ? 'box' : hasTiles ? 'tile' : 'box', true);
      return;
    }
    if (!showSent) setStep(stepFor(j));
    if (sheet) {
      toTop.current = true;
      focusNext('sheet', true);
      return;
    }
    // the page must not jump while the card is lifted out of it
    if (rootRef.current) rootRef.current.style.minHeight = `${rootRef.current.offsetHeight}px`;
    setSheet(true);
    pushOverlay();
    toTop.current = true;
    focusNext('sheet');
  }

  function closeAsk(fromPop = false) {
    if (!sheet) return;
    setSheet(false);
    if (!done && !showTiles) setStep(stepFor(job));
    if (!fromPop) popOverlay();
    focusNext('opener');
  }

  // the latest handlers, for the listeners registered once below
  const api = useRef({ open: openAsk, close: closeAsk, sheet, done });
  api.current = { open: openAsk, close: closeAsk, sheet, done };

  /* ---------------- sending ---------------- */
  function validate(): Errs {
    const e: Errs = {};
    const dv = desc.trim();
    const realJob = Boolean(job && job !== NOT_SURE);
    if (!realJob && dv.length < 5) {
      e.desc = dv
        ? 'A few more words, please: what is the car doing, and since when?'
        : job === NOT_SURE
          ? `Tell ${first} what’s going on, in a few words.`
          : hasTiles
            ? `Pick a job, or tell ${first} what’s going on.`
            : `Tell ${first} what the car is doing, in a few words.`;
    }
    if (whereMode === 'required' && !where.trim()) e.where = 'Add the town or ZIP where the car is.';
    const nm = name.trim();
    if (nm.length < 2) e.name = nm ? 'Add your first name, at least 2 letters.' : `Add your first name so ${first} knows who is asking.`;
    const dg = phoneDigits(phone);
    if (!phone.trim()) e.phone = 'Add your phone number.';
    else if (dg.length < 7) e.phone = 'That number looks short. Add the area code.';
    else if (dg.length > 15 || phone.trim().length > PHONE_MAX) e.phone = 'That number looks too long. Check it.';
    const em = email.trim();
    if (em && (!EMAIL_RE.test(em) || em.length < 5)) e.email = 'That email does not look right. Leave it blank if you prefer.';
    return e;
  }

  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (busy || done) return;
    setSendErr('');
    const e = validate();
    setErrs(e);
    const bad = (['desc', 'where', 'name', 'phone', 'email'] as Field[]).find((k) => e[k]);
    if (bad) {
      if (e.email) setEmailOpen(true);
      if (!desk) setStep(2);
      focusNext(bad);
      return;
    }
    setBusy(true);
    const dv = desc.trim();
    const wv = where.trim().replace(/[.\s]+$/, '');
    const description = (whereMode && wv ? `Car is in: ${wv}.${dv ? ' ' : ''}` : '') + dv;
    // AbortController, not AbortSignal.timeout: see QuoteForm. The one conversion on his page is not gated on an API
    // older phones do not have.
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 15000);
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
          customer_email: email.trim() || null,
          vehicle: car.trim() || null,
          description: description.slice(0, 1500),
          service: job && job !== NOT_SURE ? job : null,
          preferred_timing: timing,
          hp,
        }),
      });
      if (!res.ok) {
        setBusy(false);
        if (res.status === 400) setSendErr('Check your phone number and the details, then try again.');
        else if (res.status === 410) setSendErr('This page is no longer taking quote requests.');
        else if (res.status === 429) setSendErr(await refusalMessage(res, first, unclaimed));
        else if (res.status === 503) setSendErr('Myku could not be reached just now. Wait a moment and send it again.');
        else setSendErr(GENERIC_ERROR);
        return;
      }
      sent();
    } catch {
      // no answer: her signal or the 15 second timeout. Everything she typed is still in the form.
      setBusy(false);
      setSendErr(GENERIC_ERROR);
    } finally {
      window.clearTimeout(timer);
    }
  }

  function sent() {
    const rows: [string, string][] = [];
    if (job) rows.push(['Job', job]);
    const dv = desc.trim();
    if (dv) rows.push(['What you wrote', dv.length > 80 ? `${dv.slice(0, 78).replace(/\s+\S*$/, '')}…` : dv]);
    if (car.trim()) rows.push(['Your car', car.trim()]);
    if (whereMode && where.trim()) rows.push(['Where', where.trim()]);
    const when = TIMING.find((t) => t.value === timing);
    if (when) rows.push(['When', when.label]);
    rows.push(['Your number', prettyPhone(phone)]);
    if (email.trim()) rows.push(['Your email', email.trim()]);
    setRecap(rows);
    sentJob.current = job;
    setDone(true);
    setFixing(false);
    setBusy(false);
    setErrs({});
    setSendErr('');
    touched.current = false;
    writeDraft(slug, null); // the draft goes only once the request is in
    try {
      document.body.dataset.leadSent = '1';
    } catch {
      /* the old page's header ask reads this; nothing depends on it here */
    }
    if (sheet || desk) toTop.current = true;
    else toCard.current = true;
    focusNext('heading');
  }

  function fixNumber() {
    setDone(false);
    setFixing(true);
    setStep(2);
    setErrs({});
    setSendErr('');
    focusNext('fix');
  }

  function another() {
    startAnother(null);
    if (sheet || desk) toTop.current = true;
    else toCard.current = true;
    focusNext('heading');
  }

  function backToPage() {
    if (sheet) closeAsk();
    else window.scrollTo({ top: 0, behavior: smooth() });
  }

  /* ---------------- the sheet: swipe down, Tab stays inside ---------------- */
  function onDragStart(e: ReactTouchEvent) {
    if (!sheet) return;
    drag.current = { y0: e.touches[0].clientY, dy: 0 };
    woRef.current?.classList.add('dragging');
  }
  function onDragMove(e: ReactTouchEvent) {
    const d = drag.current;
    if (!d) return;
    d.dy = Math.max(0, e.touches[0].clientY - d.y0);
    if (woRef.current) woRef.current.style.transform = `translateY(${d.dy}px)`;
  }
  function onDragEnd() {
    const d = drag.current;
    drag.current = null;
    const wo = woRef.current;
    if (!d || !wo) return;
    wo.classList.remove('dragging');
    if (d.dy > 90) {
      wo.style.transform = '';
      closeAsk();
      return;
    }
    wo.classList.add('settle');
    wo.style.transform = '';
    window.setTimeout(() => wo.classList.remove('settle'), 260);
  }

  function onCardKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!sheet || e.key !== 'Tab') return;
    const wo = woRef.current;
    if (!wo) return;
    const els = Array.from(
      wo.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), textarea, summary'
      )
    ).filter((el) => el.getClientRects().length > 0);
    if (!els.length) return;
    const a = document.activeElement;
    if (e.shiftKey && (a === els[0] || a === wo)) {
      e.preventDefault();
      els[els.length - 1].focus();
    } else if (!e.shiftKey && a === els[els.length - 1]) {
      e.preventDefault();
      els[0].focus();
    }
  }

  // Enter on "Your car", "Where's the car?" or the name moves to the next field, as its key label says. Only the
  // phone (and email) field, labelled Send, sends: a half-made request never goes by accident.
  function onFormKeyDown(e: ReactKeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    const t = e.target as HTMLInputElement;
    if (t.name === 'preferred_timing') {
      e.preventDefault();
      setTiming(t.value);
      touched.current = true;
      nameRef.current?.focus();
      return;
    }
    if (t.tagName !== 'INPUT' || t.getAttribute('enterkeyhint') !== 'next') return;
    e.preventDefault();
    const order = [fid('car'), fid('where'), fid('name'), fid('phone')];
    for (let k = order.indexOf(t.id) + 1; k > 0 && k < order.length; k++) {
      const el = document.getElementById(order[k]);
      if (el && el.getClientRects().length > 0) {
        el.focus();
        return;
      }
    }
  }

  function onFormFocus(e: FocusEvent<HTMLFormElement>) {
    const t = e.target as HTMLElement;
    if (desk) requestAnimationFrame(() => reveal(t));
  }

  /* ---------------- effects ---------------- */
  // Hydrated: the draft comes back, a ?service= link preselects its job, and the steps switch on.
  useEffect(() => {
    setJs(true);
    let j: string | null = null;
    let byHer = false;
    const d = readDraft(slug);
    if (d) {
      setDesc(d.desc.slice(0, DESC_MAX));
      setCar(d.car.slice(0, CAR_MAX));
      setWhere(d.where.slice(0, WHERE_MAX));
      setName(d.name.slice(0, NAME_MAX));
      setPhone(d.phone.slice(0, PHONE_MAX));
      setEmail(d.email.slice(0, EMAIL_MAX));
      if (d.email) setEmailOpen(true);
      if (TIMING.some((t) => t.value === d.when)) setTiming(d.when);
      const dj = findJob(d.job);
      if (dj) {
        j = dj;
        byHer = true;
      }
    }
    // Deep link: /slug?service=brake-pads preselects that job, so he can answer "how much for brakes?" with a link
    // that opens already set to brakes. Selection only: no focus, no keyboard, no scroll on a cold load. Read from
    // window so the page stays static (no useSearchParams).
    let want: string | null = null;
    try {
      want = findJob(new URLSearchParams(window.location.search).get('service'));
    } catch {
      want = null;
    }
    if (want && want !== j) {
      j = want;
      byHer = false;
    }
    if (j) {
      setJob(j);
      setMine(byHer);
      if (rest.some((t) => t.label === j)) setMoreOpen(true);
    }
    setStep(stepFor(j));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // Keep what she typed, for a day, on this phone only. Only once she has touched the form: a reload must not
  // restart the clock on a number she typed yesterday.
  useEffect(() => {
    if (!js || done || !touched.current) return;
    writeDraft(slug, {
      job: mine && job ? job : '',
      desc,
      car,
      where,
      when: timing ?? '',
      name,
      phone,
      email,
    });
  }, [js, done, slug, job, mine, desc, car, where, timing, name, phone, email]);

  useEffect(() => {
    const mq = window.matchMedia(DESK);
    const sync = () => {
      setDesk(mq.matches);
      if (mq.matches && api.current.sheet) api.current.close();
    };
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else mq.addListener(sync);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync);
      else mq.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    setLayer(acquireRequestLayer());
    return () => releaseRequestLayer();
  }, []);

  // Every door on the page opens the request: [data-ask] (with data-ask-service to pick a job) and links to #quote.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const t = e.target as Element | null;
      const a = t?.closest?.('[data-ask], a[href="#quote"], a[href="#ask"], a[href="#request"]') as HTMLElement | null;
      if (!a || woRef.current?.contains(a)) return;
      e.preventDefault();
      api.current.open({ service: a.getAttribute('data-ask-service'), from: a });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && api.current.sheet) api.current.close();
    };
    // a link to #quote from somewhere this page does not intercept (a full URL with the hash)
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#quote' || h === '#ask' || h === '#request') api.current.open({});
    };
    // Back closes the sheet instead of leaving the page (Android, the iOS edge swipe, the in-app browser's arrow)
    const onPop = () => {
      if (pendingBack.current) {
        pendingBack.current = false;
        if (api.current.sheet) pushOverlay();
        return;
      }
      if (api.current.sheet) {
        pushed.current = false;
        api.current.close(true);
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    window.addEventListener('popstate', onPop);
    registerRequestOpener((o) => api.current.open(o));
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('popstate', onPop);
      registerRequestOpener(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registered once; they read api.current
  }, []);

  // While the sheet is up the page behind it holds still, and the space the card left keeps its height.
  useEffect(() => {
    if (!sheet) {
      if (rootRef.current) rootRef.current.style.minHeight = '';
      return;
    }
    const html = document.documentElement;
    const body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev[0];
      body.style.overflow = prev[1];
    };
  }, [sheet]);

  // What the dock needs to know.
  useEffect(() => {
    publishRequest({ ready: js, job: mine ? job : null, done, sheet });
  }, [js, mine, job, done, sheet]);
  useEffect(() => () => publishRequest({ ready: false, sheet: false }), []);

  // She has reached the work order once its first control (a job tile, the "For:" line or the box) is wholly on
  // screen, or she has scrolled past it. Its heading and steps have nothing to tap, so they do not count.
  useEffect(() => {
    if (!js) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (api.current.sheet) return;
      const wo = woRef.current;
      if (!wo) return;
      const c = Array.from(wo.querySelectorAll<HTMLElement>('.rq-step1 .rq-tile > span, .rq-picked, textarea, .rq-sent')).find(
        (el) => el.getClientRects().length > 0
      );
      const b = (c ?? wo).getBoundingClientRect();
      publishRequest({ reached: b.bottom <= window.innerHeight - 2 });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [js, step, done, sheet, job]);

  /* ---------------- render ---------------- */
  const realJob = Boolean(job && job !== NOT_SURE);
  const heading = done ? (unclaimed ? 'Request sent' : `Sent to ${first}`) : fixing ? 'Fix your number' : `Get a price from ${first}`;
  const nsSpan = firstSet.length % 2 === 0 ? 'p2' : 'p1'; // a phone's two across: Not sure fills the row
  const nsDesk = firstSet.length % 3 === 1 ? 'd2' : 'd3'; // a laptop's three across: never a hole
  const faceImg = (cls: string, px: number) =>
    face ? (
      <span className={cls}>
        <Image src={face} alt="" width={px * 2} height={px * 2} sizes={`${px}px`} unoptimized={!isSupabaseImage(face)} />
      </span>
    ) : null;

  const tile = (label: string, price: string | null, extra = '') => (
    <label className={`rq-tile${extra}`} key={label}>
      <input
        type="radio"
        name="service"
        value={label}
        checked={job === label}
        onChange={() => onTileChange(label)}
        onClick={() => onTileClick(label)}
      />
      <span>
        <b>{label}</b>
        {price ? <small>from {price}</small> : null}
      </span>
    </label>
  );

  const errId = (k: Field) => fid(`${k}-e`);
  const fld = (k: Field, extra = '') => `rq-fld${extra}${errs[k] ? ' bad' : ''}`;

  const form = (
    <form className="rq-form" onSubmit={submit} onKeyDown={onFormKeyDown} onFocus={onFormFocus} noValidate>
      {/* Honeypot: the name maps to nothing in any autofill vocabulary. The route answers a filled one with a fake
          success and stores nothing, so the spam never reaches him. */}
      <div className="rq-hp" aria-hidden="true">
        <label htmlFor={fid('hp')}>Leave this field empty</label>
        <input
          id={fid('hp')}
          name="contact_preference_note"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          inputMode="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>

      {hasTiles ? (
        <fieldset
          className="rq-step1"
          onPointerDown={() => {
            mode.current = 'pointer';
          }}
          onKeyDown={onTilesKeyDown}
        >
          <legend>What do you need?</legend>
          <div className="rq-tiles">
            {firstSet.map((t) => tile(t.label, money(t.priceFrom)))}
            {tile(NOT_SURE, null, ` rq-tile--ns ${nsSpan} ${nsDesk}`)}
          </div>
          {rest.length ? (
            <details className="rq-more" open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
              <summary>
                {rest.length} more service{rest.length === 1 ? '' : 's'}
                <Icon name="caret-down" />
              </summary>
              <div className="rq-tiles">{rest.map((t) => tile(t.label, money(t.priceFrom)))}</div>
            </details>
          ) : null}
        </fieldset>
      ) : null}

      <div className="rq-step2">
        {hasTiles && job ? (
          <p className="rq-picked" tabIndex={-1} ref={pickedRef}>
            <span className="rq-pk-for">For:</span> <b>{job}</b>
            <button className="rq-change" type="button" onClick={change}>
              Change
            </button>
          </p>
        ) : null}

        {note ? (
          <figure className={`rq-note${face ? '' : ' noface'}`}>
            {faceImg('rq-note-face', 34)}
            <blockquote>{note}</blockquote>
            <figcaption>A note from {first}</figcaption>
          </figure>
        ) : null}

        <div className={fld('desc')}>
          <label htmlFor={fid('desc')}>What’s the car doing?</label>
          <textarea
            ref={descRef}
            id={fid('desc')}
            className="rq-inp"
            rows={3}
            placeholder={hintFor(job)}
            maxLength={DESC_MAX}
            autoComplete="off"
            inputMode="text"
            autoCapitalize="sentences"
            enterKeyHint="enter"
            aria-invalid={Boolean(errs.desc)}
            aria-describedby={noteAsksPhoto ? `${fid('desc-h')} ${errId('desc')}` : errId('desc')}
            value={desc}
            onChange={(e) => {
              touched.current = true;
              setDesc(e.target.value);
              if (errs.desc) setErrs((x) => ({ ...x, desc: undefined }));
            }}
          />
          {noteAsksPhoto ? (
            <p className="rq-help" id={fid('desc-h')}>
              {noteAsksDash
                ? 'Photos can’t be sent from this page. Describe what the dash shows.'
                : 'Photos can’t be sent from this page. Describe what you see.'}
            </p>
          ) : null}
          <p className="rq-err" id={errId('desc')}>
            {errs.desc}
          </p>
        </div>

        <div className={`rq-pair${whereMode ? ' rq-pair-car' : ''}`}>
          <div className="rq-fld">
            <label htmlFor={fid('car')}>Your car</label>
            <input
              id={fid('car')}
              className="rq-inp"
              type="text"
              placeholder="Year, make, model"
              maxLength={CAR_MAX}
              autoComplete="off"
              inputMode="text"
              autoCapitalize="words"
              enterKeyHint="next"
              value={car}
              onChange={(e) => {
                touched.current = true;
                setCar(e.target.value);
              }}
            />
          </div>
          {whereMode ? (
            <div className={fld('where')}>
              <label htmlFor={fid('where')}>Where’s the car?</label>
              <input
                ref={whereRef}
                id={fid('where')}
                className="rq-inp"
                type="text"
                placeholder="Town or ZIP"
                maxLength={WHERE_MAX}
                autoComplete="postal-code"
                inputMode="text"
                autoCapitalize="words"
                enterKeyHint="next"
                aria-invalid={Boolean(errs.where)}
                aria-describedby={errId('where')}
                value={where}
                onChange={(e) => {
                  touched.current = true;
                  setWhere(e.target.value);
                  if (errs.where) setErrs((x) => ({ ...x, where: undefined }));
                }}
              />
              <p className="rq-err" id={errId('where')}>
                {errs.where}
              </p>
            </div>
          ) : null}
        </div>

        {/* One tap, optional, and his triage signal: "today" and "whenever" are different phone calls. A second tap
            on the chosen one clears it. */}
        <fieldset className="rq-fld rq-when">
          <legend>When</legend>
          <div className="rq-chips">
            {TIMING.map((t) => (
              <label className="rq-chip" key={t.value}>
                <input
                  type="radio"
                  name="preferred_timing"
                  value={t.value}
                  checked={timing === t.value}
                  onChange={() => {
                    touched.current = true;
                    setTiming(t.value);
                  }}
                  onClick={() => {
                    if (timing === t.value) {
                      touched.current = true;
                      setTiming(null);
                    }
                  }}
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="rq-pair">
          <div className={fld('name')}>
            <label htmlFor={fid('name')}>First name</label>
            <input
              ref={nameRef}
              id={fid('name')}
              className="rq-inp"
              type="text"
              maxLength={NAME_MAX}
              autoComplete="given-name"
              inputMode="text"
              autoCapitalize="words"
              enterKeyHint="next"
              aria-invalid={Boolean(errs.name)}
              aria-describedby={errId('name')}
              value={name}
              onChange={(e) => {
                touched.current = true;
                setName(e.target.value);
                if (errs.name) setErrs((x) => ({ ...x, name: undefined }));
              }}
            />
            <p className="rq-err" id={errId('name')}>
              {errs.name}
            </p>
          </div>
          <div className={fld('phone')}>
            <label htmlFor={fid('phone')}>Phone</label>
            <input
              ref={phoneRef}
              id={fid('phone')}
              className="rq-inp"
              type="tel"
              maxLength={PHONE_MAX}
              autoComplete="tel"
              inputMode="tel"
              enterKeyHint="send"
              aria-invalid={Boolean(errs.phone)}
              aria-describedby={fixing ? `${fid('fix')} ${errId('phone')}` : errId('phone')}
              value={phone}
              onChange={(e) => {
                touched.current = true;
                setPhone(e.target.value);
                if (errs.phone) setErrs((x) => ({ ...x, phone: undefined }));
              }}
            />
            {fixing ? (
              <p className="rq-fix-note" id={fid('fix')}>
                {unclaimed
                  ? 'Myku passes this on as a new request with the right number.'
                  : `${first} gets this as a new request with the right number.`}
              </p>
            ) : null}
            <p className="rq-err" id={errId('phone')}>
              {errs.phone}
            </p>
          </div>
        </div>

        <details
          className="rq-email"
          open={emailOpen}
          onToggle={(e) => {
            const open = e.currentTarget.open;
            setEmailOpen(open);
            // the summary disappears once open, so focus goes to the field she asked for; never on a remount
            if (open && emailByHand.current) requestAnimationFrame(() => emailRef.current?.focus());
            emailByHand.current = false;
          }}
        >
          <summary
            onClick={() => {
              emailByHand.current = true;
            }}
          >
            <Icon name="plus" />
            Add email (optional)
          </summary>
          <div className={fld('email')}>
            <label htmlFor={fid('email')}>Email</label>
            <input
              ref={emailRef}
              id={fid('email')}
              className="rq-inp"
              type="email"
              maxLength={EMAIL_MAX}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              aria-invalid={Boolean(errs.email)}
              aria-describedby={errId('email')}
              value={email}
              onChange={(e) => {
                touched.current = true;
                setEmail(e.target.value);
                if (errs.email) setErrs((x) => ({ ...x, email: undefined }));
              }}
            />
            <p className="rq-err" id={errId('email')}>
              {errs.email}
            </p>
          </div>
        </details>

        <div className="rq-send-bar" ref={sendBarRef}>
          {/* Always in the DOM, so the live region exists before it has anything to say. */}
          <p className="rq-send-err" role="alert">
            {sendErr}
          </p>
          {/* Sending needs the script: the route takes JSON only, and giving these fields names so a plain submit
              "worked" would put her phone number in the address bar. So without the script Send does nothing at all
              (it is a plain button until the page has loaded), and this line says why. */}
          <noscript>
            <p className="rq-noscript">Sending needs JavaScript. Turn it on and reload this page to send it.</p>
          </noscript>
          <button className="cta rq-send" type={js ? 'submit' : 'button'} disabled={busy}>
            <span className="cta-t">{busy ? 'Sending…' : fixing ? 'Send again' : `Send to ${first}`}</span>
            <span className="cta-ic">
              <Icon name="paper-plane-tilt" />
            </span>
          </button>
          <p className="rq-foot">Free. Nothing is paid on this page.</p>
        </div>
      </div>
    </form>
  );

  const sentBlock = (
    <div className="rq-sent" role="status">
      <p className="rq-sent-p">
        {unclaimed
          ? `Myku will pass your request and your number to ${first}.`
          : `${first} has your request and your number.`}
      </p>
      <dl className="rq-recap">
        {recap.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="rq-acts">
        <button className="rq-fix" type="button" onClick={fixNumber}>
          <Icon name="pencil-simple" />
          Wrong number? Send it again
        </button>
        <button className="rq-another" type="button" onClick={another}>
          <Icon name="plus" />
          Ask about another job
        </button>
        <button className="rq-back" type="button" onClick={backToPage}>
          Back to {first}’s page
        </button>
      </div>
    </div>
  );

  const woCls = [
    'rq-wo',
    js ? 'rq-js' : '',
    sheet ? 'is-sheet' : '',
    done ? 'done' : '',
    job ? 'has-job' : '',
    realJob ? 'has-svc' : '',
    showTiles ? 'show-tiles' : '',
    hasTiles ? '' : 'no-svc',
  ]
    .filter(Boolean)
    .join(' ');

  const card = (
    <div
      className={woCls}
      ref={woRef}
      data-step={step}
      role={sheet ? 'dialog' : undefined}
      aria-modal={sheet ? true : undefined}
      aria-labelledby={sheet ? hId : undefined}
      tabIndex={sheet ? -1 : undefined}
      onKeyDown={onCardKeyDown}
    >
      <div className="rq-bar" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
        <span className="rq-grab" aria-hidden="true" />
        <button className="rq-x" type="button" aria-label="Close" onClick={() => closeAsk()}>
          <Icon name="x" />
        </button>
      </div>
      <div className="rq-h" onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
        {faceImg('rq-face', 42)}
        <h2 id={hId} tabIndex={-1} ref={hRef}>
          {heading}
        </h2>
      </div>
      {done ? (
        sentBlock
      ) : (
        <>
          <ol className="rq-steps">
            <li>
              <span className="rq-st">
                <Icon name="pencil-simple" />
              </span>
              <span>You describe the job</span>
            </li>
            <li>
              <span className="rq-st">
                <Icon name="paper-plane-tilt" />
              </span>
              <span>{unclaimed ? `Myku passes it to ${first}` : `${first} gets it`}</span>
            </li>
            <li>
              <span className="rq-st">
                <Icon name="tag" />
              </span>
              <span>
                {unclaimed ? `Prices come from ${first}, never from Myku.` : `${first} sets the price. You decide.`}
              </span>
            </li>
          </ol>
          <div className="rq-perf" aria-hidden="true" />
          {form}
        </>
      )}
    </div>
  );

  const lifted = sheet && layer;
  return (
    <section
      ref={rootRef}
      className={`vd rq ${vdSign.variable} ${vdText.variable} ${vdVoice.variable}`}
      id="request"
      aria-labelledby={hId}
    >
      {/* where a plain link to #quote lands (the hero's button without the script) */}
      <span className="rq-anchor" id="quote" aria-hidden="true" />
      {lifted ? null : card}
      {lifted
        ? createPortal(
            <>
              <div className="rq-scrim" aria-hidden="true" onClick={() => closeAsk()} />
              {card}
            </>,
            layer
          )
        : null}
    </section>
  );
}
