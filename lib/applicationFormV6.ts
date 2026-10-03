/** Shared form content and validation; contains no browser or database code. */
export const EMPTY_APPLICATION = {
  full_name: '', goal: '', goal_detail: '', age: '', position: '', years_playing: '',
  current_team_school: '', biggest_weakness: '', city_state: '', email: '', phone: '',
  social_link: '', time_commitment: '', film_readiness: '', film_access: '', device_access: '',
  decision_support: '', guardian_name: '', guardian_phone: '', guardian_email: '',
  guardian_aware: '', guardian_consent: '', investment_readiness: '', heard_about: '',
  heard_about_detail: '', application_reason: '', biggest_weakness_detail: '', application_reason_detail: '',
};
export type ApplicationFormData = typeof EMPTY_APPLICATION;
export type ApplicationField = keyof ApplicationFormData;
export type SubField =
  | { field: ApplicationField; kind: 'text' | 'email' | 'tel'; label: string; placeholder: string }
  | { field: ApplicationField; kind: 'radio-grid'; label: string; options: string[] }
  | { field: ApplicationField; kind: 'school'; label: string; alternative?: string };
type BaseQuestion = { key: string; section: string; question: string; subtext?: string; fields: string[] };
export type ApplicationScreen = BaseQuestion & (
  | { field: ApplicationField; type: 'text' | 'email' | 'tel' | 'number' | 'textarea'; placeholder: string; alternative?: string }
  | { field: ApplicationField; type: 'location' | 'school'; alternative?: string }
  | { field: ApplicationField; type: 'radio-grid' | 'choice'; options: string[]; detailField?: ApplicationField; detailOption?: string; detailLabel?: string; detailPlaceholder?: string; detailMultiline?: boolean }
  | { type: 'group'; kind: 'contact' | 'game' | 'parent' | 'film'; subs: SubField[] }
);

