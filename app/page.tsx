'use client';

import { useState, useEffect, useRef } from "react";
import { TDTLogo } from "@/components/TDTLogo";
import { FooterText } from "@/components/FooterText";
import { FilmGrain } from "@/components/FilmGrain";
import { CTAButton } from "@/components/CTAButton";
import { LaunchReveal } from "@/components/LaunchReveal";
import { PricingPopover } from "@/components/PricingPopover";
import { ProgramStepIcon, ProgramIconStyles } from "@/components/ProgramStepIcon";
import Spline from "@splinetool/react-spline";

// Program section scroll tuning — one step per PROGRAM_STEP_VH of scroll.
// Shared between the step index and the container height so they can't drift
// apart. Desktop/tablet pin each stage's card via position: sticky for
// roughly PROGRAM_STEP_VH of scroll; mobile skips pinning entirely (see
// ProgramMobile below) and just reveals each stage as it scrolls into view.
const PROGRAM_STEP_VH = 42;       // scroll distance (% of viewport) per stage — lower = less scroll friction
const PROGRAM_END_BUFFER_VH = 90; // tail so the last stage lingers before release
const PROGRAM_STEP_COUNT = 3;

type ProgramStep = {
  slug: string;
  label: string;
  num: string;
  icon: import('@/components/ProgramStepIcon').ProgramIconName;
  title: string;
  body: React.ReactNode; // ReactNode, not string, so copy can carry inline emphasis
  image: string;
  imagePosition?: string;
};

// Second-person address is italicised across the Program copy, so every stage
// reads as spoken to the athlete rather than about them.
const You = ({ children }: { children: React.ReactNode }) => <em className="italic">{children}</em>;

const PROGRAM_STEPS: ProgramStep[] = [
  { slug: 'diagnosis',    label: 'Diagnosis',    num: '01', icon: 'stethoscope', title: "Diagnosed on day one.", body: <>Jaiden watches <You>your</You> film like a scout would. Then he tells <You>you</You> the thing that must change the next time <You>you</You> step on the court.</>, image: 'diagnosis-1.webp' },
  { slug: 'prescription', label: 'Prescription', num: '02', icon: 'pillbottle',  title: "The fix begins.", body: <>Then comes <You>your</You> module. Pulled straight from what Jaiden saw in <You>your</You> film.</>, image: 'drill-true.webp' },
  { slug: '100-days',     label: 'The 100 Days', num: '03', icon: 'repeat',      title: "Then it repeats.", body: <>Again and again, until there's nothing left to fix. A complete plan that's <You>yours</You> alone to be sharper on the court and harder to overlook.</>, image: 'the-100-days.webp', imagePosition: 'center 52%' },
];

// Mobile Program section — pinned, one stage per swipe.
//
// This was originally a nested snap-scroller (its own overflow-y). That could
// not hold the user in the section: it only occupied one viewport of *page*
// height, so a swipe that the page picked up instead of the scroller carried
// straight past all three stages. A nested scroller can never prevent that —
// the page is free to scroll regardless of what the inner element does.
//
// So mobile now uses the same mechanic as desktop: the section reserves real
// page height (one screen of scroll per stage) and pins a single viewport with
// position: sticky. Scrolling past requires actually scrolling through every
// stage, and the pinned screen is what produces the "freeze, then advance"
// feel. Stages crossfade in place.
//
// Failure mode is deliberately soft: step defaults to 0, so if the scroll
// handler never runs the first stage is still fully rendered rather than the
// section going black — which is what the earlier opacity-gated version did.
const PROGRAM_MOBILE_STAGE_VH = 50; // page scroll (% of viewport) per stage
// The pinned pane is a full screen tall, so the container needs a screen of tail
// past the last stage — without it the section releases the moment stage 03
// appears. At exactly 100 every stage gets the same time on screen, so tune
// PROGRAM_MOBILE_STAGE_VH (not this) to change how long the section holds.
const PROGRAM_MOBILE_TAIL_VH = 100;

