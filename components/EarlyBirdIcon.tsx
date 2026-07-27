'use client';

// Shared line-art bird used both as the "Early bird pricing" trigger icon and,
// standalone, as a quiet decorative mark. Two quick pecks then a long rest —
// deliberately not a continuous loop, so it reads as a living detail rather
// than a spinner.
export function EarlyBirdIcon({
  size = 15,
  color = '#7A2E1D',
  className = '',
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={className}
    >
      <style>{`
        @keyframes eb-bob {
          0%, 70%, 100% { transform: translate(0, 0)         rotate(0deg);  }
          76%           { transform: translate(-0.3px, 1.7px) rotate(15deg); }
          82%           { transform: translate(0, 0)         rotate(0deg);  }
          88%           { transform: translate(-0.2px, 1.3px) rotate(11deg); }
          94%           { transform: translate(0, 0)         rotate(0deg);  }
        }
        .eb-head {
          transform-box: view-box;
          transform-origin: 13.6px 10.4px;
          animation: eb-bob 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .eb-head { animation: none; }
        }
      `}</style>
      <path d="M13.2 10.4C9 11.6 5.6 14.8 5.6 18.2c0 1.5 1.2 2.5 2.8 2.5H12c3.2 0 5.6-2.5 5.6-5.7v-4.3" />
      <path d="M5.7 17.6 1.8 19.6" />
      <path d="M9.2 14.6c1.7 1.9 3.8 2.9 6 3" />
      <g className="eb-head">
        <circle cx="15.5" cy="8" r="2.8" />
        <path d="m18.3 7.5 3.3 1.2-3.3 1.2" />
      </g>
    </svg>
  );
}
