'use client';

import { useState, useEffect, useRef } from 'react';

const LIQUID = '#EFE0D5'; // warm off-white — reads as a body of liquid against #FAF6F2

export function PricingPopover() {
  const [open, setOpen]           = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [spots, setSpots]         = useState<number | null>(null);
  const [spotsLoading, setSpots_] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    setMounted(true);
    setOpen(true);
    setSpots(null);
    setSpots_(true);
    fetch('/api/early-pricing-spots')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.remaining === 'number') setSpots(d.remaining); })
      .catch(() => {})
      .finally(() => setSpots_(false));
  };

  // Keep the card mounted until its close animation finishes
  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(t);
  }, [open, mounted]);

  // Dismiss on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-fit">
      <style>{`
        /* ── shell: stretch tall & narrow, then spring wide ── */
        @keyframes lg-blob-in {
          0%   { opacity: 0; transform: translateY(-16px) scale(0.30, 0.24); }
          32%  { opacity: 1; transform: translateY(-5px)  scale(0.55, 0.88); }
          58%  { opacity: 1; transform: translateY(0)     scale(1.05, 1.05); }
          78%  { transform: scale(0.982, 0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1, 1); }
        }
        @keyframes lg-blob-out {
          0%   { opacity: 1; transform: scale(1, 1); }
          100% { opacity: 0; transform: translateY(-12px) scale(0.42, 0.34); }
        }
        /* ── neck: extends, thins, pinches off ── */
        @keyframes lg-neck-in {
          0%   { transform: scaleX(0.15) scaleY(0);   }
          22%  { transform: scaleX(1)    scaleY(1);   }
          52%  { transform: scaleX(0.62) scaleY(1);   }
          100% { transform: scaleX(0)    scaleY(0.9); }
        }
        @keyframes lg-neck-out {
          0%   { transform: scaleX(0)   scaleY(0.9); }
          40%  { transform: scaleX(0.8) scaleY(1);   }
          100% { transform: scaleX(0)   scaleY(0);   }
        }
        @keyframes lg-anchor { 0%,100% { opacity: 0; } 18%,60% { opacity: 1; } }
        /* liquid reads strongly through the morph, then recedes under the glass */
        @keyframes lg-veil-in  { 0%,52% { opacity: 0.94; } 100% { opacity: 0.26; } }
        @keyframes lg-veil-out { 0% { opacity: 0.26; } 30%,100% { opacity: 0.9; } }
        @keyframes lg-fade-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lg-fade-out { from { opacity: 1; } to { opacity: 0; } }
        /* ── content settles after the shell lands ── */
        @keyframes lg-content {
          from { opacity: 0; transform: translateY(8px); filter: blur(3px); }
          to   { opacity: 1; transform: translateY(0);   filter: blur(0);   }
        }
        /* ── one-shot specular sweep ── */
        @keyframes lg-sheen {
          0%   { transform: translateX(-130%) skewX(-18deg); opacity: 0;    }
          28%  { opacity: 0.75; }
          100% { transform: translateX(230%)  skewX(-18deg); opacity: 0;    }
        }
        @keyframes lg-dot { 0%,100% { opacity: 0.25; } 50% { opacity: 0.9; } }

        .lg-goo   { filter: url(#lg-goo); will-change: transform, opacity; }
        .lg-blob  { transform-origin: 44px 0; will-change: transform; }
        .lg-neck  { transform-origin: center top; will-change: transform; }

        .lg-pop[data-state='in']  .lg-blob   { animation: lg-blob-in  0.62s cubic-bezier(0.22, 1.1, 0.36, 1) both; }
        .lg-pop[data-state='in']  .lg-neck   { animation: lg-neck-in  0.52s cubic-bezier(0.4, 0, 0.2, 1) both; }
        .lg-pop[data-state='in']  .lg-anchor { animation: lg-anchor   0.52s linear both; }
        .lg-pop[data-state='in']  .lg-goo    { animation: lg-veil-in  0.62s cubic-bezier(0.4,0,0.2,1) both; }
        .lg-pop[data-state='in']  .lg-glass  { animation: lg-fade-in  0.34s cubic-bezier(0.4,0,0.2,1) 0.16s both; }
        .lg-pop[data-state='in']  .lg-sheen  { animation: lg-sheen    0.95s cubic-bezier(0.3,0,0.2,1) 0.20s both; }
        .lg-pop[data-state='in']  .lg-body > * { animation: lg-content 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .lg-pop[data-state='in']  .lg-body > *:nth-child(1) { animation-delay: 0.21s; }
        .lg-pop[data-state='in']  .lg-body > *:nth-child(2) { animation-delay: 0.25s; }
        .lg-pop[data-state='in']  .lg-body > *:nth-child(3) { animation-delay: 0.29s; }
        .lg-pop[data-state='in']  .lg-body > *:nth-child(4) { animation-delay: 0.33s; }
        .lg-pop[data-state='in']  .lg-body > *:nth-child(5) { animation-delay: 0.37s; }

        .lg-pop[data-state='out'] .lg-blob   { animation: lg-blob-out 0.28s cubic-bezier(0.5, 0, 0.75, 0) both; }
        .lg-pop[data-state='out'] .lg-neck   { animation: lg-neck-out 0.24s cubic-bezier(0.5, 0, 0.75, 0) both; }
        .lg-pop[data-state='out'] .lg-goo    { animation: lg-veil-out 0.28s ease-out both; }
        .lg-pop[data-state='out'] .lg-glass  { animation: lg-fade-out 0.18s ease-out both; }
        .lg-pop[data-state='out'] .lg-body   { animation: lg-fade-out 0.12s ease-out both; }
        .lg-pop[data-state='out'] { pointer-events: none; }

        @media (prefers-reduced-motion: reduce) {
          .lg-pop[data-state='in']  .lg-blob,
          .lg-pop[data-state='in']  .lg-glass,
          .lg-pop[data-state='in']  .lg-body > * { animation: lg-fade-in 0.2s both; }
          .lg-pop .lg-neck, .lg-pop .lg-anchor, .lg-pop .lg-sheen { display: none; }
        }
      `}</style>

      {/* Alpha-threshold filter — blurs then re-sharpens so overlapping shapes fuse */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
        <defs>
          <filter id="lg-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
            <feColorMatrix in="b" type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
          </filter>
        </defs>
      </svg>

      <button
        onClick={toggle}
        aria-expanded={open}
        className="text-[14px] font-medium tracking-[-0.02em] cursor-pointer transition-opacity duration-200 hover:opacity-70"
        style={{ color: '#B34929', background: 'none', border: 'none', padding: 0 }}
      >
        Questions about pricing?
      </button>

      {mounted && (
        <div
          className="lg-pop absolute left-0 top-full z-50 w-[300px]"
          style={{ paddingTop: 16 }}
          data-state={open ? 'in' : 'out'}
        >
          {/* Gooey silhouette — carries the morph */}
          <div className="lg-goo pointer-events-none absolute inset-0" aria-hidden>
            <div className="lg-anchor absolute rounded-full" style={{ left: 24, top: -9, width: 48, height: 14, background: LIQUID }} />
            <div className="lg-neck   absolute rounded-full" style={{ left: 33, top: -4, width: 30, height: 26, background: LIQUID }} />
            <div className="lg-blob   absolute rounded-[20px]" style={{ left: 0, top: 16, right: 0, bottom: 0, background: LIQUID }} />
          </div>

          {/* Glass card */}
          <div
            className="lg-glass relative overflow-hidden rounded-[20px]"
            style={{
              background: 'linear-gradient(158deg, rgba(255,255,255,0.80) 0%, rgba(255,251,247,0.62) 52%, rgba(255,246,240,0.70) 100%)',
              backdropFilter: 'blur(26px) saturate(185%)',
              WebkitBackdropFilter: 'blur(26px) saturate(185%)',
              boxShadow: [
                'inset 0 1px 0 rgba(255,255,255,0.95)',
                'inset 0 0 0 1px rgba(255,255,255,0.55)',
                'inset 0 -14px 26px -18px rgba(179,73,41,0.22)',
                '0 1px 1px rgba(60,25,10,0.04)',
                '0 8px 18px -8px rgba(60,25,10,0.10)',
                '0 26px 52px -14px rgba(60,25,10,0.20)',
              ].join(', '),
            }}
          >
            {/* specular corner + travelling sheen */}
            <div className="pointer-events-none absolute inset-0" aria-hidden
              style={{ background: 'linear-gradient(140deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.18) 24%, rgba(255,255,255,0) 46%)' }} />
            <div className="lg-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3" aria-hidden
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)' }} />

            <div className="lg-body relative flex flex-col gap-[10px] p-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em]" style={{ color: '#B34929' }}>
                Early Pricing
              </span>
              <p className="text-[17px] font-bold leading-snug tracking-[-0.02em] text-[#1A0F00]">
                The first four spots cost less.
              </p>
              <p className="text-[13px] leading-[19px] tracking-[-0.01em] text-black/55">
                Cohort 1 is $1,000, but the first four applicants approved get in for $800.
                Clicking this doesn&apos;t reserve your spot — applying and getting accepted does.
              </p>

              {spotsLoading ? (
                <span className="flex items-center gap-[6px] text-[12px] font-medium tracking-[-0.01em] text-black/35">
                  <span className="h-[5px] w-[5px] rounded-full" style={{ background: '#B34929', animation: 'lg-dot 1.1s ease-in-out infinite' }} />
                  Checking availability…
                </span>
              ) : spots !== null ? (
                <span className="text-[12px] font-semibold tracking-[-0.01em]" style={{ color: '#B34929' }}>
                  {spots} of 4 early spot{spots !== 1 ? 's' : ''} remaining
                </span>
              ) : <span />}

              <a
                href="/apply?early_pricing=true"
                className="mt-[2px] inline-flex h-[40px] items-center justify-center rounded-full px-5 text-[13px] font-semibold tracking-[-0.01em] text-white transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(180deg, #C2552F 0%, #A8401F 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), 0 4px 12px -3px rgba(179,73,41,0.45)',
                }}
              >
                Apply now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

