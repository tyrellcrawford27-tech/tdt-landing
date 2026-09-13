'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { APPLICATION_HREF, CHAT_CHARACTER_LIMIT, CHAT_MESSAGE_LIMIT, CHAT_HISTORY_TURN_LIMIT, TRAINING_TOPIC_ORDER, conciseTrainingReply, trainingFallback, type ChatTurn, type TrainingTopic } from '@/lib/trainingAssistant';
import { chatSession, chatCounts, serverChatCounts, subscribeChatCount, reserveChatMessage, exhaustChatTopic, type ChatCounts } from '@/lib/trainingChatSession';
import { JOURNEY_ATHLETE, TRAINING_STORIES } from '@/lib/trainingJourney';
import { CTAButton } from '@/components/CTAButton';
import styles from './HowItWorks.module.css';

type DisplayTurn = ChatTurn & { id: string; time: string; animate: boolean; example?: boolean };
type TopicThread = { turns: DisplayTurn[]; lastMessage: string };
const initialThread = (topic: TrainingTopic): TopicThread => ({
  turns: TRAINING_STORIES[topic].map((turn, index) => ({ ...turn, id: `example-${topic}-${index}`, example: true, animate: false })),
  lastMessage: '',
});
type Conversation = {
  threads: Record<TrainingTopic, TopicThread>; pendingTopic: TrainingTopic | null;
  counts: ChatCounts;
  send: (topic: TrainingTopic, message: string) => boolean;
};
const ConversationContext = createContext<Conversation | null>(null);

export function ChatAvatar({ visitor = false }: { visitor?: boolean }) {
  return <span aria-hidden="true" data-chat-avatar={visitor ? 'athlete' : 'coach'} className={styles.chatAvatar + ' ' + (visitor ? styles.visitorAvatar : styles.coachAvatar)} />;
}

function TrainingApplicationCTA() {
  return <CTAButton href={APPLICATION_HREF} className={styles.applicationReply}>
    <span className={styles.applicationReplyContent} data-chat-application-cta>Apply for the 100-Day Program <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
  </CTAButton>;
}

// Each topic keeps its own conversation, but shares the send
// lock. A reply returns to its original topic even if the visitor scrolls away.
export function TrainingChatProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Record<TrainingTopic, TopicThread>>(() => ({ film: initialThread('film'), review: initialThread('review'), practice: initialThread('practice') }));
  const [pendingTopic, setPendingTopic] = useState<TrainingTopic | null>(null);
  const sendingRef = useRef(false);
  const timersRef = useRef(new Set<number>());
  const lastMessagesRef = useRef<Partial<Record<TrainingTopic, string>>>({});
  const counts = useSyncExternalStore(subscribeChatCount, chatCounts, serverChatCounts);
  const controllersRef = useRef(new Set<AbortController>());
  const historiesRef = useRef<Partial<Record<TrainingTopic, ChatTurn[]>>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const timers = timersRef.current;
    const controllers = controllersRef.current;
    return () => { mountedRef.current = false; timers.forEach(clearTimeout); timers.clear(); controllers.forEach(controller => controller.abort()); controllers.clear(); };
  }, []);

  const updateThread = useCallback((topic: TrainingTopic, update: (thread: TopicThread) => TopicThread) => {
    setThreads(previous => ({ ...previous, [topic]: update(previous[topic]) }));
  }, []);

  const appendTurn = useCallback((topic: TrainingTopic, role: ChatTurn['role'], content: string, example = false, time?: string) => {
    const turn: DisplayTurn = { id: crypto.randomUUID(), role, content, example, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, time: time ?? new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) };
    updateThread(topic, thread => ({ ...thread, turns: [...thread.turns, turn] }));
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      updateThread(topic, thread => ({ ...thread, turns: thread.turns.map(item => item.id === turn.id ? { ...item, animate: false } : item) }));
    }, 900);
    timersRef.current.add(timer);
  }, [updateThread]);

  function send(topic: TrainingTopic, message: string) {
    const text = message.trim();
    if (sendingRef.current || !text || message.length > CHAT_CHARACTER_LIMIT || text === lastMessagesRef.current[topic] || !reserveChatMessage(topic)) return false;
    sendingRef.current = true;
    lastMessagesRef.current[topic] = text;
    appendTurn(topic, 'user', text);
    updateThread(topic, thread => ({ ...thread, lastMessage: text }));
    setPendingTopic(topic);
    const history = (historiesRef.current[topic] ?? []).slice(-CHAT_HISTORY_TURN_LIMIT);
    const controller = new AbortController();
    controllersRef.current.add(controller);
    const started = performance.now();
    void (async () => {
      let reply = trainingFallback(text, history, topic);
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch('/api/training-chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, topic, history, sessionId: chatSession().id }),
          signal: controller.signal, cache: 'no-store',
        });
        const data = await response.json();
        if (response.status === 429) {
          exhaustChatTopic(topic);
          reply = 'The chat preview has reached its limit, but you can still take the next step. Apply to tell us about your game and see if the coaching is a fit.';
        } else if (response.ok) reply = conciseTrainingReply(data.reply) ?? reply;
      } catch { /* A relevant local answer keeps the demo useful offline too. */ }
      finally { clearTimeout(timeout); controllersRef.current.delete(controller); }
      if (!mountedRef.current) return;
      const remaining = Math.max(0, 700 + Math.random() * 500 - (performance.now() - started));
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        appendTurn(topic, 'assistant', reply);
        historiesRef.current[topic] = [...history, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-CHAT_HISTORY_TURN_LIMIT) as ChatTurn[];
        setPendingTopic(null);
        sendingRef.current = false;
      }, remaining);
      timersRef.current.add(timer);
    })();
    return true;
  }

  return <ConversationContext.Provider value={{ threads, pendingTopic, send, counts }}>{children}</ConversationContext.Provider>;
}

