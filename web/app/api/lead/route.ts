import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

// Accepts a quote request from a public profile page and stores it in
// profile_leads. Inserts run under the anon key: row-level security only
// allows inserts for web-visible mechanics, and nothing can be read back.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Legacy anon JWT (public by design): the notify-lead edge function sits
// behind verify_jwt, which the modern publishable key can't satisfy.
const SUPABASE_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpb2lhb3hhb3pxZndkcXVrb2hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDk1OTksImV4cCI6MjA5NDk4NTU5OX0.CiVafVFbEaW5s8ejGtvDtg8c6guMeYKHaLL6eiDjwq8';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const mechanicId = typeof body.mechanic_id === 'string' ? body.mechanic_id : '';
  const slug = typeof body.slug === 'string' ? body.slug.slice(0, 60) : null;
  const name =
    typeof body.customer_name === 'string' && body.customer_name.trim()
      ? body.customer_name.trim().slice(0, 80)
      : null;
  const phone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : '';
  const vehicle =
    typeof body.vehicle === 'string' && body.vehicle.trim()
      ? body.vehicle.trim().slice(0, 80)
      : null;
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 1500) : '';

  const digits = phone.replace(/[^\d]/g, '');
  if (
    !UUID_RE.test(mechanicId) ||
    digits.length < 7 ||
    digits.length > 15 ||
    phone.length < 7 ||
    phone.length > 20 ||
    description.length < 5
  ) {
    return NextResponse.json({ error: 'invalid fields' }, { status: 400 });
  }

  // Generate the id here: anon can insert but never read rows back, and the
  // push notifier needs the id to target this exact lead.
  const leadId = crypto.randomUUID();

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profile_leads`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      id: leadId,
      mechanic_id: mechanicId,
      slug,
      customer_name: name,
      customer_phone: phone,
      vehicle,
      description,
      source: 'web',
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'could not save' }, { status: 502 });
  }

  // Buzz the mechanic's phone. Fire-and-forget: the lead is already saved,
  // so a push hiccup must never fail the customer's submission.
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-lead`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_JWT,
        Authorization: `Bearer ${SUPABASE_ANON_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead_id: leadId }),
    });
  } catch {}

  return NextResponse.json({ ok: true }, { status: 201 });
}
