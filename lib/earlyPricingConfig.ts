// Client-safe early-bird constants.
//
// Kept apart from lib/earlyPricing.ts on purpose: that module pulls in the
// service-role Supabase client, and importing it from a client component would
// drag server-only code (and its env access) into the browser bundle.

// How many discounted spots exist in total. Single source of truth — the API,
// the popover's "N of M" copy, and the apply page's price guard all read this.
export const EARLY_BIRD_TOTAL = 3;

export const EARLY_BIRD_PRICE = '$800';
export const FULL_PRICE = '$1,000';
