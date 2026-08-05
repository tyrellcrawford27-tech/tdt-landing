'use client';

import { forwardRef } from 'react';
import { SearchCombobox, type ComboRow } from '@/components/SearchCombobox';
import { citiesStatus, getCitiesSync, preloadCities, search } from '@/lib/cities';
import { getGeoHint, loadGeoHint } from '@/lib/geo';

type Props = {
  value: string;
  onChange: (v: string) => void;
  baseStyle: React.CSSProperties;
  onCommit?: (v: string, source: 'picker') => void;
};

// Returns null while the index is still loading — SearchCombobox holds the
// query and re-runs it the moment the index lands.
function searchCities(q: string): ComboRow[] | null {
  const idx = getCitiesSync();
  if (!idx) return null;
  return search(idx, q, getGeoHint()).map(r => ({
    id: r.id,
    value: r.value,
    primary: r.place.name,
    qualifier: r.qualifier,
    tier: r.tier,
    matchStart: r.matchStart,
    matchLen: r.matchLen,
  }));
}

const preload = () => { loadGeoHint(); return preloadCities(); };

export const LocationInput = forwardRef<HTMLInputElement, Props>(
  function LocationInput(props, ref) {
    return (
      <SearchCombobox
        ref={ref}
        {...props}
        placeholder="Mississauga, Ontario"
        inputName="tdt-city"
        hintText="Start typing a city. Suggestions appear below; press Enter to choose."
        listLabel="City suggestions"
        noMatchCopy="Can't find your city? Type it as City, Province."
        loadingCopy="Loading cities…"
        failedCopy="Can't reach the city list — type it as City, Province."
        noMatchAnnounce="No matching cities. Type your city and province."
        search={searchCities}
        preload={preload}
        getStatus={citiesStatus}
      />
    );
  }
);
