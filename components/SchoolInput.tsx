'use client';

import { forwardRef } from 'react';
import { SearchCombobox } from '@/components/SearchCombobox';
import { preloadSchools, schoolsStatus, searchSchools } from '@/lib/schoolsIndex';

type Props = {
  value: string;
  onChange: (v: string) => void;
  baseStyle: React.CSSProperties;
  onCommit?: (v: string, source: 'picker') => void;
};

// Free text is always a valid answer here (the validator only wants 3+ chars),
// so the copy reassures rather than instructs — the dropdown is recognition,
// not a requirement.
export const SchoolInput = forwardRef<HTMLInputElement, Props>(
  function SchoolInput(props, ref) {
    return (
      <SearchCombobox
        ref={ref}
        {...props}
        placeholder="Orangeville Prep"
        inputName="tdt-school"
        hintText="Start typing your team or school. Suggestions appear below; press Enter to choose."
        listLabel="School suggestions"
        noMatchCopy="Not listed? Your exact team or school name works too."
        loadingCopy="Loading schools…"
        failedCopy="Not listed? Your exact team or school name works too."
        noMatchAnnounce="No matching schools. Your exact team or school name works too."
        search={searchSchools}
        preload={preloadSchools}
        getStatus={schoolsStatus}
      />
    );
  }
);
