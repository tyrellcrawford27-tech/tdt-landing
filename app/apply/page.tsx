'use client';

import { useState, useEffect, useRef, forwardRef } from 'react';
import { CTAButton } from '@/components/CTAButton';

// ── Design tokens (from Figma) ────────────────────────────────────────────────
const BG    = '#FAF6F2';
const TERRA = '#B34929';
const CARD  = '#FFFFFF';

// ── Form data ─────────────────────────────────────────────────────────────────
type FormData = {
  first_name: string;
  last_name: string;
  age: string;
  city_state: string;
  email: string;
  phone: string;
  position: string;
  years_playing: string;
  current_team_school: string;
  biggest_weakness: string;
  goal: string;
  why_this_program: string;
  time_commitment: string;
  why_basketball: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email: string;
  guardian_aware: string;
  anything_else: string;
};

const EMPTY: FormData = {
  first_name: '', last_name: '', age: '', city_state: '',
  email: '', phone: '', position: '', years_playing: '',
  current_team_school: '', biggest_weakness: '', goal: '',
  why_this_program: '', time_commitment: '', why_basketball: '',
  guardian_name: '', guardian_phone: '', guardian_email: '',
  guardian_aware: '', anything_else: '',
};

// ── Questions ─────────────────────────────────────────────────────────────────
type Q =
  | { num: string; section: string; question: string; field: keyof FormData; type: 'text' | 'email' | 'tel' | 'number'; placeholder: string }
  | { num: string; section: string; question: string; field: keyof FormData; type: 'textarea'; placeholder: string }
  | { num: string; section: string; question: string; field: keyof FormData; type: 'location' }
  | { num: string; section: string; question: string; field: keyof FormData; type: 'radio-grid'; options: string[] }
  | { num: string; section: string; question: string; field: keyof FormData; type: 'choice'; options: string[] };

