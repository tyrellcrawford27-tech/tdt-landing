import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
const base = process.env.TDT_TEST_URL || 'http://localhost:3000';
const output = process.env.TDT_SCREENSHOT_DIR || '/tmp/tdt-how-it-works';
await mkdir(output, { recursive: true });
const errors = [];

async function position(page, stage = 0, settle = true) {
  await page.locator('[data-how-track]').evaluate((section, index) => {
    const pin = section.firstElementChild;
    if (getComputedStyle(pin).position !== 'sticky') {
      section.querySelector(`#how-tab-${index}`).click();
      window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - 70, behavior: 'instant' });
      return;
    }
    const top = parseFloat(getComputedStyle(pin).top) || 64;
    const distance = section.offsetHeight - pin.offsetHeight;
    window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - top + distance * index / 4 + 2, behavior: 'instant' });
  }, stage);
  await page.waitForFunction(index => document.querySelector(`#how-tab-${index}`)?.getAttribute('aria-selected') === 'true', stage);
  if (settle) {
    await page.waitForTimeout(700);
    if (stage < 3) await page.locator('[data-example="true"]').first().waitFor();
  }
}
function panel(page, stage = 0) {
  return page.locator(`#how-it-works [role="tabpanel"][data-stage="${stage + 1}"]`);
}
async function assertImages(page) {
  for (const img of await page.locator('#how-it-works img').all()) {
    if (!await img.isVisible()) continue;
    if (!await img.evaluate(image => image.getBoundingClientRect().top < innerHeight && image.getBoundingClientRect().bottom > 0)) continue;
    await img.evaluate(async image => { await image.decode(); });
    const details = await img.evaluate(image => ({ loaded: image.complete && image.naturalWidth > 0, fit: getComputedStyle(image).objectFit, ratio: image.naturalWidth / image.naturalHeight, renderedRatio: image.getBoundingClientRect().width / image.getBoundingClientRect().height }));
    assert.ok(details.loaded, 'Product image loads successfully');
    assert.equal(details.fit, 'contain', 'Entire screenshot retains its original proportions');
    assert.ok(Math.abs(details.ratio - details.renderedRatio) < .01, 'Rendered image dimensions preserve its actual aspect ratio');
  }
}
async function open(viewport, mobile = false) {
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: 'Message Jaiden’s chat demo' }).first().waitFor();
  return { page, context };
}

