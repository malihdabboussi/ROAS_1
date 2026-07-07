# Changelog - June 20, 2026

## [2026-06-20 09:01] - [FIX]

What: Added optional avatar portrait attachment to `generate_image` via `avatar_id`.
Why: Agents needed a clean one-action flow for generating, uploading, and attaching avatar portraits instead of manually chaining `generate_image` and `update_avatar` with nested `persona_data.avatar_image`.
Impact: `generate_image` still works without an avatar; when `avatar_id` is provided it validates the avatar before provider spend, resolves the avatar campaign for media upload, preserves existing persona data, writes the uploaded URL to `persona_data.avatar_image`, and returns avatar attachment metadata.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.ts`, `apps/agent-api/src/modules/artifacts/repositories/artifact-legacy-media-generate.repository.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-media-generate.service.test.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `.docs/logs/changelog2026-06-20.md`, `.docs/plans/agent-follow-up-work.md`

---

## [2026-06-20 09:05] - [FIX]

What: Upgraded presentation-generation instructions to a fixed-stage 16:9 HTML-bundle contract with deck anti-patterns, composition references, self-review checks, and corrected presentation action examples.
Why: Agents were treating decks like responsive webpages, causing thumbnail/main preview layout drift, centered narrow slides, inconsistent slide widths, and low-quality card-heavy outputs.
Impact: New presentation guidance tells Vibey and reporting flows to build one coherent `html_bundle` deck with 1280x720 slides, no viewport reflow, and source-level QA before saving. The migration seeds the upgraded skill/resources into the DB-first skill system.
Files: `supabase/migrations/20260620121054_presentation_builder_fixed_stage_skill.sql`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `docker/agents/vibey/skills/vibey-api/SKILL.md`, `docker/agents/atlas/skills/campaign-performance-reporting/SKILL.md`, `docker/agents/atlas/skills/campaign-performance-reporting/references/presentation-template.md`, `docker/agents/vibey/skills/presentation-builder/SKILL.md`, `docker/agents/vibey/skills/presentation-builder/references/*.md`

---

## [2026-06-20 23:44] - [FIX]

What: Added platform-level `analyze_image` support for agents and hardened prompts/output/traces against API key, token, and secret requests.
Why: Agents were missing a first-party image inspection path for Drive/media/carousel workflows and could steer users toward user-owned OpenAI/API-key workarounds.
Impact: Agents now see `analyze_image` in Vibey action docs, action policy, DTO/registry dispatch, gateway tool catalogs, uploaded-image context, and media handlers. Image analysis uses Vibey-managed server credentials only. Outbound chat text and saved traces now redact secret values, rewrite direct secret requests, and the all-agent prompt/shared template explicitly forbid asking for keys or tokens.
Files: `apps/agent-api/src/modules/artifacts/services/artifact-missions-media-image.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-missions-media.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-capability.policy.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/agent-api/src/modules/chat/utils/secret-redaction.util.ts`, `apps/agent-api/src/modules/chat/services/response-filter.service.ts`, `apps/agent-api/src/modules/chat/services/tracing.service.ts`, `apps/openclaw/src/agents/system-prompt.ts`, `apps/openclaw/src/agents/pi-embedded-helpers/errors.ts`, `docker/agents/templates/shared/TOOLS.md`, `documentation/features/document-intelligence.md`
