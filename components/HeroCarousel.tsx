'use client';

import { useEffect, useRef, useState } from 'react';

export type HeroSlide = {
  /** Full-size webp (1900w). */
  src: string;
  /** Narrow-viewport webp (1000w) — served via srcSet so phones don't pull the big one. */
  srcSm?: string;
  alt: string;
  /** object-position for the cover crop, e.g. '50% 35%' to favour faces. */
  objectPosition?: string;
  /** object-position for mobile only (md breakpoint and below). */
  objectPositionSm?: string;
  /**
   * Scales how far above the cover fit this slide's drift sits, so a tightly
   * framed shot can sit back while the rest keep the fuller push-in. 1 is the
   * default range (1.06→1.17); 0 pins the slide flat against cover with no
   * movement at all. Cover is the floor — a full-bleed hero can't go wider
   * than the image's own width, so this only recovers the drift's own zoom.
   */
  zoom?: number;
};

/** How long a slide sits fully visible before the next crossfade starts. */
const HOLD_MS = 5000;
/** Crossfade length. Long and slow — the fade should read as a dissolve, not a cut. */
const FADE_MS = 1400;
/** The drift runs across the hold plus the fade on either side, so the image is
 *  never still: it's already moving when it fades in and still moving as it goes. */
const DRIFT_MS = HOLD_MS + FADE_MS * 2;

/** Each slide gets its own path — alternating push-in / pull-back and opposite
 *  pan directions, so two slides in a row never move the same way. Held as
 *  numbers rather than transform strings so a slide's `zoom` can scale the
 *  whole path: the pan is always a fraction of the overscan the scale buys, so
 *  shrinking both together keeps the edges covered. */
type Drift = { s: [number, number]; x: [number, number]; y: [number, number] };
const DRIFTS: Drift[] = [
  { s: [1.06, 1.16], x: [-1.4, 1.2], y: [0.8, -1.0] },
  { s: [1.16, 1.06], x: [1.4, -1.2], y: [-0.9, 0.9] },
  { s: [1.07, 1.17], x: [1.3, -1.3], y: [1.0, -0.7] },
  { s: [1.17, 1.07], x: [-1.2, 1.3], y: [-1.0, 0.8] },
];

/** Build one end of a drift, with the slide's zoom applied to both the scale
 *  above cover and the pan that rides on it. */
function driftTransform(index: number, end: 0 | 1, zoom = 1) {
  const d = DRIFTS[index % DRIFTS.length];
  const scale = 1 + (d.s[end] - 1) * zoom;
  const x = d.x[end] * zoom;
  const y = d.y[end] * zoom;
  return `scale(${scale.toFixed(4)}) translate3d(${x.toFixed(3)}%, ${y.toFixed(3)}%, 0)`;
}

export default function HeroCarousel({
  slides,
  paused = false,
  className = '',
}: {
  slides: HeroSlide[];
  /** Freeze the rotation (e.g. while the hero video is playing). */
  paused?: boolean;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Advance. Held off while paused or while the tab is in the background —
  // a backgrounded tab would otherwise burn through slides and land on a
  // random one the moment the user comes back.
  useEffect(() => {
    if (paused || slides.length < 2) return;
    let timer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timer = setTimeout(() => setIndex((i) => (i + 1) % slides.length), HOLD_MS);
    };
    const onVisibility = () => {
      clearTimeout(timer);
      if (!document.hidden) schedule();
    };

    if (!document.hidden) schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [index, paused, slides.length]);

  // Restart the drift on whichever slide just became active. Driven straight on
  // the DOM node rather than through state so the reset-then-animate can happen
  // inside one frame — React would batch it into a single paint and the
  // transition would never run.
  useEffect(() => {
    const el = imgRefs.current[index];
    if (!el) return;
    const zoom = slides[index]?.zoom ?? 1;
    if (reduced) {
      el.style.transition = 'none';
      el.style.transform = `scale(${(1 + 0.04 * zoom).toFixed(4)})`;
      return;
    }
    el.style.transition = 'none';
    el.style.transform = driftTransform(index, 0, zoom);
    void el.offsetWidth; // flush the reset before arming the transition
    el.style.transition = `transform ${DRIFT_MS}ms linear`;
    el.style.transform = driftTransform(index, 1, zoom);
  }, [index, reduced, slides]);

  // Warm the next slide well before it's needed so the crossfade never reveals
  // a half-decoded image.
  useEffect(() => {
    if (slides.length < 2) return;
    const next = slides[(index + 1) % slides.length];
    const img = new Image();
    if (next.srcSm) img.srcset = `${next.srcSm} 1000w, ${next.src} 1900w`;
    img.sizes = '100vw';
    img.src = next.src;
  }, [index, slides]);

  return (
    // `isolate` keeps the per-slide z-indexes below in their own stacking
    // context — without it the active layer's z-index outranks the hero's
    // gradient overlay and headline, which are positioned at z-auto.
    <div className={`absolute inset-0 overflow-hidden isolate ${className}`}>
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0"
          style={{
            opacity: i === index ? 1 : 0,
            transition: `opacity ${reduced ? 300 : FADE_MS}ms cubic-bezier(0.45, 0, 0.2, 1)`,
            // Keep the outgoing slide above nothing but the ones behind it, so
            // a 3+ slide deck never flashes a stale layer mid-dissolve.
            zIndex: i === index ? 2 : 1,
          }}
        >
          <img
            ref={(el) => {
              imgRefs.current[i] = el;
            }}
            src={slide.src}
            srcSet={slide.srcSm ? `${slide.srcSm} 1000w, ${slide.src} 1900w` : undefined}
            sizes="100vw"
            alt={slide.alt}
            draggable={false}
            fetchPriority={i === 0 ? 'high' : 'auto'}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-cover select-none"
            style={{
              objectPosition: isMobile && slide.objectPositionSm ? slide.objectPositionSm : slide.objectPosition ?? 'center',
              willChange: 'transform',
              // Start where this slide's drift starts, so the first paint and
              // the first frame of the animation are the same framing.
              transform: driftTransform(i, 0, slide.zoom ?? 1),
            }}
          />
        </div>
      ))}
    </div>
  );
}
