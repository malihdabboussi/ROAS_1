# Changelog - August 23, 2026

## [2026-08-23 15:31] - [FEATURE]

What: Added a permission-scoped `synthesize_user_brain_topic` MCP action that retrieves several topic angles, deduplicates and groups Brain evidence, reports coverage gaps, and returns stable evidence refs. Added Claude MCP guidance and a Claude plugin skill for cited personal-topic answers.

Why: Claude could search individual User Brain queries but lacked one reliable workflow for questions such as “What do I think about webinars?” across memories, beliefs, perspectives, decisions, frameworks, and stories.

Impact: Claude clients can request one bounded User Brain dossier and write an evidence-backed answer without a separate auth path, raw broad-memory listing, or uncited server-generated prose.

Files: `packages/agent-policy/src/*`, `apps/agent-api/src/modules/artifacts/*`, `apps/agent-api/src/modules/agent-sync/*`, `apps/agent-api/src/modules/vibey-mcp/*`, `apps/openclaw/src/agents/*`, `docker/tools/vibey-backend/index.ts`, `docker/agents/templates/brain_scholar/TOOLS.md`, `plugins/roas-missions/*`, `documentation/features/mcp-brain-audit.md`
