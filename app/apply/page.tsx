'use client';

import { useState, useEffect, useRef, useMemo, Fragment, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CTAButton } from '@/components/CTAButton';
import { EarlyBirdIcon } from '@/components/EarlyBirdIcon';
import { LocationInput } from '@/components/LocationInput';
import { SchoolInput } from '@/components/SchoolInput';
import { preloadCities } from '@/lib/cities';
import { preloadSchools } from '@/lib/schoolsIndex';
import { loadGeoHint } from '@/lib/geo';
import { SURFACE_LIGHT } from '@/lib/theme';
import Cal, { getCalApi } from '@calcom/embed-react';

// ── Design tokens (from Figma) ────────────────────────────────────────────────
const BG    = SURFACE_LIGHT;
const TERRA = '#B34929';
const CARD  = '#FFFFFF';

// ── Form data ─────────────────────────────────────────────────────────────────
type FormData = {
  full_name: string;
  age: string;
  city_state: string;
  email: string;
  phone: string;
  device_access: string;
  position: string;
  years_playing: string;
  current_team_school: string;
  biggest_weakness: string;
  social_link: string;
  time_commitment: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_aware: string;
  goal: string;
  heard_about: string;
};

const EMPTY: FormData = {
  full_name: '', age: '', city_state: '',
  email: '', phone: '', device_access: '', position: '', years_playing: '',
  current_team_school: '', biggest_weakness: '', social_link: '',
  time_commitment: '',
  guardian_name: '', guardian_phone: '', guardian_email: '', guardian_aware: '',
  goal: '',
  heard_about: '',
};

// ── Questions ─────────────────────────────────────────────────────────────────
// A "group" screen bundles a few short fields onto one card instead of
// burning a full screen per field — used for contact info and for the
// parent/supporter block (see buildQuestions).
type SubField =
  | { field: keyof FormData; kind: 'text' | 'email' | 'tel'; label: string; placeholder: string }
  | { field: keyof FormData; kind: 'radio-grid'; label: string; options: string[] };

type Q =
  | { section: string; question: string; field: keyof FormData; type: 'text' | 'email' | 'tel' | 'number'; placeholder: string }
  | { section: string; question: string; field: keyof FormData; type: 'textarea'; placeholder: string }
  | { section: string; question: string; field: keyof FormData; type: 'location' }
  | { section: string; question: string; field: keyof FormData; type: 'school' }
  | { section: string; question: string; field: keyof FormData; type: 'radio-grid'; subtext?: string; options: string[] }
  | { section: string; question: string; field: keyof FormData; type: 'choice'; options: string[] }
  | { section: string; question: string; type: 'group'; kind: 'contact' | 'game' | 'parent'; subtext?: string; subs: SubField[] };

