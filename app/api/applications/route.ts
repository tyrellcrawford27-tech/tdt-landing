import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { isAuthorized } from '@/lib/dashboardAuth';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function GET(req: Request) {
  // This endpoint returns applicant and parent contact details for a mostly
  // under-18 population. It must never answer an unauthenticated caller.
  if (!isAuthorized(req)) return unauthorized();
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('applications')
      .select('*')
      // A real submission is one that reached the end of the form —
      // time_commitment is the sentinel the rest of the codebase already uses
      // to tell a finished application apart from a save-progress draft.
      //
      // This used to filter on call_booked_at instead, on the theory that an
      // application isn't finished until the call is booked. That hid every
      // real application, because call_booked_at is only ever written by the
      // Cal.com webhook and that webhook has never been configured. Whether or
      // not the booking exists, the coach needs to see who applied — the
      // unbooked ones are exactly the people worth chasing — so booking status
      // is surfaced as a flag on each row instead of as a gate on all of them.
      .not('time_commitment', 'is', null)
      .order('submitted_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const ALLOWED_STATUSES = new Set(['pending', 'accepted', 'rejected']);

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) return unauthorized();
  try {
    const { id, status } = await req.json();
    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'A valid id is required' }, { status: 400 });
    }
    // Only ever the review status, and only ever one of the three real values —
    // this handler must not become a general-purpose row editor.
    if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const admin = createAdminClient();
    const { error } = await admin.from('applications').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
