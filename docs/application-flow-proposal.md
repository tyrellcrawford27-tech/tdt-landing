# Think Different Training application proposal

Prepared 11 September 2026. A proposed experience and question script, based on the current repository and published research. This document does not change the running form.

## Outcome

Help suitable players explain what they want, give Jaiden useful context, and reach a relevant coaching conversation. Evaluate success by qualified calls attended per application start, alongside form completion, rather than by completions alone.

The proposed emotional sequence is: aspiration, current game, useful coaching need, practical fit, clear next step. The exact sequence is a design hypothesis to test with TDT applicants, not a scientifically proven conversion formula.

## What the current implementation reveals

The current form has 14 screens containing 18 data fields. Seventeen fields are required. Booking follows the form.

- The aspirational goal is question 10. Contact details, device access, an improvement essay, and a required social account come first.
- The goal asks both the desired level and why the player believes they can achieve it. Validation requires at least 25 characters and three words.
- The weakness answer needs at least 20 characters and three words. Some uncertainty phrases are rejected. A useful answer such as “Weak hand finishing” can fail on length.
- Repeated validation failures produce capitalized demands such as “ACTUALLY ANSWER IT.” and shake the card.
- Name validation can reject legitimate names because it looks for conventional English vowels and limits character sets.
- Every applicant must provide a supporter's name, email, and phone. Answering “No” to whether that person knows about the application blocks everyone, including adults.
- The social handle is required with no explicit way to say the applicant has no account. Attribution is optional, but that is not clearly advertised.
- The device question mixes hardware with interest in coaching. “I don't want film yet” is an accepted response, but does not identify a device or explain the reason.
- The intro does not explain the required call. The progress bar reaches 100% before booking begins.
- Height is not currently collected. Adding it is a new field, not simply moving an existing question.

These are observed behaviors in the code. They establish plausible friction and several deterministic blocks; they do not prove the cause of any particular applicant's exit.

## Research and its practical limits

