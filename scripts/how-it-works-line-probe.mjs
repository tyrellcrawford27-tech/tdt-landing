import assert from 'node:assert/strict';

// Observe rendered geometry every frame while native wheel/touch scrolling runs.
export async function assertLineTracksCircles(page, duration = 220) {
  const result = await page.evaluate(async duration => {
    const section = document.querySelector('#how-it-works');
    const fill = [...section.querySelectorAll('span')].find(span => span.style.getPropertyValue('--line-progress'));
    const tabs = [...section.querySelectorAll('[role="tab"]')];
    const end = performance.now() + duration;
    const mismatches = [];
    let frames = 0;
    await new Promise(resolve => {
      const sample = () => {
        const front = fill.getBoundingClientRect().right;
        const starts = tabs.map(tab => tab.firstElementChild.getBoundingClientRect().left);
        let expected = 0;
        starts.forEach((left, index) => { if (front + .0001 >= left) expected = index; });
        const active = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
        if (active !== expected && mismatches.length < 5) mismatches.push({ front, starts, active, expected });
        frames++;
        if (performance.now() < end) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return { frames, mismatches };
  }, duration);
  assert.ok(result.frames > 1, 'Sample multiple rendered frames during native scrolling');
  assert.deepEqual(result.mismatches, [], 'The active topic matches the visible line touching its circle on every frame');
}
