# Application v5 implementation

Implemented September 11, 2026. Website code is local; no public website or coach dashboard deployment has been made.

## User decisions reflected

- Ask the basketball goal second, followed by playing background and a short coaching priority.
- Preserve required location, athlete email/phone, social, referral source, parent/supporter contact details and parent awareness.
- Offer truthful no-social-account and cannot-remember-source answers.
- No displayed price. Financial fit asks about openness to paid coaching, not affordability of an undisclosed amount.
- Under 18 requires a parent/legal guardian. Adults deciding alone skip guardian contacts/awareness. Parent awareness is distinct from reported guardian review/consent.
- Separate film-coaching interest, access to footage and actual device access. Declining film is saved for coach review, not silently disqualified.
- Calm validation, editable review, explicit call step, preserved existing drafts.
- New questions apply only to new applicants. Existing submissions retain their original dashboard labels and fields, without empty v5 question cards. Existing browser drafts and booking resumes use the frozen original form; new starts use v5.
- Both save and submit refuse to change an existing application's question generation. A new v5 submission cannot overwrite an older contact-only record through email reconciliation.
- No height field added because its qualification purpose was not confirmed.

## Verification

- Site: 19 progress/submission/compatibility tests pass; TypeScript passes; production build passes.
- Scoped lint: no errors; one pre-existing unused-variable warning in Cal webhook.
- Database: five nullable TEXT columns added with migrations/2026-09-11-application-v5.sql to the verified existing application project. No existing answers changed.
- Local API draft-only smoke test passed against that database. Contact, parent, social, referral, new qualifications and dynamic question count persisted. No submission/email. Its synthetic draft was soft-deleted.
- Coach integration: API and frontend builds pass in the isolated checkout; seven version/branch/progress helper tests pass.
- No browser automation or visual screenshot QA performed.

## Coach integration source

The main MVP checkout contains substantial unrelated uncommitted work and was not modified.
Integration was implemented separately at:

/private/tmp/tdt-application-integration.rqNiIU

Its clean baseline is origin/main at 13c1126. A portable patch is saved alongside this document:

application-v5-coach-integration.patch

It adds optional-column probing, normalized qualification fields, version-specific progress descriptors, key-first current-question resolution, stored branch counts, submitted-review details, and safe plain-text rendering of social handles/no-account answers.

For v5, aggregate per-question drop-off is deliberately not inferred from raw ordinals, because conditional branches make ordinal comparisons misleading. Individual current-question tracking and overall completion still work. Reliable per-question conversion requires a separate reached-event history.

## Before publishing

1. Integrate the coach patch into fresh MVP main without including unrelated work. Run its tests/build with the correct production environment. Deploy coach API and UI first; verify both draft progress and submitted review display new answers.
2. The additive database migration above is already applied, but recheck schema availability before shipping.
3. In the site repo, fetch and merge origin/main, preserve unrelated landing edits/assets, run npm run test:progress and npm run build, and push the exact validated source. Do not deploy an older or unpushed checkout.
4. Publish publicly only after user approval. No public approval was requested during this implementation turn.
5. Verify the live /apply bundle has goal second, form_version 5 and the intended questions; perform a narrowly scoped draft-only save check and retire its test record. Do not send real test email or book calls.

Tools: scripts/migrate-application-v5.mjs defaults to a schema check (explicit --apply required to alter columns). scripts/verify-application-v5-draft.mjs is restricted to localhost:3000 and retires only its own UUID-tagged synthetic draft.
