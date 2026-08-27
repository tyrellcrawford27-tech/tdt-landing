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

type BookingPayload = {
  uid?: string;
  startTime?: string;
  booking?: { startTime?: string };
  responses?: { email?: { value?: string } };
  attendees?: { email?: string }[];
};

type BookingUpdate = {
  call_booked_at: string | null;
  cal_booking_uid: string | null;
  call_scheduled_at: string | null;
};

/**
 * When the call itself is scheduled for, normalised to UTC — distinct from
 * call_booked_at, which is when the applicant clicked book. The coach
 * dashboard wants the former; only the latter existed before.
 *
 * Returns null on anything unparseable so a payload shape we didn't expect
 * degrades to "booked, time unknown" rather than showing a wrong time.
 */
function scheduledStart(payload: BookingPayload | undefined): string | null {
  const raw = payload?.startTime ?? payload?.booking?.startTime;
  if (typeof raw !== 'string') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isMissingColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === 'PGRST204' ||
    err.code === '42703' ||
    /column .* does not exist|could not find the '.*' column/i.test(err.message || '')
  );
}

/**
 * call_scheduled_at is newer than the rest of this table. If the migration
 * hasn't been applied to this database yet, still record the booking with the
 * columns that do exist — a failed delivery here is invisible to the
 * applicant and silently blocks them from finishing their application.
 */
async function applyUpdate(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  update: BookingUpdate,
) {
  const { error } = await admin.from('applications').update(update).eq('id', id);
  if (!error || !isMissingColumn(error)) return error;
  const { call_scheduled_at: _unsupported, ...rest } = update;
  console.warn('[cal-webhook] call_scheduled_at column missing — recorded booking without it');
  const retry = await admin.from('applications').update(rest).eq('id', id);
  return retry.error;
}

// The one authoritative source of truth that a discovery call was actually
// booked. Booking the call is now a required part of finishing the
// application (see app/apply/page.tsx) — a closed tab, a blocked postMessage,
// or a dropped client-side redirect all look identical to "never booked"
// from the browser's point of view, so nothing client-side is trusted to
// flip an application into a booked state. Only this webhook is.
//
// Must be configured in Cal.com as a webhook scoped to the "Right fit?"
// event type specifically (not account-wide), pointing at this route, with
// its Secret set as CAL_WEBHOOK_SECRET here. Subscribe it to BOOKING_CREATED,
// BOOKING_RESCHEDULED and BOOKING_CANCELLED — without the latter two the
// coach dashboard keeps showing a call that has moved or gone away.
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

  let event: { triggerEvent?: string; payload?: BookingPayload };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const trigger = event.triggerEvent;
  const isBooking = trigger === 'BOOKING_CREATED' || trigger === 'BOOKING_RESCHEDULED';
  const isCancellation = trigger === 'BOOKING_CANCELLED';
  // Ack anything else cleanly (rather than erroring) so a webhook scoped
  // more broadly than expected doesn't get treated as a failed delivery.
  if (!isBooking && !isCancellation) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payload = event.payload;
  const email = (payload?.responses?.email?.value || payload?.attendees?.[0]?.email || '').trim();
  const uid = payload?.uid || null;
  if (!email) return NextResponse.json({ ok: true, skipped: 'no email on payload' });

  const admin = createAdminClient();
  const { data: existing, error: lookupError } = await admin
    .from('applications')
    .select('id, call_booked_at, cal_booking_uid')
    .ilike('email', escapeLike(email))
    .not('time_commitment', 'is', null) // only a completed application can be "booked"
    .limit(1);

  if (lookupError) {
    console.error('[cal-webhook] lookup failed', lookupError);
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const row = existing && existing.length > 0 ? existing[0] : null;
  if (!row) return NextResponse.json({ ok: true, skipped: 'no matching application' });

  if (isCancellation) {
    // Rescheduling in Cal.com cancels the old leg after creating the new one,
    // so a cancellation carrying a superseded uid must not wipe the booking
    // that replaced it. Only the booking actually on file can clear itself.
    if (row.cal_booking_uid && uid && row.cal_booking_uid !== uid) {
      return NextResponse.json({ ok: true, skipped: 'cancellation for a superseded booking' });
    }
    if (!row.call_booked_at) return NextResponse.json({ ok: true, skipped: 'already not booked' });

    const error = await applyUpdate(admin, row.id, {
      call_booked_at: null,
      call_scheduled_at: null,
      cal_booking_uid: null,
    });
    if (error) {
      console.error('[cal-webhook] cancellation update failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // Back to unbooked, which is the honest state: the application is
    // incomplete again until they rebook.
    return NextResponse.json({ ok: true, cleared: true });
  }

  // A redelivered BOOKING_CREATED for the booking already on file is a no-op.
  // Reschedules always apply — the scheduled time is the thing that changed.
  if (trigger === 'BOOKING_CREATED' && row.call_booked_at && row.cal_booking_uid === uid) {
    return NextResponse.json({ ok: true, skipped: 'already recorded' }); // idempotent
  }

  const error = await applyUpdate(admin, row.id, {
    // Preserve when they first booked across a reschedule.
    call_booked_at: row.call_booked_at ?? new Date().toISOString(),
    call_scheduled_at: scheduledStart(payload),
    cal_booking_uid: uid,
  });

  if (error) {
    console.error('[cal-webhook] update failed', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
