# How it works: design and interactive demo

Replaces the previous four-column `HowItWorks` block through its existing export. The rest of the landing page, `/apply`, its validation and application tracking are unchanged by this implementation.

This record includes earlier refinements. The final sections supersede the historical local-only/link-only chat descriptions: the current desktop chat calls the secure server endpoint, uses OpenAI when configured, permits four visitor messages separately in each of the film, review and practice chats, retains the composer after completion, and permits natural multi-sentence replies. Mobile remains visual-only.

## Design and behaviour

The four supplied CSS exports define the typography, spacing, progress dots, dark gradient panel, product images, bubble shapes, and community cards. The first frame's fourth label was inconsistent with frames 2–4; the implementation uses the final community stage consistently. The large heading scrolls away before the original four topic columns and single panel pin together. Normal page scroll advances the four stages. The desktop product/chat content retains at least 467px of height; short laptops reduce decorative panel padding only. Product screenshots retain their intrinsic aspect ratios, fully contained with no cropping or stretching. A time-based animation smooths the line without intercepting scrolling. Clicking the numbered steps also works; arrow keys, Home and End navigate them. The rejected stacked-panel layout and floating description strip are removed.

Phones now show a visual-only walkthrough. The whole scene pins below the fixed site header and respects the top safe area. Native page swipes advance the same four stages and animate the spine, with no wheel or touch interception. The numbered topics also remain tappable, with touch targets larger than 44px. Full step titles and descriptions sit above the product. Chat composers, example messages, community profile overlays, file selection and extra pagination controls are hidden on mobile to keep the walkthrough simple.

Mobile uses a stable viewport-relative pin height so changing descriptions cannot shift stage thresholds. The product's available height is measured from the actual controls and description, and updates when the viewport or description changes. Screenshots are fully contained at their original 1500:1385 ratio, with no cropping or stretching. Short landscape screens use compact description typography. Reduced-motion mode keeps manual topic selection and a sticky topic bar in normal document flow. Desktop retains the interactive conversations, local video preview and profile overlays described below.

Each of the first three topics now loads with its complete three-message coach-and-athlete exchange already visible, matching the supplied screenshot. There is no automatic greeting, staged playback, typewriter, or waiting before the visitor can add a message. The example conversation is present in the initial HTML. It follows the same illustrative athlete, Elijah (17, matching his existing profile), aiming for college basketball: excitement at his first full-game upload; discovering he checks the help defender too late; practising that read and noticing it in his next game; then asking peers how they practise it. The final community cards continue that same topic. These are example product conversations, not testimonials or promises of results.

Visitors append their own messages beneath the preloaded exchange. After a 700–1,200ms typing pause, the response gives one short, relevant coaching observation using the existing topic-aware training helper. The same incoming bubble then invites them to work on it together and shows a compact “Apply for the 100-Day Program” button linking to `/apply`. A small automated-preview label distinguishes it from a live reply. Nothing appears before a visitor sends, and there is no separate footer button or helper paragraph. The composer always reads “Message Jaiden…” and no longer gains an outline when focused.

New messages retain the 720ms slide-and-settle animation, with reduced-motion support. Topic conversations and drafts stay separate; a pending reply returns to its source topic. Empty, over-300-character, duplicate and simultaneous submissions are blocked. Replies run locally using `trainingFallback`; they make no API request and do not store messages, identifiers or counters. Old AI demo session limits no longer lock the input. Reloading restores only the example story.

Profile cards open on hover, keyboard focus, or tap, with Escape and outside-tap dismissal. Existing profile information and card-relative overlay placement are preserved. Elijah's card leads the illustrative community conversation, followed by peer replies; only their displayed message previews and ordering change. These are static previews, not a connection to private member records.

The file-picker is a local product preview: it displays a selected video's name and does not upload or read the video contents. The original example “Game uploaded” state is illustrative.

## Environment and retained server integration

No environment variable is needed for the current local coaching preview. It reuses `trainingFallback` from `lib/trainingAssistant.ts`. The existing `/api/training-chat` and `lib/trainingChatServer.ts` AI utilities remain in place, but this interface does not call the endpoint. Its optional `OPENAI_API_KEY` and `TDT_CHAT_MODEL` configuration is therefore not used by this interaction. Existing server validation/rate-limit tests remain regression coverage for that retained endpoint.

## Files changed in the plain composer refinement

