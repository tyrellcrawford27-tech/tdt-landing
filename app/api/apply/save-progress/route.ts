import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import {
  APPLICATION_FORM_VERSION,
  APPLICATION_QUESTION_COUNT,
  APPLICATION_QUESTIONS,
  applicationQuestion,
} from '@/lib/applicationProgress';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function safeValue(field: string, value: unknown): string | number | null | undefined {
  if (value === null) return null;
  if (field === 'age' || field === 'years_playing') {
    if (value === '' || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  if (typeof value !== 'string') return undefined;
  return value.slice(0, 4_000);
}

/**
 * Persists the currently visible question while the applicant is answering it.
 *
 * The random draft_key is the only row selector accepted here. We never update
 * by email: email is editable, not an authorization token, and using it would
 * let one public visitor overwrite another applicant. Every answer field is
 * allowlisted by its server-owned question definition, so status, review data,
 * booking state, pricing, and timestamps cannot be forged by this public route.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const draftKey = typeof body.draft_key === 'string' ? body.draft_key : '';
    const question = applicationQuestion(body.question_key);
    const answers = body.answers && typeof body.answers === 'object'
      ? body.answers as Record<string, unknown>
      : null;
    const identity = body.identity && typeof body.identity === 'object'
      ? body.identity as Record<string, unknown>
      : {};

    if (!UUID.test(draftKey)) {
      return NextResponse.json({ error: 'Invalid draft key' }, { status: 400 });
    }
    if (!question || !answers) {
      return NextResponse.json({ error: 'Invalid application question' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      draft_key: draftKey,
      status: 'pending',
      application_state: 'draft',
      form_version: APPLICATION_FORM_VERSION,
      total_questions: APPLICATION_QUESTION_COUNT,
      current_question_key: question.key,
      current_question_label: question.label,
      current_question_number: question.number,
      progress_updated_at: now,
    };

    // Carried on every snapshot so a pre-existing browser draft can recreate
    // its row after a transient failed write without waiting to revisit Q1/Q4.
    for (const field of ['athlete_name', 'athlete_email', 'email'] as const) {
      const value = safeValue(field, identity[field]);
      if (value !== undefined && value !== null && String(value).trim() !== '') update[field] = value;
    }

    // Each request is a complete snapshot of everything collected so far.
    // Re-save every allowlisted field through the current question, not only
    // the current question's fields. That makes the next successful request
    // repair an earlier failed write instead of permanently losing that answer.
    const fieldsCollectedSoFar = new Set<string>(
      APPLICATION_QUESTIONS
        .filter(item => item.number <= question.number)
        .flatMap(item => [...item.fields]),
    );
    for (const field of fieldsCollectedSoFar) {
      if (!(field in answers)) continue;
      const value = safeValue(field, answers[field]);
      if (value !== undefined) update[field] = value;
    }

    if (body.completed === true) {
      update.last_answered_question_key = question.key;
      update.last_answered_question_label = question.label;
      update.last_answered_question_number = question.number;
      update.last_answered_at = now;
    }

    const admin = createAdminClient();
    const { data: existing, error: lookupError } = await admin
      .from('applications')
      .select('id, application_state')
      .eq('draft_key', draftKey)
      .maybeSingle();
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 400 });

    // A delayed debounce must never turn a completed application back into a
    // draft. Final submission owns the row from this point onward.
    if (existing?.application_state === 'submitted') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const result = existing
      ? await admin.from('applications').update(update).eq('id', existing.id)
      : await admin.from('applications').insert([update]);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
