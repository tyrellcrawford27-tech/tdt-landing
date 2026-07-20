'use client';

import { useState, useEffect, useRef } from "react";
import { TDTLogo } from "@/components/TDTLogo";
import { FooterText } from "@/components/FooterText";
import { FilmGrain } from "@/components/FilmGrain";
import { CTAButton } from "@/components/CTAButton";
import { LaunchReveal } from "@/components/LaunchReveal";
import Spline from "@splinetool/react-spline";



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

function CoachCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrent(i => (i + 1) % COACH_IMAGES.length), 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex w-full lg:w-[565px] items-center justify-center lg:justify-end">
      {/* Dot indicators */}
      <div className="absolute left-0 top-0 hidden lg:flex h-full w-[12px] flex-col items-center justify-center gap-[10px]">
        {COACH_IMAGES.map((_img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="h-[12px] w-[12px] cursor-pointer rounded-full transition-all duration-300"
            style={{ backgroundColor: current === i ? 'white' : 'rgba(255,255,255,0.2)' }}
            aria-label={`Go to image ${i + 1}`}
          />
        ))}
      </div>
      {/* Frame */}
      <div className="relative w-full aspect-video lg:aspect-auto lg:h-[434px] lg:w-[543px] overflow-hidden rounded-[12px] border border-white/40 bg-[#111111]">
        {COACH_IMAGES.map((img, i) => (
          <div
            key={img.src}
            className="absolute inset-0 bg-cover transition-opacity duration-700"
            style={{
              backgroundImage: `url(${img.src})`,
              backgroundPosition: img.position,
              opacity: current === i ? 1 : 0,
            }}
          />
        ))}
        {/* Subtle bottom vignette */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,rgba(0,0,0,0.45)_100%)] pointer-events-none" />
      </div>
    </div>
  );
}

