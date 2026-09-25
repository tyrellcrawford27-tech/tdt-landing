'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

// Apple-style liquid glass pill. The rim is modelled as a convex glass bevel:
// a displacement map (built per pixel from the pill's exact size) bends the
// backdrop through that bevel the way real glass refracts, and a specular map
// lights the rim from the top-left with a softer bounce on the bottom-right.
//
// Refraction needs `backdrop-filter: url(#svg-filter)`, which only Chromium
// supports. Safari/iOS/Firefox get the same rim lighting over a frosted blur.

const IOR = 1.5; // refractive index of the "glass"
const THICKNESS = 18; // glass depth in px — scales how far the rim bends light
const LIGHT = normalize(-1, -1); // light from the top-left diagonal

function normalize(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

// Squircle-ish convex profile (Apple's bezel shape): height of the glass at
// normalised distance t (0 = outer edge, 1 = where the flat top begins).
const profile = (t: number) => Math.pow(1 - Math.pow(1 - t, 4), 0.25);

// Signed distance to a pill (stadium) of w×h; negative inside. Also returns the
// outward surface normal at the nearest edge.
function pillField(x: number, y: number, w: number, h: number) {
  const r = h / 2;
  const cx = w / 2;
  const cy = h / 2;
  const sx = Math.sign(x - cx) || 1;
  const sy = Math.sign(y - cy) || 1;
  const qx = Math.abs(x - cx) - (w / 2 - r);
  const qy = Math.abs(y - cy);
  let nx: number;
  let ny: number;
  let dist: number;
  if (qx > 0) {
    const l = Math.hypot(qx, qy) || 1;
    dist = l - r;
    nx = (qx / l) * sx;
    ny = (qy / l) * sy;
  } else {
    dist = qy - r;
    nx = 0;
    ny = sy;
  }
  return { inside: -dist, nx, ny };
}

function buildMaps(w: number, h: number, dpr: number) {
  const bezel = Math.min(h / 2 - 1, 12);

  // Displacement map at CSS-pixel resolution (filter works in CSS px).
  const disp = document.createElement('canvas');
  disp.width = w;
  disp.height = h;
  const dctx = disp.getContext('2d')!;
  const dimg = dctx.createImageData(w, h);
  const vx = new Float32Array(w * h);
  const vy = new Float32Array(w * h);
  let maxD = 0;
  const eps = 0.001;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { inside, nx, ny } = pillField(x + 0.5, y + 0.5, w, h);
      let d = 0;
      if (inside > 0 && inside < bezel) {
        const t = inside / bezel;
        // Surface slope → incidence angle → Snell refraction → lateral shift.
        const slope = ((profile(Math.min(1, t + eps)) - profile(Math.max(0, t - eps))) / (2 * eps)) * (1 / bezel) * THICKNESS * 0.35;
        const ti = Math.atan(slope);
        const tr = Math.asin(Math.sin(ti) / IOR);
        d = THICKNESS * Math.tan(ti - tr);
      }
      // Sample from further inside the glass: pull toward the centre.
      const i = y * w + x;
      vx[i] = -nx * d;
      vy[i] = -ny * d;
      maxD = Math.max(maxD, Math.abs(vx[i]), Math.abs(vy[i]));
    }
  }
  maxD = maxD || 1;
  for (let i = 0; i < w * h; i++) {
    dimg.data[i * 4] = Math.round(128 + (vx[i] / maxD) * 127);
    dimg.data[i * 4 + 1] = Math.round(128 + (vy[i] / maxD) * 127);
    dimg.data[i * 4 + 2] = 128;
    dimg.data[i * 4 + 3] = 255;
  }
  dctx.putImageData(dimg, 0, 0);

  // Specular rim at device resolution so the hairline stays crisp.
  const sw = Math.round(w * dpr);
  const sh = Math.round(h * dpr);
  const spec = document.createElement('canvas');
  spec.width = sw;
  spec.height = sh;
  const sctx = spec.getContext('2d')!;
  const simg = sctx.createImageData(sw, sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const { inside, nx, ny } = pillField((x + 0.5) / dpr, (y + 0.5) / dpr, w, h);
      if (inside <= 0) continue;
      const facing = nx * LIGHT[0] + ny * LIGHT[1];
      // Key light on the lit side, weaker bounce on the opposite side.
      const lit = facing > 0 ? Math.pow(facing, 1.6) : Math.pow(-facing, 1.6) * 0.55;
      const rim = Math.exp(-Math.max(0, inside - 0.35) / 0.75); // bright hairline
      const glow = Math.exp(-inside / 4.5) * 0.18; // soft inner falloff
      const coverage = Math.min(1, inside * dpr); // anti-alias the outer edge
      const a = Math.min(1, (0.14 + 0.86 * lit) * (rim * 0.95 + glow)) * coverage;
      const i = (y * sw + x) * 4;
      simg.data[i] = 255;
      simg.data[i + 1] = 255;
      simg.data[i + 2] = 255;
      simg.data[i + 3] = Math.round(a * 255);
    }
  }
  sctx.putImageData(simg, 0, 0);

  return { dispUrl: disp.toDataURL(), specUrl: spec.toDataURL(), scale: maxD * 2 };
}

