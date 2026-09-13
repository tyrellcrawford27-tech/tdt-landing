'use client';

import Image from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { CTAButton } from '@/components/CTAButton';
import { TrainingChat, TrainingChatProvider } from './TrainingChat';
import { COMMUNITY_STORY_MESSAGES } from '@/lib/trainingJourney';
import { activeTopicForLine, progressionLineProgress } from '@/lib/howItWorksProgress';
import styles from './HowItWorks.module.css';

const STEPS = [
  { title: 'Share your film', body: 'Upload footage from a real game so Jaiden can spot your decisions, habits, and execution gaps, not just your highlights.' },
  { title: 'See what Jaiden sees', body: 'Get your film broken down with direct feedback and on video notes, so your next game isn’t the same old mistakes.' },
  { title: 'Take it to the court', body: 'Work through personalized modules on your time, turning what your film revealed into habits that hold up on the court.' },
  { title: 'Learn from peers around the world', body: 'Share what you’re working on, ask questions and learn alongside players chasing their own next level.' },
];
const MOBILE_STEP_TITLES = ['Film', 'Review', 'Training', 'Community'];

function markerFractions(line: HTMLSpanElement | null, tabs: (HTMLButtonElement | null)[]) {
  if (!line) return { lastCenter: .85, starts: [0, .28, .56, .84] };
  // CSS width retains subpixel precision and is not shortened by scaleX.
  const width = parseFloat(getComputedStyle(line).width);
  if (!width) return { lastCenter: .85, starts: [0, .28, .56, .84] };
  const left = line.getBoundingClientRect().left;
  const circles = tabs.map(tab => tab?.firstElementChild?.getBoundingClientRect());
  const last = circles.at(-1);
  return {
    lastCenter: last ? Math.max(0, Math.min(1, (last.left + last.width / 2 - left) / width)) : .85,
    starts: circles.map((circle, index) => circle ? (circle.left - left) / width : index * .28),
  };
}

type CommunityProfile = { initials: string; name: string; message: string; position: string; school: string; goal: string; age: string; from: string; height: string; flagSrc: string; country: string };

function CommunityAvatar({ person }: { person: CommunityProfile }) {
  return <span className={styles.initials} aria-hidden="true" data-community-avatar={person.initials}>
    {(person.initials === 'AN' || person.initials === 'TC' || person.initials === 'EJ')
      ? <Image src={
          person.initials === 'AN'
            ? '/how-it-works/avatar-andre.webp'
            : person.initials === 'TC'
              ? '/how-it-works/avatar-training.webp'
              : '/ibra-pfp.jpeg'
        } alt="" width={104} height={104} unoptimized className={styles.communityAvatarImage} />
      : person.initials}
  </span>;
}

const PROFILES: CommunityProfile[] = [
  { initials: 'AN', name: 'Andre Narciso', message: 'What’s up guys just want to know how to get better', position: 'Point Guard', school: 'Holy Trinity', goal: 'D1/Pro basketball', age: '14 years', from: 'Fort McMurray, Alberta', height: '5′9″ tall', flagSrc: '/flags/canada.svg', country: 'Canada' },
  { initials: 'TL', name: 'Tyler-perry London', message: 'Focused on shooting, handles and a stronger left hand', position: 'Point Guard', school: 'KBA', goal: 'Semi-pro / overseas', age: '19 years', from: 'Toronto, Ontario', height: '6′0″ tall', flagSrc: '/flags/canada.svg', country: 'Canada' },
  // Illustrative details, not claims about these members' real backgrounds.
  { initials: 'EJ', name: 'Ibra', message: 'Building confidence to attack and finish through contact', position: 'Shooting Guard', school: 'London sixth form', goal: 'College basketball', age: '16 years', from: 'London, England', height: '5′8″ tall', flagSrc: '/flags/england.svg', country: 'England' },
  { initials: 'TC', name: 'Tyrell Crawford', message: 'Working on better reads and a more consistent jump shot', position: 'Small Forward', school: 'Secondary school', goal: 'Professional basketball', age: '18 years', from: 'United States', height: '6′3″ tall', flagSrc: '/flags/usa.svg', country: 'United States' },
];

// Keep existing profile information and overlay behaviour; the example thread
// begins with the same athlete whose journey the three chats follow.
const STORY_PROFILES = [...PROFILES].sort((a, b) => Number(b.initials === 'EJ') - Number(a.initials === 'EJ'));

