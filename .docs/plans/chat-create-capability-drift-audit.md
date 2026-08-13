# Chat Create Capability Drift Audit

Generated: 2026-08-12

## Purpose

Verify that every composer action exposed by the shared Chat Create catalog is executable by Vibey, not merely present in the UI. The intended consumer is the managed chat agent operating inside an attached Campaign or Space.

## Result Summary

- Known drift rows: none.
- Direct product gaps: none across the thirteen active composer creation routes.
- Critical conclusion: every active Create action is present in the hard action list, executable schema, runtime registry, Vibey policy allowlist, and generated action docs. Mission is validated separately through the canonical Quick Mission catalog and worker playbook registry.

## Compared Surfaces

| UI route | Runtime action | Schema | Registry | Policy | Action docs |
| --- | --- | --- | --- | --- | --- |
| Offer | `create_offer` | Present | Present | Present | Present |
| Avatar / ICP | `create_avatar` | Present | Present | Present | Present |
| Document / Script | `create_docx` | Present | Present | Present | Present |
| Presentation | `create_presentation` | Present | Present | Present | Present |
| Funnel | `create_funnel` | Present | Present | Present | Present |
| Ad | `create_ad` | Present | Present | Present | Present |
| Email Sequence | `create_sequence` | Present | Present | Present | Present |
| Image | `generate_image` | Present | Present | Present | Present |
| Video | `generate_video` | Present | Present | Present | Present |
| Website | `create_website` | Present | Present | Present | Present |
| Social Post | `create_social_post` | Present | Present | Present | Present |
| Ad Campaign | `create_ad_campaign` | Present | Present | Present | Present |

## Drift Rows

None. The expanded known-gap guard expects an empty drift baseline.

## Runtime Verification Note

The signed-in production smoke test created a document chat, started Webinar Fulfillment in parallel, and observed the persistent transcript Mission card plus background task entries. The launched Webinar mission (`cec929da-1319-43c6-be3d-91169c861baa`) exposed a worker defect: its outbox plan event reached an active BullMQ consumer, but the mission remained in `inbox` for roughly 28 minutes while the worker repeatedly logged seven-second Supabase fetch aborts. An authenticated production REST probe took 29 seconds, proving the worker's copied seven-second timeout was below the live database response window. The unchanged production worker eventually caught a faster response and persisted the complete 22-step Webinar plan at `pending_approval`; the branch fix removes the repeated-abort delay by using the same 60-second resilient-fetch window as the API and checking outbox mission status through the configured native Postgres pool before using the HTTP fallback.

Authentication was restored and the remaining production Quick Mission catalog was launched from the same campaign-scoped chat: Static Ad Production (`dc33134c-3a7a-4d50-9ba4-ba988d3bac9a`), IG Organic Video (`eeeca478-1885-43cd-ad0a-06ff3978a1da`), Meta Ads Launch (`29f16148-3522-480b-bfd5-deb2b0e5eca8`), and Meta Ads Audit (`92f08bd9-b2f3-4369-a5f1-d883989a155f`). The runs preserved the source conversation, campaign, Space, playbook id, safe QA context, and human-gated/no-publish intent. Static reproduced a partial API create: the mission row existed while `mission_outbox` was absent and the modal stayed on `Starting…`; a narrowly scoped recovery insert was consumed, and the original API request later persisted the typed receipt. Meta launches showed a second latency point after mission/outbox creation while the receipt endpoint repeated permission, conversation, existence, and insert database calls. The branch now makes mission creation queue-first, removes the irrelevant create-time campaign activity read, runs audit/profile writes off the response path, dismisses the launcher while work starts in the background, and reduces receipt persistence to one permission read plus one deterministic-id upsert. These production observations validate the defects and their repair paths but do not claim the unshipped branch UI is already deployed.

The production composer still showed the legacy attachment menu and separate Quick Mission rocket, confirming that the shared Create catalog and Mission side-panel branch was not deployed during this run. Its menu-driven Image entry correctly seeded `Generate an image: `, but the submitted QA image request ended during pre-agent warm-up without a persisted user or assistant message and without an artifact. The local optimistic turn disappeared on refresh, while production authentication also expired, so the remaining live Create actions could not be exercised in that browser session. The designated app-runner checkout was then moved briefly and cleanly to this pushed branch, but localhost redirected to sign-in and no authenticated local session was available; the runner was restored to its original branch with its pre-existing generated files untouched. This is recorded as a failed live smoke check rather than an output pass; the source-backed runtime matrix remains the evidence for all twelve creation actions until an authenticated app-runner or deployed session is available.

## Acceptance Criteria

- The Create catalog contract test maps every active composer item to its intended action.
- The capability drift test compares every mapped action across hard actions, schemas, registry, Vibey policy, and generated docs with no unclassified gaps.
- The focused Agent API creation runtime matrix passes 175 assertions across schema/preflight, dispatch, persistence, output extraction, and post-action verification.
- Frontend payload tests cover all six Quick Mission families.
- Mission Worker tests expand and validate every registered playbook and output-contract action.
- Mission Worker transport tests prove a ten-second Supabase response is not aborted and outbox dispatch uses native Postgres when the production pool is available.
- A deployed/app-runner smoke test confirms the new shared quick-start row and right-side Mission workspace before merge.