export const SELF_SUPPORTED = "I'm deciding for myself";
export const FILM_DECLINED = "I don't want film coaching right now";
export const NO_SOCIAL = "I don't have an Instagram or X account";
export const FILM_ACCESS_OPTIONS = [
  'Yes, full-game footage', 'Yes, some games/clips', 'Not currently, but I can get it', 'No',
];
export const GOAL_OPTIONS = [
  'Make a team or earn a bigger role', 'Play in college or university',
  'Play professionally', 'Something else',
];
export const IMPROVEMENT_OPTIONS = [
  'Shooting and finishing', 'Ball handling', 'Decision-making and basketball IQ', 'Something else',
];
export const APPLICATION_REASON_OPTIONS = [
  'Get ready for a season or tryouts', 'Earn a bigger role on my team', 'Get past a plateau', 'Something else',
];
/** Short display copy keeps cards tidy without changing saved answers. */
export const APPLICATION_OPTION_LABELS: Record<string, string> = {
  'Make a team or earn a bigger role': 'Team spot or bigger role',
  'Play in college or university': 'College or university',
  'Decision-making and basketball IQ': 'Basketball IQ',
  'Get ready for a season or tryouts': 'Season or tryout prep',
  'Earn a bigger role on my team': 'Earn a bigger role',
  "I haven't played competitively yet": 'Not competitively yet',
  'Multiple positions': 'Multiple',
  'Yes, full-game footage': 'Full-game footage',
  'Yes, some games/clips': 'Some games or clips',
  'Not currently, but I can get it': 'I can get footage',
  'A parent or guardian': 'Parent or guardian',
};
export const APPLICATION_SCREENS: ApplicationScreen[] = [
  { key: 'full_name', section: 'Your details', question: "What's your full name?", field: 'full_name', type: 'text', placeholder: 'Your name', fields: ['athlete_name', 'first_name', 'last_name'] },
  { key: 'age', section: 'Your details', question: 'How old are you?', field: 'age', type: 'number', placeholder: '17', fields: ['age'] },
  { key: 'contact', section: 'Your details', question: 'Where can we reach you about your application?', subtext: "We'll use these details to contact you about your application and call.", type: 'group', kind: 'contact', fields: ['email', 'phone', 'athlete_email', 'athlete_phone'], subs: [
    { field: 'email', kind: 'email', label: 'Email', placeholder: 'you@email.com' },
    { field: 'phone', kind: 'tel', label: 'Phone number', placeholder: '416-555-0123' },
  ] },
  { key: 'social_link', section: 'Your details', question: "What's your Instagram or X handle?", field: 'social_link', type: 'text', placeholder: '@yourusername or a profile link', fields: ['social_link'] },
  { key: 'city_state', section: 'Your details', question: 'Where are you based?', subtext: 'Your city and province or state help us understand where you play.', field: 'city_state', type: 'location', fields: ['city'] },
  { key: 'goal', section: 'Your goals', question: 'Where would you like basketball to take you?', subtext: 'Choose the goal that matters most to you right now.', field: 'goal', type: 'radio-grid', options: GOAL_OPTIONS, detailField: 'goal_detail', detailOption: 'Something else', detailLabel: 'Tell us the goal you have in mind', detailPlaceholder: 'Tell us what you’re working toward', detailMultiline: true, fields: ['goal'] },
  { key: 'game', section: 'Your game', question: 'Tell us about your game', type: 'group', kind: 'game', fields: ['position', 'years_playing', 'years_playing_answer', 'current_team', 'current_team_school'], subs: [
    { field: 'position', kind: 'radio-grid', label: 'What position do you usually play?', options: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center', 'Multiple positions'] },
    { field: 'years_playing', kind: 'radio-grid', label: 'How long have you played competitively?', options: ["I haven't played competitively yet", 'Less than 1 year', '1 to 2 years', '3 to 4 years', '5+ years'] },
    { field: 'current_team_school', kind: 'school', label: 'What team or school do you currently play for?', alternative: "I'm not on a team right now" },
  ] },
  { key: 'biggest_weakness', section: 'Your game', question: "What's holding your game back right now?", subtext: 'Choose what you’d most like help improving.', field: 'biggest_weakness', type: 'radio-grid', options: IMPROVEMENT_OPTIONS, detailField: 'biggest_weakness_detail', detailOption: 'Something else', detailLabel: 'What would you like help improving?', detailPlaceholder: 'A few words or a recent game example are enough', detailMultiline: true, fields: ['biggest_weakness'] },
  { key: 'film_access', section: 'Your fit', question: 'Do you have access to footage from your games?', field: 'film_access', type: 'radio-grid', options: FILM_ACCESS_OPTIONS, fields: ['film_access'] },
  { key: 'application_reason', section: 'Your goals', question: 'Why are you applying right now?', subtext: 'Choose what brought you here today.', field: 'application_reason', type: 'radio-grid', options: APPLICATION_REASON_OPTIONS, detailField: 'application_reason_detail', detailOption: 'Something else', detailLabel: 'What made now feel like the right time?', detailPlaceholder: 'Tell us what brought you here', detailMultiline: true, fields: ['application_reason'] },
  { key: 'guardian', section: 'Your support', question: 'Who will be involved in deciding whether to join?', subtext: 'Share their contact details so they can be included in the call.', type: 'group', kind: 'parent', fields: ['decision_support', 'parent_name', 'guardian_name', 'parent_phone', 'guardian_phone', 'parent_email', 'guardian_email'], subs: [
    { field: 'decision_support', kind: 'radio-grid', label: 'Who is supporting your application?', options: ['A parent or guardian', 'Another supporter'] },
    { field: 'guardian_name', kind: 'text', label: 'Their full name', placeholder: 'Full name' },
    { field: 'guardian_phone', kind: 'tel', label: 'Their phone number', placeholder: '416-555-0123' },
    { field: 'guardian_email', kind: 'email', label: 'Their email', placeholder: 'their@email.com' },
  ] },
  { key: 'guardian_aware', section: 'Your support', question: "Have you told your parent or supporter you're applying?", subtext: 'This helps us understand where you are in the conversation.', field: 'guardian_aware', type: 'choice', options: ['Yes', 'Not yet'], fields: ['parent_aware', 'guardian_aware', 'guardian_consent'] },
];

export function isMinor(form: Pick<ApplicationFormData, 'age'>): boolean {
  return !form.age || Number(form.age) < 18;
}
export function needsSupporter(form: Pick<ApplicationFormData, 'age' | 'decision_support'>): boolean {
  return !form.age || Number(form.age) < 20;
}
export function screenIsVisible(key: string, form: ApplicationFormData): boolean {
  if (key === 'guardian' || key === 'guardian_aware') return needsSupporter(form);
  return true;
}
export function visibleSubFields(question: ApplicationScreen, form: ApplicationFormData): SubField[] {
  if (question.type !== 'group') return [];
  if (question.kind === 'parent') {
    return question.subs.filter(sub => sub.field === 'decision_support' || needsSupporter(form)).map(sub =>
      sub.field === 'decision_support' && sub.kind === 'radio-grid' && isMinor(form)
        ? { ...sub, options: ['A parent or guardian'] } : sub);
  }
  return question.subs;
}

/** Preserve written drafts and decode custom answers stored in canonical columns. */
function restorePresetAnswers(form: ApplicationFormData): ApplicationFormData {
  for (const question of APPLICATION_SCREENS) {
    if (question.type !== 'radio-grid' || !question.detailField || !question.detailOption) continue;
    const answer = form[question.field];
    const customOptions = [question.detailOption, ...(question.key === 'goal' ? ['Another goal'] : [])];
    const prefix = customOptions.map(option => `${option}\n`).find(prefix => answer.startsWith(prefix));
    if (prefix) {
      form[question.detailField] = answer.slice(prefix.length);
      form[question.field] = question.detailOption;
    } else if (customOptions.includes(answer)) {
      form[question.field] = question.detailOption;
    } else if (answer && !question.options.includes(answer)) {
      form[question.detailField] = answer;
      form[question.field] = question.detailOption;
    }
  }
  return form;
}

export function applicationAnswerValue(question: ApplicationScreen, form: ApplicationFormData): string {
  if (question.type === 'group') return '';
  if (question.type === 'radio-grid' && question.detailField && form[question.field] === question.detailOption) {
    return `${question.detailOption}\n${form[question.detailField].trim()}`;
  }
  return form[question.field];
}

function presetAnswer(form: ApplicationFormData, field: ApplicationField): string {
  const question = APPLICATION_SCREENS.find(question => question.key === field)!;
  return applicationAnswerValue(question, form);
}

export function normalizeApplicationDraft(raw: unknown): ApplicationFormData {
  const form = { ...EMPTY_APPLICATION };
  if (!raw || typeof raw !== 'object') return form;
  for (const key of Object.keys(form) as ApplicationField[]) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'string' || typeof value === 'number') form[key] = String(value);
  }
  if (form.guardian_aware === 'No') form.guardian_aware = 'Not yet';
  form.years_playing = form.years_playing.replace('1–2 years', '1 to 2 years').replace('3–4 years', '3 to 4 years');
  if (form.device_access === "I don't want film yet") {
    form.film_readiness = FILM_DECLINED;
    form.device_access = '';
  }
  if (!form.decision_support && form.guardian_name) form.decision_support = 'A parent or guardian';
  return restorePresetAnswers(form);
}

