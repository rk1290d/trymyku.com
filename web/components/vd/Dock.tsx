'use client';

import Image from 'next/image';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './icons';
import {
  acquireRequestLayer,
  getRequestSnapshot,
  getServerRequestSnapshot,
  releaseRequestLayer,
  subscribeRequest,
} from './requestBus';

// THE DOCK: the one sticky element on a phone (2026-10-04, the van door redesign; the mock's "dock").
//
// A bar at the bottom of the screen with his small face and the orange ask. It shows only while it is the ONLY ask
// on screen: the hero's button (#hero-ask) has scrolled away and the work order has not been reached yet. It never
// shows on a laptop (the rail is always there), while the sheet is open, or after a request went through. Once she
// has picked a job it names it ("Your request", the job) and the button shrinks to "Finish".
//
// It opens the same work order (components/vd/Request.tsx) through the page's own door: `data-ask`. Without the
// script there is no dock at all; the hero's button is a plain link to the form.

function isSupabaseImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'fioiaoxaozqfwdqukoho.supabase.co';
  } catch {
    return false;
  }
}

export default function Dock({ first, face }: { first: string; face: string | null }) {
  const s = useSyncExternalStore(subscribeRequest, getRequestSnapshot, getServerRequestSnapshot);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const [desk, setDesk] = useState(false);
  // The hero's button counts as on screen only when it is WHOLLY on screen: a button cut by the bottom edge (a short
  // in-app browser) is not one she can use, so the dock comes up over its sliver. It never covers a whole one.
  const [heroGone, setHeroGone] = useState(false);

  useEffect(() => {
    setLayer(acquireRequestLayer());
    return () => releaseRequestLayer();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setDesk(mq.matches);
    sync();
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else mq.addListener(sync);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', sync);
      else mq.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    const hero = document.getElementById('hero-ask');
    if (!hero || !('IntersectionObserver' in window)) {
      setHeroGone(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) setHeroGone(!(en.intersectionRatio > 0.98));
      },
      { threshold: [0, 1], rootMargin: '0px 0px -8px 0px' }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  if (!layer) return null;
  const show = s.ready && !desk && heroGone && !s.reached && !s.sheet && !s.done;
  const job = s.job;
  return createPortal(
    <div className={`rq-dock${show ? ' on' : ''}${job ? ' has-job' : ''}`} aria-hidden={show ? undefined : true} inert={!show}>
      <div className="rq-dock-in">
        {face && !job ? (
          <span className="rq-dock-face">
            <Image src={face} alt="" width={92} height={92} sizes="46px" unoptimized={!isSupabaseImage(face)} />
          </span>
        ) : null}
        {job ? (
          <div className="rq-dock-req">
            <small>Your request</small>
            <b>{job}</b>
          </div>
        ) : null}
        <a className="cta rq-dock-cta" href="#quote" data-ask="" tabIndex={show ? undefined : -1}>
          <span className="cta-t">{job ? 'Finish' : `Get a price from ${first}`}</span>
          <span className="cta-ic">
            <Icon name="arrow-right" />
          </span>
        </a>
      </div>
    </div>,
    layer
  );
}
