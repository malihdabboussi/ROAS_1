# Changelog - July 26, 2026

## 2026-07-26 10:46 - [FIX]

What: Bounded OpenRouter/OpenClaw context and output growth, made scheduled Customer Brain pattern analysis a single tool-free inference, restored the canonical Opus Power route for Mission runs, capped Gemini reranker reasoning/output, shortened Anthropic cache retention, and removed credential-bearing localhost debug requests.

Why: Production showed $246.77 of OpenRouter usage in seven days while the provider billing ledger captured only $8.32. Aggregate traces identified repeated Brain-operation agent loops, including a 1.26M-token request and scheduled pattern analysis running while the app was idle.

Impact: Normal chat and Mission work keep Claude Sonnet quality and full tools; explicit Power work keeps Opus 4.8, high reasoning, and 1M context. Default runtime context is 65K, ordinary outputs are bounded, stale tool results prune after five minutes, and the preassembled pattern workflow cannot recursively call tools.

Files: `docker/openclaw.json`, `apps/openclaw/src/agents/pi-embedded-runner/run.ts`, `apps/openclaw/src/gateway/openresponses-http.ts`, `apps/agent-api/src/modules/brain/services/brain-reranker.service.ts`, `apps/agent-api/src/modules/brain/services/brain-reranker-deterministic.ts`, `apps/agent-api/src/modules/chat/services/anthropic-claude-admin-auth.service.ts`, `apps/agent-api/src/modules/chat/services/openclaw-model-routing.ts`, `apps/mission-worker/src/modules/brain-ops/brain-ops.processor.ts`, `apps/mission-worker/src/modules/missions/services/gateways/mission-openclaw.gateway.ts`, `packages/api-shared/src/services/model-strategy.ts`, `documentation/features/chat-stream-recovery.md`, `documentation/features/missions.md`, and focused regression tests.
