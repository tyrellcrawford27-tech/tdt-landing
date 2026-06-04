'use client';

import { useState, useEffect, useRef } from "react";
import { TDTLogo } from "@/components/TDTLogo";
import { FooterText } from "@/components/FooterText";

export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  // 0 = dark, 1 = light — driven by scroll through the transition zone
  const [tp, setTp] = useState(0);
  // How many card-heights we've scrolled past the start of the card stack
  const [programProgress, setProgramProgress] = useState(0);
  // Which section is currently closest to the viewport midpoint
  const [activeSection, setActiveSection] = useState<string>('');

  const transitionZoneRef = useRef<HTMLDivElement>(null);
  const cardsStartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SECTIONS = ['coach', 'program', 'difference', 'pricing', 'faq'];

    const onScroll = () => {
      // Dark → light transition progress
      if (transitionZoneRef.current) {
        const r = transitionZoneRef.current.getBoundingClientRect();
        setTp(Math.max(0, Math.min(1, -r.top / r.height)));
      }
      // Program card stack progress (unit = 1 card = 1 viewport height)
      if (cardsStartRef.current) {
        const r = cardsStartRef.current.getBoundingClientRect();
        setProgramProgress(Math.max(0, -r.top) / window.innerHeight);
      }
      // Active section — whichever section's top edge is nearest above the midpoint
      const mid = window.innerHeight * 0.45;
      let active = '';
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= mid) active = id;
      }
      setActiveSection(active);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isDark = tp < 0.5;
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  // Full-screen transition panel: #000000 → #FBF6F2
  const panelBg = `rgb(${lerp(0,251,tp)},${lerp(0,246,tp)},${lerp(0,242,tp)})`;

  // Nav background: rgba(0,0,0,0.96) → rgba(251,246,242,0.92)
  const navBgStyle = { backgroundColor: `rgba(${lerp(0,251,tp)},${lerp(0,246,tp)},${lerp(0,242,tp)},${tp < 0.5 ? 0.96 : 0.92})` };
  // Nav border
  const navBorderStyle = { borderColor: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},0.12)` };
  // Nav text (base — used for Log In and as fallback)
  const navTextStyle = { color: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},0.6)` };
  // Per-link style: active links are full opacity, inactive are 0.4
  const navLinkStyle = (id: string) => ({
    color: `rgba(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)},${activeSection === id ? 1 : 0.4})`,
    transition: 'color 0.3s ease',
    fontWeight: activeSection === id ? '500' : '400',
  });

  return (
    <div className="relative min-h-screen bg-[#FBF6F2]">
      <header
        className="sticky top-0 z-50 flex h-[98px] w-full items-center justify-center backdrop-blur-[10px] border-b"
        style={{ ...navBgStyle, ...navBorderStyle }}
      >
        <div className="relative flex w-full max-w-[1440px] items-center justify-between px-[50px] py-[20px]">
          {/* Logo — left */}
          <div className="flex h-[58px] w-[50px] items-center justify-center">
            <TDTLogo letterColor={`rgb(${lerp(255,26,tp)},${lerp(255,15,tp)},${lerp(255,10,tp)})`} />
          </div>

          {/* Nav — absolutely centered against the full header width */}
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-[30px] text-[14px] tracking-[-0.02em]">
            <a href="#coach" style={navLinkStyle('coach')}>The Coach</a>
            <a href="#program" style={navLinkStyle('program')}>Program</a>
            <a href="#pricing" style={navLinkStyle('pricing')}>Pricing</a>
            <a href="#faq" style={navLinkStyle('faq')}>FAQ</a>
          </nav>

          {/* Right actions */}
          <div className="flex h-[37px] items-center gap-[15px] text-[14px] font-medium tracking-[-0.02em]" style={navTextStyle}>
            <a href="#login" className={`transition-opacity hover:opacity-100 ${isDark ? 'hover:text-white' : 'hover:text-[#1A0F0A]'}`}>Log In</a>
            <a
              href="#book-demo"
              className="inline-flex h-[37px] items-center justify-center rounded-[103px] bg-[#B34929] px-[20px] text-[14px] font-medium text-[rgba(255,255,255,0.6)] transition hover:bg-[#C25433]"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 50.18%), #B34929",
                backgroundBlendMode: "soft-light, normal",
                boxShadow: "inset 0px 0px 0px 0.8px rgba(0, 0, 0, 0.25), inset 0px 0px 5px 5px rgba(255, 255, 255, 0.1), inset 0px 0px 3px 1px rgba(255, 255, 255, 0.25), inset 0px 0px 4px 20px rgba(255, 255, 255, 0.04)",
              }}
            >
              Book Demo
            </a>
          </div>
        </div>
      </header>

      <main className="flex w-full flex-col">

        <section className="relative flex w-full min-h-screen flex-col items-center justify-center gap-12 text-center bg-[#000000]">
          <div className="max-w-[874px]">
            <div className="inline-flex h-[24px] min-w-[249px] items-center justify-center rounded-full border border-[#B34929] bg-[rgba(179,73,41,0.15)] px-5 py-[5px] text-center text-[12px] font-normal tracking-[-0.02em] text-[rgba(179,73,41,0.7)]" style={{ boxShadow: "inset 0px 4px 6px rgba(255, 255, 255, 0.09), inset 0px -4px 6px 1px rgba(179, 73, 41, 0.25)" }}>
              COHORT 1 · SEPTEMBER 2026 · 8 SPOTS
            </div>
            <h1 className="mt-8 text-[44px] font-bold leading-[53px] tracking-[-0.02em]">
              <span style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.65) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                Most of your development happens alone.
              </span>
              <span className="block text-[rgba(255,255,255,0.55)]">We make sure it counts.</span>
            </h1>
            <p className="mt-6 max-w-[668px] text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(255,255,255,0.6)] mx-auto">
              Jaiden evaluates your specific game, identifies exactly what's holding you back, and documents your improvement with real proof over 4 months.
            </p>

            <div className="mt-10">
              <a
                href="#apply"
                className="group relative inline-flex h-[49px] items-center justify-center overflow-hidden rounded-[51px] px-8 text-[16px] leading-[19px] font-normal text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_8px_22px_-6px_rgba(179,73,41,0.55)] active:translate-y-0 active:scale-[0.98]"
              >
                <div className="absolute inset-0 rounded-[51px] pointer-events-none bg-[#B34929] transition-[filter,background-color] duration-200 ease-out group-hover:bg-[#C25433] group-hover:brightness-[1.06]" style={{
                  backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 50.18%)",
                  backgroundBlendMode: "soft-light, normal",
                  boxShadow: "rgba(0, 0, 0, 0.25) 0px 0px 0px 0.8px inset, rgba(255, 255, 255, 0.1) 0px 0px 5px 5px inset, rgba(255, 255, 255, 0.25) 0px 0px 3px 1px inset, rgba(255, 255, 255, 0.04) 0px 0px 4px 20px inset",
                }} />
                <div className="absolute inset-0 rounded-[51px] pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{
                  background: "linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.18) 50%, transparent 70%)",
                }} />
                <span className="relative">Apply for Cohort 1</span>
              </a>
            </div>
          </div>
        </section>

        <section id="coach" className="relative flex min-h-[889px] w-full flex-col items-center gap-[40px] px-[100px] py-[150px] bg-[#000000]">
          <div className="inline-flex h-[35px] items-center justify-center gap-[10px] rounded-[35px] bg-[#1B1B1B] px-[20px] shadow-[inset_-3px_-2px_3px_rgba(54,54,54,0.25),inset_0px_4px_4px_rgba(54,54,54,0.25)]">
            <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: `rgba(184,78,44,${activeSection === 'coach' ? 1 : 0.5})`, transition: 'background-color 0.4s ease' }} />
            <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em]" style={{ color: `rgba(184,78,44,${activeSection === 'coach' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>The Coach</span>
          </div>

          <div className="flex w-full max-w-[1156px] items-center gap-[100px]">
            <div className="flex w-[491px] flex-col justify-center gap-[30px]">
              <div className="flex flex-col gap-[20px]">
                <p className="text-[18px] font-bold leading-[20px] tracking-[-0.02em] text-[rgba(255,255,255,0.6)]">
                  Seven years. I've trained with some of the best this country has produced. I know the difference between someone who works hard and someone who actually gets better and most of the time it's not talent or effort. It's knowing exactly what to fix and having someone who won't let you look away from it.
                </p>
                <p className="text-[24px] font-normal leading-[31px] tracking-[-0.02em] text-[rgba(255,255,255,0.8)]" style={{ fontFamily: "'Centralwell - Personal use', sans-serif" }}>
                  - Jaiden Francais
                </p>
              </div>

              <div className="flex w-[296px] flex-col gap-[10px] text-left">
                <span className="text-[12px] font-normal leading-[14px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)]">ATHLETES TRAINED FROM</span>
                <div className="flex items-center gap-[30px]">
                  <div className="h-[44px] w-[19px] rounded-full bg-white/20" />
                  <div className="h-[43px] w-[32px] rounded-full bg-white/20 opacity-75" />
                  <div className="h-[34px] w-[41px] rounded-full bg-white/20 opacity-75" />
                  <div className="h-[40px] w-[40px] rounded-full bg-white/20 opacity-75" />
                  <div className="h-[44px] w-[44px] rounded-full bg-white/20 opacity-75" />
                </div>
              </div>
            </div>

            <div className="relative flex w-[565px] items-center justify-end">
              <div className="absolute left-0 top-0 flex h-[100px] w-[12px] flex-col items-center justify-center gap-[10px]">
                <div className="h-[12px] w-[12px] rounded-full bg-white" />
                <div className="h-[12px] w-[12px] rounded-full bg-white/20" />
                <div className="h-[12px] w-[12px] rounded-full bg-white/20" />
                <div className="h-[12px] w-[12px] rounded-full bg-white/20" />
                <div className="h-[12px] w-[12px] rounded-full bg-white/20" />
              </div>
              <div className="relative h-[434px] w-[543px] overflow-hidden rounded-[12px] border border-white/40 bg-[#111111]">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,rgba(0,0,0,0.6)_100%)]" />
                <div className="absolute inset-0 flex items-center justify-center text-[14px] text-white/40">
                  Placeholder content
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="program" className="relative w-full bg-[#000000]">
          {/* Section header — normal scroll flow */}
          <div className="flex flex-col items-center gap-[20px] px-[100px] pt-[150px] pb-[80px]">
            <div className="inline-flex h-[35px] items-center justify-center gap-[10px] rounded-[35px] bg-[#1B1B1B] px-[20px] shadow-[inset_-3px_-2px_3px_rgba(54,54,54,0.25),inset_0px_4px_4px_rgba(54,54,54,0.25)]">
              <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: `rgba(184,78,44,${activeSection === 'program' ? 1 : 0.5})`, transition: 'background-color 0.4s ease' }} />
              <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em]" style={{ color: `rgba(184,78,44,${activeSection === 'program' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>The Program</span>
            </div>
          </div>

          {/* Scroll anchor — programProgress counts from here */}
          <div ref={cardsStartRef} />

          {/* ── Sticky card stack ── */}
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
            // How many card-heights of scroll have passed this card's entry point
            const depth = Math.max(0, programProgress - i);
            // Scale down 5% per level of stack depth, floor at 0.78
            const scale = Math.max(0.78, 1 - depth * 0.05);

            return (
              <div
                key={card.label}
                className="sticky top-0 h-screen flex items-center justify-center px-[100px]"
                style={{ zIndex: i + 1 }}
              >
                <div
                  className="flex h-[500px] w-full max-w-[1156px] items-center overflow-hidden rounded-[12px] border border-white/10"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'center',
                    willChange: 'transform',
                  }}
                >
                  {/* Text column */}
                  <div className="flex h-full w-[460px] flex-shrink-0 flex-col justify-center gap-[20px] px-[50px] py-[40px] bg-[#3D2218]">
                    <span className="text-[14px] font-medium leading-[17px] tracking-[0.02em] text-[rgba(255,255,255,0.8)]">{card.label}</span>
                    <div className="flex flex-col gap-[10px]">
                      <h3 className="text-[20px] font-medium leading-[24px] tracking-[0.02em] text-white">{card.title}</h3>
                      <p className="text-[16px] font-normal leading-[22px] tracking-[0.02em] text-[rgba(255,255,255,0.7)]">{card.body}</p>
                    </div>
                  </div>
                  {/* Image column */}
                  <div className="flex h-full flex-1 items-center justify-center bg-[#1E0F09] p-[20px] shadow-[inset_-2px_0px_10px_#000000]">
                    <div
                      className="h-full w-full rounded-[8px] bg-[rgba(255,255,255,0.04)] bg-cover bg-center"
                      style={{ backgroundImage: `url(/${card.image})` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Buffer so the last card stays readable before the next section */}
          <div className="h-[60vh]" />
        </section>

        <section id="difference" className="relative flex w-full flex-col items-center gap-[40px] px-[100px] pt-[150px] pb-[60px] bg-[#000000]">
          <div className="flex w-full max-w-[1156px] flex-col items-center gap-[20px]">
            <h3 className="w-[215px] text-center text-[20px] font-medium leading-[24px] tracking-[-0.02em]" style={{ color: `rgba(255,255,255,${activeSection === 'difference' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>
              What makes this{' '}
              <span style={{ color: `rgba(179,73,41,${activeSection === 'difference' ? 1 : 0.6})`, transition: 'color 0.4s ease' }} className="italic">different</span>
            </h3>
            <h2 className="w-[586px] text-center text-[26px] font-normal leading-[31px] tracking-[-0.02em] text-white">
              Not your $29.99/month course. This is what it looks like when a coach actually watches your game.
            </h2>
          </div>

          <div className="flex w-[900px] h-[720px] items-end gap-0 border-b border-[#333333] rounded-[14px]">
            {/* Topics Column - 300px x 600px (aligned to bottom) */}
            <div className="flex w-[300px] h-[600px] flex-col">
              <div className="flex h-[120px] w-full" />
              <div className="flex h-[120px] w-full items-center justify-center border-t border-l border-[#333333]">
                <span className="text-center text-[16px] font-medium leading-[19px] tracking-[-0.02em] text-white">
                  Basketball drills
                </span>
              </div>
              <div className="flex h-[120px] w-full items-center justify-center border-t border-l border-[#333333]">
                <span className="text-center text-[16px] font-medium leading-[19px] tracking-[-0.02em] text-white">
                  Personal film review
                </span>
              </div>
              <div className="flex h-[120px] w-full items-center justify-center border-t border-l border-[#333333]">
                <span className="text-center text-[16px] font-medium leading-[19px] tracking-[-0.02em] text-white">
                  Individual focus
                </span>
              </div>
              <div className="flex h-[120px] w-full items-center justify-center border-t border-l border-[#333333]">
                <span className="text-center text-[16px] font-medium leading-[19px] tracking-[-0.02em] text-white">
                  Documented growth
                </span>
              </div>
            </div>

            {/* TDT Column - 300px x 720px */}
            <div className="flex w-[300px] h-[720px] flex-col border-l border-[rgba(255,255,255,0.2)]">
              <div className="flex items-center gap-[10px] bg-[#B34929] px-[30px] h-[120px] rounded-tr-[15px]">
                <div className="h-[37px] w-[37px] flex-shrink-0" />
                <span className="text-[18px] font-medium leading-[22px] tracking-[-0.02em] text-white">
                  Think Different Training
                </span>
              </div>
              <div className="flex items-center px-[30px] h-[120px] bg-[#B34929] border-t border-[rgba(0,0,0,0.4)]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white">
                  Based on what Jaiden specifically finds in your game
                </span>
              </div>
              <div className="flex items-center px-[30px] h-[120px] bg-[#B34929] border-t border-[rgba(0,0,0,0.4)]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white">
                  Jaiden watches every clip, Apple Pencil annotations frame by frame
                </span>
              </div>
              <div className="flex items-center px-[30px] h-[120px] bg-[#B34929] border-t border-[rgba(0,0,0,0.4)]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white">
                  8 athletes, Jaiden's full attention on you
                </span>
              </div>
              <div className="flex items-center px-[30px] h-[120px] bg-[#B34929] border-t border-[rgba(0,0,0,0.4)]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white">
                  Tracked scores, annotated footage, before and after proof
                </span>
              </div>
              <div className="flex items-center px-[30px] h-[120px] bg-[#B34929] border-t border-[rgba(0,0,0,0.4)]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white">
                  Dedicated kobe mindset module built to fix how you think about your game
                </span>
              </div>
            </div>

            {/* Other Programs Column - 300px x 720px */}
            <div className="flex w-[300px] h-[720px] flex-col border-l border-[rgba(255,255,255,0.2)]">
              <div className="flex items-center gap-[10px] px-[30px] h-[120px] border-b border-r border-[#333333] rounded-tr-[15px]">
                <div className="h-[40px] w-[40px] flex-shrink-0" />
                <span className="text-[18px] font-medium leading-[22px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)]">
                  Other programs
                </span>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-b border-r border-[#333333]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)] text-center">
                  Browsed by yourself, unsure what you really need
                </span>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-b border-r border-[#333333]">
                <div className="relative w-[64px] h-[57px]">
                  <svg width="65" height="40" viewBox="0 0 65 40" fill="none" className="absolute top-[9px] left-0">
                    <path d="M7 7L58 33" stroke="#FF7171" strokeWidth="7" strokeLinecap="round" />
                  </svg>
                  <svg width="26" height="57" viewBox="0 0 26 57" fill="none" className="absolute top-[0px] left-[19px]">
                    <path d="M7 7L19 50" stroke="#FF7171" strokeWidth="7" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-b border-r border-[#333333]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)] text-center">
                  Hundreds to thousands of members
                </span>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-b border-r border-[#333333]">
                <div className="relative w-[64px] h-[57px]">
                  <svg width="65" height="40" viewBox="0 0 65 40" fill="none" className="absolute top-[9px] left-0">
                    <path d="M7 7L58 33" stroke="#FF7171" strokeWidth="7" strokeLinecap="round" />
                  </svg>
                  <svg width="26" height="57" viewBox="0 0 26 57" fill="none" className="absolute top-[0px] left-[19px]">
                    <path d="M7 7L19 50" stroke="#FF7171" strokeWidth="7" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div className="flex items-center justify-center px-[30px] h-[120px] border-r border-[#333333]">
                <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-[rgba(255,255,255,0.5)] text-center">
                  Generic motivational content
                </span>
              </div>
            </div>
          </div>
        </section>

        {/*
          TRANSITION ZONE — 100vh of scroll travel.
          The sticky inner panel fills the entire viewport and its background
          interpolates from #000000 → #FBF6F2 as you scroll through.
          This drives both the full-screen visual morph AND the nav theme.
        */}
        <div ref={transitionZoneRef} className="relative w-full" style={{ height: '100vh' }}>
          <div
            className="sticky top-0 h-screen w-full"
            style={{ backgroundColor: panelBg }}
          />
        </div>

        <section id="pricing" className="relative flex w-full flex-col items-center gap-[20px] px-[100px] py-[150px] bg-[#FBF6F2] text-black">
          <div className="inline-flex h-[35px] items-center justify-center gap-[10px] rounded-[35px] bg-[#FFE4CE] px-[20px] shadow-[inset_-3px_-2px_3px_#FFDEC4,inset_0px_4px_4px_#FFE6D3]">
            <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: `rgba(184,78,44,${activeSection === 'pricing' ? 1 : 0.5})`, transition: 'background-color 0.4s ease' }} />
            <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em]" style={{ color: `rgba(184,78,44,${activeSection === 'pricing' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>Pricing</span>
          </div>

          <div className="flex w-full max-w-[532px] flex-col items-center gap-[20px]">
            <h2 className="w-[391px] text-center text-[50px] font-bold leading-[60px] tracking-[-0.02em] text-[rgba(0,0,0,0.35)]">
              Your Membership
            </h2>

            <div className="relative h-[336px] w-[532px] rounded-[10px] bg-[#3D2218] p-0">
              <div className="absolute left-[25px] top-[25px] text-[13px] font-normal leading-[16px] tracking-[-0.02em] text-[rgba(255,255,255,0.8)]">
                Think Different Training
              </div>
              <div className="absolute right-[25px] top-[25px] text-[10px] font-normal leading-[12px] tracking-[-0.02em] text-[rgba(255,255,255,0.8)]">
                COHORT 1 · 8 SPOTS
              </div>

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform text-center">
                <h3 className="text-[73px] font-medium leading-[88px] tracking-[-0.02em] text-white">
                  $2,000
                </h3>
                <p className="text-[10px] font-medium leading-[12px] tracking-[-0.01em] text-[rgba(255,255,255,0.3)]">
                  Your own coach. Four months. Eight athletes.
                </p>
              </div>
            </div>

            <p className="w-[514px] text-center text-[14px] font-normal leading-[17px] tracking-[-0.02em] text-black">
              90% of your reps happen when no one is watching. Jaiden makes sure they're the right ones.
            </p>

            <button className="flex h-[37px] w-[139px] items-center justify-center rounded-[84px] bg-[#D7481D] px-[20px] py-[10px] text-[14px] font-normal leading-[17px] tracking-[-0.02em] text-[rgba(255,255,255,0.6)] shadow-[inset_0px_0px_0px_0.8px_rgba(0,0,0,0.25),inset_0px_0px_5px_5px_rgba(255,255,255,0.1),inset_0px_0px_3px_1px_rgba(255,255,255,0.25),inset_0px_0px_4px_20px_rgba(255,255,255,0.04)]">
              Apply for Cohort 1
            </button>
          </div>
        </section>

        <section id="faq" className="relative flex w-full flex-col items-center gap-[20px] px-[100px] py-[150px] bg-[#FBF6F2] text-black">
          <div className="inline-flex h-[35px] items-center justify-center gap-[10px] rounded-[35px] bg-[#FFE4CE] px-[20px] shadow-[inset_-3px_-2px_3px_#FFDEC4,inset_0px_4px_4px_#FFE6D3]">
            <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: `rgba(184,78,44,${activeSection === 'faq' ? 1 : 0.5})`, transition: 'background-color 0.4s ease' }} />
            <span className="text-[16px] font-normal leading-[19px] tracking-[-0.02em]" style={{ color: `rgba(184,78,44,${activeSection === 'faq' ? 1 : 0.5})`, transition: 'color 0.4s ease' }}>FAQ</span>
          </div>

          <div className="flex w-full max-w-[1156px] flex-col items-center gap-[10px]">
            <h2 className="w-[634px] text-center text-[50px] font-bold leading-[60px] tracking-[-0.02em] text-[rgba(0,0,0,0.35)]">
              Everything you need to know before applying.
            </h2>

            <div className="flex w-full flex-col items-start px-[100px]">
              {[
                {
                  question: "Who is Jaiden and why should I trust him with my development?",
                  answer: "7 years developing serious players. Trained alongside athletes who went on to play professionally. Trusted by Canada Basketball's National Training Centre, York University, and Brampton City Prep. He watches your footage specifically and tells you exactly what's holding you back.",
                },
                {
                  question: "How does this actually develop my game if I'm not training in person?",
                  answer: "7 years developing serious players. Trained alongside athletes who went on to play professionally. Trusted by Canada Basketball's National Training Centre, York University, and Brampton City Prep. He watches your footage specifically and tells you exactly what's holding you back.",
                },
                {
                  question: "How much time does this require each week?",
                  answer: "45-60 minutes of focused drill work daily on top of your existing training. Film submissions take 10-15 minutes. Reviews come back within 24 hours. Sessions are scheduled in advance. If you're serious about developing, it fits.",
                },
                {
                  question: "What if I'm not at the right level?",
                  answer: "The program starts with a full diagnosis. Jaiden evaluates exactly where you are before anything begins. What's required isn't a certain level — it's that you show up and do the work.",
                },
                {
                  question: "What if we invest and it doesn't work?",
                  answer: "Results depend on the athlete doing the work. What's guaranteed is Jaiden's full attention on your specific game — every film reviewed, every session delivered, every score updated with a specific reason.",
                },
                {
                  question: "What am I actually getting for $2,000?",
                  answer: "Jaiden's eyes on your specific game for 100 days. Full diagnosis, honest scoring, prescribed drills, frame by frame film review, sessions, and documented proof of exactly how far you came. Not a course. Not content. Individual development built around what he finds in you specifically.",
                },
              ].map((item, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className="flex w-[956px] flex-col border-b border-[rgba(0,0,0,0.15)]"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                      className="flex items-start gap-[10px] px-0 py-[20px] text-left w-full"
                    >
                      <span className="flex-1 text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-[rgba(0,0,0,0.7)]">
                        {item.question}
                      </span>

                      {/* mingcute:up-line — rotates down when closed, up when open */}
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="flex-shrink-0 mt-[2px]"
                        style={{
                          transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                          opacity: isOpen ? 0.6 : 0.2,
                          transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
                        }}
                      >
                        <path
                          d="M5.5 15.5L12 8.5L18.5 15.5"
                          stroke="#000000"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Answer — animates open/close via max-height + opacity */}
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

        {/* Footer */}
        <section className="w-full flex justify-center bg-[#FBF6F2] text-black">
          <div className="w-[1356px] h-[311px] flex flex-col justify-center items-center px-[100px] py-[40px] overflow-visible">
            {/* Frame 155 */}
            <div className="w-[1156px] h-[194px] flex flex-col justify-center items-center gap-[10px] p-[20px] overflow-visible">
              {/* THINK DIFFERENT — animated on hover */}
              <FooterText />
            </div>

            {/* Frame 154 */}
            <div className="w-[1156px] h-[37px] flex flex-row items-center gap-[10px] p-[10px]">
              {/* Copyright */}
              <div className="flex-1">
                <span className="text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)]">
                  © 2026 Think Different Training. All rights reserved.
                </span>
              </div>
              {/* Email */}
              <div className="flex-1 flex justify-end">
                <span className="text-[14px] font-medium leading-[17px] tracking-[-0.02em] text-[rgba(0,0,0,0.6)]">
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

