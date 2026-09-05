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
const { APPLICATION_QUESTIONS: questions } = await import('../lib/applicationProgress.ts');
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
      if (op === 'eq') return row[key] === value;
      if (op === 'lt') return row[key] != null && row[key] < Number(value);
      throw new Error('Unexpected filter: ' + condition);
    })); return this;
  }
  update(data) { this.kind = 'update'; this.updateData = data; return this; }
  insert(data) { this.kind = 'insert'; this.updateData = data[0]; return this; }
  async maybeSingle() { return { data: clone(rows.find(row => this.filters.every(fn => fn(row))) ?? null), error: null }; }
  async then(resolve, reject) {
    try {
      if (this.kind !== 'select' && beforeWrite) { const fn = beforeWrite; beforeWrite = null; fn(this); }
      if (this.kind === 'insert') {
        if (rows.some(row => row.draft_key === this.updateData.draft_key)) return resolve({ error: { code: '23505' } });
        rows.push({ id: randomUUID(), ...clone(this.updateData) });
      } else if (this.kind === 'update') {
        for (const row of rows.filter(row => this.filters.every(fn => fn(row)))) Object.assign(row, clone(this.updateData));
      }
      return resolve({ data: clone(rows.filter(row => this.filters.every(fn => fn(row)))), error: null });
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