type Maps = { w: number; h: number; dispUrl: string; specUrl: string; scale: number };

// `frost` is the blur radius (px) of what shows through the glass.
const fallbackBackdrop = (frost: number) => `blur(${frost * 2}px) saturate(170%) brightness(1.08)`;

const TINTS = {
  dark: 'linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 55%, rgba(255,255,255,0.07) 100%)',
  light: 'linear-gradient(180deg, rgba(251,246,242,0.74) 0%, rgba(251,246,242,0.56) 55%, rgba(251,246,242,0.66) 100%)',
};

// The glass itself, as layers that fill the nearest positioned ancestor (which
// should be `isolate` and fully rounded). Opacity is applied per layer, never on
// a wrapper: an ancestor with opacity < 1 becomes the backdrop root and the
// refraction would see nothing behind it.
export function LiquidGlassSurface({ visible = true, tone = 'dark', frost = 2.4 }: { visible?: boolean; tone?: 'dark' | 'light'; frost?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const filterId = `lg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [maps, setMaps] = useState<Maps | null>(null);
  const [refract, setRefract] = useState(false);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Chromium (desktop + Android). iOS Chrome is WebKit and reports CriOS.
    const canRefract = /Chrome\/\d+/.test(navigator.userAgent);
    let last = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const build = () => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const key = `${w}x${h}@${dpr}`;
      if (!w || !h) return;
      if (key !== last) {
        last = key;
        setMaps({ w, h, ...buildMaps(w, h, dpr) });
      }
      setRefract(canRefract);
      setStale(false);
    };
    // ResizeObserver fires once on observe, which builds the first maps. While
    // the host is animating its size, the old maps would be the wrong shape, so
    // fall back to plain frosting and rebuild once it settles.
    const ro = new ResizeObserver(() => {
      if (!last) return build();
      setStale(true);
      clearTimeout(timer);
      timer = setTimeout(build, 140);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const svg = refract && !stale ? maps : null;
  const backdrop = svg ? `url(#${filterId})` : fallbackBackdrop(frost);
  const layer = 'pointer-events-none absolute inset-0 rounded-[inherit]';
  const fade = { opacity: visible ? 1 : 0, transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1)' };

  return (
    <span ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]">
      {svg && (
        <svg width="0" height="0" className="absolute">
          <filter
            id={filterId}
            x="0"
            y="0"
            width={svg.w}
            height={svg.h}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation={frost} result="blur" />
            <feImage href={svg.dispUrl} x="0" y="0" width={svg.w} height={svg.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="blur" in2="map" scale={svg.scale} xChannelSelector="R" yChannelSelector="G" result="bent" />
            <feColorMatrix in="bent" type="saturate" values="1.7" />
          </filter>
        </svg>
      )}
      {/* Refracted / frosted backdrop */}
      <span className={layer} style={{ ...fade, backdropFilter: visible ? backdrop : 'none', WebkitBackdropFilter: visible ? backdrop : 'none' }} />
      {/* Glass body tint */}
      <span className={layer} style={{ ...fade, background: TINTS[tone] }} />
      {/* Specular rim */}
      {maps ? (
        <span className={layer} style={{ ...fade, backgroundImage: `url(${maps.specUrl})`, backgroundSize: '100% 100%' }} />
      ) : (
        <span className={layer} style={{ ...fade, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)' }} />
      )}
      {tone === 'light' && <span className={layer} style={{ ...fade, boxShadow: 'inset 0 0 0 0.5px rgba(26,15,10,0.10)' }} />}
    </span>
  );
}

export function LiquidGlassPill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`relative isolate inline-flex max-w-fit items-center rounded-full ${className}`}
      style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)' }}
    >
      <LiquidGlassSurface />
      <span className="relative flex items-center leading-none">{children}</span>
    </span>
  );
}