// TESTING: 30s from load — change back to new Date('2026-08-01T00:00:00') for production
const LAUNCH_DATE = new Date('2026-08-01T00:00:00');

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
      <div className="flex items-center gap-[8px] pl-[14px] pr-[12px] py-[9px]">
        <span className="relative flex h-[6px] w-[6px] flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: '#B34929' }} />
          <span className="relative inline-flex h-[6px] w-[6px] rounded-full" style={{ backgroundColor: '#B34929' }} />
        </span>
        <span className="text-[11px] font-medium tracking-[-0.02em] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Cohort 1 · Aug 1
        </span>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch" style={{ background: 'rgba(255,255,255,0.09)', margin: '6px 0' }} />

      {/* Right — countdown units */}
      <div className="flex items-center gap-[14px] pl-[14px] pr-[16px] py-[9px]">
        {units.map(({ v, l }, i) => (
          <div key={l} className="flex items-baseline gap-[2px]">
            <span
              className="text-[15px] font-semibold leading-none text-white"
              style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', letterSpacing: '-0.01em' }}
            >
              {String(v).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-medium leading-none" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {l}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const transitionZoneRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const cardsStartRef = useRef<HTMLDivElement>(null);
  const coachContentRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SECTIONS = ['coach', 'program', 'difference', 'pricing', 'faq'];
    const onScroll = () => {
      setScrolled(prev => window.scrollY > (prev ? 40 : 80));
      if (transitionZoneRef.current) {
        const r = transitionZoneRef.current.getBoundingClientRect();
        setTp(Math.max(0, Math.min(1, -r.top / r.height)));
      }
      if (cardsStartRef.current) {
        const r = cardsStartRef.current.getBoundingClientRect();
        setProgramProgress(Math.max(0, -r.top) / window.innerHeight);
      }
      const mid = window.innerHeight * 0.45;
      let active = '';
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= mid) active = id;
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
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const isDark = tp < 0.5;
  const isCompact = !!activeSection;
  const showCompact = isCompact && !navHovered;
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const panelBg = `rgb(${lerp(0,251,tp)},${lerp(0,246,tp)},${lerp(0,242,tp)})`;
  const navBgStyle = { backgroundColor: `rgba(${lerp(0,251,tp)},${lerp(0,246,tp)},${lerp(0,242,tp)},${tp < 0.5 ? 0.96 : 0.92})` };
  const navBorderStyle = { borderColor: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},0.12)` };
  const navTextStyle = {
    color: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},${!scrolled && !showCompact ? 0.8 : 0.6})`,
    textShadow: !scrolled && !showCompact ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
  };
  const navLinkStyle = (id: string) => ({
    color: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},${activeSection === id ? 1 : !scrolled && !showCompact ? 0.72 : 0.4})`,
    transition: 'color 0.3s ease',
    fontWeight: activeSection === id ? '500' : '400',
    textShadow: !scrolled && !showCompact ? '0 1px 6px rgba(0,0,0,0.5)' : 'none',
  });

  const fadeUp = (delay: number): React.CSSProperties => ({
    opacity: coachVisible ? 1 : 0,
    transform: coachVisible ? 'translateY(0px)' : 'translateY(18px)',
    transition: `opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
  });

  const signatureReveal: React.CSSProperties = {
    opacity: coachVisible ? 1 : 0,
    clipPath: coachVisible ? 'inset(0 0% 0 0)' : 'inset(0 102% 0 0)',
    transition: 'opacity 0.4s ease 580ms, clip-path 1.2s cubic-bezier(0.4, 0, 0.15, 1) 520ms',
  };

  return (
    <div className="relative min-h-screen">

      {/* ── Film grain overlay ── */}
      <FilmGrain />
      {launched && <LaunchReveal onClose={() => setLaunched(false)} />}

      {/* ── Mobile full-screen menu overlay ── */}
      <div
        className={`fixed inset-0 z-[100] flex flex-col lg:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          backgroundColor: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Top bar — mirrors the header: logo left, close right */}
        <div className="flex h-[64px] items-center justify-between px-6">
          <div className="flex h-[38px] w-[34px] items-center justify-center">
            <TDTLogo letterColor="rgb(255,255,255)" />
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center text-white/70"
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Links — numbered, staggered entrance */}
        <nav className="flex flex-1 flex-col justify-center px-8">
          {NAV_LINKS.map(({ id, label }, i) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex cursor-pointer items-baseline gap-[16px] border-b border-white/[0.08] py-[18px] last:border-b-0"
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
                setTimeout(() => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' }); }, 150);
              }}
            >
              <span className="text-[11px] font-semibold tracking-[0.1em] text-[#B34929]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                0{i + 1}
              </span>
              <span className="text-[30px] font-medium tracking-[-0.02em] text-white/90">{label}</span>
            </a>
          ))}
        </nav>

        {/* Bottom actions */}
        <div
          className="flex w-full flex-col items-center gap-[18px] px-6 pb-10"
          style={{
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
            transition: menuOpen
              ? 'opacity 0.45s cubic-bezier(0.16,1,0.3,1) 420ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) 420ms'
              : 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <a href="https://app.thinkdifferenttraining.com/access" className="text-[14px] text-white/60">Log In</a>
          <CTAButton href="https://cal.com/tyrell-crawford-2pjfa2/30min" target="_blank" rel="noopener noreferrer" className="w-full h-[48px] text-[15px]">
            See it in action
          </CTAButton>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="fixed top-0 z-50 flex h-[64px] lg:h-[98px] w-full items-center justify-center pointer-events-none">
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border pointer-events-auto"
          onMouseEnter={() => setNavHovered(true)}
          onMouseLeave={() => setNavHovered(false)}
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
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`flex cursor-pointer items-center justify-center flex-shrink-0 overflow-hidden transition-all duration-500 ${showCompact ? 'h-[38px] w-[34px]' : scrolled ? 'h-[34px] w-[30px]' : 'h-[40px] w-[36px]'}`}
            aria-label="Back to top"
          >
            <TDTLogo letterColor={`rgb(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)})`} />
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
                    const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
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
                color: isDark ? 'rgba(255,255,255,0.85)' : `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},0.85)`,
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
              <CTAButton href="https://cal.com/tyrell-crawford-2pjfa2/30min" target="_blank" rel="noopener noreferrer" className={`whitespace-nowrap transition-all duration-500 ${showCompact ? 'h-[32px] px-[16px] text-[13px]' : 'h-[37px] px-[20px] text-[14px]'}`}>
                See it in action
              </CTAButton>
            </div>
            <button
              className="lg:hidden flex h-11 w-11 cursor-pointer items-center justify-center"
              style={navTextStyle}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
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
            style={{ backgroundImage: "url('/hero.jpg')", opacity: heroPlaying ? 0 : 1, backgroundSize: 'cover', backgroundAttachment: 'local' }}
          />
          {/* Video iframe — replace src with your video embed URL */}
          <iframe
            src={heroPlaying ? 'about:blank' : undefined}
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
            <h1
              className="text-[32px] md:text-[40px] lg:text-[48px] font-bold leading-[1.2] lg:leading-[57px] tracking-[-0.02em] max-w-[1150px] mb-[11px]"
              style={{
                background: 'linear-gradient(90deg, #FFFFFF 0%, rgba(20,20,20,0.75) 135%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              At this level, everyone's talented.<br className="hidden md:block" /> Nobody's told you what actually separates you.
            </h1>
            <p className="text-[14px] md:text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white/60 max-w-[507px] mb-[20px]">
              You're at prep school. Every game's on film. Let's tear it apart and find out what separates you.
            </p>
            <div className="flex items-center gap-[16px]">
              <CTAButton href="/apply" className="h-[37px] px-[20px] text-[14px]">
                Claim your spot
              </CTAButton>
              <span
                className="text-[14px] italic font-normal leading-[17px] tracking-[-0.02em] text-white/70 cursor-pointer"
                onClick={() => {
                  const el = document.getElementById('program');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                See how it works
              </span>
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
          <div className="flex w-full max-w-[1156px] flex-col lg:flex-row items-center gap-[50px] lg:gap-[100px]">
            <div ref={coachContentRef} className="flex w-full lg:w-[491px] flex-col justify-center gap-[30px]">
              <div>
                <p style={{ ...fadeUp(0), lineHeight: '20px' }} className="text-[18px] font-bold tracking-[-0.02em] text-[rgba(255,255,255,0.6)]">
                  Seven years, I trained alongside some of the best this country has produced. I know the difference between someone who works hard and someone who{' '}
                  <span className="text-white">actually gets better.</span>
                  {' '}It's knowing exactly what to fix. Every athlete here gets my{' '}
                  <span className="text-white">eyes on their specific game.</span>
                  {' '}Not generic feedback. The truth about what's holding you back.
                </p>
                <p className="text-[24px] font-normal leading-[31px] tracking-[-0.02em] text-[rgba(255,255,255,0.8)] mt-5" style={{ fontFamily: "'Pinyon Script', cursive", ...signatureReveal }}>
                  -Jaiden Francais
                </p>
              </div>
              <div style={fadeUp(700)} className="flex flex-col gap-[12px] text-left">
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
                      style={{ height: h, width: 'auto', ...fadeUp(760 + i * 80) }}
                      className="object-contain opacity-80 hover:opacity-100 transition-opacity duration-300"
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
          const STEPS = [
            { slug: 'diagnosis',    label: 'Diagnosis',    num: '01', title: 'Get assessed like a recruiter would.',       body: "Send your best film. Jaiden watches it like a scout, draws directly on it, tells you exactly what he sees and what to fix. No cold drills, no standardized test. Just your actual game, evaluated honestly.", image: 'diagnosis-landing.png' },
            { slug: 'prescription', label: 'Prescription', num: '02', title: "Your weakness, not everyone else's workout.", body: "Every drill you get is pulled straight from what Jaiden saw in your film, the exact things standing between you and an offer.",                                                                                image: 'drill-library-landing.png' },
            { slug: '100-days',     label: 'The 100 Days', num: '03', title: 'The work nobody sees.',                       body: "A 100-day plan built for one thing, turning you into the player who gets the offer. Surgical film review. In-depth calls about exactly what it takes to get to the next level.",                              image: '100-days.png'    },
            { slug: 'proof',        label: 'The Proof',    num: '04', title: 'Now go get it.',                              body: "Walk away with the skills and the knowledge to get the offer you know you're capable of getting. Not someone's opinion of you, real improvement, in real games, that recruiters actually see.",              image: 'proof.png'       },
          ];
          const activeStep = Math.min(STEPS.length - 1, Math.max(0, Math.floor(programProgress)));

          return (
            <section id="program" className="relative w-full bg-[#000000]">

              {/* Tall scroll container — one screen per step, plus a buffer at the
                  end so the last step lingers before the sticky section releases */}
              <div style={{ height: `${STEPS.length * 100 + 50}svh` }}>

                <div ref={cardsStartRef} />

                {/* Single sticky viewport */}
                <div className="sticky top-[64px] lg:top-[98px] h-[calc(100svh-64px)] lg:h-[calc(100svh-98px)] flex flex-col overflow-hidden px-6 md:px-12 lg:px-[100px]">

                  {/* Watermark step number */}
                  <div aria-hidden="true" className="pointer-events-none select-none absolute inset-0 flex items-center overflow-hidden">
                    {STEPS.map((s, i) => (
                      <span
                        key={s.slug}
                        className="absolute font-black leading-none text-white"
                        style={{
                          fontSize: 'clamp(160px, 26vw, 380px)',
                          letterSpacing: '-0.04em',
                          left: '-0.02em',
                          opacity: activeStep === i ? 0.045 : 0,
                          transition: 'opacity 0.6s ease',
                        }}
                      >
                        {s.num}
                      </span>
                    ))}
                  </div>

                  {/* Header row — counter pinned right */}
                  <div className="relative z-10 flex items-center justify-center pt-[36px] pb-[44px] flex-shrink-0">
                    <span className="absolute right-0 text-[12px] font-medium text-white/25 tracking-[0.06em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {STEPS[activeStep].num} <span className="text-white/12">/ 04</span>
                    </span>
                  </div>

                  {/* Main content */}
                  <div className="relative z-10 flex flex-col md:flex-row flex-1 items-center gap-[20px] md:gap-[60px] lg:gap-[80px] min-h-0">

                    {/* Left — animated text */}
                    <div className="relative w-full md:w-[42%] lg:w-[38%] flex-shrink-0 h-[42%] md:h-full flex items-center">
                      {STEPS.map((s, i) => (
                        <div
                          key={s.slug}
                          className="absolute inset-0 flex flex-col justify-center gap-[18px]"
                          style={{
                            opacity:   activeStep === i ? 1 : 0,
                            transform: `translateY(${activeStep === i ? 0 : activeStep > i ? -20 : 20}px)`,
                            transition: 'opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.55s cubic-bezier(0.16,1,0.3,1)',
                            pointerEvents: activeStep === i ? 'auto' : 'none',
                          }}
                        >
                          <span className="text-[11px] font-semibold tracking-normal uppercase text-[rgba(179,73,41,0.85)]">
                            {s.label}
                          </span>
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
                    <div className="flex w-full flex-1 items-center justify-center md:justify-end h-[50%] md:h-full py-0 md:py-[16px]">
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
                                className="absolute inset-0 bg-cover bg-top"
                                style={{
                                  backgroundImage: `url(/${s.image})`,
                                  backgroundColor: 'rgba(255,255,255,0.025)',
                                  opacity:   activeStep === i ? 1 : 0,
                                  transform: `scale(${activeStep === i ? 1 : 1.025})`,
                                  transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                                }}
                              />
                            ))}
                            {/* Bottom fade so screenshot bleeds into darkness */}
                            <div className="absolute bottom-0 left-0 right-0 h-[30%] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, rgba(12,12,12,0.8))' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bottom — step progress */}
                  <div className="relative z-10 flex items-center gap-[5px] pb-[36px] pt-[28px] flex-shrink-0">
                    {STEPS.map((s, i) => (
                      <div key={s.slug} className="flex items-center gap-[5px]" style={{ flex: activeStep === i ? 4 : 1, transition: 'flex 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
                        <div
                          className="h-[2px] w-full rounded-full"
                          style={{
                            background: i < activeStep ? 'rgba(179,73,41,0.35)' : i === activeStep ? '#B34929' : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.4s ease',
                          }}
                        />
                        {activeStep === i && (
                          <span className="text-[10px] font-medium text-[rgba(179,73,41,0.7)] tracking-[0.08em] whitespace-nowrap">{s.label.toUpperCase()}</span>
                        )}
                      </div>
                    ))}
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
              slug: 'stand',
              topic: 'Is anyone being honest with me?',
              tdt: "Jaiden watches your film like a recruiter, and tells you exactly what's standing between you and an offer.",
              others: "Coaches focused on winning this week, not on getting you recruited.",
            },
            {
              slug: 'alone',
              topic: 'Am I working on the right thing?',
              tdt: "Drills built off exactly what's holding you back from an offer.",
              others: 'Team practice, built for the team, not your case to a recruiter.',
            },
            {
              slug: 'feedback',
              topic: 'Is someone actually tracking my case?',
              tdt: "Every submission, every session. Someone whose only job is your path to an offer.",
              others: "Coaches juggling a full roster, with no time to focus on just you.",
            },
            {
              slug: 'proof',
              topic: 'Could I prove I got better?',
              tdt: 'A real, tracked record of the improvement that shows up on tape this season.',
              others: "A feeling, maybe a compliment, from someone with 14 other guys to worry about.",
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
                  Not your <strong className="italic">$29.99/month</strong> course. This is what it looks like when someone's evaluation is actually built around getting you an offer.
                </h2>
              </div>

              {/* Mobile: stacked cards */}
              <div className="flex lg:hidden w-full max-w-[540px] flex-col gap-4">
                {ROWS.map((row, i) => (
                  <div
                    key={row.slug}
                    className="overflow-hidden rounded-[18px] bg-[#0c0c0c] border border-white/[0.06]"
                    style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.4)' }}
                  >
                    {/* Question */}
                    <div className="flex items-center gap-[10px] px-5 pt-5 pb-4">
                      <span className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[11px] font-bold text-white/50">
                        {i + 1}
                      </span>
                      <p className="text-[16px] font-semibold text-white leading-[21px]">{row.topic}</p>
                    </div>

                    {/* Think Different Training answer */}
                    <div
                      className="mx-3 mb-2 rounded-[12px] px-4 py-4"
                      style={{ background: 'linear-gradient(135deg, #C25433 0%, #9A3D22 100%)' }}
                    >
                      <div className="flex items-center gap-[6px] mb-[8px]">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M12 3.5L5.25 10.5L2 7.25" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <p className="text-[10px] font-bold text-white/85 tracking-[0.08em] uppercase">Think Different Training</p>
                      </div>
                      <p className="text-[14px] text-white leading-[21px]">{row.tdt}</p>
                    </div>

                    {/* Status quo answer */}
                    <div className="mx-3 mb-4 rounded-[12px] bg-white/[0.03] px-4 py-4">
                      <div className="flex items-center gap-[6px] mb-[8px]">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M3 3L11 11M11 3L3 11" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                        <p className="text-[10px] font-semibold text-white/30 tracking-[0.08em] uppercase">Everyone else</p>
                      </div>
                      <p className="text-[14px] text-white/40 leading-[21px]">{row.others}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: pixel-perfect Figma spec */}
              <div
                ref={tableRef}
                className="hidden lg:flex flex-row items-end w-[900px] h-[600px] overflow-hidden"
                style={{ borderBottom: '1px solid #333333', borderRadius: '14px' }}
              >
                {/* Topics column — 300×480, aligned to bottom via parent align-items:flex-end */}
                <div className="flex flex-col w-[300px] h-[480px]">
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
                  className="flex flex-row w-[600px] h-[600px]"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: '15px 0px 14px 14px' }}
                >
                  {/* TDT column */}
                  <div className="flex flex-col w-[300px] h-[600px]">
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
                          backgroundColor: hoveredRow !== null && hoveredRow !== row.slug ? '#8C3820' : '#B34929',
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
                  <div className="flex flex-col w-[300px] h-[600px]">
                    <div
                      className="flex items-center w-[300px] h-[120px] px-[30px] flex-shrink-0"
                      style={{ borderWidth: '1px 1px 0px 0px', borderStyle: 'solid', borderColor: '#333333', borderRadius: '0px 15px 0px 0px' }}
                    >
                      <span className="text-[18px] font-medium leading-[22px] tracking-[-0.02em] text-white/50">
                        You're currently doing
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
                        className="flex items-center justify-center w-[300px] h-[120px] px-[30px]"
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
                        <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white/50 text-center">
                          {row.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* ── Transition zone ── */}
        <div ref={transitionZoneRef} className="relative w-full" style={{ height: '100vh' }}>
          <div className="sticky top-0 h-screen w-full" style={{ backgroundColor: panelBg }} />
        </div>

        {/* ── Pricing ── */}
        <section id="pricing" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] py-[150px] bg-[#FBF6F2] text-black">
          <div className="flex w-full max-w-[1066px] mx-auto flex-col items-center gap-[12px]">
            <h2
              className="text-center text-[36px] md:text-[48px] font-bold leading-tight tracking-[-0.02em]"
              style={{
                background: 'linear-gradient(105deg, #3D2418, #B34929, #E8A87C, #B34929, #3D2418)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'tdt-gradient-pan 5s linear infinite',
              }}
            >
              Your Membership
            </h2>

            <div className="relative w-full max-w-[1066px] mx-auto overflow-hidden rounded-[24px]" style={{ aspectRatio: '633/399' }}>
              <Spline
                scene="https://prod.spline.design/EDGt2tyGvNwlGnGh/scene.splinecode"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>

            <p className="w-full text-center text-[16px] font-normal leading-[20px] tracking-[-0.02em] text-black/60">
              90% of your reps happen when no one is watching. Jaiden makes sure they're the right ones.
            </p>

            <CTAButton href="/apply" className="w-full md:w-auto h-[42px] px-8 text-[16px]">
              Claim your spot
            </CTAButton>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] py-[150px] bg-[#FBF6F2] text-black">
          <div className="flex w-full max-w-[1156px] flex-col items-center gap-[10px]">
            <h2 className="w-full max-w-[634px] text-center text-[28px] md:text-[40px] lg:text-[48px] font-bold leading-tight tracking-[-0.02em] text-[rgba(0,0,0,0.35)]">
              Everything you need to know before applying.
            </h2>

            <div className="flex w-full flex-col items-start">
              {[
                {
                  question: "Is Jaiden actually qualified to tell me what recruiters want?",
                  answer: "He's coached athletes who've gone on to play at the next level, and he evaluates film the way recruiters actually do, not the way a friend or a hype man does. This isn't a guess about what gets you seen. It's someone who's watched it happen before.",
                },
                {
                  question: "I don't train with him in person. Does that actually matter?",
                  answer: "Recruiters don't watch you in person either. They watch film. Learning to be evaluated on film, and get better based on that evaluation, is closer to the real recruiting process than another in person practice ever was.",
                },
                {
                  question: "What if my season's already started and I don't have time for another thing?",
                  answer: "This is built to run alongside your season, not compete with it. Drills, film submissions, one call with Jaiden. It's built around the games you're actually playing right now, since those are the games that count.",
                },
                {
                  question: "What if I'm not good enough yet for this to even make sense?",
                  answer: "That's the exact question Diagnosis answers. Jaiden watches your actual game and tells you the truth about where you stand. Wherever that is, the next 100 days are built to close the distance from there to an offer.",
                },
                {
                  question: "What if I do all of this and still don't get an offer?",
                  answer: "Nobody can guarantee that, and anyone who does is lying to you. What you walk away with either way is real, tracked improvement and the exact knowledge of what recruiters actually look for. That's what gives you the best real shot, not a promise.",
                },
                {
                  question: "What's the actual cost of finding out if you're good enough?",
                  answer: "$1,000 for 100 days. Compare that to a year of chasing exposure with no idea if you're even doing the right things. This is the fastest, most honest way to find out where you actually stand, and fix it before the window closes.",
                },
              ].map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="flex w-full flex-col border-b border-[rgba(0,0,0,0.15)]">
                    <button
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex cursor-pointer items-start gap-[10px] px-0 py-[20px] text-left w-full min-h-[44px]"
                    >
                      <span className="flex-1 text-[14px] md:text-[16px] font-normal leading-[22px] md:leading-[19px] tracking-[-0.02em] text-[rgba(0,0,0,0.7)]">
                        {item.question}
                      </span>
                      <svg
                        width="24" height="24" viewBox="0 0 24 24" fill="none"
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
          </div>
        </section>

        {/* ── Footer ── */}
        <section className="w-full bg-[#FBF6F2] text-black">
          <div className="w-full px-6 md:px-12 lg:px-[100px] pt-[40px] pb-[40px]">
            <FooterText />
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-[10px] pt-[10px]">
              <div className="flex-1 text-center md:text-left">
                <span className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)]">
                  © 2026 Think Different Training. All rights reserved.
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center md:justify-end gap-[14px]">
                <span className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)]">
                  thinkdifferenttraining2020@gmail.com
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
