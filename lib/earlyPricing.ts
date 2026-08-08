import { createAdminClient } from '@/lib/supabase';
import { EARLY_BIRD_TOTAL } from '@/lib/earlyPricingConfig';

export { EARLY_BIRD_TOTAL } from '@/lib/earlyPricingConfig';

/**
 * How many discounted spots are still open.
 *
 * A spot counts as taken only once the application is marked **accepted** in
 * the dashboard. Merely applying with the discount link doesn't consume one —
 * so a wave of applicants can't lock out the promo before Jaiden has decided
 * who's actually in, and rejecting someone returns their spot automatically.
 *
 * This counts acceptances, not payments: there is no payment step in this
 * codebase (no Stripe integration exists). If one is added later, the truest
 * signal becomes "paid", and this predicate is the single place to change.
 */
export async function getEarlyPricingSpots(): Promise<{ remaining: number; total: number; taken: number }> {
  const admin = createAdminClient();

  const { count, error } = await admin
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('early_pricing', true)
    .eq('status', 'accepted');

  if (error) throw new Error(error.message);

  const taken = count ?? 0;
  return {
    taken,
    total: EARLY_BIRD_TOTAL,
    remaining: Math.max(0, EARLY_BIRD_TOTAL - taken),
  };
}
