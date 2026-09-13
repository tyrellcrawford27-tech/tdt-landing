const clamp = (value: number) => Math.max(0, Math.min(1, value));

// Reach the last topic at 75% of the sticky travel, then use the final
// quarter to fill its trailing line before the page resumes normal scrolling.
export function progressionLineProgress(scrollProgress: number, lastMarkerFraction: number): number {
  const progress = clamp(scrollProgress);
  const marker = clamp(lastMarkerFraction);
  return progress <= .75
    ? progress / .75 * marker
    : marker + (progress - .75) / .25 * (1 - marker);
}

// A topic becomes active when the visible fill touches the circle's near edge,
// not when raw scroll reaches a chapter boundary or the circle's centre.
export function activeTopicForLine(displayedProgress: number, markerStartFractions: readonly number[]): number {
  const front = clamp(displayedProgress);
  let active = 0;
  for (let index = 1; index < markerStartFractions.length; index++) {
    if (front + Number.EPSILON * 4 >= markerStartFractions[index]) active = index;
  }
  return active;
}
