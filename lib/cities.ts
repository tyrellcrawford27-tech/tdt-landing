// City autocomplete index.
//
// The whole point of this module: searching is SYNCHRONOUS. A keystroke ranks
// ~15k cities and paints in the same frame, with no network on the hot path.
// Measured ~0.1ms average, ~0.7ms worst case (single-character query).
//
// The dataset lives at public/cities-v1.json and is cached `immutable` by
// next.config.ts. Regenerating it means bumping BOTH the filename and the
// CITIES_URL constant below — the URL is the cache key.

const CITIES_URL = '/cities-v1.json';

export type Place = {
  row: number;          // stable index into the flat arrays; used as the React key
  name: string;         // display name, accents intact: "Montréal"
  region: string;       // "Ontario" | "" when the dataset carries no region
  regionAbbr: string;   // "ON" | ""
  country: string;      // "Canada"
  cc: string;           // "CA"
};

export type Row = {
  id: number;
  place: Place;
  value: string;        // exactly what gets committed to the form
  qualifier: string;    // the secondary text — always the tail of `value`
  tier: number;
  matchStart: number;   // highlight range, in DISPLAY-string offsets; -1 = none
  matchLen: number;
};

export type GeoHint = { country: string; region: string };

// ── Normalization ───────────────────────────────────────────────────────────
// Applied identically to dataset keys (at build time) and to the query (per
// keystroke). Must stay in sync or matching silently degrades.

