import { Resend } from 'resend';
import { buildBookingUrl } from './calcom';

const FROM = process.env.RESEND_FROM_EMAIL || 'Think Different Training <apply@thinkdifferenttraining.com>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

// Fires right after an application is stored. The booking link also lives on
// the on-screen success step, but that step is lost the moment the tab
// closes — this is what survives that. For a minor, the parent gets their
// own copy addressed to them, since they're the one who actually buys.
export async function sendBookingEmails(opts: {
  athleteName: string;
  athleteEmail: string;
  isMinor: boolean;
  guardianName?: string | null;
  guardianEmail?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping booking emails');
    return;
  }

  const athleteFirst = opts.athleteName.trim().split(/\s+/)[0] || 'there';
  const bookingUrl = buildBookingUrl({
    name: opts.athleteName,
    email: opts.athleteEmail,
    guestEmail: opts.isMinor ? opts.guardianEmail : undefined,
  });

  const sends: Promise<unknown>[] = [];

  sends.push(
    resend.emails.send({
      from: FROM,
      to: opts.athleteEmail,
      subject: 'Book your call with Jaiden',
      html: `
        <p>Hey ${athleteFirst},</p>
        <p>Your application's in. Next step is a 20-minute call with Jaiden — that's the actual review, not this form.</p>
        <p><a href="${bookingUrl}">Book your call</a></p>
        ${opts.isMinor ? `<p>${opts.guardianName ? opts.guardianName.trim().split(/\s+/)[0] : 'Your parent'} is invited on the call too — we've sent them their own note.</p>` : ''}
      `,
    })
  );

  if (opts.isMinor && opts.guardianEmail) {
    const guardianFirst = opts.guardianName ? opts.guardianName.trim().split(/\s+/)[0] : 'there';
    sends.push(
      resend.emails.send({
        from: FROM,
        to: opts.guardianEmail,
        subject: `${athleteFirst} applied to Think Different Training`,
        html: `
          <p>Hi ${guardianFirst},</p>
          <p>${athleteFirst} applied to Think Different Training, a basketball development program run by Jaiden Francais. The next step is a 20-minute call to see if it's the right fit — ${athleteFirst} is booking the time, and you're on it as a guest.</p>
          <p><a href="${bookingUrl}">See the call details</a></p>
        `,
      })
    );
  }

  const results = await Promise.allSettled(sends);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[email] send failed', r.reason);
  }
}
