'use client';

import { useEffect, useRef } from 'react';

// High-frequency monochrome fractalNoise tile (200×200, seamlessly stitched)
// Encoded once at module level — works in both SSR (Node) and browser
const GRAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <filter id="g">
    <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="200" height="200" filter="url(#g)"/>
</svg>`;

const GRAIN_URL = `data:image/svg+xml,${encodeURIComponent(GRAIN_SVG)}`;

export function FilmGrain() {
  const divRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!divRef.current) return;
        const sy = window.scrollY;
        // 0.3 px shift per 100 px scrolled — diagonal so both axes feel alive
        const x = (sy * 0.003).toFixed(2);
        const y = (sy * 0.002).toFixed(2);
        divRef.current.style.backgroundPosition = `${x}px ${y}px`;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={divRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 49,           // above page content, below nav (z-50) + mobile overlay (z-100)
        pointerEvents: 'none',
        opacity: 0.04,
        mixBlendMode: 'overlay',
        backgroundImage: `url("${GRAIN_URL}")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
        willChange: 'background-position',
      }}
    />
  );
}
