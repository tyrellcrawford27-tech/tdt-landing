<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Application answer choices

For subjective application questions, default to four answer cards: three useful presets and a "Something else" option that opens a text input. Keep the existing card design and spacing. Use concise, clear answer labels that fit on one line where possible; allow natural wrapping on small screens rather than clipping text or shrinking the existing typography. Use more choices only when the question genuinely needs them, such as basketball positions or competitive playing experience. Keep complete factual categories (such as footage access) and binary questions in their natural formats rather than adding filler choices. Preserve existing draft answers when changing presets.

## Production application tracking

The public form writes applications used by the separate Think-Different-MVP coach dashboard. Deploying a stale form can restore the old contact-only save and break tracking even when the dashboard is current.

Before deploying, fetch `origin/main`, merge the latest site changes, run `npm run test:progress` and `npm run build`, and push the validated changes. Deploy that exact commit. Do not deploy an older checkout or an unpushed branch over production. When progress fields change, deploy the additive database/API migration before the public form. Check the live `/apply` bundle and verify question saves after deployment.
