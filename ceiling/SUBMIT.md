# WebMCP Challenge submission checklist

Official source of truth: https://webmcp.devpost.com/rules
Site: https://webmcp.devpost.com/
OpenAI page: https://openai.com/webmcp-challenge/

Gate: **3 Sep 2026, 1:00pm PT**. The binding Devpost challenge page and
Official Rules showed 1:00pm PT when rechecked on 26 Aug 2026. An OpenAI
overview showed 5:00pm PT, so the Devpost time governs. Recheck the binding
Rules immediately before submission.

## You click (accounts I cannot create)

1. Join the hackathon: https://webmcp.devpost.com/ — **Join Hackathon** (Devpost account). Required before Netlify credits.
2. Netlify 3,000 credits (first 1,000, registered entrants only): https://forms.gle/xw75XGUQzCXEiALc7 — closes **1 Sep 2026, 12:00pm PT**. Redeem by 3 Oct 2026. Not cash.
3. Optional Vercel $30 build credits (first 1,000): promo code
   `OAIWEBMH-9E2F-MUT4` via the Vercel path on
   https://webmcp.devpost.com/resources
4. Chrome origin trial token for https://xclusivexo.com (visitors skip the flag): candidate register URL https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241 — then ship `Origin-Trial` header or `<meta http-equiv="origin-trial">`. Judges can also use ChatGPT’s in-app browser with no token. Flag for local: `chrome://flags/#enable-webmcp-testing`.
5. Render $50 credits (up to 500 claims): link is on https://webmcp.devpost.com/resources under Render “Participant credits”.

## Deployment conformance gate

Before recording the demo or treating the live URL as WebMCP-capable:

1. Serve the exact reviewed closure over HTTPS at the submitted top-level
   origin.
2. Preserve origin isolation. Do not use `document.domain`; serve
   `Origin-Agent-Cluster: ?1` and never opt out with the `?0` value.
3. Keep tools same-origin. If an explicit permissions header is sent, use
   `Permissions-Policy: tools=(self)`; do not delegate to cross-origin frames.
4. Install the origin-trial token while Chrome requires it.
5. Inspect the live response headers, source identity, and console before any
   tool call.
6. In a supported browser, require all eleven reviewed tools to register, then
   call read, denial, proposal, unarmed-effect, and isolated-probe controls.
7. Save a redacted browser receipt. Stop if the API is absent, registration is
   partial, any schema is rejected, the output budget trips, or deployment
   bytes differ from the reviewed closure.

The full dated source-to-browser matrix is
`evaluation/WEBMCP-COMPATIBILITY.md`.

## Submission packet

- Working HTTPS URL that passes the deployment conformance gate in a supported
  WebMCP browser.
- Public source repository with this MIT license and dated challenge-period
  history. Confirm the license is detected and visible in the repository About
  panel.
- Text: why WebMCP, better UX, what humans+agents can do now, how you implemented `document.modelContext.registerTool`.
- Public YouTube demo, **< 3 minutes**, with audio. It must show the project
  functioning and must not use third-party trademarks, copyrighted music, or
  other protected material without permission.
- This site pre-existed 25 Aug 2026. Preserve dated commits showing the new
  WebMCP work after the submission period opened, and include
  `NEW-VS-OLD.md`.

## Operator attestations before submit

- Confirm individual eligibility, age of majority, supported-country
  residency, and absence of a disqualifying sponsor/judge conflict.
- Confirm Alex Price is the entrant and owns the submission and every
  submission component, or has documented permission for each third-party
  component.
- Confirm all open-source dependencies and assets comply with their licenses
  and no private, credential, personal, or third-party confidential material
  is present.
- Confirm the working project matches the text and video, is free for judges
  to access, and will remain available through the judging period ending
  21 Sep 2026 at 5:00pm PT.
- Confirm this is the entrant's sole submission unless the Official Rules
  clearly permit the intended entry structure.

## Submission freeze

- Before 3 Sep 2026 at 1:00pm PT, save and verify the final Devpost draft,
  repository commit, live deployment, and video URLs.
- After the deadline, do not change the submitted Devpost entry, repository,
  or live site until winners are announced. Continue development only in a
  separate fork that cannot alter the submitted version.
- Preserve screenshots and hashes proving what judges could access at the
  deadline and through judging.

## Attribution

Entrant and publisher: Alex Price (StellarRequiem). Do not imply sponsor
authorship, co-ownership, endorsement, or product status.

## Not claimed until done

- Devpost join, credits forms, origin-trial token, public source repository,
  live deployment, browser conformance receipt, demo video, final submission.
