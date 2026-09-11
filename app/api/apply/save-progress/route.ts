import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import {
  APPLICATION_QUESTIONS,
  LEGACY_APPLICATION_QUESTIONS,
  applicationFormVersion,
  applicationQuestions,
  applicationVersionMatches,
} from '@/lib/applicationProgress';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeValue(field: string, value: unknown): string | number | null | undefined {
  if (value === null) return null;
  if (field === 'age' || field === 'years_playing') {
    if (value === '' || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }
  if (typeof value !== 'string') return undefined;
  return value.trim() ? value.slice(0, 4_000) : null;
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
    const version = applicationFormVersion(body.form_version);
    const revision = Number(body.revision);
    const answers = body.answers && typeof body.answers === 'object'
      ? body.answers as Record<string, unknown>
      : null;
    const identity = body.identity && typeof body.identity === 'object'
      ? body.identity as Record<string, unknown>
      : {};
    if (!version) return NextResponse.json({ error: 'Unsupported application version. Please refresh.' }, { status: 400 });
    const questions = applicationQuestions(version, answers ?? {});
    const question = questions.find(item => item.key === body.question_key);

    if (!UUID.test(draftKey)) {
      return NextResponse.json({ error: 'Invalid draft key' }, { status: 400 });
    }
    if (!question || !answers) {
      return NextResponse.json({ error: 'Invalid application question' }, { status: 400 });
    }
    if (!Number.isSafeInteger(revision) || revision <= 0) {
      return NextResponse.json({ error: 'Invalid progress revision' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      draft_key: draftKey,
      submitted_at: null,
      application_state: 'draft',
      progress_revision: revision,
      form_version: version,
      total_questions: questions.length,
      current_question_key: question.key,
      current_question_label: question.label,
      current_question_number: question.number,
      progress_updated_at: now,
    };

    // Carried on every snapshot so a pre-existing browser draft can recreate
    // its row after a transient failed write without waiting to revisit Q1/Q4.
    for (const field of ['athlete_name', 'athlete_email'] as const) {
      const value = safeValue(field, identity[field]);
      if (value !== undefined && value !== null && String(value).trim() !== '') update[field] = value;
    }

    // Each request is a complete snapshot of everything collected so far.
    // Re-save all allowlisted answers, including later questions when someone
    // goes Back. The latest snapshot repairs any earlier failed write.
    const fieldsCollectedSoFar = new Set<string>(
      (version === 4 ? LEGACY_APPLICATION_QUESTIONS : APPLICATION_QUESTIONS)
        .flatMap(item => [...item.fields]),
    );
    for (const field of fieldsCollectedSoFar) {
      // Legacy rows reserve a unique email even when unfinished. Keep the
      // contact answer in athlete_email while drafting so resuming an old form
      // cannot wedge every save from Q4 onward on that legacy unique index.
      // Final submission owns canonical email and reconciles the legacy row.
      if (field === 'email') continue;
      if (!(field in answers)) continue;
      const value = safeValue(field, answers[field]);
      if (value !== undefined) update[field] = value;
    }

    const lastAnswered = questions.find(item => item.key === body.last_answered_question_key);
    const completedQuestion = body.completed === true ? question : lastAnswered;
    if (completedQuestion) {
      update.last_answered_question_key = completedQuestion.key;
      update.last_answered_question_label = completedQuestion.label;
      update.last_answered_question_number = completedQuestion.number;
      update.last_answered_at = now;
    }
    if (body.completed === true) {
      const next = questions.find(item => item.number === question.number + 1) ?? question;
      update.current_question_key = next.key;
      update.current_question_label = next.label;
      update.current_question_number = next.number;
    }

    const admin = createAdminClient();
    // Compare-and-set at write time, including submission state. An unload
    // beacon can overtake a normal request; request arrival order is not answer
    // order. A concurrent first save may insert the same draft while we look it
    // up, so re-read that key on a unique violation instead of losing the save.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: existing, error: lookupError } = await admin
        .from('applications')
        .select('id, application_state, progress_revision, deleted_at, form_version')
        .eq('draft_key', draftKey)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing && !applicationVersionMatches(existing.form_version, version)) {
        return NextResponse.json({ ok: true, skipped: true, refresh_required: true });
      }
      if (existing && (existing.application_state === 'submitted' || existing.deleted_at || Number(existing.progress_revision) >= revision)) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      const result = existing
        ? await admin.from('applications').update(update).eq('id', existing.id)
          .or('application_state.is.null,application_state.eq.draft')
          .is('deleted_at', null)
          .or(version === 5 ? 'form_version.eq.5' : 'form_version.is.null,form_version.lt.5')
          .or(`progress_revision.is.null,progress_revision.lt.${revision}`)
        : await admin.from('applications').insert([{ ...update, status: 'pending' }]);
      if (!result.error) return NextResponse.json({ ok: true });
      if (!existing && result.error.code === '23505' && attempt < 2) continue;
      throw result.error;
    }
    throw new Error('Progress save could not be completed');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
