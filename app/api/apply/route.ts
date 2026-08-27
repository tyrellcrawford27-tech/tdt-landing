import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { escapeLike } from '@/lib/escapeLike';
import { sendBookingEmails } from '@/lib/email';
import { getEarlyPricingSpots } from '@/lib/earlyPricing';

// This route is public and unauthenticated, and it used to spread the raw
// request body straight into the insert — so a caller could set ANY column,
// including status, call_booked_at, reviewer_notes and submitted_at. Setting
// submitted_at to a future date pinned a forged row to the top of the coach's
// queue; setting call_booked_at forged a confirmed booking.
//
// Everything written now has to be named here. This is deliberately a positive
// allowlist rather than a denylist of known-dangerous columns: new columns
// should default to not-client-writable, not the reverse.
const WRITABLE_FIELDS = [
  'athlete_name', 'athlete_email', 'athlete_phone',
  'first_name', 'last_name', 'email', 'phone',
  'device_access', 'age', 'city',
  'position', 'years_playing',
  'current_team', 'current_team_school',
  'biggest_weakness', 'goal', 'social_link', 'time_commitment',
  'parent_name', 'guardian_name',
  'parent_phone', 'guardian_phone',
  'parent_email', 'guardian_email',
  'parent_aware', 'guardian_aware',
  'heard_about',
] as const;

function pickWritable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of WRITABLE_FIELDS) {
    if (k in body) out[k] = body[k];
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = createAdminClient();

    // The client sets early_pricing from a URL param (/apply?early_pricing=true),
    // which anyone can type or share after the promo is gone. Re-decide it here:
    // a discount is only granted if a spot is genuinely still open at write time.
    // (Narrow race: two submissions landing together can both pass this check.
    // With three spots that's acceptable — the dashboard shows the truth and the
    // count self-corrects — but a hard cap would need a DB-level constraint.)
    if (body.early_pricing) {
      try {
        const { remaining } = await getEarlyPricingSpots();
        body.early_pricing = remaining > 0 ? true : null;
      } catch (e) {
        // Can't confirm availability → don't hand out a discount we can't back.
        console.error('[apply] early-pricing check failed', e);
        body.early_pricing = null;
      }
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';

    // Server-owned columns. The client never gets to set these, and
    // early_pricing is whatever the re-check above decided, not what was sent.
    const record = {
      ...pickWritable(body),
      email,
      early_pricing: body.early_pricing || null,
      submitted_at: new Date().toISOString(),
      status: 'pending',
    };

    if (email) {
      const { data: existing, error: lookupError } = await admin
        .from('applications')
        .select('id, time_commitment')
        .ilike('email', escapeLike(email))
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
        ? await admin.from('applications').update(record).eq('id', existingRow.id)
        : await admin.from('applications').insert([record]);

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
      const { error } = await admin.from('applications').insert([record]);
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
