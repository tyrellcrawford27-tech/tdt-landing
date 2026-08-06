import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// Lightweight duplicate-email check used by the apply form at the email step,
// so an applicant who already applied is stopped right away instead of after
// filling out the whole form. The final insert in ../route.ts still enforces
// uniqueness server-side as the real guard.
export async function GET(req: NextRequest) {
  try {
    const email = (req.nextUrl.searchParams.get('email') || '').trim();
    if (!email) return NextResponse.json({ exists: false });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('applications')
      .select('id, time_commitment')
      .ilike('email', email)
      .limit(1);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    // time_commitment is the last field collected before submit. A row
    // missing it is this same applicant's own in-progress partial save (see
    // /api/apply/save-progress), not a real prior application — it must not
    // block them from continuing to fill out and submit this form.
    const exists = !!(data && data.length > 0 && data[0].time_commitment);
    return NextResponse.json({ exists });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
