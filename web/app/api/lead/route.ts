import { NextRequest, NextResponse } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';

// Accepts a quote request from a public profile page and stores it in
// profile_leads. Inserts run under the anon key: row-level security only
// allows inserts for web-visible mechanics, and nothing can be read back.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profile_leads`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
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
  return NextResponse.json({ ok: true }, { status: 201 });
}