- `components/TrainingChat.tsx`: removes footer text and standalone CTA; returns a fixed application link inside the chat after sending.
- `components/HowItWorks.module.css`: replaces external CTA styling with a simple accessible text link inside the existing bubble.
- `scripts/verify-how-it-works.mjs`: checks plain initial state, link-only responses, duplicate prevention, topic isolation, no requests/storage and old-session recovery.
- `docs/how-it-works-implementation.md`: current behaviour and configuration.

The section layout, example story, product screenshots and `/apply` are unchanged. This refinement is local only.

## Image weights

Original exports are preserved. New versions are 1500px wide, with responsive Next Image delivery for narrower screens. If an optimized-image request fails, the image automatically retries using the already compressed WebP source. Avatar derivatives are 80px wide for 40px circles at double pixel density.

| Image | Original | Optimized |
| --- | ---: | ---: |
| Community (`Account.png`) | 2,228,257 bytes | 147,628 bytes |
| Film review (`final-meet.png`, stage 2) | 10,425,961 bytes | 167,516 bytes |
| Drills (`final-per.png`, stage 3) | 10,635,711 bytes | 179,176 bytes |
| Training avatar | from original community image | 2,284 bytes |
| Player avatar | from original community image | 1,620 bytes |
| New Jaiden coach avatar (`jaiden-pfp.png`) | 204,173 bytes | 2,644 bytes |

Regenerate derivatives with `node scripts/optimize-how-it-works.mjs`.

The second and third stages use new `final-meet.webp` and `final-per.webp` URLs so previously cached screenshots are not reused. Both original PNGs are preserved; no layout or application changes accompany this image replacement.

## Files changed in the preloaded athlete-story refinement

- `lib/trainingJourney.ts`: one athlete's three scripted exchanges and connected peer messages.
- `components/TrainingChat.tsx`: preloaded examples, no autoplay, visitor messages appended separately.
- `components/HowItWorks.tsx`: connected community copy and ordering, existing profiles preserved.
- `components/HowItWorks.module.css`: subtle example-community caption only; animation timing and layout retained.
- `tests/training-chat.test.mjs`: story consistency and concise-copy checks.
- `scripts/verify-how-it-works.mjs`: immediate/SSR examples, no playback, append-only interaction and history isolation checks.
- `docs/how-it-works-implementation.md`: this record.

No new environment variables or production deployment accompany this change.

## Files changed in the previous chat refinement

- `components/TrainingChat.tsx`: demo disclosure, accessible labels and complete-message arrival.
- `components/HowItWorks.module.css`: slide-and-settle animation and readable demo disclosure.
- `lib/trainingAssistant.ts`: first-person openings/fallbacks, honest identity responses and acronym expansion.
- `lib/trainingChatServer.ts`: first-person demo voice instructions; model and API setup unchanged.
- `components/HowItWorks.tsx`: expanded app name in image descriptions.
- `components/LandingProgram.tsx`: removed acronym from landing copy and image descriptions.
- `app/page.tsx`: removed acronym from four FAQ answers only.
- `app/api/training-chat/route.ts`: expanded website name in the origin-error message.
- `scripts/verify-how-it-works.mjs`: complete-message animation, disclosure and reduced-motion checks.
- `tests/training-chat.test.mjs`: voice, identity and acronym regression checks.
- `docs/how-it-works-implementation.md`: this record.

This historical refinement used optional model-backed replies. The current link-only interaction supersedes that behaviour and does not call the model.

## Files changed in the overall section implementation

Updated:

- `components/LandingProgram.tsx`: delegates the existing `HowItWorks` export to the new section.

Added:

- `components/HowItWorks.tsx`: scroll progression, step controls, product preview and profile overlays.
- `components/HowItWorks.module.css`: scoped design and responsive styles.
- `components/TrainingChat.tsx`: embedded conversation, typing state, session cap and CTA.
- `lib/trainingAssistant.ts`: shared validation, reply checks and topic-aware fallbacks.
- `lib/trainingChatServer.ts`: server-only model call and basic rate limiter.
- `app/api/training-chat/route.ts`: validated chat endpoint.
- `public/how-it-works/community.webp`
- `public/how-it-works/film-review.webp`
- `public/how-it-works/drills.webp`
- `public/how-it-works/final-meet.webp`: replacement used by stage 2.
- `public/how-it-works/final-per.webp`: replacement used by stage 3.
- `public/how-it-works/avatar-training.webp`
- `public/how-it-works/avatar-player.webp`
- `scripts/optimize-how-it-works.mjs`: reproducible asset compression.
- `scripts/verify-how-it-works.mjs`: isolated desktop/mobile browser verification.
- `tests/training-chat.test.mjs`: route, validation, rate limits, provider and fallback tests.
- `docs/how-it-works-implementation.md`: this implementation record.