const ALLOWED_DIRECT_ANSWERS = new Set([
  "I'm not on a team right now",
  "I'm not sure what to focus on yet",
  NO_SOCIAL,
]);

function normalizedAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[!1]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't');
}

function containsAbusiveLanguage(value: string): boolean {
  const normalized = normalizedAnswer(value);
  const separated = normalized.replace(/[^a-z]+/g, ' ');
  const explicitWords = /\b(?:fuck(?:ing|ed|er|ers|s)?|shit(?:ty|ting|s)?|bitch(?:es|ing)?|ass(?:es)?|asshole(?:s)?|bastard(?:s)?|bullshit|motherfucker(?:s)?|cunt(?:s)?|cock(?:s)?|pussy|pussies|whore(?:s)?|slut(?:s)?|dickhead(?:s)?|faggot(?:s)?|nigger(?:s)?)\b/i;
  // Require separators between every letter here. Ordinary contiguous words
  // are handled above; this avoids substring false positives in real names.
  const disguisedWords = /f\W+u\W+c\W+k|s\W+h\W+i\W+t|b\W+i\W+t\W+c\W+h|c\W+u\W+n\W+t/i;
  return explicitWords.test(separated) || disguisedWords.test(normalized);
}

function looksLikeThrowawayText(value: string): boolean {
  const normalized = normalizedAnswer(value).replace(/[^a-z\d]+/g, ' ').trim().replace(/\s+/g, ' ');
  const compact = normalized.replace(/\s/g, '');
  const throwaways = new Set([
    'idk', 'i dont know', 'dunno', 'test', 'testing', 'blah', 'rubbish', 'random',
    'whatever', 'none', 'nothing', 'no idea', 'na', 'n a', 'lol', 'lmao', 'yes',
    'no', 'maybe', 'stuff', 'answer', 'placeholder', 'asdf', 'asdfgh', 'qwerty', 'abc',
  ]);
  if (throwaways.has(normalized)) return true;
  if (/^(?:asdf|qwer|zxcv|hjkl|1234)/.test(compact)) return true;
  if (/(.)\1{3,}/.test(compact)) return true;
  if (/^(.{1,4})\1{2,}$/.test(compact)) return true;
  if (/^[bcdfghjklmnpqrstvwxyz]{7,}$/i.test(compact)) return true;
  return false;
}

