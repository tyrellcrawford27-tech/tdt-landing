/**
 * The one cream.
 *
 * This used to be two: the landing page resolved its dark→light flip into
 * #FBF6F2 while the apply flow and dashboard were built on #FAF6F2 — one digit
 * apart, close enough to survive review and far enough to show as a seam where
 * the two surfaces met. Everything is #FBF6F2 now; the landing page won because
 * the flip lerps into it and the browser chrome tracks that lerp.
 *
 * Two places can't import this and must be changed in step:
 *   - `--surface-light` in app/globals.css (paints <body> for the light routes)
 *   - `themeColor` in app/apply/layout.tsx (a viewport export only
 *     accepts a literal)
 *
 * Tailwind arbitrary values in app/page.tsx (`bg-[#FBF6F2]`) are literals too.
 */
export const SURFACE_LIGHT = '#FBF6F2';

/** Same colour, for the rgba() overlays that sit on top of it. */
export const SURFACE_LIGHT_RGB = '251,246,242';