Other modified/untracked files visible in `git status` predate this implementation and were preserved.

## Verification

- `npx tsc --noEmit`
- Targeted ESLint for all newly added TypeScript/JavaScript.
- `node --experimental-strip-types --test tests/training-chat.test.mjs`: 10 passing tests.
- `npm run test:progress`: 20 passing tests.
- `npm run build`: successful production build with `/api/training-chat` included.
- Browser verification uses Playwright. Set `PLAYWRIGHT_MODULE_PATH` if Playwright is provided outside the project, and `CHROME_EXECUTABLE` for a locally installed Chrome. Run `node scripts/verify-how-it-works.mjs`; optional `TDT_TEST_URL` selects another local server.
- Browser checks cover desktop/mobile step controls, preloaded example exchanges, a plain composer, application links only after sending, preserved animation, duplicate prevention, independent drafts and conversations, source-topic reply isolation, no API requests or stored messages, stale-session recovery, profiles, video previews, image proportions and responsive layouts.
- SHA-1 checks confirm `/apply` page, CSS and form-validation source remain identical to their pre-task state.

This is a local implementation, not a production deployment.

## Mobile refinement

- `components/HowItWorks.tsx`: compact topic labels, full mobile descriptions, Previous/Next navigation, native return to the scene, mobile profile dismissal and touch-release handling.
- `components/HowItWorks.module.css`: sticky mobile topic bar, larger touch targets, natural scene height, readable conversation spacing, complete initial messages and bounded extended history.
- `components/TrainingChat.tsx`: keyboard Send hint and extended-history marker.
- `scripts/verify-how-it-works.mjs`: real mobile topic and pagination taps, persistent navigation, full initial messages, every profile, dismissal, input sizing, local replies, keyboard-sized viewports and reduced motion across six phone/landscape sizes.
- `docs/how-it-works-implementation.md`: current mobile behavior and verification notes.

No new environment variables are required.

## Mobile sticky-scroll simplification

The owner's latest direction supersedes the previous mobile chat/profile refinement: mobile is a visual walkthrough with automatic sticky scroll progression, and desktop remains interactive.

- `components/HowItWorks.tsx`: stable mobile panel measurements, description resize observation and shared scroll-driven stage selection.
- `components/HowItWorks.module.css`: whole-scene mobile pinning, preserved screenshot ratios, visual-only mobile previews and reduced-motion behavior.
- `scripts/verify-how-it-works.mjs`: six phone/landscape sizes, real native forward/backward touch swipes, automatic stage progression, contained products, animated spine, chapter taps and untrapped section exit; desktop chat coverage remains.
- `docs/how-it-works-implementation.md`: latest mobile behavior.

## Short desktop browser windows

The previous desktop `max-height: 759px` rule removed the sticky pin and scroll track. This made progression stop entirely on smaller laptop windows, including MacBooks with less vertical space after browser chrome or display scaling. Short desktop windows now retain the native scroll track and a stable viewport-height pin. A flex frame reserves the actual topic height and assigns the remaining space to the original two-column product/chat panel. Screenshots remain fully contained at their original aspect ratios. Community cards fit the available interaction area; desktop chat retains its scrollable history and visible composer. Larger desktop windows and mobile are unchanged. Reduced-motion users retain the existing manual topic selection.

`scripts/verify-how-it-works-desktop-scroll.mjs` verifies native forward/backward wheel progression, all four stages in order, the animated spine, complete frame visibility, screenshot proportions and desktop chat at 1366×600, 1366×650, 1440×700, 1280×720, 1440×759, 768×650 and 1440×900. Set `TDT_TEST_URL` to run the same checks against production. No new environment variables are required by the site.

## Useful reply and compact application invitation

