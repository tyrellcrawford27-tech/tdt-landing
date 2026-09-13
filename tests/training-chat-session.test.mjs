import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  return next(specifier === './trainingAssistant' ? './trainingAssistant.ts' : specifier, context);
} });
const { CHAT_SESSION_KEY } = await import('../lib/trainingAssistant.ts');
const freshModule = () => import(`../lib/trainingChatSession.ts?test=${randomUUID()}`);
function storage(t, initial = {}) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const values = new Map(Object.entries(initial));
  const store = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: store });
  t.after(() => previous ? Object.defineProperty(globalThis, 'sessionStorage', previous) : delete globalThis.sessionStorage);
  return store;
}

test('each topic gets four sends independently and snapshots update without mutating previous counts', async t => {
  const store = storage(t);
  const demo = await freshModule();
  let updates = 0;
  const unsubscribe = demo.subscribeChatCount(() => updates++);
  const initial = demo.chatCounts();
  for (const topic of ['film', 'review', 'practice']) {
    for (let index = 0; index < 4; index++) assert.equal(demo.reserveChatMessage(topic), true);
    assert.equal(demo.reserveChatMessage(topic), false);
  }
  assert.deepEqual(initial, { film: 0, review: 0, practice: 0 });
  assert.deepEqual(demo.chatCounts(), { film: 4, review: 4, practice: 4 });
  assert.equal(updates, 12);
  const saved = JSON.parse(store.getItem(CHAT_SESSION_KEY));
  assert.deepEqual(Object.keys(saved).sort(), ['counts', 'id']);
  assert.deepEqual(saved.counts, { film: 4, review: 4, practice: 4 });
  unsubscribe();
});

test('refresh restores each topic separately and cannot reset its budget', async t => {
  storage(t);
  const before = await freshModule();
  for (let index = 0; index < 4; index++) before.reserveChatMessage('film');
  before.reserveChatMessage('review');
  const after = await freshModule();
  assert.equal(after.chatSession().id, before.chatSession().id);
  assert.deepEqual(after.chatCounts(), { film: 4, review: 1, practice: 0 });
  assert.equal(after.reserveChatMessage('film'), false);
  assert.equal(after.reserveChatMessage('review'), true);
  assert.equal(after.reserveChatMessage('practice'), true);
});

test('server rejection exhausts only its topic and server snapshots stay stable and empty', async t => {
  storage(t);
  const demo = await freshModule();
  const server = demo.serverChatCounts();
  demo.exhaustChatTopic('review');
  assert.deepEqual(demo.chatCounts(), { film: 0, review: 4, practice: 0 });
  assert.equal(demo.reserveChatMessage('film'), true);
  assert.equal(demo.reserveChatMessage('review'), false);
  assert.equal(demo.reserveChatMessage('practice'), true);
  assert.equal(demo.serverChatCounts(), server);
  assert.deepEqual(server, { film: 0, review: 0, practice: 0 });
});

test('malformed storage is ignored and unavailable storage retains an in-memory cap', async t => {
  const store = storage(t, { [CHAT_SESSION_KEY]: JSON.stringify({ id: randomUUID(), counts: { film: -1, review: '4', practice: 0 } }) });
  const demo = await freshModule();
  assert.deepEqual(demo.chatCounts(), { film: 0, review: 0, practice: 0 });
  store.getItem = () => { throw new Error('unavailable'); };
  store.setItem = () => { throw new Error('unavailable'); };
  const privateDemo = await freshModule();
  for (let index = 0; index < 4; index++) assert.equal(privateDemo.reserveChatMessage('practice'), true);
  assert.equal(privateDemo.reserveChatMessage('practice'), false);
  assert.equal(privateDemo.reserveChatMessage('film'), true);
});