try {
  const { page, context } = await open({ width: 1440, height: 1024 });
  const initialHtml = await (await page.request.get(base)).text();
  for (const text of ['Just uploaded my first full game', 'find your first focus', 'rush or hesitate']) assert.ok(initialHtml.includes(text), 'Example exchange is in the initial HTML, not a delayed effect');
  assert.equal(await page.locator('[data-example="true"]').count(), 3, 'The full example is preloaded, even before scrolling to the chat');
  assert.equal(await page.getByRole('status', { name: 'Demo coach is typing' }).count(), 0, 'No automatic greeting or staged playback');
  const requests = [];
  await page.route('**/api/training-chat', async route => {
    requests.push(route.request().postDataJSON());
    await route.abort();
  });
  const openings = [/Just uploaded my first full game/, /clips from our review/, /that drill helped in today’s game/];
  const roles = [['user', 'assistant', 'user'], ['assistant', 'user', 'assistant'], ['user', 'assistant', 'user']];
  for (let stage = 0; stage < 4; stage++) {
    await position(page, stage, false);
    if (stage < 3) {
      const example = page.locator('[data-example="true"]');
      assert.equal(await example.count(), 3, 'All three story messages appear immediately on entering a topic');
      assert.match(await example.first().locator('[data-message-text]').textContent(), openings[stage]);
      assert.deepEqual(await example.evaluateAll(turns => turns.map(turn => turn.dataset.role)), roles[stage]);
      assert.deepEqual(await example.evaluateAll(turns => turns.map(turn => turn.dataset.animate)), ['false', 'false', 'false'], 'Preloaded conversation is not played out or reanimated');
      assert.equal(await page.getByRole('textbox', { name: 'Message Jaiden’s chat demo' }).isEnabled(), true, 'Visitors can add a message immediately');
      assert.equal(await page.locator('[data-example="false"]').count(), 0, 'Example messages are distinct from actual visitor messages');
      assert.doesNotMatch(await page.locator('[data-chat-topic]').innerText(), /In-app chat demo|not live from Jaiden|Take the next step/);
      assert.equal(await page.locator('[data-chat-topic] a').count(), 0, 'No application link before a visitor sends');
      assert.doesNotMatch(await page.locator('[data-chat-topic]').innerText(), /Automated training assistant|\bTDT\b/);
    }
    await page.waitForTimeout(700);
    const rect = await page.locator('#how-step-panel').boundingBox();
    assert.ok(rect.y > 85 && rect.y + rect.height < 1025, `Desktop panel visible: ${JSON.stringify(rect)}`);
    await page.screenshot({ path: `${output}/desktop-step-${stage + 1}.png` });
    await assertImages(page);
  }
  await page.getByRole('button', { name: 'View Andre Narciso’s profile' }).hover();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#community-profile').getAttribute('aria-hidden'), 'false');
  assert.match(await page.locator('#community-profile').evaluate(el => getComputedStyle(el).backdropFilter), /blur\(22px\)/);
  assert.match(await page.locator('#community-profile').innerText(), /Holy Trinity/);
  await page.screenshot({ path: `${output}/desktop-profile.png` });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#community-profile').getAttribute('aria-hidden'), 'true');
  for (const name of ['Andre Narciso', 'Tyler-perry London', 'Elijah', 'Tyrell Crawford']) {
    await page.mouse.move(0, 0);
    const person = page.getByRole('button', { name: 'View ' + name + '’s profile' });
    await person.hover({ position: { x: 10, y: 10 } });
    assert.equal(await page.locator('#community-profile').getAttribute('aria-hidden'), 'false');
    assert.match(await page.locator('#community-profile').innerText(), new RegExp(name));
    await page.keyboard.press('Escape');
  }
  await position(page, 0);
  assert.equal(await page.locator('[data-example="true"]').first().getAttribute('data-animate'), 'false', 'Returning does not replay the example');
  assert.equal(requests.length, 0, 'The story does not consume a visitor message or make an API request');
  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select file' }).click();
  await (await picker).setFiles({ name: 'test-game.mp4', mimeType: 'video/mp4', buffer: Buffer.from('local preview only') });
  assert.match(await panel(page).innerText(), /Game selected/);
  assert.match(await panel(page).innerText(), /test-game.mp4/);
  assert.match(await panel(page).innerText(), /stays on your device/);
  await page.locator('input[type="file"]').setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('not a video') });
  assert.match(await panel(page).innerText(), /Choose a video file/);
  const input = page.getByRole('textbox', { name: 'Message Jaiden’s chat demo' });
  const send = page.getByRole('button', { name: 'Send message' });
  assert.equal(await send.isDisabled(), true);
  await input.fill('  '); assert.equal(await send.isDisabled(), true);
  await input.fill('x'.repeat(301)); assert.equal((await input.inputValue()).length, 300);
  await input.fill('I shoot well in practice but miss my shots in games');
  const start = Date.now();
  await input.press('Enter');
  assert.equal(await page.getByRole('status', { name: 'Demo coach is typing' }).count(), 1);
  assert.equal(await page.locator('[data-role="user"] [data-message-text]').last().textContent(), 'I shoot well in practice but miss my shots in games', 'Visitor bubble appears immediately in full');
  await input.press('Enter');
  const reply = page.locator('[data-role="assistant"][data-example="false"]');
  await reply.waitFor();
  assert.equal(await reply.locator('[data-message-text]').textContent(), 'Apply for the 100-Day Program', 'The reply contains only the application link');
  assert.equal(await reply.locator('a').getAttribute('href'), '/apply');
  assert.match(await reply.evaluate(el => getComputedStyle(el).animationName), /messageArrive/);
  assert.equal(await reply.evaluate(el => getComputedStyle(el).animationDuration), '0.72s');
  assert.equal(await page.locator('[data-example="true"]').count(), 3, 'Real visitor messages append after the original exchange');
  await page.locator('#how-step-panel a[href="/apply"]').waitFor();
  assert.ok(Date.now() - start >= 650);
  assert.equal(requests.length, 0, 'No visitor message is sent to an API');
  assert.equal(await page.locator('[data-chat-topic] > a').count(), 0, 'There is no separate footer CTA');
  await input.fill('I shoot well in practice but miss my shots in games');
  await input.press('Enter');
  assert.equal(await send.isDisabled(), true, 'Exact duplicate is blocked');
  assert.equal(await reply.count(), 1);
  await page.waitForTimeout(950);
  await page.screenshot({ path: `${output}/desktop-chat.png` });
  await input.fill('My unfinished film question');
  await position(page, 2); assert.equal(await input.inputValue(), '');
  assert.equal(await page.getByRole('log').locator('a').count(), 0, 'New topic starts with its own story');
  await input.fill('My unfinished practice question');
  await position(page, 0); assert.equal(await input.inputValue(), 'My unfinished film question');
  assert.equal(await page.getByRole('log').locator('a').count(), 1, 'Returning preserves the reply');
  await position(page, 1);
  await input.fill('I rush my passes when the help defender comes'); await send.click();
  await page.getByRole('status', { name: 'Demo coach is typing' }).waitFor();
  await position(page, 2, false);
  assert.equal(await input.inputValue(), 'My unfinished practice question');
  assert.equal(await send.isDisabled(), true, 'No second in-flight submission from another topic');
  await page.waitForFunction(() => !document.querySelector('[aria-label="Send message"]').disabled);
  assert.equal(await page.getByRole('log').locator('a').count(), 0, 'Late reply cannot leak into another topic');
  await position(page, 1); assert.equal(await page.getByRole('log').locator('a').count(), 1);
  await position(page, 2);
  await input.fill('I also want to earn more minutes'); await send.click();
  await page.waitForFunction(() => !document.querySelector('[aria-label="Demo coach is typing"]'));
  assert.equal(requests.length, 0);
  assert.equal(await page.getByRole('log').locator('a').count(), 1);
  assert.equal(await input.getAttribute('readonly'), null);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('tdt-training-chat-session-v1')), null, 'No messages or counters are stored');
  await page.evaluate(() => sessionStorage.setItem('tdt-training-chat-session-v1', JSON.stringify({ id: crypto.randomUUID(), count: 3 })));
  await page.reload({ waitUntil: 'networkidle' }); await position(page, 0);
  assert.equal(await send.isDisabled(), true);
  assert.equal(await page.locator('#how-step-panel a[href="/apply"]').count(), 0, 'Old exhausted sessions do not show a permanent CTA');
  assert.equal(await input.getAttribute('placeholder'), 'Message Jaiden…');
  await input.fill('I want to improve my game');
  assert.equal(await send.isEnabled(), true, 'Old AI cap does not lock the plain link-only demo');
  assert.doesNotMatch(await page.getByRole('log').innerText(), /I shoot well in practice/);
  await context.close();
  console.log('Desktop: preloaded story, plain composer, link-only replies, Enter/click, typing, deduplication, topic isolation and old-session recovery passed.');

  const mobile = await open({ width: 390, height: 844 }, true);
  for (let stage = 0; stage < 4; stage++) {
    await position(mobile.page, stage);
    const layout = await mobile.page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
    await mobile.page.screenshot({ path: `${output}/mobile-step-${stage + 1}.png` });
    assert.equal(layout.width, layout.viewport, 'No mobile horizontal overflow');
    await assertImages(mobile.page);
    const mobileLayout = await panel(mobile.page, stage).evaluate(el => ({ panel: el.getBoundingClientRect().toJSON(), product: el.firstElementChild.getBoundingClientRect().toJSON(), interaction: el.lastElementChild.getBoundingClientRect().toJSON() }));
    assert.ok(mobileLayout.product.bottom <= mobileLayout.interaction.top, 'Product and conversation do not overlap');
    assert.ok(mobileLayout.interaction.bottom <= mobileLayout.panel.bottom, 'Natural mobile panel contains the entire conversation');
  }
  await mobile.page.getByRole('button', { name: 'View Andre Narciso’s profile' }).tap();
  assert.equal(await mobile.page.locator('#community-profile').getAttribute('aria-hidden'), 'false');
  await mobile.page.waitForTimeout(350);
  await mobile.page.screenshot({ path: `${output}/mobile-profile.png` });
  await mobile.page.getByRole('button', { name: 'Close profile preview' }).tap();
  assert.equal(await mobile.page.locator('#community-profile').getAttribute('aria-hidden'), 'true', 'Profile can be dismissed without a keyboard');
  await position(mobile.page, 0);
  await mobile.page.route('**/api/training-chat', route => route.abort());
  const mobileInput = panel(mobile.page).getByRole('textbox', { name: 'Message Jaiden’s chat demo' });
  await mobileInput.fill('I get nervous during games'); await panel(mobile.page).getByRole('button', { name: 'Send message' }).tap();
  await panel(mobile.page).locator('a[href="/apply"]').waitFor();
  assert.match(await panel(mobile.page).getByRole('log').innerText(), /hesitate/);
  assert.equal(await panel(mobile.page).getByRole('log').locator('a[href="/apply"]').count(), 1, 'Link-only reply also works without an API');
  assert.equal(await panel(mobile.page).locator('[data-chat-feedback]').count(), 0);
  await position(mobile.page, 1);
  assert.doesNotMatch(await panel(mobile.page, 1).getByRole('log').innerText(), /hesitate/, 'Each mobile topic has its own conversation');
  await position(mobile.page, 0);
  assert.match(await panel(mobile.page).getByRole('log').innerText(), /hesitate/, 'Returning preserves the conversation');
  await mobile.page.waitForTimeout(500);
  await mobileInput.scrollIntoViewIfNeeded();
  await mobile.page.screenshot({ path: `${output}/mobile-chat-link.png` });
  await mobile.context.close();
  console.log('Mobile: single full-height panel, all four step controls, loaded uncropped images, touch profile and local application reply passed.');

  const reduced = await open({ width: 1280, height: 720 });
  await reduced.page.emulateMedia({ reducedMotion: 'reduce' });
  const tabs = reduced.page.getByRole('tablist', { name: 'How the 100 day program works' });
  await tabs.getByRole('tab').first().focus();
  await reduced.page.keyboard.press('End');
  assert.equal(await tabs.getByRole('tab').nth(3).getAttribute('aria-selected'), 'true');
  assert.equal(await reduced.page.locator('[data-how-track]').evaluate(el => getComputedStyle(el.firstElementChild).position), 'relative');
  await position(reduced.page, 0);
  assert.equal(await reduced.page.locator('[data-example="true"]').count(), 3);
  assert.match(await reduced.page.locator('[data-example="true"] [data-message-text]').first().textContent(), /first full game/);
  assert.equal(await reduced.page.locator('[data-example="true"]').first().evaluate(el => getComputedStyle(el).animationName), 'none');
  await reduced.context.close();

  for (const viewport of [{ width: 375, height: 812 }, { width: 320, height: 740 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1496, height: 784 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    const check = await open(viewport, viewport.width < 768);
    const sticky = await check.page.locator('[data-how-track]').evaluate(el => getComputedStyle(el.firstElementChild).position === 'sticky');
    await position(check.page, 3);
    await check.page.waitForTimeout(350);
    const boxes = await check.page.evaluate(() => {
      const panel = document.querySelector('#how-it-works [role="tabpanel"][data-stage="4"]');
      return { pageWidth: document.documentElement.scrollWidth, panel: panel.getBoundingClientRect().toJSON(), people: panel.querySelector('[aria-label="Community profile previews"]').getBoundingClientRect().toJSON() };
    });
    assert.equal(boxes.pageWidth, viewport.width, `No overflow at ${viewport.width} × ${viewport.height}`);
    if (sticky) assert.ok(boxes.panel.bottom <= viewport.height && boxes.people.bottom <= viewport.height, `Short viewport fits ${JSON.stringify({ viewport, boxes })}`);
    else {
      assert.ok(boxes.panel.height >= (viewport.width < 768 ? 550 : 500), 'Natural layout never squeezes the content');
      await panel(check.page, 3).evaluate(el => window.scrollBy({ top: el.getBoundingClientRect().bottom - innerHeight + 24, behavior: 'instant' }));
    }
    await assertImages(check.page);
    assert.equal(await check.page.locator('#how-it-works [role="tabpanel"]').count(), 1, 'Keep the original single transitioning panel');
    if (sticky) {
      const product = await check.page.locator('#how-step-panel > div').first().boundingBox();
      assert.ok(product.height >= 465, `Full product height is preserved: ${JSON.stringify(product)}`);
      const navigation = await check.page.getByRole('tablist').boundingBox();
      assert.ok(navigation.y >= 60 && navigation.y + navigation.height < boxes.panel.y, 'All topics stay above the full panel without overlap');
    }
    await check.page.screenshot({ path: `${output}/responsive-${viewport.width}-${viewport.height}.png` });
    await check.context.close();
  }
  assert.deepEqual(errors, []);
  const delivery = await browser.newContext({ viewport: { width: 1496, height: 784 } });
  const imagePage = await delivery.newPage();
  await imagePage.route('**/_next/image?**', route => route.request().url().includes('how-it-works') ? route.abort() : route.continue());
  await imagePage.goto(base, { waitUntil: 'networkidle' });
  await position(imagePage, 2);
  await assertImages(imagePage);
  const directSource = await imagePage.getByAltText('Personalised drill demonstration and training modules in the Think Different Training app').evaluate(image => image.currentSrc);
  assert.match(directSource, /\/how-it-works\/final-per\.webp$/);
  await delivery.close();
  console.log('Reduced motion, keyboard navigation, seven additional viewports, natural image proportions and failed-optimizer recovery passed.');

  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 800 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 667, height: 375 }]) {
    const check = await open(viewport, true);
    const page = check.page;
    await position(page, 0);
    const nav = page.getByRole('tablist', { name: 'How the 100 day program works' });
    const touchTargets = await nav.getByRole('tab').evaluateAll(tabs => tabs.map(tab => ({ width: tab.clientWidth, height: tab.clientHeight })));
    assert.ok(touchTargets.every(target => target.width >= 44 && target.height >= 44), 'All four topics have phone-sized touch targets');
    assert.equal(await page.getByRole('button', { name: 'Previous program step' }).isDisabled(), true);
    for (let stage = 0; stage < 4; stage++) {
      if (stage) {
        await page.getByRole('button', { name: 'Next program step' }).tap();
        await page.waitForTimeout(700);
      }
      assert.equal(await nav.getByRole('tab').nth(stage).getAttribute('aria-selected'), 'true', 'Native Next tap selects the next scene');
      const layout = await page.locator('#how-it-works').evaluate(el => {
        const tabs = el.querySelector('[role="tablist"]');
        const summary = tabs.nextElementSibling;
        const scene = el.querySelector('[role="tabpanel"]');
        const log = el.querySelector('[role="log"]');
        return { width: document.documentElement.scrollWidth, tabs: tabs.getBoundingClientRect().toJSON(), summary: summary.getBoundingClientRect().toJSON(), scene: scene.getBoundingClientRect().toJSON(), logClipped: log.scrollHeight > log.clientHeight + 1 };
      });
      assert.equal(layout.width, viewport.width, 'Phone and landscape scenes never overflow horizontally');
      assert.ok(layout.tabs.top >= 63 && layout.tabs.bottom <= layout.summary.top + 1, 'Sticky topics sit below the site header, above the full description');
      assert.ok(layout.summary.bottom <= layout.scene.top, 'Description never collides with product preview');
      if (stage < 3) assert.equal(layout.logClipped, false, 'The complete preloaded athlete conversation is visible without an inner scroll');
      await assertImages(page);
      await page.screenshot({ path: `${output}/phone-${viewport.width}-${viewport.height}-step-${stage + 1}.png` });
      if (stage < 3) {
        await page.getByRole('textbox', { name: 'Message Jaiden’s chat demo' }).scrollIntoViewIfNeeded();
        const sticky = await nav.boundingBox();
        assert.ok(Math.abs(sticky.y - 64) < 2, 'Topics remain reachable while reading or messaging');
      }
    }
    assert.equal(await page.getByRole('button', { name: 'Next program step' }).isDisabled(), true);
    for (const name of ['Elijah', 'Andre Narciso', 'Tyler-perry London', 'Tyrell Crawford']) {
      await page.getByRole('button', { name: `View ${name}’s profile` }).tap();
      const overlay = page.locator('#community-profile');
      await overlay.locator('..').dispatchEvent('pointerleave', { pointerType: 'touch' });
      assert.equal(await overlay.getAttribute('aria-hidden'), 'false', 'Touch release keeps the profile open');
      await page.waitForTimeout(350);
      const box = await overlay.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1 && box.y >= 0 && box.y + box.height <= viewport.height + 1, 'Every profile stays fully inside the phone viewport');
      assert.ok(box.y >= await page.locator('header').evaluate(el => el.getBoundingClientRect().bottom), 'Profile stays below the fixed site header');
      assert.ok(await overlay.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.left + 20, r.top + 20)); }), 'Sticky topics cannot cover the top of the profile');
      assert.ok(await page.getByRole('button', { name: 'Close profile preview' }).evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); }), 'The close button is visible and receives touches');
      if (name === 'Tyrell Crawford') await page.screenshot({ path: `${output}/phone-${viewport.width}-${viewport.height}-profile.png` });
      await page.getByRole('button', { name: 'Close profile preview' }).tap();
      assert.equal(await overlay.getAttribute('aria-hidden'), 'true');
    }
    await page.getByRole('button', { name: 'Previous program step' }).tap();
    await page.waitForTimeout(700);
    assert.equal(await nav.getByRole('tab').nth(2).getAttribute('aria-selected'), 'true');
    await nav.getByRole('tab').nth(0).tap();
    await page.waitForTimeout(700);
    const field = page.getByRole('textbox', { name: 'Message Jaiden’s chat demo' });
    assert.equal(await field.getAttribute('enterkeyhint'), 'send');
    assert.equal(await field.evaluate(el => getComputedStyle(el).fontSize), '16px', 'Phone inputs avoid focus zoom');
    await field.fill('I want to make better reads in games');
    await field.press('Enter');
    await page.getByRole('log').locator('a[href="/apply"]').waitFor();
    await page.waitForTimeout(800);
    const logState = await page.getByRole('log').evaluate(el => ({ height: el.clientHeight, bottom: el.scrollHeight - el.clientHeight - el.scrollTop }));
    assert.ok(logState.height <= 421 && logState.bottom < 2, 'New replies stay in a bounded chat and scroll into view');
    await page.setViewportSize({ width: viewport.width, height: 350 });
    await field.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width, 'A keyboard-sized viewport does not squash or overflow the scene');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await nav.getByRole('tab').nth(1).tap();
    assert.equal(await nav.getByRole('tab').nth(1).getAttribute('aria-selected'), 'true');
    assert.equal(await nav.evaluate(el => getComputedStyle(el).position), 'sticky', 'Mobile controls stay reachable with reduced motion');
    await check.context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Six phone/landscape sizes: real topic/Next/Previous taps, sticky navigation, full initial conversations, all touch profiles, dismissal, chat replies, narrow keyboard layouts and reduced motion passed.');
} finally { await browser.close(); }
