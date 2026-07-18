import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admin = createAdminClient();

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (email) {
      const { data: existing, error: lookupError } = await admin
        .from('applications')
        .select('id')
        .ilike('email', email)
        .limit(1);
      if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });
      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'An application with this email has already been submitted.' },
          { status: 409 }
        );
      }
    }

    const { error } = await admin.from('applications').insert([body]);
    if (error) {
      // 23505 = Postgres unique_violation - covers the race where two submissions
      // for the same email land between the lookup above and this insert.
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'An application with this email has already been submitted.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
