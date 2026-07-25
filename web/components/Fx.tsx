'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Faithful port of the static site's interaction layer:
// header scroll state, scroll-reveal, card spotlight, phone tilt.
export default function Fx() {
  const pathname = usePathname();

  useEffect(() => {
    const hdr = document.getElementById('hdr');
    const onScroll = () => {
      if (hdr) hdr.classList.toggle('scrolled', (window.scrollY || 0) > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    const steps = document.getElementById('steps');
    const trust = document.querySelector<HTMLElement>('.trust-panel');
    let io: IntersectionObserver | null = null;
    let failsafe: ReturnType<typeof setTimeout> | null = null;

    const showAll = () => {
      reveals.forEach((r) => r.classList.add('in'));
      steps?.classList.add('in');
      trust?.classList.add('in');
    };

    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (es) => {
          es.forEach((e) => {
            if (e.isIntersecting) {
              (e.target as HTMLElement).classList.add('in');
              io?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      reveals.forEach((r) => io?.observe(r));
      if (steps) io.observe(steps);
      if (trust) io.observe(trust);
      failsafe = setTimeout(showAll, 1500);
    } else {
      showAll();
    }

    const fine = window.matchMedia?.('(pointer: fine)').matches;
    const noMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const spotCleanups: Array<() => void> = [];
    if (fine) {
      document.querySelectorAll<HTMLElement>('.spot').forEach((c) => {
        const onMove = (e: PointerEvent) => {
          const r = c.getBoundingClientRect();
          c.style.setProperty('--mx', `${e.clientX - r.left}px`);
          c.style.setProperty('--my', `${e.clientY - r.top}px`);
        };
        c.addEventListener('pointermove', onMove);
        spotCleanups.push(() => c.removeEventListener('pointermove', onMove));
      });
    }

    const phone = document.getElementById('phone');
    const hero = document.getElementById('hero');
    let tiltCleanup: (() => void) | null = null;
    if (phone && hero && fine && !noMotion) {
      const onMove = (e: PointerEvent) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        phone.style.transform = `rotateY(${x * 6}deg) rotateX(${-y * 4}deg)`;
      };
      const onLeave = () => {
        phone.style.transform = '';
      };
      hero.addEventListener('pointermove', onMove);
      hero.addEventListener('pointerleave', onLeave);
      tiltCleanup = () => {
        hero.removeEventListener('pointermove', onMove);
        hero.removeEventListener('pointerleave', onLeave);
      };
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
      if (failsafe) clearTimeout(failsafe);
      spotCleanups.forEach((fn) => fn());
      tiltCleanup?.();
    };
  }, [pathname]);

  return null;
}
