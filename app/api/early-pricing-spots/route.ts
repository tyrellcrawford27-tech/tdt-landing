import { NextResponse } from 'next/server';

export const runtime = 'edge';

// TODO: replace this stub with a real fetch to the Replit backend once the
// endpoint is ready. Expected response shape: { remaining: number }
export async function GET() {
  // const res = await fetch('https://YOUR_REPLIT_URL/api/early-pricing-spots', { next: { revalidate: 30 } });
  // if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  // const data = await res.json();
  // return NextResponse.json({ remaining: data.remaining });

  return NextResponse.json({ remaining: 4 });
}
