import { NextResponse } from 'next/server';
import { getEarlyPricingSpots, EARLY_BIRD_TOTAL } from '@/lib/earlyPricing';

// Node runtime (not edge) to match the other service-role Supabase routes.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const spots = await getEarlyPricingSpots();
    return NextResponse.json(spots, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (e: unknown) {
    // Never surface a scarcity claim we can't back: on failure report the full
    // allotment rather than a stale or invented number, and let the caller
    // decide how loudly to fail.
    const msg = e instanceof Error ? e.message : 'Server error';
    console.error('[early-pricing-spots]', msg);
    return NextResponse.json(
      { remaining: EARLY_BIRD_TOTAL, total: EARLY_BIRD_TOTAL, taken: 0, degraded: true },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
