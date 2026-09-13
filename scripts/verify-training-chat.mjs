import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
const base = process.env.TDT_TEST_URL || 'http://localhost:3000';
const liveAI = process.env.TDT_CHAT_VERIFY_AI === '1';
const mockAI = process.env.TDT_CHAT_VERIFY_MOCK === '1';
assert.ok(!(liveAI && mockAI), 'Choose genuine AI verification or mocked UI verification, not both');
async function position(page, index) {
  await page.locator('[data-how-track]').evaluate((track, index) => {
    const pin = track.firstElementChild;
    window.scrollTo({ top: window.scrollY + track.getBoundingClientRect().top - parseFloat(getComputedStyle(pin).top) + (track.offsetHeight - pin.offsetHeight) * index / 4 + 2, behavior: 'instant' });
  }, index);
  await page.waitForFunction(index => document.querySelector(`#how-tab-${index}`).getAttribute('aria-selected') === 'true', index);
  await page.waitForTimeout(750);
}
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
  const page = await context.newPage();
  if (mockAI) {
    const responses = ['Start with the application, then choose a time for a call.', 'The application is where you can share your goals.', 'We can discuss a simple way to start recording useful game footage.', 'Execution connects your decision to the defender, space and timing.'];
    let index = 0;
    await page.route('**/api/training-chat', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: responses[index++], fallback: true }) }));
  }
  const errors = [];
  const payloads = [];
  const apiResults = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().endsWith('/api/training-chat')) payloads.push(request.postDataJSON()); });
  page.on('response', response => {
    if (response.url().endsWith('/api/training-chat')) void response.json().then(body => apiResults.push({ status: response.status(), fallback: body.fallback })).catch(() => {});
  });
  await page.goto(base, { waitUntil: 'networkidle' });
  await position(page, 0);
  const input = page.getByRole('textbox', { name: 'Message Jaiden’s chat demo' });
  const send = page.getByRole('button', { name: 'Send message', exact: true });
  assert.equal(await send.isDisabled(), true);
  const messages = ['okay what are my next steps', "I'm interested", "I don't have film yet", 'I rush my decisions when a defender pressures me'];
  const expected = liveAI ? [/appl/i, /appl/i, /film|footage|record/i, /decision|read|defender|film/i] : [/application.*call/, /share your goals/, /start recording/, /defender/];
  const replies = page.locator('[data-role="assistant"][data-example="false"]');
  const contents = [];
  for (let index = 0; index < 4; index++) {
    await input.fill(messages[index]);
    const start = Date.now();
    if (index === 1) await send.click(); else await input.press('Enter');
    assert.equal(await page.getByRole('status', { name: 'Demo coach is typing' }).count(), 1);
    if (index === 0) await input.press('Enter');
    await page.waitForFunction(count => document.querySelectorAll('[data-role="assistant"][data-example="false"]').length === count, index + 1);
    assert.ok(Date.now() - start >= 650);
    const content = await replies.nth(index).locator('[data-message-text]').textContent();
    assert.match(content, expected[index]); contents.push(content);
    assert.equal(await replies.nth(index).locator('a').getAttribute('href'), '/apply');
    assert.equal(await replies.nth(index).locator('[data-chat-application-cta]').count(), 1, 'Chat uses the shared CTA');
  }
  assert.equal(new Set(contents).size, 4);
  assert.equal(payloads.length, 4);
  if (liveAI) assert.deepEqual(apiResults, Array.from({ length: 4 }, () => ({ status: 200, fallback: false })), 'Every real chat request must use AI, not a fallback');
  assert.deepEqual(payloads.map(body => body.history.length), [0, 2, 4, 6]);
  const apply = replies.last().locator('a');
  await page.waitForTimeout(1000); // Let message arrival and log scrolling settle.
  await apply.hover();
  const applyBounds = await apply.boundingBox();
  await page.mouse.move(applyBounds.x + applyBounds.width / 2 + 1, applyBounds.y + applyBounds.height / 2);
  await page.waitForTimeout(250);
  assert.equal(await apply.evaluate(link => getComputedStyle(link).borderRadius), '33px', 'Shared pill shape');
  assert.equal(await apply.locator(':scope > div').count(), 2, 'Shared fill and tracking spotlight');
  assert.match(await apply.locator(':scope > div').nth(1).evaluate(layer => getComputedStyle(layer).backgroundImage), /radial-gradient/);
  assert.equal(await apply.locator(':scope > div').nth(1).evaluate(layer => getComputedStyle(layer).opacity), '1', 'Cursor-following highlight is active');
  assert.equal(await apply.evaluate(link => link.scrollWidth <= link.clientWidth), true, 'CTA text is not clipped');
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  assert.equal(await apply.locator(':scope > div').nth(1).evaluate(layer => getComputedStyle(layer).opacity), '0');
  assert.equal(await input.count(), 1, 'The composer remains visible after the trial');
  assert.equal(await input.evaluate(input => input.readOnly), true);
  assert.equal(await send.isDisabled(), true);
  assert.match(await replies.last().textContent(), /demo conversation/);
  assert.doesNotMatch(await page.locator('#how-step-panel').textContent(), /That’s the chat preview\. Ready to work on your game/);
  const stored = JSON.parse(await page.evaluate(() => sessionStorage.getItem('tdt-training-chat-session-v2')));
  assert.deepEqual(Object.keys(stored).sort(), ['counts', 'id']); assert.deepEqual(stored.counts, { film: 4, review: 0, practice: 0 });
  await position(page, 1); assert.equal(await input.count(), 1);
  assert.equal(await input.evaluate(input => input.readOnly), false, 'Finishing film does not lock review');
  await input.fill('Can you help with my reads?'); assert.equal(await send.isDisabled(), false);
  await page.reload({ waitUntil: 'networkidle' }); await position(page, 0);
  assert.equal(await input.count(), 1);
  assert.equal(await input.evaluate(input => input.readOnly), true, 'Refresh cannot reset film’s cap');
  assert.equal(await page.locator('#how-step-panel a[href="/apply"]').count(), 1, 'Application stays available after refresh');
  await position(page, 1); assert.equal(await input.evaluate(input => input.readOnly), false, 'Review remains available after refresh');
  await position(page, 2); assert.equal(await input.evaluate(input => input.readOnly), false, 'Practice has its own four-message budget');
  await position(page, 3);
  const card = page.getByRole('button', { name: 'View Andre Narciso’s profile' });
  const photo = card.locator('img'); await photo.evaluate(image => image.decode());
  assert.equal(await photo.getAttribute('src'), '/how-it-works/avatar-andre.webp');
  assert.equal(await photo.evaluate(image => getComputedStyle(image.parentElement).boxShadow), 'none', 'Andre has no avatar ring');
  await card.click();
  await page.waitForFunction(() => document.querySelector('#community-profile').getAttribute('aria-hidden') === 'false');
  await page.waitForTimeout(450);
  assert.equal(await page.locator('#community-profile').getAttribute('aria-hidden'), 'false');
  await page.locator('#community-profile img').evaluate(image => image.decode());
  assert.equal(await page.locator('#community-profile img').getAttribute('src'), '/how-it-works/avatar-andre.webp');
  assert.equal(await page.locator('#community-profile img').evaluate(image => getComputedStyle(image.parentElement).boxShadow), 'none', 'The overlay also has no avatar ring');
  await page.screenshot({ path: '/tmp/tdt-andre-profile.png' });
  assert.deepEqual(errors, []);
  await context.close();
  // Exercise all twelve sends without extra provider usage, rather than only
  // inferring the remaining budgets from the first topic's completed trial.
  const budgetContext = await browser.newContext({ viewport: { width: 1440, height: 800 } });
  const budgetPage = await budgetContext.newPage();
  const budgetPayloads = [];
  await budgetPage.route('**/api/training-chat', route => {
    budgetPayloads.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'Execution connects the skill to the right decision and timing. Film gives your practice a clear focus.', fallback: false }) });
  });
  await budgetPage.goto(base, { waitUntil: 'networkidle' });
  for (const [index, topic] of ['film', 'review', 'practice'].entries()) {
    await position(budgetPage, index);
    const composer = budgetPage.getByRole('textbox', { name: 'Message Jaiden’s chat demo' });
    for (let count = 0; count < 4; count++) {
      assert.equal(await composer.evaluate(input => input.readOnly), false);
      await composer.fill(`My ${topic} question ${count + 1}`);
      await composer.press('Enter');
      await budgetPage.waitForFunction(count => document.querySelectorAll('[data-role="assistant"][data-example="false"]').length === count, count + 1);
    }
    assert.equal(await composer.evaluate(input => input.readOnly), true);
    assert.equal(await budgetPage.getByRole('button', { name: 'Send message', exact: true }).isDisabled(), true);
    assert.deepEqual(budgetPayloads.filter(body => body.topic === topic).map(body => body.history.length), [0, 2, 4, 6]);
  }
  assert.equal(budgetPayloads.length, 12);
  const budgetStorage = JSON.parse(await budgetPage.evaluate(() => sessionStorage.getItem('tdt-training-chat-session-v2')));
  assert.deepEqual(budgetStorage.counts, { film: 4, review: 4, practice: 4 });
  await budgetPage.reload({ waitUntil: 'networkidle' });
  for (let index = 0; index < 3; index++) {
    await position(budgetPage, index);
    assert.equal(await budgetPage.getByRole('textbox').evaluate(input => input.readOnly), true);
    assert.equal(await budgetPage.locator('#how-step-panel a[href="/apply"]').count(), 1);
  }
  await budgetContext.close();
  for (const limited of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 700 } });
    const page = await context.newPage();
    await page.route('**/api/training-chat', route => limited ? route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ limited: true }) }) : route.abort());
    await page.goto(base, { waitUntil: 'networkidle' }); await position(page, 0);
    await page.getByRole('textbox').fill('I miss my shots in games'); await page.getByRole('textbox').press('Enter');
    await page.locator('[data-role="assistant"][data-example="false"]').waitFor();
    const reply = await page.locator('[data-role="assistant"][data-example="false"] [data-message-text]').textContent();
    assert.match(reply, limited ? /limit/ : /shot preparation/);
    if (limited) {
      assert.equal(await page.getByRole('textbox').count(), 1);
      assert.equal(await page.getByRole('textbox').evaluate(input => input.readOnly), true);
      await position(page, 1);
      assert.equal(await page.getByRole('textbox').evaluate(input => input.readOnly), false, 'A rate-limited topic does not hide other composers');
    }
    await context.close();
  }
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phonePage = await phone.newPage(); await phonePage.goto(base, { waitUntil: 'networkidle' });
  await position(phonePage, 3); assert.equal(await phonePage.getByRole('textbox').count(), 0, 'Mobile stays visual-only');
  await phone.close();
  console.log(`${liveAI ? 'Four genuine OpenAI replies; ' : mockAI ? 'Mocked UI verification, no AI usage; ' : ''}distinct direct replies, six-turn follow-up history, Enter/click, duplicate protection, typing delay, shared CTA hover/spotlight, all twelve per-topic demo sends (mocked), independent refresh-proof topic caps, composer retained at the limit, no stored messages, offline/429 states, Andre card/overlay image and visual-only mobile passed.`);
} finally { await browser.close(); }
