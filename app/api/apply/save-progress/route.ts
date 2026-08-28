import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { escapeLike } from '@/lib/escapeLike';

// Fired once an applicant has given contact info but before they finish the
// form, so someone who abandons partway through is still a reachable lead
// instead of a total loss. Writes (or updates) a partial row — /api/apply
// finishes it in place on real submission.
//
// The live table's `status` column has a check constraint that only allows
// real application statuses (pending/accepted/rejected), so a partial row
// can't be tagged with its own 'draft' status. Instead it's identified by
// missing time_commitment, the last field the form collects before submit —
// that's also what excludes it from the duplicate-application check and the
// coach dashboard's feed in the member app.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const admin = createAdminClient();
    const { data: existing, error: lookupError } = await admin
      .from('applications')
      .select('id, time_commitment')
      .ilike('email', escapeLike(email))
      .limit(1);
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });

    const existingRow = existing && existing.length > 0 ? existing[0] : null;
    // Never clobber a real (already-submitted) application with partial data.
    if (existingRow && existingRow.time_commitment) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const draftPayload = { ...body, status: 'pending' };
    const { error } = existingRow
      ? await admin.from('applications').update(draftPayload).eq('id', existingRow.id)
      : await admin.from('applications').insert([draftPayload]);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
