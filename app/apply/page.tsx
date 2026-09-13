'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { CTAButton } from '@/components/CTAButton';
import { EarlyBirdIcon } from '@/components/EarlyBirdIcon';
import { LocationInput } from '@/components/LocationInput';
import { SchoolInput } from '@/components/SchoolInput';
import { preloadCities } from '@/lib/cities';
import { preloadSchools } from '@/lib/schoolsIndex';
import { loadGeoHint } from '@/lib/geo';
import { SURFACE_LIGHT } from '@/lib/theme';
import {
  APPLICATION_FORM_VERSION,
  applicationExperienceVersion,
} from '@/lib/applicationProgress';
import {
  EMPTY_APPLICATION as EMPTY, APPLICATION_SCREENS, applicationAnswers as progressAnswers,
  normalizeApplicationDraft, firstIncompleteApplicationScreen, screenIsVisible, visibleSubFields,
  applicationScreenError, applicationSubmissionError, isMinor, needsSupporter,
  type ApplicationFormData as FormData, type ApplicationScreen as Q, type ApplicationField,
} from '@/lib/applicationForm';
import styles from './application.module.css';
import { applicationTimeEstimate, formatApplicationTime } from '@/lib/applicationTime';
import { createProgressQueue } from '@/lib/progressQueue';
import Cal, { getCalApi } from '@calcom/embed-react';

const LegacyApplication = dynamic(() => import('./LegacyApplication'));

// ── Design tokens (from Figma) ────────────────────────────────────────────────
const BG    = SURFACE_LIGHT;
const TERRA = '#B34929';
const CARD  = '#FFFFFF';

// ── Phone formatting ──────────────────────────────────────────────────────────
// Types out as 416-605-2033. A separator is only ever added once there's a digit
// to its right, so backspace always deletes a digit instead of a dash the
// formatter would immediately put back.
function formatPhone(raw: string): string {
  // Anything explicitly international is the user's business, not ours.
  if (raw.trimStart().startsWith('+')) return raw;

  let d = raw.replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('1')) d = d.slice(1);   // leading country code
  d = d.slice(0, 10);

  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

function generateDraftKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const randomPart = Math.random().toString(16).slice(2);
  const timePart = Date.now().toString(16);
  return `${timePart}-${randomPart}-${Math.floor(Math.random() * 1_000_000).toString(16)}`;
}

// ── Shared text style (PP Neue Montreal is the root font) ─────────────────────
const text = (size: number, weight: number, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: 'inherit',
  fontSize: size,
  fontWeight: weight,
  letterSpacing: '-0.02em',
  lineHeight: '18px',
  color,
  margin: 0,
  ...extra,
});

// ── Cycling headline ──────────────────────────────────────────────────────────
const CYCLING_WORDS = [
  'D1', 'U SPORTS', 'The League', 'A Scholarship', 'The Pros',
  'The Draft', 'A Roster Spot', 'The National Team', 'A Full Ride', 'The Next Level',
];
const CHAR_STAGGER = 26;  // ms between each letter
const ENTER_DUR    = 370; // ms per letter animation
const EXIT_DUR     = 260; // ms per letter animation
const HOLD_MS      = 1700;

function CyclingHeadline({ style }: { style?: React.CSSProperties }) {
  const [idx, setIdx]     = useState(0);
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering');

  const word         = CYCLING_WORDS[idx];
  const nonSpaceLen  = word.replace(/ /g, '').length;
  const enterTotal   = ENTER_DUR + nonSpaceLen * CHAR_STAGGER;
  const exitTotal    = EXIT_DUR  + nonSpaceLen * CHAR_STAGGER;

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if      (phase === 'entering') t = setTimeout(() => setPhase('visible'), enterTotal);
    else if (phase === 'visible')  t = setTimeout(() => setPhase('exiting'), HOLD_MS);
    else                           t = setTimeout(() => { setIdx(i => (i + 1) % CYCLING_WORDS.length); setPhase('entering'); }, exitTotal);
    return () => clearTimeout(t);
  }, [phase, enterTotal, exitTotal]);

  return (
    <h1 style={{ ...style, display: 'block', whiteSpace: 'nowrap' }}>
      {word.split('').map((char, i) => {
        if (char === ' ') return <span key={`${idx}-${i}`} style={{ display: 'inline-block' }}>&nbsp;</span>;
        const ni    = word.slice(0, i).replace(/ /g, '').length;
        const delay = `${ni * CHAR_STAGGER}ms`;

        if (phase === 'visible') {
          return (
            <span key={`${idx}-${i}`} style={{ display: 'inline-block', opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }}>
              {char}
            </span>
          );
        }

        const isOut    = phase === 'exiting';
        const animName = isOut ? 'tdt-char-out' : 'tdt-char-in';
        const dur      = isOut ? EXIT_DUR : ENTER_DUR;
        const easing   = isOut ? 'ease-in' : 'cubic-bezier(0.16, 1, 0.3, 1)';

        return (
          <span
            key={`${idx}-${i}`}
            style={{
              display: 'inline-block',
              animation: `${animName} ${dur}ms ${easing} ${delay} both`,
            }}
          >
            {char}
          </span>
        );
      })}
    </h1>
  );
}


// ── Go back button (secondary) ────────────────────────────────────────────────
function GoBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        height: 42,
        borderRadius: 32,
        border: '1px solid rgba(0,0,0,0.12)',
        background: CARD,
        color: 'rgba(0,0,0,0.4)',
        fontSize: 18,
        fontWeight: 400,
        letterSpacing: '-0.02em',
        fontFamily: 'inherit',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      Go back
    </button>
  );
}

const STORAGE_KEY = 'tdt-apply-draft';
const DRAFT_KEY_STORAGE = 'tdt-apply-draft-key';
// Versioned drafts retain their answers when the question order changes.
const DRAFT_VERSION = APPLICATION_FORM_VERSION;
// Set once the application form itself is finished, cleared once the call is
// confirmed booked (by the server, never by the client). Its presence on
// mount is what lets someone who closes the tab after finishing the form —
// but before booking — come straight back to the booking step instead of
// redoing the whole application.
const SUBMITTED_KEY = 'tdt-apply-submitted';
// Both stored entries expire. Without this they lived in localStorage forever,
// so a draft — or worse, a finished-but-unbooked application — kept resuming
// months later, long after the visitor had any memory of starting it.
const DRAFT_TTL_MS     = 7  * 24 * 60 * 60 * 1000; // in-progress answers
const SUBMITTED_TTL_MS = 14 * 24 * 60 * 60 * 1000; // form done, call not booked