function Community() {
  const [open, setOpen] = useState<number | null>(null);
  const dismissedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);
  useLayoutEffect(() => {
    if (open === null) return;
    const container = containerRef.current;
    const overlay = profileRef.current;
    const card = cardsRef.current[open];
    if (!container || !overlay || !card) return;
    const place = () => {
      const parent = container.getBoundingClientRect();
      const area = container.parentElement!.getBoundingClientRect();
      const anchor = card.getBoundingClientRect();
      const width = overlay.offsetWidth;
      const height = overlay.offsetHeight;
      const above = open >= 2;
      const mobile = matchMedia('(max-width: 767px)').matches;
      const headerBottom = mobile ? (document.querySelector('header')?.getBoundingClientRect().bottom ?? 64) + 8 : 8;
      const navigationBottom = container.closest('section')?.querySelector('[role="tablist"]')?.getBoundingClientRect().bottom ?? headerBottom;
      // Keep profiles below both bars when there is room. In landscape the
      // profile can cover the topic bar, but never the site's fixed header.
      const safeTop = mobile && window.innerHeight - navigationBottom - 16 >= height ? Math.max(headerBottom, navigationBottom + 8) : headerBottom;
      // On a short screen the panel may only be partly in view. Let the
      // overlay extend beyond its panel before allowing viewport clipping.
      const minTop = Math.max(safeTop, Math.min(area.top + 6, window.innerHeight - 8 - height));
      const maxTop = Math.max(minTop, Math.min(area.bottom - 6, window.innerHeight - 8) - height);
      const desiredTop = above ? anchor.bottom - anchor.height * .38 - height : anchor.top + anchor.height * .38;
      const top = Math.max(minTop, Math.min(desiredTop, maxTop));
      const minLeft = Math.max(area.left + 6, 8);
      const maxLeft = Math.max(minLeft, Math.min(area.right - 6, window.innerWidth - 8) - width);
      const left = Math.max(minLeft, Math.min(anchor.left + 44, maxLeft));
      overlay.style.top = `${top - parent.top}px`;
      overlay.style.left = `${left - parent.left}px`;
      overlay.style.transformOrigin = `${Math.max(0, Math.min(width, anchor.left + 34 - left))}px ${Math.max(0, Math.min(height, anchor.top + anchor.height / 2 - top))}px`;
      overlay.style.setProperty('--profile-arrival-y', above ? '10px' : '-10px');
    };
    // Measure the selected card, not a fixed spot in the whole stack. The lower
    // cards open upwards so the full profile stays inside the product panel.
    place();
    const observer = new ResizeObserver(place);
    observer.observe(container);
    observer.observe(overlay);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place); };
  }, [open]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { dismissedRef.current = true; setOpen(null); } };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, []);
  const profile = open === null ? null : STORY_PROFILES[open];
  return <div className={styles.community} ref={containerRef} onPointerLeave={event => { if (event.pointerType === 'mouse') { dismissedRef.current = false; setOpen(null); } }} onKeyDown={event => { if (event.key === 'Escape') { dismissedRef.current = true; setOpen(null); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null); }}>
    <div className={styles.people} aria-label="Community profile previews">
      {STORY_PROFILES.map((person, index) => <button key={person.initials} ref={element => { cardsRef.current[index] = element; }} type="button" className={styles.person} onPointerEnter={event => { if (event.pointerType === 'mouse' && !dismissedRef.current) setOpen(index); }} onFocus={() => { if (!dismissedRef.current) setOpen(index); }} onClick={() => { dismissedRef.current = false; setOpen(index); }} aria-expanded={open === index} aria-controls="community-profile" aria-label={`View ${person.name}’s profile`}>
        <CommunityAvatar person={person} />
        <span className={styles.personText}><strong>{person.name}</strong><span>{COMMUNITY_STORY_MESSAGES[person.initials as keyof typeof COMMUNITY_STORY_MESSAGES] || person.message}</span></span>
      </button>)}
    </div>
    <div id="community-profile" ref={profileRef} className={styles.profile} style={{ backdropFilter: 'blur(22px) saturate(1.15)', WebkitBackdropFilter: 'blur(22px) saturate(1.15)' }} data-open={!!profile} aria-hidden={!profile} role="region" aria-label={profile ? `${profile.name}’s profile preview` : 'Profile preview'}>
      {profile && <>
        <button type="button" className={styles.profileClose} aria-label="Close profile preview" onClick={() => { dismissedRef.current = true; setOpen(null); if (open !== null) cardsRef.current[open]?.focus({ preventScroll: true }); }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
        <div className={styles.profileTop}><CommunityAvatar person={profile} /><div><span className={styles.athleteLabel}>Athlete</span><strong>{profile.name}</strong></div></div>
        <span className={styles.position}>{profile.position}</span>
        <dl className={styles.profileDetails}>
          <div className={styles.school}><dt><svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m2 8 10-5 10 5-10 5L2 8Zm4 3v6l6 3 6-3v-6M22 8v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>School</dt><dd>{profile.school}</dd></div>
          <div><dt>Goal</dt><dd>{profile.goal}</dd></div><div><dt>Age</dt><dd>{profile.age}</dd></div>
          <div><dt>From</dt><dd className={styles.fromValue}>{profile.from}<Image src={profile.flagSrc} alt={`${profile.country} flag`} width={80} height={52} className={styles.profileFlag} /></dd></div><div><dt>Height</dt><dd>{profile.height}</dd></div>
        </dl>
      </>}
    </div>
  </div>;
}

