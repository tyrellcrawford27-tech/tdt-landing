'use client';

import { useState, useEffect } from 'react';

const BG    = '#FAF6F2';
const TERRA = '#B34929';
const PASS  = 'tdt2025'; // change in .env.local via DASHBOARD_PASSWORD

type App = {
  id: number;
  athlete_name: string;
  athlete_email: string;
  athlete_phone: string;
  age: number | null;
  city: string;
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
  submitted_at: string;
  status: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(0,0,0,0.06)',     color: 'rgba(0,0,0,0.45)' },
  accepted: { bg: 'rgba(34,197,94,0.12)', color: '#15803d' },
  rejected: { bg: 'rgba(239,68,68,0.1)',  color: '#dc2626' },
};

export default function Dashboard() {
  const [authed, setAuthed]     = useState(false);
  const [passInput, setPass]    = useState('');
  const [passErr, setPassErr]   = useState(false);
  const [apps, setApps]         = useState<App[]>([]);
  const [loading, setLoading]   = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<App | null>(null);
  const [filter, setFilter]     = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  const login = () => {
    if (passInput === PASS) {
      setAuthed(true);
      loadApps();
    } else {
      setPassErr(true);
      setTimeout(() => setPassErr(false), 1200);
    }
  };

  const loadApps = async () => {
    setLoading(true);
    setFetchErr(null);
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
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
  };

  const displayed = apps.filter(a => filter === 'all' || a.status === filter);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <p style={{ fontFamily: 'inherit', fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em', color: TERRA, margin: 0 }}>
          Think Different Training
        </p>
        <div style={{
          width: '100%', background: '#fff', borderRadius: 24, padding: '40px 32px',
          border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <p style={{ fontFamily: 'inherit', fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em', color: '#000', opacity: 0.6, margin: 0 }}>
            Coach dashboard
          </p>
          <input
            type="password"
            value={passInput}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            placeholder="Password"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 12,
              border: passErr ? '1.5px solid #FF5050' : '1px solid rgba(0,0,0,0.08)',
              background: passErr ? '#FFF5F5' : '#fff',
              fontSize: 15, fontFamily: 'inherit', letterSpacing: '-0.02em',
              outline: 'none', transition: 'border 0.15s ease',
            }}
          />
          <button
            onClick={login}
            style={{
              width: '100%', padding: '14px', borderRadius: 32, border: 'none',
              background: TERRA, color: '#fff', fontSize: 16, fontWeight: 500,
              fontFamily: 'inherit', letterSpacing: '-0.02em', cursor: 'pointer',
            }}
          >
            Enter
          </button>
          {passErr && (
            <p style={{ fontFamily: 'inherit', fontSize: 13, color: '#FF5050', textAlign: 'center', margin: 0 }}>
              Wrong password
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,246,242,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: TERRA, margin: 0, letterSpacing: '-0.02em' }}>TDT</p>
          <p style={{ fontSize: 15, fontWeight: 400, color: 'rgba(0,0,0,0.4)', margin: 0, letterSpacing: '-0.02em' }}>Applications</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'pending', 'accepted', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 500, letterSpacing: '-0.02em',
                background: filter === f ? '#000' : 'transparent',
                color: filter === f ? '#fff' : 'rgba(0,0,0,0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span style={{ marginLeft: 6, opacity: 0.6 }}>
                  {apps.filter(a => a.status === f).length}
                </span>
              )}
              {f === 'all' && <span style={{ marginLeft: 6, opacity: 0.6 }}>{apps.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', height: 'calc(100vh - 57px)' }}>

        {/* List */}
        <div style={{
          width: selected ? 380 : '100%', flexShrink: 0,
          overflowY: 'auto', borderRight: selected ? '1px solid rgba(0,0,0,0.06)' : 'none',
          transition: 'width 0.25s ease',
        }}>
          {loading && (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(0,0,0,0.3)', fontSize: 14, letterSpacing: '-0.02em' }}>
              Loading…
            </div>
          )}
          {fetchErr && (
            <div style={{ padding: 32, margin: 24, borderRadius: 16, background: '#FFF2F2', border: '1px solid rgba(255,80,80,0.2)' }}>
              <p style={{ fontSize: 13, color: '#FF5050', margin: 0, letterSpacing: '-0.02em' }}>{fetchErr}</p>
              <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', margin: '8px 0 0', letterSpacing: '-0.02em' }}>
                Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local
              </p>
            </div>
          )}
          {!loading && !fetchErr && displayed.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(0,0,0,0.3)', fontSize: 14, letterSpacing: '-0.02em' }}>
              No applications yet.
            </div>
          )}
          {displayed.map(app => {
            const sc = STATUS_COLORS[app.status] || STATUS_COLORS.pending;
            const isActive = selected?.id === app.id;
            return (
              <div
                key={app.id}
                onClick={() => setSelected(isActive ? null : app)}
                style={{
                  padding: '20px 24px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  background: isActive ? '#fff' : 'transparent',
                  transition: 'background 0.12s',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.6)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
              >
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: `${TERRA}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600, color: TERRA, letterSpacing: '-0.01em',
                }}>
                  {(app.athlete_name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#000', letterSpacing: '-0.02em', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.athlete_name}
                    </p>
                    <span style={{
                      fontSize: 11, fontWeight: 500, letterSpacing: '-0.01em',
                      padding: '3px 8px', borderRadius: 20, flexShrink: 0,
                      background: sc.bg, color: sc.color,
                    }}>
                      {app.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.4)', margin: '2px 0 0', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {[app.position, app.city, app.age ? `${app.age} yrs` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.25)', letterSpacing: '-0.01em', flexShrink: 0, margin: 0 }}>
                  {app.submitted_at ? fmt(app.submitted_at) : '—'}
                </p>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 500, color: '#000', letterSpacing: '-0.02em', margin: 0 }}>{selected.athlete_name}</p>
                <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.4)', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                  {selected.athlete_email} · {selected.athlete_phone}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {(['pending', 'accepted', 'rejected'] as const).map(s => {
                  const sc = STATUS_COLORS[s];
                  const active = selected.status === s;
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      style={{
                        padding: '7px 16px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 13, fontWeight: 500, letterSpacing: '-0.02em',
                        border: active ? 'none' : '1px solid rgba(0,0,0,0.1)',
                        background: active ? sc.bg : 'transparent',
                        color: active ? sc.color : 'rgba(0,0,0,0.4)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
              {[
                ['Age', selected.age ? `${selected.age}` : '—'],
                ['City', selected.city],
                ['Position', selected.position],
                ['Experience', selected.years_playing],
                ['Time/day', selected.time_commitment],
                ['Team/School', selected.current_team_school],
              ].map(([label, val]) => val && (
                <div key={label} style={{ padding: '6px 14px', borderRadius: 20, background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.02em', textTransform: 'uppercase', fontWeight: 500 }}>{label} </span>
                  <span style={{ fontSize: 13, color: '#000', letterSpacing: '-0.02em' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Q&A */}
            {[
              ["What's their goal?",       selected.goal],
              ["Biggest weakness",          selected.biggest_weakness],
              ["Why this program?",         selected.why_this_program],
              ["Why basketball?",           selected.why_basketball],
              ["Parent / Guardian",         `${selected.guardian_name} · ${selected.guardian_phone}${selected.guardian_email ? ` · ${selected.guardian_email}` : ''} · aware: ${selected.guardian_aware || '—'}`],
              ["Anything else",             selected.anything_else],
            ].map(([label, val]) => val ? (
              <div key={label} style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.35)', letterSpacing: '0.02em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                  {label}
                </p>
                <p style={{ fontSize: 15, color: '#000', letterSpacing: '-0.02em', lineHeight: 1.65, margin: 0, opacity: 0.75 }}>
                  {val}
                </p>
              </div>
            ) : null)}

            <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.2)', letterSpacing: '-0.01em', marginTop: 40 }}>
              Submitted {selected.submitted_at ? fmt(selected.submitted_at) : '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
