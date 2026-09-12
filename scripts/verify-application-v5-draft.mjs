import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { EMPTY_APPLICATION, applicationAnswers, FILM_DECLINED } from '../lib/applicationForm.ts';

const target = new URL(process.env.TDT_APPLY_VERIFY_ORIGIN || 'http://localhost:3000');
if (target.hostname !== 'localhost' || target.port !== '3000') throw new Error('This check only targets the local application server.');
const key = randomUUID();
const client = createClient('https://eyqlgdlovvipidpdraqb.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const form = {
  ...EMPTY_APPLICATION, full_name: 'TDT Application QA ' + key, age: '17',
  goal: 'Play in college or university', email: 'tdt-v5-qa-' + key + '@example.invalid',
  phone: '416-555-0100', city_state: 'Toronto, Ontario', position: 'Point Guard', years_playing: '1 to 2 years',
  current_team_school: 'QA Test School', biggest_weakness: 'Weak hand finishing', social_link: '@tdt_qa_test',
  time_commitment: '30 to 45 minutes', film_readiness: FILM_DECLINED,
  decision_support: 'A parent or guardian', guardian_name: 'QA Parent', guardian_email: 'qa-parent@example.invalid',
  guardian_phone: '416-555-0101', guardian_aware: 'Not yet',
  investment_readiness: "I'd like to understand what's included before deciding", heard_about: 'A friend or teammate',
};
try {
  for (const [index, question] of ['full_name', 'goal', 'film_readiness', 'heard_about'].entries()) {
    const response = await fetch(new URL('/api/apply/save-progress', target), {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({draft_key:key, revision:Date.now() + index, form_version:5, question_key:question,
        completed:question !== 'heard_about', identity:{athlete_name:form.full_name}, answers:applicationAnswers(form)}),
    });
    assert.equal(response.status, 200, 'Local draft save must succeed.');
  }
  const {data, error} = await client.from('applications').select('application_state,form_version,total_questions,current_question_key,film_readiness,device_access,guardian_phone,guardian_aware,investment_readiness,heard_about,athlete_email').eq('draft_key',key).single();
  assert.equal(error, null, 'Read back only this synthetic draft.');
  assert.equal(data.application_state, 'draft');
  assert.equal(data.form_version, 5);
  assert.equal(data.total_questions, 15);
  assert.equal(data.current_question_key, 'heard_about');
  assert.equal(data.device_access, null);
  for (const field of ['film_readiness','guardian_phone','guardian_aware','investment_readiness','heard_about']) assert.equal(data[field], form[field]);
  assert.equal(data.athlete_email, form.email);
  console.log('PASS: local v5 saves verified against database; parent, contact, qualification and referral answers preserved. No submission or email.');
} finally {
  // Retire only this test's random draft, retaining recoverability and audit data.
  const {error} = await client.from('applications').update({deleted_at:new Date().toISOString(),deleted_by:'application-v5-qa'}).eq('draft_key',key).eq('application_state','draft');
  if (error) throw new Error('QA draft cleanup failed: ' + error.code);
  console.log('Synthetic test draft retired (soft delete).');
}
