import { Resend } from 'resend';
import { buildBookingUrl } from './calcom';

const FROM = process.env.RESEND_FROM_EMAIL || 'Think Different Training <apply@thinkdifferenttraining.com>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function html(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}

// Fires right after an application is stored. The booking link also lives on
// the on-screen success step, but that step is lost the moment the tab
// closes — this is what survives that. For a minor, the parent gets their
// own copy addressed to them, since they're the one who actually buys.
export async function sendBookingEmails(opts: {
  athleteName: string;
  athleteEmail: string;
  isMinor: boolean;
  includeSupporter?: boolean;
  guardianName?: string | null;
  guardianEmail?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping booking emails');
    return;
  }

  const athleteFirst = opts.athleteName.trim().split(/\s+/)[0] || 'there';
  const includeSupporter = opts.isMinor || opts.includeSupporter === true;
  const bookingUrl = buildBookingUrl({
    name: opts.athleteName,
    email: opts.athleteEmail,
    guestEmail: includeSupporter ? opts.guardianEmail : undefined,
  });

  const sends: Promise<unknown>[] = [];

  sends.push(
    resend.emails.send({
      from: FROM,
      to: opts.athleteEmail,
      subject: 'Book your call with Jaiden',
      html: `
        <p>Hey ${html(athleteFirst)},</p>
        <p>Your answers are saved. The last step is a call with Jaiden to talk through your goals and whether the coaching is a good fit.</p>
        <p><a href="${html(bookingUrl)}">Choose a call time</a></p>
        ${includeSupporter && opts.guardianEmail ? '<p>Choose a time your parent or supporter can join too. We are also sending them a booking link.</p>' : ''}
      `,
    })
  );

  if (includeSupporter && opts.guardianEmail) {
    const guardianFirst = opts.guardianName ? opts.guardianName.trim().split(/\s+/)[0] : 'there';
    sends.push(
      resend.emails.send({
        from: FROM,
        to: opts.guardianEmail,
        subject: `${athleteFirst} applied to Think Different Training`,
        html: `
          <p>Hi ${html(guardianFirst)},</p>
          <p>${html(athleteFirst)} applied to Think Different Training, a basketball development program run by Jaiden Francis. The next step is a call to see if it is the right fit. Please choose a time together so you can both join.</p>
          <p><a href="${html(bookingUrl)}">Choose a call time</a></p>
        `,
      })
    );
  }

  const results = await Promise.allSettled(sends);
  for (const r of results) {
    if (r.status === 'rejected') console.error('[email] send failed', r.reason);
  }
}
