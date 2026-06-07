'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const BASE_CHARS   = 'THINK DIFFERENT'.split('');
const EXTRA        = ['L', 'Y'];
const FULL_TEXT    = 'THINK DIFFERENTLY'; // measure with full text so hover never overflows
const MEASURE_SIZE = 100;                 // arbitrary base size for the measuring pass

// Near-invisible on #FBF6F2 cream — a watermark that comes alive on hover
const COLOR_REST  = 'rgba(26, 15, 10, 0.11)';
const COLOR_HOVER = 'rgba(26, 15, 10, 0.28)';

export function FooterText() {
  const [hovered, setHovered]   = useState(false);
  const [filterOn, setFilterOn] = useState(false);
  const [fontSize, setFontSize] = useState(MEASURE_SIZE);

  const containerRef = useRef<HTMLDivElement>(null);
  const measuringRef = useRef<HTMLSpanElement>(null);
  const turbRef      = useRef<SVGFETurbulenceElement>(null);
  const dispRef      = useRef<SVGFEDisplacementMapElement>(null);
  const rafRef       = useRef<number>(0);

  // Fit font size to container width based on the full "THINK DIFFERENTLY" string
  useEffect(() => {
    const fit = () => {
      if (!containerRef.current || !measuringRef.current) return;
      const cw = containerRef.current.offsetWidth;
      const mw = measuringRef.current.offsetWidth;
      if (mw > 0) setFontSize(Math.floor((cw / mw) * MEASURE_SIZE));
    };
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    fit();
    return () => ro.disconnect();
  }, []);

  const SHARED: React.CSSProperties = {
    display: 'inline-block',
    fontSize: `${fontSize}px`,
    fontWeight: 800,
    lineHeight: `${Math.round(fontSize * 1.2)}px`,
    letterSpacing: '-0.02em',
    willChange: 'transform, color',
  };

  // Pond-ripple distortion — damped sine wave, ~4 oscillations decaying over 2.6 s
  const runFilter = useCallback(() => {
    setFilterOn(true);
    cancelAnimationFrame(rafRef.current);
    const t0  = performance.now();
    const DUR = 2600;

    function tick(now: number) {
      const t = Math.min((now - t0) / DUR, 1);

      // Exponential envelope × multi-cycle sine = damped ripple rings
      const envelope  = Math.exp(-t * 4.5);              // sharp hit, then fade
      const wave      = Math.sin(t * Math.PI * 9 - 0.5); // ~4.5 full cycles
      const intensity = envelope * wave;                  // positive & negative swings

      // Frequency drifts lower as ripple "travels outward"
      const freqBase = 0.013 - t * 0.010;                // 0.013 → 0.003
      const freqMod  = Math.abs(intensity) * 0.009;
      const fx = Math.max(0.0008, freqBase + freqMod).toFixed(5);
      const fy = Math.max(0.0005, (freqBase + freqMod) * 0.5).toFixed(5);

      // Displacement: big at impact, oscillates then dies
      const scaleVal = (Math.abs(intensity) * 72).toFixed(1);

      turbRef.current?.setAttribute('baseFrequency', `${fx} ${fy}`);
      dispRef.current?.setAttribute('scale', scaleVal);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        turbRef.current?.setAttribute('baseFrequency', '0 0');
        dispRef.current?.setAttribute('scale', '0');
        setFilterOn(false);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onEnter = () => { setHovered(true);  runFilter(); };
  const onLeave = () => { setHovered(false); runFilter(); };
  const onClick = () => runFilter(); // "throw the rock"

  return (
    <>
      {/* Gentle breathing shimmer at rest */}
      <style>{`
        @keyframes tdt-breathe {
          0%, 100% { opacity: 0.75; }
          50%       { opacity: 1;   }
        }
        .tdt-wrap { animation: tdt-breathe 9s ease-in-out infinite; }
        .tdt-wrap:hover { animation: none; opacity: 1; }
      `}</style>

      {/* Hidden SVG displacement filter — wide region so ripple can spread far */}
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <filter id="tdt-liq" x="-30%" y="-60%" width="160%" height="220%">
            <feTurbulence
              ref={turbRef}
              type="fractalNoise"
              baseFrequency="0 0"
              numOctaves="5"
              seed="9"
              result="noise"
            />
            <feDisplacementMap
              ref={dispRef}
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Invisible measuring span — sized at MEASURE_SIZE so we can ratio-scale */}
      <span
        ref={measuringRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          fontSize: `${MEASURE_SIZE}px`,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        {FULL_TEXT}
      </span>

      <div
        ref={containerRef}
        className="tdt-wrap select-none cursor-default"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: `${Math.round(fontSize * 1.2)}px`,
          filter: filterOn ? 'url(#tdt-liq)' : 'none',
        }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
      >
        {/* THINK DIFFERENT — wave + colour shift on hover */}
        {BASE_CHARS.map((char, i) => {
          const stagger = (i / BASE_CHARS.length) * 0.13;
          const waveY   = hovered ? Math.sin(i * 0.85 + 0.6) * 5 : 0;
          return (
            <span
              key={i}
              style={{
                ...SHARED,
                color: hovered ? COLOR_HOVER : COLOR_REST,
                transform: `translateY(${waveY}px) scale(${hovered ? 1.018 : 1})`,
                transition: [
                  `transform 0.9s  cubic-bezier(0.25,0.46,0.45,0.94) ${stagger}s`,
                  `color     0.65s ease                               ${stagger * 0.4}s`,
                ].join(', '),
              }}
            >
              {char === ' ' ? ' ' : char}
            </span>
          );
        })}

        {/* LY — expand into layout space so centred row rebalances */}
        {EXTRA.map((char, i) => (
          <span
            key={`ly-${i}`}
            style={{
              ...SHARED,
              color:      COLOR_HOVER,
              maxWidth:   hovered ? `${fontSize}px` : '0px',
              overflow:   'hidden',
              whiteSpace: 'nowrap',
              opacity:    hovered ? 1 : 0,
              transform:  hovered
                ? 'translateY(0px) scale(1)'
                : 'translateY(28px) scale(0.85)',
              transition: [
                `max-width 0.55s cubic-bezier(0.16,1,0.3,1)        ${0.18 + i * 0.06}s`,
                `opacity   0.55s cubic-bezier(0.25,0.46,0.45,0.94) ${0.26 + i * 0.09}s`,
                `transform 0.85s cubic-bezier(0.16,1,0.3,1)        ${0.20 + i * 0.09}s`,
              ].join(', '),
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </>
  );
}