export function applicationWrittenAnswerError(value: string): string | null {
  if (ALLOWED_DIRECT_ANSWERS.has(value)) return null;
  if ([...value.matchAll(/\p{L}/gu)].length < 2) return 'Give us a real answer so we can understand you.';
  if (containsAbusiveLanguage(value)) return 'Keep your answer respectful and basketball focused.';
  if (looksLikeThrowawayText(value)) return 'Give us a real answer so we can understand you.';
  return null;
}

export function applicationFieldError(field: ApplicationField, value: string): string | null {
  const v = value.trim();
  const labels: Partial<Record<ApplicationField, string>> = {
    full_name: 'your name', age: 'your age', city_state: 'your city and province or state',
    email: 'your email', phone: 'your phone number', guardian_name: 'their name',
    guardian_phone: 'their phone number', guardian_email: 'their email',
    biggest_weakness: 'what you would like help improving', social_link: 'your Instagram or X handle',
    goal: 'what you’re working toward', application_reason: 'why you’re applying right now',
    goal_detail: 'the goal you have in mind', biggest_weakness_detail: 'what you want help improving', application_reason_detail: 'why you’re applying right now',
    current_team_school: 'your team or school, or choose the option below',
  };
  if (!v) return labels[field] ? `Add ${labels[field]} to continue.` : 'Choose the option that best describes you.';
  if (v.length > 4_000) return 'Keep your answer under 4,000 characters.';
  if (field === 'full_name' || field === 'guardian_name') {
    if (!/\p{L}/u.test(v)) return 'Enter a name using letters.';
    if (field === 'full_name' && !/\S+\s+\S+/.test(v)) return 'Enter your first and last name.';
    if ([...v.matchAll(/\p{L}/gu)].length < 2) return 'Enter at least two letters for the name.';
    const qualityError = applicationWrittenAnswerError(v);
    if (qualityError) return qualityError;
  }
  if (field === 'age' && (!/^\d+$/.test(v) || Number(v) < 13 || Number(v) > 35)) return 'This program accepts players aged 13 to 35.';
  if ((field === 'email' || field === 'guardian_email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter an email in this format: name@example.com.';
  if ((field === 'phone' || field === 'guardian_phone') && (!/^[+\d\s().-]+$/.test(v) || v.replace(/\D/g, '').length < 10 || v.replace(/\D/g, '').length > 15)) return 'Enter a full phone number, including the area or country code.';
  if (field === 'city_state' && (!v.includes(',') || v.split(',').slice(0, 2).some(part => !part.trim()))) return 'Enter your city and province or state, such as Toronto, Ontario.';
  if (field === 'social_link' && !/^@?[a-z\d._]{1,30}$/i.test(v) && !/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|twitter\.com|x\.com)\/[a-z\d._]+\/?(?:\?.*)?$/i.test(v)) return 'Enter your @handle or a link to your Instagram or X profile.';
  if (['current_team_school', 'biggest_weakness', 'goal', 'application_reason', 'goal_detail', 'biggest_weakness_detail', 'application_reason_detail', 'heard_about_detail', 'city_state'].includes(field)) {
    const qualityError = applicationWrittenAnswerError(v);
    if (qualityError) return qualityError;
  }
  return null;
}

export function applicationScreenError(question: ApplicationScreen, form: ApplicationFormData): { field: ApplicationField; message: string } | null {
  const fields = question.type === 'group' ? visibleSubFields(question, form).map(sub => sub.field) : [question.field];
  for (const field of fields) {
    const message = applicationFieldError(field, form[field]);
    if (message) return { field, message };
  }
  const choices = question.type === 'group' ? visibleSubFields(question, form).filter(sub => sub.kind === 'radio-grid')
    : question.type === 'radio-grid' || question.type === 'choice' ? [question] : [];
  for (const choice of choices) {
    if ('options' in choice) {
      const options = choice.options;
      if (!options.includes(form[choice.field])) return { field: choice.field, message: 'Choose one of the available options.' };
    }
  }
  if (question.key === 'guardian' && isMinor(form) && form.decision_support !== 'A parent or guardian') return { field: 'decision_support', message: 'A parent or legal guardian needs to be involved for players under 18.' };
  if (question.type === 'radio-grid' && question.detailField && form[question.field] === question.detailOption) {
    const value = form[question.detailField];
    const message = applicationFieldError(question.detailField, value);
    if (message) return { field: question.detailField, message };
    if (value.length > 3900) return { field: question.detailField, message: 'Keep this answer under 3,900 characters.' };
  }
  return null;
}

export function firstIncompleteApplicationScreen(form: ApplicationFormData): number {
  const index = APPLICATION_SCREENS.findIndex(q => screenIsVisible(q.key, form) && applicationScreenError(q, form));
  return index < 0 ? APPLICATION_SCREENS.length + 1 : index + 1;
}

/** Preserve existing canonical columns and keep new qualification answers distinct. */
export function applicationAnswers(form: ApplicationFormData): Record<string, string | number | null> {
  const [firstName, ...lastName] = form.full_name.trim().split(/\s+/);
  const supporter = needsSupporter(form);
  const goal = presetAnswer(form, 'goal');
  return {
    athlete_name: form.full_name.trim(), first_name: firstName || '', last_name: lastName.join(' '),
    age: form.age ? Number(form.age) : null, city: form.city_state,
    email: form.email.trim(), athlete_email: form.email.trim(), phone: form.phone, athlete_phone: form.phone,
    position: form.position, years_playing: form.years_playing ? (form.years_playing.startsWith('Less') ? 0 : Number(form.years_playing.match(/\d+/)?.[0] ?? 0)) : null,
    years_playing_answer: form.years_playing, current_team: form.current_team_school, current_team_school: form.current_team_school,
    biggest_weakness: presetAnswer(form, 'biggest_weakness'), goal, social_link: form.social_link,
    film_access: form.film_access, application_reason: presetAnswer(form, 'application_reason'),
    decision_support: supporter ? form.decision_support : null,
    parent_name: supporter ? form.guardian_name : null, guardian_name: supporter ? form.guardian_name : null,
    parent_phone: supporter ? form.guardian_phone : null, guardian_phone: supporter ? form.guardian_phone : null,
    parent_email: supporter ? form.guardian_email.trim() : null, guardian_email: supporter ? form.guardian_email.trim() : null,
    parent_aware: supporter ? form.guardian_aware : null, guardian_aware: supporter ? form.guardian_aware : null,
    guardian_consent: isMinor(form) && form.guardian_aware === 'Yes' && form.guardian_consent === 'Yes' ? 'Yes' : null,
  };
}

/** Decode the existing database aliases for validation at the public API boundary. */
export function applicationFormFromAnswers(answers: Record<string, unknown>): ApplicationFormData {
  const form = { ...EMPTY_APPLICATION };
  for (const field of Object.keys(form) as ApplicationField[]) {
    const value = answers[field];
    if (typeof value === 'string' || typeof value === 'number') form[field] = String(value);
  }
  form.full_name = typeof answers.athlete_name === 'string' ? answers.athlete_name : '';
  form.city_state = typeof answers.city === 'string' ? answers.city : '';
  form.years_playing = typeof answers.years_playing_answer === 'string' ? answers.years_playing_answer : '';
  return restorePresetAnswers(form);
}

export function applicationSubmissionError(form: ApplicationFormData): { key: string; message: string } | null {
  for (const question of APPLICATION_SCREENS) {
    if (!screenIsVisible(question.key, form)) continue;
    const error = applicationScreenError(question, form);
    if (error) return { key: question.key, message: error.message };
  }
  if (isMinor(form) && (form.guardian_aware !== 'Yes' || form.guardian_consent !== 'Yes')) {
    return { key: 'guardian_aware', message: 'Before submitting, ask your parent or legal guardian to review your application and the terms with you.' };
  }
  return null;
}