function dropKey(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

// Read a stored entry only if it's still within its TTL, deleting it otherwise.
// An entry with no savedAt was written before stamping existed, so its real age
// is unknown — treated as expired rather than as immortal.
function readFresh(key: string, ttlMs: number): Record<string, unknown> | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { return null; }
  if (!raw) return null;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw); } catch { dropKey(key); return null; }
  const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0;
  if (!savedAt || Date.now() - savedAt > ttlMs) { dropKey(key); return null; }
  return parsed;
}

// The original form got progressively less patient when Continue was pressed
// repeatedly without a usable answer. Keep that voice separate from the actual
// validation rules so the rules can stay precise while the feedback has some life.
const EMPTY_NUDGES: Partial<Record<ApplicationField, string[]>> = {
  full_name: ['Name pls', 'First and last name', 'FULL NAME. GO.'],
  goal: ['Pick where you want this to go', 'Choose the goal that fits best', 'PICK A GOAL. DREAM BIG.'],
  goal_detail: ['What goal do you have in mind?', 'A few words is enough', 'TELL US THE GOAL.'],
  age: ['How old are you?', 'Age. Just a number.', 'YOUR AGE. TYPE IT.'],
  position: ['Pick your position', 'Choose one', 'PICK. A. POSITION.'],
  years_playing: ['How long have you been playing?', 'Pick one, be honest', 'YEARS PLAYING. PICK ONE.'],
  current_team_school: ['What team or school?', 'Team or school name please', 'TEAM. OR. SCHOOL.'],
  biggest_weakness: ['Be honest here', 'Something, anything', 'YOUR WEAKNESS. TELL US.'],
  city_state: ['Where are you based?', 'City and province or state please', 'WHERE ARE YOU FROM?!'],
  email: ["We'll need your email", 'Email address please', 'YOUR EMAIL. NOW.'],
  phone: ['Add a phone number', 'Phone number, please', 'PHONE NUMBER!!'],
  social_link: ['Drop your @ handle', 'Your handle or the no account option', 'YOUR @. OR PICK THE OPTION.'],
  time_commitment: ['How much time can you give?', 'Pick a realistic time', 'PICK A TIME!!'],
  film_readiness: ['How does film coaching sound?', 'Pick the honest answer', 'PICK ONE. BE HONEST.'],
  film_access: ['Do you have game footage?', 'Choose what is true right now', 'PICK YOUR FILM SITUATION.'],
  device_access: ['What device can you use?', 'Pick one', 'PICK A DEVICE!!'],
  decision_support: ["Who's helping you decide?", 'Choose who is supporting you', "WHO'S IN YOUR CORNER?!"],
  guardian_name: ['Add their name', 'Parent or supporter name', 'THEIR NAME. NOW.'],
  guardian_phone: ['Add their number', 'Their phone number please', 'THEIR NUMBER. GO.'],
  guardian_email: ["We'll need their email", 'Their email please', 'THEIR EMAIL. NOW.'],
  guardian_aware: ['Yes or not yet?', 'Pick one', 'HAVE YOU TOLD THEM?!'],
  investment_readiness: ['What would help you feel ready?', 'Choose the answer that feels right', 'PICK WHAT FITS.'],
  heard_about: ['How did you find us?', 'Pick the closest answer', 'HOW DID YOU HEAR ABOUT US?!'],
  heard_about_detail: ['Tell us where', 'A few words is enough', 'WHERE DID YOU FIND US?!'],
};

const INVALID_NUDGES: Partial<Record<ApplicationField, string[]>> = {
  full_name: ['Include first and last name', 'e.g. Marcus Thompson', 'FIRST AND LAST NAME.'],
  age: ['Age must be between 13 and 35', 'Enter a real age', 'REAL AGE. 13 TO 35.'],
  current_team_school: ['Give us a real team or school name', 'More than one letter', 'TEAM OR SCHOOL NAME.'],
  biggest_weakness: ['Give more detail than that', 'Dig deeper, be specific', 'ACTUALLY ANSWER IT.'],
  city_state: ["Use 'City, Province or State'", 'e.g. Toronto, Ontario', 'CITY, PROVINCE. THAT IS IT.'],
  email: ["That's not a valid email", 'Try name@email.com', 'VALID EMAIL ONLY.'],
  phone: ['Needs a full phone number', 'Include the area or country code', 'REAL PHONE NUMBER.'],
  social_link: ["That doesn't look like a real handle", 'Try @yourusername or choose no account', 'REAL HANDLE.'],
  guardian_name: ["That doesn't look like a name", 'Use their actual name', 'REAL NAME.'],
  guardian_phone: ['Needs a full phone number', 'Include the area or country code', 'REAL PHONE NUMBER.'],
  guardian_email: ["That's not a valid email", 'Try name@email.com', 'VALID EMAIL ONLY.'],
  goal_detail: ['Give us a little more than that', 'Say what you are aiming for', 'TELL US THE GOAL.'],
  heard_about_detail: ['Tell us where you heard about us', 'A few real words please', 'WHERE DID YOU FIND US?!'],
};

function personalityNudge(problem: { field: ApplicationField; message: string }, form: FormData, attempt: number): string {
  if (problem.message.includes('respectful')) {
    const respectNudges = ['Keep it respectful', 'Seriously. Clean it up.', 'WRITE A REAL BASKETBALL ANSWER.'];
    return respectNudges[attempt % respectNudges.length];
  }
  if (problem.message.includes('real answer')) {
    const qualityNudges = ['Give us a real answer', 'Random text is not an answer', 'COME ON. ANSWER IT FOR REAL.'];
    return qualityNudges[attempt % qualityNudges.length];
  }
  const presets = form[problem.field].trim() ? INVALID_NUDGES[problem.field] : EMPTY_NUDGES[problem.field];
  if (!presets?.length) {
    const fallbacks = [problem.message, 'Still need a real answer here', 'ANSWER THIS ONE FIRST.'];
    return fallbacks[attempt % fallbacks.length];
  }
  return presets[attempt % presets.length];
}

