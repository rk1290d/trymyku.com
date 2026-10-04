'use client';

import { vdSign, vdText, vdVoice } from './fonts';

// THE WIRE BETWEEN THE WORK ORDER AND THE DOCK (2026-10-04, the van door redesign).
//
// components/vd/Request.tsx owns the request: the job she picked, whether it went through, whether the phone sheet is
// open, and whether she has scrolled down to the work order. components/vd/Dock.tsx only reads that, to decide when the
// bar at the bottom of a phone shows and what it says. Neither imports the other; both import this.
//
// Anything else on the page opens the request with markup, not code: an element with `data-ask` (and optionally
// `data-ask-service="<one of his service labels>"`) or a link to #quote. openRequest() below is the same thing for code.

export interface RequestSnapshot {
  /** A Request is mounted and hydrated. Without it the dock never shows (no script, no dock). */
  ready: boolean;
  /** The job SHE chose (a tile, a door, her own saved draft). A job preselected by a ?service= link is not hers yet. */
  job: string | null;
  /** A request went through on this visit. */
  done: boolean;
  /** The phone sheet is open. */
  sheet: boolean;
  /** The work order's first control is on screen or above it: she has reached the request, so the dock steps aside. */
  reached: boolean;
}

const INITIAL: RequestSnapshot = { ready: false, job: null, done: false, sheet: false, reached: false };
let snap: RequestSnapshot = INITIAL;
const subs = new Set<() => void>();

export function getRequestSnapshot(): RequestSnapshot {
  return snap;
}

/** The server render (and the first client render) never shows the dock. */
export function getServerRequestSnapshot(): RequestSnapshot {
  return INITIAL;
}

export function subscribeRequest(fn: () => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function publishRequest(patch: Partial<RequestSnapshot>): void {
  const next = { ...snap, ...patch };
  if (
    next.ready === snap.ready &&
    next.job === snap.job &&
    next.done === snap.done &&
    next.sheet === snap.sheet &&
    next.reached === snap.reached
  ) {
    return;
  }
  snap = next;
  subs.forEach((fn) => fn());
}

export interface OpenRequest {
  /** One of his service labels: opens with that job picked. */
  service?: string | null;
  /** The element that opened it; focus goes back to it when the sheet closes. */
  from?: HTMLElement | null;
}

let opener: ((o: OpenRequest) => void) | null = null;

export function registerRequestOpener(fn: ((o: OpenRequest) => void) | null): void {
  opener = fn;
}

/** Opens the work order: the sheet on a phone, the rail on a laptop. A no-op until a Request has mounted. */
export function openRequest(o: OpenRequest = {}): void {
  opener?.(o);
}

// THE LAYER. The sheet and the dock are fixed to the screen, and `position: fixed` is only fixed to the SCREEN when no
// ancestor makes a stacking context or a containing block of its own: a transform, a filter, or simply `.vd` itself,
// which is `position: relative; z-index: 2` (vandoor.css), as are main and header (globals.css). Inside any of those, a
// later section of the page paints over the sheet, or a transformed card drags it along. So both render into one
// layer at the end of <body>, which carries `.vd` and the three faces so every token and rule still applies. It is
// created on first use and removed when the last user unmounts, so a client-side hop to another page leaves nothing.
let layer: HTMLDivElement | null = null;
let users = 0;

export function acquireRequestLayer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  users += 1;
  if (!layer || !document.body.contains(layer)) {
    layer = document.createElement('div');
    layer.className = `vd rq-layer ${vdSign.variable} ${vdText.variable} ${vdVoice.variable}`;
    document.body.appendChild(layer);
  }
  return layer;
}

export function releaseRequestLayer(): void {
  users = Math.max(0, users - 1);
  if (users === 0 && layer) {
    layer.remove();
    layer = null;
  }
}
