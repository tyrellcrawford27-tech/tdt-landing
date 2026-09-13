'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { TDTLogo } from "@/components/TDTLogo";
import { FooterText } from "@/components/FooterText";
import { FilmGrain } from "@/components/FilmGrain";
import { CTAButton } from "@/components/CTAButton";
import { HowItWorks, HundredDays, ProgramPricing, LandingFinalCTA } from "@/components/LandingProgram";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";

// Hero background rotation. Served files are public/`hero-N.webp` (1900w) plus a
// `-sm` 1000w variant for phones. The full-res originals they were derived from
// live in design-assets/hero/, which is gitignored and never deployed — see the
// note there for the re-export command. To add a shot: export both widths into
// public/, append here.
const HERO_SLIDES: HeroSlide[] = [
  { src: '/hero-1.webp', srcSm: '/hero-1-sm.webp', alt: 'Jaiden running a live handling rep at a Rucker Park run-out', objectPosition: '50% 45%' },
  { src: '/hero-6.webp', srcSm: '/hero-6-sm.webp', alt: 'Jaiden leading athletes through a training session', objectPosition: '50% 35%', objectPositionSm: '50% 45%' },
  { src: '/hero-5.webp', srcSm: '/hero-5-sm.webp', alt: 'Jaiden leading athletes through a training session', objectPosition: '50% 45%' },
  { src: '/hero-2.webp', srcSm: '/hero-2-sm.webp', alt: 'Jaiden working a live one-on-one read with an athlete in the gym', objectPosition: '50% 40%' },
];

// Every destination stays visible on desktop; mobile retains the Difference shortcut.
const NAV_LINKS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'coach', label: 'The coach' },
  { id: 'pricing', label: 'Program Details' },
  { id: 'faq', label: 'FAQ' },
] as const;

const MOBILE_NAV_LINKS = [
  ...NAV_LINKS.slice(0, 3),
  { id: 'difference', label: 'Difference' },
  ...NAV_LINKS.slice(3),
];

const SECTION_LABELS: Record<string, string> = {
  '': 'Top',
  'hero': 'Top',
  'how-it-works': 'How it works',
  '100-days': '100-day program',
  'coach': 'The coach',
  'difference': 'Difference',
  'pricing': 'Program Details',
  'faq': 'FAQ',
  'apply-cta': 'Apply',
};

