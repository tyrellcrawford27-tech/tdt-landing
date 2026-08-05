import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Coarse country/region hint used only to break ties in city autocomplete
// ranking. Read from CDN-injected request headers — no third-party call, no
// geolocation prompt, nothing stored.
export async function GET() {
  const h = await headers();
  const country = h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry') ?? '';
  const region = h.get('x-vercel-ip-country-region') ?? '';
  return NextResponse.json({ country, region }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
