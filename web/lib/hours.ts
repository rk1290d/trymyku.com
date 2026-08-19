/**
 * hours.ts — the weekly-hours model, shared by the picker and the preview line.
 *
 * Hours used to be one free-text field. Rohaan: "it's retarded that the mechanic
 * manually types in the hours instead of having something more interactive."
 *
 * Minutes from midnight rather than "8:00am" strings, because the storefront has
 * to render this in English AND Spanish (storefront slice 8). A stored English
 * string could never be translated afterwards; a number always can.
 *
 * The database enforces this exact shape (migration 100, mp_hours_json_ok), so
 * anything this file can produce is something the server will accept, and
 * anything it refuses the server refuses too.
 */

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** [openMinutes, closeMinutes], or null for closed that day. */
export type DayHours = [number, number] | null;

export type WeeklyHours = {
  mode: 'weekly';
  days: Partial<Record<DayKey, DayHours>>;
};
export type AppointmentHours = { mode: 'appointment' };
export type Hours = WeeklyHours | AppointmentHours;

export const DEFAULT_OPEN = 8 * 60;   // 08:00
export const DEFAULT_CLOSE = 18 * 60; // 18:00

/** Accepts anything (a jsonb column, a stale snapshot) and returns a valid Hours
 *  or null. Never throws: a malformed value must degrade to "not set", not crash
 *  the editor. */
export function parseHours(raw: unknown): Hours | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.mode === 'appointment') return { mode: 'appointment' };
  if (o.mode !== 'weekly' || !o.days || typeof o.days !== 'object') return null;
  const src = o.days as Record<string, unknown>;
  const days: Partial<Record<DayKey, DayHours>> = {};
  for (const k of DAY_KEYS) {
    const v = src[k];
    if (v === null || v === undefined) { days[k] = null; continue; }
    if (!Array.isArray(v) || v.length !== 2) continue;
    const [a, b] = v;
    if (typeof a !== 'number' || typeof b !== 'number') continue;
    if (a < 0 || b > 1440 || a >= b) continue;
    days[k] = [a, b];
  }
  return { mode: 'weekly', days };
}

/** True when the week says nothing at all, so the page should render no line. */
export function isEmptyHours(h: Hours | null): boolean {
  if (!h) return true;
  if (h.mode === 'appointment') return false;
  return !DAY_KEYS.some((k) => h.days[k]);
}

/** 570 -> "9:30am". `locale` only decides 24-hour vs 12-hour presentation. */
export function formatTime(min: number, use24: boolean): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  if (use24) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, '0')}${suffix}`;
}

type Labels = {
  /** Short day names, Monday first. */
  day: Record<DayKey, string>;
  /** "By appointment" */
  appointment: string;
  /** "Closed" */
  closed: string;
  /** joins a run of days, e.g. ("Mon", "Fri") -> "Mon to Fri" */
  range: (a: string, b: string) => string;
  /** joins an open and close time, e.g. ("8am","6pm") -> "8am to 6pm" */
  span: (a: string, b: string) => string;
  use24: boolean;
};

/**
 * The one-line sentence the storefront prints, e.g.
 *   "Mon to Fri 8am to 6pm, Sat 9am to 2pm"
 *
 * Consecutive days with identical hours are collapsed into a run, because seven
 * separate lines is not a sentence and the page has one row for this.
 */
export function formatHours(h: Hours | null, L: Labels): string | null {
  if (!h) return null;
  if (h.mode === 'appointment') return L.appointment;

  const runs: { from: DayKey; to: DayKey; hours: [number, number] }[] = [];
  for (const k of DAY_KEYS) {
    const v = h.days[k];
    if (!v) continue;
    const last = runs[runs.length - 1];
    const prevIndex = DAY_KEYS.indexOf(k) - 1;
    const prevKey = prevIndex >= 0 ? DAY_KEYS[prevIndex] : null;
    if (last && prevKey && last.to === prevKey && last.hours[0] === v[0] && last.hours[1] === v[1]) {
      last.to = k;
    } else {
      runs.push({ from: k, to: k, hours: [v[0], v[1]] });
    }
  }
  if (runs.length === 0) return null;

  return runs
    .map((r) => {
      const days = r.from === r.to ? L.day[r.from] : L.range(L.day[r.from], L.day[r.to]);
      const times = L.span(formatTime(r.hours[0], L.use24), formatTime(r.hours[1], L.use24));
      return `${days} ${times}`;
    })
    .join(', ');
}

/** The two presets worth one tap. Everything else he sets per day. */
export function presetWeekdays(): WeeklyHours {
  return {
    mode: 'weekly',
    days: {
      mon: [DEFAULT_OPEN, DEFAULT_CLOSE],
      tue: [DEFAULT_OPEN, DEFAULT_CLOSE],
      wed: [DEFAULT_OPEN, DEFAULT_CLOSE],
      thu: [DEFAULT_OPEN, DEFAULT_CLOSE],
      fri: [DEFAULT_OPEN, DEFAULT_CLOSE],
      sat: null,
      sun: null,
    },
  };
}

export function presetEveryDay(): WeeklyHours {
  const days: Partial<Record<DayKey, DayHours>> = {};
  for (const k of DAY_KEYS) days[k] = [DEFAULT_OPEN, DEFAULT_CLOSE];
  return { mode: 'weekly', days };
}
