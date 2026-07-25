'use client';

import { useState } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

// "We'll build your page for you" form. Writes to the same insert-only
// mechanic_waitlist table the old site used, tagged so these signups are
// recognizable as page-build requests.
export default function ConciergeForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [spec, setSpec] = useState('');
  const [hp, setHp] = useState('');
  const [err, setErr] = useState('');
  const [bad, setBad] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBad(null);
    if (!name.trim()) {
      setBad('name');
      setErr('Please enter your first name.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setBad('email');
      setErr('Please enter a valid email address.');
      return;
    }
    if (!city.trim()) {
      setBad('city');
      setErr('Please enter your city or ZIP.');
      return;
    }
    // Honeypot: bots fill this hidden field. Pretend success, store nothing.
    if (hp) {
      setDone(true);
      return;
    }
    setBusy(true);
    try {
      let src = 'site';
      try {
        src = (new URLSearchParams(window.location.search).get('src') || 'site').slice(0, 40);
      } catch {}
      const res = await fetch(`${SUPABASE_URL}/rest/v1/mechanic_waitlist`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          first_name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          location: city.trim(),
          specialty: spec.trim() || null,
          source: `page-build:${src}`,
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
    return (
      <div className="confirm show">
        <div className="ck">
          <svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
        </div>
        <h3>On it.</h3>
        <p>
          We&apos;ll build your page from what&apos;s already out there and send you the
          link to look over. Nothing goes live until you say so.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="lbl" htmlFor="cf-name">First name</label>
      <input
        className={`inp${bad === 'name' ? ' bad' : ''}`}
        id="cf-name"
        type="text"
        autoComplete="given-name"
        placeholder="Your first name"
        maxLength={120}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="lbl" htmlFor="cf-email">Email</label>
      <input
        className={`inp${bad === 'email' ? ' bad' : ''}`}
        id="cf-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@email.com"
        maxLength={200}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <label className="lbl" htmlFor="cf-phone">
        Phone <span className="opt">(optional, for texting you the link)</span>
      </label>
      <input
        className="inp"
        id="cf-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(555) 555-5555"
        maxLength={40}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <label className="lbl" htmlFor="cf-city">City or ZIP</label>
      <input
        className={`inp${bad === 'city' ? ' bad' : ''}`}
        id="cf-city"
        type="text"
        autoComplete="off"
        placeholder="e.g. Naperville or 60540"
        maxLength={120}
        value={city}
        onChange={(e) => setCity(e.target.value)}
      />
      <label className="lbl" htmlFor="cf-spec">
        What do you work on? <span className="opt">(optional)</span>
      </label>
      <input
        className="inp"
        id="cf-spec"
        type="text"
        autoComplete="off"
        placeholder="e.g. brakes, diagnostics, engine, electrical"
        maxLength={300}
        value={spec}
        onChange={(e) => setSpec(e.target.value)}
      />
      <div className="hp" aria-hidden="true">
        <label htmlFor="cf-company">Company</label>
        <input
          id="cf-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Build My Page For Me'}
      </button>
      <div className="err" role="alert">{err}</div>
    </form>
  );
}
