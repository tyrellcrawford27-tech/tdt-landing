import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { escapeLike } from '@/lib/escapeLike';

// Read-only status check the apply flow uses to find out, server-side,
// whether an applicant who already submitted has a confirmed booking yet.
// The write side of this lives only in app/api/cal/webhook/route.ts — this
// route never sets call_booked_at itself, so a client polling or resuming
// through here can't accidentally self-report a booking that didn't happen.
export async function GET(req: NextRequest) {
  try {
    const email = (req.nextUrl.searchParams.get('email') || '').trim();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('applications')
      .select('time_commitment, call_booked_at, application_state, deleted_at')
      .ilike('email', escapeLike(email))
      .limit(10);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // A person can have an older draft and a submitted application with the
    // same email. Never let whichever row PostgREST returns first mask the
    // submitted/booking state that actually matters here.
    const submitted = data?.filter(row => !row.deleted_at && (
      row.application_state === 'submitted' || (row.application_state == null && !!row.time_commitment)
    )) ?? [];
    return NextResponse.json({
      submitted: submitted.length > 0,
      booked: submitted.some(row => !!row.call_booked_at),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