export function TrainingChat({ stage, visible }: { stage: number; visible: boolean }) {
  const conversation = useContext(ConversationContext);
  if (!conversation) throw new Error('TrainingChat must be inside TrainingChatProvider');
  const { threads, pendingTopic } = conversation;
  const topic = TRAINING_TOPIC_ORDER[Math.min(stage, 2)];
  const thread = threads[topic];
  const [drafts, setDrafts] = useState<Record<TrainingTopic, string>>({ film: '', review: '', practice: '' });
  const logRef = useRef<HTMLDivElement>(null);
  const message = drafts[topic];
  const pending = pendingTopic === topic;
  const limited = conversation.counts[topic] >= CHAT_MESSAGE_LIMIT;
  const statusId = `chat-demo-status-${topic}`;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [thread.turns.length, pending, visible, topic]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (conversation!.send(topic, message)) setDrafts(previous => ({ ...previous, [topic]: '' }));
  }

  return <div className={styles.chat} aria-label="Jaiden’s in-app chat demo" data-chat-topic={topic}>
    <div ref={logRef} className={styles.chatLog} data-extended={thread.turns.some(turn => !turn.example)} role="log" aria-label="Example athlete journey and your demo messages" aria-live={visible ? 'polite' : 'off'} aria-relevant="additions" tabIndex={0}>
      <div className={styles.chatMessages}>
        {thread.turns.map(turn => <div key={turn.id} className={styles.message + ' ' + (turn.role === 'user' ? styles.outgoing : styles.incoming)} data-animate={turn.animate} data-example={!!turn.example} data-role={turn.role}>
          <div className={styles.messageRow}>
            <ChatAvatar visitor={turn.role === 'user'} />
            {!turn.example && turn.role === 'assistant' ? <div className={styles.bubble + ' ' + styles.responseBubble}>
              <span className={styles.replyLabel}>Automated chat preview</span>
              <p className={styles.replyObservation} data-message-text>{turn.content}</p>
              <div className={styles.replyInvitation}>
                <span>{limited && !pending && turn.id === thread.turns.at(-1)?.id ? 'That’s the demo conversation. Apply for feedback tailored to your game.' : 'Want to work on this together?'}</span>
                <TrainingApplicationCTA />
              </div>
            </div> : <p className={styles.bubble}><span className={styles.srOnly}>{turn.example ? turn.role === 'user' ? `${JOURNEY_ATHLETE.name}, example athlete: ` : 'Jaiden, example coach: ' : 'Visitor: '}</span><span data-message-text>{turn.content}</span></p>}
          </div>
          <span className={styles.timestamp}>{turn.time}</span>
        </div>)}
        {pending && <div className={styles.message + ' ' + styles.incoming} data-animate="true" aria-hidden="true">
          <div className={styles.messageRow}><ChatAvatar /><div className={styles.bubble + ' ' + styles.typing} aria-hidden="true"><i /><i /><i /></div></div>
        </div>}
      </div>
    </div>
    {pending && <span className={styles.srOnly} role="status" aria-live={visible ? 'polite' : 'off'} aria-label="Demo coach is typing">Demo coach is typing</span>}
    <span id={statusId} className={styles.srOnly} role="status" aria-live={visible ? 'polite' : 'off'}>{limited && !pending ? 'You have used the four demo messages for this section. Apply for coaching, or explore another section.' : ''}</span>
    {limited && !pending && !thread.turns.some(turn => !turn.example && turn.role === 'assistant') && <div className={styles.completedChatAction}><TrainingApplicationCTA /></div>}
    <form className={styles.composer} onSubmit={submit} aria-label="Ask about your basketball development">
      <input value={message} onChange={event => setDrafts(previous => ({ ...previous, [topic]: event.target.value }))} maxLength={CHAT_CHARACTER_LIMIT} readOnly={limited} aria-describedby={limited ? statusId : undefined} placeholder={limited && !pending ? 'Demo complete · Apply for coaching' : 'Message Jaiden…'} aria-label="Message Jaiden’s chat demo" onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} enterKeyHint="send" autoComplete="off" name="training-message" />
      <button type="submit" aria-label="Send message" disabled={limited || pendingTopic !== null || !message.trim() || message.trim() === thread.lastMessage}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V4M5.5 10.5 12 4l6.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </form>
  </div>;
}
