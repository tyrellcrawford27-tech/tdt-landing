import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';

// Load real route code with only the external HTTP/database/email boundaries
// replaced. No credentials, production writes, or outgoing mail in this suite.
registerHooks({
  resolve(specifier, context, next) {
    const mocks = { 'next/server': 'next', '@/lib/supabase': 'db', '@/lib/email': 'email', '@/lib/earlyPricing': 'pricing' };
    if (mocks[specifier]) return { url: 'mock:' + mocks[specifier], shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    const sources = {
      'mock:next': 'export const NextResponse = Response; export class NextRequest extends Request {}',
      'mock:db': 'export const createAdminClient = () => globalThis.progressTestDb;',
      'mock:email': 'export const sendBookingEmails = async () => { globalThis.progressTestEmails++; };',
      'mock:pricing': 'export const getEarlyPricingSpots = async () => ({remaining: 0});',
    };
    if (url in sources) return { format: 'module', source: sources[url], shortCircuit: true };
    return next(url, context);
  },
});
const { POST: save } = await import('../app/api/apply/save-progress/route.ts');
const { POST: submit } = await import('../app/api/apply/route.ts');
const { LEGACY_APPLICATION_QUESTIONS: questions, applicationQuestions, applicationExperienceVersion } = await import('../lib/applicationProgress.ts');
const {
  EMPTY_APPLICATION, APPLICATION_SCREENS, applicationAnswers, normalizeApplicationDraft,
  applicationScreenError, applicationSubmissionError, firstIncompleteApplicationScreen,
  applicationFormFromAnswers, applicationWrittenAnswerError, FILM_DECLINED, SELF_SUPPORTED, NO_SOCIAL,
} = await import('../lib/applicationForm.ts');
const { GET: bookingStatus } = await import('../app/api/apply/booking-status/route.ts');
const { createProgressQueue } = await import('../lib/progressQueue.ts');
let rows, beforeWrite;
const clone = value => structuredClone(value);
class Query {
  filters = []; kind = 'select'; updateData;
  select() { return this; }
  eq(key, value) { this.filters.push(row => row[key] === value); return this; }
  is(key, value) { this.filters.push(row => (row[key] ?? null) === value); return this; }
  ilike(key, value) { this.filters.push(row => String(row[key] ?? '').toLowerCase() === value.toLowerCase()); return this; }
  limit() { return this; }
  or(expression) {
    this.filters.push(row => expression.split(',').some(condition => {
      const [key, op, value] = condition.split('.');
      if (op === 'is') return row[key] == null;
      if (op === 'eq') return String(row[key]) === value;
      if (op === 'lt') return row[key] != null && row[key] < Number(value);
      throw new Error('Unexpected filter: ' + condition);
    })); return this;
  }
  update(data) { this.kind = 'update'; this.updateData = data; return this; }
  insert(data) { this.kind = 'insert'; this.updateData = data[0]; return this; }
  async maybeSingle() { return { data: clone(rows.find(row => this.filters.every(fn => fn(row))) ?? null), error: null }; }
  async then(resolve, reject) {
    try {
      let changedRows;
      if (this.kind !== 'select' && beforeWrite) { const fn = beforeWrite; beforeWrite = null; fn(this); }
      if (this.kind === 'insert') {
        if (rows.some(row => row.draft_key === this.updateData.draft_key)) return resolve({ error: { code: '23505' } });
        const row = { id: randomUUID(), ...clone(this.updateData) };
        rows.push(row);
        changedRows = [row];
      } else if (this.kind === 'update') {
        changedRows = rows.filter(row => this.filters.every(fn => fn(row)));
        for (const row of changedRows) Object.assign(row, clone(this.updateData));
      }
      return resolve({ data: clone(changedRows ?? rows.filter(row => this.filters.every(fn => fn(row)))), error: null });
    } catch (error) { return reject(error); }
  }
}
beforeEach(() => {
  rows = []; beforeWrite = null; globalThis.progressTestEmails = 0;
  globalThis.progressTestDb = { from: () => new Query() };
});
const post = (handler, body) => handler(new Request('http://localhost/api/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
const body = (key = randomUUID(), revision = 1, question = 'full_name') => ({
  draft_key: key, revision, question_key: question,
  answers: { athlete_name: 'Progress Test' }, identity: { athlete_name: 'Progress Test' },
});

const validV5 = (overrides = {}) => ({
  ...EMPTY_APPLICATION,
  full_name: '李 明', goal: 'Play in college or university', age: '17',
  position: 'Point Guard', years_playing: '3 to 4 years', current_team_school: 'Example Academy',
  biggest_weakness: 'Weak hand finishing', city_state: 'Toronto, Ontario',
  email: 'applicant@example.com', phone: '416-555-0123', social_link: '@applicant',
  time_commitment: '30 to 45 minutes', film_readiness: "I'd like that kind of coaching",
  film_access: 'Yes', device_access: 'Phone', decision_support: 'A parent or guardian',
  guardian_name: 'Parent Example', guardian_phone: '416-555-0124', guardian_email: 'parent@example.com',
  guardian_aware: 'Yes', guardian_consent: 'Yes', investment_readiness: 'Yes, if the coaching is right for me',
  heard_about: 'Instagram post', ...overrides,
});

test('v4 and v5 clients retain their own question ordering and reject unsupported versions', async () => {
  await post(save, { ...body(), completed: true });
  assert.equal(rows[0].form_version, 4);
  assert.equal(rows[0].current_question_key, 'age');
  assert.equal(rows[0].total_questions, 14);
  await post(save, { ...body(), form_version: 5, completed: true });
  assert.equal(rows[1].form_version, 5);
  assert.equal(rows[1].current_question_key, 'goal');
  assert.equal(rows[1].current_question_number, 2);
  assert.equal(rows[1].total_questions, 16);
  for (const invalid of [{form_version: 6}, {form_version: '5'}, {form_version: null}, {form_version: 4, question_key: 'film_readiness'}, {form_version: 5, question_key: 'made-up'}]) {
    assert.equal((await post(save, {...body(), ...invalid})).status, 400);
  }
  assert.equal(rows.length, 2);
});

test('an old browser tab cannot downgrade a newer draft even with a later revision', async () => {
  const key = randomUUID();
  await post(save, {...body(key, 1, 'goal'), form_version: 5, answers: applicationAnswers(validV5())});
  const before = clone(rows[0]);
  const response = await post(save, {...body(key, 2, 'age'), answers: {age: 99}});
  assert.equal((await response.json()).refresh_required, true);
  assert.deepEqual(rows[0], before);
  assert.equal((await post(submit, { ...applicationAnswers(validV5()), draft_key: key })).status, 409);
  assert.deepEqual(rows[0], before);
});

test('existing applications keep their original questions; only fresh starts use the new flow', () => {
  assert.equal(applicationExperienceVersion(null, null), 5);
  for (const version of [undefined, null, 3, 4]) {
    assert.equal(applicationExperienceVersion({version}, null), 4);
    assert.equal(applicationExperienceVersion(null, {version}), 4);
  }
  assert.equal(applicationExperienceVersion({version:5}, null), 5);
  assert.equal(applicationExperienceVersion(null, {version:5}), 5);
});

test('v5 clients cannot rewrite existing legacy drafts or absorb an old contact record', async () => {
  for (const storedVersion of [null, 4]) {
    rows = [];
    const key = randomUUID();
    const original = {id:randomUUID(),draft_key:key,form_version:storedVersion,application_state:'draft',
      progress_revision:1,athlete_name:'Original Player',goal:'Original goal in their own words',guardian_aware:'No'};
    rows.push(clone(original));
    const response = await post(save, {...body(key,2,'goal'),form_version:5,answers:applicationAnswers(validV5())});
    assert.equal((await response.json()).refresh_required,true);
    assert.deepEqual(rows[0], original);
    assert.equal((await post(submit,{...applicationAnswers(validV5()),draft_key:key,form_version:5})).status,409);
    assert.deepEqual(rows[0], original);
  }
  rows = [{id:randomUUID(),email:'applicant@example.com',application_state:null,form_version:null,athlete_name:'Old contact',reviewer_notes:'Keep me'}];
  const before=clone(rows);
  assert.equal((await post(submit,{...applicationAnswers(validV5()),draft_key:randomUUID(),form_version:5})).status,409);
  assert.deepEqual(rows,before);
  assert.equal(globalThis.progressTestEmails,0);
});

test('submission protects version and submitted state at the actual write and sends no duplicate email', async () => {
  const key = randomUUID();
  await post(save, {...body(key), answers: applicationAnswers(validV5())});
  beforeWrite = () => { rows[0].form_version = 5; };
  assert.equal((await post(submit, {...applicationAnswers(validV5()), draft_key: key})).status, 409);
  assert.equal(rows[0].form_version, 5);
  assert.equal(rows[0].application_state, 'draft');
  assert.equal(globalThis.progressTestEmails, 0);
  beforeWrite = () => { rows[0].application_state = 'submitted'; };
  assert.equal((await post(submit, {...applicationAnswers(validV5()), form_version: 5, draft_key: key})).status, 409);
  assert.equal(globalThis.progressTestEmails, 0);
});

test('all four v5 paths save their stable keys, visible ordinals and qualification answers', async () => {
  for (const adult of [false, true]) for (const decline of [false, true]) {
    const form = validV5({
      ...(adult ? {age: '20', decision_support: SELF_SUPPORTED, guardian_name: '', guardian_email: '', guardian_phone: '', guardian_aware: '', guardian_consent: ''} : {}),
      ...(decline ? {film_readiness: FILM_DECLINED, film_access: '', device_access: ''} : {}),
    });
    const answers = applicationAnswers(form);
    const path = applicationQuestions(5, answers);
    assert.equal(path.length, 16 - Number(adult) - Number(decline));
    assert.equal(applicationSubmissionError(form), null);
    const key = randomUUID();
    for (const [i, question] of path.entries()) {
      const response = await post(save, {...body(key, i + 1, question.key), form_version: 5, answers, completed: true});
      assert.equal(response.status, 200, await response.text());
      const row = rows.find(r => r.draft_key === key);
      assert.equal(row.current_question_key, path[Math.min(i + 1, path.length - 1)].key);
      assert.equal(row.last_answered_question_number, i + 1);
      assert.equal(row.total_questions, path.length);
      assert.equal(row.film_readiness, form.film_readiness);
      assert.equal(row.investment_readiness, form.investment_readiness);
    }
    const response = await post(submit, {...answers, draft_key: key, form_version: 5});
    assert.equal(response.status, 200, await response.text());
    const row = rows.find(r => r.draft_key === key);
    assert.equal(row.application_state, 'submitted');
    assert.equal(row.current_question_key, 'heard_about');
    assert.equal(row.current_question_number, path.length);
    assert.equal(row.heard_about, form.heard_about);
    assert.equal(row.social_link, '@applicant');
    if (adult) assert.equal(row.guardian_email, null);
    if (decline) assert.equal(row.device_access, null);
    // Each next fixture represents a different applicant.
    rows = [];
  }
});

test('v5 final submission requires important answers and minor consent without blocking uncertainty', async () => {
  for (const missing of ['email', 'phone', 'city_state', 'social_link', 'guardian_name', 'guardian_phone', 'guardian_email', 'guardian_aware', 'guardian_consent', 'heard_about']) {
    const response = await post(submit, {...applicationAnswers(validV5({[missing]: ''})), form_version: 5});
    assert.equal(response.status, 400, missing);
  }
  for (const changes of [{guardian_aware: 'Not yet'}, {decision_support: SELF_SUPPORTED}, {goal: 'forged choice'}]) {
    assert.equal((await post(submit, {...applicationAnswers(validV5(changes)), form_version: 5})).status, 400);
  }
  assert.equal(rows.length, 0);
  assert.equal(globalThis.progressTestEmails, 0);
  const form = validV5({social_link: NO_SOCIAL, heard_about: "I don't remember", biggest_weakness: "I'm not sure what to focus on yet", investment_readiness: "I'm not looking for paid coaching right now"});
  assert.equal((await post(submit, {...applicationAnswers(form), form_version: 5})).status, 200);
});

test('v5 preserves full snapshots on back edits and never trusts administrative fields', async () => {
  const key = randomUUID();
  const answers = applicationAnswers(validV5());
  await post(save, {...body(key, 1, 'heard_about'), form_version: 5, answers});
  await post(save, {...body(key, 2), form_version: 5,
    answers: {...answers, athlete_name: 'Updated Name', athlete_email: '', email: '', status: 'accepted', call_booked_at: 'forged', reviewer_notes: 'forged'},
    total_questions: 1, current_question_label: 'forged'});
  assert.equal(rows[0].athlete_name, 'Updated Name');
  assert.equal(rows[0].athlete_email, null);
  assert.equal(rows[0].email, undefined);
  assert.equal(rows[0].guardian_phone, answers.guardian_phone);
  assert.equal(rows[0].guardian_consent, 'Yes');
  assert.equal(rows[0].investment_readiness, answers.investment_readiness);
  assert.equal(rows[0].status, 'pending');
  assert.equal(rows[0].call_booked_at, undefined);
  assert.equal(rows[0].reviewer_notes, undefined);
  assert.equal(rows[0].total_questions, 16);
});

test('old drafts retain names, goal prose, contacts, referral and playing answers', () => {
  const old = {full_name: 'Ng Kai', goal: 'I want to play professionally because I love the game.', years_playing: '1–2 years',
    time_commitment: '30–45 minutes', guardian_aware: 'No', guardian_name: '李 明', guardian_email: 'parent@example.com',
    device_access: "I don't want film yet", heard_about: 'Instagram DM'};
  const restored = normalizeApplicationDraft(old);
  assert.equal(restored.goal, 'Another goal');
  assert.equal(restored.goal_detail, old.goal);
  assert.equal(restored.years_playing, '1 to 2 years');
  assert.equal(restored.time_commitment, '30 to 45 minutes');
  assert.equal(restored.guardian_aware, 'Not yet');
  assert.equal(restored.guardian_consent, '');
  assert.equal(restored.guardian_email, old.guardian_email);
  assert.equal(restored.heard_about, old.heard_about);
  assert.equal(restored.film_readiness, FILM_DECLINED);
  assert.equal(firstIncompleteApplicationScreen(restored), 3);
  const before = normalizeApplicationDraft({full_name: 'Valid Name', device_access: 'Phone'});
  assert.equal(before.film_readiness, '');
});

test('short useful answers work; detail lengths, conditional requirements and canonical roundtrip stay consistent', () => {
  const form = validV5({full_name: 'Ng Kai', biggest_weakness: 'Finishing', goal: 'Another goal', goal_detail: 'Play for my school', heard_about: 'Other', heard_about_detail: 'A local coach'});
  assert.equal(applicationSubmissionError(form), null);
  assert.deepEqual(applicationFormFromAnswers(applicationAnswers(form)), form);
  for (const value of ['Less than 1 year', "I haven't played competitively yet"]) {
    assert.equal(applicationAnswers({...form, years_playing: value}).years_playing, 0);
  }
  const goal = APPLICATION_SCREENS.find(q => q.key === 'goal');
  assert.ok(applicationScreenError(goal, {...form, goal_detail: ''}));
  assert.ok(applicationScreenError(goal, {...form, goal_detail: 'x'.repeat(4000)}));
  assert.equal(applicationAnswers({...form, goal: 'Play professionally'}).goal, 'Play professionally');
  assert.equal(firstIncompleteApplicationScreen(validV5()), APPLICATION_SCREENS.length + 1);
  const adult = validV5({age: '20', decision_support: SELF_SUPPORTED, guardian_name: ''});
  assert.equal(applicationSubmissionError(adult), null);
  assert.ok(applicationSubmissionError({...adult, age: '17'}));
});

test('written answers reject profanity, keyboard mashing and throwaway text without blocking concise real answers', () => {
  const weakness = APPLICATION_SCREENS.find(q => q.key === 'biggest_weakness');
  const name = APPLICATION_SCREENS.find(q => q.key === 'full_name');
  const team = APPLICATION_SCREENS.find(q => q.key === 'current_team_school');
  for (const value of ['x', 'asdfgh', 'qwerty', 'lol', 'aaaaaa', 'f.u.c.k this']) {
    assert.ok(applicationScreenError(weakness, validV5({biggest_weakness: value})), value);
  }
  for (const value of ['x', 'asdf qwerty', 'bastard', 'f.u.c.k']) {
    assert.ok(applicationScreenError(name, validV5({full_name: value})), value);
  }
  for (const value of ['shit', 'bullshit', 'bitch', 'asshole', 'whore', 'slut']) {
    assert.ok(applicationScreenError(team, validV5({current_team_school: value})), value);
    assert.ok(applicationWrittenAnswerError(value), value);
    assert.ok(applicationSubmissionError(validV5({biggest_weakness: value})), value);
  }
  for (const value of ['Finishing', 'Left hand', 'Reading ball screens', "I'm not sure what to focus on yet"]) {
    assert.equal(applicationScreenError(weakness, validV5({biggest_weakness: value})), null, value);
  }
  assert.equal(applicationScreenError(name, validV5({full_name: 'Ng Kai'})), null);
  assert.equal(applicationScreenError(team, validV5({current_team_school: "I'm not on a team right now"})), null);
});

test('booking status does not mistake a draft with time commitment for a submitted application', async () => {
  rows.push({ email: 'test@example.com', application_state: 'draft', time_commitment: '30 to 45 minutes', call_booked_at: '2026-09-11' });
  const request = { nextUrl: new URL('http://localhost/api/apply/booking-status?email=test@example.com') };
  assert.deepEqual(await (await bookingStatus(request)).json(), {submitted: false, booked: false});
  rows.push({ email: 'test@example.com', application_state: 'submitted', time_commitment: '30 to 45 minutes', call_booked_at: '2026-09-11' });
  assert.deepEqual(await (await bookingStatus(request)).json(), {submitted: true, booked: true});
});

test('valid UUID saves from Q1, all 14 questions persist and only explicit submission completes', async () => {
  const key = randomUUID(); const answers = {};
  for (const question of questions) {
    for (const field of question.fields) answers[field] = field === 'age' ? 18 : field === 'years_playing' ? 3 : `${field} answer`;
    const response = await post(save, { ...body(key, question.number, question.key), completed: true, answers });
    assert.equal(response.status, 200, await response.text());
    assert.equal(rows.length, 1);
    assert.equal(rows[0].last_answered_question_number, question.number);
    assert.equal(rows[0].current_question_number, Math.min(question.number + 1, 14));
    assert.equal(rows[0].application_state, 'draft');
    assert.equal(rows[0].submitted_at, null);
    for (const [field, answer] of Object.entries(answers)) {
      if (field !== 'email') assert.equal(rows[0][field], answer);
    }
  }
  assert.equal(globalThis.progressTestEmails, 0);
  const response = await post(submit, { ...answers, draft_key: key });
  assert.equal(response.status, 200, await response.text());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].application_state, 'submitted');
  assert.ok(rows[0].submitted_at);
  assert.equal(globalThis.progressTestEmails, 1);
  await post(save, { ...body(key, 999), answers: { athlete_name: 'Delayed old name' } });
  assert.notEqual(rows[0].athlete_name, 'Delayed old name');
  assert.equal(rows[0].application_state, 'submitted');
});

test('rejects malformed draft keys and invalid revisions before any write', async () => {
  for (const invalid of [{draft_key: 'invalid'}, {revision: -1}, {revision: 1.5}, {revision: null}]) {
    assert.equal((await post(save, { ...body(), ...invalid })).status, 400);
  }
  assert.equal(rows.length, 0);
});

test('out-of-order requests and duplicate retries cannot regress progress', async () => {
  const key = randomUUID();
  await post(save, { ...body(key, 20, 'biggest_weakness'), answers: { athlete_name: 'New Name', biggest_weakness: 'Latest answer' } });
  await post(save, body(key, 19)); await post(save, body(key, 20));
  assert.equal(rows[0].athlete_name, 'New Name'); assert.equal(rows[0].current_question_number, 8);
  assert.equal(rows[0].biggest_weakness, 'Latest answer');
});

test('submission and newer saves that race the lookup are guarded at the actual write', async () => {
  const key = randomUUID(); await post(save, body(key));
  beforeWrite = () => { rows[0].progress_revision = 30; rows[0].athlete_name = 'Newer Name'; };
  await post(save, body(key, 2)); assert.equal(rows[0].athlete_name, 'Newer Name');
  beforeWrite = () => { rows[0].application_state = 'submitted'; rows[0].submitted_at = 'final'; };
  await post(save, body(key, 31)); assert.equal(rows[0].application_state, 'submitted'); assert.equal(rows[0].submitted_at, 'final');
});

test('concurrent first-save insertion retries the same key without a duplicate', async () => {
  const key = randomUUID();
  beforeWrite = query => { rows.push({ id: randomUUID(), ...query.updateData, progress_revision: 1 }); };
  assert.equal((await post(save, body(key, 2))).status, 200);
  assert.equal(rows.length, 1); assert.equal(rows[0].progress_revision, 2);
});

test('back edits preserve later answers; blank contact fields are null; coach fields are ignored', async () => {
  const key = randomUUID();
  await post(save, { ...body(key, 1, 'age'), answers: { athlete_name: 'Progress Test', age: 19, goal: 'Later answer', email: '', athlete_email: '', reviewer_notes: 'forged', status: 'accepted' } });
  assert.equal(rows[0].goal, 'Later answer'); assert.equal(rows[0].athlete_email, null); assert.equal(rows[0].email, undefined);
  assert.equal(rows[0].status, 'pending'); assert.equal(rows[0].reviewer_notes, undefined);
});

test('slow connections coalesce obsolete snapshots; flush waits for the latest; failures do not jam the queue', async () => {
  let release; const sent = []; const failures = [];
  const queue = createProgressQueue(async snapshot => {
    sent.push(snapshot);
    if (snapshot === 1) { await new Promise(resolve => { release = resolve; }); throw new Error('offline'); }
  }, error => failures.push(error.message));
  queue.enqueue(1); queue.enqueue(2); queue.enqueue(3);
  release(); await queue.flush();
  assert.deepEqual(sent, [1, 3]); assert.deepEqual(failures, ['offline']);
  await queue.enqueue(4); assert.deepEqual(sent, [1, 3, 4]);
});


test('resuming a legacy contact save tracks separately and finishes the original row without losing notes', async () => {
  const key = randomUUID();
  rows.push({ id: 'legacy', email: 'resume@example.invalid', athlete_name: 'Original Name', reviewer_notes: 'Keep this note', application_state: null });
  await post(save, { ...body(key, 1, 'contact'), answers: { athlete_name: 'Progress Test', email: 'resume@example.invalid', athlete_email: 'resume@example.invalid' } });
  assert.equal(rows.length, 2); assert.equal(rows[1].email, undefined); assert.equal(rows[1].current_question_number, 4);
  const response = await post(submit, { draft_key: key, email: 'resume@example.invalid', athlete_name: 'Progress Test', time_commitment: '1 hour' });
  assert.equal(response.status, 200, await response.text());
  assert.equal(rows[0].application_state, 'submitted'); assert.equal(rows[0].reviewer_notes, 'Keep this note');
  assert.ok(rows[1].deleted_at);
});
