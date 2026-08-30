'use client';

import { useState, useEffect, useRef } from "react";
import { TDTLogo } from "@/components/TDTLogo";
import { FooterText } from "@/components/FooterText";
import { FilmGrain } from "@/components/FilmGrain";
import { CTAButton } from "@/components/CTAButton";
import { LaunchReveal } from "@/components/LaunchReveal";
import { ProgramStepIcon, ProgramIconStyles } from "@/components/ProgramStepIcon";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import Spline from "@splinetool/react-spline";

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

// Program section scroll tuning — one step per PROGRAM_STEP_VH of scroll.
// Shared between the step index and the container height so they can't drift
// apart. Desktop/tablet pin each stage's card via position: sticky for
// roughly PROGRAM_STEP_VH of scroll; mobile skips pinning entirely (see
// ProgramMobile below) and just reveals each stage as it scrolls into view.
const PROGRAM_STEP_VH = 42;       // scroll distance (% of viewport) per stage — lower = less scroll friction
// Tail after the last stage, before the sticky container releases. Must clear
// the pinned viewport's own height or the last stage is never reachable:
// container - sticky >= (steps-1) * STEP_VH. At 3 stages that's a floor of
// ~47svh; 65 leaves a short breath past the last panel without the half-screen
// of dead scroll the old 90 left behind.
const PROGRAM_END_BUFFER_VH = 65;

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
  { slug: 'diagnosis',    label: 'Diagnosis',    num: '01', icon: 'stethoscope', title: "Straight to the problem.", body: <>He's not watching for highlights. He's watching for the possession where <You>you</You> had the answer and didn't see it.</>, image: 'diagnosis.webp' },
  { slug: 'prescription', label: 'Prescription', num: '02', icon: 'pillbottle',  title: "The fix begins.", body: <>Jaiden pulls what <You>you</You> work on from <You>your</You> film. Then explains one-on-one how to translate it into real games.</>, image: 'drill-true.webp' },
  { slug: '100-days',     label: 'The 100 Days', num: '03', icon: 'repeat',      title: "Then it repeats.", body: <>Again and again, until there's nothing left to fix. A complete plan that's <You>yours</You> alone to translate into real games.</>, image: 'the-100-days.webp', imagePosition: 'center 52%' },
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

// Which stage the page is currently scrolled to. Both the scroll handler and
// the swipe read through this rather than trusting React state: a swipe that
// lands before the next render — or part-way through a swipe's own smooth
// scroll — would otherwise compute its target from a stale step and jump the
// wrong way.
function programMobileStep(startEl: HTMLElement | null) {
  if (!startEl) return 0;
  // Guard innerHeight — a collapsed viewport reports 0, and 0/0 is NaN, which
  // would index PROGRAM_STEPS out of bounds.
  const vh = window.innerHeight || 1;
  const passed = Math.max(0, -startEl.getBoundingClientRect().top) / vh;
  return Math.min(
    PROGRAM_STEPS.length - 1,
    Math.max(0, Math.floor(passed * (100 / PROGRAM_MOBILE_STAGE_VH))) || 0,
  );
}

// Horizontal swipe thresholds for the mobile Program stages. Deliberately
// strict: this sits inside a vertically-scrolling page, so anything that could
// plausibly be a scroll must stay a scroll.
const SWIPE_MIN_PX = 45;    // shorter than this is a tap or a jitter
const SWIPE_RATIO = 1.3;    // must be this much more sideways than vertical
const SWIPE_MAX_MS = 600;   // a flick, not a slow drag that wandered

function ProgramMobile() {
  const startRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);

  // Swipes scroll the page to the target stage rather than setting `step`
  // directly. Scroll position stays the single source of truth, so the swipe
  // and the scroll-down mechanic can't disagree — and the dots, which read off
  // `step`, follow for free.
  const goToStep = (i: number) => {
    const el = startRef.current;
    if (!el) return;
    const clamped = Math.min(PROGRAM_STEPS.length - 1, Math.max(0, i));
    if (clamped === programMobileStep(el)) return;
    const vh = window.innerHeight || 1;
    const startY = el.getBoundingClientRect().top + window.scrollY;
    // Aim at the middle of the stage's window, not its edge — landing on a
    // boundary leaves a stray pixel of scroll able to flip it back.
    const target = startY + (clamped + 0.5) * (PROGRAM_MOBILE_STAGE_VH / 100) * vh;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.round(target), behavior: reduced ? 'auto' : 'smooth' });
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Never preventDefault anywhere in this gesture: the page has to keep
    // scrolling vertically through it. Intent is judged only once, at the end.
    if (Math.abs(dx) < SWIPE_MIN_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return;
    if (performance.now() - start.t > SWIPE_MAX_MS) return;
    goToStep(programMobileStep(startRef.current) + (dx < 0 ? 1 : -1));
  };

  useEffect(() => {
    const onScroll = () => setStep(programMobileStep(startRef.current));
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

      {/* touch-action pan-y: vertical scroll and pinch stay native, but the
          browser stops claiming horizontal drags — without it iOS reads a
          right-swipe near the edge as back-navigation. */}
      <div
        className="sticky top-0 h-[100svh] overflow-hidden"
        style={{ touchAction: 'pan-y pinch-zoom' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { touchRef.current = null; }}
      >
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

/**
 * Smootherstep — zero velocity AND zero acceleration at both ends.
 *
 * The page's usual curve, cubic-bezier(0.16,1,0.3,1), is an ease-out: it starts
 * at full speed. That's right for something appearing on its own, but wrong for
 * moving between two resting points, where an instant start reads as a jolt.
 * This leaves and arrives with no visible edge at either end, which is what a
 * stage-to-stage glide needs.
 *
 * Panels take their position linearly from scroll, so this curve alone shapes
 * the motion — see the note in the rAF loop about what compounding two of them
 * did.
 */
const PROGRAM_SNAP_EASE = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * ProgramDesktop — md and up. Each stage is a full-bleed panel (copy + its own
 * screenshot) that slides across the viewport as you scroll, so the transition
 * IS the scroll rather than a fixed-duration animation it triggers.
 *
 * Two things this deliberately does NOT do:
 *
 * 1. It doesn't drive position from React state. A scroll-linked transform
 *    re-rendering this page's whole component tree on every scroll tick is what
 *    made the first attempt stutter — the work per frame swamped the frame. The
 *    rAF loop writes transforms straight to the DOM nodes instead, and the only
 *    state that changes is the active step index, which flips ~3 times total.
 *
 * 2. It doesn't put the page gutter on the clipping parent. Panels are
 *    absolute inset-0 of the sticky box and translate by 100% of their own
 *    width, so if that box were padded, one "panel width" would be narrower
 *    than the viewport and the outgoing panel would never clear the screen —
 *    it'd sit stranded in the margin next to the incoming one. The sticky box
 *    is full-bleed and each panel carries the gutter itself.
 */
function ProgramDesktop() {
  const startRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const railFillRef = useRef<HTMLDivElement>(null);
  // The rail labels are rendered here but the scroll tween lives inside the
  // effect below, so the effect hands the jump back out through this.
  const jumpToStepRef = useRef<((i: number) => void) | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const start = startRef.current;
    const sticky = stickyRef.current;
    if (!start || !sticky) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let running = false;
    let lastActive = -1;

    const frame = () => {
      const vh = window.innerHeight || 1;
      const passed = Math.max(0, -start.getBoundingClientRect().top) / vh;
      const unit = PROGRAM_STEP_VH / 100;
      const idx = Math.min(PROGRAM_STEPS.length - 1, Math.max(0, passed / unit));
      // Linear in scroll, deliberately. Easing the panel here as well as in the
      // scroll tween that drives it compounds the two curves: measured, that
      // put the panel 90% of the way across in the first 20% of the glide, then
      // crawling — which reads as a snap, not a slide. One easing only, and it
      // belongs on the scroll, so free-scrolling tracks the finger 1:1 too.
      const position = idx;

      panelRefs.current.forEach((panel, i) => {
        if (!panel) return;
        const offset = i - position;
        const away = Math.min(1, Math.abs(offset));
        if (reduced) {
          // Same staging, no travel — a full-width horizontal sweep tied to
          // scroll is exactly the motion this preference exists to opt out of.
          panel.style.transform = 'translate3d(0,0,0)';
          panel.style.opacity = String(1 - away);
        } else {
          panel.style.transform = `translate3d(${offset * 100}%,0,0)`;
          // Slight fade on the way out softens the clip at the screen edge;
          // not a crossfade, the slide still does the work.
          panel.style.opacity = String(1 - away * 0.35);
        }
        panel.style.pointerEvents = away < 0.5 ? 'auto' : 'none';
      });

      // +0.5 puts the head at the CENTRE of the active stage's segment, which is
      // exactly where that stage's label is centred below. Filling to the
      // segment's trailing edge instead would park the dot on the divider
      // between two labels, pointing at neither.
      const fill = railFillRef.current;
      if (fill) fill.style.width = `${((position + 0.5) / PROGRAM_STEPS.length) * 100}%`;

      const nearest = Math.round(position);
      if (nearest !== lastActive) {
        lastActive = nearest;
        setActiveStep(nearest);
      }

      if (running) raf = requestAnimationFrame(frame);
    };

    // Only spin the loop while the section is actually on screen.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(frame);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: '100px' },
    );
    io.observe(sticky);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  // One flick, one stage — the feed-style scroll this section is going for.
  //
  // The earlier version let the page scroll freely and snapped back once you
  // stopped, which meant every transition passed through the state this layout
  // handles worst: outgoing panel, incoming panel and two screenshots on screen
  // together. Capturing the gesture instead means that state only ever exists
  // mid-glide, under our own easing, and never as somewhere you can come to
  // rest.
  //
  // Capture is deliberately narrow. It only applies at md and up (the panels
  // are display:none below that), only while the section is within its staged
  // range, and it always releases at the ends — a flick down on the last stage
  // or up on the first is left to the browser, so the section can never trap
  // you. Touch is left alone entirely and falls through to the settle-after-
  // scroll path below, since preventDefault on touchmove is a much easier way
  // to break a page than it is to improve one.
  useEffect(() => {
    const start = startRef.current;
    if (!start) return;

    const desktop = window.matchMedia('(min-width: 768px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    let quiet: ReturnType<typeof setTimeout>;
    let gliding = false;
    let tweenRaf = 0;
    let lastWheelAt = 0;
    let lastDelta = 0;
    // When the current run of swallowed events began, or 0 when not swallowing.
    let holdingSince = 0;
    // Stage the current glide is heading for, or null when idle. Chaining off
    // this rather than off live scroll position is what lets a second flick
    // mid-glide advance one more stage instead of re-reading a half-travelled
    // scrollY and landing back where it started.
    let targetIdx: number | null = null;

    // Fixed duration for gesture-driven moves: every flick travels exactly one
    // stage, so a distance-scaled duration would only make identical gestures
    // feel inconsistent. Hand-rolled rather than scrollTo({behavior:'smooth'})
    // because that gives no control over either duration or curve.
    const GLIDE_MS = 720;
    // Separating "one flick" from "still scrolling" is the whole problem here,
    // and neither timing alone nor magnitude alone does it:
    //
    //   - A trackpad flick is a burst of dozens of events whose momentum tail
    //     can outlast the glide, so a plain cooldown lets the tail advance a
    //     second stage.
    //   - A mouse wheel scrolled steadily also fires inside any gap threshold
    //     wide enough to catch that tail, so a plain gap check freezes it.
    //
    // What actually separates them is that momentum DECAYS and deliberate input
    // does not. So: a gap means a new gesture, and within a stream, a delta that
    // stops shrinking means the user pushed again.
    const GESTURE_GAP_MS = 90;
    // Below this, |deltaY| is a momentum tail rather than anything a hand is
    // doing. macOS decays well under it long before a tail ends.
    const MOMENTUM_FLOOR = 8;
    // Backstop. Whatever the heuristics decide, never hold the section still for
    // longer than this while input is arriving — being stuck is a worse failure
    // than advancing one stage too many, so this is the last word.
    const HOLD_CAP_MS = 900;

    const geometry = () => {
      const vh = window.innerHeight || 1;
      return {
        vh,
        unit: (PROGRAM_STEP_VH / 100) * vh, // one stage, in px of scroll
        startY: start.getBoundingClientRect().top + window.scrollY,
        lastIdx: PROGRAM_STEPS.length - 1,
      };
    };

    const glideTo = (targetY: number) => {
      const from = window.scrollY;
      const delta = targetY - from;
      if (Math.abs(delta) < 2) return;

      if (reduced.matches) {
        window.scrollTo(0, targetY);
        return;
      }

      const html = document.documentElement;
      // globals.css sets html { scroll-behavior: smooth }, which would animate
      // every per-frame scrollTo below and fight this tween into a crawl.
      const prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';

      const t0 = performance.now();
      gliding = true;

      const stop = () => {
        html.style.scrollBehavior = prevBehavior;
        gliding = false;
        targetIdx = null;
      };

      const step = (now: number) => {
        if (!gliding) { stop(); return; } // cancelled
        const t = Math.min(1, (now - t0) / GLIDE_MS);
        window.scrollTo(0, from + delta * PROGRAM_SNAP_EASE(t));
        if (t < 1) tweenRaf = requestAnimationFrame(step);
        else stop();
      };
      cancelAnimationFrame(tweenRaf);
      tweenRaf = requestAnimationFrame(step);
    };

    const onWheel = (e: WheelEvent) => {
      if (!desktop.matches || reduced.matches) return;

      const { unit, startY, lastIdx } = geometry();
      const passed = window.scrollY - startY;

      // Outside the staged range the section behaves like any other content.
      if (passed < -0.5 * unit || passed > lastIdx * unit + 0.5 * unit) return;

      // Use horizontal scroll (deltaX) if present, otherwise use vertical (deltaY)
      const scrollDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const dir = scrollDelta > 0 ? 1 : -1;
      // Chain off the in-flight target only while one is actually in flight. A
      // glide interrupted before it settles (tab backgrounded mid-tween, so rAF
      // never delivers the final frame) would otherwise leave a stale target
      // here forever, and every later flick would be measured from a stage the
      // page isn't on.
      const from = gliding && targetIdx !== null ? targetIdx : Math.round(passed / unit);
      const next = from + dir;

      // Release at both ends so the section can be scrolled out of normally.
      if (next < 0 || next > lastIdx) { holdingSince = 0; return; }

      // Swallowed for the whole gesture, not just the event that advances —
      // letting the momentum tail through would scroll the page underneath the
      // glide.
      e.preventDefault();

      const now = performance.now();
      const gap = now - lastWheelAt;
      const delta = Math.abs(scrollDelta);
      const shrinking = delta < lastDelta;
      lastWheelAt = now;
      lastDelta = delta;

      const advance = () => {
        holdingSince = 0;
        glideTo(Math.round(startY + next * unit));
        targetIdx = next;
      };

      // A gap in the stream is unambiguous: the last gesture ended.
      if (gap >= GESTURE_GAP_MS) { advance(); return; }

      // A tween in flight is its own bounded hold — it always ends, on a timer
      // we set. So swallow freely here and reset the backstop's clock: counting
      // glide time towards it is what let a flick's momentum trip the backstop
      // and steal a second stage.
      if (gliding) { holdingSince = 0; return; }

      // Not gliding, and the stream is still arriving. This is the only branch
      // that can swallow unboundedly, so it's the only one that needs a
      // backstop.
      if (!holdingSince) holdingSince = now;
      if (now - holdingSince >= HOLD_CAP_MS) { advance(); return; }

      // Momentum decays; a hand does not. A delta that has stopped shrinking,
      // and is above the floor, is the user pushing again rather than the last
      // flick running out. Strictly shrinking, because momentum quantised to
      // small integers repeats values on the way down, and those repeats sit
      // below the floor anyway.
      if (shrinking || delta <= MOMENTUM_FLOOR) return;

      advance();
    };

    const onKey = (e: KeyboardEvent) => {
      if (!desktop.matches || reduced.matches) return;
      const dir = e.key === 'ArrowDown' || e.key === 'PageDown' ? 1
        : e.key === 'ArrowUp' || e.key === 'PageUp' ? -1
        : 0;
      if (!dir) return;

      const { unit, startY, lastIdx } = geometry();
      const passed = window.scrollY - startY;
      if (passed < -0.5 * unit || passed > lastIdx * unit + 0.5 * unit) return;

      const next = (gliding && targetIdx !== null ? targetIdx : Math.round(passed / unit)) + dir;
      if (next < 0 || next > lastIdx) return;

      e.preventDefault();
      glideTo(Math.round(startY + next * unit));
      targetIdx = next;
    };

    // Fallback for anything that isn't a wheel or an arrow key — touch,
    // dragging the scrollbar, a trackpad fling that outruns the cooldown.
    // Settles to the nearest stage once the page goes quiet.
    const settle = () => {
      if (!desktop.matches || gliding) return;
      const { unit, startY, lastIdx } = geometry();
      const passed = window.scrollY - startY;
      if (passed < -0.15 * unit || passed > lastIdx * unit + 0.4 * unit) return;
      const nearest = Math.min(lastIdx, Math.max(0, Math.round(passed / unit)));
      glideTo(Math.round(startY + nearest * unit));
    };

    const onScroll = () => {
      if (gliding) return; // our own tween, not the user
      clearTimeout(quiet);
      quiet = setTimeout(settle, 140); // wait out trackpad momentum
    };

    // Touch always wins outright — never fight a finger for the scroll.
    const onTouch = () => { gliding = false; targetIdx = null; };

    // Direct jump for the rail labels — same tween, so clicking a stage and
    // flicking to it land identically instead of one hard-cutting.
    jumpToStepRef.current = (i: number) => {
      const { unit, startY, lastIdx } = geometry();
      const target = Math.min(lastIdx, Math.max(0, i));
      glideTo(Math.round(startY + target * unit));
      targetIdx = target;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });

    return () => {
      jumpToStepRef.current = null;
      clearTimeout(quiet);
      cancelAnimationFrame(tweenRaf);
      document.documentElement.style.scrollBehavior = '';
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouch);
    };
  }, []);

  return (
    <div
      className="hidden md:block"
      style={{ height: `${PROGRAM_STEPS.length * PROGRAM_STEP_VH + PROGRAM_END_BUFFER_VH}svh` }}
    >
      <div ref={startRef} />

      <div
        ref={stickyRef}
        className="sticky top-[64px] lg:top-[98px] h-[calc(100svh-64px)] lg:h-[calc(100svh-98px)] overflow-hidden"
      >
        {PROGRAM_STEPS.map((s, i) => (
          <div
            key={s.slug}
            ref={(el) => { panelRefs.current[i] = el; }}
            // pb clears the progress rail below, so a tall screenshot or a long
            // heading can't run into it on a short viewport.
            className="absolute inset-0 flex flex-row items-center gap-[60px] lg:gap-[80px] px-6 md:px-12 lg:px-[100px] pb-[76px]"
            // Seeded so the first paint matches where the rAF loop will put it
            // — without this every panel renders stacked at 0 for one frame.
            style={{ transform: `translate3d(${i * 100}%,0,0)`, willChange: 'transform, opacity' }}
          >
            {/* Left — label, heading, body */}
            <div className="w-[42%] lg:w-[38%] flex-shrink-0 flex flex-col justify-center gap-[18px]">
              <div className="flex flex-row items-center gap-[8px] text-[#C2552F]">
                <ProgramStepIcon
                  name={s.icon}
                  active={i === activeStep}
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

            {/* Right — this stage's screenshot, travelling with its copy */}
            <div className="flex flex-1 flex-col items-end justify-center h-full py-[16px]">
              <div className="flex flex-col items-end gap-[3px] pb-[25px] flex-shrink-0 text-right">
                <span className="text-[11px] font-medium text-white/25 tracking-[0.06em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {s.num} <span className="text-white/12">/ {String(PROGRAM_STEPS.length).padStart(2, '0')}</span>
                </span>
              </div>
              <div className="relative w-full" style={{ maxHeight: '100%', aspectRatio: '16 / 10' }}>
                <div
                  className="absolute inset-0 rounded-[24px] pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at 50% 110%, rgba(179,73,41,0.18) 0%, transparent 65%)' }}
                />
                <div
                  className="relative w-full h-full overflow-hidden rounded-[16px]"
                  style={{
                    background: '#0c0c0c',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 100px rgba(0,0,0,0.65), 0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  <div
                    className="absolute inset-0 bg-cover"
                    style={{
                      backgroundImage: `url(/${s.image})`,
                      backgroundPosition: s.imagePosition ?? 'top',
                      backgroundColor: 'rgba(255,255,255,0.025)',
                    }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-[12%] pointer-events-none" style={{ background: 'linear-gradient(to bottom, transparent, rgba(12,12,12,0.35))' }} />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Progress rail — the one element in here that doesn't travel. The
            panels slide past it, so it reads as a fixed measure of the whole
            section rather than a piece of any single stage.

            Sits outside the panel loop for that reason, and shares the panels'
            gutter so the rule lines up with the copy above it. */}
        <div className="absolute inset-x-0 bottom-[34px] px-6 md:px-12 lg:px-[100px] pointer-events-none">
          <div className="relative h-px w-full" style={{ background: 'rgba(255,255,255,0.10)' }}>
            {/* Stage boundaries, sitting on the rule rather than breaking it */}
            {PROGRAM_STEPS.slice(1).map((s, i) => (
              <span
                key={s.slug}
                className="absolute top-1/2 h-[7px] w-px -translate-y-1/2"
                style={{ left: `${((i + 1) / PROGRAM_STEPS.length) * 100}%`, background: 'rgba(255,255,255,0.16)' }}
              />
            ))}

            {/* Fill. Width is written by the rAF loop, not transitioned — it's
                already following scroll every frame, so a transition would only
                add lag between the rail and the panels it's measuring. */}
            <div
              ref={railFillRef}
              className="absolute inset-y-0 left-0"
              style={{ width: '16.667%', background: 'linear-gradient(90deg, rgba(179,73,41,0.35), #C2552F)' }}
            >
              <span
                className="absolute right-0 top-1/2 h-[4px] w-[4px] -translate-y-1/2 translate-x-1/2 rounded-full"
                style={{ background: '#C2552F', boxShadow: '0 0 6px rgba(194,85,47,0.55)' }}
              />
            </div>
          </div>

          {/* Stage names under their own segment — a map of the section, distinct
              from the eyebrow inside each panel, which is that stage's heading.
              Same type spec as that eyebrow (11px semibold uppercase, normal
              tracking) so it reads as the section's own voice; tracking these
              out instead is the generic micro-label look and matches nothing
              else on the page. */}
          <div className="relative mt-[6px] h-[26px]">
            {PROGRAM_STEPS.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => jumpToStepRef.current?.(i)}
                aria-label={`Go to ${s.label}`}
                aria-current={i === activeStep ? 'true' : undefined}
                // The rail wrapper is pointer-events-none so it can sit over the
                // panels without eating clicks; the labels opt themselves back in.
                // py gives a real target height without moving the baseline.
                className="pointer-events-auto absolute top-0 -translate-x-1/2 cursor-pointer whitespace-nowrap px-2 py-[5px] text-[11px] font-semibold uppercase tracking-normal"
                style={{
                  left: `${((i + 0.5) / PROGRAM_STEPS.length) * 100}%`,
                  color: i === activeStep ? 'rgba(194,85,47,0.95)' : 'rgba(255,255,255,0.22)',
                  transition: 'color 0.35s cubic-bezier(0.16,1,0.3,1)',
                }}
                onMouseEnter={(e) => {
                  if (i !== activeStep) e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = i === activeStep ? 'rgba(194,85,47,0.95)' : 'rgba(255,255,255,0.22)';
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// How far past the apply-cta section's top counts as "in" it, in viewports.
// The panel holds on black and only resolves the CTA partway through its
// scroll, so the active-label check measures from here rather than the
// section's literal top.
// Must land inside [0.525, 0.75]: the reveal completes at 0.525 and the
// sticky panel unpins at 0.75 — within that span the CTA sits flex-centered
// in the viewport; past it the whole stage rides up and off-center.
const APPLY_CTA_NAV_OFFSET_VH = 0.7;

// Pricing used to be a nav destination; the section it pointed at is now a
// plain Apply push (see "apply-cta" below), so it isn't a distinct place to
// navigate to anymore — dropped from both nav menus rather than pointing at
// a section with nothing pricing-shaped left in it.
const NAV_LINKS = [
  { id: 'coach', label: 'The Coach' },
  { id: 'program', label: 'Program' },
  { id: 'faq', label: 'FAQ' },
] as const;

// The comparison table is an especially useful orientation point on smaller
// screens, so mobile exposes it directly without adding another desktop item.
const MOBILE_NAV_LINKS = [
  { id: 'coach', label: 'The Coach' },
  { id: 'program', label: 'Program' },
  { id: 'difference', label: 'Difference' },
  { id: 'faq', label: 'FAQ' },
] as const;

const SECTION_LABELS: Record<string, string> = {
  coach: 'Meet the Coach',
  program: 'The Program',
  difference: 'Why TDT',
  'apply-cta': 'Apply now',
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
      aria-label="Photos of coach Jaiden Francis training athletes"
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

const LAUNCH_DATE = new Date('2026-09-07T00:00:00');

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
          Cohort 1 · Sept 7
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
  const [activeSection, setActiveSection] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [navHovered, setNavHovered] = useState(false);
  const applyBtnRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
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
  const [launched, setLaunched] = useState(false);

  const transitionZoneRef = useRef<HTMLDivElement>(null);
  const coachContentRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);

  // Honour prefers-reduced-motion in the explicit JS scrolls (the CSS
  // scroll-behavior rule only covers native anchor scrolling).
  const scrollBehavior = () =>
    (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') as ScrollBehavior;

  useEffect(() => {
    const SECTIONS = ['coach', 'program', 'difference', 'apply-cta', 'faq'];
    const onScroll = () => {
      setScrolled(prev => window.scrollY > (prev ? 40 : 80));
      if (transitionZoneRef.current) {
        const r = transitionZoneRef.current.getBoundingClientRect();
        // Progress across only the pinned span (container height minus the sticky screen),
        // so the black→white flip fully completes while the panel still covers the viewport.
        const pinnable = Math.max(1, r.height - window.innerHeight);
        setTp(Math.max(0, Math.min(1, -r.top / pinnable)));
      }
      const mid = window.innerHeight * 0.45;
      let active = '';
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        // The apply CTA opens on a screen of held black before the light flips
        // and the content resolves, so measuring from its top would light the
        // label while the panel still reads as the quote above it.
        const enterAt = id === 'apply-cta' ? window.innerHeight * APPLY_CTA_NAV_OFFSET_VH : 0;
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

  // The browser chrome and the overscroll gutter live outside React's tree, so
  // they don't follow the flip on their own — which left iOS holding a black
  // status bar over a cream page. Both track `tt` here.
  //
  // `tt` is a good proxy for the whole page, not just the panel: it pins to 0
  // above the transition zone (hero through quote are all #000000) and to 1
  // below it (FAQ and footer are both #FBF6F2), and those are exactly the two
  // endpoints it lerps between.
  //
  // Quantised because iOS animates every theme-color change: one write per
  // scroll frame leaves the chrome chasing the page. Sixteen steps still reads
  // as a gradient and bounds the writes across the flip.
  const CHROME_STEPS = 16;
  const ttStepped = Math.round(tt * CHROME_STEPS) / CHROME_STEPS;
  const chromeSurface = `rgb(${lerp(0,251,ttStepped)},${lerp(0,246,ttStepped)},${lerp(0,242,ttStepped)})`;

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', chromeSurface);
    document.documentElement.style.setProperty('--page-surface', chromeSurface);
  }, [chromeSurface]);

  // Hand the chrome back on the way out. /apply declares its own cream, but
  // an inline --page-surface left on <html> would outrank it.
  useEffect(() => () => {
    document.documentElement.style.removeProperty('--page-surface');
  }, []);

  const navBgStyle = { backgroundColor: `rgba(${lerp(0,251,tt)},${lerp(0,246,tt)},${lerp(0,242,tt)},${tt < 0.5 ? 0.96 : 0.92})` };
  const navBorderStyle = { borderColor: `rgba(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)},0.12)` };
  // At rest the pill has no background of its own, so nav type sits directly on
  // the hero photo. The carousel shots include white gym walls — measured ~0.78
  // luminance behind the pill — so the at-rest treatment runs near-opaque with a
  // tight double shadow that holds the glyph edges. Once the pill picks up its
  // blurred background (scrolled / compact) it drops back to the quieter values.
  const navRestShadow = '0 1px 2px rgba(0,0,0,0.85), 0 2px 14px rgba(0,0,0,0.55)';
  const navAtRest = !scrolled && !showCompact;
  const navTextStyle = {
    color: `rgba(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)},${navAtRest ? 0.95 : 0.6})`,
    textShadow: navAtRest ? navRestShadow : 'none',
  };
  const navLinkStyle = (id: string) => ({
    color: `rgba(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)},${activeSection === id ? 1 : navAtRest ? 0.9 : 0.4})`,
    transition: 'color 0.3s ease',
    fontWeight: activeSection === id ? '500' : '400',
    textShadow: navAtRest ? navRestShadow : 'none',
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

      {/* ── Preloads ──
          These live here, not in the root layout, because they are landing-page
          assets: in the layout they fired on /apply, /privacy and /terms
          too, none of which render a single <img>. React hoists
          these into <head> from here, so they still start during HTML parse —
          they're just scoped to the one route that actually uses them.

          Only the Program shots are listed. The hero needs nothing static: React
          emits slide 1's preload off the fetchPriority="high" <img> in
          HeroCarousel, and slide 2 is warmed by the carousel's own effect ~5s
          (HOLD_MS) before the first crossfade. Both of those carry the srcset,
          so phones get the -sm file; a plain href preload here could not. */}
      <link rel="preload" as="image" href="/diagnosis.webp" />
      <link rel="preload" as="image" href="/drill-true.webp" />

      {/* ── Film grain overlay ── */}
      <FilmGrain />
      {launched && <LaunchReveal onClose={() => setLaunched(false)} />}

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
          touchAction: 'none',
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
            maxHeight: 'min(68dvh, 620px)',
            minHeight: '360px',
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
            <span className="text-[9px] font-semibold uppercase tracking-[0.03em] text-[#1A0F0A]/50">
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
                  className="group relative grid min-h-[78px] grid-cols-[28px_1fr_28px] items-center border-b border-black/[0.11] text-[#1A0F0A] last:border-b-0 active:bg-black/[0.04]"
                  style={{
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
                      const el = document.getElementById(id);
                      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
                    };
                    setTimeout(() => jump(30), 16);
                  }}
                >
                  <span className="text-[10px] font-semibold tracking-normal text-[var(--brand-terra)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    0{i + 1}
                  </span>
                  <span className="text-center text-[clamp(30px,9vw,42px)] font-medium leading-none tracking-[-0.045em]">
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

      {/* ── Header ── */}
      <header className="fixed z-50 flex h-[64px] lg:h-[98px] w-full items-center justify-center pointer-events-none" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center border pointer-events-auto"
          // Pointer-type-gated: on touch, mouseenter fires on tap and never
          // reliably leaves, sticking the pill out of compact mode.
          //
          // Also skip the expand entirely when the cursor arrives from the
          // right, over/near the Apply button: expanding shoves Apply further
          // right just as the user is closing in on it, so a click meant for
          // Apply can land short. Approaching from the left (logo, nav links)
          // still expands as normal.
          onPointerEnter={(e) => {
            if (e.pointerType !== 'mouse') return;
            if (showCompact && applyBtnRef.current) {
              const btnLeft = applyBtnRef.current.getBoundingClientRect().left;
              if (e.clientX >= btnLeft - 24) return;
            }
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
                    const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: scrollBehavior() });
                  }}
                >
                  {label}
                </a>
              ))}
            </nav>
            {/* Section label — shown when in a section. All possible labels are
                mounted at once, stacked on the same centered anchor point, and
                cross-fade via opacity/blur/translateY as activeSection changes —
                the same "keep every state's node alive, transition between them"
                idiom the coach carousel uses, so the swap animates instead of
                snapping and there's no enter/exit unmount choreography to get
                right for a fixed, small set of labels. */}
            <span
              className="absolute left-1/2 whitespace-nowrap transition-all duration-500"
              style={{
                opacity: showCompact ? 1 : 0,
                transform: showCompact ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(5px)',
                color: isDark ? 'rgba(255,255,255,0.85)' : `rgba(${lerp(255,26,tt)},${lerp(255,15,tt)},${lerp(255,10,tt)},0.85)`,
                pointerEvents: 'none',
              }}
            >
              {Object.entries(SECTION_LABELS).map(([id, label]) => (
                <span
                  key={id}
                  className="absolute left-1/2 top-1/2 text-[14px] font-medium tracking-[-0.02em] whitespace-nowrap"
                  style={{
                    transform: `translate(-50%, -50%) translateY(${activeSection === id ? 0 : -6}px)`,
                    opacity: activeSection === id ? 1 : 0,
                    filter: activeSection === id ? 'blur(0px)' : 'blur(3px)',
                    transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1), filter 0.6s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  {label}
                </span>
              ))}
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
              <div ref={applyBtnRef}>
                <CTAButton href="/apply" className={`whitespace-nowrap transition-all duration-500 ${showCompact ? 'h-[32px] px-[16px] text-[13px]' : 'h-[37px] px-[20px] text-[14px]'}`}>
                  Apply
                </CTAButton>
              </div>
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
        <section className="relative w-full min-h-screen bg-black" style={{ minHeight: '100dvh' }}>
          {/* Background carousel */}
          <HeroCarousel slides={HERO_SLIDES} />
          {/* Bottom scrim. Heavier than it was under the old placeholder: the
              carousel shots are bright gym floors, and the headline's white→dark
              gradient fill needs something to sit on. Reaches true rgba(0,0,0,1)
              by 100% — not just "dark enough to read text on" — because the
              section directly below (Coach) is solid #000000; stopping short
              (the old curve topped out at 0.82) left a visible seam where
              photo-tinted-black met true black. The last stretch (92%→100%)
              carries most of that final ramp so it reads as the photo
              dissolving into the section below, not a visible gradient band.  */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.07) 40%, rgba(0,0,0,0.35) 68%, rgba(0,0,0,0.85) 92%, rgba(0,0,0,1) 100%)',
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
            {/* Sits higher in the frame than the headline, where the bottom
                scrim has only reached ~20% — too thin to carry white type on a
                bright floor by itself, so it brings its own shadow. */}
            <p
              className="mb-[9px] text-[10px] md:text-[11px] font-medium tracking-[0.01em] text-white/95"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 1px 14px rgba(0,0,0,0.35)' }}
            >
              Prep School Edition
            </p>
            <CountdownEyebrow />
            {/* Plain white here; the white→dark gradient fill is reapplied at
                md and up by .hero-headline in globals.css. It can't stay inline
                because it needs a media query to come off on phones. */}
            <h1 className="hero-headline text-white text-[32px] md:text-[40px] lg:text-[48px] font-bold leading-[1.2] lg:leading-[57px] tracking-[-0.02em] max-w-[1150px] mb-[11px]">
              You&apos;re better in practice
              <br />
              than in games
            </h1>
            <p className="text-[14px] md:text-[16px] font-normal leading-[19px] tracking-[-0.02em] text-white/60 max-w-[507px] mb-[20px]">
              <em className="italic">100 days</em> of Coach Jaiden Francis breaking down your game and building personalised drills around what you need to improve.
            </p>
            <div className="flex items-center gap-[16px]">
              <CTAButton href="/apply" className="h-[37px] px-[20px] text-[14px]">
                Claim your spot
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
                  See the program
                </span>
                <span className="inline-block ml-[6px] transition-transform duration-300 ease-out group-hover:translate-x-[4px]">→</span>
              </a>
            </div>
          </div>

        </section>

        {/* ── Coach ── */}
        <section id="coach" className="relative flex w-full flex-col items-center gap-[40px] px-6 md:px-12 lg:px-[100px] py-[150px] bg-[#000000]">
          <div className="flex w-full max-w-[1156px] flex-col lg:flex-row items-center lg:items-start gap-[50px] lg:gap-[100px]">
            <div ref={coachContentRef} className="flex w-full lg:w-[491px] flex-col justify-center gap-[30px]">
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
                      I've trained a lot of athletes who looked incredible in practice. Guys who walked into the gym like nobody could touch them. Then the game starts, and I'm watching a completely different player.
                    </p>
                    <p className="text-[18px] font-bold tracking-[-0.02em] text-white" style={{ lineHeight: '26px', ...revealLine(150) }}>
                      For a long time I called it nerves. It wasn't nerves. And handing them another drill was never going to tell me what it was — the right drill only exists once you know what's stopping the work from showing up.
                    </p>
                    <p className="text-[18px] font-normal tracking-[-0.02em] text-[rgba(255,255,255,0.6)]" style={{ lineHeight: '26px', ...revealLine(300) }}>
                      So I studied it. Film, one possession at a time, for years. What I found is in every game you've ever played, and almost nobody is coaching it.
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
                        Practice teaches you what to do. Nobody teaches you when. And when you don't know when, you start second-guessing. You hesitate. You play safe. People call that confidence. We work on that too, but not by hyping you up. Confidence is what shows up after you know what you're looking at.
                      </p>
                      <p className="text-[18px] font-bold tracking-[-0.02em] text-white" style={{ lineHeight: '26px', ...revealLine(300) }}>
                        That's my duty to every athlete who comes on. Getting out the talent we both know is lying dormant in there.
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

        {/* ── Program ── */}
        <section id="program" className="relative w-full bg-[#000000]">
          <ProgramIconStyles />
          {/* Mobile: no pinning — see ProgramMobile for why. */}
          <ProgramMobile />
          {/* md and up: full-bleed panels that slide across as you scroll. */}
          <ProgramDesktop />
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
                  Everywhere else teaches the first half.
                  <br />
                  You've had that half your whole life. This is the other one.
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
                    <div className="p-[10px]" />
                    <div className="flex items-center gap-[6px] p-[10px]" style={{ background: '#B34929' }}>
                      <TDTLogo letterColor="white" width={13} height={15} />
                      <span className="text-[11px] font-medium leading-[13px] tracking-[-0.01em] text-white">
                        Think Different Training
                      </span>
                    </div>
                    <div className="flex items-center p-[10px]">
                      <span className="text-[11px] font-medium leading-[13px] tracking-[-0.01em] text-white/50">
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
                      <div className="flex items-center p-[10px]">
                        <span className="text-[12px] font-medium leading-[15px] tracking-[-0.01em] text-white/75">
                          {row.topic}
                        </span>
                      </div>
                      <div className="flex items-center p-[10px]" style={{ background: '#B34929' }}>
                        <span className="text-[12px] font-normal leading-[15px] tracking-[-0.01em] text-white">
                          {row.tdt}
                        </span>
                      </div>
                      <div className="flex items-center p-[10px]">
                        <span className="text-[12px] font-normal leading-[15px] tracking-[-0.01em] text-white/50">
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
              </div>
            </section>
          );
        })()}

        {/* ── Quote ── */}
        <section className="relative flex w-full flex-col items-center px-6 md:px-12 lg:px-[100px] py-[100px] md:py-[130px] bg-[#000000]">
          <blockquote className="w-full max-w-[900px] text-center">
            <p className="text-[22px] md:text-[32px] font-medium italic leading-[1.4] tracking-[-0.02em] text-white/90">
              &ldquo;I went from watching what happened to what could have and should have happened.&rdquo;
            </p>
            <footer className="mt-[24px] text-[13px] md:text-[14px] font-medium tracking-[0.04em] uppercase text-[rgba(179,73,41,0.85)]">
              — Kobe Bryant
            </footer>
          </blockquote>
        </section>

        {/* ── Apply CTA — the lights come up on a direct push to apply ──
            Was a price reveal; archived (see git history) in favor of
            maximizing applications over sorting by ticket price. The
            scroll-linked dark→light stage stays — it's what flips the
            header and the sections below into light mode, not just a
            frame for the old price card. */}
        <section id="apply-cta" ref={transitionZoneRef} className="relative w-full" style={{ height: '175vh' }}>
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
              className="relative z-10 flex w-full max-w-[1156px] mx-auto flex-col lg:flex-row items-center gap-[28px] lg:gap-[70px]"
              style={{
                opacity: revealEased,
                transform: `translateY(${lerp(28, 0, revealEased)}px) scale(${(0.94 + 0.06 * revealEased).toFixed(4)})`,
              }}
            >
              {/* Mobile-only heading, sitting directly above the card rather
                  than overlaid on it — the Spline scene already bakes in its
                  own "Think Different Training" / "100 Days" text at the top
                  and center, so anything layered on top of the card itself
                  collides with that. The desktop heading (in the right
                  column) is hidden here to avoid showing it twice. */}
              <h2
                className="lg:hidden text-[36px] font-bold leading-tight tracking-[-0.02em] text-center"
                style={{
                  background: 'linear-gradient(105deg, #3D2418, #B34929, #E8A87C, #B34929, #3D2418)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'tdt-gradient-pan 5s linear infinite',
                }}
              >
                Application
              </h2>

              {/* Left — card by itself. Copy on the card ("$1000" etc.) lives
                  in the Spline scene, not here — edit it at spline.design. */}
              {/* On mobile the holder hugs the Spline canvas — the canvas sizes
                  itself to the scene's aspect (~2:1), so a fixed 400px min-height
                  here left ~230px of dead space under the card. Desktop keeps
                  flex-1 + the 400px floor, where it's the column height. */}
              <div className="relative w-full flex-none min-h-0 lg:flex-1 lg:min-h-[400px]" style={{ borderRadius: '24px', overflow: 'visible', perspective: '1200px' }}>
                <Spline
                  scene="https://prod.spline.design/EDGt2tyGvNwlGnGh/scene.splinecode"
                  style={{ width: '100%', height: '100%', display: 'block', borderRadius: '24px', overflow: 'visible' }}
                />
              </div>

              {/* Right — heading (desktop only), subtext, CTA */}
              <div className="flex w-full lg:w-[420px] flex-shrink-0 flex-col items-center lg:items-start gap-[16px] text-center lg:text-left">
                <div className="flex flex-col gap-[6px] items-center lg:items-start">
                  <h2
                    className="hidden lg:block text-[36px] md:text-[48px] font-bold leading-tight tracking-[-0.02em]"
                    style={{
                      background: 'linear-gradient(105deg, #3D2418, #B34929, #E8A87C, #B34929, #3D2418)',
                      backgroundSize: '200% auto',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'tdt-gradient-pan 5s linear infinite',
                    }}
                  >
                    Application
                  </h2>

                  <p className="text-[16px] font-normal leading-[22px] tracking-[-0.02em] text-black/60">
                    10 spots. One cohort. Apply and find out if you&apos;re one of them.
                  </p>
                </div>

                <CTAButton href="/apply" className="h-[42px] px-8 text-[16px]">
                  Apply now
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
                  question: "What does film review actually do?",
                  answer: "Decisions only happen in games, so film is the only place to coach them. Jaiden finds the possessions where you had the answer and didn't see it, and every drill you get is built off those moments.",
                },
                {
                  question: "Why am I better in practice than in games?",
                  answer: "Practice tells you what's coming. You know the set, you know the call, and if you blow it you get another rep in thirty seconds. A game gives you one look, half a second, and no answer key. The move was never the problem. The moment was.",
                },
                {
                  question: "Isn't this just confidence?",
                  answer: "That's the first thing everyone says, and it's why it never gets fixed. Confidence comes after you know what you're looking at. Right now he's deciding from scratch every possession. That's not nerves, that's a gap in what he was taught.",
                },
                {
                  question: "Why can't I just watch my own film back?",
                  answer: "You can't see the read you don't know exists. That's what makes this hard to fix alone. The gap sits exactly where you can't look. You'll watch the possession and see a shot that didn't fall. Jaiden sees the pass that was open two seconds earlier.",
                },
                {
                  question: "How does this fit with my school team and my trainer?",
                  answer: "Your coach is coaching a team, live, with a season to win. He'll tell you what to do in the moment. Nobody has time to sit down with your film afterward and go through when and why. That was never the job.\n\nNothing here asks you to change what he runs or stop working with your trainer. They're teaching what to do. We're teaching when. It sits on top of the work you're already doing.",
                },
                {
                  question: "What if I don't have film yet?",
                  answer: "Most players have more than they think. Team footage, league footage, a parent filming from the stands. Any of it works. It doesn't need to be edited or good quality. It just needs to be a real game.",
                },
                {
                  question: "Is my son ready for this?",
                  answer: "This is for players who already put the work in and can't understand why it isn't showing up on Friday. If he's still learning to handle the ball, this isn't the right hundred days. If he's good in practice and quiet in games, this was built for him.",
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
