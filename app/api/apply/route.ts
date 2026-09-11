import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { escapeLike } from '@/lib/escapeLike';
import { sendBookingEmails } from '@/lib/email';
import { getEarlyPricingSpots } from '@/lib/earlyPricing';
import {
  applicationFormVersion,
  applicationQuestions,
  applicationVersionMatches,
} from '@/lib/applicationProgress';
import { applicationAnswers, applicationFormFromAnswers, applicationSubmissionError } from '@/lib/applicationForm';

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
  'position', 'years_playing', 'years_playing_answer',
  'current_team', 'current_team_school',
  'biggest_weakness', 'goal', 'social_link', 'time_commitment',
  'parent_name', 'guardian_name',
  'parent_phone', 'guardian_phone',
  'parent_email', 'guardian_email',
  'parent_aware', 'guardian_aware',
  'heard_about',
  'film_readiness', 'film_access', 'decision_support', 'guardian_consent', 'investment_readiness',
] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const version = applicationFormVersion(body.form_version);
    if (!version) return NextResponse.json({ error: 'Unsupported application version. Please refresh.' }, { status: 400 });
    let writable = pickWritable(body);
    if (version === 5) {
      const form = applicationFormFromAnswers(body);
      const problem = applicationSubmissionError(form);
      if (problem) return NextResponse.json({ error: problem.message, question_key: problem.key }, { status: 400 });
      // Use validated canonical aliases and clear answers on hidden branches.
      writable = applicationAnswers(form);
    } else {
      for (const field of ['film_readiness', 'film_access', 'decision_support', 'guardian_consent', 'investment_readiness']) delete writable[field];
    }
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
    const draftKey = typeof body.draft_key === 'string' && UUID.test(body.draft_key)
      ? body.draft_key
      : null;
    const questions = applicationQuestions(version, writable);
    const finalQuestion = questions[questions.length - 1];

    // Server-owned columns. The client never gets to set these, and
    // early_pricing is whatever the re-check above decided, not what was sent.
    const record = {
      ...writable,
      email,
      early_pricing: body.early_pricing || null,
      submitted_at: new Date().toISOString(),
      status: 'pending',
      application_state: 'submitted',
      form_version: version,
      total_questions: questions.length,
      current_question_key: finalQuestion.key,
      current_question_label: finalQuestion.label,
      current_question_number: finalQuestion.number,
      last_answered_question_key: finalQuestion.key,
      last_answered_question_label: finalQuestion.label,
      last_answered_question_number: finalQuestion.number,
      last_answered_at: new Date().toISOString(),
      progress_updated_at: new Date().toISOString(),
    };

    if (email) {
      // A draft key is the durable identity of this browser's application.
      // Fall back to the legacy email lookup for drafts started before live
      // progress existed, so existing in-progress applications still finish
      // in place after this deploy.
      const { data: draftRows, error: draftLookupError } = draftKey
        ? await admin.from('applications').select('id, time_commitment, application_state, form_version').eq('draft_key', draftKey).limit(1)
        : { data: null, error: null };
      if (draftLookupError) return NextResponse.json({ error: draftLookupError.message }, { status: 400 });

      // The draft key must not become a duplicate-email bypass. Check the
      // submitted rows independently and exclude only this exact draft row.
      const { data: emailRows, error: emailLookupError } = await admin
        .from('applications')
        .select('id, time_commitment, application_state, form_version')
        .ilike('email', escapeLike(email))
        .limit(10);
      if (emailLookupError) return NextResponse.json({ error: emailLookupError.message }, { status: 400 });

      const draftRow = draftRows?.[0] ?? null;
      if (draftRow && !applicationVersionMatches(draftRow.form_version, version)) return NextResponse.json({ error: 'Please return to the original application in this browser. Its questions have been preserved.' }, { status: 409 });
      const legacyRow = emailRows?.find(row =>
        row.application_state == null && !row.time_commitment
      ) ?? null;
      const existingRow = legacyRow ?? draftRow;
      if (existingRow && !applicationVersionMatches(existingRow.form_version, version)) return NextResponse.json({ error: 'An earlier application with this email uses the original questions. Please resume that application or contact us for help.' }, { status: 409 });
      const conflictingSubmission = emailRows?.some(row =>
        row.id !== draftRow?.id && (
          row.application_state === 'submitted' ||
          (row.application_state == null && row.time_commitment)
        )
      );
      if (conflictingSubmission) {
        return NextResponse.json(
          { error: 'An application with this email has already been submitted.' },
          { status: 409 }
        );
      }

      // time_commitment is the last field collected before submit, so an
      // existing row missing it is this same applicant's own partial save
      // from earlier in the form (see /api/apply/save-progress) — finish it
      // in place instead of treating it as a duplicate application.
      if (existingRow && (
        existingRow.application_state === 'submitted' ||
        (existingRow.application_state == null && existingRow.time_commitment)
      )) {
        return NextResponse.json(
          { error: 'An application with this email has already been submitted.' },
          { status: 409 }
        );
      }

      const { error, data: savedRows } = existingRow
        ? await admin.from('applications').update(record).eq('id', existingRow.id)
          .or('application_state.is.null,application_state.eq.draft')
          .or(version === 5 ? 'form_version.eq.5' : 'form_version.is.null,form_version.lt.5')
          .is('deleted_at', null).select('id')
        : await admin.from('applications').insert([{ ...record, draft_key: draftKey }]).select('id');

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
      if (!savedRows?.length) return NextResponse.json({ error: 'This application changed in another tab. Please refresh before submitting.' }, { status: 409 });
      // The pre-tracking form already created this legacy contact row. Finish
      // it in place (preserving coach notes and its ID), then retire only the
      // separate draft authenticated by this browser's random key. Contact
      // saves never claim another row merely because the email matches.
      if (legacyRow && draftRow && legacyRow.id !== draftRow.id) {
        const { error: retireError } = await admin.from('applications')
          .update({ deleted_at: new Date().toISOString(), deleted_by: 'application-resume' })
          .eq('id', draftRow.id).eq('application_state', 'draft');
        if (retireError) console.error('[apply] could not retire resumed draft', retireError.code);
      }
    } else {
      const { error } = await admin.from('applications').insert([record]);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const isMinor = typeof writable.age !== 'number' || writable.age < 18;
    await sendBookingEmails({
      athleteName: String(writable.athlete_name || writable.first_name || ''),
      athleteEmail: email,
      isMinor,
      guardianName: typeof writable.guardian_name === 'string' ? writable.guardian_name : null,
      guardianEmail: (isMinor || writable.guardian_aware === 'Yes') && typeof writable.guardian_email === 'string' ? writable.guardian_email : null,
      includeSupporter: !isMinor && writable.guardian_aware === 'Yes',
    }).catch(e => console.error('[apply] booking email failed', e));

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
