import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { sendBookingEmails } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = createAdminClient();

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (email) {
      const { data: existing, error: lookupError } = await admin
        .from('applications')
        .select('id, time_commitment')
        .ilike('email', email)
        .limit(1);
      if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });

      const existingRow = existing && existing.length > 0 ? existing[0] : null;
      // time_commitment is the last field collected before submit, so an
      // existing row missing it is this same applicant's own partial save
      // from earlier in the form (see /api/apply/save-progress) — finish it
      // in place instead of treating it as a duplicate application.
      if (existingRow && existingRow.time_commitment) {
        return NextResponse.json(
          { error: 'An application with this email has already been submitted.' },
          { status: 409 }
        );
      }

      const { error } = existingRow
        ? await admin.from('applications').update(body).eq('id', existingRow.id)
        : await admin.from('applications').insert([body]);

      if (error) {
        // 23505 = Postgres unique_violation - covers the race where two submissions
        // for the same email land between the lookup above and this write.
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'An application with this email has already been submitted.' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      const { error } = await admin.from('applications').insert([body]);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const isMinor = typeof body.age !== 'number' || body.age < 18;
    await sendBookingEmails({
      athleteName: body.athlete_name || body.first_name || '',
      athleteEmail: email,
      isMinor,
      guardianName: body.guardian_name || null,
      guardianEmail: body.guardian_email || null,
    }).catch(e => console.error('[apply] booking email failed', e));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