// Every applicant now books a discovery call as the closing step, and the
// call recovers what the "why" essays used to ask for far better than a text
// box can — so those are cut. What's left is what the call genuinely can't
// produce in advance: contact info, a pre-call read on the player, and the
// parent who actually pays, looped in before the call happens.
function buildQuestions(): Q[] {
  const qs: Q[] = [
    { section: 'Info', question: "What's your full name?", field: 'full_name', type: 'text', placeholder: 'First and last name' },
    { section: 'Info', question: 'How old are you?', field: 'age', type: 'number', placeholder: '17' },
    { section: 'Info', question: 'Where are you from?', field: 'city_state', type: 'location' },
    {
      section: 'Info', question: 'Where can we reach you?', type: 'group', kind: 'contact',
      subs: [
        { field: 'email', kind: 'email', label: 'Email', placeholder: 'you@email.com' },
        { field: 'phone', kind: 'tel', label: 'Phone number', placeholder: '416-605-2033' },
      ],
    },
    {
      section: 'Info', question: 'What device do you usually use to review film?', field: 'device_access', type: 'radio-grid',
      subtext: "Any of these will work. We'll help you get set up.",
      options: ['Laptop or desktop', 'iPad or tablet', 'Phone', "I'm not sure yet"],
    },
    {
      section: 'Your game', question: 'Tell us about your game', type: 'group', kind: 'game',
      subs: [
        { field: 'position', kind: 'radio-grid', label: 'Position', options: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Multiple positions'] },
        { field: 'years_playing', kind: 'radio-grid', label: 'Years playing competitively', options: ['Less than 1 year', '1–2 years', '3–4 years', '5+ years'] },
      ],
    },
    { section: 'Your game', question: 'Current team or school?', field: 'current_team_school', type: 'school' },
    { section: 'Your game', question: "What's your biggest weakness as a player right now?", field: 'biggest_weakness', type: 'textarea', placeholder: 'Be honest. Self-awareness is the first thing Jaiden looks for.' },
    { section: 'Your game', question: "What's your @ on Instagram or Twitter (X)?", field: 'social_link', type: 'text', placeholder: '@yourusername' },
    {
      section: 'The ceiling',
      question: "What's the highest you see this going for you and what makes you believe it?",
      field: 'goal',
      type: 'textarea',
      placeholder: 'Be honest pro, D1, or wherever you truly see it. Then tell me why.',
    },
    { section: 'Your commitment', question: 'How much time can you realistically commit per day?', field: 'time_commitment', type: 'radio-grid', options: ['30–45 minutes', '1 hour', '1.5–2 hours', '2+ hours'] },
  ];

  // The buyer is the parent on the overwhelming majority of applications, and
  // a discovery call booked by the player alone is a call with the wrong person
  // in the room. Asked of everyone regardless of age — this is a prep-age
  // audience, and even an adult applicant usually has a parent in the decision.
  qs.push(
    {
      section: 'Parent / Supporter', question: "Who's the parent or supporter we're looping in?", type: 'group', kind: 'parent',
      subtext: "Whoever's helping you make this decision. We'll keep them in the loop.",
      subs: [
        { field: 'guardian_name', kind: 'text', label: 'Their name', placeholder: 'Full name' },
        { field: 'guardian_phone', kind: 'tel', label: 'Their phone number', placeholder: '416-605-2033' },
        { field: 'guardian_email', kind: 'email', label: 'Their email', placeholder: 'their@email.com' },
      ],
    },
    { section: 'Parent / Supporter', question: "Have you told them you're applying?", field: 'guardian_aware', type: 'choice', options: ['Yes', 'No'] },
  );

  // Always the last question — where the lead actually came from.
  qs.push({
    section: 'One more thing',
    question: 'How did you hear about this?',
    field: 'heard_about',
    type: 'radio-grid',
    options: ['Instagram post', 'Instagram DM', 'Instagram story', 'A friend or teammate', 'From Jaiden directly', 'Other'],
  });

  return qs;
}

// Used when a saved draft's screen index can no longer be trusted (see
// DRAFT_VERSION below) — walks the CURRENT question order and returns the
// screen number of the first still-incomplete REQUIRED question. Optional
// fields (currently just heard_about) are skipped entirely regardless of
// whether they're filled, so nobody gets bounced back to a field they
// deliberately left blank.
function firstIncompleteScreen(qs: Q[], form: FormData, optional: Set<keyof FormData>): number {
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    if (q.type === 'group') {
      const incomplete = q.subs.some(sub => !optional.has(sub.field) && !form[sub.field].toString().trim());
      if (incomplete) return i + 1;
      continue;
    }
    if (!optional.has(q.field) && !form[q.field].toString().trim()) return i + 1;
  }
  return qs.length;
}

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
// Bump this whenever buildQuestions()'s order changes. A stored draft whose
// version doesn't match has its screen index discarded (its typed answers
// are kept) and gets re-resumed at the first incomplete required question
// instead — a raw array index from a prior question order can silently
// point at the wrong question, or skip one, after a reorder. See the restore
// effect below and firstIncompleteScreen() above.
const DRAFT_VERSION = 2;
// Attribution is the one non-load-bearing field left — it's also the very
// last screen before Submit, so any bug in its validation would block every
// application behind it. Not worth that risk for a "how'd you hear about
// us" answer.
const OPTIONAL = new Set<keyof FormData>(['heard_about']);
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

