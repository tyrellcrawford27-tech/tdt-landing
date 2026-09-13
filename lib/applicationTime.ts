import {
  APPLICATION_SCREENS, applicationFieldError, applicationScreenError,
  screenIsVisible, visibleSubFields, type ApplicationField, type ApplicationFormData,
} from '@/lib/applicationForm';

// Planning estimates, not measured completion times. Reading and the final
// answer review are included; choosing a call slot is a separate step.
const FIELD_SECONDS: Partial<Record<ApplicationField, number>> = {
  full_name: 20, email: 25, phone: 20, biggest_weakness: 40,
  city_state: 25, current_team_school: 20, social_link: 20,
  guardian_name: 20, guardian_email: 25, guardian_phone: 20,
};
const REVIEW_SECONDS = 45;
const START_SECONDS = 300;
// Keep the opening estimate consistent across branches. The longest initial
// path has 400 seconds of answer weights; scale those into a 255-second budget.
const ANSWER_WEIGHT_BUDGET = 400;

export function applicationTimeEstimate(form: ApplicationFormData) {
  let remaining = REVIEW_SECONDS;
  for (const question of APPLICATION_SCREENS) {
    if (!screenIsVisible(question.key, form)) continue;
    if (question.type === 'group') {
      for (const sub of visibleSubFields(question, form)) {
        const seconds = FIELD_SECONDS[sub.field] ?? 15;
        const complete = sub.kind === 'radio-grid'
          ? sub.options.includes(form[sub.field])
          : !applicationFieldError(sub.field, form[sub.field]);
        if (!complete) remaining += seconds;
      }
    } else {
      const seconds = FIELD_SECONDS[question.field] ?? 15;
      if (applicationScreenError(question, form)) remaining += seconds;
    }
  }
  const answerSeconds = Math.max(0, remaining - REVIEW_SECONDS)
    * (START_SECONDS - REVIEW_SECONDS) / ANSWER_WEIGHT_BUDGET;
  return { remainingSeconds: REVIEW_SECONDS + answerSeconds, totalSeconds: START_SECONDS };
}

export function formatApplicationTime(seconds: number) {
  const rounded = Math.ceil(seconds / 5) * 5;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  if (!minutes) return `${rounded} sec`;
  return `${minutes} min${remainder ? ` ${remainder} sec` : ''}`;
}