function ProgramMobile() {
  const startRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = startRef.current;
      if (!el) return;
      // Guard innerHeight — a collapsed viewport reports 0, and 0/0 is NaN,
      // which would index PROGRAM_STEPS out of bounds.
      const vh = window.innerHeight || 1;
      const passed = Math.max(0, -el.getBoundingClientRect().top) / vh;
      const i = Math.min(
        PROGRAM_STEPS.length - 1,
        Math.max(0, Math.floor(passed * (100 / PROGRAM_MOBILE_STAGE_VH))) || 0,
      );
      setStep(i);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="md:hidden relative"
      style={{ height: `${PROGRAM_STEPS.length * PROGRAM_MOBILE_STAGE_VH + PROGRAM_MOBILE_TAIL_VH}svh` }}
    >
      <div ref={startRef} />

      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {PROGRAM_STEPS.map((s, i) => (
          <div
            key={s.slug}
            // pt clears the fixed nav, pb clears the dot rail — justify-center
            // then centres the content in what's actually left, so it lands in
            // the middle of the readable area rather than the raw viewport.
            className="absolute inset-0 flex flex-col justify-center px-6 pt-[92px] pb-[64px]"
            aria-hidden={step !== i}
            style={{
              opacity: step === i ? 1 : 0,
              transform: `translateY(${step === i ? 0 : step > i ? -18 : 18}px)`,
              transition: 'opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)',
              pointerEvents: step === i ? 'auto' : 'none',
            }}
          >
            <div className="flex-shrink-0">
              <div className="flex flex-row items-center gap-[8px] text-[#C2552F] mb-[12px]">
                <ProgramStepIcon name={s.icon} active={step === i} className="h-[16px] w-[16px] flex-shrink-0" />
                <span className="text-[11px] font-semibold uppercase text-[rgba(179,73,41,0.85)]">{s.label}</span>
              </div>
              <h2 className="text-[30px] font-bold leading-[1.12] tracking-[-0.025em] text-white mb-[10px]">
                {s.title}
              </h2>
              <p className="text-[14px] font-normal leading-[19px] text-white/50">
                {s.body}
              </p>
            </div>

            {/* 16/10 matches the source screenshots so `cover` fills the frame
                with no side-cropping; min-h-0 lets it yield height on short
                screens instead of overflowing. */}
            <div
              className="relative w-full min-h-0 shrink rounded-[16px] overflow-hidden mt-[20px]"
              style={{
                aspectRatio: '16 / 10',
                maxHeight: '44svh',
                background: '#0c0c0c',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(/${s.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: s.imagePosition ?? 'top',
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 h-[12%] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, rgba(12,12,12,0.35))' }} />
            </div>
          </div>
        ))}

        {/* Dot rail sits outside the stages so it never fades with them */}
        <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 flex gap-[6px]" aria-hidden="true">
          {PROGRAM_STEPS.map((s, i) => (
            <span
              key={s.slug}
              className="h-[5px] rounded-full transition-all duration-300"
              style={{
                width: i === step ? 18 : 5,
                background: i === step ? '#C2552F' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}



// How far past #pricing's top counts as "in" the pricing section, in viewports.
// The panel holds on black and only resolves the card partway through its scroll,
// so both the nav jump target and the active-label check measure from here.
// Must land inside [0.525, 0.75]: the card reveal completes at 0.525 and the
// sticky panel unpins at 0.75 — within that span the card sits flex-centered
// in the viewport; past it the whole stage rides up and off-center.
const PRICING_NAV_OFFSET_VH = 0.7;

const NAV_LINKS = [
  { id: 'coach', label: 'The Coach' },
  { id: 'program', label: 'Program' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
] as const;

const SECTION_LABELS: Record<string, string> = {
  coach: 'Meet the Coach',
  program: 'The Program',
  difference: 'Why TDT',
  pricing: 'Pricing',
  faq: 'FAQ',
};

const COACH_IMAGES = [
  { src: '/coach-1.jpg', position: 'center 45%' },
  { src: '/coach-2.jpg', position: 'center 30%' },
  { src: '/coach-3.jpg', position: 'top' },
  { src: '/coach-4.jpg', position: 'top' },
  { src: '/coach-5.jpg', position: 'top' },
];

const COACH_INTERVAL = 4200;
// Each photo gets a distinct slow drift so the rotation never feels static
const KB_ANIMS = ['kb-a', 'kb-b', 'kb-c', 'kb-d', 'kb-e'];

function CoachCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // Read after mount so SSR and first paint agree; drives both the autoplay
  // and the perpetual Ken Burns zoom.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // setTimeout keyed on `current` so clicking a dot cleanly resets the timer
  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setTimeout(() => setCurrent(i => (i + 1) % COACH_IMAGES.length), COACH_INTERVAL);
    return () => clearTimeout(id);
  }, [current, paused, reducedMotion]);

  return (
    <div
      className="relative flex w-full lg:w-[565px] items-center justify-center lg:justify-end"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Touch has no hover, so give phones their own pause affordance:
      // press and hold stops the rotation.
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
      role="img"
      aria-label="Photos of coach Jaiden Francais training athletes"
    >
      <style>{`
        @keyframes kb-a { from { transform: scale(1.05) translate(0, 0);        } to { transform: scale(1.16) translate(-2.2%, -1.6%); } }
        @keyframes kb-b { from { transform: scale(1.14) translate(1.6%, 0);     } to { transform: scale(1.04) translate(-1.6%, 1.2%); } }
        @keyframes kb-c { from { transform: scale(1.05) translate(0, 1.2%);     } to { transform: scale(1.15) translate(1.8%, -1.6%); } }
        @keyframes kb-d { from { transform: scale(1.15) translate(-1.6%, -1%);  } to { transform: scale(1.05) translate(1.2%, 1.6%);  } }
        @keyframes kb-e { from { transform: scale(1.06) translate(1.2%, -1.2%); } to { transform: scale(1.16) translate(-1.6%, 1.6%); } }
        @keyframes coach-fill { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      `}</style>

      {/* Ambient accent glow behind the frame */}
      <div
        className="absolute right-0 hidden lg:block h-[434px] w-[543px] rounded-[40px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 55%, rgba(179,73,41,0.16) 0%, transparent 68%)', filter: 'blur(22px)' }}
      />

      {/* Progress indicators — active one fills as its slide plays */}
      <div className="absolute left-0 top-0 z-10 hidden lg:flex h-full w-[12px] flex-col items-center justify-center gap-[9px]">
        {COACH_IMAGES.map((_img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="relative cursor-pointer overflow-hidden rounded-full transition-all duration-500"
            style={{
              width: 3,
              height: current === i ? 26 : 10,
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}
            aria-label={`Go to image ${i + 1}`}
          >
            {current === i && (
              <span
                key={`${current}-${paused}`}
                className="absolute inset-0 rounded-full bg-white"
                style={
                  paused
                    ? undefined
                    : { transformOrigin: 'top', animation: `coach-fill ${COACH_INTERVAL}ms linear forwards` }
                }
              />
            )}
          </button>
        ))}
      </div>

      {/* Frame */}
      <div className="relative w-full aspect-video lg:aspect-auto lg:h-[434px] lg:w-[543px] overflow-hidden rounded-[12px] border border-white/40 bg-[#111111]">
        {COACH_IMAGES.map((img, i) => (
          <div
            key={img.src}
            className="absolute inset-0 overflow-hidden"
            style={{ opacity: current === i ? 1 : 0, transition: 'opacity 0.9s cubic-bezier(0.4,0,0.2,1)' }}
          >
            <div
              className="absolute inset-0 bg-cover"
              style={{
                backgroundImage: `url(${img.src})`,
                backgroundPosition: img.position,
                animation: reducedMotion ? undefined : `${KB_ANIMS[i % KB_ANIMS.length]} 9s ease-in-out infinite alternate`,
                willChange: reducedMotion ? undefined : 'transform',
              }}
            />
          </div>
        ))}
        {/* Bottom vignette */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
      </div>
    </div>
  );
}

const LAUNCH_DATE = new Date('2026-09-01T00:00:00');

function useCountdown() {
  function calc() {
    const diff = Math.max(0, LAUNCH_DATE.getTime() - Date.now());
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

function CountdownEyebrow({ onLaunch }: { onLaunch?: () => void }) {
  const { days, hours, minutes, seconds } = useCountdown();
  const fired = useRef(false);
  useEffect(() => {
    if (!fired.current && days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
      fired.current = true;
      onLaunch?.();
    }
  }, [days, hours, minutes, seconds, onLaunch]);
  const units = [
    { v: days,    l: 'd' },
    { v: hours,   l: 'h' },
    { v: minutes, l: 'm' },
    { v: seconds, l: 's' },
  ];

  return (
    <div
      className="inline-flex items-center rounded-full mb-6 select-none"
      style={{
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(14px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* Left — label with live dot */}
      <div className="flex items-center gap-[7px] pl-[11px] pr-[9px] py-[6px]">
        <span className="relative flex h-[5px] w-[5px] flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: '#B34929' }} />
          <span className="relative inline-flex h-[5px] w-[5px] rounded-full" style={{ backgroundColor: '#B34929' }} />
        </span>
        <span className="text-[9.5px] font-medium tracking-[-0.02em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Cohort 1 · Sept 1
        </span>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.09)', margin: '5px 0' }} />

      {/* Right — countdown units */}
      <div className="flex items-center gap-[11px] pl-[11px] pr-[13px] py-[6px]">
        {units.map(({ v, l }) => (
          <div key={l} className="flex items-baseline gap-[2px]">
            <span
              className="text-[12.5px] font-semibold leading-none text-white"
              style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', letterSpacing: '-0.01em' }}
            >
              {String(v).padStart(2, '0')}
            </span>
            <span className="text-[8.5px] font-medium leading-none" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Early-pricing popover ─────────────────────────────────────────────────────
// Liquid-glass card that morphs out of the "Questions about pricing?" link.
// The goo layer (SVG alpha-threshold filter) makes the neck pinch off from the
// button like a droplet; the glass card crossfades in on top of it.
export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  const [tp, setTp] = useState(0);
  const [programProgress, setProgramProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [navHovered, setNavHovered] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [coachVisible, setCoachVisible] = useState(false);
  const [tableVisible, setTableVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [heroIconMorphed, setHeroIconMorphed] = useState(false);
  const [heroPlaying, setHeroPlaying] = useState(false);
  const [launched, setLaunched] = useState(false);

  // Derived from the scroll-linked programProgress. NaN-safe so a bad reading
  // can never index STEPS out of bounds.
  const programActiveStep = Math.min(
    PROGRAM_STEP_COUNT - 1,
    Math.max(0, Math.floor((programProgress || 0) * (100 / PROGRAM_STEP_VH))) || 0,
  );

  const transitionZoneRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const cardsStartRef = useRef<HTMLDivElement>(null);
  const coachContentRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);

  // Honour prefers-reduced-motion in the explicit JS scrolls (the CSS
  // scroll-behavior rule only covers native anchor scrolling).
  const scrollBehavior = () =>
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') as ScrollBehavior;

  useEffect(() => {
    const SECTIONS = ['coach', 'program', 'difference', 'pricing', 'faq'];
    const onScroll = () => {
      setScrolled(prev => window.scrollY > (prev ? 40 : 80));
      if (transitionZoneRef.current) {
        const r = transitionZoneRef.current.getBoundingClientRect();
        // Progress across only the pinned span (container height minus the sticky screen),
        // so the black→white flip fully completes while the panel still covers the viewport.
        const pinnable = Math.max(1, r.height - window.innerHeight);
        setTp(Math.max(0, Math.min(1, -r.top / pinnable)));
      }
      if (cardsStartRef.current) {
        const r = cardsStartRef.current.getBoundingClientRect();
        // Guard innerHeight: a collapsed or hidden viewport reports 0, and 0/0
        // yields NaN, which propagates into the step index and indexes STEPS
        // out of bounds.
        const vh = window.innerHeight || 1;
        setProgramProgress(Math.max(0, -r.top) / vh);
      }
      const mid = window.innerHeight * 0.45;
      let active = '';
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        // Pricing opens on a screen of held black before the light flips and the
        // card resolves, so measuring from its top would light the label while the
        // panel still reads as the quote above it. Same offset the nav link scrolls
        // to, so the label and the jump target can't disagree.
        const enterAt = id === 'pricing' ? window.innerHeight * PRICING_NAV_OFFSET_VH : 0;
        if (el.getBoundingClientRect().top + enterAt <= mid) active = id;
      }
      setActiveSection(active);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);




  useEffect(() => {
    const el = coachContentRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setCoachVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);


  const handleHeroPlay = () => {
    // First click: morph icon, then start inline video
    setHeroIconMorphed(true);
    setTimeout(() => setHeroPlaying(true), 180);
  };

  const handleHeroFullscreen = () => {
    heroRef.current?.requestFullscreen?.().catch(() => {});
  };

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTableVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 1024) setMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (!menuOpen) return () => { document.body.style.overflow = ''; };
    // Modal behaviour while open: Escape dismisses, focus moves into the
    // dialog, and returns to the hamburger when it closes.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    menuCloseRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      menuButtonRef.current?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  // Cinematic dark→light transition: hold true black, then a fast bright flip like stage lights snapping on.
  const flip   = Math.min(1, Math.max(0, (tp - 0.08) / 0.32)); // short black hold, then a punchy flip
  const tt     = flip * flip * (3 - 2 * flip);                 // eased colour progress (drives nav + panel together)
  const flash  = Math.sin(flip * Math.PI);                     // white burst, peaks in the middle of the flip
  const reveal = Math.min(1, Math.max(0, (tp - 0.42) / 0.28)); // card fades/scales in, revealed by the light
  const revealEased = reveal * reveal * (3 - 2 * reveal);
  const isDark = tt < 0.5;
  const isCompact = !!activeSection;
  const showCompact = isCompact && !navHovered;

  const panelBg = `rgb(${lerp(0,251,tt)},${lerp(0,246,tt)},${lerp(0,242,tt)})`;
  const navBgStyle = { backgroundColor: `rgba(${lerp(0,251,tt)},${lerp(0,246,tt)},${lerp(0,242,tt)},${tt < 0.5 ? 0.96 : 0.92})` };
  const navBorderStyle = { borderColor: `rgba(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)},0.12)` };
  const navTextStyle = {
    color: `rgba(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)},${!scrolled && !showCompact ? 0.8 : 0.6})`,
    textShadow: !scrolled && !showCompact ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
  };
  const navLinkStyle = (id: string) => ({
    color: `rgba(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)},${activeSection === id ? 1 : !scrolled && !showCompact ? 0.72 : 0.4})`,
    transition: 'color 0.3s ease',
    fontWeight: activeSection === id ? '500' : '400',
    textShadow: !scrolled && !showCompact ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
  });

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: coachVisible ? 1 : 0,
    transform: coachVisible ? 'translateY(0px)' : 'translateY(18px)',
    transition: `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
  });

  // Coach copy lands one line at a time: each paragraph rises and resolves out of
  // a soft blur, so the statement reads like it's being spoken rather than
  // appearing all at once. Delays cascade into the signature, then the logos.
  const revealLine = (delay: number): React.CSSProperties => ({
    opacity: coachVisible ? 1 : 0,
    transform: coachVisible ? 'translateY(0px)' : 'translateY(14px)',
    filter: coachVisible ? 'blur(0px)' : 'blur(7px)',
    transition: [
      `opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      `transform 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      `filter 0.85s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    ].join(', '),
  });

  const signatureReveal: React.CSSProperties = {
    opacity: coachVisible ? 1 : 0,
    clipPath: coachVisible ? 'inset(0 0% 0 0)' : 'inset(0 102% 0 0)',
    transition: 'opacity 0.4s ease 900ms, clip-path 1.1s cubic-bezier(0.4, 0, 0.15, 1) 850ms',
  };

  return (
    <div className="relative min-h-screen">

      {/* ── Film grain overlay ── */}
      <FilmGrain />
      {launched && <LaunchReveal onClose={() => setLaunched(false)} />}

      {/* ── Mobile full-screen menu overlay ── */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        // inert removes the closed (opacity-0 but still mounted) overlay from the
        // tab order and accessibility tree — without it the page's first Tab lands
        // on an invisible close button.
        inert={!menuOpen}
        aria-hidden={!menuOpen}
        className={`fixed inset-0 z-[100] flex flex-col lg:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          // Keep touch drags on the overlay from rubber-banding the page behind
          // the glass; the nav inside re-enables vertical panning for itself.
          overscrollBehavior: 'contain',
          touchAction: 'none',
          paddingTop: 'env(safe-area-inset-top)',
        }}
        // Tapping any dead space dismisses, like a sheet — only taps that land on
        // a link or button survive.
        onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button')) setMenuOpen(false); }}
      >
        {/* Top bar — mirrors the header: logo left, close right */}
        <div className="flex h-[64px] items-center justify-between px-6">
          <div className="flex h-[38px] w-[34px] items-center justify-center">
            <TDTLogo letterColor="rgb(255,255,255)" />
          </div>
          <button
            ref={menuCloseRef}
            onClick={() => setMenuOpen(false)}
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/70 active:bg-white/10"
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Links — numbered, staggered entrance. The nav is its own scroll
            container so short landscape viewports can still reach every link;
            my-auto on the inner wrapper centers when there's room but keeps the
            top reachable when content overflows (justify-center wouldn't). */}
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
          <div className="my-auto">
          {NAV_LINKS.map(({ id, label }, i) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex cursor-pointer items-baseline gap-[16px] border-b border-white/[0.08] py-[18px] last:border-b-0 -mx-3 px-3 rounded-[12px] active:bg-white/[0.06]"
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
                transition: menuOpen
                  ? `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${120 + i * 70}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${120 + i * 70}ms`
                  : 'opacity 0.2s ease, transform 0.2s ease',
              }}
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                // Jump instantly while the overlay is still fading — the fade masks
                // the jump, and an instant scroll can't be cancelled mid-flight by
                // main-thread jank the way a long smooth scroll can (which stranded
                // taps short of their section). The body scroll-lock lifts in the
                // menu-close effect, so poll for that instead of racing it with a
                // fixed delay: scrollTo is a silent no-op while the lock is on.
                // setTimeout rather than requestAnimationFrame: rAF freezes when the
                // page is hidden or throttled, which would swallow the tap entirely.
                const jump = (triesLeft: number) => {
                  if (document.body.style.overflow === 'hidden' && triesLeft > 0) { setTimeout(() => jump(triesLeft - 1), 16); return; }
                  const el = document.getElementById(id);
                  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + (id === 'pricing' ? window.innerHeight * PRICING_NAV_OFFSET_VH : 0), behavior: 'instant' });
                };
                setTimeout(() => jump(30), 16);
              }}
            >
              <span className="text-[11px] font-semibold tracking-[0.1em] text-[#B34929]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                0{i + 1}
              </span>
              <span className="text-[30px] font-medium tracking-[-0.02em] text-white/90">{label}</span>
            </a>
          ))}
          </div>
        </nav>

        {/* Bottom actions */}
        <div
          className="flex w-full flex-col items-center gap-[18px] px-6"
          style={{
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
            transition: menuOpen
              ? 'opacity 0.45s cubic-bezier(0.16,1,0.3,1) 420ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) 420ms'
              : 'opacity 0.2s ease, transform 0.2s ease',
            // Clear the home indicator on notched phones
            paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))',
          }}
        >
          {/* -my-3 cancels the 44px hit area's extra height inside the gap so
              visual spacing is unchanged */}
          <a href="https://app.thinkdifferenttraining.com/access" className="-my-3 flex min-h-[44px] items-center px-6 text-[14px] text-white/60">Log In</a>
          <CTAButton href="/apply" className="w-full h-[48px] text-[15px]">
            Apply
          </CTAButton>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="fixed z-50 flex h-[64px] lg:h-[98px] w-full items-center justify-center pointer-events-none" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border pointer-events-auto"
          // Pointer-type-gated: on touch, mouseenter fires on tap and never
          // reliably leaves, sticking the pill out of compact mode.
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') setNavHovered(true); }}
          onPointerLeave={() => setNavHovered(false)}
          style={{
            width: 'calc(100% - 80px)',
            maxWidth: showCompact ? '380px' : scrolled ? '960px' : '100%',
            height: showCompact ? '52px' : scrolled ? '52px' : '60px',
            paddingLeft: showCompact ? '16px' : scrolled ? '20px' : '0px',
            paddingRight: showCompact ? '16px' : scrolled ? '20px' : '0px',
            borderRadius: scrolled || showCompact ? '9999px' : '16px',
            backdropFilter: scrolled || showCompact ? 'blur(20px)' : 'none',
            backgroundColor: scrolled || showCompact
              ? isDark
                ? `rgba(255,255,255,${showCompact ? 0.08 : 0.10})`
                : `rgba(251,246,242,${showCompact ? 0.55 : 0.65})`
              : 'transparent',
            borderColor: isDark
              ? `rgba(255,255,255,${showCompact ? 0.12 : scrolled ? 0.10 : 0})`
              : `rgba(26,15,10,${scrolled || showCompact ? 0.10 : 0})`,
            boxShadow: !(scrolled || showCompact) ? 'none'
              : isDark
                ? '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.09)'
                : '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
            transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Logo — the button is a fixed 44px tap target; the inner div carries
              the animated visual size and clips the oversized SVG as before. The
              negative margin keeps the pill's visual metrics unchanged. */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })}
            className="flex h-11 w-11 -mx-[5px] cursor-pointer items-center justify-center flex-shrink-0"
            aria-label="Back to top"
          >
            <div className={`flex items-center justify-center overflow-hidden transition-all duration-500 ${showCompact ? 'h-[38px] w-[34px]' : scrolled ? 'h-[34px] w-[30px]' : 'h-[40px] w-[36px]'}`}>
              <TDTLogo letterColor={`rgb(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)})`} />
            </div>
          </button>

          {/* Desktop center — crossfades between nav links and section label */}
          <div className="relative hidden lg:flex items-center justify-center" style={{ minWidth: 0 }}>
            {/* Nav links — shown when not in a section */}
            <nav
              className="flex items-center justify-center gap-[30px] text-[14px] tracking-[-0.02em] transition-all duration-500"
              style={{
                opacity: showCompact ? 0 : 1,
                transform: showCompact ? 'translateY(-5px)' : 'translateY(0)',
                pointerEvents: showCompact ? 'none' : 'auto',
              }}
            >
              {NAV_LINKS.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`transition-colors duration-150 ${isDark ? 'hover:!text-white' : 'hover:!text-[#1A0F0A]'}`}
                  style={navLinkStyle(id)}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + (id === 'pricing' ? window.innerHeight * PRICING_NAV_OFFSET_VH : 0), behavior: scrollBehavior() });
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
            {/* Section label — shown when in a section */}
            <span
              className="absolute left-1/2 text-[14px] font-medium tracking-[-0.02em] whitespace-nowrap transition-all duration-500"
              style={{
                opacity: showCompact ? 1 : 0,
                transform: showCompact ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(5px)',
                color: isDark ? 'rgba(255,255,255,0.85)' : `rgba(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)},0.85)`,
                pointerEvents: 'none',
              }}
            >
              {SECTION_LABELS[activeSection] ?? ''}
            </span>
          </div>

          {/* Right side — desktop actions + mobile hamburger */}
          <div className="col-start-3 flex items-center justify-end">
            <div className="hidden lg:flex h-[37px] items-center gap-[15px] text-[14px] font-medium tracking-[-0.02em]" style={navTextStyle}>
              {/* Log In fades out in compact mode */}
              <a
                href="https://app.thinkdifferenttraining.com/access"
                className={`transition-all duration-500 hover:opacity-100 ${isDark ? 'hover:text-white' : 'hover:text-[#1A0F0A]'}`}
                style={{ opacity: showCompact ? 0 : 1, pointerEvents: showCompact ? 'none' : 'auto', marginRight: showCompact ? '-60px' : '0' }}
              >
                Log In
              </a>
              <CTAButton href="/apply" className={`whitespace-nowrap transition-all duration-500 ${showCompact ? 'h-[32px] px-[16px] text-[13px]' : 'h-[37px] px-[20px] text-[14px]'}`}>
                Apply
              </CTAButton>
            </div>
            <button
              ref={menuButtonRef}
              className="lg:hidden flex h-11 w-11 cursor-pointer items-center justify-center active:opacity-60"
              style={navTextStyle}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-haspopup="dialog"
            >
              <svg width="22" height="15" viewBox="0 0 22 15" fill="none">
                <path d="M0 1H22M0 7.5H22M0 14H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-col">

        {/* ── Hero ── */}
        <section ref={heroRef} className="relative w-full min-h-screen bg-black" style={{ minHeight: '100dvh' }}>
          {/* Background image — fades out when video is playing */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{ backgroundImage: "url('/hero.webp')", opacity: heroPlaying ? 0 : 1, backgroundSize: 'cover', backgroundAttachment: 'local' }}
          />
          {/* Video iframe — replace src with your video embed URL */}
          <iframe
            src={heroPlaying ? 'about:blank' : undefined}
            title="Training film"
            inert={!heroPlaying}
            className="absolute inset-0 w-full h-full transition-opacity duration-500"
            style={{ opacity: heroPlaying ? 1 : 0, pointerEvents: heroPlaying ? 'auto' : 'none', border: 'none' }}
            allow="autoplay; fullscreen"
          />
          {/* Bottom gradient overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 96%)', opacity: heroPlaying ? 0 : 1 }}
          />

          {/* Bottom-left content — hidden when video is playing */}
          <div
            className="absolute bottom-0 left-0 right-0 px-6 md:px-[60px] pb-[80px] transition-opacity duration-500 pointer-events-none"
            style={{ opacity: heroPlaying ? 0 : 1, pointerEvents: heroPlaying ? 'none' : 'auto' }}
          >
            <CountdownEyebrow />
            <h1
              className="text-[32px] md:text-[40px] lg:text-[48px] font-bold leading-[1.2] lg:leading-[57px] tracking-[-0.02em] max-w-[1150px] mb-[11px]"
              style={{
                background: 'linear-gradient(90deg, #FFFFFF 0%, rgba(20,20,20,0.75) 135%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              You&apos;re on the roster.
              <br />
              Now you need someone to notice.
            </h1>
            <p className="text-[14px] md:text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white/60 max-w-[507px] mb-[20px]">
              If getting recruited is the goal, we&apos;ll help you make the most of your prep season and become impossible to overlook.
            </p>
            <div className="flex items-center gap-[16px]">
              <CTAButton
                onClick={() => {
                  const el = document.getElementById('program');
                  if (el) el.scrollIntoView({ behavior: scrollBehavior() });
                }}
                className="h-[37px] px-[20px] text-[14px]"
              >
                See the program
              </CTAButton>
              <a
                href="/apply"
                className="group inline-flex items-center text-[14px] font-normal tracking-[-0.02em] text-white/80 transition-colors duration-200 ease-out hover:text-white"
              >
                <span className="underline underline-offset-4 decoration-white/40 transition-colors duration-200 ease-out group-hover:decoration-white/70">
                  Claim your spot
                </span>
                <span className="inline-block ml-[6px] transition-transform duration-300 ease-out group-hover:translate-x-[4px]">→</span>
              </a>
            </div>
          </div>

          {/* Play / fullscreen button — bottom right */}
          <button
            onClick={heroPlaying ? handleHeroFullscreen : handleHeroPlay}
            className="absolute cursor-pointer right-6 md:right-[60px] bottom-[80px] w-[60px] h-[60px] rounded-full flex items-center justify-center hover:opacity-90 active:scale-95"
            style={{
              background: 'rgba(146,146,146,0.75)',
              backdropFilter: 'blur(8px)',
              transition: 'opacity 0.2s ease, transform 0.15s ease',
            }}
            aria-label={heroPlaying ? 'Go fullscreen' : 'Play video'}
          >
            {/* ▶ play — visible when idle */}
            <span
              className="absolute flex items-center justify-center"
              style={{
                opacity: heroIconMorphed ? 0 : 1,
                transform: heroIconMorphed ? 'scale(1.25) rotate(60deg)' : 'scale(1) rotate(0deg)',
                transition: 'opacity 0.18s ease, transform 0.18s ease',
              }}
            >
              <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
                <path d="M4 2.5L18 11L4 19.5V2.5Z" fill="#343434"/>
              </svg>
            </span>
            {/* ⤢ expand — visible when video is playing */}
            <span
              className="absolute flex items-center justify-center"
              style={{
                opacity: heroIconMorphed ? 1 : 0,
                transform: heroIconMorphed ? 'scale(1) rotate(0deg)' : 'scale(0.6) rotate(-60deg)',
                transition: 'opacity 0.18s ease 0.05s, transform 0.18s ease 0.05s',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 2H7M2 2V7M2 2L7 7" stroke="#343434" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 2H13M18 2V7M18 2L13 7" stroke="#343434" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 18H7M2 18V13M2 18L7 13" stroke="#343434" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18 18H13M18 18V13M18 18L13 13" stroke="#343434" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </button>

        </section>

        {/* ── Coach ── */}
        <section id="coach" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] py-[150px] bg-[#000000]">
          <div className="flex w-full max-w-[1156px] flex-col lg:flex-row items-center lg:items-start gap-[50px] lg:gap-[100px]">
            <div ref={coachContentRef} className="flex w-full lg:w-[491px] flex-col justify-center gap-[30px]">
              <div>
                <div className="flex flex-col gap-[18px]">
                  <p className="text-[18px] font-bold tracking-[-0.02em] text-white" style={{ lineHeight: '26px', ...revealLine(0) }}>
                    I've spent seven years next to some of the best players this country's ever made.
                  </p>
                  <p className="text-[18px] font-normal tracking-[-0.02em] text-[rgba(255,255,255,0.45)]" style={{ lineHeight: '26px', ...revealLine(150) }}>
                    Here's what I learned watching them.
                  </p>
                  <p className="text-[18px] font-bold tracking-[-0.02em] text-white" style={{ lineHeight: '26px', ...revealLine(300) }}>
                    The ones who get recruited aren't the ones who work hardest. They're the ones who knew exactly what was holding them back, and fixed it before anyone was watching.
                  </p>
                  <p className="text-[18px] font-normal tracking-[-0.02em] text-[rgba(255,255,255,0.45)]" style={{ lineHeight: '26px', ...revealLine(450) }}>
                    That's the whole job.
                  </p>
                  <p className="text-[18px] font-normal tracking-[-0.02em] text-[rgba(255,255,255,0.6)]" style={{ lineHeight: '26px', ...revealLine(600) }}>
                    Not generic drills. Not recycled advice. I find the one thing keeping you off the floor. Then we put it on film, and we fix it, so when the right people finally watch,{' '}
                    <span className="font-bold text-white">there's nothing left to pass on.</span>
                  </p>
                </div>
                <p className="text-[24px] font-normal leading-[31px] tracking-[-0.02em] text-[rgba(255,255,255,0.8)] mt-5" style={{ fontFamily: "'Pinyon Script', cursive", ...signatureReveal }}>
                  Jaiden Francais
                </p>
              </div>
              <div style={fadeUp(1150)} className="flex flex-col gap-[12px] text-left">
                <span className="text-[12px] font-normal leading-[14px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)]">ATHLETES TRAINED FROM</span>
                <div className="flex items-center gap-[24px]">
                  {[
                    { src: '/nba.png', alt: 'NBA', h: 44 },
                    { src: '/canada-basketball.png', alt: 'Canada Basketball', h: 48 },
                    { src: '/york-university.png', alt: 'York University', h: 40 },
                    { src: '/bcp.png', alt: 'Brampton City Prep', h: 42 },
                  ].map(({ src, alt, h }, i) => (
                    <img
                      key={alt}
                      src={src}
                      alt={alt}
                      style={
                        coachVisible
                          ? {
                              height: h,
                              width: 'auto',
                              // No inline opacity/transform here — leaving those to the
                              // hover: classes below. Inline values would always win over
                              // the stylesheet's :hover rules and silently disable them.
                              transition: 'opacity 450ms cubic-bezier(0.16, 1, 0.3, 1), filter 450ms cubic-bezier(0.16, 1, 0.3, 1), transform 450ms cubic-bezier(0.16, 1, 0.3, 1)',
                            }
                          : {
                              height: h,
                              width: 'auto',
                              opacity: 0,
                              transform: 'translateY(18px)',
                              transition: `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${1220 + i * 80}ms, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${1220 + i * 80}ms`,
                            }
                      }
                      className="object-contain opacity-80 brightness-[0.75] hover:opacity-100 hover:brightness-100 hover:scale-[1.05] hover:-translate-y-[3px]"
                    />
                  ))}
                </div>
              </div>
            </div>

            <CoachCarousel />
          </div>
        </section>

        {/* ── Program ── */}
        {(() => {
          const STEPS = PROGRAM_STEPS;
          const STEP_VH = PROGRAM_STEP_VH; // scroll distance (% of viewport) needed to advance one step — lower = less scroll friction
          const activeStep = programActiveStep;

          return (
            <section id="program" className="relative w-full bg-[#000000]">
              <ProgramIconStyles />

              {/* Mobile: no pinning — see ProgramMobile for why. */}
              <ProgramMobile />

              {/* Desktop/tablet: sticky pin-and-release. Tall scroll container —
                  one screen per step, plus a short buffer at the end so the last
                  step lingers before the sticky section releases. */}
              <div className="hidden md:block" style={{ height: `${STEPS.length * STEP_VH + PROGRAM_END_BUFFER_VH}svh` }}>

                <div ref={cardsStartRef} />

                {/* "The Method" sticky header — scoped to stages 01–02 only. This
                    wrapper is absolutely positioned over just the first two stages'
                    worth of scroll (2 * STEP_VH), so the sticky child inside it runs
                    out of room — and releases — right as stage 03 begins, instead of
                    riding the page's full sticky span like the content viewport below. */}
                {/* Single sticky viewport */}
                <div className="sticky top-[64px] lg:top-[98px] h-[calc(100svh-64px)] lg:h-[calc(100svh-98px)] flex flex-col overflow-hidden px-6 md:px-12 lg:px-[100px]">

                  {/* The "Make them rewind." header rides with the screenshot frame in
                      the right column below, so it stays anchored just above the product
                      shot at every viewport size instead of floating at the pane top. */}

                  {/* Main content */}
                  <div className="relative z-10 flex flex-col md:flex-row flex-1 items-center gap-[8px] md:gap-[60px] lg:gap-[80px] min-h-0">

                    {/* Left — animated text */}
                    <div className="relative w-full md:w-[42%] lg:w-[38%] flex-shrink-0 h-[26%] md:h-full flex items-center">
                      {STEPS.map((s, i) => (
                        <div
                          key={s.slug}
                          className="absolute inset-0 flex flex-col justify-end md:justify-center gap-[12px] md:gap-[18px]"
                          style={{
                            opacity:   activeStep === i ? 1 : 0,
                            transform: `translateY(${activeStep === i ? 0 : activeStep > i ? -20 : 20}px)`,
                            transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)',
                            pointerEvents: activeStep === i ? 'auto' : 'none',
                          }}
                        >
                          {/* Icon sits inline with the label at every breakpoint */}
                          <div className="flex flex-row items-center gap-[8px] text-[#C2552F]">
                            <ProgramStepIcon
                              name={s.icon}
                              active={activeStep === i}
                              className="h-[16px] w-[16px] flex-shrink-0 md:h-[18px] md:w-[18px]"
                            />
                            <span className="text-[11px] font-semibold tracking-normal uppercase text-[rgba(179,73,41,0.85)]">
                              {s.label}
                            </span>
                          </div>
                          <h2 className="text-[38px] md:text-[44px] lg:text-[50px] font-bold leading-[1.12] tracking-[-0.025em] text-white">
                            {s.title}
                          </h2>
                          <p className="text-[14px] md:text-[15px] font-normal leading-[19px] text-white/50 max-w-[400px]">
                            {s.body}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Right — persistent UI frame */}
                    <div className="flex w-full flex-1 flex-col items-stretch justify-center md:items-end h-[66%] md:h-full py-0 md:py-[16px]">
                      {/* Header sits with the frame so it always hugs the screenshot */}
                      <div className="flex flex-col items-end gap-[3px] pb-[25px] flex-shrink-0 text-right">
                        <h2 className="text-[17px] md:text-[19px] font-bold tracking-[-0.025em] text-white/55">
                          Make them rewind.
                        </h2>
                        <span className="text-[11px] font-medium text-white/25 tracking-[0.06em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {STEPS[activeStep].num} <span className="text-white/12">/ {String(STEPS.length).padStart(2, '0')}</span>
                        </span>
                      </div>
                      {/* Ambient glow behind frame */}
                      <div className="relative w-full" style={{ maxHeight: '100%', aspectRatio: '16 / 10' }}>
                        <div
                          className="absolute inset-0 rounded-[24px] pointer-events-none"
                          style={{ background: 'radial-gradient(ellipse at 50% 110%, rgba(179,73,41,0.18) 0%, transparent 65%)' }}
                        />
                        {/* Frame */}
                        <div
                          className="relative w-full h-full overflow-hidden rounded-[16px]"
                          style={{
                            background: '#0c0c0c',
                            border: '1px solid rgba(255,255,255,0.07)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 100px rgba(0,0,0,0.65), 0 8px 32px rgba(0,0,0,0.4)',
                          }}
                        >
                          {/* Screenshot layers */}
                          <div className="relative" style={{ height: '100%' }}>
                            {STEPS.map((s, i) => (
                              <div
                                key={s.slug}
                                className="absolute inset-0 bg-cover"
                                style={{
                                  backgroundImage: `url(/${s.image})`,
                                  backgroundPosition: s.imagePosition ?? 'top',
                                  backgroundColor: 'rgba(255,255,255,0.025)',
                                  opacity:   activeStep === i ? 1 : 0,
                                  transform: `scale(${activeStep === i ? 1 : 1.025})`,
                                  transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                                }}
                              />
                            ))}
                            {/* Bottom fade so screenshot bleeds into darkness */}
                            <div className="absolute bottom-0 left-0 right-0 h-[12%] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, rgba(12,12,12,0.35))' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            </section>
          );
        })()}

        {/* ── Difference ── */}
        {(() => {
          const ROWS = [
            {
              slug: 'priority',
              topic: 'Priority',
              tdt: 'Getting you an offer',
              others: "Winning this week's game",
            },
            {
              slug: 'focus',
              topic: 'Focus',
              tdt: "You and Jaiden. That's it",
              others: "A roster full of names, coach's attention split",
            },
            {
              slug: 'film',
              topic: 'Film',
              tdt: 'Broken down, every submission',
              others: 'Rarely watched close, if at all',
            },
            {
              slug: 'feedback',
              topic: 'Feedback',
              tdt: 'Specific to your game',
              others: 'General notes for the whole team',
            },
            {
              slug: 'tracking',
              topic: 'Tracking',
              tdt: 'Your progress, logged every session',
              others: 'No real record of what improved',
            },
          ];

          return (
            <section id="difference" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] py-[150px] bg-[#000000]">
              <div className="flex w-full max-w-[1156px] flex-col items-center gap-[20px]">
                <h3 className="text-center text-[18px] md:text-[20px] font-medium leading-[24px] tracking-[-0.02em]" style={{ color: `rgba(255,255,255,${activeSection === 'difference' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>
                  What makes this{' '}
                  <span
                    style={{
                      color: activeSection === 'difference' ? '#FF7A45' : 'rgba(179,73,41,0.6)',
                      textShadow: activeSection === 'difference' ? '0 0 18px rgba(255,122,69,0.55)' : 'none',
                      transition: 'color 0.4s ease, text-shadow 0.4s ease',
                    }}
                    className="italic"
                  >
                    different
                  </span>
                </h3>
                <h2 className="w-full max-w-[620px] text-center text-[22px] md:text-[26px] font-normal leading-[30px] md:leading-[34px] tracking-[-0.02em] text-white">
                  Not your <strong className="italic">$29.99/month</strong> course.
                  <br />
                  This is training built around one thing, getting you an offer.
                </h2>
              </div>

              {/* Same table on every breakpoint — scaled down on mobile, horizontal-scroll fallback if it still overflows */}
              {/* 0.72 rather than 0.62: at 0.62 the table's 16px cells render at
                  ~9.9px on a phone, which is below comfortable reading size. The
                  overflow-x-auto wrapper absorbs the extra width. */}
              <style>{`
                .diff-table-sizer { width: 648px; height: 518px; }
                .diff-table-scaled { width: 900px; height: 720px; transform: scale(0.72); transform-origin: top left; }
                @media (min-width: 1024px) {
                  .diff-table-sizer { width: 900px; height: 720px; }
                  .diff-table-scaled { transform: scale(1); }
                }
              `}</style>
              <div className="w-full overflow-x-auto lg:overflow-visible">
                <div className="mx-auto diff-table-sizer">
                  <div className="diff-table-scaled">
                    <div
                      ref={tableRef}
                      className="flex flex-row items-end w-[900px] h-[720px] overflow-hidden"
                      style={{ borderBottom: '1px solid #333333', borderRadius: '14px' }}
                    >
                {/* Topics column — 300×600, aligned to bottom via parent align-items:flex-end */}
                <div className="flex flex-col w-[300px] h-[600px]">
                  {ROWS.map((row, i) => ({
                    slug: row.slug,
                    topic: row.topic,
                    bw: `${i === 0 ? '1px' : '0px'} 0px 1px 1px`,
                    br: i === 0 ? '15px 0px 0px 0px' : i === ROWS.length - 1 ? '0px 0px 0px 14px' : '0px',
                  })).map((row, i) => (
                    <div
                      key={row.slug}
                      className="flex items-center justify-center p-[10px] w-[300px] h-[120px]"
                      style={{
                        borderWidth: row.bw, borderStyle: 'solid', borderColor: '#333333', borderRadius: row.br,
                        // Entrance
                        opacity: tableVisible ? 1 : 0,
                        transform: tableVisible ? 'translateY(0px)' : 'translateY(12px)',
                        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                        backgroundColor: hoveredRow === row.slug ? 'rgba(255,255,255,0.05)' : 'transparent',
                      }}
                      onMouseEnter={() => setHoveredRow(row.slug)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <span
                        className="text-center text-[16px] font-medium leading-[19px] tracking-[-0.02em]"
                        style={{
                          color: hoveredRow === row.slug ? '#ffffff' : 'rgba(255,255,255,0.75)',
                          transition: 'color 0.25s ease',
                        }}
                      >
                        {row.topic}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Differences container — TDT + Others, 600×600 */}
                <div
                  className="flex flex-row w-[600px] h-[720px]"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: '15px 0px 14px 14px' }}
                >
                  {/* TDT column */}
                  <div className="flex flex-col w-[300px] h-[720px]">
                    <div
                      className="flex items-center w-[300px] h-[120px] px-[30px] gap-[10px] bg-[#B34929] flex-shrink-0"
                      style={{ borderRadius: '15px 0px 0px 0px' }}
                    >
                      <TDTLogo letterColor="white" width={30} height={35} />
                      <span className="text-[18px] font-medium leading-[22px] tracking-[-0.02em] text-white">
                        Think Different Training
                      </span>
                    </div>
                    {ROWS.map((row, i) => ({
                      slug: row.slug,
                      text: row.tdt,
                      bw: `${i === 0 ? '1px' : '0px'} 1px 1px 1px`,
                    })).map((row, i) => (
                      <div
                        key={row.slug}
                        className="flex items-center w-[300px] h-[120px] px-[30px] bg-[#B34929]"
                        style={{
                          borderWidth: row.bw, borderStyle: 'solid', borderColor: 'rgba(0,0,0,0.4)',
                          // Entrance
                          opacity: tableVisible ? 1 : 0,
                          transform: tableVisible ? 'translateY(0px)' : 'translateY(12px)',
                          transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, background-color 0.2s ease`,
                          backgroundColor: hoveredRow === row.slug ? '#C2552F' : '#B34929',
                        }}
                        onMouseEnter={() => setHoveredRow(row.slug)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white">
                          {row.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Others column */}
                  <div className="flex flex-col w-[300px] h-[720px]">
                    <div
                      className="flex items-center w-[300px] h-[120px] px-[30px] flex-shrink-0"
                      style={{ borderWidth: '1px 1px 0px 0px', borderStyle: 'solid', borderColor: '#333333', borderRadius: '0px 15px 0px 0px' }}
                    >
                      <span className="text-[18px] font-medium leading-[22px] tracking-[-0.02em] text-white/50">
                        Everywhere else
                      </span>
                    </div>
                    {ROWS.map((row, i) => ({
                      slug: row.slug,
                      text: row.others,
                      bw: `${i === 0 ? '1px' : '0px'} 1px 1px 0px`,
                      br: i === ROWS.length - 1 ? '0px 0px 14px 0px' : '0px',
                    })).map((row, i) => (
                      <div
                        key={row.slug}
                        className="flex items-center justify-start w-[300px] h-[120px] px-[30px]"
                        style={{
                          borderWidth: row.bw, borderStyle: 'solid', borderColor: '#333333',
                          borderRadius: (row as any).br ?? '0px',
                          // Entrance
                          opacity: tableVisible ? 1 : 0,
                          transform: tableVisible ? 'translateY(0px)' : 'translateY(12px)',
                          transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, background-color 0.2s ease`,
                          backgroundColor: hoveredRow === row.slug ? 'rgba(255,255,255,0.05)' : 'transparent',
                        }}
                        onMouseEnter={() => setHoveredRow(row.slug)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white/50 text-left">
                          {row.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* ── Quote ── */}
        <section className="relative flex w-full flex-col items-center px-6 md:px-12 lg:px-[100px] py-[100px] md:py-[130px] bg-[#000000]">
          <blockquote className="w-full max-w-[900px] text-center">
            <p className="text-[22px] md:text-[32px] font-medium italic leading-[1.4] tracking-[-0.02em] text-white/90">
              &ldquo;The right sort of practice carried out over a sufficient period of time leads to improvement.
              Nothing else.&rdquo;
            </p>
            <footer className="mt-[24px] text-[13px] md:text-[14px] font-medium tracking-[0.04em] uppercase text-[rgba(179,73,41,0.85)]">
              — Anders Ericsson
            </footer>
          </blockquote>
        </section>

        {/* ── Pricing — the lights come up and the card is right there in the spotlight ── */}
        <section id="pricing" ref={transitionZoneRef} className="relative w-full" style={{ height: '175vh' }}>
          <div
            className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center px-6 md:px-12 lg:px-[100px]"
            style={{ backgroundColor: panelBg, color: '#000' }}
          >
            {/* Expanding blade of light — thin at first, blooms as it opens across the frame */}
            <div
              className="absolute left-1/2 top-1/2 pointer-events-none z-0"
              style={{
                width: `${lerp(0, 165, flip)}%`,
                height: lerp(1, 4, flash),
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(90deg, transparent, #FFFFFF, transparent)',
                boxShadow: `0 0 ${lerp(0, 120, flash)}px ${lerp(0, 34, flash)}px rgba(255,238,220,${flash})`,
                opacity: flip > 0.001 && flip < 0.999 ? 1 : 0,
              }}
            />
            {/* Full-frame white burst that blows out at the midpoint, then recedes into the light */}
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                background: 'radial-gradient(ellipse 100% 75% at 50% 50%, #FFFFFF 0%, rgba(255,246,236,0.65) 38%, transparent 78%)',
                opacity: Math.pow(flash, 1.25),
                mixBlendMode: 'screen',
              }}
            />

            {/* The card + text, revealed by the light */}
            <div
              className="relative z-10 flex w-full max-w-[1156px] mx-auto flex-col lg:flex-row items-center gap-[50px] lg:gap-[70px]"
              style={{
                opacity: revealEased,
                transform: `translateY(${lerp(28, 0, revealEased)}px) scale(${(0.94 + 0.06 * revealEased).toFixed(4)})`,
              }}
            >
              {/* Left — card by itself */}
              <div className="relative w-full flex-1 rounded-[24px]" style={{ aspectRatio: '633/399' }}>
                <Spline
                  scene="https://prod.spline.design/EDGt2tyGvNwlGnGh/scene.splinecode"
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
              </div>

              {/* Right — heading, subtext, CTA */}
              <div className="flex w-full lg:w-[420px] flex-shrink-0 flex-col items-center lg:items-start gap-[16px] text-center lg:text-left">
                <PricingPopover />
                <div className="flex flex-col gap-[6px] items-center lg:items-start">
                  <h2
                    className="text-[36px] md:text-[48px] font-bold leading-tight tracking-[-0.02em]"
                    style={{
                      background: 'linear-gradient(105deg, #3D2418, #B34929, #E8A87C, #B34929, #3D2418)',
                      backgroundSize: '200% auto',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'tdt-gradient-pan 5s linear infinite',
                    }}
                  >
                    Your spot
                  </h2>

                  <p className="text-[16px] font-normal leading-[22px] tracking-[-0.02em] text-black/60">
                    Private coaching with Jaiden, one on one, for 100 days.
                  </p>
                </div>

                <CTAButton href="/apply" className="h-[42px] px-8 text-[16px]">
                  Claim your spot
                </CTAButton>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] py-[150px] bg-[#FBF6F2] text-black">
          <div className="flex w-full max-w-[1156px] flex-col items-center gap-[10px]">
            <h2 className="w-full max-w-[634px] text-center text-[28px] md:text-[40px] lg:text-[48px] font-bold leading-tight tracking-[-0.02em] text-[#1A0F0A]">
              Everything you need to know before applying.
            </h2>

            <div className="flex w-full flex-col items-start">
              {[
                {
                  question: "Why should I trust one guy's opinion over what my coach already tells me?",
                  answer: "Because your coach has a season to win and a full roster to manage. Getting you recruited isn't his job. Making you impossible to overlook is the only thing Jaiden's doing here.",
                },
                {
                  question: "How is this different from just watching my own film back?",
                  answer: "You already know what you think happened out there. The real question is what a recruiter sees, and that's usually not the same thing.",
                },
                {
                  question: "I already have a highlight tape. Isn't that enough?",
                  answer: "Here's a little freebie: recruiters look past that. Your best plays don't win you an offer, your worst habits lose it. What actually gets evaluated is what happens in between the highlights, the reads, the hesitations, the stuff you don't put in the tape. That's what this program is built to find.",
                },
                {
                  question: "Why are you only accepting 12 athletes?",
                  answer: "Jaiden is personally watching your film and holding your hand through every one of the 100 days. That's simply not possible past a certain number. 12 is the real limit for what one person can actually do right, not a marketing number.",
                },
                {
                  question: "Is this going to conflict with my school team or my current trainer?",
                  answer: "Not even a little. Nobody's asking you to choose. This runs next to what you're already doing. It just makes sure those reps are aimed at something.",
                },
                {
                  question: "What if I don't have film yet?",
                  answer: "Not a dealbreaker. Even a phone recording of a scrimmage or open gym works to start. Jaiden's looking for real reads and habits, not production value.",
                },
                {
                  question: "What if this doesn't lead to anything and we've wasted the money and the time?",
                  answer: "No one can promise an offer. What you're paying for is a real, tracked record of improvement and an honest assessment most players never get. That's worth something on its own.",
                },
              ].map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="flex w-full flex-col border-b border-[rgba(0,0,0,0.15)]">
                    <button
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex cursor-pointer items-start gap-[10px] px-0 py-[20px] text-left w-full min-h-[44px]"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                    >
                      <span className="flex-1 text-[14px] md:text-[16px] font-normal leading-[22px] md:leading-[19px] tracking-[-0.02em] text-[rgba(0,0,0,0.7)]">
                        {item.question}
                      </span>
                      <svg
                        width="24" height="24" viewBox="0 0 24 24" fill="none"
                        aria-hidden="true"
                        className="flex-shrink-0 mt-[2px]"
                        style={{
                          transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                          opacity: isOpen ? 0.6 : 0.2,
                          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
                        }}
                      >
                        <path d="M5.5 15.5L12 8.5L18.5 15.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <div
                      id={`faq-panel-${index}`}
                      role="region"
                      aria-hidden={!isOpen}
                      className="overflow-hidden"
                      style={{
                        maxHeight: isOpen ? '400px' : '0px',
                        opacity: isOpen ? 1 : 0,
                        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
                      }}
                    >
                      <p className="pb-[20px] text-[14px] font-normal leading-[22px] tracking-[-0.02em] text-[rgba(0,0,0,0.5)]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <a
              href="/apply"
              className="group self-start mt-[20px] inline-flex items-center gap-[4px] text-[14px] font-medium tracking-[-0.02em]"
              style={{ color: '#B34929' }}
            >
              Apply now
              <span
                className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-[6px]"
              >
                →
              </span>
            </a>
          </div>
        </section>

        {/* ── Footer ── */}
        <section className="w-full bg-[#FBF6F2] text-black">
          <div className="w-full px-6 md:px-12 lg:px-[100px] pt-[40px] pb-[40px]">
            <FooterText />
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-[10px] pt-[10px]">
              <div className="flex-1 flex flex-col items-center md:items-start gap-1 text-center md:text-left">
                <span className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)]">
                  © 2026 Think Different Training. All rights reserved.
                </span>
                <div className="flex items-center gap-[14px]">
                  <a href="/terms" className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors">
                    Terms of Service
                  </a>
                  <a href="/privacy" className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)] hover:text-black transition-colors">
                    Privacy Policy
                  </a>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center md:justify-end gap-[14px]">
                <span className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)]">
                  jaiden@thinkdifferenttraining.com
                </span>
                <a
                  href="https://www.instagram.com/thinkdifferent_training/?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Think Different Training on Instagram"
                  className="flex-shrink-0 text-[rgba(0,0,0,0.6)] transition-opacity hover:opacity-70"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>

    </div>
  );
}
