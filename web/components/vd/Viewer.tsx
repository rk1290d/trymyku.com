'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

// HIS WORK, FULL SCREEN (2026-10-04, stage 2). A tap on a job photo opens it over
// the page with the vehicle, the job and his own caption, labelled "Shared by
// {first}", and one way on: "Ask about a job like this", which opens the request
// with that job picked when the job names one of his services. Back closes it
// (a history entry is pushed), so the visitor never lands back in the Facebook
// thread by accident. Without this script a tap goes to the request instead.

type Story = { photo: string; veh: string; job: string; cap: string; when: string; ask: string; first: string };

export default function Viewer() {
  const [s, setS] = useState<Story | null>(null);
  const pushed = useRef(false);
  const closeBtn = useRef<HTMLButtonElement | null>(null);

  const close = useCallback((fromPop = false) => {
    setS(null);
    if (pushed.current && !fromPop) {
      pushed.current = false;
      history.back();
    } else pushed.current = false;
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest<HTMLElement>('[data-story]');
      if (!a) return;
      e.preventDefault();
      const d = a.dataset;
      setS({
        photo: d.photo ?? '',
        veh: d.veh ?? '',
        job: d.job ?? '',
        cap: d.cap ?? '',
        when: d.when ?? '',
        ask: d.askService ?? '',
        first: d.first ?? '',
      });
      try {
        history.pushState({ vdViewer: 1 }, '');
        pushed.current = true;
      } catch {
        pushed.current = false;
      }
    }
    function onPop() {
      if (pushed.current) close(true);
    }
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
    };
  }, [close]);

  useEffect(() => {
    if (!s) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [s, close]);

  if (!s) return null;
  return (
    <div className="vw" role="dialog" aria-modal="true" aria-label={`${s.veh}${s.job ? `, ${s.job}` : ''}`}>
      <div className="vw-top">
        <span className="vw-src">
          <Icon name="camera" />
          <span>
            Shared by {s.first}
            {s.when ? <small>{s.when}</small> : null}
          </span>
        </span>
        <button className="vw-x" type="button" aria-label="Close" ref={closeBtn} onClick={() => close()}>
          <Icon name="x" />
        </button>
      </div>
      <div className="vw-ph">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.photo} alt="" />
      </div>
      <div className="vw-b">
        <h3 className="vw-veh">{s.veh}</h3>
        {s.job ? <p className="vw-job">{s.job}</p> : null}
        {s.cap ? <p className="vw-cap">{s.cap}</p> : null}
        <a
          className="cta vw-ask"
          href={s.ask ? `?service=${encodeURIComponent(s.ask)}#quote` : '#quote'}
          data-ask=""
          data-ask-service={s.ask || undefined}
          onClick={() => {
            // close first, so the request opens over the page and not over the viewer. No history.back() here:
            // the request pushes its own entry for its sheet, and a pending Back would close it again at once.
            setS(null);
            pushed.current = false;
          }}
        >
          <span className="cta-t">Ask about a job like this</span>
          <span className="cta-ic">
            <Icon name="arrow-right" />
          </span>
        </a>
      </div>
    </div>
  );
}
