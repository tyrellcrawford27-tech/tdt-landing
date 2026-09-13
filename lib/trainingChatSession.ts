import { CHAT_MESSAGE_LIMIT, CHAT_SESSION_KEY, TRAINING_TOPIC_ORDER, type TrainingTopic } from './trainingAssistant';

export type ChatCounts = Record<TrainingTopic, number>;
type DemoSession = { id: string; counts: ChatCounts };
const emptyCounts = (): ChatCounts => ({ film: 0, review: 0, practice: 0 });
const serverCounts = emptyCounts();
let session: DemoSession | undefined;
const listeners = new Set<() => void>();

export function chatSession(): DemoSession {
  if (session) return session;
  try {
    const saved = JSON.parse(sessionStorage.getItem(CHAT_SESSION_KEY) || 'null');
    if (saved && typeof saved.id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved.id) && saved.counts && typeof saved.counts === 'object' && TRAINING_TOPIC_ORDER.every(topic => Number.isInteger(saved.counts[topic]) && saved.counts[topic] >= 0)) {
      session = { id: saved.id, counts: { film: Math.min(CHAT_MESSAGE_LIMIT, saved.counts.film), review: Math.min(CHAT_MESSAGE_LIMIT, saved.counts.review), practice: Math.min(CHAT_MESSAGE_LIMIT, saved.counts.practice) } };
    }
  } catch { /* Private browsing can make session storage unavailable. */ }
  return session ??= { id: crypto.randomUUID(), counts: emptyCounts() };
}

export const chatCounts = () => chatSession().counts;
export const serverChatCounts = () => serverCounts;
export function subscribeChatCount(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function reserveChatMessage(topic: TrainingTopic) {
  const current = chatSession();
  if (current.counts[topic] >= CHAT_MESSAGE_LIMIT) return false;
  current.counts = { ...current.counts, [topic]: current.counts[topic] + 1 };
  publish();
  return true;
}
export function exhaustChatTopic(topic: TrainingTopic) {
  const current = chatSession();
  current.counts = { ...current.counts, [topic]: CHAT_MESSAGE_LIMIT };
  publish();
}
function publish() {
  // Only an anonymous identifier and per-topic counts persist, never messages.
  try { sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(session)); } catch { /* Keep an in-memory cap. */ }
  listeners.forEach(listener => listener());
}