const COMBINING = /[̀-ͯ]/g;
const DROPPED   = /['’‘‛ʻʼʽ´`.]/g;
const TO_SPACE  = /[-‐‑‒–—―_/,()·•]/g;
const WS        = /\s+/g;
const CLEAN     = /^[a-z0-9 ]+$/;

const LETTER_MAP: Record<string, string> = {
  ø: 'o', đ: 'd', ł: 'l', æ: 'ae', ß: 'ss', þ: 'th', ð: 'd',
  ı: 'i', ŀ: 'l', œ: 'oe',
};
const LETTERS = /[øđłæßþðıŀœ]/g;

export function norm(s: string): string {
  return s
    .normalize('NFKD')
    .replace(COMBINING, '')
    .toLowerCase()
    .replace(LETTERS, c => LETTER_MAP[c] ?? c)
    .replace(DROPPED, '')
    .replace(TO_SPACE, ' ')
    .replace(WS, ' ')
    .trim();
}

// Same transform, but records which source character produced each output
// character, so a match range in normalized space can be mapped back onto the
// accented display string for highlighting.
function normWithMap(s: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  let pendingSpace = false;

  for (let i = 0; i < s.length; i++) {
    const raw = s[i];
    let out = raw.normalize('NFKD').replace(COMBINING, '').toLowerCase();
    out = out.replace(LETTERS, c => LETTER_MAP[c] ?? c);
    out = out.replace(DROPPED, '');
    if (TO_SPACE.test(out)) { TO_SPACE.lastIndex = 0; out = ' '; }
    TO_SPACE.lastIndex = 0;

    for (const ch of out) {
      if (ch === ' ') { pendingSpace = text.length > 0; continue; }
      if (pendingSpace) { text += ' '; map.push(i); pendingSpace = false; }
      text += ch;
      map.push(i);
    }
  }
  return { text, map };
}

// ── Index ───────────────────────────────────────────────────────────────────

type RegionMeta = {
  name: string; abbr: string; country: string; cc: string;
  nameKey: string; countryKey: string;
};

export type CityIndex = {
  names: string[];
  keys: string[];
  aliases: (string[] | null)[];
  pops: Int32Array;
  regionOf: Int16Array;
  prom: Float32Array;
  regions: RegionMeta[];
  regionHeads: Int32Array[];
  B1: Map<string, Int32Array>;
  B2: Map<string, Int32Array>;
};

const JUNK = /^(ct|cd|cma)\s?\d+$/;

// Mirrors validateContent's city_state branch in app/apply/page.tsx. Any row
// that would fail it is dropped at build time, so the picker can never offer a
// value the form rejects.
function cityNamePasses(name: string): boolean {
  if (name.length < 2) return false;
  const base = name.toLowerCase().normalize('NFKD').replace(COMBINING, '');
  if (!/[aeiouy]/.test(base)) return false;
  if (/[^aeiouy\s'’\-./0-9]{6,}/.test(base)) return false;
  return true;
}

type RawDoc = {
  countries: [string, string][];
  regions: [string, string, number, (string | number | string[])[][]][];
};

export function buildIndex(doc: RawDoc): CityIndex {
  const names: string[] = [];
  const keys: string[] = [];
  const aliases: (string[] | null)[] = [];
  const popList: number[] = [];
  const regionOfList: number[] = [];
  const regions: RegionMeta[] = [];

  for (const rg of doc.regions) {
    const [regionName, regionAbbr, ci, cities] = rg;
    const [countryName, countryCode] = doc.countries[ci];
    const ri = regions.length;
    regions.push({
      name: regionName,
      abbr: regionAbbr,
      country: countryName,
      cc: countryCode,
      nameKey: regionName ? norm(regionName) : '',
      countryKey: norm(countryName),
    });

    for (const c of cities) {
      const name = c[0] as string;
      const population = c[1] as number;
      const rawKey = c.length > 2 && c[2] ? (c[2] as string) : name.toLowerCase();
      // 99.8% of stored keys are already clean; only re-normalize the stragglers.
      const key = CLEAN.test(rawKey) ? rawKey : norm(rawKey);
      if (JUNK.test(key)) continue;
      if (!cityNamePasses(name)) continue;

      const al = c.length > 3 ? (c[3] as string[]) : null;
      names.push(name);
      keys.push(key);
      aliases.push(al && al.length ? al.map(a => (CLEAN.test(a) ? a : norm(a))) : null);
      popList.push(population);
      regionOfList.push(ri);
    }
  }

  const n = names.length;
  const pops = Int32Array.from(popList);
  const regionOf = Int16Array.from(regionOfList);
  const prom = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // population 0 means "GeoNames has no figure", not "empty" — those are real
    // Canadian neighbourhoods (Malton, Rexdale, Woodbridge).
    //
    // The coefficient matters: the prominence spread has to stay WIDER than the
    // home+region bonus below, or a 12k local town outranks Paris, France.
    prom[i] = Math.min(620, 85 * Math.log10(Math.max(pops[i], 2000)));
  }

  // Prefix buckets: index the first 1 and 2 chars of the whole string and of
  // every token after a space, for the key and each alias.
  const b1 = new Map<string, number[]>();
  const b2 = new Map<string, number[]>();
  const post = (m: Map<string, number[]>, k: string, row: number) => {
    let arr = m.get(k);
    if (!arr) { arr = []; m.set(k, arr); }
    if (arr[arr.length - 1] !== row) arr.push(row);
  };
  const postAll = (s: string, row: number) => {
    for (let i = 0; i < s.length; i++) {
      if (i === 0 || s[i - 1] === ' ') {
        post(b1, s[i], row);
        if (i + 1 < s.length && s[i + 1] !== ' ') post(b2, s.slice(i, i + 2), row);
      }
    }
  };
  for (let i = 0; i < n; i++) {
    postAll(keys[i], i);
    const al = aliases[i];
    if (al) for (const a of al) postAll(a, i);
  }
  const freeze = (m: Map<string, number[]>) => {
    const out = new Map<string, Int32Array>();
    for (const [k, v] of m) out.set(k, Int32Array.from(v));
    return out;
  };

  // Top-3 cities per region by population, for region-name queries ("ontario").
  const byRegion: number[][] = regions.map(() => []);
  for (let i = 0; i < n; i++) byRegion[regionOf[i]].push(i);
  const regionHeads = byRegion.map(list =>
    Int32Array.from(list.sort((a, b) => pops[b] - pops[a]).slice(0, 3))
  );

  return {
    names, keys, aliases, pops, regionOf, prom, regions, regionHeads,
    B1: freeze(b1), B2: freeze(b2),
  };
}

// ── Query variants (st/saint, mt/mount, …) ──────────────────────────────────

const EQUIV: [string, string][] = [
  ['st', 'saint'], ['ste', 'sainte'], ['mt', 'mount'], ['ft', 'fort'],
];

function variantsOf(q: string): string[] {
  const sp = q.indexOf(' ');
  if (sp <= 0) return [q];
  const head = q.slice(0, sp), tail = q.slice(sp);
  const out = [q];
  for (const [a, b] of EQUIV) {
    if (head === a) out.push(b + tail);
    else if (head === b) out.push(a + tail);
  }
  return out;
}

// ── Ranking ─────────────────────────────────────────────────────────────────

const NEIGHBOR: Record<string, string> = { CA: 'US', US: 'CA' };

// Tiers are separated by 1000 while the continuous tail spans ~549 points, so
// geo/population/length can reorder within a tier but can NEVER cross one.
// Preserve that gap if you tune these numbers.
function tierOf(hay: string, v: string): number {
  if (hay === v) return 6;
  if (hay.startsWith(v)) return 5;
  if (hay.indexOf(' ' + v) >= 0) return 4;
  if (hay.indexOf(v) >= 0) return 3;
  return 0;
}

function qualifierFor(p: Place, home: string): string {
  // "Lagos, Lagos" reads as a bug. When the region repeats the city name, the
  // country is the only qualifier that adds information.
  const hasRegion = p.region !== '' && p.region.toLowerCase() !== p.name.toLowerCase();
  if (p.cc === home) return hasRegion ? p.region : p.country;
  if (p.cc === 'CA' || p.cc === 'US') {
    return home === 'CA' || home === 'US'
      ? (hasRegion ? p.region : p.country)
      : (hasRegion ? `${p.region}, ${p.country}` : p.country);
  }
  return p.country;
}

function placeAt(idx: CityIndex, row: number): Place {
  const r = idx.regions[idx.regionOf[row]];
  return { row, name: idx.names[row], region: r.name, regionAbbr: r.abbr, country: r.country, cc: r.cc };
}

const mapCache = new Map<number, { text: string; map: number[] }>();
function displayMap(idx: CityIndex, row: number) {
  let m = mapCache.get(row);
  if (!m) { m = normWithMap(idx.names[row]); mapCache.set(row, m); }
  return m;
}

type Scored = { row: number; score: number; tier: number; ms: number; ml: number };

export function search(idx: CityIndex, rawQuery: string, hint: GeoHint, limit = 6): Row[] {
  const q = norm(rawQuery);
  if (!q) return [];
  const home = hint.country;
  const vars = variantsOf(q);

  // Candidate set = union over variants, because "ft laud" lives in bucket `ft`
  // while Fort Lauderdale's key is in bucket `fo`.
  const cand = new Set<number>();
  for (const v of vars) {
    const bucket = v.length >= 2 ? idx.B2.get(v.slice(0, 2)) : idx.B1.get(v[0]);
    if (bucket) for (let i = 0; i < bucket.length; i++) cand.add(bucket[i]);
  }

  const scored: Scored[] = [];
  for (const row of cand) {
    const key = idx.keys[row];
    let bestTier = 0, bestLen = 0, bestVar = '';
    for (const v of vars) {
      const t = tierOf(key, v);
      if (t > bestTier) { bestTier = t; bestLen = key.length; bestVar = v; }
      // Aliases match at tier 6/5 only — "la" must not fuzz into "Lahore".
      const al = idx.aliases[row];
      if (al) {
        for (const a of al) {
          const at = a === v ? 6 : a.startsWith(v) ? 5 : 0;
          if (at > bestTier) { bestTier = at; bestLen = a.length; bestVar = ''; }
        }
      }
    }
    if (bestTier === 0) continue;

    const r = idx.regions[idx.regionOf[row]];
    const geo = r.cc === home ? 140 : NEIGHBOR[home] === r.cc ? 50 : 0;
    const regionBonus = r.cc === home && r.abbr && r.abbr === hint.region ? 25 : 0;
    const lenPenalty = bestVar ? Math.min(120, 6 * (bestLen - bestVar.length)) : 0;
    const score = bestTier * 1000 + geo + regionBonus + idx.prom[row] - lenPenalty;

    // Highlight range: only for direct name matches, mapped into display space.
    let ms = -1, ml = 0;
    if (bestVar && bestTier >= 3) {
      const dm = displayMap(idx, row);
      const at = dm.text.indexOf(bestVar);
      if (at >= 0) {
        ms = dm.map[at];
        const endIdx = at + bestVar.length - 1;
        ml = (dm.map[endIdx] ?? ms) - ms + 1;
      }
    }
    scored.push({ row, score, tier: bestTier, ms, ml });
  }

  // Tier 2: region / country name matches contribute their top-3 cities.
  if (q.length >= 3) {
    const already = new Set(scored.map(s => s.row));
    for (let ri = 0; ri < idx.regions.length; ri++) {
      const r = idx.regions[ri];
      if (!(r.nameKey && r.nameKey.startsWith(q)) && !r.countryKey.startsWith(q)) continue;
      for (const row of idx.regionHeads[ri]) {
        if (already.has(row)) continue;
        already.add(row);
        scored.push({ row, score: 2000 + idx.prom[row], tier: 2, ms: -1, ml: 0 });
      }
    }
  }

  // Tier 1: bounded typo tolerance, only when everything else came up empty.
  if (scored.length === 0 && q.length >= 4) {
    const max = q.length <= 6 ? 1 : 2;
    let bucket = idx.B2.get(q.slice(0, 2));
    if (!bucket || bucket.length === 0) bucket = idx.B1.get(q[0]);
    if (bucket) {
      for (let i = 0; i < bucket.length; i++) {
        const row = bucket[i];
        const d = boundedDistance(idx.keys[row].slice(0, q.length + max), q, max);
        if (d <= max) scored.push({ row, score: 1000 - 100 * d + idx.prom[row] / 10, tier: 1, ms: -1, ml: 0 });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score || a.row - b.row);

  // Collapse near-duplicates ("Mt Pleasant" / "Mount Pleasant" in one region).
  const out: Row[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    const place = placeAt(idx, s.row);
    const qual = qualifierFor(place, home);
    const dedupe = expandHead(idx.keys[s.row]) + ' ' + qual;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push({
      id: s.row, place, value: `${place.name}, ${qual}`, qualifier: qual,
      tier: s.tier, matchStart: s.ms, matchLen: s.ml,
    });
    if (out.length >= limit) break;
  }

  // Ambiguity pass: if two visible rows would commit the same string, widen both.
  const counts = new Map<string, number>();
  for (const r of out) counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
  for (const r of out) {
    if ((counts.get(r.value) ?? 0) > 1 && r.place.region) {
      r.qualifier = `${r.place.region}, ${r.place.country}`;
      r.value = `${r.place.name}, ${r.qualifier}`;
    }
  }
  return out;
}

function expandHead(key: string): string {
  const sp = key.indexOf(' ');
  if (sp <= 0) return key;
  const head = key.slice(0, sp);
  for (const [a, b] of EQUIV) if (head === a) return b + key.slice(sp);
  return key;
}

function boundedDistance(a: string, b: string, max: number): number {
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  let prev = new Array(bl + 1), cur = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    cur[0] = i;
    let best = cur[0];
    for (let j = 1; j <= bl; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    const t = prev; prev = cur; cur = t;
  }
  return prev[bl];
}

// ── Loader ──────────────────────────────────────────────────────────────────

export type CitiesStatus = 'idle' | 'loading' | 'ready' | 'failed';

let indexPromise: Promise<CityIndex | null> | null = null;
let indexValue: CityIndex | null = null;
let status: CitiesStatus = 'idle';

export function getCitiesSync(): CityIndex | null { return indexValue; }
export function citiesStatus(): CitiesStatus { return status; }

// Yields the main thread between build phases so a slow device never drops a
// frame. Deliberately NOT requestIdleCallback: idle time can be starved for
// seconds, which would leave the field suggestion-less long after the bytes
// arrived. The whole build is ~17ms, so two macrotask hops are plenty.
const yieldToMain = () => new Promise<void>(r => setTimeout(r, 0));

async function fetchOnce(): Promise<RawDoc> {
  const res = await fetch(CITIES_URL, {
    signal: AbortSignal.timeout(8000),
    priority: 'low',
  } as RequestInit);
  if (!res.ok) throw new Error(`cities: HTTP ${res.status}`);
  return res.json();
}

export function preloadCities(): Promise<CityIndex | null> {
  if (indexPromise) return indexPromise;
  status = 'loading';
  indexPromise = (async () => {
    let doc: RawDoc;
    try {
      doc = await fetchOnce();
    } catch {
      await new Promise(r => setTimeout(r, 1200));
      try {
        doc = await fetchOnce();
      } catch {
        status = 'failed';
        return null;
      }
    }
    await yieldToMain();
    const idx = buildIndex(doc);
    await yieldToMain();
    indexValue = idx;
    status = 'ready';
    return idx;
  })();
  return indexPromise;
}
