'use client';

import { useState } from 'react';

const BG    = '#FAF6F2';
const TERRA = '#B34929';
const PASS  = 'tdt2025';

type App = {
  id: number;
  first_name: string;
  last_name: string;
  age: number | null;
  city: string | null;
  email: string;
  phone: string;
  position: string | null;
  years_playing: number | null;
  current_team: string | null;
  biggest_weakness: string | null;
  goal: string | null;
  social_link: string | null;
  why_program: string | null;
  time_commitment: string | null;
  why_basketball: string | null;
  additional_notes: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  parent_aware: string | null;
  submitted_at: string;
  status: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(0,0,0,0.06)',     color: 'rgba(0,0,0,0.45)' },
  accepted: { bg: 'rgba(34,197,94,0.12)', color: '#15803d' },
  rejected: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626' },
};

const label = (text: string) => (
  <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 5px' }}>
    {text}
  </p>
);
const body = (text: string) => (
  <p style={{ fontSize: 15, color: '#000', letterSpacing: '-0.02em', lineHeight: 1.65, margin: 0, opacity: 0.75 }}>
    {text}
  </p>
);

export default function Dashboard() {
  const [authed, setAuthed]     = useState(false);
  const [passInput, setPass]    = useState('');
  const [passErr, setPassErr]   = useState(false);
  const [apps, setApps]         = useState<App[]>([]);
  const [loading, setLoading]   = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<App | null>(null);
  const [filter, setFilter]     = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  const fullName = (a: App) => [a.first_name, a.last_name].filter(Boolean).join(' ') || '—';

  const login = () => {
    if (passInput === PASS) { setAuthed(true); loadApps(); }
    else { setPassErr(true); setTimeout(() => setPassErr(false), 1200); }
  };

  const loadApps = async () => {
    setLoading(true); setFetchErr(null);
    try {
      const res  = await fetch('/api/applications');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setApps(json.data || []);
    } catch (e: unknown) {
      setFetchErr(e instanceof Error ? e.message : 'Failed to load applications');
    }
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  const displayed = apps.filter(a => filter === 'all' || a.status === filter);
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <p style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em', color: TERRA, margin: 0 }}>Think Different Training</p>
        <div style={{ width: '100%', background: '#fff', borderRadius: 24, padding: '40px 32px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontFamily: 'inherit', fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em', color: '#000', opacity: 0.6, margin: 0 }}>Coach dashboard</p>
          <input
            type="password" value={passInput} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()} placeholder="Password" autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12, border: passErr ? '1.5px solid #FF5050' : '1px solid rgba(0,0,0,0.08)', background: passErr ? '#FFF5F5' : '#fff', fontSize: 15, fontFamily: 'inherit', letterSpacing: '-0.02em', outline: 'none', transition: 'border 0.15s ease' }}
          />
          <button onClick={login} style={{ width: '100%', padding: '14px', borderRadius: 32, border: 'none', background: TERRA, color: '#fff', fontSize: 16, fontWeight: 500, fontFamily: 'inherit', letterSpacing: '-0.02em', cursor: 'pointer' }}>
            Enter
          </button>
          {passErr && <p style={{ fontFamily: 'inherit', fontSize: 13, color: '#FF5050', textAlign: 'center', margin: 0 }}>Wrong password</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,246,242,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: TERRA, margin: 0, letterSpacing: '-0.02em' }}>TDT</p>
          <p style={{ fontSize: 15, fontWeight: 400, color: 'rgba(0,0,0,0.4)', margin: 0, letterSpacing: '-0.02em' }}>Applications</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'pending', 'accepted', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, letterSpacing: '-0.02em', background: filter === f ? '#000' : 'transparent', color: filter === f ? '#fff' : 'rgba(0,0,0,0.4)', transition: 'all 0.15s ease' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span style={{ marginLeft: 6, opacity: 0.5 }}>{f === 'all' ? apps.length : apps.filter(a => a.status === f).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 57px)' }}>
        {/* List */}
        <div style={{ width: selected ? 380 : '100%', flexShrink: 0, overflowY: 'auto', borderRight: selected ? '1px solid rgba(0,0,0,0.06)' : 'none', transition: 'width 0.25s ease' }}>
          {loading && <div style={{ padding: 48, textAlign: 'center', color: 'rgba(0,0,0,0.3)', fontSize: 14, letterSpacing: '-0.02em' }}>Loading…</div>}
          {fetchErr && (
            <div style={{ padding: 32, margin: 24, borderRadius: 16, background: '#FFF2F2', border: '1px solid rgba(255,80,80,0.2)' }}>
              <p style={{ fontSize: 13, color: '#FF5050', margin: 0, letterSpacing: '-0.02em' }}>{fetchErr}</p>
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', margin: '8px 0 0', letterSpacing: '-0.02em' }}>Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local</p>
            </div>
          )}
          {!loading && !fetchErr && displayed.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(0,0,0,0.3)', fontSize: 14, letterSpacing: '-0.02em' }}>No applications yet.</div>
          )}
          {displayed.map(app => {
            const sc = STATUS_COLORS[app.status] || STATUS_COLORS.pending;
            const isActive = selected?.id === app.id;
            return (
              <div key={app.id} onClick={() => setSelected(isActive ? null : app)}
                style={{ padding: '20px 24px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.05)', background: isActive ? '#fff' : 'transparent', transition: 'background 0.12s', display: 'flex', alignItems: 'center', gap: 14 }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: `${TERRA}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: TERRA }}>
                  {(app.first_name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#000', letterSpacing: '-0.02em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName(app)}</p>
                    <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '-0.01em', padding: '3px 8px', borderRadius: 20, flexShrink: 0, background: sc.bg, color: sc.color }}>{app.status}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '2px 0 0', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[app.position, app.city, app.age ? `${app.age} yrs` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.25)', letterSpacing: '-0.01em', flexShrink: 0, margin: 0 }}>{app.submitted_at ? fmt(app.submitted_at) : '—'}</p>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
            {/* Name + status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 500, color: '#000', letterSpacing: '-0.02em', margin: 0 }}>{fullName(selected)}</p>
                <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                  {[selected.email, selected.phone].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {(['pending', 'accepted', 'rejected'] as const).map(s => {
                  const sc = STATUS_COLORS[s];
                  const active = selected.status === s;
                  return (
                    <button key={s} onClick={() => updateStatus(selected.id, s)} style={{ padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, letterSpacing: '-0.02em', border: active ? 'none' : '1px solid rgba(0,0,0,0.1)', background: active ? sc.bg : 'transparent', color: active ? sc.color : 'rgba(0,0,0,0.4)', transition: 'all 0.15s ease' }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
              {([
                ['Age',              selected.age != null ? `${selected.age}` : null],
                ['City / Province',  selected.city],
                ['Position',         selected.position],
                ['Experience',       selected.years_playing != null ? `${selected.years_playing}+ yrs` : null],
                ['Time/day',         selected.time_commitment],
                ['School or team',   selected.current_team],
              ] as [string, string | null][]).filter(([, v]) => v).map(([lbl, val]) => (
                <div key={lbl} style={{ padding: '6px 14px', borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 500 }}>{lbl} </span>
                  <span style={{ fontSize: 13, color: '#000', letterSpacing: '-0.02em' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Q&A sections */}
            {selected.goal && <div style={{ marginBottom: 24 }}>{label("Goal")}{body(selected.goal)}</div>}
            {selected.social_link && (
              <div style={{ marginBottom: 24 }}>
                {label("Instagram / Twitter")}
                <a
                  href={
                    /^https?:\/\//i.test(selected.social_link)
                      ? selected.social_link
                      : selected.social_link.startsWith('@')
                        ? `https://instagram.com/${selected.social_link.slice(1)}`
                        : `https://${selected.social_link}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 15, color: TERRA, letterSpacing: '-0.02em', lineHeight: 1.65, textDecoration: 'none' }}
                >
                  {selected.social_link}
                </a>
              </div>
            )}
            {selected.biggest_weakness && <div style={{ marginBottom: 24 }}>{label("Biggest weakness")}{body(selected.biggest_weakness)}</div>}
            {selected.why_program && <div style={{ marginBottom: 24 }}>{label("Why this program")}{body(selected.why_program)}</div>}
            {selected.why_basketball && <div style={{ marginBottom: 24 }}>{label("Why basketball")}{body(selected.why_basketball)}</div>}

            {/* Parent / Guardian */}
            {selected.parent_name && (
              <div style={{ marginBottom: 24 }}>
                {label("Parent / Guardian")}
                {body(selected.parent_name)}
                {(() => {
                  const contact = [selected.parent_phone, selected.parent_email].filter(Boolean).join(' · ');
                  return contact ? <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.45)', letterSpacing: '-0.02em', margin: '4px 0 0' }}>{contact}</p> : null;
                })()}
                {selected.parent_aware && (
                  <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.35)', letterSpacing: '-0.02em', margin: '4px 0 0' }}>
                    Aware of application: {selected.parent_aware}
                  </p>
                )}
              </div>
            )}

            {selected.additional_notes && <div style={{ marginBottom: 24 }}>{label("Additional notes")}{body(selected.additional_notes)}</div>}

            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.2)', letterSpacing: '-0.01em', marginTop: 40 }}>
              Submitted {selected.submitted_at ? fmt(selected.submitted_at) : '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