// ── Radio button style (shared by standalone radio-grid questions and the
//    smaller grids inside a group card) ────────────────────────────────────
function radioBtnStyle(active: boolean, compact: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: compact ? 10 : 12,
    padding: compact ? '12px 14px' : '16px 18px',
    borderRadius: 12,
    border: active ? `1.5px solid ${TERRA}` : '1px solid rgba(0,0,0,0.08)',
    background: '#ffffff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: compact ? 14 : 15,
    fontWeight: 400,
    letterSpacing: '-0.02em',
    color: 'rgba(0,0,0,0.75)',
    textAlign: 'left',
    transition: 'border-color 0.15s ease',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.05)',
  };
}
function radioCircleStyle(active: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: active ? `1.5px solid ${TERRA}` : '1.5px solid rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.15s ease',
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
function ApplyPageInner() {
  const searchParams = useSearchParams();
  const claimsEarlyPricing = searchParams.get('early_pricing') === 'true';
  // The URL param is only a request — a shared or stale link shouldn't promise a
  // price we won't honour. Confirm against the server before showing $800
  // anywhere; /api/apply re-checks again at write time regardless.
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
  const [nudgeType, setNudgeType]   = useState<'error' | 'info'>('error');
  const [nudgeKey, setNudgeKey]     = useState(0);
  const [attempts, setAttempts]     = useState(0);
  const [shaking, setShaking]       = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const inputRef   = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const advanceRef = useRef<() => void>(() => {});
  const resumeScreenRef = useRef(1);
  // Set while the server is being asked whether a resumed application has its
  // call booked yet. "Let's Begin" awaits it so the answer decides the screen,
  // rather than the check racing the click.
  const resumePendingRef = useRef<Promise<void> | null>(null);
  // Set when city_state came from the picker. A value the dropdown offered must
  // never be rejected by the validator, independent of the heuristics.
  const cityFromPicker = useRef(false);

  // Every applicant answers the parent block, so the question list is fixed —
  // no age branching, and therefore no way for a back-edit to the age field to
  // resize the flow underneath someone mid-application.
  const questions = useMemo(() => buildQuestions(), []);
  const TOTAL = questions.length;

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
        setForm(f);
        if (v === DRAFT_VERSION && s >= 1) {
          resumeScreenRef.current = Math.min(s, TOTAL);
        } else {
          // Stale draft from before a question-order change (or from before
          // versioning existed at all) — the saved index can't be trusted to
          // point at the right question anymore, but the typed answers are
          // still good. Resume at the first incomplete required question
          // instead of trusting the index.
          resumeScreenRef.current = Math.min(firstIncompleteScreen(questions, f, OPTIONAL), TOTAL);
        }
      }
    } catch {}
  }, [questions, TOTAL]);

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
      full_name?: string; email?: string; guardian_email?: string | null;
    } | null;
    if (!info?.email) return; // nothing to resume — stay on the intro

    const email = info.email;
    setForm(f => ({
      ...f,
      full_name: info.full_name || f.full_name,
      email: email || f.email,
      guardian_email: info.guardian_email || f.guardian_email,
    }));
    resumeScreenRef.current = TOTAL + 1;

    resumePendingRef.current = fetch(`/api/apply/booking-status?email=${encodeURIComponent(email)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json?.booked) {
          dropKey(SUBMITTED_KEY);
          resumeScreenRef.current = TOTAL + 2;
        }
      })
      .catch(() => {})
      .finally(() => { resumePendingRef.current = null; });
  }, [TOTAL]);

  // Auto-save draft whenever form or screen changes (skip intro + success)
  useEffect(() => {
    if (screen < 1 || screen > TOTAL) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, screen, version: DRAFT_VERSION, savedAt: Date.now() })); } catch {}
  }, [form, screen, TOTAL]);

  // The embed's bookingSuccessfulV2 event is a client-side postMessage — a
  // hint that booking probably just succeeded, not proof (the same reasoning
  // that applies to any client-only signal gating something real). It never
  // flips the screen by itself; it only kicks off a short poll of our own
  // server-confirmed status, which is the one thing allowed to do that.
  useEffect(() => {
    if (screen !== TOTAL + 1) return;
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
          setScreen(TOTAL + 2);
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
  }, [screen, form.email, TOTAL]);

  // Keep advanceRef fresh every render so the keydown handler always calls latest advance
  // (assigned after advance is defined below — see comment there)

  // Focus input when screen changes
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 260);
    return () => clearTimeout(t);
  }, [screen]);

  // Enter key to advance (Cmd/Ctrl+Enter for textareas)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
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

  const fireNudge = (msg: string, type: 'error' | 'info' = 'error') => {
    setNudgeType(type);
    setNudgeMsg(msg);
    setNudgeKey(k => k + 1);
  };

  const goTo = (next: number) => {
    setError(null);
    setNudgeMsg(null);
    setNudgeKey(0);
    setAttempts(0);
    setShaking(false);
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
  };

  // Escalating messages when field is empty
  const VALIDATION: Partial<Record<keyof FormData, string[]>> = {
    full_name:           ["Name pls", "First and last name", "FULL NAME. GO."],
    age:                 ["How old are you?", "Age. Just a number.", "YOUR AGE. TYPE IT."],
    city_state:          ["Where are you based?", "City and province/state please", "WHERE ARE YOU FROM?!"],
    email:               ["We'll need your email", "Email address please", "YOUR EMAIL. NOW."],
    phone:               ["Add a phone number", "Phone number, please", "PHONE NUMBER!!"],
    device_access:       ["What device do you use?", "Pick one", "PICK ONE!!"],
    position:            ["Pick your position", "Choose one", "PICK. A. POSITION."],
    years_playing:       ["How long have you been playing?", "Pick one, be honest", "YEARS PLAYING. PICK ONE."],
    current_team_school: ["What team or school?", "Team or school name please", "TEAM. OR. SCHOOL."],
    biggest_weakness:    ["Be honest here", "Something, anything", "YOUR WEAKNESS. TELL US."],
    social_link:         ["Drop your @ handle", "We need to see your account", "YOUR @. NOW."],
    time_commitment:     ["How much time can you give?", "Pick a time commitment", "PICK ONE!!"],
    guardian_name:       ["Add their name", "Parent or supporter name", "NAME. NOW."],
    guardian_phone:      ["Add their number", "Their phone number please", "THEIR NUMBER. GO."],
    guardian_email:      ["We'll need their email", "Their email please", "EMAIL. NOW."],
    guardian_aware:      ["Yes or no?", "Pick one", "YES. OR. NO."],
    goal:                ["Tell us how high you see this going", "Where do you see this going?", "YOUR CEILING. TELL US."],
  };

  // Escalating messages when content doesn't pass validation
  const VALIDATION_BAD: Partial<Record<keyof FormData, string[]>> = {
    full_name:           ["Include first and last name", "e.g. Marcus Thompson", "FIRST AND LAST NAME."],
    city_state:          ["Needs to be 'City, Province' format", "e.g. Mississauga, Ontario", "CITY, PROVINCE. THAT'S IT."],
    age:                 ["Age must be between 13 and 35", "Enter a real age", "REAL AGE. 13–35."],
    email:               ["That's not a valid email", "Try name@email.com", "VALID EMAIL ONLY."],
    phone:               ["Needs at least 10 digits", "Full phone number please", "REAL PHONE NUMBER."],
    current_team_school: ["Give us a real team or school name", "More than one letter", "TEAM OR SCHOOL NAME."],
    biggest_weakness:    ["Give more detail than that", "Dig deeper, be specific", "ACTUALLY ANSWER IT."],
    social_link:         ["That doesn't look like a real handle", "Just your @, like @yourusername", "REAL HANDLE."],
    guardian_name:       ["That doesn't look like a full name", "Letters only please", "REAL NAME."],
    guardian_phone:      ["Needs at least 10 digits", "Full phone number please", "REAL PHONE NUMBER."],
    guardian_email:      ["That's not a valid email", "Try name@email.com", "VALID EMAIL ONLY."],
    goal:                ["Give more than that. Level and why.", "Say the level, then why you believe it", "LEVEL. AND. WHY."],
  };

  // Returns true if the value fails content validation for that field
  const validateContent = (field: keyof FormData, v: string): boolean => {
    const isGibberishName = (s: string) =>
      !/[aeiou]/i.test(s) ||                    // no vowels at all
      /[^aeiou\s''\-]{5,}/i.test(s) ||          // 5+ consecutive consonants
      /(.)\1{3,}/.test(s);                       // same char repeated 4+ times

    const isGibberishText = (s: string) =>
      s.trim().split(/\s+/).length < 3 ||        // fewer than 3 words
      /(.)\1{4,}/.test(s) ||                     // same char repeated 5+ times
      /^(.{1,4})\1{3,}/.test(s);                 // short pattern repeated (asdasdasd)

    const isDisengaged = (s: string) => {
      if (s.length > 100) return false; // long answers are fine
      const lower = s.toLowerCase();
      const bad = ['nothing', ' none', 'idk', 'no weakness', 'i am the best', 'best at everything',
                   'no flaws', "don't have any", 'i have no weakness', 'n/a', 'no idea',
                   'i have none', 'everything is fine', 'i\'m perfect', 'not applicable', 'good at everything'];
      return bad.some(p => lower.includes(p));
    };

    switch (field) {
      case 'full_name': {
        const parts = v.trim().split(/\s+/);
        if (parts.length < 2) return true;
        return parts.some(p => p.length < 2 || !/^[a-zA-ZÀ-ÿ''\-]+$/.test(p) || isGibberishName(p));
      }
      case 'guardian_name':
        return v.length < 2 || !/^[a-zA-ZÀ-ÿ\s''\-]+$/.test(v) || isGibberishName(v);
      case 'age': {
        const n = parseInt(v);
        return isNaN(n) || n < 13 || n > 35;
      }
      case 'email':
      case 'guardian_email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      case 'phone':
      case 'guardian_phone':
        return v.replace(/[\s\-\(\)\+\.]/g, '').length < 10 || !/^[\d\s\-\(\)\+\.]+$/.test(v);
      case 'city_state': {
        if (!v.includes(',')) return true;                   // must have city, province format
        const [city, region] = v.split(',').map(s => s.trim());
        if (!city || city.length < 2) return true;           // city must exist
        if (!region || region.length < 2) return true;       // region must exist
        // Fold accents before the heuristics, or Köln / Ürümqi / Cần Thơ read as
        // consonant mash. y counts as a vowel (Lynn, Spry, Zephyrhills), and
        // . / digits are separators (St. John's, Hounsfield Heights/Briar Hill).
        const base = city.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
        if (!/[aeiouy]/.test(base)) return true;             // city must have vowels
        if (/[^aeiouy\s'’\-./0-9]{6,}/.test(base)) return true; // no consonant mashing
        return false;
      }
      case 'current_team_school':
        return v.length < 3;
      case 'social_link': {
        const s = v.trim().toLowerCase();
        // The @ is optional. The field asks for "@yourusername", but plenty of
        // people type the username alone and mean exactly the same thing —
        // rejecting that is the confusion this question is meant to avoid.
        const looksLikeHandle = /^@?[a-z0-9._]{2,}$/.test(s);
        // Still accept a pasted profile link, since that's what the question
        // used to ask for and some applicants will paste one out of habit.
        const looksLikeUrl = /(instagram\.com|twitter\.com|x\.com)\/[a-z0-9._]{2,}/.test(s);
        return !(looksLikeHandle || looksLikeUrl);
      }
      case 'biggest_weakness':
        return v.length < 20 || isGibberishText(v) || isDisengaged(v);
      case 'goal':
        // Two-part answer (a level, then the reasoning) — asks for a little
        // more length than the single-beat weakness question.
        return v.length < 25 || isGibberishText(v);
      default:
        return false;
    }
  };


  // Fire-and-forget partial save the moment we have contact info, so an
  // applicant who abandons the form later is still a reachable lead instead
  // of a total loss. Safe to call more than once — the backend upserts by
  // email, so a later correction just updates the same draft row.
  const saveProgress = () => {
    const payload = {
      email: form.email,
      phone: form.phone,
      first_name: form.full_name.trim().split(/\s+/)[0] || '',
      last_name: form.full_name.trim().split(/\s+/).slice(1).join(' '),
      athlete_name: form.full_name.trim(),
      athlete_email: form.email,
      athlete_phone: form.phone,
      age: form.age ? parseInt(form.age) : null,
      city: form.city_state,
      submitted_at: new Date().toISOString(),
    };
    fetch('/api/apply/save-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => { /* best-effort — final submit is still the source of truth */ });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const [firstName, ...nameParts] = form.full_name.trim().split(/\s+/);
    const lastName = nameParts.join(' ');
    const payload = {
      athlete_name:  form.full_name.trim(),
      athlete_email: form.email,
      athlete_phone: form.phone,
      first_name:    firstName || '',
      last_name:     lastName || '',
      email:         form.email,
      phone:         form.phone,
      device_access: form.device_access,
      age:          form.age ? parseInt(form.age) : null,
      city:         form.city_state,
      position:     form.position,
      years_playing: form.years_playing
                      ? (form.years_playing.toLowerCase().includes('less') ? 0 : parseInt(form.years_playing.match(/\d+/)?.[0] ?? '0'))
                      : null,
      current_team:        form.current_team_school,
      current_team_school: form.current_team_school,
      biggest_weakness:    form.biggest_weakness,
      goal:                form.goal,
      social_link:         form.social_link,
      time_commitment:     form.time_commitment,
      parent_name:         form.guardian_name || null,
      guardian_name:       form.guardian_name || null,
      parent_phone:        form.guardian_phone || null,
      guardian_phone:      form.guardian_phone || null,
      parent_email:        form.guardian_email || null,
      guardian_email:      form.guardian_email || null,
      parent_aware:        form.guardian_aware || null,
      guardian_aware:      form.guardian_aware || null,
      heard_about:         form.heard_about || null,
      early_pricing:     earlyPricing || null,
      submitted_at:      new Date().toISOString(),
      status:            'pending',
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
        // The form is done, but the application isn't — booking is what's
        // left. Keep just enough to resume straight into the booking step
        // (or the confirmed screen) if this tab closes before that happens.
        localStorage.setItem(SUBMITTED_KEY, JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email,
          guardian_email: form.guardian_email || null,
          savedAt: Date.now(),
        }));
      } catch {}
      goTo(TOTAL + 1);
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
    if (checkingEmail) return;
    const q = questions[screen - 1];
    // The last screen can be the guardian_aware gate, which — unlike the old
    // form's optional last question — has a hard validation rule. Submit only
    // fires after that rule (and everything else below) passes.
    const finish = () => { if (screen === TOTAL) handleSubmit(); else goTo(screen + 1); };

    if (q.type === 'group') {
      for (const sub of q.subs) {
        const v = form[sub.field].toString().trim();
        if (!v) {
          const msgs = VALIDATION[sub.field] ?? ["Fill this in to continue", "Still need this", "FILL IT IN."];
          fireNudge(msgs[attempts % msgs.length]);
          setAttempts(a => a + 1);
          triggerShake();
          return;
        }
        if (validateContent(sub.field, v)) {
          const msgs = VALIDATION_BAD[sub.field] ?? ["That doesn't look right", "Check your answer", "FIX IT."];
          fireNudge(msgs[attempts % msgs.length]);
          setAttempts(a => a + 1);
          triggerShake();
          return;
        }
        // Block a repeat applicant right at the email step instead of after the
        // whole form. Fail-open on network errors — the final submit still guards.
        if (sub.field === 'email') {
          setCheckingEmail(true);
          try {
            const res = await fetch(`/api/apply/check-email?email=${encodeURIComponent(v)}`);
            const json = await res.json();
            if (json.exists) {
              fireNudge("Email in use");
              triggerShake();
              setCheckingEmail(false);
              return;
            }
          } catch { /* fail-open */ }
          setCheckingEmail(false);
        }
      }
      if (q.kind === 'contact') saveProgress();
      finish();
      return;
    }

    const v = form[q.field].toString().trim();
    if (!OPTIONAL.has(q.field) && !v) {
      const msgs = VALIDATION[q.field] ?? ["Fill this in to continue", "Still need this", "FILL IT IN."];
      fireNudge(msgs[attempts % msgs.length]);
      setAttempts(a => a + 1);
      triggerShake();
      return;
    }
    const pickerVouched = q.field === 'city_state' && cityFromPicker.current;
    if (v && !pickerVouched && validateContent(q.field, v)) {
      const msgs = VALIDATION_BAD[q.field] ?? ["That doesn't look right", "Check your answer", "FIX IT."];
      fireNudge(msgs[attempts % msgs.length]);
      setAttempts(a => a + 1);
      triggerShake();
      return;
    }
    // A minor can't book alone — they need to have told their parent before
    // moving on, not just claim they will.
    if (q.field === 'guardian_aware' && v !== 'Yes') {
      fireNudge("Loop them in first");
      setAttempts(a => a + 1);
      triggerShake();
      return;
    }
    finish();
  };
  const retreat = () => { if (screen > 1) goTo(screen - 1); };

  // Escape hatch off the resumed booking step. Someone who lands there from a
  // previous session — a different applicant on a shared device, or the same
  // one starting over — otherwise has no route back into the form at all.
  const startOver = () => {
    dropKey(STORAGE_KEY);
    dropKey(SUBMITTED_KEY);
    resumeScreenRef.current = 1;
    resumePendingRef.current = null;
    setForm(EMPTY);
    goTo(0);
  };

  // Keep advanceRef pointing to the latest advance closure
  advanceRef.current = advance;

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
          Let's Begin
        </CTAButton>
      </div>
    </div>
  );

  // ── Booking (final step) ─────────────────────────────────────────────────
  // The application isn't the review anymore — the call is. This screen's
  // only job is getting a booked call, embedded right here instead of
  // sending the applicant off to another tab, with the parent locked in as
  // a guest on the invite.
  if (screen === TOTAL + 1) {
    const calConfig: Record<string, string | string[]> = {
      theme: 'dark',
      name: form.full_name.trim(),
      email: form.email,
    };
    if (form.guardian_email) calConfig.guests = [form.guardian_email];

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
              Application in. Now the real part.
            </p>
            <p style={{ ...text(15, 400, 'rgba(0,0,0,0.45)'), lineHeight: 1.5, margin: 0 }}>
              The application tells us you&apos;re serious. The call tells us if we&apos;re a fit, and it&apos;s the last step. Grab a time you and your parent can both sit down for it, this one&apos;s a family decision.
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
            <a href="/" style={{ ...text(13, 400, 'rgba(0,0,0,0.35)'), textDecoration: 'none', letterSpacing: '0.03em' }}>
              ← Back to home
            </a>
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
  if (screen === TOTAL + 2) return (
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
        <a href="/" style={{ ...text(13, 400, 'rgba(0,0,0,0.35)'), textDecoration: 'none', letterSpacing: '0.03em' }}>
          ← Back to home
        </a>
      </div>
    </div>
  );

  // ── Question / group screens ─────────────────────────────────────────────
  const qi  = screen - 1;
  const q   = questions[qi];
  const isFirst = screen === 1;
  const isLast  = screen === TOTAL;
  const progress = (screen / TOTAL) * 100;
  const numLabel = String(screen).padStart(2, '0');

  // Frame 424 input style — no fill, 5% black border, 30% drop shadow
  const inputBoxStyle: React.CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    border: '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: '0px 6px 14px rgba(0, 0, 0, 0.08)',
    borderRadius: 12,
    padding: '20px 10px',
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: '-0.02em',
    lineHeight: '18px',
    color: '#000000',
    background: '#ffffff',
    outline: 'none',
    fontFamily: 'inherit',
  };

  const renderGroupSub = (sub: SubField) => {
    if (sub.kind === 'radio-grid') {
      const val = form[sub.field];
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%' }}>
          {sub.options.map(opt => {
            const active = val === opt;
            return (
              <button
                key={opt}
                type="button"
                className="tdt-radio-btn"
                onClick={() => { setForm(f => ({ ...f, [sub.field]: opt })); setNudgeMsg(null); }}
                style={radioBtnStyle(active, true)}
              >
                <span style={radioCircleStyle(active)}>
                  {active && <span style={{ width: 10, height: 10, borderRadius: '50%', background: TERRA, display: 'block' }} />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <input
        type={sub.kind}
        value={form[sub.field]}
        onChange={set(sub.field)}
        placeholder={sub.placeholder}
        style={{ ...inputBoxStyle, padding: '16px 10px' }}
      />
    );
  };

  const renderInput = () => {
    if (q.type === 'group') return null; // rendered separately — see the JSX branch above

    if (q.type === 'textarea') {
      return (
        <textarea
          ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
          value={form[q.field]}
          onChange={set(q.field)}
          placeholder={'placeholder' in q ? q.placeholder : ''}
          rows={4}
          style={{ ...inputBoxStyle, resize: 'none', lineHeight: 1.55 }}
        />
      );
    }

    if (q.type === 'location') {
      return (
        <LocationInput
          ref={inputRef as unknown as React.RefObject<HTMLInputElement>}
          value={form[q.field]}
          onChange={v => {
            cityFromPicker.current = false;
            setForm(f => ({ ...f, [q.field]: v }));
            setNudgeMsg(null);
          }}
          onCommit={() => { cityFromPicker.current = true; }}
          baseStyle={inputBoxStyle}
        />
      );
    }

    if (q.type === 'school') {
      return (
        <SchoolInput
          ref={inputRef as unknown as React.RefObject<HTMLInputElement>}
          value={form[q.field]}
          onChange={v => { setForm(f => ({ ...f, [q.field]: v })); setNudgeMsg(null); }}
          baseStyle={inputBoxStyle}
        />
      );
    }

    if (q.type === 'radio-grid') {
      const val = form[q.field];
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
          {q.options.map(opt => {
            const active = val === opt;
            return (
              <button
                key={opt}
                type="button"
                className="tdt-radio-btn"
                onClick={() => { setForm(f => ({ ...f, [q.field]: opt })); setNudgeMsg(null); }}
                style={radioBtnStyle(active, false)}
              >
                <span style={radioCircleStyle(active)}>
                  {active && <span style={{ width: 10, height: 10, borderRadius: '50%', background: TERRA, display: 'block' }} />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === 'choice') {
      const val = form[q.field];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {q.options.map(opt => {
              const active = val === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  className="tdt-choice-btn"
                  onClick={() => { setForm(f => ({ ...f, [q.field]: opt })); setNudgeMsg(null); }}
                  style={{
                    ...inputBoxStyle,
                    flex: 1,
                    boxShadow: active ? 'none' : '0px 1px 4px rgba(0,0,0,0.05)',
                    border: active ? `1.5px solid ${TERRA}` : '1px solid rgba(0,0,0,0.05)',
                    background: active ? 'rgba(179,73,41,0.06)' : '#ffffff',
                    color: active ? TERRA : 'rgba(0,0,0,0.3)',
                    fontWeight: active ? 500 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {q.field === 'guardian_aware' && val === 'No' && (
            <div style={{ width: '100%', padding: '14px 16px', borderRadius: 12, background: 'rgba(179,73,41,0.06)', border: '1px solid rgba(179,73,41,0.15)' }}>
              <p style={{ ...text(14, 400, 'rgba(0,0,0,0.6)'), lineHeight: 1.6, margin: 0 }}>
                Go tell them first. This is a real commitment and they&apos;re part of it. Better they hear it from you now than find out later. Hit Yes once they know.
              </p>
            </div>
          )}
        </div>
      );
    }

    // A numeric question renders as `tel`, not `number` or inputMode="numeric".
    // Both of those land iOS on the full keyboard's number plane, which keeps an
    // ABC key to switch back to letters. `tel` is the only one that raises the
    // 12-key dialer pad — the same keyboard the phone fields in this form get.
    // A number input also hands back "" for anything it considers malformed, so
    // a stray character silently wipes what was typed; `tel` keeps the raw
    // string for the 13–35 check in invalid(), and `set` strips non-digits.
    //
    // min/max are gone with it: they only bind on a number input, there is no
    // <form> here to run native validation, and they said 10–80 while the real
    // rule is 13–35.
    const isNumeric = q.type === 'number';
    return (
      <input
        ref={inputRef as unknown as React.RefObject<HTMLInputElement>}
        type={isNumeric ? 'tel' : q.type}
        inputMode={isNumeric ? 'tel' : undefined}
        pattern={isNumeric ? '[0-9]*' : undefined}
        maxLength={isNumeric ? 3 : undefined}
        // Without this the dialer pad drags a phone-number autofill bar with it.
        autoComplete={isNumeric ? 'off' : undefined}
        value={form[q.field]}
        onChange={set(q.field)}
        placeholder={'placeholder' in q ? q.placeholder : ''}
        style={inputBoxStyle}
      />
    );
  };

  return (
    <div style={{ minHeight: '100dvh', background: BG }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap');
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        ::placeholder { color: rgba(0,0,0,0.3); font-family: inherit; font-size: 16px; font-weight: 400; letter-spacing: -0.02em; }
        @keyframes tdt-nudge-in {
          from { opacity: 0; transform: translateX(-50%) translateY(14px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0px); }
        }
        @keyframes tdt-shake {
          0%,100% { transform: translateX(0) rotate(0deg); }
          12%  { transform: translateX(-9px) rotate(-0.5deg); }
          25%  { transform: translateX(9px)  rotate(0.5deg); }
          37%  { transform: translateX(-7px) rotate(-0.3deg); }
          50%  { transform: translateX(7px)  rotate(0.3deg); }
          62%  { transform: translateX(-4px); }
          75%  { transform: translateX(4px); }
          87%  { transform: translateX(-2px); }
        }
        @keyframes tdt-pop-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tdt-loc-row-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tdt-loc-row { animation: tdt-loc-row-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) {
          .tdt-loc-panel,
          .tdt-loc-row { animation: none !important; transition: none !important; }
        }
        @media (max-width: 639px) {
          .tdt-loc-row { padding: 13px 12px !important; }
          .tdt-card { padding: 28px 16px !important; border-radius: 20px !important; }
          .tdt-card-inner { padding-left: 0 !important; padding-right: 0 !important; }
          .tdt-question-text { font-size: 17px !important; line-height: 24px !important; }
          .tdt-section-label { font-size: 15px !important; margin-bottom: 16px !important; }
          .tdt-radio-btn { padding: 12px !important; font-size: 14px !important; gap: 10px !important; }
          .tdt-choice-btn { padding: 16px 8px !important; font-size: 15px !important; }
          .tdt-outer { padding: 70px 20px 80px !important; }
        }
      `}</style>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.07)', zIndex: 50 }}>
        <div style={{ height: '100%', background: TERRA, width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Back link */}
      <Link
        href="/"
        aria-label="Back to website"
        style={{ position: 'fixed', top: 20, left: 24, ...text(13, 400, 'rgba(0,0,0,0.32)'), textDecoration: 'none', letterSpacing: '0.01em', zIndex: 50 }}
      >
        ← Learn More
      </Link>

      {/* Question */}
      <div className="tdt-outer" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 100px' }}>
        <div style={{ ...fadeStyle, width: '100%', maxWidth: 700 }}>

          {/* Section label */}
          <p className="tdt-section-label" style={{ ...text(16, 500, TERRA), textAlign: 'center', marginBottom: 20 }}>
            {q.section}
          </p>

          {/* Frame 421 wrapper — gap: 10px between card and nav */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>

            {/* Frame 422 — the card */}
            <div
              className="tdt-card"
              onAnimationEnd={() => setShaking(false)}
              style={{
                boxSizing: 'border-box',
                width: '100%',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                borderRadius: 32,
                padding: '44px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 10,
                position: 'relative',
                animation: shaking ? 'tdt-shake 0.45s ease' : 'none',
              }}>
              {/* Single placeholder logo badge — top-center of the card, overlapping
                  the top edge. Only for the school question; swap for the selected
                  school's real logo once assets exist. */}
              {q.type === 'school' && (
                <div
                  style={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '1px solid rgba(0,0,0,0.08)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3L2 8l10 5 10-5-10-5z" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M6 10.5V16c0 1 2.5 3 6 3s6-2 6-3v-5.5" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {/* Validation / nudge pill — remounts on key change to replay animation */}
              {nudgeMsg && (
                <div key={nudgeKey} style={{
                  position: 'absolute',
                  top: 30,
                  left: '50%',
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '5px 10px',
                  gap: 10,
                  background: nudgeType === 'info' ? '#E6F4EC' : '#FFE2E2',
                  borderRadius: 36,
                  height: 28,
                  pointerEvents: 'none',
                  zIndex: 2,
                  whiteSpace: 'nowrap',
                  animation: 'tdt-nudge-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
                }}>
                  <span style={{
                    fontFamily: 'inherit',
                    fontWeight: 400,
                    fontSize: 12,
                    lineHeight: '18px',
                    letterSpacing: '-0.02em',
                    color: nudgeType === 'info' ? '#1A7A3F' : '#FF5050',
                  }}>
                    {nudgeMsg}
                  </span>
                </div>
              )}
              {/* Frame 425 — number row */}
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }}>
                <span style={{
                  fontFamily: "'Digital Numbers', 'Courier New', monospace",
                  fontSize: 14,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  lineHeight: '18px',
                  color: '#000000',
                  opacity: 0.3,
                }}>
                  {numLabel}
                </span>
              </div>

              {/* Frame 423 — question + input */}
              <div className="tdt-card-inner" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0px 50px',
                gap: 20,
                width: '100%',
                boxSizing: 'border-box',
              }}>
                <p className="tdt-question-text" style={{
                  width: '100%',
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  lineHeight: '28px',
                  color: '#000000',
                  opacity: 0.5,
                  margin: 0,
                  fontFamily: 'inherit',
                }}>
                  {q.question}
                </p>
                {q.type === 'group' ? (
                  <>
                    {q.subtext && (
                      <p style={{ ...text(14, 400, 'rgba(0,0,0,0.4)'), lineHeight: 1.6, margin: '-10px 0 0', width: '100%' }}>
                        {q.subtext}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
                      {q.subs.map(sub => (
                        <div key={sub.field} style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                          <p style={{ ...text(13, 500, 'rgba(0,0,0,0.4)'), margin: 0 }}>{sub.label}</p>
                          {renderGroupSub(sub)}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Fragment key={q.field}>
                    {q.type === 'radio-grid' && q.subtext && (
                      <p style={{ ...text(14, 400, 'rgba(0,0,0,0.4)'), lineHeight: 1.6, margin: '-10px 0 0', width: '100%' }}>
                        {q.subtext}
                      </p>
                    )}
                    {/* Keyed so two same-typed questions never share input state */}
                    {renderInput()}
                  </Fragment>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p style={{ ...text(13, 400, '#C0392B'), textAlign: 'center', width: '100%' }}>{error}</p>
            )}

            {/* Frame 426 — nav row, stretch so both buttons share the same height */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 10, width: '100%' }}>
              {!isFirst && <GoBackButton onClick={retreat} />}
              <CTAButton
                onClick={advance}
                className={`h-[42px] text-[18px] font-normal tracking-[-0.02em] ${isFirst ? 'w-full' : 'flex-1'}`}
              >
                {isLast ? (submitting ? 'Submitting…' : 'Submit') : (checkingEmail ? 'Checking…' : 'Next')}
              </CTAButton>
            </div>

            {isLast && (
              <p style={{ fontSize: 12, lineHeight: '18px', color: 'rgba(0,0,0,0.4)', textAlign: 'center', margin: 0 }}>
                By submitting, you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(0,0,0,0.55)', textDecoration: 'underline' }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(0,0,0,0.55)', textDecoration: 'underline' }}>
                  Privacy Policy
                </a>.
              </p>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense>
      <ApplyPageInner />
    </Suspense>
  );
}
