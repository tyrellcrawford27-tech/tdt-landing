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
      .select('id')
      .ilike('email', email)
      .limit(1);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ exists: !!(data && data.length > 0) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
