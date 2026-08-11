import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('applications')
      .select('*')
      // Booking the call is now a required part of finishing the
      // application, not a follow-up — a row without a confirmed booking is
      // either an in-progress draft or a completed form still awaiting the
      // call, neither of which is a real submission for the coach to review
      // yet. call_booked_at is only ever set by the Cal.com webhook (see
      // app/api/cal/webhook/route.ts), never by the client.
      .not('call_booked_at', 'is', null)
      .order('submitted_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    const admin = createAdminClient();
    const { error } = await admin.from('applications').update({ status }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