const QUESTIONS: Q[] = [
  { num: '01', section: 'Info',              question: "What's your first name?",                               field: 'first_name',          type: 'text',       placeholder: 'Type your answer here...' },
  { num: '02', section: 'Info',              question: "What's your last name?",                                field: 'last_name',           type: 'text',       placeholder: 'Type your answer here...' },
  { num: '03', section: 'Info',              question: 'How old are you?',                                      field: 'age',                 type: 'number',     placeholder: '17' },
  { num: '04', section: 'Info',              question: 'City, State / Province',                                field: 'city_state',          type: 'location' },
  { num: '05', section: 'Info',              question: "What's your email?",                                    field: 'email',               type: 'email',      placeholder: 'you@email.com' },
  { num: '06', section: 'Info',              question: "What's your phone number?",                             field: 'phone',               type: 'tel',        placeholder: '(416) 000-0000' },
  { num: '07', section: 'Your game',         question: 'What position do you play?',                            field: 'position',            type: 'radio-grid', options: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Multiple positions'] },
  { num: '08', section: 'Your game',         question: 'Years playing competitively',                           field: 'years_playing',       type: 'radio-grid', options: ['Less than 1 year', '1–2 years', '3–4 years', '5+ years'] },
  { num: '09', section: 'Your game',         question: 'Current team or school?',                               field: 'current_team_school', type: 'text',       placeholder: 'St. Marcellinus senior boys' },
  { num: '10', section: 'Your game',         question: "What's your biggest weakness as a player right now?",   field: 'biggest_weakness',    type: 'textarea',   placeholder: 'Be honest — self-awareness is the first thing Jaiden looks for.' },
  { num: '11', section: 'Your game',         question: "What's your goal?",                                     field: 'goal',                type: 'textarea',   placeholder: 'Play D1 and earn a scholarship' },
  { num: '12', section: 'Your commitment',   question: 'Why do you want to do this program specifically?',      field: 'why_this_program',    type: 'textarea',   placeholder: "What made you want to apply? What are you hoping changes after 100 days?" },
  { num: '13', section: 'Your commitment',   question: 'How much time can you realistically commit per day?',   field: 'time_commitment',     type: 'radio-grid', options: ['30–45 minutes', '1 hour', '1.5–2 hours', '2+ hours'] },
  { num: '14', section: 'Your commitment',   question: "Why basketball? What are you actually chasing?",        field: 'why_basketball',      type: 'textarea',   placeholder: "Be honest — there's no wrong answer." },
  { num: '15', section: 'Parent / Guardian', question: 'Parent / guardian name',                                field: 'guardian_name',       type: 'text',       placeholder: 'Full name' },
  { num: '16', section: 'Parent / Guardian', question: 'Their phone number',                                    field: 'guardian_phone',      type: 'tel',        placeholder: '(416) 000-0000' },
  { num: '17', section: 'Parent / Guardian', question: 'Their email address (optional)',                         field: 'guardian_email',      type: 'email',      placeholder: 'parent@email.com' },
  { num: '18', section: 'Parent / Guardian', question: "Does your parent / guardian know you're applying?",     field: 'guardian_aware',      type: 'choice',     options: ['Yes', 'No'] },
  { num: '19', section: 'Extra',             question: 'Anything else Jaiden should know?',                     field: 'anything_else',       type: 'textarea',   placeholder: 'Anything on your mind...' },
];

const TOTAL = QUESTIONS.length; // 19

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

// ── Location autocomplete (Nominatim / OpenStreetMap) ────────────────────────
type NominatimResult = {
  display_name: string;
  address: { city?: string; town?: string; village?: string; state?: string; country?: string };
};

const LocationInput = forwardRef<HTMLInputElement, {
  value: string;
  onChange: (v: string) => void;
  baseStyle: React.CSSProperties;
}>(function LocationInput({ value, onChange, baseStyle }, ref) {
  const [query, setQuery]     = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen]       = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = (q: string) => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=8`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        // Dedupe by "city + country" to avoid duplicates
        const seen = new Set<string>();
        const filtered = data.filter(r => {
          const city = r.address.city || r.address.town || r.address.village;
          if (!city) return false;
          const key = `${city}|${r.address.state || ''}|${r.address.country || ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 6);
        setResults(filtered);
        setOpen(filtered.length > 0);
      } catch { setResults([]); }
    }, 350);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    search(e.target.value);
  };

  const select = (r: NominatimResult) => {
    const city    = r.address.city || r.address.town || r.address.village || '';
    const state   = r.address.state || '';
    const country = r.address.country || '';
    const fmt     = [city, state, country].filter(Boolean).join(', ');
    setQuery(fmt);
    onChange(fmt);
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={ref}
        type="text"
        value={query}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Mississauga, Ontario"
        autoComplete="off"
        style={baseStyle}
      />
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.05)',
          padding: '6px',
          zIndex: 200,
        }}>
          {results.map((r, i) => {
            const city    = r.address.city || r.address.town || r.address.village || '';
            const state   = r.address.state || '';
            const country = r.address.country || '';
            const region  = [state, country].filter(Boolean).join(', ');
            return (
              <button
                key={i}
                type="button"
                onMouseDown={() => select(r)}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 12px',
                  border: 'none',
                  borderRadius: 10,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.12s',
                  boxSizing: 'border-box',
                  gap: 12,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = BG)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 14, fontWeight: 400, color: '#000', letterSpacing: '-0.02em', lineHeight: '18px' }}>
                  {city}
                </span>
                {region && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(0,0,0,0.3)', letterSpacing: '-0.01em', lineHeight: '18px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {region}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});

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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ApplyPage() {
  const [screen, setScreen]         = useState(0);
  const [form, setForm]             = useState<FormData>(EMPTY);
  const [visible, setVisible]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [nudgeMsg, setNudgeMsg]     = useState<string | null>(null);
  const [nudgeKey, setNudgeKey]     = useState(0);
  const [attempts, setAttempts]     = useState(0);
  const [shaking, setShaking]       = useState(false);
  const inputRef   = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const advanceRef = useRef<() => void>(() => {});

  // Restore draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { form: f, screen: s } = JSON.parse(saved);
        setForm(f);
        if (s >= 1 && s <= TOTAL) setScreen(s);
      }
    } catch {}
  }, []);

  // Auto-save draft whenever form or screen changes (skip intro + success)
  useEffect(() => {
    if (screen < 1 || screen > TOTAL) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, screen })); } catch {}
  }, [form, screen]);

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
      const q = screen > 0 ? QUESTIONS[screen - 1] : null;
      if (q?.type === 'textarea' && !e.metaKey && !e.ctrlKey) return;
      e.preventDefault();
      advanceRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [screen]);

  const triggerShake = () => {
    setShaking(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setShaking(true)));
  };

  const fireNudge = (msg: string) => {
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
    setForm(f => ({ ...f, [field]: e.target.value }));
    setNudgeMsg(null);
  };

  // Escalating validation messages per field — gets more impatient each attempt
  const VALIDATION: Partial<Record<keyof FormData, string[]>> = {
    first_name:          ["Name pls", "C'mon, what's your name?", "Give me your name!!"],
    last_name:           ["Last name too", "We need your last name", "LAST NAME. GO."],
    age:                 ["How old are you?", "Age. Just a number.", "YOUR AGE — TYPE IT."],
    city_state:          ["Where are you based?", "City, province or state", "WHERE ARE YOU FROM?!"],
    email:               ["We'll need your email", "Email address please", "YOUR EMAIL — NOW."],
    phone:               ["Add a phone number", "Phone number, please", "PHONE NUMBER!!"],
    position:            ["Pick your position", "Choose one", "PICK. A. POSITION."],
    years_playing:       ["How long have you been playing?", "Pick one — be honest", "YEARS PLAYING. PICK ONE."],
    current_team_school: ["What team or school?", "Team or school name please", "TEAM. OR. SCHOOL."],
    biggest_weakness:    ["Be honest here", "Something — anything", "YOUR WEAKNESS. TELL US."],
    goal:                ["What's driving you?", "What's your goal?", "GOAL. TYPE IT. NOW."],
    why_this_program:    ["Tell Jaiden why you're here", "Why this program?", "WHY ARE YOU HERE?!"],
    time_commitment:     ["How much time can you give?", "Pick a time commitment", "PICK ONE!!"],
    why_basketball:      ["What are you chasing?", "Why basketball?", "WHY BASKETBALL — GO."],
    guardian_name:       ["Add their name", "Parent or guardian name", "NAME. NOW."],
    guardian_phone:      ["Add their number", "Their phone number please", "THEIR NUMBER — GO."],
    guardian_aware:      ["Yes or no?", "Pick one", "YES. OR. NO."],
  };
  const OPTIONAL = new Set<keyof FormData>(['guardian_email', 'anything_else']);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = {
      athlete_name:  `${form.first_name} ${form.last_name}`.trim(),
      athlete_email: form.email,
      athlete_phone: form.phone,
      first_name:    form.first_name,
      last_name:     form.last_name,
      email:         form.email,
      phone:         form.phone,
      age:          form.age ? parseInt(form.age) : null,
      city:         form.city_state,
      position:     form.position,
      years_playing: form.years_playing
                      ? (form.years_playing.toLowerCase().includes('less') ? 0 : parseInt(form.years_playing.match(/\d+/)?.[0] ?? '0'))
                      : null,
      current_team:      form.current_team_school,
      biggest_weakness:  form.biggest_weakness,
      goal:              form.goal,
      why_program:       form.why_this_program,
      time_commitment:   form.time_commitment,
      why_basketball:    form.why_basketball,
      parent_name:       form.guardian_name,
      parent_phone:      form.guardian_phone,
      parent_email:      form.guardian_email || null,
      parent_aware:      form.guardian_aware || null,
      additional_notes:  form.anything_else || null,
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
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      goTo(20);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const advance = () => {
    if (screen === 0) { goTo(1); return; }
    if (screen === TOTAL) { handleSubmit(); return; }
    const q = QUESTIONS[screen - 1];
    if (!OPTIONAL.has(q.field) && !form[q.field].toString().trim()) {
      const msgs = VALIDATION[q.field] ?? ["Fill this in to continue", "Still need this", "FILL IT IN."];
      fireNudge(msgs[attempts % msgs.length]);
      setAttempts(a => a + 1);
      triggerShake();
      return;
    }
    goTo(screen + 1);
  };
  const retreat = () => { if (screen > 1) goTo(screen - 1); };

  // Keep advanceRef pointing to the latest advance closure
  advanceRef.current = advance;;

  const fadeStyle: React.CSSProperties = {
    opacity:   visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  };

  // ── 0: Intro ──────────────────────────────────────────────────────────────
  if (screen === 0) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 25 }}>
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
      `}</style>

      <p style={{ ...text(16, 500, TERRA), ...fadeStyle }}>
        Think Different Training
      </p>

      <div style={{ ...fadeStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15 }}>
        <CyclingHeadline style={{ ...text(32, 500, '#000000'), margin: 0 }} />
        <p style={{
          ...text(18, 400, '#000000'),
          opacity: 0.4,
          maxWidth: 800,
          textAlign: 'center',
          lineHeight: '18px',
        }}>
          This isn't a quick signup. The questions are real, the time commitment is real, and so is the $2,000. Answer honestly. Jaiden's deciding if this is the right fit, not just whether you're good enough.
        </p>
        <CTAButton onClick={advance} className="h-[33px] px-[18px] text-[14px] font-normal mt-[10px]">
          Let's Begin
        </CTAButton>
      </div>
    </div>
  );

  // ── 20: Success ───────────────────────────────────────────────────────────
  if (screen === 20) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 100px' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap');`}</style>
      <div style={{ ...fadeStyle, width: '100%', maxWidth: 700 }}>

        {/* Section label — matches question screens exactly */}
        <p style={{ ...text(18, 500, TERRA), textAlign: 'center', marginBottom: 25 }}>
          You're in the queue.
        </p>

        {/* Card — matches Frame 422 */}
        <div style={{
          boxSizing: 'border-box',
          width: '100%',
          background: CARD,
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: 32,
          padding: '50px 20px',
        }}>
          <div style={{ padding: '0px 60px', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
            <p style={{ ...text(16, 400, 'rgba(0,0,0,0.45)'), textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
              Jaiden's going to read this himself. Not skim it, read it. Most people hear back within a few days. Either way you'll get a real answer, not silence.
            </p>
            <p style={{ ...text(16, 400, 'rgba(0,0,0,0.45)'), textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
              In the meantime, get back to work. The version of you that gets into Cohort 1 is the same version that doesn't wait around for a yes to start putting in the work.
            </p>
            <p style={{ fontFamily: "'Pinyon Script', cursive", fontSize: 28, fontWeight: 400, color: TERRA, textAlign: 'center', margin: '8px 0 0' }}>
              Jaiden Francais
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <a href="/" style={{ ...text(13, 400, 'rgba(0,0,0,0.35)'), textDecoration: 'none', letterSpacing: '0.03em' }}>
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );

  // ── 1–19: Question screens ────────────────────────────────────────────────
  const qi  = screen - 1;
  const q   = QUESTIONS[qi];
  const val = form[q.field];
  const isFirst = screen === 1;
  const isLast  = screen === TOTAL;
  const progress = (screen / TOTAL) * 100;

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

  const renderInput = () => {
    if (q.type === 'textarea') {
      return (
        <textarea
          ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
          value={val}
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
          value={val}
          onChange={v => { setForm(f => ({ ...f, [q.field]: v })); setNudgeMsg(null); }}
          baseStyle={inputBoxStyle}
        />
      );
    }

    if (q.type === 'radio-grid') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
          {q.options.map(opt => {
            const active = val === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => { setForm(f => ({ ...f, [q.field]: opt })); setNudgeMsg(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px 18px',
                  borderRadius: 12,
                  border: active ? `1.5px solid ${TERRA}` : '1px solid rgba(0,0,0,0.08)',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  color: 'rgba(0,0,0,0.75)',
                  textAlign: 'left',
                  transition: 'border-color 0.15s ease',
                  boxShadow: '0px 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                {/* Radio circle */}
                <span style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: active ? `1.5px solid ${TERRA}` : '1.5px solid rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color 0.15s ease',
                }}>
                  {active && (
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: TERRA, display: 'block' }} />
                  )}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (q.type === 'choice') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {q.options.map(opt => {
              const active = val === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setForm(f => ({ ...f, [q.field]: opt }));
                    if (q.field === 'guardian_aware') {
                      if (opt === 'No') fireNudge('Consider letting them know :)');
                      else setNudgeMsg(null);
                    } else {
                      setNudgeMsg(null);
                    }
                  }}
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
        </div>
      );
    }

    return (
      <input
        ref={inputRef as unknown as React.RefObject<HTMLInputElement>}
        type={q.type}
        value={val}
        onChange={set(q.field)}
        placeholder={'placeholder' in q ? q.placeholder : ''}
        style={inputBoxStyle}
        min={q.type === 'number' ? 10 : undefined}
        max={q.type === 'number' ? 80 : undefined}
      />
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
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
      `}</style>

      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.07)', zIndex: 50 }}>
        <div style={{ height: '100%', background: TERRA, width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Back link */}
      <a href="/" style={{ position: 'fixed', top: 20, left: 24, ...text(13, 400, 'rgba(0,0,0,0.32)'), textDecoration: 'none', letterSpacing: '0.01em', zIndex: 50 }}>
        ← tdt
      </a>

      {/* Question */}
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 100px' }}>
        <div style={{ ...fadeStyle, width: '100%', maxWidth: 700 }}>

          {/* Section label — 18px / 500 / terracotta */}
          <p style={{ ...text(18, 500, TERRA), textAlign: 'center', marginBottom: 25 }}>
            {q.section}
          </p>

          {/* Frame 421 wrapper — gap: 10px between card and nav */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>

            {/* Frame 422 — the card */}
            <div
              onAnimationEnd={() => setShaking(false)}
              style={{
                boxSizing: 'border-box',
                width: '100%',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                borderRadius: 32,
                padding: '50px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 10,
                position: 'relative',
                animation: shaking ? 'tdt-shake 0.45s ease' : 'none',
              }}>
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
                  background: '#FFE2E2',
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
                    color: '#FF5050',
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
                  {q.num}
                </span>
              </div>

              {/* Frame 423 — question + input, padded 0px 60px */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0px 60px',
                gap: 20,
                width: '100%',
                boxSizing: 'border-box',
              }}>
                <p style={{
                  width: '100%',
                  fontSize: 20,
                  fontWeight: 500,
                  letterSpacing: '-0.02em',
                  lineHeight: '18px',
                  color: '#000000',
                  opacity: 0.5,
                  margin: 0,
                  fontFamily: 'inherit',
                }}>
                  {q.question.includes('(optional)') ? (
                    <>
                      {q.question.replace(' (optional)', '')}
                      <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.5, marginLeft: 6 }}>(optional)</span>
                    </>
                  ) : q.question}
                </p>
                {renderInput()}
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
                {isLast ? (submitting ? 'Submitting…' : 'Submit') : 'Next'}
              </CTAButton>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
