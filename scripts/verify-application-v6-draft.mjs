// Clearly labelled synthetic drafts only. Never submit, book or send email.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { APPLICATION_SCREENS, EMPTY_APPLICATION, applicationAnswers, screenIsVisible } from '../lib/applicationForm.ts';

const target = new URL(process.env.TDT_APPLY_VERIFY_ORIGIN || 'http://localhost:3000');
if (!['localhost','127.0.0.1','thinkdifferenttraining.com','www.thinkdifferenttraining.com','tdt-landing.vercel.app'].includes(target.hostname)) {
  throw new Error('Choose the existing public application origin explicitly.');
}
const client = createClient('https://eyqlgdlovvipidpdraqb.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});

for (const age of ['19','20']) {
  const key = randomUUID();
  const desired = {
    ...EMPTY_APPLICATION, full_name:'TDT Release QA ' + age, age,
    email:`tdt-v6-qa-${key}@example.invalid`, phone:'416-555-0100', social_link:'@tdt_qa_test',
    city_state:'Toronto, Ontario', goal:'Play in college or university',
    position:'Point Guard', years_playing:'3 to 4 years', current_team_school:'QA Test School',
    biggest_weakness:'Something else', biggest_weakness_detail:'Defensive footwork against quicker players',
    film_access:'Yes, full-game footage', application_reason:'Something else', application_reason_detail:'Get ready for upcoming school tryouts',
    decision_support:'A parent or guardian', guardian_name:'QA Parent', guardian_phone:'416-555-0101',
    guardian_email:`tdt-qa-parent-${key}@example.invalid`, guardian_aware:'Not yet',
  };
  const form = {...EMPTY_APPLICATION};
  const questions = APPLICATION_SCREENS.filter(q => screenIsVisible(q.key,desired));
  try {
    for (const [index, question] of questions.entries()) {
      const fields = question.type === 'group' ? question.subs.map(sub=>sub.field) : [question.field];
      if ('detailField' in question && question.detailField) fields.push(question.detailField);
      for (const field of fields) form[field] = desired[field];
      const response = await fetch(new URL('/api/apply/save-progress',target), {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({draft_key:key,revision:Date.now()+index,form_version:6,question_key:question.key,completed:true,
          identity:{athlete_name:form.full_name,athlete_email:form.email},answers:applicationAnswers(form)}),
      });
      assert.equal(response.status,200,`Live ${question.key} draft save must succeed.`);
      const {data,error} = await client.from('applications').select('application_state,form_version,total_questions,current_question_key,current_question_number,last_answered_question_key,athlete_email,current_team_school,film_access,application_reason,biggest_weakness,guardian_email,guardian_phone,submitted_at').eq('draft_key',key).single();
      assert.equal(error,null,'Read back only this synthetic draft.');
      assert.equal(data.application_state,'draft');
      assert.equal(data.submitted_at,null);
      assert.equal(data.form_version,6);
      const next = questions[index+1] ?? question;
      assert.equal(data.current_question_key,next.key);
      assert.equal(data.current_question_number,Math.min(index+2,questions.length));
      assert.equal(data.last_answered_question_key,question.key);
      assert.equal(data.total_questions,index === 0 || age === '19' ? 12 : 10);
      if (index >= 2) assert.equal(data.athlete_email,desired.email);
      if (index >= 6) assert.equal(data.current_team_school,desired.current_team_school);
      if (index >= 7) assert.equal(data.biggest_weakness,applicationAnswers(desired).biggest_weakness);
      if (index >= 8) assert.equal(data.film_access,desired.film_access);
      if (index >= 9) assert.equal(data.application_reason,applicationAnswers(desired).application_reason);
      if (age === '20') assert.equal(data.guardian_email,null);
      if (index >= 10) {
        assert.equal(data.guardian_email,desired.guardian_email);
        assert.equal(data.guardian_phone,desired.guardian_phone);
      }
    }
    console.log(`PASS: age ${age}, ${questions.length} live question saves and readbacks; preset/custom answers retained. No submission or email.`);
  } finally {
    const {error} = await client.from('applications').update({deleted_at:new Date().toISOString(),deleted_by:'application-v6-release-qa'}).eq('draft_key',key).eq('application_state','draft');
    if(error) throw new Error('QA draft retirement failed: '+error.code);
    console.log('Synthetic draft retired with recoverable soft delete.');
  }
}
