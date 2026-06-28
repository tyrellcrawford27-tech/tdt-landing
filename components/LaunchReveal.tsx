'use client';

import { useState, useEffect, useRef } from 'react';
import { CTAButton } from '@/components/CTAButton';

// ── Interactive particle network background ──────────────────────────────────

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const mouse = { x: W / 2, y: H / 2, vx: 0, vy: 0, px: W / 2, py: H / 2 };

    type P = { x: number; y: number; vx: number; vy: number };
    type Ripple = { x: number; y: number; r: number };

    const N = 88;
    const CONNECT = 148;   // max connection distance (px)
    const MOUSE_R = 210;   // mouse influence radius

    const pts: P[] = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
    }));

    const ripples: Ripple[] = [];
    let t = 0;
    let animId: number;

    function tick() {
      t += 0.0032;

      // Track mouse velocity
      mouse.vx = mouse.x - mouse.px;
      mouse.vy = mouse.y - mouse.py;
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      const mspeed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

      ctx.clearRect(0, 0, W, H);

      // Soft mouse glow — visible indicator of influence radius
      const grd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_R);
      grd.addColorStop(0, 'rgba(179,73,41,0.09)');
      grd.addColorStop(0.5, 'rgba(179,73,41,0.03)');
      grd.addColorStop(1, 'rgba(179,73,41,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      // Ripple rings from clicks
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 7;
        const a = Math.max(0, (1 - rp.r / 300) * 0.28);
        if (a <= 0) { ripples.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(179,73,41,${a.toFixed(3)})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Update particles
      for (const p of pts) {
        // Perlin-ish flow field
        const nx = p.x * 0.0055 + t * 0.55;
        const ny = p.y * 0.0055 + t * 0.38;
        const angle = (Math.sin(nx) * Math.cos(ny) + Math.sin(ny * 1.4 - t * 0.25)) * Math.PI * 1.7;
        p.vx += Math.cos(angle) * 0.006;
        p.vy += Math.sin(angle) * 0.006;

        // Mouse attraction — pulls particles toward cursor
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MOUSE_R && d > 1) {
          const f = ((MOUSE_R - d) / MOUSE_R) ** 1.6 * 0.14;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
          // Fast mouse movement also pushes particles laterally (turbulence)
          if (mspeed > 4) {
            const perp = mspeed * 0.012 * ((MOUSE_R - d) / MOUSE_R);
            p.vx += (-mouse.vy / mspeed) * perp;
            p.vy += (mouse.vx / mspeed) * perp;
          }
        }

        // Dampen + speed cap
        p.vx *= 0.93;
        p.vy *= 0.93;
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > 3.5) { p.vx = (p.vx / spd) * 3.5; p.vy = (p.vy / spd) * 3.5; }

        p.x += p.vx;
        p.y += p.vy;

        // Soft wall bounce
        if (p.x < 0) { p.x = 0; p.vx *= -0.55; }
        if (p.x > W) { p.x = W; p.vx *= -0.55; }
        if (p.y < 0) { p.y = 0; p.vy *= -0.55; }
        if (p.y > H) { p.y = H; p.vy *= -0.55; }
      }

      // Connection lines
      ctx.lineWidth = 0.75;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT) {
            const a = (1 - d / CONNECT) * 0.21;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(140,55,22,${a.toFixed(3)})`;
            ctx.stroke();
          }
        }
      }

      // Particle dots
      for (const p of pts) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const bright = d < MOUSE_R ? ((MOUSE_R - d) / MOUSE_R) * 0.38 : 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140,55,22,${(0.24 + bright).toFixed(3)})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(tick);
    }

    tick();

    // Events
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; }
    };
    const onClick = (e: MouseEvent) => {
      // Only burst if not clicking a button/link
      if ((e.target as HTMLElement).closest('button, a')) return;
      ripples.push({ x: e.clientX, y: e.clientY, r: 0 });
      for (const p of pts) {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 270 && d > 1) {
          const f = ((270 - d) / 270) * 12;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
    };
    const onButtonClick = (e: MouseEvent) => {
      // Ripple from button clicks too, but particles scatter away from button
      const tgt = (e.target as HTMLElement).closest('button');
      if (!tgt) return;
      ripples.push({ x: e.clientX, y: e.clientY, r: 0 });
      for (const p of pts) {
        const dx = p.x - e.clientX;
        const dy = p.y - e.clientY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 200 && d > 1) {
          const f = ((200 - d) / 200) * 9;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
    };
    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('click', onClick);
    window.addEventListener('click', onButtonClick);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('click', onClick);
      window.removeEventListener('click', onButtonClick);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0" style={{ zIndex: 1 }} />;
}

// ── Corner hoop detail ───────────────────────────────────────────────────────

function CornerHoop({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 32,
        bottom: 32,
        color: '#B34929',
        opacity: visible ? 0.12 : 0,
        transition: 'opacity 0.9s ease',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <svg viewBox="0 0 200 105" fill="none" style={{ width: 40, height: 'auto', display: 'block' }}>
        <rect x="55" y="2" width="90" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="100" y1="7" x2="100" y2="25" stroke="currentColor" strokeWidth="2" />
        <line x1="85" y1="16" x2="115" y2="16" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="100" cy="31" rx="39" ry="7.5" stroke="currentColor" strokeWidth="2.5" />
        <path d="M 63 38 L 70 90 Q 100 103 130 90 L 137 38" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        {[70, 80, 90, 100, 110, 120, 130].map((x, i) => (
          <line key={i} x1={x} y1="38" x2={x + (x < 100 ? -1 : x > 100 ? 1 : 0)} y2="90"
            stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.6" />
        ))}
        <path d="M 65 52 Q 100 58 135 52" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.5" />
        <path d="M 66 65 Q 100 71 134 65" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.5" />
        <path d="M 67 78 Q 100 83 133 78" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.5" />
        <path d="M 68 88 Q 100 92 132 88" stroke="currentColor" strokeWidth="0.7" strokeOpacity="0.5" />
      </svg>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LaunchReveal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80);    // headline
    const t2 = setTimeout(() => setPhase(2), 830);   // subtext (150ms after headline finishes ~600ms)
    const t3 = setTimeout(() => setPhase(3), 1030);  // CTA
    const t4 = setTimeout(() => setPhase(4), 1300);  // close X + corner hoop
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, []);

  const fadeUp = (active: boolean, delay = '0ms'): React.CSSProperties => ({
    opacity: active ? 1 : 0,
    transform: active ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.6s cubic-bezier(0.2,0,0,1) ${delay}, transform 0.6s cubic-bezier(0.2,0,0,1) ${delay}`,
  });

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 400, fontFamily: 'inherit' }}>

      {/* ── Cream gradient base ── */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 48% 32%, #F2D4BC 0%, #F5E8DA 38%, #FBF6F2 100%)' }}
      />

      {/* ── Interactive particle network ── */}
      <ParticleBackground />

      {/* ── Grain overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          opacity: 0.03,
          mixBlendMode: 'overlay',
          zIndex: 2,
        }}
      />

      {/* ── Content ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ zIndex: 10 }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(26,15,10,0.12)',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...fadeUp(phase >= 4),
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1L9 9M9 1L1 9" stroke="#1A0F0A" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center px-6" style={{ userSelect: 'none' }}>

          {/* Headline */}
          <div style={fadeUp(phase >= 1)}>
            <h2 style={{ margin: 0, padding: 0 }}>
              <span style={{
                display: 'block',
                fontSize: 'clamp(62px, 12vw, 128px)',
                fontWeight: 800,
                letterSpacing: '-0.045em',
                lineHeight: 0.9,
                color: '#1A0F0A',
              }}>
                Cohort 1
              </span>
              <span style={{
                display: 'block',
                fontSize: 'clamp(28px, 5.5vw, 56px)',
                fontWeight: 300,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                color: '#8A7268',
                marginTop: 6,
              }}>
                is live.
              </span>
            </h2>
          </div>

          {/* Subtext */}
          <div style={{ ...fadeUp(phase >= 2, '0.04s'), marginTop: 30 }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 400, lineHeight: 1.65, color: '#8A7268', maxWidth: 340 }}>
              8 athletes. 100 days.<br />Your spot is waiting.
            </p>
          </div>

          {/* CTA */}
          <div style={{ ...fadeUp(phase >= 3, '0.04s'), marginTop: 40 }}>
            <CTAButton onClick={onClose} className="h-[52px] px-[38px] text-[15px]">
              Claim your spot
            </CTAButton>
          </div>
        </div>
      </div>

      <CornerHoop visible={phase >= 4} />
    </div>
  );
}
