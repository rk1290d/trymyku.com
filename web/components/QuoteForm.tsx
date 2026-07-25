'use client';

import { useState } from 'react';

// The lead-capture form on every public profile page. Works the same on
// claimed and unclaimed pages: the request is stored either way, and on
// unclaimed pages it becomes the reason the mechanic signs up.
export default function QuoteForm({
  mechanicId,
  slug,
  mechanicFirstName,
}: {
  mechanicId: string;
  slug: string;
  mechanicFirstName: string;
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBad(null);
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setBad('phone');
      setErr('Please enter a valid phone number.');
      return;
    }
    if (desc.trim().length < 5) {
      setBad('desc');
      setErr('Please describe what you need, even a sentence helps.');
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
    return (
      <div className="confirm show">
        <div className="ck">
          <svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>
        </div>
        <h3>Request sent.</h3>
        <p>
          {mechanicFirstName} will get back to you at the number you left. No account
          needed, no app to download.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="lbl" htmlFor="qf-vehicle">
        Your vehicle <span className="opt">(optional)</span>
      </label>
      <input
        className="inp"
        id="qf-vehicle"
        type="text"
        autoComplete="off"
        placeholder="e.g. 2015 Honda Civic"
        maxLength={80}
        value={vehicle}
        onChange={(e) => setVehicle(e.target.value)}
      />
      <label className="lbl" htmlFor="qf-desc">What do you need?</label>
      <textarea
        className={`inp${bad === 'desc' ? ' bad' : ''}`}
        id="qf-desc"
        placeholder="Describe the problem or the work you want done. Not sure? Just describe the symptom."
        maxLength={1500}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <label className="lbl" htmlFor="qf-name">
        Your name <span className="opt">(optional)</span>
      </label>
      <input
        className="inp"
        id="qf-name"
        type="text"
        autoComplete="name"
        placeholder="Your name"
        maxLength={80}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="lbl" htmlFor="qf-phone">Phone number</label>
      <input
        className={`inp${bad === 'phone' ? ' bad' : ''}`}
        id="qf-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(555) 555-5555"
        maxLength={20}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <div className="hp" aria-hidden="true">
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
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Request a Quote'}
      </button>
      <div className="err" role="alert">{err}</div>
    </form>
  );
}
