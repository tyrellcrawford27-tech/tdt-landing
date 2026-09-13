import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { assertLineTracksCircles } from './how-it-works-line-probe.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {}) });
const base = process.env.TDT_TEST_URL || 'http://localhost:3000';
const output = process.env.TDT_SCREENSHOT_DIR || '/tmp/tdt-desktop-scroll';
await mkdir(output, { recursive: true });

try {
  for (const viewport of [{ width: 1366, height: 600 }, { width: 1366, height: 650 }, { width: 1440, height: 700 }, { width: 1280, height: 720 }, { width: 1440, height: 759 }, { width: 768, height: 650 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    const track = page.locator('[data-how-track]');
    await track.waitFor();
    assert.equal(await track.evaluate(el => getComputedStyle(el.firstElementChild).position), 'sticky', `Scroll progression must not be disabled at ${viewport.width} × ${viewport.height}`);
    await track.evaluate(el => window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - parseFloat(getComputedStyle(el.firstElementChild).top) + 2, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('#how-tab-0').getAttribute('aria-selected') === 'true');
    const wheel = async delta => {
      const probe = assertLineTracksCircles(page);
      await page.mouse.wheel(0, delta);
      await probe;
    };
    const seen = new Set();
    for (let attempt = 0; !seen.has(3) && attempt < 100; attempt++) {
      const stage = await page.locator('#how-step-panel').getAttribute('data-stage');
      const boxes = await page.locator('#how-step-panel').evaluate(el => ({ panel: el.getBoundingClientRect().toJSON(), product: el.firstElementChild.getBoundingClientRect().toJSON(), interaction: el.lastElementChild.getBoundingClientRect().toJSON(), nav: el.parentElement.querySelector('[role="tablist"]').getBoundingClientRect().toJSON(), width: document.documentElement.scrollWidth }));
      assert.equal(boxes.width, viewport.width, 'No horizontal overflow');
      assert.ok(boxes.nav.top >= 63 && boxes.nav.bottom <= boxes.panel.top + 1, 'All topics remain above the panel');
      assert.ok(boxes.panel.bottom <= viewport.height + 1 && boxes.product.bottom <= boxes.panel.bottom && boxes.interaction.bottom <= boxes.panel.bottom, 'The complete pinned scene fits the short browser window');
      if (!seen.has(Number(stage) - 1)) {
        await page.waitForTimeout(750);
        for (const image of await page.locator('#how-step-panel img:visible').all()) {
          await image.evaluate(image => image.decode());
          assert.ok(await image.evaluate(image => Math.abs(image.naturalWidth / image.naturalHeight - image.clientWidth / image.clientHeight) < .01), 'Product screenshots remain proportional');
        }
        if (stage === '4') {
          const people = await page.locator('[aria-label="Community profile previews"]').boundingBox();
          assert.ok(people.y + people.height <= boxes.panel.bottom, 'All four community cards fit');
        } else {
          const composer = await page.getByRole('textbox', { name: 'Message Jaiden’s chat demo' }).boundingBox();
          assert.ok(composer.y >= boxes.panel.top && composer.y + composer.height <= boxes.panel.bottom, 'The desktop composer stays visible');
        }
        seen.add(Number(stage) - 1);
        await page.screenshot({ path: `${output}/${viewport.width}-${viewport.height}-stage-${stage}.png` });
      }
      await page.mouse.move(boxes.product.x + boxes.product.width / 2, boxes.product.y + boxes.product.height / 2);
      await wheel(120);
    }
    assert.deepEqual([...seen], [0, 1, 2, 3], 'Native wheel scrolling advances all four stages in order');
    await page.waitForTimeout(750);
    const lineProgress = () => page.locator('#how-it-works').evaluate(el => Number([...el.querySelectorAll('span')].find(span => span.style.getPropertyValue('--line-progress'))?.style.getPropertyValue('--line-progress')));
    const fourthStageProgress = await lineProgress();
    assert.ok(fourthStageProgress > .7 && fourthStageProgress < 1, 'The line leaves room to keep moving after step four');
    for (let attempt = 0; await lineProgress() < .985 && attempt < 30; attempt++) {
      await wheel(120);
    }
    await page.waitForTimeout(750);
    assert.ok(await lineProgress() > .985 && await lineProgress() > fourthStageProgress, 'The spine continues past step four toward the natural page handoff');
    for (let attempt = 0; await page.locator('#how-step-panel').getAttribute('data-stage') === '4' && attempt < 30; attempt++) {
      await wheel(-120);
    }
    assert.equal(await page.locator('#how-step-panel').getAttribute('data-stage'), '3', 'Native reverse scrolling works');
    await page.getByRole('tab', { name: '2. See what Jaiden sees', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#how-tab-1').getAttribute('aria-selected') === 'true');
    await page.waitForTimeout(750);
    await page.getByRole('textbox', { name: 'Message Jaiden’s chat demo' }).fill('I want to make better reads in games');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await page.locator('#how-step-panel a[href="/apply"]').waitFor();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${viewport.width} × ${viewport.height}: frame-exact circle activation, native forward/backward progression, visible topics and full scene, proportional images and desktop chat passed.`);
  }
} finally { await browser.close(); }
