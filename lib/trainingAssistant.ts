export const CHAT_MESSAGE_LIMIT = 4; // Per topic, not across the whole walkthrough.
export const CHAT_HISTORY_TURN_LIMIT = (CHAT_MESSAGE_LIMIT - 1) * 2;
export const CHAT_CHARACTER_LIMIT = 300;
export const CHAT_REPLY_CHARACTER_LIMIT = 1200;
export const CHAT_REQUEST_BYTE_LIMIT = 24_576;
export const CHAT_SESSION_KEY = 'tdt-training-chat-session-v2';
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
  if (!Array.isArray(history) || history.length > CHAT_HISTORY_TURN_LIMIT || history.length % 2 !== 0) return null;
  for (let i = 0; i < history.length; i++) {
    const turn = history[i];
    if (!turn || typeof turn !== 'object' || turn.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
        typeof turn.content !== 'string' || !turn.content.trim() || turn.content.length > (i % 2 === 0 ? CHAT_CHARACTER_LIMIT : CHAT_REPLY_CHARACTER_LIMIT)) return null;
  }
  return { message: data.message.trim(), sessionId: data.sessionId, history: history.map(({ role, content }) => ({ role, content })), topic: topic as TrainingTopic };
}

// These also make the experience useful before an API key is configured.
// No visitor content is interpolated into markup, logs, or persistent storage.
export function trainingFallback(message: string, history: ChatTurn[] = [], topic: TrainingTopic = 'film'): string {
  // Answer the newest challenge first; use previous messages only to resolve
  // short follow-ups, rather than letting an earlier keyword dominate forever.
  const topicWords = /\b(shoot\w*|shot\w*|three\w*|3.?point\w*|jumper|minute\w*|bench\w*|playing time|opportunit\w*|starter|confiden\w*|nerv\w*|hesitat\w*|scared|stress\w*|overthink\w*|pressure|decision\w*|read\w*|turnover\w*|iq|pass\w*|vision|defen\w*|guard\w*|rebound\w*|film|upload|footage|practi\w*|train\w*|game\w*|skill\w*|execution|execute|basketball|handle\w*|dribbl\w*|improv\w*)\b/i;
  const relevant = topicWords.test(message) ? message : [...history].reverse().find(turn => turn.role === 'user' && topicWords.test(turn.content))?.content || message;
  const text = relevant.toLowerCase();
  if (/\b(are you|is this|actually|really|real|human|bot|ai|automated)\b.*\b(jaiden|human|bot|ai|automated|person)\b|\bwho are you\b/i.test(message)) return 'I’m an automated preview of Jaiden’s in-app coaching chat, not Jaiden replying live. I can help you explore what film-led training could look like for your game.';
  if (/\b(injur\w*|pain|concussion)\b/.test(message.toLowerCase())) return 'I’d leave pain or an injury to a qualified health professional before changing your training. Once you’re cleared to train, we can focus on the basketball habits you want to develop.';
  if (/\b(next steps?|what (?:do|should) i do|how (?:do|can) i (?:start|join|apply)|get started|sign up)\b/i.test(message)) return 'Start with the application, then choose a time for a call to see if the coaching fits your goals. If you join, your game film helps us find a clear first focus for training.';
  if (/\b(interested|sounds good|let[’']?s do (?:it|this)|ready to (?:start|join)|count me in)\b/i.test(message)) return 'Glad the approach speaks to you. The application is where you can share your goals and what’s holding you back, then explore whether the coaching is a fit on a call.';
  if (/\b(weekly|private|individual|one[ -]?(?:to[ -]?)?one|1.?1|group|cohort)\b.{0,35}\b(calls?|sessions?|support)\b|\bcalls?\b.{0,35}\b(weekly|private|individual|group|cohort)\b/i.test(message)) return 'The plan is weekly group calls, with individual calls when needed—not a guaranteed weekly private session. Confirm the support arrangement on your fit call.';
  if (/\b(guest speakers?|guest sessions?|pro(?:fessional)? player speakers?)\b/i.test(message)) return 'Guest sessions with professional basketball players are planned. The guests and schedule are not confirmed here; the fit call is where you can check what’s included.';
  if (/\b(ratings?|rated|2k|scouting score)\b/i.test(message)) return 'The intended rating system gives a coach’s view of your development. It’s not a professional scouting score or a guarantee of opportunities; the rating scale and categories still need confirmation.';
  if (/\b(exams?|assessments?|pass (?:a |the |each )?module|module\w*)\b/i.test(message)) return 'The intended modules address what your film reveals, with an uploaded assessment at the end to demonstrate the work. The pass criteria and review process need confirmation; completing a drill isn’t an automatic pass.';
  if (/\b(daily habits?|calendar|minutes per day|hours per week|time commitment)\b/i.test(message)) return 'Daily habits and an in-app calendar are part of the intended structure. I don’t have a confirmed daily or weekly workload to quote; discuss your current schedule on the fit call.';
  if (/\b(alongside|existing training|current training|team training|stop training|quit (?:my |the )?team|sacrifice|busy schedule)\b/i.test(message)) return 'The program is designed to complement your existing training, not replace your team or routine. There’s still purposeful practice and daily work; how it fits depends on your schedule.';
  if (/\b(graduat\w*|after (?:the )?(?:100|hundred)[ -]?days?|end of (?:the )?program)\b/i.test(message)) return 'The 100 day cohort is designed to end with program completion, or graduation. That isn’t a playing qualification; continued coaching and app access afterward need confirmation.';
  if (/\b(onboard\w*|accepted|acceptance)\b/i.test(message)) return 'The described journey begins with acceptance and onboarding, then real game film to identify your strengths and weaknesses. That review gives your assigned practice a reason tied to your game.';
  if (/\b(drill library|prerecorded drills?|pre[ -]recorded drills?|personally assigned drills?)\b/i.test(message)) return 'The intended library provides recorded drills chosen around what your film reveals, alongside personally assigned work. The point is a specific purpose for your game, not more drills for their own sake.';
  if (/\b(typical|normal)\b.{0,20}\bweek\b/i.test(message)) return 'The intended week combines film-led practice, daily habits and a group call, with individual calls when needed. Exact review frequency and workload need confirmation so the plan can complement your existing training.';
  if (/\b(don[’']?t|do not|no|without|haven[’']?t|can[’']?t)\b.{0,35}\b(film|footage|record\w*|video)\b|\b(film|footage)\b.{0,25}\b(yet|available)\b/i.test(message)) return 'You don’t need a polished highlight reel to explore the program. If you don’t have game footage yet, we can discuss a simple way to start recording and build a useful first review.';
  if (/\bhow (?:does|would|will) that work\b/i.test(message) && history.length && /\b(shoot\w*|shot\w*|jumper)\b/.test(text)) return 'Keep your shot preparation consistent, then add a closeout so you have to decide whether to shoot or drive. That connects the review to a rep with the pressure you actually face in games.';
  if (/\b(how (?:does|would|will) (?:it|this|that|the program) work|what(?:[’']s| is) included)\b/i.test(message)) return 'The coaching happens online: game film review, personal feedback and drills built around what your film reveals. You practise on your own court, then bring that work back to your next game and review.';
  if (/\b(how much|price|cost|expensive|afford)\b/i.test(message)) return 'This is a paid coaching program, and the call is a chance to understand the commitment and see if it fits. Applying does not commit you to joining.';
  if (/\b(execution|execute)\b|\b(?:moves?|skills?)\b.{0,50}\b(?:don[’']?t|can[’']?t|not|never)\b.{0,30}\b(?:games?|use|transfer)\b/i.test(message)) return 'Execution means recognising when to use a skill, then carrying out the right play under game pressure. I’d use your film to connect the defender, space and timing to practice with a clear purpose.';
  if (/\b(why|how (?:do|can) i|what (?:do|should) i)\b/i.test(message) && history.length) return {
    film: 'Pick one possession that felt rushed or uncertain and note what you saw before catching the ball. That gives a review a specific question to answer, instead of only judging the outcome.',
    review: 'Start by checking the help defender before the catch, then identify your simplest open option. Practise that read in a similar situation with a defender, not just an empty-court move.',
    practice: 'Add a defender or a time constraint to the situation you’re practising, while keeping one clear focus. Then look for that same situation in your next game to see what transfers.',
  }[topic];
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
  if (!text || text.length > CHAT_REPLY_CHARACTER_LIMIT || /https?:|www\.|<|>|\[[^\]]*\]\(|\b(?:I am|I'm|I’m|this is) (?:coach )?Jaiden\b|\bI(?: have|'ve|’ve)? (?:watched|reviewed|seen) (?:your|the) (?:film|footage)\b/i.test(text)) return null;
  return text;
}