export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  const [highlightFaq, setHighlightFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navHovered, setNavHovered] = useState(false);
  const [tp, setTp] = useState(0); // dark→light scroll progress through transition zone
  const [desktopTransition, setDesktopTransition] = useState(false);
  const [coachVisible, setCoachVisible] = useState(false);
  const [coachExpanded, setCoachExpanded] = useState(false);
  // Open height of the collapsed half of the coach letter. Animating to a
  // measured pixel height rather than the grid-template-rows 0fr→1fr trick,
  // which needs Safari 16 to animate at all and silently sits at 0 where it
  // doesn't.
  //
  // Measured twice over, because either source alone has a hole: the observer
  // keeps the value honest while the panel is open (a resize or a font swap
  // would otherwise leave the copy clipped), but it delivers on the rendering
  // lifecycle, so a first click that lands before any delivery would open to
  // zero. Re-measuring inside the toggle closes that.
  const coachRestRef = useRef<HTMLDivElement>(null);
  const [coachRestH, setCoachRestH] = useState(0);
  // offsetHeight, not contentRect: the element carries the top padding that
  // spaces it off the lead paragraph, and contentRect would exclude it.
  const measureCoachRest = () => setCoachRestH(coachRestRef.current?.offsetHeight ?? 0);
  useEffect(() => {
    const el = coachRestRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCoachRestH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [tableVisible, setTableVisible] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const coachContentRef = useRef<HTMLDivElement>(null);
  const transitionZoneRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const applyBtnRef = useRef<HTMLDivElement>(null);

  // Honour prefers-reduced-motion in the explicit JS scrolls (the CSS
  // scroll-behavior rule only covers native anchor scrolling).
  const scrollBehavior = () =>
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') as ScrollBehavior;

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const sync = () => setDesktopTransition(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const SECTIONS = ['how-it-works', '100-days', 'coach', 'difference', 'pricing', 'faq', 'apply-cta'];
    const onScroll = () => {
      setScrolled(prev => window.scrollY > (prev ? 40 : 80));
      if (transitionZoneRef.current) {
        const r = transitionZoneRef.current.getBoundingClientRect();
        if (desktopTransition) {
          const pinnable = Math.max(1, r.height - window.innerHeight);
          setTp(Math.max(0, Math.min(1, -r.top / pinnable)));
        } else {
          // Mobile uses a compact, non-sticky transition band. Progress is
          // driven by the band entering the viewport so the surface fades
          // instead of switching directly from black to cream.
          const range = Math.max(1, window.innerHeight * 0.72);
          setTp(Math.max(0, Math.min(1, (window.innerHeight - r.top) / range)));
        }
      } else {
        setTp(0);
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
  }, [desktopTransition]);




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
    const el = tableRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTableVisible(true); observer.disconnect(); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const openFilmFaq = useCallback(() => {
    if (window.location.hash === '#faq-film') {
      setOpenFaq(3);
      setHighlightFaq(3);
      const question = document.getElementById('faq-question-3');
      if (!question) return;
      const header = document.querySelector('header');
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      const headerOffset = (header?.offsetHeight || 88) + 26 + (isMobile ? 20 : 10);
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const top = question.getBoundingClientRect().top + window.scrollY - headerOffset;
      const safeTop = Math.max(0, Math.round(top));
      window.scrollTo({ top: safeTop, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, []);

  const scrollToSection = (id: string, extraOffset = 0) => {
    const el = document.getElementById(id);
    if (!el) return;
    const header = document.querySelector('header');
    const idBias = id === 'pricing' ? -340 : 0;
    const headerOffset = (header?.offsetHeight || 88) + 20 + idBias + extraOffset;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    const safeTop = Math.max(0, Math.round(top));
    window.scrollTo({ top: safeTop, behavior: reducedMotion ? 'auto' : scrollBehavior() });
  };

  useEffect(() => {
    const initialFrame = window.requestAnimationFrame(openFilmFaq);
    window.addEventListener('hashchange', openFilmFaq);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.removeEventListener('hashchange', openFilmFaq);
    };
  }, [openFilmFaq]);

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
    const returnFocus = menuButtonRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
      if (e.key !== 'Tab') return;
      const targets = document.querySelectorAll<HTMLElement>('#mobile-menu a[href], #mobile-menu button');
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    menuCloseRef.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      returnFocus?.focus({ preventScroll: true });
    };
  }, [menuOpen]);

  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  // Cinematic dark→light transition: hold true black, then a quick flip to cream.
  const flip   = Math.min(1, Math.max(0, (tp - 0.08) / 0.32));
  const tt     = flip * flip * (3 - 2 * flip);
  const flash  = Math.sin(flip * Math.PI);
  // The beam owns the first part of the change. Only bring the dark-on-light
  // content in once the surface is genuinely bright, otherwise it reads as a
  // grey pricing panel floating over a black page.
  const reveal = Math.min(1, Math.max(0, (flip - 0.78) / 0.12));
  const revealEased = reveal * reveal * (3 - 2 * reveal);
  const isDark = desktopTransition
    ? tt < 0.5
    : !['pricing', 'faq', 'apply-cta'].includes(activeSection);
  const CHROME_STEPS = 16;
  const ttStepped = Math.round(tt * CHROME_STEPS) / CHROME_STEPS;
  const chromeSurface = desktopTransition
    ? `rgb(${lerp(0,251,ttStepped)},${lerp(0,246,ttStepped)},${lerp(0,242,ttStepped)})`
    : tp > 0 ? `rgb(${lerp(0,251,tt)},${lerp(0,246,tt)},${lerp(0,242,tt)})` : isDark ? '#000000' : '#FBF6F2';
  const panelBg = `rgb(${lerp(0, 251, tt)},${lerp(0, 246, tt)},${lerp(0, 242, tt)})`;
  const transitionActive = desktopTransition || tp > 0;

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', chromeSurface);
    document.documentElement.style.setProperty('--page-surface', chromeSurface);
  }, [chromeSurface]);

  // Hand the chrome back on the way out. /apply declares its own cream, but
  // an inline --page-surface left on <html> would outrank it.
  useEffect(() => () => {
    document.documentElement.style.removeProperty('--page-surface');
  }, []);

  const navRestShadow = '0 1px 2px rgba(0,0,0,0.85), 0 2px 14px rgba(0,0,0,0.55)';
  const navTextStyle = {
    color: isDark ? 'rgba(255,255,255,0.9)' : '#584a41',
    textShadow: scrolled ? 'none' : navRestShadow,
    transition: 'color 0.4s ease, text-shadow 0.4s ease',
  };
  const navLinkStyle = (id: string) => ({
    color: isDark
      ? activeSection === id ? '#ffffff' : 'rgba(255,255,255,0.78)'
      : activeSection === id ? '#1a0f0a' : '#736359',
    fontWeight: activeSection === id ? '500' : '400',
    textShadow: scrolled ? 'none' : navRestShadow,
    transition: 'color 0.4s ease, text-shadow 0.4s ease, font-weight 0.4s ease',
  });
  // The compact pill is the original scrolled-section treatment: once a
  // section is in view, the full destinations tuck away and its label takes
  // their place. Hovering the pill expands it smoothly so the destinations
  // remain one gesture away on desktop.
  const isCompact = Boolean(activeSection);
  const showCompact = isCompact && !navHovered;

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

      {/* ── Mobile frosted-glass menu ── */}
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
        className={`fixed inset-0 z-[100] flex flex-col overflow-hidden lg:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          backgroundColor: 'rgba(5,4,3,0.36)',
          backdropFilter: 'blur(30px) saturate(0.72)',
          WebkitBackdropFilter: 'blur(30px) saturate(0.72)',
          overscrollBehavior: 'contain',
          paddingTop: 'calc(10px + env(safe-area-inset-top))',
        }}
        onClick={() => setMenuOpen(false)}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.14), transparent 36%), radial-gradient(circle at 82% 78%, rgba(179,73,41,0.16), transparent 42%)',
          }}
        />

        {/* The warm glass sheet keeps the menu itself crisp while the live page
            remains visible as a soft, cinematic field around it. */}
        <div
          data-mobile-menu-panel
          className="relative z-10 mx-[10px] flex min-h-0 flex-[1_1_auto] flex-col overflow-hidden rounded-[30px] border border-white/70"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxHeight: 'min(74dvh, calc(100dvh - 180px))',
            minHeight: 'min(220px, calc(100dvh - 180px))',
            background: 'linear-gradient(145deg, var(--menu-glass-start), var(--menu-glass-end))',
            backdropFilter: 'blur(34px) saturate(1.08)',
            WebkitBackdropFilter: 'blur(34px) saturate(1.08)',
            boxShadow: '0 28px 80px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,1)',
            color: 'var(--ink-warm)',
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0) scale(1)' : 'translateY(-14px) scale(0.985)',
            transition: menuOpen
              ? 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.65s cubic-bezier(0.16,1,0.3,1)'
              : 'opacity 0.22s ease, transform 0.28s ease',
          }}
        >
          <div className="flex h-[72px] flex-shrink-0 items-center justify-between px-5">
            <div className="flex h-[42px] w-[38px] items-center justify-center">
              <TDTLogo letterColor="rgb(26,15,10)" />
            </div>
            <span className="text-[12px] font-medium tracking-normal text-[#1A0F0A]/60">
              Menu
            </span>
            <button
              ref={menuCloseRef}
              onClick={() => setMenuOpen(false)}
              className="-mr-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-black/[0.08] bg-white/65 text-[#1A0F0A]/80 shadow-[0_4px_16px_rgba(26,15,10,0.06)] outline-none transition-colors active:bg-black/[0.06] focus-visible:ring-2 focus-visible:ring-[#B34929]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4EDE8]"
              aria-label="Close menu"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                <path d="M6.5 6.5L17.5 17.5M6.5 17.5L17.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-5" style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}>
            <div className="my-auto flex flex-col">
              {MOBILE_NAV_LINKS.map(({ id, label }, i) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="group relative grid grid-cols-[28px_1fr_28px] items-center border-b border-black/[0.11] text-[#1A0F0A] last:border-b-0 active:bg-black/[0.04]"
                  style={{
                    minHeight: 'clamp(44px, 8dvh, 62px)',
                    opacity: menuOpen ? 1 : 0,
                    transform: menuOpen ? 'translateY(0)' : 'translateY(18px)',
                    transition: menuOpen
                      ? `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${120 + i * 75}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${120 + i * 75}ms`
                      : 'opacity 0.15s ease, transform 0.2s ease',
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    const jump = (triesLeft: number) => {
                      if (document.body.style.overflow === 'hidden' && triesLeft > 0) { setTimeout(() => jump(triesLeft - 1), 16); return; }
                    scrollToSection(id, -44);
                  };
                    setTimeout(() => jump(30), 16);
                  }}
                >
                  <span className="text-[10px] font-semibold tracking-normal text-[var(--brand-terra)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    0{i + 1}
                  </span>
                  <span className="text-center text-[clamp(25px,7vw,34px)] font-medium leading-none tracking-[-0.025em]">
                    {label}
                  </span>
                  <span className="mx-auto h-px w-3 bg-[#1A0F0A]/25 transition-all duration-300 group-active:w-5" />
                </a>
              ))}
            </div>
          </nav>
        </div>

        {/* Actions float over the blurred page instead of competing with the
            navigation sheet. Safe-area padding keeps Apply above iOS chrome. */}
        <div
          className="relative z-10 mt-auto flex w-full flex-shrink-0 flex-col items-center gap-[12px] px-5 pt-5"
          onClick={(e) => e.stopPropagation()}
          style={{
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0)' : 'translateY(16px)',
            transition: menuOpen
              ? 'opacity 0.5s cubic-bezier(0.16,1,0.3,1) 330ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) 330ms'
              : 'opacity 0.2s ease, transform 0.2s ease',
            paddingBottom: 'calc(18px + env(safe-area-inset-bottom))',
          }}
        >
          <a
            href="https://app.thinkdifferenttraining.com/access"
            className="flex min-h-[46px] w-full items-center justify-center rounded-full border border-white/[0.24] bg-white/[0.10] text-[15px] text-white/90 backdrop-blur-xl transition-colors active:bg-white/[0.16]"
          >
            Log In
          </a>
          <CTAButton href="/apply" className="h-[54px] w-full text-[16px] shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
            Apply
          </CTAButton>
        </div>
      </div>

      {/* The frosted header keeps its destinations visible while scrolling. */}
      <header className="fixed z-50 flex h-[64px] lg:h-[98px] w-full items-center justify-center pointer-events-none" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border pointer-events-auto"
          onPointerEnter={(e) => {
            if (e.pointerType !== 'mouse') return;
            if (showCompact && applyBtnRef.current && e.clientX >= applyBtnRef.current.getBoundingClientRect().left - 24) return;
            setNavHovered(true);
          }}
          onPointerLeave={() => setNavHovered(false)}
          style={{
            width: 'calc(100% - 80px)',
            maxWidth: showCompact ? '380px' : scrolled ? '960px' : '100%',
            height: showCompact ? '52px' : scrolled ? '52px' : '60px',
            paddingLeft: showCompact ? '16px' : scrolled ? '20px' : '0px',
            paddingRight: showCompact ? '16px' : scrolled ? '20px' : '0px',
            borderRadius: scrolled || showCompact ? '9999px' : '16px',
            backdropFilter: scrolled || showCompact ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: scrolled || showCompact ? 'blur(20px)' : 'none',
            backgroundColor: scrolled || showCompact ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(251,246,242,0.65)') : 'transparent',
            borderColor: isDark ? `rgba(255,255,255,${showCompact ? 0.12 : scrolled ? 0.10 : 0})` : `rgba(26,15,10,${scrolled || showCompact ? 0.10 : 0})`,
            boxShadow: !(scrolled || showCompact) ? 'none' : isDark ? '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.09)' : '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
            transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <button onClick={() => window.scrollTo({ top: 0, behavior: scrollBehavior() })} className="flex h-11 w-11 -mx-[5px] cursor-pointer items-center justify-center flex-shrink-0" aria-label="Back to top">
            <div className={`flex items-center justify-center overflow-hidden transition-all duration-500 ${showCompact ? 'h-[38px] w-[34px]' : scrolled ? 'h-[34px] w-[30px]' : 'h-[40px] w-[36px]'}`}><TDTLogo letterColor={isDark ? '#ffffff' : '#1A0F0A'} /></div>
          </button>
          <div className="relative hidden lg:flex items-center justify-center" style={{ minWidth: 0 }}>
            <nav aria-label="Main navigation" className="flex items-center justify-center gap-[30px] text-[14px] tracking-[-0.02em] transition-all duration-500" style={{ opacity: showCompact ? 0 : 1, transform: showCompact ? 'translateY(-5px)' : 'translateY(0)', pointerEvents: showCompact ? 'none' : 'auto' }}>
              {NAV_LINKS.map(({ id, label }) => <a key={id} href={`#${id}`} className="transition-colors duration-150" style={navLinkStyle(id)} onClick={(e) => { e.preventDefault(); scrollToSection(id); }}>{label}</a>)}
            </nav>
            <span className="absolute left-1/2 whitespace-nowrap transition-all duration-500" style={{ opacity: showCompact ? 1 : 0, transform: showCompact ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(5px)', color: isDark ? 'rgba(255,255,255,0.85)' : '#1a0f0a', pointerEvents: 'none' }} aria-live="polite">
              {Object.entries(SECTION_LABELS).map(([id, label]) => <span key={id} className="absolute left-1/2 top-1/2 text-[14px] font-medium tracking-[-0.02em] whitespace-nowrap" style={{ transform: `translate(-50%, -50%) translateY(${activeSection === id ? 0 : -6}px)`, opacity: activeSection === id ? 1 : 0, filter: activeSection === id ? 'blur(0px)' : 'blur(3px)', transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1), filter 0.6s cubic-bezier(0.16,1,0.3,1)' }}>{label}</span>)}
            </span>
          </div>
          <div className="col-start-3 flex items-center justify-end">
            <div className="hidden lg:flex h-[37px] items-center gap-[15px] text-[14px] font-medium tracking-[-0.02em]" style={navTextStyle}>
              <a href="https://app.thinkdifferenttraining.com/access" className="transition-all duration-500" style={{ opacity: showCompact ? 0 : 1, pointerEvents: showCompact ? 'none' : 'auto', marginRight: showCompact ? '-60px' : '0' }}>Log In</a>
              <div ref={applyBtnRef}><CTAButton href="/apply" className={`whitespace-nowrap transition-all duration-500 ${showCompact ? 'h-[32px] px-[16px] text-[13px]' : 'h-[37px] px-[20px] text-[14px]'}`}>Apply</CTAButton></div>
            </div>
            <button ref={menuButtonRef} className="lg:hidden flex h-11 w-11 cursor-pointer items-center justify-center active:opacity-60" style={navTextStyle} onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-haspopup="dialog"><svg width="22" height="15" viewBox="0 0 22 15" fill="none" aria-hidden="true"><path d="M0 1H22M0 7.5H22M0 14H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-col">

        {/* ── Hero ── */}
        <section className="relative w-full min-h-screen bg-black" style={{ minHeight: 'max(720px, 100svh)' }}>
          {/* Background carousel */}
          <HeroCarousel slides={HERO_SLIDES} />
          {/* A directional scrim keeps the longer copy legible over every
              carousel image and fades into the black section below. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(0,0,0,0.48) 0%, transparent 82%), linear-gradient(180deg, transparent 15%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.65) 68%, rgba(0,0,0,0.9) 92%, #000 100%)',
            }}
          />

          {/* Top scrim. The nav pill is fully transparent until you scroll, so
              at rest the logo and links sit straight on the photo — and the
              carousel shots include bright white gym walls that swallow them.
              Only the hero needs this: every other section gets the pill's own
              blurred background once `scrolled` flips. */}
          <div
            className="absolute inset-x-0 top-0 h-[160px] lg:h-[220px] pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.50) 34%, rgba(0,0,0,0.22) 66%, rgba(0,0,0,0) 100%)',
            }}
          />

          {/* Bottom-left content */}
          <div className="absolute bottom-0 left-0 right-0 px-6 md:px-[60px] pb-[50px] md:pb-[80px]">
            <p className="mb-4 inline-flex max-w-fit items-center rounded-full border border-white/35 bg-gradient-to-r from-white/28 via-white/14 to-white/10 px-5 py-2 text-[12px] md:text-[13px] leading-none font-medium tracking-[-0.01em] text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_20px_40px_rgba(255,255,255,0.08)] ring-1 ring-white/18 backdrop-blur-[18px]" style={{ textShadow: navRestShadow }}>
              100 days of private coaching.
            </p>
            <h1 className="text-white text-[32px] md:text-[40px] lg:text-[48px] font-bold leading-[1.2] lg:leading-[57px] tracking-[-0.02em] max-w-[1150px] mb-[11px]">
              You&apos;re better in practice
              <br />
              than in games
            </h1>
            <p className="text-[16px] font-normal leading-[1.6] text-white/80 max-w-[565px] mb-[24px]">
              Over 100 days, Coach Jaiden Francis breaks down your film, gives focused coaching, and sends custom drills for you to practice on your court.
            </p>
            <div className="flex flex-wrap items-center gap-x-[22px] gap-y-[16px]">
              <CTAButton href="/apply" className="h-[46px] px-[24px] text-[15px]">
                Apply for coaching
              </CTAButton>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById('program');
                  if (el) el.scrollIntoView({ behavior: scrollBehavior() });
                }}
                href="#program"
                className="group inline-flex items-center text-[14px] font-normal tracking-[-0.02em] text-white/80 transition-colors duration-200 ease-out hover:text-white"
              >
                <span className="underline underline-offset-4 decoration-white/40 transition-colors duration-200 ease-out group-hover:decoration-white/70">
                  See how it works
                </span>
                <span className="inline-block ml-[6px] transition-transform duration-300 ease-out group-hover:translate-x-[4px]">→</span>
              </a>
            </div>
          </div>

        </section>

        <HowItWorks />
        <HundredDays onOpenFilmFaq={openFilmFaq} />

        {/* ── Coach ── */}
        <section id="coach" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] py-[150px] bg-[#000000]">
          <div className="flex w-full max-w-[1156px] flex-col lg:flex-row items-center lg:items-start gap-[50px] lg:gap-[100px]">
            <div ref={coachContentRef} className="flex w-full lg:w-[491px] flex-col justify-center gap-[30px]">
              <div>
              </div>
              <div>
                {/* No gap on this column: the collapsed panel is zero-height, so
                    a flex gap would sit on both sides of it and push the toggle
                    a full two gaps clear of the lead paragraph. Spacing is
                    carried by the panel's own top padding and the toggle's
                    margin instead, which keeps one 18px rhythm in both states. */}
                <div className="flex flex-col">
                  {/* The collapsed half: the setup, the why, and the line that
                      hands off to the toggle. */}
                  <div className="flex flex-col gap-[18px]">
                    <p className="text-[18px] font-bold tracking-[-0.02em] text-white" style={{ lineHeight: '26px', ...revealLine(0) }}>
                      I&apos;ve trained a lot of athletes who looked incredible in practice. Guys who walked into the gym like nobody could touch them. Then the game starts, and I&apos;m watching a completely different player.
                    </p>
                    <p className="text-[18px] font-bold tracking-[-0.02em] text-white" style={{ lineHeight: '26px', ...revealLine(150) }}>
                      For a long time I called it nerves. It wasn&apos;t nerves. And handing them another drill was never going to tell me what it was — the right drill only exists once you know what&apos;s stopping the work from showing up.
                    </p>
                    <p className="text-[18px] font-normal tracking-[-0.02em] text-[rgba(255,255,255,0.6)]" style={{ lineHeight: '26px', ...revealLine(300) }}>
                      So I studied it. Film, one possession at a time, for years. What I found is in every game you&apos;ve ever played, and almost nobody is coaching it.
                    </p>
                  </div>
                  {/* The answer to that last line collapses behind the toggle
                      rather than opening as a wall of text. */}
                  <div
                    id="coach-letter-rest"
                    className="overflow-hidden transition-[height] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
                    // Opening waits on the arrow: the chevron is already turning
                    // for 180ms before the copy starts moving, so the control
                    // reads as causing the reveal rather than racing it. Closing
                    // takes the delay off — a collapse that hesitates after the
                    // click just feels unresponsive.
                    style={{
                      height: coachExpanded ? coachRestH : 0,
                      transitionDelay: coachExpanded ? '180ms' : '0ms',
                    }}
                  >
                    <div ref={coachRestRef} className="flex flex-col gap-[18px] pt-[18px]">
                      <p className="text-[18px] font-normal tracking-[-0.02em] text-[rgba(255,255,255,0.6)]" style={{ lineHeight: '26px', ...revealLine(300) }}>
                        Practice teaches you what to do. Nobody teaches you when. And when you don&apos;t know when, you start second-guessing. You hesitate. You play safe. People call that confidence. We work on that too, but not by hyping you up. Confidence is what shows up after you know what you&apos;re looking at.
                      </p>
                      <p className="text-[18px] font-bold tracking-[-0.02em] text-white" style={{ lineHeight: '26px', ...revealLine(300) }}>
                        That&apos;s my duty to every athlete who comes on. Getting out the talent we both know is lying dormant in there.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { measureCoachRest(); setCoachExpanded(v => !v); }}
                    aria-expanded={coachExpanded}
                    aria-controls="coach-letter-rest"
                    className="group mt-[18px] inline-flex cursor-pointer items-center self-start text-[14px] font-normal tracking-[-0.02em] text-white/60 transition-colors duration-200 ease-out hover:text-white"
                    style={revealLine(450)}
                  >
                    <span className="underline underline-offset-4 decoration-white/25 transition-colors duration-200 ease-out group-hover:decoration-white/60">
                      {coachExpanded ? 'Read less' : 'Read more'}
                    </span>
                    <svg
                      width="12"
                      height="8"
                      viewBox="0 0 12 8"
                      fill="none"
                      aria-hidden="true"
                      className="ml-[7px] transition-transform duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                      style={{ transform: coachExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    >
                      <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <p className="text-[24px] font-normal leading-[31px] tracking-[-0.02em] text-[rgba(255,255,255,0.8)] mt-5" style={{ fontFamily: "'Pinyon Script', cursive", ...signatureReveal }}>
                  Jaiden Francis
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

            <div className="relative flex w-full lg:w-[565px] items-center justify-center lg:justify-end">
              {/* Portrait on phones, landscape from lg. 2/3 is the source's own
                  aspect, so the mobile frame crops nothing; the lg frame is
                  landscape and does crop, which is what backgroundPosition
                  below is set for. */}
              <div className="relative w-full aspect-[2/3] lg:aspect-auto lg:h-[434px] lg:w-[543px] overflow-hidden rounded-[12px] border border-white/40 bg-[#111111]">
                {/* Portrait source (2:3) in a landscape frame, so cover crops to a
                    horizontal band and the Y position is doing real work — 25%
                    lands the band on his face and upper body rather than the
                    signage above or the floor below. */}
                <div className="absolute inset-0 bg-cover" style={{ backgroundImage: "url('/coach-section.png')", backgroundPosition: 'center 25%' }} />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Difference ── */}
        {(() => {
          const ROWS = [
            {
              slug: 'translation',
              topic: 'Translation',
              tdt: 'Taught',
              others: 'Assumed',
            },
            {
              slug: 'where-starts',
              topic: 'Where it starts',
              tdt: 'Your game film',
              others: 'The gym floor',
            },
            {
              slug: 'film',
              topic: 'Your film',
              tdt: 'Broken down, every submission',
              others: 'Cut into highlights',
            },
            {
              slug: 'attention',
              topic: 'Attention',
              tdt: "You and Jaiden. That's it",
              others: 'A group, split between everyone',
            },
            {
              slug: 'progress',
              topic: 'Progress',
              tdt: 'Scored and logged every session',
              others: 'You feel like you got better',
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
                  Your skills are only part of the game.
                  <br />
                  Learn when and why to use them, with coaching built around your own film.
                </h2>
              </div>

              {/* Phones get the stacked cards below; this scaled table is md and
                  up only. 0.72 rather than a tighter scale: much below that and
                  the table's 16px cells get uncomfortably small on a narrow
                  tablet. The overflow-x-auto wrapper is the fallback if it still
                  overflows. */}
              <style>{`
                .diff-table-sizer { width: 648px; height: 518px; }
                .diff-table-scaled { width: 900px; height: 720px; transform: scale(0.72); transform-origin: top left; }
                @media (min-width: 1024px) {
                  .diff-table-sizer { width: 900px; height: 720px; }
                  .diff-table-scaled { transform: scale(1); }
                }
              `}</style>
              <div ref={tableRef} className="w-full">
                {/* Mobile: the same 3-column table as desktop — topic, TDT,
                    everywhere else — sized down to real mobile type rather than
                    a CSS-scaled 900px table (illegible) or the row stacked into
                    cards (loses the side-by-side comparison the table is for). */}
                <div
                  className="flex md:hidden w-full flex-col"
                  style={{ border: '1px solid #333333', borderRadius: '14px', overflow: 'hidden' }}
                >
                  {/* Header — topic cell stays blank, matching the desktop table
                      (the topics column has no header cell there either). */}
                  <div className="grid items-stretch" style={{ gridTemplateColumns: '0.8fr 1.1fr 1.1fr' }}>
                    <div className="p-[12px] bg-[#000000] rounded-tl-[14px]" />
                    <div className="flex items-center gap-[6px] p-[12px]" style={{ background: '#B34929' }}>
                      <TDTLogo letterColor="white" width={13} height={15} />
                      <span className="text-[12px] font-medium leading-[14px] tracking-[-0.01em] text-white">
                        Think Different Training
                      </span>
                    </div>
                    <div className="flex items-center p-[12px]">
                      <span className="text-[12px] font-medium leading-[14px] tracking-[-0.01em] text-white/50">
                        Everywhere else
                      </span>
                    </div>
                  </div>

                  {ROWS.map((row, i) => (
                    <div
                      key={row.slug}
                      className="grid items-stretch"
                      style={{
                        gridTemplateColumns: '0.8fr 1.1fr 1.1fr',
                        borderTop: '1px solid #333333',
                        opacity: tableVisible ? 1 : 0,
                        transform: tableVisible ? 'translateY(0px)' : 'translateY(12px)',
                        transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 80}ms`,
                      }}
                    >
                      <div className="flex items-center p-[12px]" style={{ minHeight: '58px' }}>
                        <span className="text-[13px] font-medium leading-[16px] tracking-[-0.01em] text-white/75">
                          {row.topic}
                        </span>
                      </div>
                      <div className="flex items-center p-[12px]" style={{ minHeight: '58px', background: '#B34929' }}>
                        <span className="text-[13px] font-normal leading-[16px] tracking-[-0.01em] text-white">
                          {row.tdt}
                        </span>
                      </div>
                      <div className="flex items-center p-[12px]" style={{ minHeight: '58px' }}>
                        <span className="text-[13px] font-normal leading-[16px] tracking-[-0.01em] text-white/50">
                          {row.others}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* md and up: the full comparison table, scaled down before lg, horizontal-scroll fallback if it still overflows */}
                <div className="hidden md:block w-full overflow-x-auto lg:overflow-visible">
                <div className="mx-auto diff-table-sizer">
                  <div className="diff-table-scaled">
                    <div
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
                          borderRadius: row.br,
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
              </div>
            </section>
          );
        })()}

        {/* Transition from the dark section set into the light surface */}
        <section
          id="pricing-transition"
          ref={transitionZoneRef}
          className="relative w-full"
          style={{ height: desktopTransition ? '175vh' : undefined }}
        >
          <div
            className={desktopTransition ? 'sticky top-0 h-screen w-full overflow-hidden' : 'relative w-full'}
            style={{ backgroundColor: panelBg }}
          >
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
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                background: 'radial-gradient(ellipse 100% 75% at 50% 50%, #FFFFFF 0%, rgba(255,246,236,0.65) 38%, transparent 78%)',
                opacity: Math.pow(flash, 1.25),
                mixBlendMode: 'screen',
              }}
            />

            <div
              className="relative z-10 mx-auto w-full"
              style={{
                opacity: transitionActive ? revealEased : 1,
                transform: transitionActive ? `translateY(${(1 - revealEased) * 16}px)` : 'none',
                transition: transitionActive
                  ? 'opacity 140ms cubic-bezier(0.16, 1, 0.3, 1), transform 140ms cubic-bezier(0.16, 1, 0.3, 1)'
                  : 'none',
                pointerEvents: !transitionActive || revealEased > 0 ? 'auto' : 'none',
              }}
            >
              <ProgramPricing transition />
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] py-[72px] md:py-[100px] bg-[#FBF6F2] text-black">
          <div className="flex w-full max-w-[860px] flex-col items-center gap-[28px]">
            <h2 className="w-full max-w-[634px] text-center text-[28px] md:text-[40px] lg:text-[48px] font-bold leading-tight tracking-[-0.02em] text-[#1A0F0A]">
              Questions from players and parents.
            </h2>

            <div className="flex w-full flex-col items-start">
                {[
                  {
                  question: "Is the program online or in person?",
                  answer: "The coaching is fully online, through our app. You can review film, receive feedback and work with Jaiden there. If you don't have film yet, we still start with practical steps and help you set up a simple capture routine from week one.",
                },
                {
                  question: "What do the 100 days actually involve?",
                  answer: "100 days is the length of the program. The process is to work through film, review Jaiden’s feedback, practice your personalized drills and bring new footage as you go. If you're just getting started, we begin with a simple first-step plan and build from there.",
                },
                {
                  question: "What do I need to do to get started?",
                  answer: "You need internet access to use the app and a commitment to follow through on your plan. Film is helpful, but not a strict starting requirement. If you are unsure about your device or where to start, we will help you solve that during the call.",
                },
                {
                  question: "What if I do not have game film yet?",
                  answer: "You do not need a polished highlight reel. Team footage, league footage or a parent filming a game can provide the starting point. If you do not have any yet, tell us in your application and we can discuss how to get suitable footage.",
                },
                {
                  question: "Can I keep working with my team and trainer?",
                  answer: "Yes. The program is designed to complement the basketball work you are already doing. Jaiden uses your game film to help you understand when and why to use your skills, then connects that feedback to your practice.",
                },
                {
                  question: "Is this the right fit for my child?",
                  answer: "This is for players who already train and play, but want help translating that work into games. They need to be open to feedback and consistent effort. The application and call help us understand the player’s goals and whether this approach fits.",
                },
                {
                  question: "What happens after I apply?",
                  answer: "After submitting your application, you can book a call. We will talk about your goals, explain the program and answer your questions. For younger players, choose a time when a parent can join too.",
                },
              ].map((item, index) => {
                const isOpen = openFaq === index;
                  return (
                  <div
                    key={index}
                    id={`faq-question-${index}`}
                    className="flex w-full flex-col border-b border-[rgba(0,0,0,0.15)] transition-colors duration-300"
                    style={highlightFaq === index ? {
                      backgroundColor: 'rgba(250, 215, 58, 0.12)',
                      borderColor: 'rgba(250, 215, 58, 0.55)',
                      borderLeft: '4px solid #FAD73A',
                      paddingLeft: '13px',
                    } : undefined}
                  >
                    <button
                      onClick={() => {
                        const next = isOpen ? -1 : index;
                        setOpenFaq(next);
                        setHighlightFaq((current) => (next === index ? null : (current === 3 ? null : current)));
                      }}
                      className="flex cursor-pointer items-start gap-[10px] px-0 py-[20px] text-left w-full min-h-[44px]"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${index}`}
                    >
                      <span className="flex-1 text-[14px] md:text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-[#3F3229]">
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
                      <p className="max-w-[740px] pb-[24px] pr-6 text-[13px] md:text-[14px] font-normal leading-[1.65] text-[#74655B]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        <LandingFinalCTA />

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
                  tyrell@thinkdifferenttraining.com
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
