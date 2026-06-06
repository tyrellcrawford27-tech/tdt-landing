'use client';

import { useState, useEffect, useRef } from "react";
import { TDTLogo } from "@/components/TDTLogo";
import { FooterText } from "@/components/FooterText";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { url?: string },
        HTMLElement
      >;
    }
  }
}

const NAV_LINKS = [
  { id: 'coach', label: 'The Coach' },
  { id: 'program', label: 'Program' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
] as const;

export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  const [tp, setTp] = useState(0);
  const [programProgress, setProgramProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [coachVisible, setCoachVisible] = useState(false);

  const transitionZoneRef = useRef<HTMLDivElement>(null);
  const cardsStartRef = useRef<HTMLDivElement>(null);
  const coachContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SECTIONS = ['coach', 'program', 'difference', 'pricing', 'faq'];
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
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
    if (document.querySelector('script[src*="spline-viewer"]')) return;
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/@splinetool/viewer@1.12.96/build/spline-viewer.js';
    s.type = 'module';
    document.head.appendChild(s);
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
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const panelBg = `rgb(${lerp(0,251,tp)},${lerp(0,246,tp)},${lerp(0,242,tp)})`;
  const navBgStyle = { backgroundColor: `rgba(${lerp(0,251,tp)},${lerp(0,246,tp)},${lerp(0,242,tp)},${tp < 0.5 ? 0.96 : 0.92})` };
  const navBorderStyle = { borderColor: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},0.12)` };
  const navTextStyle = { color: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},0.6)` };
  const navLinkStyle = (id: string) => ({
    color: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},${activeSection === id ? 1 : 0.4})`,
    transition: 'color 0.3s ease',
    fontWeight: activeSection === id ? '500' : '400',
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
    <div className="relative min-h-screen bg-[#FBF6F2]">

      {/* ── Mobile full-screen menu overlay ── */}
      <div
        className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center lg:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute top-5 right-6 flex h-11 w-11 items-center justify-center text-white/60"
          aria-label="Close menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <nav className="flex flex-col items-center gap-8">
          {NAV_LINKS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-[28px] font-medium text-white/80 tracking-[-0.02em]"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="absolute bottom-10 flex flex-col items-center gap-4 w-full px-6">
          <a href="#login" className="text-white/60 text-[14px]">Log In</a>
          <a
            href="#book-demo"
            className="group relative w-full inline-flex h-[49px] items-center justify-center overflow-hidden rounded-[33px] text-[14px] font-medium text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_8px_22px_-6px_rgba(179,73,41,0.55)] active:translate-y-0 active:scale-[0.98]"
          >
            <div className="absolute inset-0 rounded-[33px] pointer-events-none bg-[#B34929] transition-[filter,background-color] duration-200 ease-out group-hover:bg-[#C25433] group-hover:brightness-[1.06]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50.18%)", backgroundBlendMode: "soft-light, normal", boxShadow: "rgba(0,0,0,0.25) 0px 0px 0px 0.8px inset, rgba(255,255,255,0.1) 0px 0px 5px 5px inset, rgba(255,255,255,0.25) 0px 0px 3px 1px inset, rgba(255,255,255,0.04) 0px 0px 4px 20px inset" }} />
            <div className="absolute inset-0 rounded-[33px] pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)" }} />
            <span className="relative">Book Demo</span>
          </a>
        </div>
      </div>

      {/* ── Header ── */}
      <header
        className={`sticky top-0 z-50 flex w-full items-center justify-center transition-[height] duration-500 ${scrolled ? 'h-[72px]' : 'h-[64px] lg:h-[98px]'}`}
      >
        <div
          className={`relative flex items-center justify-between backdrop-blur-[12px] border ${!scrolled ? 'py-3 lg:py-[20px] px-6 md:px-12 lg:px-[50px]' : ''}`}
          style={{
            width: scrolled ? 'calc(100% - 40px)' : '100%',
            maxWidth: scrolled ? '960px' : '1440px',
            height: scrolled ? '52px' : '100%',
            ...(scrolled ? { paddingLeft: '20px', paddingRight: '20px' } : {}),
            borderRadius: scrolled ? '9999px' : '0px',
            backgroundColor: `rgba(${lerp(0,251,tp)},${lerp(0,246,tp)},${lerp(0,242,tp)},${tp < 0.5 ? 0.96 : 0.92})`,
            borderColor: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},${scrolled ? 0.18 : 0.12})`,
            boxShadow: scrolled ? `0 8px 32px rgba(0,0,0,${tp < 0.5 ? 0.25 : 0.08})` : 'none',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1), max-width 0.5s cubic-bezier(0.4,0,0.2,1), height 0.5s cubic-bezier(0.4,0,0.2,1), border-radius 0.5s cubic-bezier(0.4,0,0.2,1), padding 0.5s cubic-bezier(0.4,0,0.2,1), box-shadow 0.5s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center justify-center transition-all duration-500"
            style={{ height: scrolled ? '32px' : undefined, width: scrolled ? '28px' : undefined }}
            aria-label="Back to top"
          >
            <div className={`transition-all duration-500 ${scrolled ? 'h-[32px] w-[28px]' : 'h-[40px] w-[35px] lg:h-[58px] lg:w-[50px]'}`}>
              <TDTLogo letterColor={`rgb(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)})`} />
            </div>
          </button>

          {/* Desktop nav — absolutely centered */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-[30px] text-[14px] tracking-[-0.02em]">
            {NAV_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                style={navLinkStyle(id)}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden lg:flex h-[37px] items-center gap-[15px] text-[14px] font-medium tracking-[-0.02em]" style={navTextStyle}>
            <a href="#login" className={`transition-opacity hover:opacity-100 ${isDark ? 'hover:text-white' : 'hover:text-[#1A0F0A]'}`}>Log In</a>
            <a
              href="#book-demo"
              className="group relative inline-flex h-[37px] items-center justify-center overflow-hidden rounded-[33px] px-[20px] text-[14px] font-medium text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_8px_22px_-6px_rgba(179,73,41,0.55)] active:translate-y-0 active:scale-[0.98]"
            >
              <div className="absolute inset-0 rounded-[33px] pointer-events-none bg-[#B34929] transition-[filter,background-color] duration-200 ease-out group-hover:bg-[#C25433] group-hover:brightness-[1.06]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50.18%)", backgroundBlendMode: "soft-light, normal", boxShadow: "rgba(0,0,0,0.25) 0px 0px 0px 0.8px inset, rgba(255,255,255,0.1) 0px 0px 5px 5px inset, rgba(255,255,255,0.25) 0px 0px 3px 1px inset, rgba(255,255,255,0.04) 0px 0px 4px 20px inset" }} />
              <div className="absolute inset-0 rounded-[33px] pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)" }} />
              <span className="relative">Book Demo</span>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden flex h-11 w-11 items-center justify-center"
            style={navTextStyle}
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg width="22" height="15" viewBox="0 0 22 15" fill="none">
              <path d="M0 1H22M0 7.5H22M0 14H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="flex w-full flex-col">

        {/* ── Hero ── */}
        <section className="relative flex w-full min-h-screen flex-col items-center justify-center gap-8 lg:gap-12 text-center bg-[#000000] px-6 md:px-12 lg:px-[100px]">
          <div className="max-w-[874px] w-full">
            <div className="inline-flex h-[24px] items-center justify-center rounded-full border border-[#B34929] bg-[rgba(179,73,41,0.15)] px-4 md:px-5 py-[5px] text-center text-[11px] md:text-[12px] font-normal tracking-[-0.02em] text-[rgba(179,73,41,0.7)]" style={{ boxShadow: "inset 0px 4px 6px rgba(255,255,255,0.09), inset 0px -4px 6px 1px rgba(179,73,41,0.25)" }}>
              COHORT 1 · SEPTEMBER 2026 · 8 SPOTS
            </div>
            <h1 className="mt-6 md:mt-8 text-[28px] md:text-[36px] lg:text-[44px] font-bold leading-tight tracking-[-0.02em]">
              <span className="text-[rgba(255,255,255,0.8)]">Most of your development happens alone.</span>
              <span className="block text-[rgba(255,255,255,0.8)]">We make sure it counts.</span>
            </h1>
            <p className="mt-4 md:mt-6 max-w-[668px] text-[13px] md:text-[14px] font-medium leading-[20px] tracking-[-0.02em] text-[rgba(255,255,255,0.6)] mx-auto">
              Jaiden studies your film, identifies exactly what's holding you back, and tracks your improvement with documented proof over 100 days.
            </p>
            <div className="mt-8 md:mt-10 flex justify-center">
              <a
                href="#apply"
                className="group relative inline-flex w-full md:w-auto h-[49px] items-center justify-center overflow-hidden rounded-[33px] px-8 text-[16px] leading-[19px] font-normal text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_8px_22px_-6px_rgba(179,73,41,0.55)] active:translate-y-0 active:scale-[0.98]"
              >
                <div className="absolute inset-0 rounded-[33px] pointer-events-none bg-[#B34929] transition-[filter,background-color] duration-200 ease-out group-hover:bg-[#C25433] group-hover:brightness-[1.06]" style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50.18%)",
                  backgroundBlendMode: "soft-light, normal",
                  boxShadow: "rgba(0,0,0,0.25) 0px 0px 0px 0.8px inset, rgba(255,255,255,0.1) 0px 0px 5px 5px inset, rgba(255,255,255,0.25) 0px 0px 3px 1px inset, rgba(255,255,255,0.04) 0px 0px 4px 20px inset",
                }} />
                <div className="absolute inset-0 rounded-[33px] pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
                  background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
                }} />
                <span className="relative">Apply for Cohort 1</span>
              </a>
            </div>
          </div>
        </section>

        {/* ── Coach ── */}
        <section id="coach" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] pt-[40px] pb-[80px] bg-[#000000]">
          <div className="inline-flex h-[35px] items-center justify-center gap-[10px] rounded-[35px] bg-[#1B1B1B] px-[20px] shadow-[inset_-3px_-2px_3px_rgba(54,54,54,0.25),inset_0px_4px_4px_rgba(54,54,54,0.25)]">
            <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: `rgba(184,78,44,${activeSection === 'coach' ? 1 : 0.5})`, transition: 'background-color 0.4s ease' }} />
            <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em]" style={{ color: `rgba(184,78,44,${activeSection === 'coach' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>The Coach</span>
          </div>

          <div className="flex w-full max-w-[1156px] flex-col lg:flex-row items-center gap-[50px] lg:gap-[100px]">
            <div ref={coachContentRef} className="flex w-full lg:w-[491px] flex-col justify-center gap-[30px]">
              <div className="flex flex-col gap-[16px]">
                <p style={fadeUp(0)} className="text-[15px] md:text-[18px] font-bold leading-[24px] md:leading-[26px] tracking-[-0.02em] text-[rgba(255,255,255,0.6)]">
                  Seven years. I've trained with some of the{' '}
                  <span className="text-white">best this country has produced.</span>
                </p>
                <p style={fadeUp(130)} className="text-[15px] md:text-[18px] font-bold leading-[24px] md:leading-[26px] tracking-[-0.02em] text-[rgba(255,255,255,0.6)]">
                  I know the difference between someone who works hard and someone{' '}
                  <span className="text-white">who actually gets better</span>
                  {' '}and most of the time it's not talent or effort.
                </p>
                <p style={fadeUp(260)} className="text-[15px] md:text-[18px] font-bold leading-[24px] md:leading-[26px] tracking-[-0.02em] text-[rgba(255,255,255,0.6)]">
                  It's knowing exactly what to fix and having someone{' '}
                  <span className="text-white">who won't let you look away from it.</span>
                </p>
                <p className="text-[20px] md:text-[24px] font-normal leading-[28px] md:leading-[31px] tracking-[-0.02em] text-[rgba(255,255,255,0.8)]" style={{ fontFamily: "'Centralwell - Personal use', sans-serif", ...signatureReveal }}>
                  - Jaiden Francais
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

            <div className="relative flex w-full lg:w-[565px] items-center justify-center lg:justify-end">
              <div className="absolute left-0 top-0 hidden lg:flex h-[100px] w-[12px] flex-col items-center justify-center gap-[10px]">
                <div className="h-[12px] w-[12px] rounded-full bg-white" />
                <div className="h-[12px] w-[12px] rounded-full bg-white/20" />
                <div className="h-[12px] w-[12px] rounded-full bg-white/20" />
                <div className="h-[12px] w-[12px] rounded-full bg-white/20" />
                <div className="h-[12px] w-[12px] rounded-full bg-white/20" />
              </div>
              <div className="relative w-full aspect-video lg:aspect-auto lg:h-[434px] lg:w-[543px] overflow-hidden rounded-[12px] border border-white/40 bg-[#111111]">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,rgba(0,0,0,0.6)_100%)]" />
                <div className="absolute inset-0 flex items-center justify-center text-[14px] text-white/40">
                  Placeholder content
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Program ── */}
        <section id="program" className="relative w-full bg-[#000000]">
          <div className="flex flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] pt-[40px] pb-[40px]">
            <div className="inline-flex h-[35px] items-center justify-center gap-[10px] rounded-[35px] bg-[#1B1B1B] px-[20px] shadow-[inset_-3px_-2px_3px_rgba(54,54,54,0.25),inset_0px_4px_4px_rgba(54,54,54,0.25)]">
              <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: `rgba(184,78,44,${activeSection === 'program' ? 1 : 0.5})`, transition: 'background-color 0.4s ease' }} />
              <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em]" style={{ color: `rgba(184,78,44,${activeSection === 'program' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>The Program</span>
            </div>
          </div>

          <div ref={cardsStartRef} />

          {[
            {
              label: '01 · Diagnosis',
              title: 'Before anything unlocks, Jaiden needs to see you.',
              body: 'Eight drills. One take. No retakes. Film yourself cold and submit. Jaiden reviews everything before your program begins. This is where your journey starts.',
              image: 'diagnosis.png',
            },
            {
              label: '02 · Drill Library',
              title: 'Your prescription. Built from your weaknesses.',
              body: 'After Jaiden evaluates your game, your drill library is built around exactly what he finds. No generic workouts. Every rep targets something specific he identified in you.',
              image: 'drill-library.png',
            },
            {
              label: '03 · Film Submission',
              title: 'Film it cold. Upload it raw.',
              body: 'No preparation needed. Film your drill in one take and upload it directly to Jaiden. Tell him what to focus on; he watches everything and tells you exactly what he sees.',
              image: 'film-submission.png',
            },
            {
              label: '04 · Film Study',
              title: 'Jaiden watches every second.',
              body: 'Frame by frame, he marks exactly what needs to change and records his voice at the specific moments that matter to your game.',
              image: 'film-study.png',
            },
            {
              label: '05 · Atlas',
              title: 'Your growth, documented and undeniable.',
              body: "Every annotation, every drill, every session tracked in one place. Jaiden updates your ratings as you improve. By graduation you have documented proof of exactly what changed and how far you've come.",
              image: 'atlas.png',
            },
          ].map((card, i) => {
            const depth = Math.max(0, programProgress - i);
            const scale = Math.max(0.78, 1 - depth * 0.05);

            return (
              <div
                key={card.label}
                className="sticky top-0 h-screen flex items-center justify-center px-6 md:px-12 lg:px-[100px]"
                style={{ zIndex: i + 1 }}
              >
                <div
                  className="flex flex-col md:flex-row w-full max-w-[1156px] overflow-hidden rounded-[12px] border border-white/10"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    willChange: 'transform',
                  }}
                >
                  <div className="flex w-full md:w-[460px] md:flex-shrink-0 flex-col justify-center gap-[20px] px-[24px] md:px-[50px] py-[28px] md:py-[40px] bg-[#3D2218]">
                    <span className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[0.02em] text-[rgba(255,255,255,0.8)]">{card.label}</span>
                    <div className="flex flex-col gap-[10px]">
                      <h3 className="text-[18px] md:text-[20px] font-medium leading-[22px] md:leading-[24px] tracking-[0.02em] text-white">{card.title}</h3>
                      <p className="text-[14px] md:text-[16px] font-normal leading-[20px] md:leading-[22px] tracking-[0.02em] text-[rgba(255,255,255,0.7)]">{card.body}</p>
                    </div>
                  </div>
                  <div className="flex h-[180px] md:h-[500px] flex-1 items-center justify-center bg-[#1E0F09] p-[16px] md:p-[20px] shadow-[inset_-2px_0px_10px_#000000]">
                    <div
                      className="h-full w-full rounded-[8px] bg-[rgba(255,255,255,0.04)] bg-cover bg-center"
                      style={{ backgroundImage: `url(/${card.image})` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="h-[20vh] md:h-[60vh]" />
        </section>

        {/* ── Difference ── */}
        <section id="difference" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] pt-[40px] pb-[60px] bg-[#000000]">
          <div className="flex w-full max-w-[1156px] flex-col items-center gap-[20px]">
            <h3 className="text-center text-[18px] md:text-[20px] font-medium leading-[24px] tracking-[-0.02em]" style={{ color: `rgba(255,255,255,${activeSection === 'difference' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>
              What makes this{' '}
              <span style={{ color: `rgba(179,73,41,${activeSection === 'difference' ? 1 : 0.6})`, transition: 'color 0.4s ease' }} className="italic">different</span>
            </h3>
            <h2 className="w-full max-w-[586px] text-center text-[22px] md:text-[26px] font-normal leading-[28px] md:leading-[31px] tracking-[-0.02em] text-white">
              Not your $29.99/month course. This is what it looks like when a coach actually watches your game.
            </h2>
          </div>

          {/* Mobile/tablet: stacked feature cards */}
          <div className="flex lg:hidden w-full max-w-[700px] flex-col gap-3">
            {[
              { topic: 'Basketball drills', tdt: 'Based on what Jaiden specifically finds in your game', others: 'Browsed by yourself, unsure what you really need' },
              { topic: 'Personal film review', tdt: 'Jaiden watches every clip, Apple Pencil annotations frame by frame', others: null },
              { topic: 'Individual focus', tdt: "8 athletes, Jaiden's full attention on you", others: 'Hundreds to thousands of members' },
              { topic: 'Documented growth', tdt: 'Tracked scores, annotated footage, before and after proof', others: null },
              { topic: 'Mindset module', tdt: 'Dedicated kobe mindset module built to fix how you think about your game', others: 'Generic motivational content' },
            ].map((row) => (
              <div key={row.topic} className="overflow-hidden rounded-[12px] border border-[#333]">
                <div className="bg-[#1B1B1B] px-4 py-3 text-[11px] font-medium text-white/50 tracking-[0.06em] uppercase">{row.topic}</div>
                <div className="bg-[#B34929] px-4 py-3">
                  <p className="text-[11px] font-medium text-white/60 mb-1 tracking-[0.06em]">THINK DIFFERENT</p>
                  <p className="text-[14px] text-white leading-[20px]">{row.tdt}</p>
                </div>
                <div className="px-4 py-3 border-t border-[#333]">
                  <p className="text-[11px] font-medium text-white/30 mb-1 tracking-[0.06em]">OTHERS</p>
                  {row.others ? (
                    <p className="text-[14px] text-white/40 leading-[20px]">{row.others}</p>
                  ) : (
                    <div className="relative w-[40px] h-[36px] mt-1">
                      <svg width="41" height="25" viewBox="0 0 41 25" fill="none" className="absolute top-[6px] left-0">
                        <path d="M4 4L37 21" stroke="#FF7171" strokeWidth="5" strokeLinecap="round"/>
                      </svg>
                      <svg width="16" height="36" viewBox="0 0 16 36" fill="none" className="absolute top-0 left-[12px]">
                        <path d="M4 4L12 32" stroke="#FF7171" strokeWidth="5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: 3-column table */}
          <div className="hidden lg:flex w-[900px] h-[720px] items-end gap-0 border-b border-[#333333] rounded-[14px]">
            <div className="flex w-[300px] h-[600px] flex-col">
              <div className="flex h-[120px] w-full" />
              {['Basketball drills', 'Personal film review', 'Individual focus', 'Documented growth'].map((label) => (
                <div key={label} className="flex h-[120px] w-full items-center justify-center border-t border-l border-[#333333]">
                  <span className="text-center text-[16px] font-medium leading-[19px] tracking-[-0.02em] text-white">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex w-[300px] h-[720px] flex-col border-l border-[rgba(255,255,255,0.2)]">
              <div className="flex items-center gap-[10px] bg-[#B34929] px-[30px] h-[120px] rounded-tr-[15px]">
                <div className="h-[37px] w-[37px] flex-shrink-0" />
                <span className="text-[18px] font-medium leading-[22px] tracking-[-0.02em] text-white">Think Different Training</span>
              </div>
              {[
                'Based on what Jaiden specifically finds in your game',
                'Jaiden watches every clip, Apple Pencil annotations frame by frame',
                "8 athletes, Jaiden's full attention on you",
                'Tracked scores, annotated footage, before and after proof',
                'Dedicated kobe mindset module built to fix how you think about your game',
              ].map((text) => (
                <div key={text} className="flex items-center px-[30px] h-[120px] bg-[#B34929] border-t border-[rgba(0,0,0,0.4)]">
                  <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white">{text}</span>
                </div>
              ))}
            </div>
            <div className="flex w-[300px] h-[720px] flex-col border-l border-[rgba(255,255,255,0.2)]">
              <div className="flex items-center gap-[10px] px-[30px] h-[120px] border-b border-r border-[#333333] rounded-tr-[15px]">
                <div className="h-[40px] w-[40px] flex-shrink-0" />
                <span className="text-[18px] font-medium leading-[22px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)]">Other programs</span>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-b border-r border-[#333333]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)] text-center">Browsed by yourself, unsure what you really need</span>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-b border-r border-[#333333]">
                <div className="relative w-[64px] h-[57px]">
                  <svg width="65" height="40" viewBox="0 0 65 40" fill="none" className="absolute top-[9px] left-0">
                    <path d="M7 7L58 33" stroke="#FF7171" strokeWidth="7" strokeLinecap="round"/>
                  </svg>
                  <svg width="26" height="57" viewBox="0 0 26 57" fill="none" className="absolute top-[0px] left-[19px]">
                    <path d="M7 7L19 50" stroke="#FF7171" strokeWidth="7" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-b border-r border-[#333333]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)] text-center">Hundreds to thousands of members</span>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-b border-r border-[#333333]">
                <div className="relative w-[64px] h-[57px]">
                  <svg width="65" height="40" viewBox="0 0 65 40" fill="none" className="absolute top-[9px] left-0">
                    <path d="M7 7L58 33" stroke="#FF7171" strokeWidth="7" strokeLinecap="round"/>
                  </svg>
                  <svg width="26" height="57" viewBox="0 0 26 57" fill="none" className="absolute top-[0px] left-[19px]">
                    <path d="M7 7L19 50" stroke="#FF7171" strokeWidth="7" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-r border-[#333333]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)] text-center">Generic motivational content</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Transition zone ── */}
        <div ref={transitionZoneRef} className="relative w-full" style={{ height: '100vh' }}>
          <div className="sticky top-0 h-screen w-full" style={{ backgroundColor: panelBg }} />
        </div>

        {/* ── Pricing ── */}
        <section id="pricing" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] pt-[40px] pb-[80px] bg-[#FBF6F2] text-black">
          <div className="inline-flex h-[35px] items-center justify-center gap-[10px] rounded-[35px] bg-[#FFE4CE] px-[20px] shadow-[inset_-3px_-2px_3px_#FFDEC4,inset_0px_4px_4px_#FFE6D3]">
            <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: `rgba(184,78,44,${activeSection === 'pricing' ? 1 : 0.5})`, transition: 'background-color 0.4s ease' }} />
            <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em]" style={{ color: `rgba(184,78,44,${activeSection === 'pricing' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>Pricing</span>
          </div>

          <div className="flex w-full max-w-[532px] flex-col items-center gap-[20px]">
            <h2 className="text-center text-[36px] md:text-[48px] font-bold leading-tight tracking-[-0.02em] text-[rgba(0,0,0,0.35)]">
              Your Membership
            </h2>

            <div className="relative w-full rounded-[10px] overflow-hidden" style={{ height: '440px' }}>
              <spline-viewer
                url="https://prod.spline.design/UAVGmShPrQNdRCoO/scene.splinecode"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>

            <p className="w-full text-center text-[14px] font-normal leading-[20px] tracking-[-0.02em] text-black">
              90% of your reps happen when no one is watching. Jaiden makes sure they're the right ones.
            </p>

            <button className="group relative w-full md:w-auto inline-flex h-[49px] items-center justify-center overflow-hidden rounded-[33px] px-8 text-[16px] font-normal text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_8px_22px_-6px_rgba(179,73,41,0.55)] active:translate-y-0 active:scale-[0.98]">
              <div className="absolute inset-0 rounded-[33px] pointer-events-none bg-[#B34929] transition-[filter,background-color] duration-200 ease-out group-hover:bg-[#C25433] group-hover:brightness-[1.06]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50.18%)", backgroundBlendMode: "soft-light, normal", boxShadow: "rgba(0,0,0,0.25) 0px 0px 0px 0.8px inset, rgba(255,255,255,0.1) 0px 0px 5px 5px inset, rgba(255,255,255,0.25) 0px 0px 3px 1px inset, rgba(255,255,255,0.04) 0px 0px 4px 20px inset" }} />
              <div className="absolute inset-0 rounded-[33px] pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)" }} />
              <span className="relative">Apply for Cohort 1</span>
            </button>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] pt-[40px] pb-[80px] bg-[#FBF6F2] text-black">
          <div className="inline-flex h-[35px] items-center justify-center gap-[10px] rounded-[35px] bg-[#FFE4CE] px-[20px] shadow-[inset_-3px_-2px_3px_#FFDEC4,inset_0px_4px_4px_#FFE6D3]">
            <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: `rgba(184,78,44,${activeSection === 'faq' ? 1 : 0.5})`, transition: 'background-color 0.4s ease' }} />
            <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em]" style={{ color: `rgba(184,78,44,${activeSection === 'faq' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>FAQ</span>
          </div>

          <div className="flex w-full max-w-[1156px] flex-col items-center gap-[10px]">
            <h2 className="w-full max-w-[634px] text-center text-[28px] md:text-[40px] lg:text-[48px] font-bold leading-tight tracking-[-0.02em] text-[rgba(0,0,0,0.35)]">
              Everything you need to know before applying.
            </h2>

            <div className="flex w-full flex-col items-start">
              {[
                {
                  question: "Who is Jaiden and why should I trust him with my development?",
                  answer: "7 years developing serious players. Trained alongside athletes who went on to play professionally. Trusted by Canada Basketball's National Training Centre, York University, and Brampton City Prep. He watches your footage specifically and tells you exactly what's holding you back.",
                },
                {
                  question: "How does this actually develop my game if I'm not training in person?",
                  answer: "90% of your development happens alone. No one watching. No one correcting. This program changes that. Jaiden diagnoses exactly what's wrong, prescribes the specific work to fix it, and reviews your film to make sure every rep you take alone is actually making you better.",
                },
                {
                  question: "How much time does this require each week?",
                  answer: "45 to 60 minutes of focused drill work daily on top of your existing training. Film submissions take 10 to 15 minutes. Reviews come back within 24 hours. Sessions are scheduled in advance. If you're serious about developing, it fits.",
                },
                {
                  question: "What if I'm not at the right level?",
                  answer: "The program starts with a full diagnosis. Jaiden evaluates exactly where you are before anything begins. What's required isn't a certain level. It's that you show up and do the work.",
                },
                {
                  question: "What if we invest and it doesn't work?",
                  answer: "Results depend on the athlete doing the work. What's guaranteed is Jaiden's full attention on your specific game. Every film reviewed, every session delivered, every score updated with a specific reason.",
                },
                {
                  question: "What am I actually getting for $2,000?",
                  answer: "Jaiden's eyes on your specific game for 100 days. Full diagnosis, honest scoring, prescribed drills, frame by frame film review, sessions, and documented proof of exactly how far you came. Not a course. Not content. Individual development built around what he finds in you specifically.",
                },
              ].map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="flex w-full flex-col border-b border-[rgba(0,0,0,0.15)]">
                    <button
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex items-start gap-[10px] px-0 py-[20px] text-left w-full min-h-[44px]"
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
        <section className="w-full flex justify-center bg-[#FBF6F2] text-black">
          <div className="w-full max-w-[1356px] flex flex-col justify-center items-center px-6 md:px-12 lg:px-[100px] py-[40px] overflow-visible">
            <div className="w-full max-w-[1156px] flex flex-col justify-center items-center gap-[10px] p-[20px] overflow-visible">
              <FooterText />
            </div>
            <div className="w-full max-w-[1156px] flex flex-col md:flex-row items-center gap-3 md:gap-[10px] p-[10px]">
              <div className="flex-1 text-center md:text-left">
                <span className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)]">
                  © 2026 Think Different Training. All rights reserved.
                </span>
              </div>
              <div className="flex-1 flex justify-center md:justify-end">
                <span className="text-[12px] md:text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)]">
                  thinkdifferenttraining2020@gmail.com
                </span>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