// ── Page ──────────────────────────────────────────────────────────────────────
function ApplyPageInner() {
  const searchParams = useSearchParams();
  const claimsEarlyPricing = searchParams.get('early_pricing') === 'true';
  // Confirm promotional eligibility before showing its badge. No price is
  // displayed in the application; /api/apply re-checks eligibility at submission.
  const [earlySpotOpen, setEarlySpotOpen] = useState(false);
  useEffect(() => {
    if (!claimsEarlyPricing) return;
    let cancelled = false;
    fetch('/api/early-pricing-spots')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d && typeof d.remaining === 'number') setEarlySpotOpen(d.remaining > 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [claimsEarlyPricing]);
  const earlyPricing = claimsEarlyPricing && earlySpotOpen;

  const [screen, setScreen]         = useState(0);
  const [form, setForm]             = useState<FormData>(EMPTY);
  const [visible, setVisible]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [nudgeMsg, setNudgeMsg]     = useState<string | null>(null);
  const [nudgeKey, setNudgeKey]     = useState(0);
  const [nudgeAttempts, setNudgeAttempts] = useState(0);
  const [shaking, setShaking]       = useState(false);
  const [editingReview, setEditingReview] = useState(false);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [expandedReviewSection, setExpandedReviewSection] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<ApplicationField | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const inputRef   = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const advanceRef = useRef<() => void>(() => {});
  const resumeScreenRef = useRef(1);
  // Set while the server is being asked whether a resumed application has its
  // call booked yet. "Let's Begin" awaits it so the answer decides the screen,
  // rather than the check racing the click.
  const resumePendingRef = useRef<Promise<void> | null>(null);
  const draftKeyRef = useRef<string | null>(null);
  const progressRevisionRef = useRef(0);
  const lastAnsweredKeyRef = useRef<string | null>(null);
  const [progressSaveFailed, setProgressSaveFailed] = useState(false);
  const latestProgressRef = useRef<{ question: Q; snapshot: FormData } | null>(null);

  const ensureDraftKey = useCallback(() => {
    if (draftKeyRef.current) return draftKeyRef.current;
    try {
      const stored = localStorage.getItem(DRAFT_KEY_STORAGE);
      if (stored) return (draftKeyRef.current = stored);
      const created = generateDraftKey();
      localStorage.setItem(DRAFT_KEY_STORAGE, created);
      draftKeyRef.current = created;
      return created;
    } catch {
      return (draftKeyRef.current = generateDraftKey());
    }
  }, []);

  const questions = APPLICATION_SCREENS;
  const TOTAL = questions.length;
  const REVIEW = TOTAL + 1;
  const BOOKING = TOTAL + 2;
  const DONE = TOTAL + 3;
  const visibleQuestions = questions.filter(q => screenIsVisible(q.key, form));

  const nextProgressRevision = useCallback(() => {
    // Persist across reloads and tabs. Reusing an older sequence would make a
    // resumed draft's answers look stale to the server.
    let stored = 0;
    try { stored = Number(localStorage.getItem('tdt_progress_revision')) || 0; } catch {}
    const revision = Math.max(Date.now(), stored + 1, progressRevisionRef.current + 1);
    progressRevisionRef.current = revision;
    try { localStorage.setItem('tdt_progress_revision', String(revision)); } catch {}
    return revision;
  }, []);

  const progressQueue = useMemo(() => createProgressQueue<string>(async body => {
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch('/api/apply/save-progress', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body, keepalive: true, signal: AbortSignal.timeout(5_000),
        });
        lastStatus = response.status;
        if (response.ok) { setProgressSaveFailed(false); return; }
        // Validation errors will not improve by sending the identical body.
        if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
      } catch { /* Retry a temporary connection failure. */ }
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 250 : 750));
    }
    throw new Error(`Progress save failed${lastStatus ? ` (${lastStatus})` : ''}`);
  }, error => {
    console.warn('[apply] progress save failed', error);
    setProgressSaveFailed(true);
  }), []);

  const enqueueProgress = useCallback((question: Q, completed: boolean, snapshot: FormData) => {
    if (completed) lastAnsweredKeyRef.current = question.key;
    return progressQueue.enqueue(JSON.stringify({
      draft_key: ensureDraftKey(), revision: nextProgressRevision(),
      last_answered_question_key: lastAnsweredKeyRef.current,
      form_version: DRAFT_VERSION, question_key: question.key, completed, answers: progressAnswers(snapshot),
      identity: { athlete_name: snapshot.full_name, athlete_email: snapshot.email, email: snapshot.email },
    }));
  }, [ensureDraftKey, nextProgressRevision, progressQueue]);

  // Warm the city index while the applicant reads the intro screen, so question
  // 03 is instant even on a slow connection. Both calls are idempotent.
  useEffect(() => {
    const ric = window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200));
    ric(() => { preloadCities(); preloadSchools(); loadGeoHint(); });
  }, []);

  // The Cal.com embed defaults to dark theme, which clashes with the rest of
  // the site — force it light to match. Configuring this early (rather than
  // only on the booking screen) means it's already applied by the time the
  // applicant gets there.
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal('ui', { theme: 'light', styles: { branding: { brandColor: TERRA } } });
    })();
  }, []);

  // Restore draft from localStorage on mount — keep the intro screen visible
  // and only jump to the saved progress once the user clicks "Let's Begin",
  // instead of silently skipping straight past the intro on every revisit.
  // Skipped entirely when a finished application is waiting on a booking —
  // that's a different, further-along state handled by the effect below.
  useEffect(() => {
    try {
      // Reads through readFresh, not raw — an expired submitted entry must be
      // cleared here too, or it would bail this effect out on its way to being
      // dropped by the next one, and the draft would never be restored.
      if (readFresh(SUBMITTED_KEY, SUBMITTED_TTL_MS)) return; // handled by the effect below instead
      const saved = readFresh(STORAGE_KEY, DRAFT_TTL_MS);
      if (saved) {
        const { form: f, screen: s, version: v } = saved as { form: FormData; screen: number; version: number };
        const restored = normalizeApplicationDraft(f);
        // Hydrate browser-only storage after the server-rendered intro matches.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm(restored);
        if (v === DRAFT_VERSION && saved.questionOrder === 'contact-second' && s >= 1) {
          resumeScreenRef.current = s <= REVIEW && (s === REVIEW || screenIsVisible(questions[s - 1].key, restored)) ? s : firstIncompleteApplicationScreen(restored);
        } else {
          // Stale draft from before a question-order change (or from before
          // versioning existed at all) — the saved index can't be trusted to
          // point at the right question anymore, but the typed answers are
          // still good. Resume at the first incomplete required question
          // instead of trusting the index.
          resumeScreenRef.current = firstIncompleteApplicationScreen(restored);
        }
      } else {
        dropKey(DRAFT_KEY_STORAGE);
      }
    } catch {}
  }, [questions, REVIEW]);

  // The application form itself is done, but booking the call is a required
  // part of finishing — not a follow-up. On mount, if this browser finished
  // the form but we don't yet know it booked, ask the server (never trust a
  // client-side claim) which screen is true: the booking step if not yet
  // confirmed, or the confirmed screen if it is.
  //
  // This only *arms* the resume — it no longer moves the screen itself. Doing
  // that put a returning visitor straight onto the calendar with no way back
  // to the intro or the form, which is the same silent-skip this file already
  // refuses to do for ordinary drafts (see the effect above). The intro stays
  // up; "Let's Begin" is what jumps to the resumed screen.
  //
  // Fails open to the booking screen on any error — a broken status check must
  // never trap someone who genuinely booked behind an unrelated error.
  useEffect(() => {
    const info = readFresh(SUBMITTED_KEY, SUBMITTED_TTL_MS) as {
      full_name?: string; email?: string; guardian_email?: string | null; age?: string; decision_support?: string; guardian_aware?: string; version?: number;
    } | null;
    if (!info?.email) return; // nothing to resume — stay on the intro

    const email = info.email;
    // Hydrate the external submitted-draft record only after mounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(f => ({
      ...f,
      full_name: info.full_name || f.full_name,
      email: email || f.email,
      guardian_email: info.guardian_email || f.guardian_email,
      age: info.age || f.age,
      decision_support: info.decision_support || f.decision_support,
      // v4 submission already required parent awareness before this entry existed.
      guardian_aware: info.guardian_aware || (!info.version && info.guardian_email ? 'Yes' : f.guardian_aware),
    }));
    resumeScreenRef.current = BOOKING;

    resumePendingRef.current = fetch(`/api/apply/booking-status?email=${encodeURIComponent(email)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json?.booked) {
          dropKey(SUBMITTED_KEY);
          resumeScreenRef.current = DONE;
        }
      })
      .catch(() => {})
      .finally(() => { resumePendingRef.current = null; });
  }, [BOOKING, DONE]);

  // Auto-save draft whenever form or screen changes (skip intro + success)
  useEffect(() => {
    if (screen < 1 || screen > REVIEW) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, screen, version: DRAFT_VERSION, questionOrder: 'contact-second', savedAt: Date.now() })); } catch {}
  }, [form, screen, REVIEW]);

  // Save while they type/select, not just when they eventually submit. A short
  // debounce avoids one database write per keystroke while still preserving a
  // half-written answer if the tab closes on the current question.
  useEffect(() => {
    if (screen < 1 || screen > TOTAL) {
      latestProgressRef.current = null;
      return;
    }
    const question = questions[screen - 1];
    // The table historically requires athlete_name. Do not create an empty row
    // merely because somebody opened Q1; the first typed character starts it.
    if (question.key === 'full_name' && !form.full_name.trim()) {
      latestProgressRef.current = null;
      return;
    }
    latestProgressRef.current = { question, snapshot: form };
    const timer = setTimeout(() => {
      void enqueueProgress(question, false, form);
    }, 300);
    return () => clearTimeout(timer);
  }, [form, screen, TOTAL, questions, enqueueProgress]);

  // If someone closes or backgrounds the tab inside the short typing debounce,
  // send the latest snapshot with the browser's unload-safe transport. The
  // server treats this as the same idempotent draft update as the normal save.
  useEffect(() => {
    const flushLatest = () => {
      const latest = latestProgressRef.current;
      if (!latest) return;
      if (latest.question.key === 'full_name' && !latest.snapshot.full_name.trim()) return;
      const draftKey = ensureDraftKey();
      const body = JSON.stringify({
        draft_key: draftKey,
        revision: nextProgressRevision(),
        last_answered_question_key: lastAnsweredKeyRef.current,
        form_version: DRAFT_VERSION,
        question_key: latest.question.key,
        completed: false,
        answers: progressAnswers(latest.snapshot),
        identity: {
          athlete_name: latest.snapshot.full_name,
          athlete_email: latest.snapshot.email,
          email: latest.snapshot.email,
        },
      });
      navigator.sendBeacon('/api/apply/save-progress', new Blob([body], { type: 'application/json' }));
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushLatest();
    };
    window.addEventListener('pagehide', flushLatest);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushLatest);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [ensureDraftKey, nextProgressRevision]);

  useEffect(() => {
    const retry = () => {
      const latest = latestProgressRef.current;
      if (latest && navigator.onLine) void enqueueProgress(latest.question, false, latest.snapshot);
    };
    window.addEventListener('online', retry);
    const timer = progressSaveFailed ? window.setInterval(retry, 5_000) : null;
    return () => {
      window.removeEventListener('online', retry);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [progressSaveFailed, enqueueProgress]);

  // The embed's bookingSuccessfulV2 event is a client-side postMessage — a
  // hint that booking probably just succeeded, not proof (the same reasoning
  // that applies to any client-only signal gating something real). It never
  // flips the screen by itself; it only kicks off a short poll of our own
  // server-confirmed status, which is the one thing allowed to do that.
  useEffect(() => {
    if (screen !== BOOKING) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => { if (pollTimer) clearInterval(pollTimer); };

    const checkStatus = () => {
      if (!form.email) return;
      fetch(`/api/apply/booking-status?email=${encodeURIComponent(form.email)}`)
        .then(res => (res.ok ? res.json() : null))
        .then(json => {
          if (cancelled || !json?.booked) return;
          dropKey(SUBMITTED_KEY); dropKey(STORAGE_KEY);
          stopPolling();
          setScreen(DONE);
        })
        .catch(() => {});
    };

    let attempts = 0;
    (async () => {
      const cal = await getCalApi();
      cal('on', {
        action: 'bookingSuccessfulV2',
        callback: () => {
          if (cancelled || pollTimer) return; // already polling
          checkStatus();
          pollTimer = setInterval(() => {
            attempts += 1;
            checkStatus();
            if (attempts >= 10) stopPolling(); // ~20s, then give up quietly
          }, 2000);
        },
      });
    })();

    return () => { cancelled = true; stopPolling(); };
  }, [screen, form.email, BOOKING, DONE]);

  // Keep advanceRef fresh every render so the keydown handler always calls latest advance
  // (assigned after advance is defined below — see comment there)

  // Focus input when screen changes
  useEffect(() => {
    const t = setTimeout(() => (inputRef.current ?? document.getElementById('application-question'))?.focus(), 260);
    return () => clearTimeout(t);
  }, [screen]);

  // Enter key to advance (Cmd/Ctrl+Enter for textareas)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="combobox"]') || (target instanceof HTMLInputElement && ['radio', 'checkbox'].includes(target.type))) return;
      if (screen > TOTAL) return;
      const q = screen > 0 ? questions[screen - 1] : null;
      if (q?.type === 'textarea' && !e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      advanceRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen, questions, TOTAL]);

  const triggerShake = () => {
    setShaking(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setShaking(true)));
  };

  const fireNudge = (message: string) => {
    setNudgeMsg(message);
    setNudgeKey(key => key + 1);
    triggerShake();
  };

  const goTo = (next: number) => {
    setError(null);
    setNudgeMsg(null);
    setNudgeKey(0);
    setNudgeAttempts(0);
    setShaking(false);
    setInvalidField(null);
    setVisible(false);
    setTimeout(() => { setScreen(next); setVisible(true); }, 200);
  };

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const raw = e.target.value;
    const v =
      (field === 'phone' || field === 'guardian_phone') ? formatPhone(raw)
      // Age rides on a text input to get the plain 0–9 keypad (see the input
      // below), so strip anything that isn't a digit here rather than trusting
      // the field type. Also cleans up a pasted "21 years old".
      : field === 'age' ? raw.replace(/\D/g, '')
      : raw;
    setForm(f => ({ ...f, [field]: v }));
    setNudgeMsg(null);
    setInvalidField(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const problem = applicationSubmissionError(form);
    if (problem) { setError(problem.message); return; }
    setSubmitting(true);
    setError(null);
    await progressQueue.flush();
    const payload = {
      ...progressAnswers(form), form_version: DRAFT_VERSION,
      early_pricing: earlyPricing || null, draft_key: ensureDraftKey(),
    };
    try {
      const res  = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(DRAFT_KEY_STORAGE);
        // The form is done, but the application isn't — booking is what's
        // left. Keep just enough to resume straight into the booking step
        // (or the confirmed screen) if this tab closes before that happens.
        localStorage.setItem(SUBMITTED_KEY, JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email,
          guardian_email: needsSupporter(form) ? form.guardian_email || null : null,
          age: form.age, decision_support: form.decision_support, guardian_aware: form.guardian_aware,
          savedAt: Date.now(),
          version: DRAFT_VERSION,
        }));
      } catch {}
      goTo(BOOKING);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const advance = async () => {
    if (screen === 0) {
      // Resuming into the booking step needs the server's answer first, so the
      // click waits on the in-flight check rather than guessing. Already
      // resolved (and null) in the ordinary case, including every fresh visit.
      if (resumePendingRef.current) await resumePendingRef.current;
      goTo(resumeScreenRef.current);
      return;
    }
    if (checkingEmail || submitting || screen > TOTAL || !visible) return;
    const q = questions[screen - 1];
    const problem = applicationScreenError(q, form);
    if (problem) {
      fireNudge(personalityNudge(problem, form, nudgeAttempts));
      setNudgeAttempts(attempt => attempt + 1);
      setInvalidField(problem.field);
      requestAnimationFrame(() => document.getElementById(`field-${problem.field}`)?.focus());
      return;
    }
    if (q.key === 'contact') {
      setCheckingEmail(true);
      try {
        const res = await fetch(`/api/apply/check-email?email=${encodeURIComponent(form.email.trim())}`, { signal: AbortSignal.timeout(5000) });
        const json = res.ok ? await res.json() : null;
        if (json?.exists) {
          fireNudge('An application with this email has already been submitted. Use the booking link in your confirmation email.');
          setInvalidField('email');
          return;
        }
      } catch { /* Final submission also checks for duplicates. */ }
      finally { setCheckingEmail(false); }
    }
    void enqueueProgress(q, true, form);
    if (editingReview) { setEditingReview(false); goTo(REVIEW); return; }
    const nextIndex = questions.findIndex((item, index) => index >= screen && screenIsVisible(item.key, form));
    goTo(nextIndex < 0 ? REVIEW : nextIndex + 1);
  };
  const retreat = () => {
    if (editingReview) { setEditingReview(false); goTo(REVIEW); return; }
    for (let index = Math.min(screen - 2, TOTAL - 1); index >= 0; index--) {
      if (screenIsVisible(questions[index].key, form)) { goTo(index + 1); return; }
    }
  };

  // Escape hatch off the resumed booking step. Someone who lands there from a
  // previous session — a different applicant on a shared device, or the same
  // one starting over — otherwise has no route back into the form at all.
  const startOver = () => {
    dropKey(STORAGE_KEY);
    dropKey(SUBMITTED_KEY);
    dropKey(DRAFT_KEY_STORAGE);
    draftKeyRef.current = null;
    resumeScreenRef.current = 1;
    resumePendingRef.current = null;
    lastAnsweredKeyRef.current = null;
    setSubmitting(false);
    setCheckingEmail(false);
    setEditingReview(false);
    setForm(EMPTY);
    goTo(0);
  };

  // Keep advanceRef pointing to the latest advance closure
  useEffect(() => { advanceRef.current = advance; });

  const fadeStyle: React.CSSProperties = {
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  };

  // ── 0: Intro ──────────────────────────────────────────────────────────────
  if (screen === 0) return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 25, padding: '60px 24px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap');
        @keyframes tdt-char-in {
          from { opacity: 0; transform: translateY(14px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0px);  filter: blur(0px); }
        }
        @keyframes tdt-char-out {
          from { opacity: 1; transform: translateY(0px);   filter: blur(0px); }
          to   { opacity: 0; transform: translateY(-14px); filter: blur(8px); }
        }
        @media (max-width: 639px) {
          .tdt-intro-desc { font-size: 15px !important; line-height: 1.45 !important; }
        }
      `}</style>

      <Link
        href="/"
        aria-label="Back to website"
        style={{ position: 'fixed', top: 20, left: 24, ...text(13, 400, 'rgba(0,0,0,0.32)'), textDecoration: 'none', letterSpacing: '0.01em', zIndex: 50 }}
      >
        ← Learn More
      </Link>

      {earlyPricing && (
        <div style={{ opacity: 0.55, ...fadeStyle }}>
          <EarlyBirdIcon size={20} color={TERRA} />
        </div>
      )}

      <p style={{ ...text(16, 500, TERRA), ...fadeStyle }}>
        Think Different Training
      </p>

      <div style={{ ...fadeStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15, width: '100%', maxWidth: 560 }}>
        <CyclingHeadline style={{ ...text(32, 500, '#000000'), margin: 0, fontSize: 'clamp(24px, 7vw, 32px)' }} />
        <p className="tdt-intro-desc" style={{
          ...text(18, 400, '#000000'),
          opacity: 0.4,
          maxWidth: 800,
          textAlign: 'center',
          lineHeight: 1.45,
        }}>
          Every journey toward excellence begins with a single step.
        </p>
        <CTAButton onClick={advance} className="h-[42px] px-[22px] text-[15px] font-normal mt-[10px]">
          Let&apos;s Begin
        </CTAButton>
        <p aria-label="Estimated application time: 5 minutes" style={{ ...text(12, 400, 'rgba(0,0,0,0.4)'), margin: 0, display: 'flex', alignItems: 'center', gap: 5, lineHeight: '18px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          5min
        </p>
      </div>
    </div>
  );

  // ── Booking (final step) ─────────────────────────────────────────────────
  // The application isn't the review anymore — the call is. This screen's
  // only job is getting a booked call, embedded right here instead of
  // sending the applicant off to another tab, with the parent locked in as
  // a guest on the invite.
  if (screen === BOOKING) {
    const calConfig: Record<string, string | string[]> = {
      theme: 'dark',
      name: form.full_name.trim(),
      email: form.email,
    };
    if (needsSupporter(form) && form.guardian_aware === 'Yes' && form.guardian_email) calConfig.guests = [form.guardian_email];

    return (
      <div style={{ minHeight: '100dvh', background: BG, padding: '60px 20px 80px' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap');
          .tdt-booking-cal { border-radius: 28px; overflow: hidden; }
        `}</style>
        <div style={{ ...fadeStyle, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>

          {/* Copy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center', alignItems: 'center', maxWidth: 700, margin: '0 auto', width: '100%' }}>
            <p style={{ ...text(16, 500, TERRA), margin: 0 }}>
              Your answers are saved. Choose a time to talk.
            </p>
            <p style={{ ...text(15, 400, 'rgba(0,0,0,0.45)'), lineHeight: 1.5, margin: 0 }}>
              The call is the last step in your application. We&apos;ll talk through your goals, how the coaching works and whether it&apos;s a good fit. {needsSupporter(form) ? 'Choose a time your parent or supporter can join too.' : 'Choose a time that works for you.'}
            </p>
          </div>

          {/* Booking */}
          <div className="tdt-booking-cal">
            <Cal
              calLink="tyrell-crawford-2pjfa2/30min"
              config={calConfig}
              style={{ width: '100%', height: '680px', overflow: 'scroll' }}
            />
          </div>

          <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: 28, fontWeight: 400, color: TERRA, textAlign: 'center', margin: '4px 0 0' }}>
            Talk soon
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
            <Link href="/" style={{ ...text(13, 400, 'rgba(0,0,0,0.35)'), textDecoration: 'none', letterSpacing: '0.03em' }}>
              ← Back to home
            </Link>
            <span style={{ ...text(13, 400, 'rgba(0,0,0,0.18)') }}>·</span>
            <button
              type="button"
              onClick={startOver}
              style={{
                ...text(13, 400, 'rgba(0,0,0,0.35)'),
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              Start a new application
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  // Reached only once the server (the Cal.com webhook, never the client) has
  // recorded a booking for this email — either right after the embed polling
  // above catches it, or on a later visit once it already had.
  if (screen === DONE) return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px 80px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap');`}</style>
      <div style={{ ...fadeStyle, width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', textAlign: 'center' }}>
        <p style={{ ...text(16, 500, TERRA), margin: 0 }}>
          You&apos;re booked.
        </p>
        <p style={{ ...text(15, 400, 'rgba(0,0,0,0.45)'), lineHeight: 1.5, margin: 0 }}>
          Check your email for the calendar invite. See you on the call.
        </p>
        <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: 28, fontWeight: 400, color: TERRA, margin: '4px 0 0' }}>
          Talk soon
        </p>
        <Link href="/" style={{ ...text(13, 400, 'rgba(0,0,0,0.35)'), textDecoration: 'none', letterSpacing: '0.03em' }}>
          ← Back to home
        </Link>
      </div>
    </div>
  );


const choose = (field: ApplicationField, value: string) => {
    setForm(f => ({
      ...f, [field]: value,
      ...(field === 'guardian_aware' && value !== 'Yes' ? { guardian_consent: '' } : {}),
    }));
    setNudgeMsg(null);
    setInvalidField(null);
    setError(null);
  };
  const editQuestion = (key: string) => {
    setEditingReview(true);
    goTo(questions.findIndex(item => item.key === key) + 1);
  };
  const legalLinks = (
    <p className={styles.legal}>
      By submitting, you agree to our{' '}
      <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
      {' '}and{' '}
      <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
    </p>
  );
  const reviewGroups = visibleQuestions.reduce<Record<string, Q[]>>((groups, question) => {
    (groups[question.section] ??= []).push(question);
    return groups;
  }, {});

  if (screen === REVIEW) return (
    <main className={styles.root} style={{ background: BG }}>
      <Link href="/" className={styles.homeLink}>← Learn More</Link>
      <div className={styles.review} style={fadeStyle}>
        <p className={styles.eyebrow}>Your application</p>
        <h1>Make sure this sounds like you.</h1>
        <p className={`${styles.timeLabel} ${styles.completionMessage}`} role="status">
          <svg className={styles.completionCheck} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>
          Complete. Thank you
        </p>
        <p className={styles.description}>
          Review your answers, then choose a time for the next step.
          Applying is not a commitment to join.
        </p>
        <div className={styles.reviewColumns}>
          <div className={styles.reviewAnswers}>
            <div className={styles.reviewList}>
              {Object.entries(reviewGroups).map(([section, groupQuestions]) => {
                const sectionOpen = expandedReviewSection === section;
                return (
                  <section key={section} className={`${styles.reviewSection} ${sectionOpen ? styles.reviewSectionOpen : ''}`}>
                    <button
                      type="button"
                      className={styles.reviewSectionToggle}
                      onClick={() => setExpandedReviewSection(current => current === section ? null : section)}
                      aria-expanded={sectionOpen}
                      aria-controls={`review-section-${section.replace(/\W+/g, '-')}`}
                    >
                      <span>{section}</span>
                      <span className={styles.reviewSectionMeta}>{groupQuestions.length} {groupQuestions.length === 1 ? 'answer' : 'answers'} <span aria-hidden="true">＋</span></span>
                    </button>
                    <div id={`review-section-${section.replace(/\W+/g, '-')}`} className={`${styles.reviewSectionDetails} ${sectionOpen ? styles.reviewSectionDetailsOpen : ''}`}>
                      <div className={styles.reviewSectionDetailsInner}>
              {groupQuestions.map(question => {
            const answers = question.type === 'group'
              ? visibleSubFields(question, form).map(sub => ({ label: sub.label, value: form[sub.field] }))
              : [{ label: '', value: form[question.field] + (
                'detailField' in question && question.detailField && form[question.field] === question.detailOption && form[question.detailField]
                  ? ': ' + form[question.detailField] : ''
              ) }];
            const preview = answers.map(answer => answer.value).filter(Boolean).join(' · ');
            const expanded = expandedReview === question.key;
                return (
                  <section key={question.key} className={`${styles.reviewItem} ${expanded ? styles.reviewItemExpanded : ''}`}>
                <div className={styles.reviewHeading}>
                  <button
                    type="button"
                    className={styles.reviewToggle}
                    onClick={() => setExpandedReview(current => current === question.key ? null : question.key)}
                    aria-expanded={expanded}
                    aria-controls={`review-answer-${question.key}`}
                  >
                    <span className={styles.reviewQuestion}>{question.question}</span>
                    <span className={styles.reviewPreview}>{preview || 'Answer needed'}</span>
                  </button>
                  <button type="button" onClick={() => editQuestion(question.key)} aria-label={'Edit: ' + question.question}>Edit</button>
                </div>
                <div id={`review-answer-${question.key}`} className={`${styles.reviewDetails} ${expanded ? styles.reviewDetailsOpen : ''}`}>
                  <div className={styles.reviewDetailsInner}>
                    {answers.map((answer, index) => (
                      <p key={index}>
                        {answer.label && <span className={styles.answerLabel}>{answer.label}: </span>}
                        {answer.value || <span className={styles.missing}>Answer needed</span>}
                      </p>
                    ))}
                  </div>
                </div>
                </section>
              );
            })}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
          <aside className={styles.reviewActions}>
            {isMinor(form) && (
              <section className={styles.notice}>
                <h2>A quick check with your parent or guardian</h2>
                {form.guardian_aware !== 'Yes' ? (
                  <>
                    <p>You can keep this draft, but your parent or legal guardian needs to review it with you before you submit.</p>
                    <button type="button" className={styles.textButton} onClick={() => editQuestion('guardian_aware')}>Update parent awareness</button>
                  </>
                ) : (
                  <label className={styles.consent}>
                    <input type="checkbox" checked={form.guardian_consent === 'Yes'} onChange={e => choose('guardian_consent', e.target.checked ? 'Yes' : '')} />
                    <span>My parent or legal guardian has reviewed this application and the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> with me and agrees to my applying.</span>
                  </label>
                )}
              </section>
            )}
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <div className={styles.navigation}>
              <GoBackButton onClick={retreat} />
              <CTAButton onClick={handleSubmit} disabled={submitting} className="min-h-[42px] flex-[2] whitespace-nowrap px-4 py-2 text-[18px] font-normal tracking-[-0.02em]">
                {submitting ? 'Submitting…' : 'Submit and choose a time'}
              </CTAButton>
            </div>
            {legalLinks}
            <p className={styles.hint}>This browser remembers your draft for 7 days. Your saved answers are visible to the coaching team.</p>
          </aside>
        </div>
      </div>
    </main>
  );

  const timeEstimate = applicationTimeEstimate(form);
  const allAnswered = firstIncompleteApplicationScreen(form) > TOTAL;
  const almostThere = timeEstimate.remainingSeconds <= 60;
  const timeLabel = allAnswered ? 'Complete. Thank you' : almostThere ? 'Almost there!!' : formatApplicationTime(timeEstimate.remainingSeconds);
  const q = questions[screen - 1];
  const ordinal = visibleQuestions.findIndex(item => item.key === q.key) + 1;
  const isFirst = ordinal === 1;
  const isLast = ordinal === visibleQuestions.length;
  const progress = ((ordinal - 1) / (visibleQuestions.length + 2)) * 100;
  const fieldProps = (field: ApplicationField) => ({
    id: `field-${field}`,
    name: field,
    'aria-invalid': invalidField === field || undefined,
    'aria-describedby': invalidField === field && nudgeMsg ? 'answer-error' : undefined,
  });
  const inputStyle: React.CSSProperties = {
    boxSizing: 'border-box', width: '100%', height: 60, padding: '20px 10px', borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0px 6px 14px rgba(0,0,0,0.08)',
    color: '#000000', background: '#ffffff', outline: 'none',
    fontFamily: 'inherit', fontSize: 16, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: '18px',
  };
  const radioOptions = (field: ApplicationField, options: string[], compact = false, choice = false) => (
    <div className={choice ? styles.choices : compact ? styles.compactOptions : styles.options}>
      {options.map((option, index) => (
        <label key={option} className={`${styles.option} ${form[field] === option ? styles.selected : ''}`}>
          <input {...fieldProps(field)} id={index === 0 ? `field-${field}` : `field-${field}-${index}`}
            type="radio" value={option} checked={form[field] === option}
            onChange={() => choose(field, option)} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
  const standardInput = (field: ApplicationField, kind: string, placeholder: string, primary = false) => (
    <input {...fieldProps(field)}
      ref={primary ? inputRef as unknown as React.RefObject<HTMLInputElement> : undefined}
      className={styles.input} type={kind === 'number' ? 'text' : kind}
      inputMode={kind === 'number' ? 'numeric' : undefined}
      autoComplete={kind === 'email' ? 'email' : kind === 'tel' ? 'tel' : field === 'full_name' ? 'name' : 'off'}
      maxLength={kind === 'number' ? 2 : 4000}
      value={form[field]} placeholder={placeholder} onChange={set(field)} />
  );
  const renderInput = () => {
    if (q.type === 'group') return (
      <div className={styles.group}>
        {visibleSubFields(q, form).map(sub => (
          <fieldset key={sub.field} className={styles.fieldset}>
            <legend>{sub.label}</legend>
            {sub.kind === 'radio-grid'
              ? radioOptions(sub.field, sub.options, true)
              : standardInput(sub.field, sub.kind, sub.placeholder)}
          </fieldset>
        ))}
      </div>
    );
    if (q.type === 'radio-grid' || q.type === 'choice') return (
      <>
        <fieldset className={styles.fieldset} aria-labelledby="application-question">
          {radioOptions(q.field, q.options, false, q.type === 'choice')}
        </fieldset>
        {q.type === 'radio-grid' && q.detailField && form[q.field] === q.detailOption && (
          <label className={styles.detail}>
            {q.key === 'goal' ? 'Tell us the goal you have in mind' : 'Where did you hear about us?'}
            {standardInput(q.detailField, 'text', q.key === 'goal' ? 'A few words are enough' : 'Tell us where')}
          </label>
        )}
        {q.key === 'guardian_aware' && form.guardian_aware === 'Not yet' && (
          <p className={styles.notice}>
            {isMinor(form)
              ? 'You can keep going and save your draft. Before submitting, review the application with your parent or legal guardian.'
              : 'You can still finish your application. Talk with your supporter before choosing a call time together.'}
          </p>
        )}
      </>
    );
    let input;
    if (q.type === 'location') input = (
      <LocationInput ref={inputRef as unknown as React.RefObject<HTMLInputElement>} value={form[q.field]}
        onChange={value => choose(q.field, value)} baseStyle={inputStyle} />
    );
    else if (q.type === 'school') input = (
      <SchoolInput ref={inputRef as unknown as React.RefObject<HTMLInputElement>} value={form[q.field]}
        onChange={value => choose(q.field, value)} baseStyle={inputStyle} />
    );
    else if (q.type === 'textarea') input = (
      <textarea {...fieldProps(q.field)} aria-labelledby="application-question"
        ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>} className={styles.input}
        rows={4} maxLength={4000} value={form[q.field]} onChange={set(q.field)} placeholder={q.placeholder} />
    );
    else input = (
      <label className={styles.inputLabel}>
        <span className={styles.srOnly}>{q.question}</span>
        {standardInput(q.field, q.type, 'placeholder' in q ? q.placeholder : '', true)}
      </label>
    );
    return (
      <>
        {input}
        {'alternative' in q && q.alternative && (
          <button type="button" className={`${styles.alternative} ${form[q.field] === q.alternative ? styles.alternativeSelected : ''}`}
            aria-pressed={form[q.field] === q.alternative}
            onClick={() => choose(q.field, form[q.field] === q.alternative ? '' : q.alternative!)}>
            {q.alternative}
          </button>
        )}
      </>
    );
  };

  return (
    <main className={styles.root} style={{ background: BG }}>
      <div className={styles.progress} role="progressbar" aria-label="Application progress, including review and call"
        aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${progress}%` }} />
      </div>
      <Link href="/" className={styles.homeLink}>← Learn More</Link>
      <div className={styles.questionLayout}>
        <div className={styles.questionContainer} style={fadeStyle}>
          <p className={styles.eyebrow}>{q.section}</p>
          <section
            key={q.key}
            className={`${styles.card} ${shaking ? styles.shaking : ''}`}
            aria-labelledby="application-question"
            onAnimationEnd={event => {
              if (event.currentTarget === event.target) setShaking(false);
            }}
          >
            {q.type === 'school' && (
              <div className={styles.schoolBadge} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L2 8l10 5 10-5-10-5z" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M6 10.5V16c0 1 2.5 3 6 3s6-2 6-3v-5.5" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            <span className={styles.number} aria-label={`Question ${ordinal} of ${visibleQuestions.length}`}>
              {String(ordinal).padStart(2, '0')}
            </span>
            {nudgeMsg && (
              <div key={nudgeKey} id="answer-error" role="alert" className={styles.nudge}>
                {nudgeMsg}
              </div>
            )}
            <div className={styles.cardInner}>
              <h1 id="application-question" tabIndex={-1}>{q.question}</h1>
              {q.subtext && <p className={styles.description}>{q.subtext}</p>}
              {q.key === 'guardian' && isMinor(form) && <p className={styles.description}>Because you&apos;re under 18, a parent or legal guardian needs to be involved.</p>}
              {renderInput()}
            </div>
          </section>
          <div className={styles.timeEstimate}>
            <p className={styles.timeLabel}>
              {allAnswered && <svg className={styles.completionCheck} viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" /></svg>}
              {!almostThere && 'Approx. '}<span key={timeLabel} className={styles.timeValue}>{timeLabel}</span>{!almostThere && ' left'}
            </p>
          </div>
          {progressSaveFailed && <p role="status" className={styles.saveNotice}>Connection interrupted. Retrying your save. Your draft is also stored on this browser when storage is available.</p>}
          <div className={styles.navigation}>
            {!isFirst && <GoBackButton onClick={retreat} />}
            <CTAButton onClick={advance} disabled={checkingEmail || !visible}
              className="min-h-[42px] flex-1 px-4 py-2 text-[18px] font-normal tracking-[-0.02em]">
              {checkingEmail ? 'Checking…' : editingReview ? 'Save and return to review' : isLast ? 'Review my answers' : 'Continue'}
            </CTAButton>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ApplyPage() {
  const [experience, setExperience] = useState<4 | 5 | null>(null);
  useEffect(() => {
    const version = applicationExperienceVersion(
      readFresh(STORAGE_KEY, DRAFT_TTL_MS),
      readFresh(SUBMITTED_KEY, SUBMITTED_TTL_MS),
    );
    // Resolve browser storage before mounting either form and its save effects.
    setExperience(version);
  }, []);
  if (experience === null) return <div role="status" style={{ minHeight: '100dvh', background: BG, display: 'grid', placeItems: 'center', color: '#70675f' }}>Loading your application…</div>;
  if (experience === 4) return <LegacyApplication onStartNew={() => setExperience(5)} />;
  return (
    <Suspense>
      <ApplyPageInner />
    </Suspense>
  );
}