- `components/TrainingChat.tsx`: one relevant coaching observation before the interface-owned apply invitation, using the existing local training helper.
- `components/HowItWorks.module.css`: removed the composer focus outline; a readable incoming response bubble with a subtle separator and compact apply button replaces the bare underlined link.
- `scripts/verify-how-it-works.mjs`: focused composer has no outline, reply matches the visitor's challenge, preview disclosure and application CTA, preserved chat behavior and topic isolation.
- `docs/how-it-works-implementation.md`: current reply behavior and configuration.

No new environment variables. Mobile remains visual-only; progression, product screenshots and `/apply` are unchanged.

## Coach and athlete avatar swap

The coach now uses `public/how-it-works/avatar-jaiden.webp`, an 80×80 derivative of the owner's uploaded `public/jaiden-pfp.png`. The former coach photo (`avatar-training.webp`) is now the athlete avatar. This applies to the preloaded conversation, new visitor messages, coach replies and typing indicator. The original upload and previous avatar assets are preserved. Regenerate only the new derivative with `node scripts/optimize-how-it-works.mjs --jaiden-avatar-only`.

## Progression line handoff

The line no longer stops at the fourth topic. Its first 75% of scroll travel reaches the four marker centres; the final 25% fills the trailing segment to the right edge as the sticky section releases into the next content. Marker positions are measured from the actual desktop/mobile layout, so the line aligns with the final dot at all widths. Mobile also has a trailing segment and uses the shared animation instead of layering a second CSS transition over it. Native scrolling, track length and the existing page layout are unchanged. `lib/howItWorksProgress.ts` holds the continuous progress mapping, covered by `tests/how-it-works-progress.test.mjs`; both browser verification scripts check movement during the final stage and backward scrolling.

## Circle activation aligned with the visible line

The active topic now follows the displayed, eased line rather than raw scroll progress. A circle activates as soon as the fill touches its left edge, with subpixel marker measurements on desktop and mobile. At crossings only, React commits the selected topic before the same animation frame paints; reverse scrolling deactivates it when the line retreats past that edge. Reduced-motion manual navigation stays immediate. Unit tests cover exact contact and both directions; `scripts/how-it-works-line-probe.mjs` samples rendered geometry every frame during the desktop wheel and mobile touch tests to catch any activation offset.

## Contextual replies, shared message cap and Andre portrait

The chat once again uses the existing secure `/api/training-chat` endpoint. Each topic sends only its own visitor exchanges, bounded to four history turns; screenshot conversations are not presented as the visitor's history. Replies directly address the newest question before the interface-owned application invitation. The no-key/offline fallback now distinguishes next steps, interest, missing film, program details and cost questions, and resolves basketball follow-ups from earlier visitor messages. The automated preview disclosure remains on generated replies.

The whole demo permits three sends per browser session, shared across topics and surviving refresh. Empty, overlong, duplicate and concurrent submissions do not consume a send. Session storage contains only a random anonymous identifier and count, never message text; the conversation stays in memory. Failed requests count toward the cap to prevent retry spam. The existing endpoint adds process-local session, IP and global limits; these are basic protection, not a distributed hard spending limit. After exhaustion (including server-side rate limiting), the composer becomes a compact application invitation. Offline/provider failures produce a relevant fallback answer.

`OPENAI_API_KEY` is required in the server environment for generated AI replies. Set it privately in `.env.local` for localhost, or in Vercel's Production environment for the live site; these environments are separate. `TDT_CHAT_MODEL` optionally overrides the existing `gpt-4.1-mini` model. Keys never enter the client bundle. The existing provider request keeps `store: false`; that does not constitute a guarantee of zero provider retention. API setup was checked against [official OpenAI Responses documentation](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).

Andre's card and hover profile both use a wider, body-inclusive crop, compressed to a 104×104 WebP derivative (2,912 bytes) of `public/Andre-Narciso.jpeg`, preserving the upload. Both circles show only the photo: transparent backing, no border, outline or shadow, with no change to avatar size or layout. Regenerate with `node scripts/optimize-how-it-works.mjs --andre-avatar-only`. Other member avatars and mobile's visual-only walkthrough are unchanged.

Files changed for this update:

- `components/TrainingChat.tsx`
- `lib/trainingChatSession.ts` (new)
- `lib/trainingAssistant.ts`
- `lib/trainingChatServer.ts`
- `components/HowItWorks.tsx`
- `components/HowItWorks.module.css`
- `public/how-it-works/avatar-andre.webp` (new derivative)
- `scripts/optimize-how-it-works.mjs`
- `tests/training-chat.test.mjs`
- `scripts/verify-training-chat.mjs` (new)
- `scripts/verify-how-it-works.mjs`
- `docs/how-it-works-implementation.md`

