# How it works: design and interactive demo

Replaces the previous four-column `HowItWorks` block through its existing export. The rest of the landing page, `/apply`, its validation and application tracking are unchanged by this implementation.

## Design and behaviour

The four supplied CSS exports define the typography, spacing, progress dots, dark gradient panel, product images, bubble shapes, and community cards. The first frame's fourth label was inconsistent with frames 2–4; the implementation uses the final community stage consistently. The large heading scrolls away before the original four topic columns and single panel pin together. Normal page scroll advances the four stages. The desktop product/chat content retains at least 467px of height; short laptops reduce decorative panel padding only. Product screenshots retain their intrinsic aspect ratios, fully contained with no cropping or stretching. A time-based animation smooths the line without intercepting scrolling. Clicking the numbered steps also works; arrow keys, Home and End navigate them. The rejected stacked-panel layout and floating description strip are removed.

Phones now show a visual-only walkthrough. The whole scene pins below the fixed site header and respects the top safe area. Native page swipes advance the same four stages and animate the spine, with no wheel or touch interception. The numbered topics also remain tappable, with touch targets larger than 44px. Full step titles and descriptions sit above the product. Chat composers, example messages, community profile overlays, file selection and extra pagination controls are hidden on mobile to keep the walkthrough simple.

Mobile uses a stable viewport-relative pin height so changing descriptions cannot shift stage thresholds. The product's available height is measured from the actual controls and description, and updates when the viewport or description changes. Screenshots are fully contained at their original 1500:1385 ratio, with no cropping or stretching. Short landscape screens use compact description typography. Reduced-motion mode keeps manual topic selection and a sticky topic bar in normal document flow. Desktop retains the interactive conversations, local video preview and profile overlays described below.

Each of the first three topics now loads with its complete three-message coach-and-athlete exchange already visible, matching the supplied screenshot. There is no automatic greeting, staged playback, typewriter, or waiting before the visitor can add a message. The example conversation is present in the initial HTML. It follows the same illustrative athlete, Elijah (17, matching his existing profile), aiming for college basketball: excitement at his first full-game upload; discovering he checks the help defender too late; practising that read and noticing it in his next game; then asking peers how they practise it. The final community cards continue that same topic. These are example product conversations, not testimonials or promises of results.

Visitors append their own messages beneath the preloaded exchange. After a 700–1,200ms typing pause, the response is only a clickable “Apply for the 100-Day Program →” link inside the incoming chat bubble. The fixed link targets the existing `/apply` route. It never appears before a visitor sends, and there is no separate footer button, disclaimer or helper paragraph. The composer always reads “Message Jaiden…”.

New messages retain the 720ms slide-and-settle animation, with reduced-motion support. Topic conversations and drafts stay separate; a pending reply returns to its source topic. Empty, over-300-character, duplicate and simultaneous submissions are blocked. The current link-only interaction makes no API request and does not store messages, identifiers or counters. Old AI demo session limits no longer lock the input. Reloading restores only the example story.

Profile cards open on hover, keyboard focus, or tap, with Escape and outside-tap dismissal. Existing profile information and card-relative overlay placement are preserved. Elijah's card leads the illustrative community conversation, followed by peer replies; only their displayed message previews and ordering change. These are static previews, not a connection to private member records.

The file-picker is a local product preview: it displays a selected video's name and does not upload or read the video contents. The original example “Game uploaded” state is illustrative.

## Environment and retained server integration

No environment variable is needed for the current link-only chat. The existing `/api/training-chat`, `lib/trainingChatServer.ts` and `lib/trainingAssistant.ts` AI utilities remain in place, but this interface no longer calls the endpoint. Its optional `OPENAI_API_KEY` and `TDT_CHAT_MODEL` configuration is therefore not used by this interaction. Existing server validation/rate-limit tests remain regression coverage for that retained endpoint.

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
