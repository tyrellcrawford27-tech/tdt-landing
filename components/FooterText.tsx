'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const REST_TEXT    = 'THINK DIFFERENT';
const HOVER_TEXT   = 'BE DIFFERENT';
const MEASURE_TEXT = REST_TEXT; // longer string sets the container width
const MEASURE_SIZE = 100;

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

  // Fit font to container using the longer (hover) string as the ruler
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
    whiteSpace: 'pre',
    willChange: 'transform, opacity',
  };

  // Pond-ripple SVG distortion — same mechanic as before
  const runFilter = useCallback(() => {
    setFilterOn(true);
    cancelAnimationFrame(rafRef.current);
    const t0  = performance.now();
    const DUR = 2600;

    function tick(now: number) {
      const t         = Math.min((now - t0) / DUR, 1);
      const envelope  = Math.exp(-t * 4.5);
      const wave      = Math.sin(t * Math.PI * 9 - 0.5);
      const intensity = envelope * wave;
      const freqBase  = 0.013 - t * 0.010;
      const freqMod   = Math.abs(intensity) * 0.009;
      const fx        = Math.max(0.0008, freqBase + freqMod).toFixed(5);
      const fy        = Math.max(0.0005, (freqBase + freqMod) * 0.5).toFixed(5);
      const scaleVal  = (Math.abs(intensity) * 72).toFixed(1);
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
  const onClick = () => runFilter();

  return (
    <>
      <style>{`
        @keyframes tdt-breathe {
          0%, 100% { opacity: 0.75; }
          50%       { opacity: 1;   }
        }
        .tdt-wrap { animation: tdt-breathe 9s ease-in-out infinite; }
        .tdt-wrap:hover { animation: none; opacity: 1; }
      `}</style>

      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <defs>
          <filter id="tdt-liq" x="-30%" y="-60%" width="160%" height="220%">
            <feTurbulence ref={turbRef} type="fractalNoise" baseFrequency="0 0" numOctaves="5" seed="9" result="noise" />
            <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Invisible ruler — always measures the longer hover string.
          Wrapped in a zero-size clipped box so the 1000px+ span never
          extends the page's scrollable area (was causing horizontal
          scroll on mobile). */}
      <span aria-hidden="true" style={{ display: 'block', position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <span
          ref={measuringRef}
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
          {MEASURE_TEXT}
        </span>
      </span>

      <div
        ref={containerRef}
        className="tdt-wrap select-none cursor-default"
        style={{
          position: 'relative',
          width: '100%',
          height: `${Math.round(fontSize * 1.2)}px`,
          filter: filterOn ? 'url(#tdt-liq)' : 'none',
        }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
      >
        {/* ── REST: "THINK DIFFERENT" — fades out as a unit on hover ── */}
        <div
          aria-hidden={hovered}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: hovered ? 0 : 1,
            transform: hovered ? 'translateY(10px)' : 'translateY(0)',
            transition: 'opacity 0.32s ease, transform 0.42s cubic-bezier(0.2,0,0,1)',
            pointerEvents: 'none',
          }}
        >
          {REST_TEXT.split('').map((char, i) => (
            <span key={i} style={{ ...SHARED, color: COLOR_REST }}>
              {char === ' ' ? ' ' : char}
            </span>
          ))}
        </div>

        {/* ── HOVER: "BUILT IN THE DARK" — staggers up char by char ── */}
        <div
          aria-hidden={!hovered}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {HOVER_TEXT.split('').map((char, i) => {
            const stagger = (i / HOVER_TEXT.length) * 0.18;
            const waveY   = hovered ? Math.sin(i * 0.72 + 0.5) * 4 : 0;
            return (
              <span
                key={i}
                style={{
                  ...SHARED,
                  color: COLOR_HOVER,
                  opacity: hovered ? 1 : 0,
                  transform: `translateY(${hovered ? waveY : -14}px) scale(${hovered ? 1.015 : 0.95})`,
                  transition: [
                    `opacity   0.48s cubic-bezier(0.2,0,0,1) ${stagger}s`,
                    `transform 0.60s cubic-bezier(0.2,0,0,1) ${stagger}s`,
                  ].join(', '),
                }}
              >
                {char === ' ' ? ' ' : char}
              </span>
            );
          })}
        </div>
      </div>
    </>
  );
}
