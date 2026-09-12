'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { APPLICATION_HREF, CHAT_CHARACTER_LIMIT, TRAINING_TOPIC_ORDER, type ChatTurn, type TrainingTopic } from '@/lib/trainingAssistant';
import { JOURNEY_ATHLETE, TRAINING_STORIES } from '@/lib/trainingJourney';
import styles from './HowItWorks.module.css';

type DisplayTurn = ChatTurn & { id: string; time: string; animate: boolean; example?: boolean };
type TopicThread = { turns: DisplayTurn[]; lastMessage: string };
const initialThread = (topic: TrainingTopic): TopicThread => ({
  turns: TRAINING_STORIES[topic].map((turn, index) => ({ ...turn, id: `example-${topic}-${index}`, example: true, animate: false })),
  lastMessage: '',
});
type Conversation = {
  threads: Record<TrainingTopic, TopicThread>; pendingTopic: TrainingTopic | null;
  send: (topic: TrainingTopic, message: string) => boolean;
};
const ConversationContext = createContext<Conversation | null>(null);

export function ChatAvatar({ visitor = false }: { visitor?: boolean }) {
  return <span aria-hidden="true" className={styles.chatAvatar + ' ' + (visitor ? styles.visitorAvatar : styles.coachAvatar)} />;
}

// Each topic keeps its own conversation, but shares the send
// lock. A reply returns to its original topic even if the visitor scrolls away.
export function TrainingChatProvider({ children }: { children: ReactNode }) {
  const [threads, setThreads] = useState<Record<TrainingTopic, TopicThread>>(() => ({ film: initialThread('film'), review: initialThread('review'), practice: initialThread('practice') }));
  const [pendingTopic, setPendingTopic] = useState<TrainingTopic | null>(null);
  const sendingRef = useRef(false);
  const timersRef = useRef(new Set<number>());
  const lastMessagesRef = useRef<Partial<Record<TrainingTopic, string>>>({});

  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
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
    if (sendingRef.current || !text || message.length > CHAT_CHARACTER_LIMIT || text === lastMessagesRef.current[topic]) return false;
    sendingRef.current = true;
    lastMessagesRef.current[topic] = text;
    appendTurn(topic, 'user', text);
    updateThread(topic, thread => ({ ...thread, lastMessage: text }));
    setPendingTopic(topic);
    // Fixed interface-owned reply: no AI call, message storage or network request.
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      appendTurn(topic, 'assistant', 'Apply for the 100-Day Program');
      setPendingTopic(null);
      sendingRef.current = false;
    }, 700 + Math.random() * 500);
    timersRef.current.add(timer);
    return true;
  }

  return <ConversationContext.Provider value={{ threads, pendingTopic, send }}>{children}</ConversationContext.Provider>;
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
            <p className={styles.bubble}><span className={styles.srOnly}>{turn.example ? turn.role === 'user' ? `${JOURNEY_ATHLETE.name}, example athlete: ` : 'Jaiden, example coach: ' : turn.role === 'user' ? 'Visitor: ' : 'Automatic application link: '}</span>{!turn.example && turn.role === 'assistant' ? <a className={styles.applicationReply} href={APPLICATION_HREF}><span data-message-text>{turn.content}</span> <span aria-hidden="true">→</span></a> : <span data-message-text>{turn.content}</span>}</p>
          </div>
          <span className={styles.timestamp}>{turn.time}</span>
        </div>)}
        {pending && <div className={styles.message + ' ' + styles.incoming} data-animate="true" aria-hidden="true">
          <div className={styles.messageRow}><ChatAvatar /><div className={styles.bubble + ' ' + styles.typing} aria-hidden="true"><i /><i /><i /></div></div>
        </div>}
      </div>
    </div>
    {pending && <span className={styles.srOnly} role="status" aria-live={visible ? 'polite' : 'off'} aria-label="Demo coach is typing">Demo coach is typing</span>}
    <form className={styles.composer} onSubmit={submit} aria-label="Ask about your basketball development">
      <input value={message} onChange={event => setDrafts(previous => ({ ...previous, [topic]: event.target.value }))} maxLength={CHAT_CHARACTER_LIMIT} placeholder="Message Jaiden…" aria-label="Message Jaiden’s chat demo" onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} enterKeyHint="send" autoComplete="off" name="training-message" />
      <button type="submit" aria-label="Send message" disabled={pendingTopic !== null || !message.trim() || message.trim() === thread.lastMessage}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20V4M5.5 10.5 12 4l6.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </form>
  </div>;
}
