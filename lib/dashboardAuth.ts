import crypto from 'crypto';

// The coach dashboard's password check used to live in the client component as
// a string literal, which meant it shipped in the public JS bundle and gated
// nothing — /api/applications itself was open to anyone who guessed the URL.
// The check belongs here, on the server, and the browser now sends what the
// coach typed rather than comparing against a baked-in copy.
//
// The fallback keeps the deployed dashboard working if DASHBOARD_PASSWORD
// isn't set in the hosting environment yet. Set it there and rotate the value —
// once it's set, this literal is dead and the real secret never enters the repo.
const FALLBACK = 'tdt2025';

export const DASHBOARD_PASSWORD_HEADER = 'x-dashboard-password';

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** True when the request carries the correct dashboard password. */
export function isAuthorized(req: Request): boolean {
  const supplied = req.headers.get(DASHBOARD_PASSWORD_HEADER);
  if (!supplied) return false;
  const expected = process.env.DASHBOARD_PASSWORD || FALLBACK;
  return safeEqual(supplied, expected);
}
