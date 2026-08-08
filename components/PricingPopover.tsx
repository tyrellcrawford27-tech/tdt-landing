'use client';

import { useState, useEffect, useRef } from 'react';
import { EarlyBirdIcon } from './EarlyBirdIcon';
import { EARLY_BIRD_TOTAL, EARLY_BIRD_PRICE, FULL_PRICE } from '@/lib/earlyPricingConfig';

// The copy reads "The first three spots" — spell small counts so changing the
// total doesn't leave a digit sitting mid-sentence.
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

const LIQUID = '#EFE0D5'; // warm off-white — reads as a body of liquid against #FAF6F2

// Early-bird accent — deep burnt sienna, darker and earthier than the page's
// terracotta so the discount still reads as its own thing.
const ACCENT      = '#7A2E1D';
const ACCENT_DEEP = '#5E2215';
const INK         = '#454545'; // headline
const MUTED       = '#737373'; // body copy

export function PricingPopover() {
  const [open, setOpen]           = useState(false);
  const [mounted, setMounted]     = useState(false);
  const [spots, setSpots]         = useState<number | null>(null);
  // Total comes from the API too, so the "N of M" copy can never drift from
  // the server's idea of how many discounted spots exist.
  const [total, setTotal]         = useState(EARLY_BIRD_TOTAL);
  const [spotsLoading, setSpots_] = useState(false);
  const rootRef  = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number | null>(null);

  // Pointer-tracked specular. Written straight to CSS custom properties on the
  // element rather than through state — a re-render per pointermove would both
  // stutter and get clobbered by unrelated re-renders higher up the page.
  const onPointerMove = (e: React.PointerEvent) => {
    const el = glassRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty('--mx', `${x}%`);
      el.style.setProperty('--my', `${y}%`);
      el.style.setProperty('--mo', '1');
    });
  };
  const onPointerLeave = () => {
    glassRef.current?.style.setProperty('--mo', '0');
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Only claim sold-out once the server has actually answered — never off the
  // initial null, or the card would flash "gone" while availability loads.
  const soldOut = spots === 0;

  const toggle = () => {
    if (open) { setOpen(false); return; }
    setMounted(true);
    setOpen(true);
    setSpots(null);
    setSpots_(true);
    fetch('/api/early-pricing-spots')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        if (typeof d.remaining === 'number') setSpots(d.remaining);
        if (typeof d.total === 'number') setTotal(d.total);
      })
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
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // pointerdown, not mousedown: iOS Safari doesn't reliably synthesise mouse
    // events for taps on non-interactive areas, so outside-taps could miss.
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
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
        /* ── specular sweep — wide and soft, so it reads as light travelling
              across a surface rather than a bar wiping over it. Runs on a 5s
              cycle: the sweep itself occupies the first ~26% (1.3s) and the
              rest of the cycle is idle, so it re-catches the eye periodically
              without ever reading as a loading shimmer. ── */
        @keyframes lg-sheen {
          0%   { transform: translateX(-115%) skewX(-14deg); opacity: 0;
                 animation-timing-function: cubic-bezier(0.4, 0.06, 0.4, 0.94); }
          4%   { opacity: 0.95; }
          20%  { opacity: 0.80; }
          26%  { transform: translateX(285%)  skewX(-14deg); opacity: 0;
                 animation-timing-function: linear; }
          100% { transform: translateX(285%)  skewX(-14deg); opacity: 0;    }
        }
        /* glass resolves with a slight settle rather than a flat fade */
        @keyframes lg-glass-in {
          0%   { opacity: 0; transform: scale(0.972); }
          62%  { opacity: 1; transform: scale(1.006); }
          100% { opacity: 1; transform: scale(1);     }
        }
        @keyframes lg-glass-out {
          from { opacity: 1; transform: scale(1);     }
          to   { opacity: 0; transform: scale(0.986); }
        }
        /* brief inner bloom as the light "fills" the glass */
        @keyframes lg-bloom { 0% { opacity: 0; } 30% { opacity: 0.85; } 100% { opacity: 0; } }
        @keyframes lg-dot { 0%,100% { opacity: 0.25; } 50% { opacity: 0.9; } }

        .lg-goo   { filter: url(#lg-goo); will-change: transform, opacity; }
        .lg-blob  { transform-origin: 44px 0; will-change: transform; }
        .lg-neck  { transform-origin: center top; will-change: transform; }

        .lg-pop[data-state='in']  .lg-blob   { animation: lg-blob-in  0.62s cubic-bezier(0.22, 1.1, 0.36, 1) both; }
        .lg-pop[data-state='in']  .lg-neck   { animation: lg-neck-in  0.52s cubic-bezier(0.4, 0, 0.2, 1) both; }
        .lg-pop[data-state='in']  .lg-anchor { animation: lg-anchor   0.52s linear both; }
        .lg-pop[data-state='in']  .lg-goo    { animation: lg-veil-in  0.62s cubic-bezier(0.4,0,0.2,1) both; }
        .lg-pop[data-state='in']  .lg-glass  { animation: lg-glass-in 0.52s cubic-bezier(0.22,1,0.36,1) 0.14s both; }
        .lg-pop[data-state='in']  .lg-sheen  { animation: lg-sheen    5s linear 0.18s infinite; }
        .lg-pop[data-state='in']  .lg-bloom  { animation: lg-bloom    0.85s cubic-bezier(0.4,0,0.2,1) 0.16s both; }
        /* leaf rows stagger individually — delays are set inline per row */
        .lg-pop[data-state='in']  .lg-row { animation: lg-content 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .lg-pop[data-state='out'] .lg-row { animation: none; }

        .lg-pop[data-state='out'] .lg-blob   { animation: lg-blob-out 0.28s cubic-bezier(0.5, 0, 0.75, 0) both; }
        .lg-pop[data-state='out'] .lg-neck   { animation: lg-neck-out 0.24s cubic-bezier(0.5, 0, 0.75, 0) both; }
        .lg-pop[data-state='out'] .lg-goo    { animation: lg-veil-out 0.28s ease-out both; }
        .lg-pop[data-state='out'] .lg-glass  { animation: lg-glass-out 0.24s cubic-bezier(0.4,0,1,1) both; }
        .lg-pop[data-state='out'] .lg-body   { animation: lg-fade-out  0.14s ease-out both; }
        .lg-pop[data-state='out'] { pointer-events: none; }

        @media (prefers-reduced-motion: reduce) {
          .lg-pop[data-state='in']  .lg-blob,
          .lg-pop[data-state='in']  .lg-glass,
          .lg-pop[data-state='in']  .lg-row { animation: lg-fade-in 0.2s both; animation-delay: 0s !important; }
          .lg-pop .lg-neck, .lg-pop .lg-anchor, .lg-pop .lg-sheen, .lg-pop .lg-bloom { display: none; }
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
        className="inline-flex items-center gap-[7px] text-[14px] font-medium tracking-[-0.02em] cursor-pointer transition-opacity duration-200 hover:opacity-70"
        style={{ color: ACCENT, background: 'none', border: 'none', padding: 0 }}
      >
        <EarlyBirdIcon size={15} color="currentColor" />
        Early bird pricing
      </button>

      {mounted && (
        <div
          className="lg-pop absolute left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 top-full z-50 w-[305px] max-w-[calc(100vw-40px)]"
          style={{ paddingTop: 16 }}
          data-state={open ? 'in' : 'out'}
        >
          {/* Gooey silhouette — carries the morph */}
          <div className="lg-goo pointer-events-none absolute inset-0" aria-hidden>
            <div className="lg-anchor absolute rounded-full" style={{ left: 24, top: -9, width: 48, height: 14, background: LIQUID }} />
            <div className="lg-neck   absolute rounded-full" style={{ left: 33, top: -4, width: 30, height: 26, background: LIQUID }} />
            <div className="lg-blob   absolute rounded-[12px]" style={{ left: 0, top: 16, right: 0, bottom: 0, background: LIQUID }} />
          </div>

          {/* Glass card. Heavier blur with a slightly thinner fill than before:
              the fill is what was making this read as a cream card rather than
              glass, but it can't go too sheer or the gradient "Membership"
              heading behind it starts showing through the body copy. Pushing
              blur up while easing fill down buys transparency without costing
              legibility. */}
          <div
            ref={glassRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            className="lg-glass relative overflow-hidden rounded-[12px]"
            style={{
              background: 'linear-gradient(156deg, rgba(255,255,255,0.74) 0%, rgba(255,253,251,0.56) 46%, rgba(255,249,246,0.64) 100%)',
              backdropFilter: 'blur(40px) saturate(200%) brightness(1.04)',
              WebkitBackdropFilter: 'blur(40px) saturate(200%) brightness(1.04)',
              boxShadow: [
                // rim + interior modelling
                'inset 0 1px 0 rgba(255,255,255,0.98)',
                'inset 0 -1px 0 rgba(255,255,255,0.40)',
                'inset 0 18px 34px -22px rgba(255,255,255,0.85)',
                'inset 0 -16px 30px -20px rgba(122,46,29,0.16)',
                // contact → ambient → cast, so it sits on the page instead of floating
                '0 0.5px 0.5px rgba(60,25,10,0.05)',
                '0 2px 4px -1px rgba(60,25,10,0.06)',
                '0 12px 24px -8px rgba(60,25,10,0.12)',
                '0 34px 64px -18px rgba(60,25,10,0.22)',
              ].join(', '),
            }}
          >
            {/* Refractive rim — a gradient hairline that catches light bright at
                the top-left and falls to a warm shadow bottom-right. Gradient
                borders aren't a thing in CSS, so this is a 1px inset padding box
                masked out of its own fill. */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[12px]"
              aria-hidden
              style={{
                padding: 1,
                background: 'linear-gradient(150deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.30) 34%, rgba(255,255,255,0.05) 56%, rgba(122,46,29,0.13) 100%)',
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                maskComposite: 'exclude',
              }}
            />

            {/* Fixed specular corner */}
            <div className="pointer-events-none absolute inset-0" aria-hidden
              style={{ background: 'linear-gradient(142deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.14) 26%, rgba(255,255,255,0) 48%)' }} />

            {/* Pointer-tracked specular — the highlight follows the cursor
                across the surface, which is what sells it as a lit material
                rather than a printed gradient. */}
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background: 'radial-gradient(260px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.16) 34%, transparent 62%)',
                opacity: 'var(--mo, 0)' as unknown as number,
                transition: 'opacity 420ms cubic-bezier(0.4,0,0.2,1)',
              }}
            />

            {/* Inner bloom on open */}
            <div className="lg-bloom pointer-events-none absolute inset-0" aria-hidden
              style={{ background: 'radial-gradient(120% 80% at 30% 0%, rgba(255,255,255,0.75) 0%, transparent 58%)' }} />

            {/* Travelling sheen. A pure-white band is invisible on this card —
                the glass already sits around #FCFAF8, so white has barely a few
                levels of headroom above it. What makes a glint read on a light
                surface is contrast, not brightness: the band carries faint warm
                shadow on both flanks, so the white core has something to read
                against. Nested backdrop-filter was tried first and doesn't
                composite inside a parent that already has one. */}
            <div className="lg-sheen pointer-events-none absolute inset-y-[-20%] left-0 w-[55%]" aria-hidden
              style={{
                background: [
                  'linear-gradient(90deg,',
                  'rgba(122,46,29,0) 0%,',
                  'rgba(122,46,29,0.13) 26%,',
                  'rgba(255,255,255,0.55) 42%,',
                  'rgba(255,255,255,1) 49%,',
                  'rgba(255,255,255,1) 51%,',
                  'rgba(255,255,255,0.55) 58%,',
                  'rgba(122,46,29,0.13) 74%,',
                  'rgba(122,46,29,0) 100%)',
                ].join(' '),
                filter: 'blur(3px)',
              }} />

            <div className="lg-body relative flex flex-col items-start gap-[15px] p-5 text-left">
              <span className="lg-row text-[13px] font-normal leading-[16px]" style={{ color: ACCENT, animationDelay: '0.21s' }}>
                Early bird pricing
              </span>

              <div className="flex flex-col items-start gap-[10px]">
                <p className="lg-row text-[16px] font-medium leading-[19px]" style={{ color: INK, animationDelay: '0.25s' }}>
                  {soldOut ? 'The early spots are gone.' : `The first ${numberWord(total)} spots cost less.`}
                </p>
                <p className="lg-row text-[13px] font-normal leading-[16px]" style={{ color: MUTED, animationDelay: '0.29s' }}>
                  {soldOut
                    ? `All ${numberWord(total)} discounted spots have been claimed. The program is ${FULL_PRICE}.`
                    : `${FULL_PRICE} normally. The first ${numberWord(total)} to lock in their spot pay ${EARLY_BIRD_PRICE} instead.`}
                </p>
              </div>

              <div className="flex flex-col items-start gap-[10px]">
                {spotsLoading ? (
                  <span className="lg-row flex items-center gap-[6px] text-[13px] font-normal leading-[16px]" style={{ color: MUTED, animationDelay: '0.33s' }}>
                    <span className="h-[5px] w-[5px] rounded-full" style={{ background: ACCENT, animation: 'lg-dot 1.1s ease-in-out infinite' }} />
                    Checking availability…
                  </span>
                ) : spots !== null ? (
                  <span className="lg-row text-[13px] font-normal leading-[16px]" style={{ color: ACCENT, animationDelay: '0.33s' }}>
                    {spots} of {total} early spot{spots !== 1 ? 's' : ''} remaining
                  </span>
                ) : null}

                <a
                  href={soldOut ? '/apply' : '/apply?early_pricing=true'}
                  className="lg-row inline-flex h-[28px] items-center justify-center rounded-[30px] px-[10px] text-[13px] font-normal leading-[16px] text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(180deg, ${ACCENT} 0%, ${ACCENT_DEEP} 100%)`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 12px -4px rgba(94,34,21,0.45)',
                    animationDelay: '0.37s',
                  }}
                >
                  {soldOut ? 'Apply now' : 'Apply with discount'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

