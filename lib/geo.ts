// Where the applicant probably lives. Used ONLY to bias autocomplete ranking
// (a Canadian typing "london" wants London, Ontario first). Never a permission
// prompt — navigator.geolocation is deliberately not used.

import type { GeoHint } from './cities';

const KEY = 'tdt-geo';
const TTL = 30 * 24 * 60 * 60 * 1000;

// The actual audience: this form references OSBA schools.
const DEFAULT: GeoHint = { country: 'CA', region: 'ON' };

const TZ: Record<string, GeoHint> = {
  'America/Toronto':    { country: 'CA', region: 'ON' },
  'America/Vancouver':  { country: 'CA', region: 'BC' },
  'America/Edmonton':   { country: 'CA', region: 'AB' },
  'America/Winnipeg':   { country: 'CA', region: 'MB' },
  'America/Regina':     { country: 'CA', region: 'SK' },
  'America/Halifax':    { country: 'CA', region: 'NS' },
  'America/Moncton':    { country: 'CA', region: 'NB' },
  'America/St_Johns':   { country: 'CA', region: 'NL' },
  'America/Montreal':   { country: 'CA', region: 'QC' },
  'America/New_York':   { country: 'US', region: '' },
  'America/Chicago':    { country: 'US', region: '' },
  'America/Denver':     { country: 'US', region: '' },
  'America/Phoenix':    { country: 'US', region: 'AZ' },
  'America/Los_Angeles':{ country: 'US', region: '' },
  'America/Anchorage':  { country: 'US', region: 'AK' },
  'Pacific/Honolulu':   { country: 'US', region: 'HI' },
  'Europe/London':      { country: 'GB', region: '' },
  'Europe/Dublin':      { country: 'IE', region: '' },
  'Europe/Paris':       { country: 'FR', region: '' },
  'Europe/Madrid':      { country: 'ES', region: '' },
  'Europe/Berlin':      { country: 'DE', region: '' },
  'Europe/Rome':        { country: 'IT', region: '' },
  'Australia/Sydney':   { country: 'AU', region: '' },
  'Pacific/Auckland':   { country: 'NZ', region: '' },
  'Africa/Lagos':       { country: 'NG', region: '' },
  'America/Jamaica':    { country: 'JM', region: '' },
  'America/Port-au-Prince': { country: 'HT', region: '' },
  'America/Sao_Paulo':  { country: 'BR', region: '' },
  'Asia/Manila':        { country: 'PH', region: '' },
  'Asia/Kolkata':       { country: 'IN', region: '' },
};

let hint: GeoHint = DEFAULT;
let loaded = false;

export function getGeoHint(): GeoHint { return hint; }

function fromLocal(): GeoHint | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TZ[tz]) return TZ[tz];
    const loc = navigator.language?.split('-')[1];
    if (loc && /^[A-Z]{2}$/.test(loc)) return { country: loc, region: '' };
  } catch { /* ignore */ }
  return null;
}

export function loadGeoHint(): void {
  if (loaded) return;
  loaded = true;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const c = JSON.parse(raw) as { at: number; hint: GeoHint };
      if (Date.now() - c.at < TTL && c.hint?.country) { hint = c.hint; return; }
    }
  } catch { /* ignore */ }

  const local = fromLocal();
  if (local) hint = local;

  fetch('/api/geo', { signal: AbortSignal.timeout(4000) })
    .then(r => (r.ok ? r.json() : null))
    .then((d: { country?: string; region?: string } | null) => {
      if (!d?.country) return;
      hint = { country: d.country, region: d.region ?? '' };
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), hint })); } catch { /* ignore */ }
    })
    .catch(() => { /* local hint stands */ });
}
