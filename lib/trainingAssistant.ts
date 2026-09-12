export const CHAT_MESSAGE_LIMIT = 3;
export const CHAT_CHARACTER_LIMIT = 300;
export const CHAT_SESSION_KEY = 'tdt-training-chat-session-v1';
export const APPLICATION_HREF = '/apply'; // app/apply/page.tsx is the existing public application.

export const TRAINING_TOPIC_ORDER = ['film', 'review', 'practice'] as const;
export type TrainingTopic = typeof TRAINING_TOPIC_ORDER[number];
export const TRAINING_TOPICS = {
  film: {
    title: 'Share your film',
    opening: 'Hey, I want to understand your game, not just your highlights. What’s one moment from a recent game you’d like me to help you break down?',
    context: 'The visitor sees a game-film upload preview. Help them identify a real possession or recurring challenge they would want reviewed. No video has been uploaded to the assistant.',
  },
  review: {
    title: 'See what Jaiden sees',
    opening: 'I look at the decisions behind each play, not just whether the shot went in. What feels hardest for you to read: when to shoot, drive or pass?',
    context: 'The visitor sees game film with review notes and a coaching call. Focus on reading defenders, understanding options and making decisions. This is a product screenshot, not the visitor’s footage or a live call.',
  },
  practice: {
    title: 'Take it to the court',
    opening: 'I want your training to show up when it matters in games. What’s one skill you’d like to feel more confident using in your next game?',
    context: 'The visitor sees personalised drill demonstrations and training modules. Connect their chosen skill to purposeful practice and using it in a game. Do not claim drills have already been assigned to them.',
  },
} satisfies Record<TrainingTopic, { title: string; opening: string; context: string }>;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type ChatInput = { message: string; sessionId: string; history: ChatTurn[]; topic: TrainingTopic };

export function validateChatInput(value: unknown): ChatInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const topic = data.topic === undefined ? 'film' : data.topic;
  if (typeof topic !== 'string' || !TRAINING_TOPIC_ORDER.includes(topic as TrainingTopic)) return null;
  if (typeof data.message !== 'string' || data.message.length > CHAT_CHARACTER_LIMIT ||
      !data.message.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(data.message) ||
      typeof data.sessionId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.sessionId)) return null;
  const history = data.history ?? [];
  if (!Array.isArray(history) || history.length > 4 || history.length % 2 !== 0) return null;
  for (let i = 0; i < history.length; i++) {
    const turn = history[i];
    if (!turn || typeof turn !== 'object' || turn.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
        typeof turn.content !== 'string' || !turn.content.trim() || turn.content.length > (i % 2 === 0 ? 300 : 400)) return null;
  }
  return { message: data.message.trim(), sessionId: data.sessionId, history: history.map(({ role, content }) => ({ role, content })), topic: topic as TrainingTopic };
}

// These also make the experience useful before an API key is configured.
// No visitor content is interpolated into markup, logs, or persistent storage.
export function trainingFallback(message: string, history: ChatTurn[] = [], topic: TrainingTopic = 'film'): string {
  // Answer the newest challenge first; use previous messages only to resolve
  // short follow-ups, rather than letting an earlier keyword dominate forever.
  const topicWords = /\b(shoot\w*|shot\w*|three\w*|3.?point\w*|jumper|minute\w*|bench\w*|playing time|opportunit\w*|starter|confiden\w*|nerv\w*|hesitat\w*|scared|stress\w*|overthink\w*|pressure|decision\w*|read\w*|turnover\w*|iq|pass\w*|vision|defen\w*|guard\w*|rebound\w*|film|upload|footage|practi\w*|train\w*|game\w*|skill\w*|basketball|handle\w*|dribbl\w*|improv\w*)\b/i;
  const relevant = topicWords.test(message) ? message : [...history].reverse().find(turn => turn.role === 'user' && topicWords.test(turn.content))?.content || message;
  const text = relevant.toLowerCase();
  if (/\b(are you|is this|actually|really|real|human|bot|ai|automated)\b.*\b(jaiden|human|bot|ai|automated|person)\b|\bwho are you\b/i.test(message)) return 'I’m an automated preview of Jaiden’s in-app coaching chat, not Jaiden replying live. I can help you explore what film-led training could look like for your game.';
  if (/\b(injur\w*|pain|concussion)\b/.test(message.toLowerCase())) return 'I’d leave pain or an injury to a qualified health professional before changing your training. Once you’re cleared to train, we can focus on the basketball habits you want to develop.';
  if (/\b(shoot\w*|shot\w*|three\w*|3.?point\w*|jumper)\b/.test(text)) return 'I’d start by comparing your balance and shot preparation in games with the reps you make in practice. That gives us a way to build drills around the shots you actually get.';
  if (/\b(minute\w*|bench\w*|playing time|opportunit\w*|starter|start\w* spot)\b/.test(text)) return 'I’d look beyond scoring at your defensive positioning and how reliably you make the simple play. Those are habits we can examine on film and give a clear focus in practice.';
  if (/\b(confiden\w*|nerv\w*|hesitat\w*|scared|stress\w*|overthink\w*|pressure)\b/.test(text)) return 'I’d start with one moment where you hesitate and look at the options available before you get the ball. Then we can build reps around that situation so the next decision feels more familiar.';
  if (/\b(decision\w*|read\w*|turnover\w*|iq|pass\w*|vision)\b/.test(text)) return 'I’d pause just before your decision and look at the defender, space and passing options with you. That gives us a specific read to practise, instead of just telling you to play faster.';
  if (/\b(defen\w*|guard\w*|rebound\w*)\b/.test(text)) return 'I’d look at your positioning before your matchup gets the ball, not just your reaction afterwards. That detail on film can give us one clear habit to work on in practice.';
  if (/\b(film|upload|footage)\b/.test(text)) return 'I’d start with a few real game possessions, including the ones that didn’t go your way. Those decisions give us a useful starting point for feedback and personalised drills.';
  if (/\b(practi\w*|train\w*|game\w*|skill\w*|basketball|handle\w*|dribbl\w*|improv\w*)\b/.test(text)) return 'I’d compare a skill you trust in practice with the timing, space and pressure when you use it in a game. That helps us make your reps more specific to what you actually face on the court.';
  return {
    film: 'I’d rather start with a few ordinary possessions than a highlight reel. Think of a moment where you hesitated, lost an advantage or weren’t sure what to do next.',
    review: 'I’d pause just before a decision and help you identify the space, defender and teammate you could use. From there, we can turn that read into one clear adjustment.',
    practice: 'I’d choose one game situation and work on the decision as well as the move. That way, each rep has a purpose when you take it back to your court.',
  }[topic];
}

export function conciseTrainingReply(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\s+/g, ' ').replace(/\bTDT\b/gi, 'Think Different Training');
  if (!text || text.length > 400 || /https?:|www\.|<|>|\[[^\]]*\]\(|\b(?:I am|I'm|I’m|this is) (?:coach )?Jaiden\b|\bI(?: have|'ve|’ve)? (?:watched|reviewed|seen) (?:your|the) (?:film|footage)\b/i.test(text)) return null;
  const sentences = text.match(/[^.!?]+[.!?]+(?:[”"’']|$)?|[^.!?]+$/g) ?? [];
  return sentences.length > 2 ? null : text;
}
