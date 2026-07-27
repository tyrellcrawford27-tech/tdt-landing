'use client';

export type ProgramIconName = 'stethoscope' | 'pillbottle' | 'repeat';

// Keyframes live in one place rather than inside the icon, since three icons
// render at once and would otherwise emit three identical <style> blocks.
// Cadence matches the early-bird trigger: a quick burst, then a long rest, so
// the motion catches the eye without reading as a spinner.
export function ProgramIconStyles() {
  return (
    <style>{`
      .pi-part { transform-box: view-box; }

      /* stethoscope — the chestpiece picks up a heartbeat */
      @keyframes pi-pulse {
        0%, 70%, 100% { transform: scale(1);    }
        76%           { transform: scale(1.22); }
        82%           { transform: scale(1);    }
        88%           { transform: scale(1.15); }
        94%           { transform: scale(1);    }
      }
      /* pill bottle — two shakes, like tipping one out */
      @keyframes pi-shake {
        0%, 68%, 100% { transform: rotate(0deg);  }
        74%           { transform: rotate(-8deg); }
        80%           { transform: rotate(7deg);  }
        86%           { transform: rotate(-4deg); }
        92%           { transform: rotate(0deg);  }
      }
      /* repeat — the glyph is 180deg rotationally symmetric, so a half turn
         lands exactly back on itself and the loop is seamless */
      @keyframes pi-spin {
        0%, 66%    { transform: rotate(0deg);   }
        90%, 100%  { transform: rotate(180deg); }
      }

      .pi-on .pi-chest  { animation: pi-pulse 3.2s ease-in-out infinite; }
      .pi-on .pi-bottle { animation: pi-shake 3.2s ease-in-out infinite; }
      .pi-on .pi-repeat { animation: pi-spin  3.2s cubic-bezier(0.65,0,0.35,1) infinite; }

      @media (prefers-reduced-motion: reduce) {
        .pi-on .pi-chest, .pi-on .pi-bottle, .pi-on .pi-repeat { animation: none; }
      }
    `}</style>
  );
}

export function ProgramStepIcon({
  name,
  active,
  className = '',
}: {
  name: ProgramIconName;
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`${active ? 'pi-on' : ''} ${className}`}
    >
      {name === 'stethoscope' && (
        <>
          <circle cx="7" cy="3.8" r="1.5" />
          <circle cx="17" cy="3.8" r="1.5" />
          <path d="M7 5.3v4.2c0 2.7 2.2 4.9 5 4.9" />
          <path d="M17 5.3v4.2c0 2.7-2.2 4.9-5 4.9" />
          <path d="M12 14.4v2.2c0 1.9 1.5 3.4 3.4 3.4" />
          <g className="pi-part pi-chest" style={{ transformOrigin: '17.8px 20px' }}>
            <circle cx="17.8" cy="20" r="2.4" />
            <circle cx="17.8" cy="20" r="0.9" />
          </g>
        </>
      )}

      {name === 'pillbottle' && (
        <g className="pi-part pi-bottle" style={{ transformOrigin: '12px 21px' }}>
          <rect x="8.6" y="2.4" width="6.8" height="3" rx="0.9" />
          <path d="M10.3 3.1v1.6M12 3.1v1.6M13.7 3.1v1.6" />
          <rect x="6.6" y="5.4" width="10.8" height="15.6" rx="2.4" />
          <rect x="8.6" y="11" width="5" height="2.4" rx="1.2" transform="rotate(-22 11.1 12.2)" />
          <rect x="11" y="15.4" width="5" height="2.4" rx="1.2" transform="rotate(18 13.5 16.6)" />
        </g>
      )}

      {name === 'repeat' && (
        <g className="pi-part pi-repeat" style={{ transformOrigin: '12px 12px' }}>
          <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
          <path d="m17 2 4 4-4 4" />
          <path d="M21 13v1a4 4 0 0 1-4 4H3" />
          <path d="m7 22-4-4 4-4" />
        </g>
      )}
    </svg>
  );
}
