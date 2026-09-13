import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeTopicForLine, progressionLineProgress } from '../lib/howItWorksProgress.ts';

test('line reaches each topic while leaving travel after the final marker', () => {
  for (const marker of [.8, .85, .9]) {
    assert.equal(progressionLineProgress(0, marker), 0);
    assert.ok(Math.abs(progressionLineProgress(.25, marker) - marker / 3) < 1e-12);
    assert.ok(Math.abs(progressionLineProgress(.5, marker) - marker * 2 / 3) < 1e-12);
    assert.equal(progressionLineProgress(.75, marker), marker);
    assert.ok(progressionLineProgress(.875, marker) > marker);
    assert.equal(progressionLineProgress(1, marker), 1);
  }
});

test('line stays continuous and advances throughout the last quarter', () => {
  const marker = .85;
  assert.ok(Math.abs(progressionLineProgress(.750001, marker) - progressionLineProgress(.749999, marker)) < .00001);
  let previous = 0;
  for (let i = 0; i <= 1000; i++) {
    const next = progressionLineProgress(i / 1000, marker);
    assert.ok(next >= previous && next <= 1);
    previous = next;
  }
  assert.ok(progressionLineProgress(.99, marker) > .99);
});

test('overscroll is clamped at the start and end of the line', () => {
  assert.equal(progressionLineProgress(-.5, .85), 0);
  assert.equal(progressionLineProgress(1.5, .85), 1);
});

test('each circle activates exactly when the displayed line touches its left edge', () => {
  // Different circle sizes and track widths on desktop and mobile.
  for (const starts of [[-.008, .275, .558, .841], [-.06, .224, .51, .796]]) {
    assert.equal(activeTopicForLine(0, starts), 0);
    for (let index = 1; index < starts.length; index++) {
      assert.equal(activeTopicForLine(starts[index] - .000001, starts), index - 1);
      assert.equal(activeTopicForLine(starts[index], starts), index);
      assert.equal(activeTopicForLine(starts[index] + .000001, starts), index);
    }
    assert.equal(activeTopicForLine(1, starts), 3);
  }
});

test('activation follows the visible eased line in both directions, not the scroll target', () => {
  const starts = [0, .275, .558, .841];
  const forwardFrames = [.274, .2749, .275, .28, .56, .85, 1];
  assert.deepEqual(forwardFrames.map(front => activeTopicForLine(front, starts)), [0, 0, 1, 1, 2, 3, 3]);
  assert.deepEqual([...forwardFrames].reverse().map(front => activeTopicForLine(front, starts)), [3, 3, 2, 1, 1, 0, 0]);
});