`scripts/verify-training-chat.mjs` tests distinct direct replies through the real local route, bounded history, keyboard/click submission, typing delay, a shared refresh-proof cap, no persisted messages, offline and rate-limit states, Andre's card/overlay image and visual-only mobile. The server unit tests cover validation, abuse limits and the provider request with a mock, without real AI spending.

Verification: the focused browser checks, all 11 training-chat unit tests, 20 application-progress tests, 5 progression tests, targeted lint and production build passed. The broader existing desktop verifier still intermittently times out in its pre-existing community hover loop (`scripts/verify-how-it-works.mjs`, line 105); the focused Andre card/profile test passes, including after the opening animation. No deployment has been performed for these local changes.

## Natural OpenAI replies without a sentence-count gate

The owner requested removal of the two-sentence restriction. The previous validator rejected an otherwise valid OpenAI answer solely because it contained three sentences, silently substituting the fallback. Replies now use a natural short conversational paragraph, with no sentence-count or 65-word gate. The shared 1,200-character safety bound covers both displayed replies and follow-up history; the provider token budget is 256. A bounded 16 KiB request limit accommodates the existing four history turns, including UTF-8 text. Impersonation, unsupported footage claims, links and markup remain rejected. Input limits, three-message cap, rate limiting, timeouts, fallback behavior, UI-owned application link, model choice and design are unchanged.

Files changed for this fix:

- `lib/trainingAssistant.ts`: shared reply/request bounds; removed sentence-count rejection; matching history validation.
- `lib/trainingChatServer.ts`: natural response instructions, clear application-first next steps and bounded token budget.
- `app/api/training-chat/route.ts`: matching streamed request byte limit.
- `tests/training-chat.test.mjs`: multi-sentence replies, longer follow-up history and retained safety/request checks.
- `scripts/verify-training-chat.mjs`: optional `TDT_CHAT_VERIFY_AI=1` requires all three browser replies to report `fallback: false`.
- `docs/how-it-works-implementation.md`: configuration and implementation record.

The private local environment file is Git-ignored and must never be committed. These changes remain local until an explicitly authorized deployment.

Verification for this fix: 12 training-chat unit tests, 20 application-progress tests, 5 progression tests, targeted ESLint, `git diff --check` and the production build passed. The focused browser verifier with `TDT_CHAT_VERIFY_AI=1` passed using three genuine OpenAI replies (`fallback: false`), distinct answers, four-turn follow-up history, Enter/click submission, duplicate protection, typing delay, the cross-topic/refresh cap, offline/429 states, both ring-free Andre portraits and visual-only mobile. No deployment was performed.

## Current coach voice, execution knowledge, shared CTA and four messages per chat

The assistant uses a firm, concise and respectful first-person coaching style, with a preference for roughly 25–45 words rather than a fixed sentence count. Its server instructions and eight illustrative exchanges now describe execution as the program's central focus: recognising when to use skills already practised, choosing the right action and timing, and reliably using them against game pressure. Film review, personal feedback and purposeful practice connect skill to decisions and game transfer. This is program knowledge, not a universal diagnosis: some players also need foundational skill development. The fallback also explains execution directly.

