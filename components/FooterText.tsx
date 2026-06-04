'use client';

import { useMemo, useState } from 'react';

const TEXT = 'THINK DIFFERENT';

interface CharData {
  char: string;
  tx: number;   // scatter destination X
  ty: number;   // scatter destination Y
  rot: number;  // rotation at destination
  scale: number;
  duration: number;
  delay: number;
}

export function FooterText() {
  const [hovered, setHovered] = useState(false);

  // Stable random destinations — computed once on mount
  const chars: CharData[] = useMemo(() =>
    TEXT.split('').map((char) => ({
      char,
      tx: (Math.random() - 0.5) * 700,
      ty: (Math.random() - 0.5) * 460,
      rot: (Math.random() - 0.5) * 180,
      scale: 0.2 + Math.random() * 0.4,
      duration: 0.45 + Math.random() * 0.55,
      delay: Math.random() * 0.07,
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  return (
    <div
      className="flex items-center justify-end select-none cursor-default overflow-visible"
      style={{
        width: '1116px',
        height: '154px',
        // Blur reduced from 10px → 4px
        filter: 'blur(4px)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {chars.map(({ char, tx, ty, rot, scale, duration, delay }, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            fontSize: '128px',
            fontWeight: 700,
            lineHeight: '154px',
            letterSpacing: '-0.02em',
            // Per-letter gradient — vertical gradient looks identical per-letter
            background: 'linear-gradient(360deg, rgba(0,0,0,0.4) 0%, #FBF6F2 82.21%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            // Scatter on hover, reassemble on leave
            transform: hovered
              ? `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scale})`
              : 'translate(0px, 0px) rotate(0deg) scale(1)',
            opacity: hovered ? 0 : 1,
            transition: [
              `transform ${duration}s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s`,
              `opacity ${duration * 0.65}s ease ${delay}s`,
            ].join(', '),
          }}
        >
          {/* Non-breaking space so space chars keep their width */}
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </div>
  );
}
