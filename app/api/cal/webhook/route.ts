import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase';
import { escapeLike } from '@/lib/escapeLike';

// Cal.com signs the exact raw JSON string it POSTs with HMAC-SHA256, header
// `X-Cal-Signature-256`. Verify against the raw body bytes, not a re-parsed
// and re-stringified copy — re-serializing can change key order/whitespace
// and silently break every signature.
// https://cal.com/docs/developing/guides/automation/webhooks
function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

type BookingCreatedPayload = {
  uid?: string;
  responses?: { email?: { value?: string } };
  attendees?: { email?: string }[];
};

// The one authoritative source of truth that a discovery call was actually
// booked. Booking the call is now a required part of finishing the
// application (see app/apply/page.tsx) — a closed tab, a blocked postMessage,
// or a dropped client-side redirect all look identical to "never booked"
// from the browser's point of view, so nothing client-side is trusted to
// flip an application into a booked state. Only this webhook is.
//
// Must be configured in Cal.com as a webhook scoped to the "Right fit?"
// event type specifically (not account-wide), subscribed to BOOKING_CREATED,
// pointing at this route, with its Secret set as CAL_WEBHOOK_SECRET here.
export async function POST(req: NextRequest) {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[cal-webhook] CAL_WEBHOOK_SECRET not set — rejecting delivery');
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-cal-signature-256');
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { triggerEvent?: string; payload?: BookingCreatedPayload };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Ack anything else cleanly (rather than erroring) so a webhook scoped
  // more broadly than expected doesn't get treated as a failed delivery.
  if (event.triggerEvent !== 'BOOKING_CREATED') {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payload = event.payload;
  const email = (payload?.responses?.email?.value || payload?.attendees?.[0]?.email || '').trim();
  const uid = payload?.uid || null;
  if (!email) return NextResponse.json({ ok: true, skipped: 'no email on payload' });

  const admin = createAdminClient();
  const { data: existing, error: lookupError } = await admin
    .from('applications')
    .select('id, call_booked_at')
    .ilike('email', escapeLike(email))
    .not('time_commitment', 'is', null) // only a completed application can be "booked"
    .limit(1);

  if (lookupError) {
    console.error('[cal-webhook] lookup failed', lookupError);
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const row = existing && existing.length > 0 ? existing[0] : null;
  if (!row) return NextResponse.json({ ok: true, skipped: 'no matching application' });
  if (row.call_booked_at) return NextResponse.json({ ok: true, skipped: 'already recorded' }); // idempotent

  const { error } = await admin
    .from('applications')
    .update({ call_booked_at: new Date().toISOString(), cal_booking_uid: uid })
    .eq('id', row.id);

  if (error) {
    console.error('[cal-webhook] update failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
