'use client';

import {
  forwardRef, useCallback, useEffect, useId, useImperativeHandle,
  useLayoutEffect, useRef, useState,
} from 'react';
import {
  citiesStatus, getCitiesSync, preloadCities, search,
  type CitiesStatus, type Place, type Row,
} from '@/lib/cities';
import { getGeoHint, loadGeoHint } from '@/lib/geo';

const BG = '#FAF6F2';

type Props = {
  value: string;
  onChange: (v: string) => void;
  baseStyle: React.CSSProperties;
  onCommit?: (v: string, source: 'picker') => void;
};

const SR_ONLY: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, margin: -1, padding: 0,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
};

// Panel padding (6 top + 6 bottom) plus its 1px borders — the difference
// between the measured content height and the panel's border-box height.
const PANEL_CHROME = 14;

const HINT_ROW: React.CSSProperties = {
  padding: '9px 12px', margin: 0, fontSize: 12, color: 'rgba(0,0,0,0.35)',
  letterSpacing: '-0.02em', lineHeight: '18px',
};

export const LocationInput = forwardRef<HTMLInputElement, Props>(
  function LocationInput({ value, onChange, baseStyle, onCommit }, ref) {
    const [query, setQuery]         = useState(value);
    const [selected, setSelected]   = useState<Place | null>(null);
    const [open, setOpen]           = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const [rows, setRows]           = useState<Row[]>([]);
    const [status, setStatus]       = useState<CitiesStatus>(() => citiesStatus());
    const [slowLoad, setSlowLoad]   = useState(false);
    const [placement, setPlacement] = useState<'below' | 'above'>('below');
    const [live, setLive]           = useState('');
    const [panelH, setPanelH]       = useState<number | null>(null);

    const wrapRef        = useRef<HTMLDivElement>(null);
    const contentRef     = useRef<HTMLDivElement>(null);
    const heightReady    = useRef(false);
    const inputRef       = useRef<HTMLInputElement>(null);
    const rowRefs        = useRef<(HTMLLIElement | null)[]>([]);
    const pointerInside  = useRef(false);
    const lastPointerType= useRef<string>('mouse');
    const lastEmitted    = useRef(value);
    const pendingQuery   = useRef<string | null>(null);
    const slowTimer      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const liveTimer      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const mounted        = useRef(true);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

    const base = useId();
    const listId = `${base}-list`;
    const hintId = `${base}-hint`;
    const optionId = (i: number) => `${base}-opt-${i}`;

    const announce = useCallback((msg: string) => {
      clearTimeout(liveTimer.current);
      liveTimer.current = setTimeout(() => mounted.current && setLive(msg), 400);
    }, []);

    // Load the index. Module-scoped, so this is a no-op after the first call
    // anywhere in the app — going back a screen and forward again is free.
    useEffect(() => {
      mounted.current = true;
      loadGeoHint();
      preloadCities().then(idx => {
        if (!mounted.current) return;
        setStatus(citiesStatus());
        clearTimeout(slowTimer.current);
        setSlowLoad(false);
        const pending = pendingQuery.current;
        if (idx && pending && document.activeElement === inputRef.current) {
          const next = search(idx, pending, getGeoHint());
          setRows(next);
          setOpen(next.length > 0);
        }
      });
      return () => {
        mounted.current = false;
        clearTimeout(slowTimer.current);
        clearTimeout(liveTimer.current);
      };
    }, []);

    // External changes only (draft rehydration / reset) — our own writes set
    // lastEmitted first, so they don't round-trip through here.
    useEffect(() => {
      if (value !== lastEmitted.current) {
        lastEmitted.current = value;
        setQuery(value);
        setSelected(null);
        setRows([]);
        setOpen(false);
      }
    }, [value]);

    const showPanel = open && (rows.length > 0 || slowLoad || status === 'failed' ||
      (status === 'ready' && query.trim() !== ''));

    const close = useCallback(() => { setOpen(false); setActiveIdx(-1); }, []);

    const commit = useCallback((row: Row) => {
      setQuery(row.value);
      setSelected(row.place);
      lastEmitted.current = row.value;
      onChange(row.value);
      onCommit?.(row.value, 'picker');
      setRows([]);
      setOpen(false);
      setActiveIdx(-1);
      announce(`${row.value} selected.`);
      if (lastPointerType.current !== 'touch') {
        inputRef.current?.focus();
        const n = row.value.length;
        inputRef.current?.setSelectionRange(n, n);
      }
    }, [onChange, onCommit, announce]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setQuery(v);
      setSelected(null);
      setActiveIdx(-1);
      lastEmitted.current = v;
      onChange(v);

      if (v.trim() === '') { setRows([]); setOpen(false); pendingQuery.current = null; return; }

      const idx = getCitiesSync();
      if (idx) {
        // Synchronous. Same frame as the keystroke. No debounce, no network.
        const next = search(idx, v, getGeoHint());
        setRows(next);
        setOpen(true);
        announce(next.length
          ? `${next.length} suggestion${next.length === 1 ? '' : 's'} available. Use arrow keys to review.`
          : 'No matching cities. Type your city and province.');
      } else {
        pendingQuery.current = v;
        setOpen(false);
        if (!slowTimer.current) {
          slowTimer.current = setTimeout(() => {
            if (mounted.current && !getCitiesSync()) { setSlowLoad(true); setOpen(true); }
          }, 500);
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (selected !== null) return;           // committed — Enter advances the form
      if (!open || rows.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setActiveIdx(i => Math.min(i + 1, rows.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setActiveIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Home') {
        e.preventDefault(); e.stopPropagation(); setActiveIdx(0);
      } else if (e.key === 'End') {
        e.preventDefault(); e.stopPropagation(); setActiveIdx(rows.length - 1);
      } else if (e.key === 'Enter') {
        // The form advances on Enter via a window listener. Only pre-empt it
        // when we have something unambiguous to commit, otherwise fall through.
        if (activeIdx >= 0) {
          e.preventDefault(); e.stopPropagation(); commit(rows[activeIdx]);
        } else if (rows[0] && rows[0].tier >= 5) {
          e.preventDefault(); e.stopPropagation(); commit(rows[0]);
        }
      } else if (e.key === 'Tab') {
        if (activeIdx >= 0) commit(rows[activeIdx]);   // no preventDefault: focus still moves
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); close();
      }
    };

    const reopenOnFocus = () => {
      // Deliberately unlike SchoolInput: after a commit, refocusing does not
      // re-offer the city the user just picked. The next keystroke reopens.
      if (selected !== null || query.trim() === '') return;
      const idx = getCitiesSync();
      if (!idx) return;
      const next = search(idx, query, getGeoHint());
      setRows(next);
      setOpen(next.length > 0);
    };

    // Flip above the input when the keyboard leaves no room below.
    useLayoutEffect(() => {
      if (!open) return;
      const measure = () => {
        const el = inputRef.current;
        if (!el) return;
        const vh = window.visualViewport?.height ?? window.innerHeight;
        const r = el.getBoundingClientRect();
        const rowH = window.innerWidth <= 639 ? 44 : 36;
        const need = Math.min(Math.max(rows.length, 1), 6) * rowH + 12;
        const below = vh - r.bottom - 20;
        const above = r.top - 20;
        setPlacement(below >= need || below >= above ? 'below' : 'above');
      };
      measure();
      let raf = 0;
      const onVv = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
      window.visualViewport?.addEventListener('resize', onVv);
      window.visualViewport?.addEventListener('scroll', onVv);
      return () => {
        cancelAnimationFrame(raf);
        window.visualViewport?.removeEventListener('resize', onVv);
        window.visualViewport?.removeEventListener('scroll', onVv);
      };
    }, [open, rows.length]);

    // Animate the panel's height as the result count changes, so a list going
    // 6 → 2 rows collapses rather than snapping. Measured from the content and
    // driven as an explicit pixel height, because height:auto can't transition.
    // Measured on every commit that can change the content, NOT from a
    // ResizeObserver alone: RO callbacks are delivered per rendering frame, and
    // a throttled or backgrounded tab produces none — which would freeze the
    // panel at a stale height. A layout effect always runs.
    useLayoutEffect(() => {
      const el = contentRef.current;
      if (!el) { heightReady.current = false; setPanelH(null); return; }
      setPanelH(el.offsetHeight + PANEL_CHROME);
      // The first measurement lands as auto → px, which CSS can't interpolate,
      // so the panel opens at its true height and only later changes animate.
      heightReady.current = true;
    }, [showPanel, rows, slowLoad, status, query]);

    useEffect(() => {
      if (!open || activeIdx < 0) return;
      rowRefs.current[activeIdx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [activeIdx, open]);

    // Clear the pointer-inside flag no matter where the release lands.
    useEffect(() => {
      if (!open) return;
      const up = () => { pointerInside.current = false; };
      document.addEventListener('pointerup', up, true);
      return () => document.removeEventListener('pointerup', up, true);
    }, [open]);

    // The panel overhangs the Go back / Next row, which lives outside the card.
    // Lifting the whole wrapper — not just the panel — keeps it on top even
    // while the open animation has the panel on its own compositor layer.
    return (
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', zIndex: open ? 300 : 'auto' }}>
        <span id={hintId} style={SR_ONLY}>
          Start typing a city. Suggestions appear below; press Enter to choose.
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={reopenOnFocus}
          onBlur={() => { if (!pointerInside.current) close(); }}
          placeholder="Mississauga, Ontario"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={showPanel && activeIdx >= 0 ? optionId(activeIdx) : undefined}
          aria-describedby={hintId}
          autoComplete="off"
          name="tdt-city"
          data-1p-ignore
          data-lpignore="true"
          inputMode="text"
          enterKeyHint="done"
          autoCapitalize="words"
          autoCorrect="off"
          spellCheck={false}
          style={baseStyle}
        />

        <div aria-live="polite" aria-atomic="true" style={SR_ONLY}>{live}</div>

        {showPanel && (
          <div
            className="tdt-loc-panel"
            onPointerDown={e => {
              lastPointerType.current = e.pointerType;
              pointerInside.current = true;
              // On mouse this keeps focus in the input so blur never races the
              // click. On touch it would cancel the pan gesture, so we don't.
              if (e.pointerType !== 'touch') e.preventDefault();
            }}
            style={{
              position: 'absolute',
              top:    placement === 'below' ? 'calc(100% + 8px)' : 'auto',
              bottom: placement === 'above' ? 'calc(100% + 8px)' : 'auto',
              left: 0,
              right: 0,
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.05)',
              padding: 6,
              zIndex: 200,
              boxSizing: 'border-box',
              contain: 'layout paint',
              height: panelH ?? 'auto',
              maxHeight: 'min(46dvh, 276px)',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              animation: 'tdt-pop-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) both',
              transition: heightReady.current
                ? 'height 0.19s cubic-bezier(0.16, 1, 0.3, 1)'
                : undefined,
            }}
          >
            <div ref={contentRef}>
            <ul id={listId} role="listbox" aria-label="City suggestions"
                style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {rows.map((row, i) => (
                <li
                  key={row.id}
                  id={optionId(i)}
                  ref={el => { rowRefs.current[i] = el; }}
                  role="option"
                  aria-selected={i === activeIdx}
                  onPointerMove={() => { if (activeIdx !== i) setActiveIdx(i); }}
                  onClick={() => commit(row)}
                  className="tdt-loc-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    gap: 12,
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: i === activeIdx ? BG : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    listStyle: 'none',
                    userSelect: 'none',
                    // Keyed by row.id, so a row that survives the next keystroke
                    // keeps its DOM node and does NOT replay this — only newly
                    // arrived cities animate in. That's what stops a fast typist
                    // from seeing the whole list strobe on every character.
                    animationDelay: `${Math.min(i, 5) * 22}ms`,
                  }}
                >
                  <span style={{
                    fontSize: 14, fontWeight: 400, color: '#000',
                    letterSpacing: '-0.02em', lineHeight: '18px',
                    minWidth: 0, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {highlight(row)}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 400, color: 'rgba(0,0,0,0.3)',
                    letterSpacing: '-0.01em', lineHeight: '18px',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {row.qualifier}
                  </span>
                </li>
              ))}
            </ul>

            {rows.length === 0 && slowLoad && status !== 'failed' && (
              <p style={HINT_ROW}>Loading cities…</p>
            )}
            {rows.length === 0 && status === 'failed' && (
              <p style={HINT_ROW}>Can&apos;t reach the city list — type it as City, Province.</p>
            )}
            {rows.length === 0 && status === 'ready' && query.trim() !== '' && (
              <p style={HINT_ROW}>Can&apos;t find your city? Type it as City, Province.</p>
            )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

function highlight(row: Row) {
  const { name } = row.place;
  if (row.matchStart < 0 || row.matchLen <= 0) return name;
  const a = name.slice(0, row.matchStart);
  const b = name.slice(row.matchStart, row.matchStart + row.matchLen);
  const c = name.slice(row.matchStart + row.matchLen);
  return (
    <>
      {a}
      <mark style={{ background: 'transparent', color: 'inherit', fontWeight: 500 }}>{b}</mark>
      {c}
    </>
  );
}
