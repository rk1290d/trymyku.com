'use client';

import { useEffect, useRef } from 'react';

// The storefront's motion layer: the hero's gradient mesh, the spark field,
// the pointer bloom, the scroll reveal, the magnetic CTAs, the card pointer
// light and the sticky dock.
//
// EVERY behaviour here is an enhancement. The page renders complete and stays
// usable with this component doing nothing: the hero carries a static CSS
// gradient underneath the canvas, every hidden-then-revealed state is gated
// on `@media (scripting: enabled)` so a browser without JavaScript never
// hides anything, and the two overflow disclosures are native <details>.
//
// Under prefers-reduced-motion the mesh paints ONE frame and the function
// returns. No rAF loop is ever scheduled, no pointer handler is attached: the
// loops actually stop rather than merely losing their transitions.
export default function StorefrontFx({ prefix = 'mp' }: { prefix?: string } = {}) {
  const meshRef = useRef<HTMLCanvasElement | null>(null);
  const sparkRef = useRef<HTMLCanvasElement | null>(null);
  const bloomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    const spark = sparkRef.current;
    const bloom = bloomRef.current;
    const hero = mesh?.closest<HTMLElement>(`.${prefix}-hero`) ?? null;
    if (!hero) return;

    const mm = window.matchMedia;
    const RM = mm ? mm('(prefers-reduced-motion: reduce)').matches : false;
    const FINE = mm ? mm('(hover:hover) and (pointer:fine)').matches : false;

    const cleanups: (() => void)[] = [];

    /* ---------------- 1. LIVING INK: low-res gradient mesh ---------------- */
    const mx = mesh?.getContext ? mesh.getContext('2d') : null;
    const MW = 110;
    const MH = 150;
    if (mesh && mx) {
      mesh.width = MW;
      mesh.height = MH;
    }

    const blobs = [
      { r: 0.95, c: 'rgba(16,52,102,0.95)', fx: 0.00021, fy: 0.00016, ax: 0.3, ay: 0.22, ox: 0.3, oy: 0.34, p: 0 },
      { r: 0.8, c: 'rgba(249,115,22,0.55)', fx: 0.00016, fy: 0.00025, ax: 0.34, ay: 0.2, ox: 0.76, oy: 0.24, p: 1.7 },
      { r: 1.05, c: 'rgba(96,116,146,0.42)', fx: 0.00013, fy: 0.00011, ax: 0.28, ay: 0.26, ox: 0.48, oy: 0.7, p: 3.1 },
      { r: 0.62, c: 'rgba(255,214,170,0.30)', fx: 0.00029, fy: 0.00019, ax: 0.26, ay: 0.18, ox: 0.2, oy: 0.78, p: 4.6 },
    ];
    let pX = 0.5;
    let pY = 0.3;
    let tX = 0.5;
    let tY = 0.3;

    function drawMesh(t: number) {
      if (!mx) return;
      mx.globalCompositeOperation = 'source-over';
      mx.globalAlpha = 1;
      const bg = mx.createLinearGradient(0, 0, 0, MH);
      bg.addColorStop(0, '#0B1017');
      bg.addColorStop(0.55, '#08090B');
      bg.addColorStop(1, '#08090B');
      mx.fillStyle = bg;
      mx.fillRect(0, 0, MW, MH);
      mx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const cx = (b.ox + Math.sin(t * b.fx + b.p) * b.ax + (pX - 0.5) * 0.11 * (i + 1) / 2) * MW;
        const cy = (b.oy + Math.cos(t * b.fy + b.p * 1.3) * b.ay + (pY - 0.5) * 0.09 * (i + 1) / 2) * MH;
        const rr = b.r * MW * (0.82 + 0.18 * Math.sin(t * 0.00033 + b.p));
        const g = mx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        g.addColorStop(0, b.c);
        g.addColorStop(0.45, b.c.replace(/[\d.]+\)$/, '0.14)'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        mx.fillStyle = g;
        mx.fillRect(0, 0, MW, MH);
      }
      mx.globalCompositeOperation = 'source-over';
    }

    /* ---------------- 2. SPARKS + specular sweep ---------------- */
    const sx = spark?.getContext ? spark.getContext('2d') : null;
    type P = { x: number; y: number; r: number; s: number; a: number; w: number; ph: number; o: boolean };
    let particles: P[] = [];
    let SW = 0;
    let SH = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function sizeSpark() {
      if (!spark || !sx) return;
      const r = hero!.getBoundingClientRect();
      SW = Math.max(1, Math.round(r.width));
      SH = Math.max(1, Math.round(r.height));
      spark.width = Math.round(SW * DPR);
      spark.height = Math.round(SH * DPR);
      sx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = SW < 620 ? 26 : 44;
      particles = [];
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * SW,
          y: Math.random() * SH,
          r: Math.random() * 1.5 + 0.35,
          s: Math.random() * 0.16 + 0.035,
          a: Math.random() * 0.5 + 0.12,
          w: Math.random() * 0.0014 + 0.0004,
          ph: Math.random() * 6.28,
          o: Math.random() < 0.32,
        });
      }
    }

    function drawSpark(t: number) {
      if (!sx) return;
      sx.clearRect(0, 0, SW, SH);
      const sweep = ((t * 0.00006) % 1.6) - 0.3;
      const gx = sweep * SW * 1.4;
      const lg = sx.createLinearGradient(gx - SW * 0.42, 0, gx + SW * 0.42, SH);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(0.5, 'rgba(255,236,214,0.055)');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      sx.globalCompositeOperation = 'lighter';
      sx.fillStyle = lg;
      sx.fillRect(0, 0, SW, SH);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.s;
        p.ph += p.w * 16;
        if (p.y < -6) {
          p.y = SH + 6;
          p.x = Math.random() * SW;
        }
        const xx = p.x + Math.sin(p.ph) * 11;
        const fade = 0.35 + 0.65 * Math.abs(Math.sin(p.ph * 0.5));
        sx.beginPath();
        sx.arc(xx, p.y, p.r, 0, 6.2832);
        sx.fillStyle = p.o
          ? `rgba(255,168,84,${p.a * fade})`
          : `rgba(214,226,240,${p.a * fade * 0.8})`;
        sx.fill();
      }
      sx.globalCompositeOperation = 'source-over';
    }

    if (RM) {
      // One static frame. Nothing is scheduled, nothing is listened to.
      drawMesh(6400);
    } else {
      sizeSpark();
      let rz: ReturnType<typeof setTimeout> | undefined;
      const onResize = () => {
        clearTimeout(rz);
        rz = setTimeout(sizeSpark, 180);
      };
      window.addEventListener('resize', onResize, { passive: true });
      cleanups.push(() => {
        clearTimeout(rz);
        window.removeEventListener('resize', onResize);
      });

      let bx = 0;
      let by = 0;
      let btx = 0;
      let bty = 0;
      let bloomOn = false;
      if (FINE && bloom) {
        const onMove = (e: PointerEvent) => {
          const r = hero.getBoundingClientRect();
          tX = (e.clientX - r.left) / r.width;
          tY = (e.clientY - r.top) / r.height;
          btx = e.clientX - r.left;
          bty = e.clientY - r.top;
          if (!bloomOn) {
            bloomOn = true;
            bloom.style.opacity = '.85';
          }
        };
        const onLeave = () => {
          bloomOn = false;
          bloom.style.opacity = '0';
          tX = 0.5;
          tY = 0.3;
        };
        hero.addEventListener('pointermove', onMove, { passive: true });
        hero.addEventListener('pointerleave', onLeave, { passive: true });
        cleanups.push(() => {
          hero.removeEventListener('pointermove', onMove);
          hero.removeEventListener('pointerleave', onLeave);
        });
      }

      let running = true;
      let raf = 0;
      let last = 0;
      const loop = (now: number) => {
        if (!running) return;
        pX += (tX - pX) * 0.055;
        pY += (tY - pY) * 0.055;
        bx += (btx - bx) * 0.12;
        by += (bty - by) * 0.12;
        if (bloom) bloom.style.transform = `translate3d(${bx}px,${by}px,0)`;
        if (now - last > 24) {
          drawMesh(now);
          last = now;
        }
        drawSpark(now);
        raf = requestAnimationFrame(loop);
      };
      // Off-screen hero: the loop stops entirely rather than burning battery
      // behind three screens of content.
      let io: IntersectionObserver | null = null;
      if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(
          (en) => {
            running = en[0].isIntersecting;
            if (running) raf = requestAnimationFrame(loop);
            else cancelAnimationFrame(raf);
          },
          { threshold: 0.01 }
        );
        io.observe(hero);
      }
      raf = requestAnimationFrame(loop);
      cleanups.push(() => {
        running = false;
        cancelAnimationFrame(raf);
        io?.disconnect();
      });
    }

    /* ---------------- 3. REVEAL ---------------- */
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(`.${prefix}-rv, .${prefix}-card, .${prefix}-fact, .${prefix}-area`)
    );
    if ('IntersectionObserver' in window && !RM) {
      const ro = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add('in');
              ro.unobserve(en.target);
            }
          });
        },
        { threshold: 0.01, rootMargin: '0px 0px -4% 0px' }
      );
      targets.forEach((t) => ro.observe(t));
      // Safety net: nothing may stay invisible, but a blanket timer would fire
      // the whole choreography while the visitor is still in the hero. So the
      // fallback is position-aware and rides scroll rather than the clock.
      let sweeping = false;
      const doSweep = () => {
        sweeping = false;
        const vh = window.innerHeight || 800;
        let live = 0;
        for (const t of targets) {
          if (t.classList.contains('in')) continue;
          live++;
          if (t.getBoundingClientRect().top < vh * 0.96) {
            t.classList.add('in');
            ro.unobserve(t);
          }
        }
        if (!live) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        }
      };
      const onScroll = () => {
        if (!sweeping) {
          sweeping = true;
          requestAnimationFrame(doSweep);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      const t0 = setTimeout(doSweep, 900);
      cleanups.push(() => {
        clearTimeout(t0);
        ro.disconnect();
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    } else {
      targets.forEach((t) => t.classList.add('in'));
    }

    /* ---------------- 4. MAGNETIC CTAs ---------------- */
    const mags = Array.from(document.querySelectorAll<HTMLElement>(`.${prefix}-mag`));
    if (FINE && !RM && mags.length) {
      const state = mags.map(() => ({ x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 }));
      let magRAF: number | null = null;
      const magLoop = () => {
        let moving = false;
        for (let i = 0; i < mags.length; i++) {
          const s = state[i];
          s.vx = (s.vx + (s.tx - s.x) * 0.16) * 0.76;
          s.vy = (s.vy + (s.ty - s.y) * 0.16) * 0.76;
          s.x += s.vx;
          s.y += s.vy;
          if (Math.abs(s.vx) > 0.01 || Math.abs(s.vy) > 0.01 || Math.abs(s.tx - s.x) > 0.01) moving = true;
          mags[i].style.setProperty('--bx', `${s.x.toFixed(2)}px`);
          mags[i].style.setProperty('--by', `${s.y.toFixed(2)}px`);
          const inner = mags[i].querySelector<HTMLElement>('.lbl');
          if (inner) inner.style.transform = `translate3d(${(s.x * 0.34).toFixed(2)}px,${(s.y * 0.34).toFixed(2)}px,0)`;
        }
        magRAF = moving ? requestAnimationFrame(magLoop) : null;
      };
      const onPtr = (e: PointerEvent) => {
        for (let i = 0; i < mags.length; i++) {
          const r = mags[i].getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          const R = Math.max(r.width, r.height) * 0.9 + 46;
          const d = Math.sqrt(dx * dx + dy * dy);
          const s = state[i];
          if (d < R) {
            const f = 1 - d / R;
            s.tx = dx * 0.3 * f;
            s.ty = dy * 0.42 * f;
          } else {
            s.tx = 0;
            s.ty = 0;
          }
        }
        if (!magRAF) magRAF = requestAnimationFrame(magLoop);
      };
      document.addEventListener('pointermove', onPtr, { passive: true });
      cleanups.push(() => {
        document.removeEventListener('pointermove', onPtr);
        if (magRAF) cancelAnimationFrame(magRAF);
      });
    }

    /* ---------------- 5. PRESS SPRING (touch included) ---------------- */
    if (!RM) {
      const pressables = Array.from(
        document.querySelectorAll<HTMLElement>(`.${prefix}-btn, .${prefix}-chip`)
      );
      const down = (e: Event) => {
        const t = e.currentTarget as HTMLElement;
        t.classList.remove('pressed');
        t.style.setProperty('transform', 'translate3d(var(--bx,0px),var(--by,0px),0) scale(.955)');
      };
      const up = (e: Event) => {
        const t = e.currentTarget as HTMLElement;
        t.classList.add('pressed');
        t.style.removeProperty('transform');
      };
      pressables.forEach((el) => {
        el.addEventListener('pointerdown', down, { passive: true });
        el.addEventListener('pointerup', up, { passive: true });
        el.addEventListener('pointercancel', up, { passive: true });
        el.addEventListener('pointerleave', up, { passive: true });
      });
      cleanups.push(() => {
        pressables.forEach((el) => {
          el.removeEventListener('pointerdown', down);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
          el.removeEventListener('pointerleave', up);
        });
      });
    }

    /* ---------------- 6. CARD POINTER LIGHT ---------------- */
    if (FINE && !RM) {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(`.${prefix}-card`));
      const handlers: [HTMLElement, (e: PointerEvent) => void][] = cards.map((card) => {
        const h = (e: PointerEvent) => {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
          card.style.setProperty('--my', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
        };
        card.addEventListener('pointermove', h, { passive: true });
        return [card, h];
      });
      cleanups.push(() => handlers.forEach(([c, h]) => c.removeEventListener('pointermove', h)));
    }

    /* ---------------- 7. STICKY DOCK ----------------
       The dock hides whenever the hero or the composer is on screen, so the
       page never shows two competing asks at once. On a short page that means
       it effectively never appears, which is the point. */
    const dock = document.getElementById(`${prefix}-dock`);
    const askEl = document.getElementById('ask');
    if (dock && askEl && 'IntersectionObserver' in window) {
      const seen = { hero: true, ask: false };
      const sync = () => dock.classList.toggle('up', !seen.hero && !seen.ask);
      const d1 = new IntersectionObserver((en) => {
        seen.hero = en[0].isIntersecting;
        sync();
      }, { threshold: 0.05 });
      const d2 = new IntersectionObserver((en) => {
        seen.ask = en[0].isIntersecting;
        sync();
      }, { threshold: 0.04 });
      d1.observe(hero);
      d2.observe(askEl);
      cleanups.push(() => {
        d1.disconnect();
        d2.disconnect();
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [prefix]);

  return (
    <>
      <canvas className={`${prefix}-mesh`} ref={meshRef} aria-hidden="true" />
      <canvas className={`${prefix}-spark`} ref={sparkRef} aria-hidden="true" />
      <div className={`${prefix}-veil`} aria-hidden="true" />
      <div className={`${prefix}-streak`} aria-hidden="true" />
      <div className={`${prefix}-bloom`} ref={bloomRef} aria-hidden="true" />
    </>
  );
}
