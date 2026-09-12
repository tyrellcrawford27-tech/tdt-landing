import { validateChatInput } from '@/lib/trainingAssistant';
import { allowChatRequest, generateTrainingReply } from '@/lib/trainingChatServer';

export const runtime = 'nodejs';
export const maxDuration = 10;
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers });

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ error: 'Please send your message from the Think Different Training website.' }, 403);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Send a JSON message.' }, 415);
  }
  // Count streamed bytes too: Content-Length alone can be absent or forged.
  if (Number(request.headers.get('content-length')) > 4096) return json({ error: 'Message is too large.' }, 413);
  let data: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Please enter a message.' }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) { await reader.cancel(); return json({ error: 'Message is too large.' }, 413); }
      chunks.push(value);
    }
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return json({ error: 'Please enter a valid message.' }, 400); }
  const input = validateChatInput(data);
  if (!input) return json({ error: 'Please enter a message of 1 to 300 characters.' }, 400);
  // Vercel sets x-vercel-forwarded-for; other deployments should normalize this
  // at their trusted reverse proxy. The global limit remains independent of IP.
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!allowChatRequest(input.sessionId, ip)) {
    return Response.json({ error: 'You have reached the demo limit. Apply to tell us more about your game.', limited: true },
      { status: 429, headers: { ...headers, 'Retry-After': '600' } });
  }
  return json(await generateTrainingReply(input));
}
