import { APPLICATION_SCREENS, applicationFormFromAnswers, screenIsVisible } from '@/lib/applicationForm';

export const APPLICATION_FORM_VERSION = 5;

export const LEGACY_APPLICATION_QUESTIONS = [
  { key: 'full_name', number: 1, label: "What's your full name?", fields: ['athlete_name', 'first_name', 'last_name'] },
  { key: 'age', number: 2, label: 'How old are you?', fields: ['age'] },
  { key: 'city_state', number: 3, label: 'Where are you from?', fields: ['city'] },
  { key: 'contact', number: 4, label: 'Where can we reach you?', fields: ['email', 'phone', 'athlete_email', 'athlete_phone'] },
  { key: 'device_access', number: 5, label: 'What device do you usually use to review film?', fields: ['device_access'] },
  { key: 'game', number: 6, label: 'Tell us about your game', fields: ['position', 'years_playing', 'years_playing_answer'] },
  { key: 'current_team_school', number: 7, label: 'Current team or school?', fields: ['current_team', 'current_team_school'] },
  { key: 'biggest_weakness', number: 8, label: "What's your biggest weakness as a player right now?", fields: ['biggest_weakness'] },
  { key: 'social_link', number: 9, label: "What's your @ on Instagram or Twitter (X)?", fields: ['social_link'] },
  { key: 'goal', number: 10, label: "What's the highest you see this going for you and what makes you believe it?", fields: ['goal'] },
  { key: 'time_commitment', number: 11, label: 'How much time can you realistically commit per day?', fields: ['time_commitment'] },
  { key: 'guardian', number: 12, label: "Who's the parent or supporter we're looping in?", fields: ['parent_name', 'guardian_name', 'parent_phone', 'guardian_phone', 'parent_email', 'guardian_email'] },
  { key: 'guardian_aware', number: 13, label: "Have you told them you're applying?", fields: ['parent_aware', 'guardian_aware'] },
  { key: 'heard_about', number: 14, label: 'How did you hear about this?', fields: ['heard_about'] },
] as const;

export type ApplicationQuestion = { key: string; number: number; label: string; fields: readonly string[] };
export const APPLICATION_QUESTIONS: ApplicationQuestion[] = APPLICATION_SCREENS.map((question, index) => ({
  key: question.key, number: index + 1, label: question.question, fields: question.fields,
}));
export type ApplicationQuestionKey = string;
export const APPLICATION_QUESTION_COUNT = APPLICATION_QUESTIONS.length;

/** Cached v4 clients omit this field. Never stamp their old ordering as v5. */
export function applicationFormVersion(value: unknown): 4 | 5 | null {
  if (value === undefined || value === 4) return 4;
  return value === 5 ? 5 : null;
}

/** Once a draft exists, its question set cannot be changed by another client. */
export function applicationVersionMatches(stored: unknown, requested: 4 | 5): boolean {
  const version = Number(stored);
  return version >= 5 ? version === requested : requested === 4;
}

/** Existing browser drafts and submitted resumes keep their original experience. */
export function applicationExperienceVersion(draft: { version?: unknown } | null, submitted: { version?: unknown } | null): 4 | 5 {
  const saved = submitted ?? draft;
  return saved ? (Number(saved.version) >= 5 ? 5 : 4) : 5;
}

export function applicationQuestions(version: 4 | 5, answers: Record<string, unknown> = {}): ApplicationQuestion[] {
  if (version === 4) return [...LEGACY_APPLICATION_QUESTIONS];
  const form = applicationFormFromAnswers(answers);
  return APPLICATION_QUESTIONS.filter(q => screenIsVisible(q.key, form))
    .map((q, index) => ({ ...q, number: index + 1 }));
}

export function applicationQuestion(key: unknown, version: 4 | 5 = 5, answers: Record<string, unknown> = {}) {
  return applicationQuestions(version, answers).find(question => question.key === key) ?? null;
}
