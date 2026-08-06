// Booking link for the "Right fit?" discovery call — the closing step of the
// application flow. Every applicant books it; a minor's parent is attached as
// a guest so the call reaches the actual buyer, not just the athlete.
export const CAL_BOOKING_URL = 'https://cal.com/tyrell-crawford-2pjfa2/30min';

export function buildBookingUrl(opts: { name: string; email: string; guestEmail?: string | null }): string {
  const u = new URL(CAL_BOOKING_URL);
  u.searchParams.set('name', opts.name);
  u.searchParams.set('email', opts.email);
  if (opts.guestEmail) u.searchParams.append('guests', opts.guestEmail);
  return u.toString();
}