The owner's limited background claim is preserved as “trained with Team Canada players”, not coached/developed those players or an official affiliation. Coaching guidance applies worldwide, follows the visitor's own goal, avoids guarantees and detailed prescriptions for unseen film, and identifies the interaction as an automated preview when asked. This is instruction/example customization, not a fine-tuning job or persistent visitor memory, following [official OpenAI prompting documentation](https://developers.openai.com/api/docs/guides/prompt-engineering).

The application invitation now reuses the existing `CTAButton` component unchanged, including the site's pill shape, gradient, hover lift and cursor-following spotlight. There is no initial standalone application button. The removed “That’s the chat preview. Ready to work on your game?” footer is not shown. After the fourth reply in a topic, a compact completion invitation appears inside that reply alongside the CTA; the composer stays visible but is read-only. On refresh, that completed topic retains a compact application button and its composer.

Each of the three chat topics allows **four visitor messages independently**. Session storage v2 contains only an anonymous identifier and `{ film, review, practice }` counts; no messages or personal information are stored. Counts survive refresh and topic changes, while message text remains memory-only. The endpoint enforces the matching per-topic session limits, retaining the existing IP/global abuse limits, no automatic retries, loading/error behavior and duplicate/empty/300-character input protections. A fourth message can include all three previous visitor/assistant exchanges (six history turns), with a 24 KiB streamed request limit. The fourth community stage remains profile cards, not an added chat.

Changed files for these refinements:

- `components/TrainingChat.tsx`
- `components/HowItWorks.module.css`
- `lib/trainingAssistant.ts`
- `lib/trainingChatSession.ts`
- `lib/trainingChatServer.ts`
- `app/api/training-chat/route.ts`
- `tests/training-chat.test.mjs`
- `tests/training-chat-session.test.mjs` (new)
- `scripts/verify-training-chat.mjs`
- `scripts/verify-how-it-works.mjs`
- `docs/how-it-works-implementation.md`

No new environment variable is required. The previously configured private `OPENAI_API_KEY` is used; `TDT_CHAT_MODEL` remains optional. These refinements are local only and do not change `/apply` or publish other pending landing-page work.

The focused browser verifier passed using four genuine OpenAI replies with six-turn follow-up context, keyboard/click submission, typing delay, duplicate protection, the shared CTA's hover/spotlight, independent refresh-proof topic budgets, retained composer, offline/429 states, both Andre portraits and visual-only mobile. Mock-response CTA checks passed at seven desktop sizes, including short laptop windows, without additional AI requests. The broader verifier's old shared-cap assertions have been updated; its previously noted community-hover timeout is not claimed resolved by these chat refinements.

Current execution-knowledge verification: one synthetic request through the local server returned a genuine OpenAI reply (`fallback: false`, 47 words), explicitly connecting execution to an existing move, the right game moment, decisions/timing and film-led practice. All 17 chat/session tests, 5 progression tests, 20 application-progress tests, targeted ESLint and the production build (including TypeScript) passed. `TDT_CHAT_VERIFY_MOCK=1` runs the focused UI verifier without provider usage; do not combine it with `TDT_CHAT_VERIFY_AI=1`.

The mocked focused browser run also passed all twelve sends (four per topic), their `[0, 2, 4, 6]` history lengths, each topic's completion state and all three caps after refresh, plus CTA hover, composer visibility, duplicate/loading behavior, offline/429 handling, both Andre portraits and visual-only mobile. No additional provider calls were made by that run.

## Owner-described program journey and app knowledge

Added the owner's fuller program description as durable server-side context on every chat request, not persistent visitor memory. The tone and execution focus remain unchanged. Acceptance/onboarding leads to real game film review of strengths and weaknesses, then personally assigned practice linked to that film. The described program structure includes weekly cohort calls and individual calls when needed, daily habits, an app calendar, recorded drill modules selected for the athlete's situation, uploaded end-of-module assessments, coach-assigned development ratings, planned professional-player guest sessions and completion/graduation after 100 days. It is designed to complement existing training, not replace the athlete's team or require abandoning their routine.

The owner used both present and future wording. Availability of the newly described features has not yet been confirmed, so the assistant explains them as the intended design and refers current enrollment guarantees to the fit call. It must not invent guaranteed weekly private calls, guest names, review frequency, pass criteria, daily workload, rating scales, professional scouting credentials, post-program access or zero-effort scheduling promises. The offline fallback now answers these same program questions with matching qualifications. This knowledge follows the context approach in [official OpenAI prompting documentation](https://developers.openai.com/api/docs/guides/prompt-engineering).

Changed for this knowledge update: `lib/trainingChatServer.ts`, `lib/trainingAssistant.ts`, `tests/training-chat.test.mjs` and this record. No design, limit, model, key, route or application changes; no deployment.

Verification: 18 chat/session tests and 5 progression tests passed, with targeted lint, `git diff --check` and the production build including TypeScript. Three synthetic questions through the real local route returned genuine OpenAI replies (`fallback: false`) in the review, practice and film topics: weekly group versus as-needed private calls (33 words), compatibility with team training (43 words), and uploaded end-of-module assessments (39 words). The replies selected the relevant program facts rather than listing the whole offer. No visitor data was saved and nothing was pushed or deployed.