function UploadPreview() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('2025 Preseason game away');
  const [selected, setSelected] = useState(false);
  const [feedback, setFeedback] = useState('');
  return <div className={styles.upload}>
    <div className={styles.uploadIcon}><svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 17H6a4 4 0 0 1-.4-7.98A6 6 0 0 1 17.4 7.5 4.8 4.8 0 0 1 18 17h-2M12 21V11m-3 3 3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
    <div className={styles.uploadText}><strong>{selected ? 'Game selected' : 'Game uploaded'}</strong><span>{fileName}</span></div>
    <CTAButton onClick={() => inputRef.current?.click()} className={styles.selectFile}>Select file</CTAButton>
    <input className={styles.srOnly} ref={inputRef} type="file" accept="video/*" tabIndex={-1} aria-label="Select a game video for this local preview" onChange={event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('video/')) { setFeedback('Choose a video file for this preview.'); return; }
      setSelected(true); setFileName(file.name); setFeedback('Preview only. Your video stays on your device.');
    }} />
    {feedback && <p className={styles.uploadFeedback} role="status">{feedback}</p>}
  </div>;
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    if (matchMedia('(max-width: 767px)').matches && panelRef.current) panelRef.current.scrollTop = 0;
  }, [active]);

  useEffect(() => {
    const section = trackRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let target = 0;
    let displayed = 0;
    let lastTime = 0;
    let markerStarts = [0, .28, .56, .84];
    const activate = (samePaint: boolean) => {
      const next = activeTopicForLine(displayed, markerStarts);
      if (activeRef.current === next) return;
      activeRef.current = next;
      // Commit only at a circle crossing, before painting this line frame.
      // The ordinary update path avoids flushing from an effect/observer.
      if (samePaint) flushSync(() => setActive(next));
      else setActive(next);
    };
    const draw = (now: number) => {
      const dt = Math.min(64, now - (lastTime || now - 16));
      lastTime = now;
      displayed += (target - displayed) * (1 - Math.exp(-dt / 75));
      if (Math.abs(target - displayed) < .0001) displayed = target;
      lineRef.current?.style.setProperty('--line-progress', String(displayed));
      activate(true);
      if (displayed !== target) raf = requestAnimationFrame(draw);
      else { raf = 0; lastTime = 0; }
    };
    const measure = () => {
      if (getComputedStyle(pin).position !== 'sticky') {
        cancelAnimationFrame(raf); raf = 0; lastTime = 0;
        return;
      }
      const top = parseFloat(getComputedStyle(pin).top) || 0;
      const panel = panelRef.current;
      if (matchMedia('(max-width: 767px)').matches && panel) {
        // Reserve the actual height of the controls and description. Mobile
        // shows only the product preview, contained at its original ratio.
        const beforePanel = panel.getBoundingClientRect().top - pin.getBoundingClientRect().top;
        const paddingBottom = parseFloat(getComputedStyle(pin).paddingBottom) || 0;
        const available = Math.max(64, Math.floor(pin.clientHeight - beforePanel - paddingBottom));
        pin.style.setProperty('--mobile-panel-height', `${available}px`);
      }
      const distance = section.offsetHeight - pin.offsetHeight;
      const progress = Math.max(0, Math.min(1, (top - section.getBoundingClientRect().top) / Math.max(1, distance)));
      const geometry = markerFractions(lineRef.current, tabsRef.current);
      markerStarts = geometry.starts;
      target = progressionLineProgress(progress, geometry.lastCenter);
      if (reduced.matches) { displayed = target; lineRef.current?.style.setProperty('--line-progress', String(target)); activate(false); }
      else if (!raf) raf = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(pin);
    if (panelRef.current?.previousElementSibling) observer.observe(panelRef.current.previousElementSibling);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    reduced.addEventListener('change', measure);
    measure();
    return () => { cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); reduced.removeEventListener('change', measure); };
  }, []);

  const choose = (index: number) => {
    const pin = pinRef.current;
    const section = trackRef.current;
    if (!pin || !section) return;
    if (getComputedStyle(pin).position !== 'sticky') {
      activeRef.current = index; setActive(index);
      lineRef.current?.style.setProperty('--line-progress', String(progressionLineProgress(index / 4, markerFractions(lineRef.current, tabsRef.current).lastCenter)));
      // Keep the beginning of the scene reachable when choosing the next
      // topic from beneath a tall mobile panel. Scrolling stays native.
      if (matchMedia('(max-width: 767px)').matches) {
        const tabs = tabsRef.current[index]?.parentElement;
        if (tabs) {
          const top = parseFloat(getComputedStyle(tabs).top) || 64;
          window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - top,
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
        }
      }
      return;
    }
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const distance = section.offsetHeight - pin.offsetHeight;
    window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top - top + distance * index / 4 + 1,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const tabKey = (event: KeyboardEvent, index: number) => {
    const next = event.key === 'ArrowRight' ? (index + 1) % 4 : event.key === 'ArrowLeft' ? (index + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : null;
    if (next === null) return;
    event.preventDefault(); choose(next); tabsRef.current[next]?.focus({ preventScroll: true });
  };

  const panelContents = (stage: number) => <>
    <div className={styles.product}>
      <div className={styles.productLayer} data-active={stage === 0} aria-hidden={stage !== 0} inert={stage !== 0}><UploadPreview /></div>
      <div className={styles.productLayer} data-active={stage === 1} aria-hidden={stage !== 1}><ProductImage kind="final-meet" alt="Annotated game film and a coaching call inside the Think Different Training app" /></div>
      <div className={styles.productLayer} data-active={stage === 2} aria-hidden={stage !== 2}><ProductImage kind="final-per" alt="Personalised drill demonstration and training modules in the Think Different Training app" /></div>
      <div className={styles.productLayer} data-active={stage === 3} aria-hidden={stage !== 3}><ProductImage kind="community" alt="Talk your game: the Think Different Training community, weekly challenge and player leaderboard" /></div>
    </div>
    <div className={styles.interaction}>
      <div className={styles.chatLayer} data-active={stage < 3} aria-hidden={stage === 3} inert={stage === 3}><TrainingChat stage={stage} visible={stage < 3} /></div>
      <div className={styles.communityPanel} data-active={stage === 3} aria-hidden={stage !== 3} inert={stage !== 3}><Community /></div>
    </div>
  </>;

  return <TrainingChatProvider><section ref={sectionRef} id="how-it-works" className={styles.section} aria-labelledby="how-heading">
    <span id="program" className={styles.anchor} aria-hidden="true" />
    <div className={`${styles.frame} ${styles.headingFrame}`}><div className={styles.intro}><p>How it works</p><h2 id="how-heading">Online coaching.<br />Real work translated onto the court</h2></div></div>
    <div className={styles.track} ref={trackRef} data-how-track>
    <div className={styles.pin} ref={pinRef}>
      <div className={styles.frame}>
        <div className={styles.steps} role="tablist" aria-label="How the 100 day program works">
          <span className={styles.line} aria-hidden="true"><span ref={lineRef} className={styles.lineFill} style={{ '--line-progress': 0 } as CSSProperties} /></span>
          {STEPS.map((step, index) => <button key={step.title} type="button" ref={element => { tabsRef.current[index] = element; }} role="tab" aria-label={`${index + 1}. ${step.title}`} aria-selected={active === index} aria-controls="how-step-panel" id={`how-tab-${index}`} tabIndex={active === index ? 0 : -1} className={styles.step} data-active={active === index} onClick={() => choose(index)} onKeyDown={event => tabKey(event, index)}>
            <span className={styles.stepDot}>{index + 1}</span><span className={styles.stepMobileTitle} aria-hidden="true">{MOBILE_STEP_TITLES[index]}</span><span className={styles.stepTitle}>{step.title}</span><span className={styles.stepBody}>{step.body}</span>
          </button>)}
        </div>
        <div className={styles.mobileStepSummary} aria-live="polite" aria-atomic="true"><h3>{STEPS[active].title}</h3><p>{STEPS[active].body}</p></div>
        <div ref={panelRef} className={styles.panel} id="how-step-panel" role="tabpanel" tabIndex={0} aria-labelledby={`how-tab-${active}`} data-stage={active + 1}>{panelContents(active)}</div>
        <div className={styles.mobilePagination} aria-label="Explore the program steps">
          <button type="button" onClick={() => choose(active - 1)} disabled={active === 0} aria-label="Previous program step">← Previous</button>
          <span>{active + 1} / {STEPS.length}</span>
          <button type="button" onClick={() => choose(active + 1)} disabled={active === STEPS.length - 1} aria-label="Next program step">Next →</button>
        </div>
      </div>
    </div>
    </div>
  </section></TrainingChatProvider>;
}

function ProductImage({ kind, alt }: { kind: string; alt: string }) {
  const [direct, setDirect] = useState(false);
  return <Image src={`/how-it-works/${kind}.webp`} alt={alt} width={1500} height={1385}
    sizes="(max-width: 767px) 90vw, 600px" unoptimized={direct} onError={() => setDirect(true)} />;
}