1. **Start with engaging, easy questions and group topics coherently.** Pew recommends this approach and generally postpones demographics unless they determine eligibility or routing. That supports moving the goal earlier while keeping age reasonably early for eligibility. It does not identify one universally optimal sequence. [Pew questionnaire guidance](https://www.pewresearch.org/writing-survey-questions/).
2. **Reduce the effort needed to formulate answers.** Pew's analysis associates greater cognitive burden with more unanswered open questions. That supports selectable factual answers and one focused written coaching question. Item nonresponse in surveys is not the same outcome as abandoning a commercial application. [Pew's original analysis](https://www.pewresearch.org/decoded/2021/10/14/why-do-some-open-ended-survey-questions-result-in-higher-item-nonresponse-rates-than-others/).
3. **Personally meaningful disclosure can be rewarding.** Tamir and Mitchell found behavioral and neural evidence across laboratory studies. This makes an aspiration question a reasonable opening hypothesis. It does not establish that people enjoy every personal question or that asking about height improves completion. [Original study](https://pmc.ncbi.nlm.nih.gov/articles/PMC3361411/).
4. **Progress feedback has mixed effects.** Conrad and colleagues found that progress perceived as slow could increase abandonment; adding an indicator was not a guaranteed improvement. Use clear, truthful expectations and distinguish completing the form from booking. [Original study](https://pmc.ncbi.nlm.nih.gov/articles/PMC2910434/).
5. **A goal is different from imagining guaranteed success.** Experiments on idealized positive fantasies found reduced energization in those conditions. They did not test this application. Ask about an ambition, then ground the conversation in a present coaching need and feasible availability. [Kappes and Oettingen, 2011](https://doi.org/10.1016/j.jesp.2011.02.003).
6. **Ask only useful questions, allow truthful alternatives, and explain sensitive requests.** Official questionnaire guidance supports these practices and testing the whole flow with intended respondents. [Government Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/questionnaire-design-guidance/).

## Proposed introduction

Keep the existing line, “Every journey toward excellence begins with a single step.” Add useful expectations beneath it:

> Tell us about your game, what you're working toward and where you'd like help. Then choose a time to talk with Jaiden about whether the program is a fit.

> This is a paid, 100 day coaching program built around your game film and personalised drills.

Show the verified current program price and currency here. Do not infer an available discount from a URL or hard-code one from this proposal. The repository contains $1,000 standard and $800 conditional early pricing, but availability and currency need verification before this copy is implemented.

Button: **Start my application**.

Show a brief parent/guardian requirement for under-18 applicants, matching the actual terms and operating policy. Add a duration estimate only after timing representative players on phones. An invented “two minutes” promise would undermine this redesign.

## Proposed order and exact copy

These are logical screens. Conditional follow-ups may change the count, so do not advertise this as a fixed number of questions before the final branching is implemented and tested.

### 1. Name

**What's your full name?**

Input: name. Support real names without vowel tests, forced Latin spelling, or assumptions about the number of name parts. Separate the displayed name from any downstream first/last name storage requirements.

### 2. Aspiration

**Where would you like basketball to take you?**

Helper: **Choose the goal that matters most to you right now.**

Single selection:

- Earn a bigger role on my team
- Make a school, club or prep team
- Play in college or university
- Play professionally
- I'm still figuring that out
- Another goal

Offer an optional short field: **Anything specific you're aiming for?**

For “Another goal,” request a short description. Do not ask applicants to defend their potential here. Preserve the distinction between what they aspire to and whether the current program fits their needs.

### 3. Age

**How old are you?**

Numeric input. This is early because the existing form has eligibility and guardian implications. Preserve the existing policy until the owner confirms a change; do not silently invent a new age range. Explain a real eligibility mismatch politely and provide a relevant next step.

### 4. Playing profile

**Tell us about your game.**

Two short, separately labelled selections:

- **What position do you usually play?** Keep the existing positions and “Multiple positions.”
- **How long have you played competitively?** Keep meaningful experience ranges and provide “I haven't played competitively yet.”

Do not assume years played demonstrates the level of skill. The next question and the coaching conversation supply context.

Height is optional for this redesign. If Jaiden uses it before the call, add **How tall are you?** here, with feet/inches and centimetres, plus **Not sure**. It should not block an otherwise useful application unless height is an explicitly established eligibility criterion. Do not collect it just to make the player talk about themselves.

### 5. Current team

**What team or school do you play for?**

Helper: **Your current team or school is enough.**

Allow a normal text/search response or **I'm not on a team right now**. The latter is usable context, not a malformed answer. Keep a path for players between teams.

### 6. Coaching need

**What's one part of your game you'd most like help improving?**

Helper: **A short answer is enough. A recent game example helps if one comes to mind.**

Placeholder: **For example, I rush my decisions when defenders pressure me.**

This is the principal written coaching question. Accept concise meaningful answers. Remove arbitrary minimum words/characters as proxies for commitment. Offer **I'm not sure what to focus on yet** as a truthful answer that Jaiden can explore on the call. That is distinct from someone explicitly refusing feedback.

Do not promise an automatic personalized diagnosis from this answer unless that feature actually exists.

### 7. Contact and location

**Where can we reach you about your application?**

Helper: **We'll use these details to contact you about your application and call.**

Fields: email, phone, city and province/state. Give each a persistent label, appropriate keyboard, and autocomplete. Keep phone required only if it is part of the real follow-up process; otherwise mark it optional.

This placement follows useful basketball context and precedes practical qualification. Moving it later has a tradeoff: fewer people who leave early will be contactable. Test that alongside completion, and keep saving drafts before contact details are collected. Those drafts contain names and should not be described as anonymous.

### 8. Feasible training time

**On a typical training day, how much time could you set aside for this program?**

Helper: **Think about what fits alongside your team, school or work.**

Single selection:

- Less than 30 minutes
- 30 to 45 minutes
- More than 45 minutes, up to an hour
- More than an hour
- I need help working out a schedule

These choices describe available time, not a recommended training load or an established acceptance threshold. Confirm the program's actual minimum before screening people out. If days per week are essential to fit, ask that explicitly rather than inferring it from this answer.

### 9. Fit with film coaching

Context: **Jaiden uses your game film to identify what to work on and build your drills.**

**How do you feel about learning this way?**

- I'd like that kind of coaching
- I'd like to understand how it works first
- I don't want film coaching right now

For the first two answers, a short conditional follow-up can ask:

**Do you have access to footage from your games?**

- Yes
- I can ask my team or someone who records games
- Not yet, I'd need help figuring that out

Helper: **Team footage or a recording from the stands can work. It doesn't need to be edited.**

Do not require an upload in the initial application. Do not equate lack of footage with refusal to use film.

Move device choice to onboarding unless it affects qualification. If it must stay, ask it only after the film explanation and use actual device options plus **I need help finding an option**. Store willingness and hardware separately. The previous “I don't want film yet” intent belongs in the willingness question.

A player who explicitly declines film should get a clear explanation that the current program centres on film. Let them revise their answer or save their progress. Do not automatically call them qualified or silently sell them a different program.

### 10. Decision support

For adult applicants:

**Who will be involved in deciding whether to join?**

- I'm deciding for myself
- A parent or guardian
- Another supporter

For under-18 applicants, explain the parent/guardian requirement and show the appropriate guardian path directly. A generic supporter does not replace a legal guardian where consent is required.

Where someone else is involved:

**Have you had a chance to talk with them about the program?**

- Yes
- Not yet

“Not yet” should explain the next step and allow saving a draft. Preserve the terms' requirement for guardian review/acceptance before a minor's formal application is submitted. Do not allow an unsupported claim of consent to be inferred from “they know.” Adult applicants deciding for themselves should not be blocked by this question.

Collect the involved person's name and invitation email when needed; require a second phone number only if there is a defined operational need. Do not send invitations merely because someone typed an email. Send them through the approved application/booking action.

### 11. Financial readiness

Repeat the verified current price and currency, already visible before starting.

**If the coaching is a fit, where are you with the program cost?**

- It could work for me
- I need to discuss it with my parent or supporter
- I'd like to understand what's included before deciding
- It's outside my budget right now

These are triage answers, not a pressure tactic or a payment authorization. Do not imply financing, instalments, scholarships, or discounts unless they are actually available. Someone outside budget should receive an honest explanation of available next steps, and should not silently be counted as immediately ready to purchase.

This is a proposed new field. Its necessity depends on whether budget is truly part of pre-call qualification.

### 12. Review and the call

Show a compact editable summary so applicants can catch mistakes without losing answers. Make the final action explicit: **Submit and choose a call time**.

After successful submission:

> Your answers are in. Let's talk about your next step.
>
> Choose a time to talk with Jaiden about your goals, your game and whether the program fits.

Add the guardian sentence only on the relevant path. Show the verified call duration. The source currently contains a 20 minute email reference and a calendar URL ending in 30min; check the actual calendar configuration before displaying a duration.

Keep distinct states: answers submitted, guardian action needed where applicable, call booked, call attended. A saved draft is not a submitted application, and a booking is confirmed only by the existing server verification.

After booking, offer optional **Instagram or X handle** and **How did you hear about us?** with a visible skip action, or collect them on the call if extra post-booking UI is not useful. Attribution from a known campaign can be recorded automatically where already supported.

## Interaction details that matter

- Keep short factual selections easy to tap. Keep one cognitively demanding question on a screen; do not present huge cards merely to claim fewer steps.
- Show goals, game, fit and call as clear stages. If displaying a count, compute it from the actual branch. Do not show the entire application as complete while required booking remains.
- Show the save status truthfully. Preserve the existing ability to resume on the same device. Never promise cross-device restoration without implementing and testing it.
- Preserve Back navigation, selections and typed answers. Do not advance unexpectedly while someone is editing a selection.
- Put explanations beside the relevant field, not only in placeholders that disappear during typing.
- Use calm, specific errors. Examples: “Enter your email in this format: name@example.com.” and “Choose the option that best describes you.” Repeated attempts should not become harsher.
- Maintain visible keyboard focus and readable contrast. Test with the phone keyboard open, including errors and long names.
- If parents commonly fill this out, add an unobtrusive applicant-role choice on the introduction and adapt pronouns. Do not force parents to impersonate the athlete.

## Qualification and testing

Use the form to identify the coaching need, development context, practical availability, openness to the method, and decision readiness. Reachability and any actual eligibility rules still matter. Neither choosing “professional” nor writing a long essay is evidence of coachability by itself.

Provisional triage categories:

- **Ready for a fit conversation:** coaching need within scope, open to the method, plausible time, decision process understood.
- **Needs clarification:** unclear priority, no footage yet, schedule or cost questions, supporter discussion pending.
- **Current mismatch:** explicitly declines the core method, needs basic coaching outside the advertised scope, or cannot meet an established requirement. Apply confirmed business policy rather than invented thresholds.

Pretest the whole flow with several actual target players on their phones, including a younger player and a parent where relevant. Ask them what they think each question means and observe hesitation, validation failures and completion. These sessions diagnose usability; they do not establish a statistical conversion lift.

Track views, answers, validation failures, save failures, resumes, submission, booking confirmation and attended qualified calls by form version and device class. Use stable question identifiers and avoid recording raw contact data or answer text in analytics events. Current progress snapshots identify the latest state, but are not a complete event history.

Primary outcome: qualified attended calls per unique application start. Secondary outcomes: completed forms per start, bookings per completed form, share of bookings judged qualified, time to finish, and errors. Compare people who actually reached a question; three departures without a denominator cannot establish its effect.

Start with usability/validation fixes. If volume supports a randomized test, test an early-goal versus later-goal order while holding other changes constant. Decide sample needs from the real baseline and meaningful effect size. With low volume, report trends and uncertainty rather than claiming a winning test. Define qualification before comparison so the standard does not shift to favour the new flow.

## Implementation requirements

The public form feeds the separate coach dashboard. Preserve that integration.

1. Keep stable existing keys and canonical fields. Synchronize visible questions and the shared definitions in lib/applicationProgress.ts. Bump the form version and update old draft restoration to use the first incomplete question in the new order.
2. New height, willingness, footage, budget or branching data requires additive database/API and dashboard support before the public form sends it. Do not repurpose device_access to store willingness or silently rename fields with historical answers.
3. Make optional/conditional logic consistent in the UI, validation, resume behavior, progress calculation and server. Grouped fields currently ignore the standalone OPTIONAL set.
4. Normalize old drafts against defaults when adding fields. Preserve revision ordering, retries, unload saves and booking verification.
   Post-submission optional answers require a secure, narrowly scoped update path; the current progress endpoint does not update submitted applications. Otherwise collect those details during the call.
5. Preserve the current under-18 consent policy until explicitly changed. Confirm any hard age, level, training, cost and parent participation rules before enforcing new gates.
6. Before deployment, fetch and integrate origin/main; run npm run test:progress and npm run build; push the validated changes and deploy that exact commit. If migrations are required, deploy additive changes first. Verify the live /apply bundle and question saves afterward, using the approved production test process.

The recommended first release is the new order, focused goal/improvement wording, calm validation, explicit call expectations, and clear optional fields. Add new qualification fields only when they change a real coaching or scheduling decision, with the supporting integration in place.
