# Agent Tool Error Contract

Last updated: 2026-06-22

## Goal

Build one agent-facing error contract for every tool failure in the Vibey agent harness.

The contract must tell the agent what happened, whether another tool call is useful, how to correct or route the next action, and how to explain the outcome to the user without exposing internal platform framing.

The product goal is fewer second-call failures and better user trust. Agents should stop guessing after a tool fails because the tool response itself gives a reliable recovery plan.

## Context Engineering Rules

- Explain why the next action matters, not only what to do.
- Use one term consistently: `tool error contract`.
- Prefer structured fields over long prose. The model can still use prose fields, but control decisions must live in typed fields.
- Include a user-safe explanation, but keep it separate from agent-only diagnosis.
- Do not rely on final response rewriting as the main fix. The tool error contract should guide the agent before it writes.
- Keep defaults strong and allow narrow overrides per action family.

## Full Coverage Evidence

The current agent harness routes model-visible tool failures through boundary chokepoints instead of relying on individual tools to hand-write recovery guidance.

| Area | Evidence | Current behavior | Coverage / remaining non-behavior work |
| --- | --- | --- | --- |
| Shared contract type | `packages/api-shared/src/types/agent-tool-error-contract.ts` | Defines the common contract fields used by backend/API code. | OpenClaw keeps a local compatible type to avoid adding a package dependency inside that runtime. |
| Artifact classifier | `apps/agent-api/src/modules/artifacts/services/artifact-error-classifier.ts` | Returns the tool error contract fields beside legacy `error_class`, `retryable`, `agent_guidance`, and `user_hint`. | Static taxonomy/config extraction is follow-up refactor only. |
| Artifact executor | `apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts` | Normalizes every `success:false` handler result, preserves already-structured leaf contracts, wraps schema/action preflight failures, and runs V1 post-action verification before recording handler success. | All artifact leaf services, MCP actions, Composio/integration actions, documents, media, projects, flows, brain actions, and social actions pass through this chokepoint. Post-action verification lives in `artifact-post-action-verification.service.ts`; a successful write/output action now means the handler succeeded and V1 technical proof passed. |
| PromptMode schema/preflight coverage | `artifact-action-schemas.ts`, `artifact-action-additional-schemas.ts`, `artifact-action-preflight.ts` | Every `VALID_ACTIONS` entry has a hard schema and preflight classification. `describe_action` exposes preflight mode/reason. `process_media`, `analyze_video`, `use_integration`, and `use_mcp_tool` have action-specific checks before handler dispatch. | Coverage and drift tests fail if backend, plugin, or action preflight classifications fall out of sync. OpenClaw native flattened tools are intentionally outside this PromptMode layer. |
| Artifact controller | `apps/agent-api/src/modules/artifacts/controllers/artifacts.controller.ts` | Non-stream failures throw `BadRequestException` with the full contract object; stream failures emit the full payload. | Covered by controller regression so HTTP boundaries do not collapse the contract into a string. |
| Backend tool adapter | `docker/tools/vibey-backend/index.ts` | Preserves structured fields in model-readable text, includes the contract in `details`, and wraps local validation/transport failures with the same shape. | File-size/helper extraction is follow-up refactor only. |
| OpenClaw failure classifier | `apps/openclaw/src/agents/platform-failure.ts` | Classifies failures into compatible contract fields: effect state, retry policy, correction, fallback, user explanation, forbidden framing, and observability. | Local taxonomy split is follow-up refactor only. |
| Tool definition adapter | `apps/openclaw/src/agents/pi-tool-definition-adapter.ts` | Normalizes thrown errors and returned error-shaped tool results (`status:error`, `status:forbidden`, `status:timeout`, `success:false`, `ok:false`) before the model sees them. | This covers core tools, plugin tools, sessions/subagents tools, and wrapped client-tool adapter errors. |
| Tool result stream state | `apps/openclaw/src/agents/pi-embedded-subscribe.handlers.tools.ts` and `pi-embedded-runner/run/payloads.ts` | Extracts existing contracts from tool results and classifies bare errors before building user-visible fallback payloads. | Prevents fallback messages from inventing internal/platform explanations when no assistant text was produced. |
| OpenClaw HTTP invoke | `apps/openclaw/src/gateway/tools-invoke-http.ts` | 404, validation, and execution failures return the contract in `body.error`. | Covered by HTTP boundary regression. |
| Agent API stream UI | `apps/agent-api/src/modules/chat/services/openclaw-tool-events.ts` | Failed tool events prefer `user_explanation.sentence` from the contract instead of raw tool internals. | UI/reporting category inference remains downstream and does not change model recovery. |
| Response filters/sanitizers | `apps/agent-api/src/modules/chat/services/response-filter.service.ts`, `apps/openclaw/src/agents/pi-embedded-helpers/errors.ts`, `system-prompt.ts` | Remain defense-in-depth guardrails for final text. | They are not the primary fix; the tool output now carries recovery guidance before final response generation. |
| Agent instruction contracts | `apps/agent-api/src/modules/agent-sync/contracts/agent-instruction-contracts.ts` | Teaches schema-first recovery and no unchanged retries without platform-blame phrasing. | Generated-output tests guard the wording. |

## Full Boundary Inventory

This inventory is based on:

```bash
rg -n "ERROR \[|agent_guidance|user_hint|error_class|retryable|forbidden_user_framing|toolResult|isError|success: false|throw new Error" apps/agent-api docker/tools apps/openclaw packages
```

| Priority | Surface | Agent-facing path | Current risk | Contract move |
| --- | --- | --- | --- | --- |
| P0 | `vibey_backend` artifact actions | `artifact-action-execution.service.ts` -> `artifact-error-classifier.ts` -> `docker/tools/vibey-backend/index.ts` | Largest action surface; was the source of "platform rendering issue" style failures. | Covered at executor, controller, and plugin adapter boundaries. |
| P0 | OpenClaw thrown tool errors | `pi-tool-definition-adapter.ts` catches thrown tool errors and returns JSON text to the model. | Raw thrown messages lacked retry/effect/user framing, so any tool could train bad second-call behavior. | Covered by adapter catch normalization. |
| P0 | OpenClaw returned tool errors | Core/plugin tools can return `jsonResult({ status:"error" | "forbidden" | "timeout", error })` without throwing. | Returned error-shaped results bypassed the catch path. | Covered by adapter returned-result normalization. |
| P0 | Backend transport/local validation failures | `docker/tools/vibey-backend/index.ts` local validation and backend fetch/stream handling. | Previously could instruct the agent to expose backend/platform wording. | Covered by local validation and classified transport contracts. |
| P1 | MCP actions | `artifact-mcp.service.ts` raw `success:false` returns and remote MCP `isError`. | MCP tools can return arbitrary text, including provider/internal failures. | Covered by artifact executor normalization because these actions flow through the artifact action registry. |
| P1 | Composio/integration runtime | Artifact integration services return mixed `success:false` failures. | External integration failures need user action or corrected params. | Covered by artifact executor normalization; classifier maps disconnected, invalid slug/params, auth, permission, and rate-limit text. |
| P1 | OpenClaw `lastToolError` state | `pi-embedded-subscribe.handlers.tools.ts` and payload fallback. | State could lose correction/user-safe explanation when the assistant produced no text. | Covered by contract extraction and fallback classification. |
| P2 | Agent API stream UI/reporting | `openclaw-tool-events.ts`. | UI could echo raw error text even when a contract existed. | Covered by user-explanation preference. |
| P2 | Response filters/sanitizers | `response-filter.service.ts`, OpenClaw `pi-embedded-helpers/errors.ts`. | Final cleanup can hide bad wording, but it cannot stop bad retries. | Kept as defense-in-depth only. |
| P2 | Generated agent protocols | `agent-instruction-contracts.ts`, generated `vibey-api` skill refs. | Bad examples can normalize platform-blame language even if tools improve. | Covered by generated-output tests and aligned examples. |

## Shared Home Decision

Use two layers rather than one package jump:

1. Backend/API contract types and default taxonomy should live in `packages/api-shared/src/types/agent-tool-error-contract.ts` once the artifact pilot stabilizes. `apps/agent-api` already depends on `@vibey/api-shared`, so this avoids circular imports inside feature services.
2. OpenClaw should first map its existing `PlatformFailureEnvelope` into the same field names locally. `apps/openclaw` does not currently depend on `@vibey/api-shared`, and adding that runtime dependency is a separate packaging decision.
3. `docker/tools/vibey-backend` should not own taxonomy. It should only render an already-built contract or build transport-level contracts through a tiny adapter helper.

The field names stay identical across layers so traces, evals, and generated docs can compare behavior even before the code is physically shared.

## Definition

Every agent-facing tool failure should resolve to this shape before the model sees it:

```ts
export type AgentToolErrorContract = {
  success: false
  error_code: string
  error_class: AgentToolErrorClass
  reliability: ErrorReliability
  effect_state: ToolEffectState
  retry_policy: RetryPolicy
  correction: CorrectionPlan
  fallback: FallbackPlan | null
  agent_diagnosis: string
  agent_instruction: string
  user_explanation: UserExplanation
  forbidden_user_framing: string[]
  observability: ErrorObservability
}
```

## Contract Fields

| Field | Purpose |
| --- | --- |
| `error_code` | Stable machine-readable code, specific enough for evals and telemetry. |
| `error_class` | Shared taxonomy class used for default retry and messaging behavior. |
| `reliability` | Whether the agent can trust the diagnosis and correction. |
| `effect_state` | Whether the action failed before side effects, partially succeeded, or succeeded but delivery failed. |
| `retry_policy` | Whether to retry, how, and when to stop. |
| `correction` | The next tool/action/payload change most likely to fix the issue. |
| `fallback` | Verified recovery option or user-decision path when retrying is not useful. This is not permission to invent adjacent tool attempts. |
| `agent_diagnosis` | Internal explanation for the model. Not user copy. |
| `agent_instruction` | Imperative instruction for the next step. |
| `user_explanation` | Safe communication intent and optional exact sentence. |
| `forbidden_user_framing` | Phrases or concepts the agent must not expose. |
| `observability` | What to log and how to group repeated failures. |

## Reliability

```ts
type ErrorReliability =
  | 'high_confidence'
  | 'probable'
  | 'raw_unclassified'
```

- `high_confidence`: The backend knows the cause and the next step.
- `probable`: The classifier inferred the cause from known patterns.
- `raw_unclassified`: The system could not classify the error. The agent should avoid strong claims and prefer safe recovery language.

## Effect State

```ts
type ToolEffectState =
  | 'failed_before_effect'
  | 'partial_effect'
  | 'succeeded_delivery_failed'
  | 'unknown_effect'
```

This is critical for user trust. A saved artifact with a broken preview is not the same as a failed save.

## Retry Policy

```ts
type RetryPolicy = {
  mode:
    | 'retry_same_payload'
    | 'retry_with_corrected_payload'
    | 'retry_after_delay'
    | 'do_not_retry_use_fallback'
    | 'do_not_retry_needs_user_action'
    | 'do_not_retry_terminal'
  max_attempts: number
  wait_ms?: number
  stop_after_same_error: boolean
  reason: string
}
```

The model needs the reason because it generalizes better when it understands why repeating the same call is wasteful or harmful.

## Initial Error Taxonomy

| Class | Typical effect state | Retry policy | Agent instruction default |
| --- | --- | --- | --- |
| `validation_error` | `failed_before_effect` | `retry_with_corrected_payload` | Fix the named fields and retry once. |
| `schema_conflict` | `failed_before_effect` | `retry_with_corrected_payload` | Remove conflicting aliases and retry. |
| `wrong_action_family` | `failed_before_effect` | `retry_with_corrected_payload` | Switch to the correct action family. |
| `target_ambiguous` | `failed_before_effect` | `do_not_retry_needs_user_action` | Ask a targeted clarification or use a resolver. |
| `permission_denied` | `failed_before_effect` | `do_not_retry_needs_user_action` | Explain access requirement without retrying. |
| `auth_expired` | `failed_before_effect` | `do_not_retry_needs_user_action` | Ask the user to refresh or reconnect session. |
| `integration_disconnected` | `failed_before_effect` | `do_not_retry_needs_user_action` | Start or explain connection flow. |
| `integration_validation` | `failed_before_effect` | `retry_with_corrected_payload` | Inspect integration action schema and retry with corrected params. |
| `rate_limited` | `failed_before_effect` | `retry_after_delay` | Wait once or switch to a cheaper/smaller path. |
| `credits_exhausted` | `failed_before_effect` | `do_not_retry_needs_user_action` | Explain billing/credit action. |
| `data_lookup_failed` | `failed_before_effect` | `retry_with_corrected_payload` | Narrow the lookup or use a known id. |
| `saved_but_delivery_failed` | `succeeded_delivery_failed` | `do_not_retry_use_fallback` | Tell the user the work saved and require a verified recovery option before delivery tools. |
| `backend_unreachable` | `unknown_effect` | `do_not_retry_terminal` | Stop tool calls and avoid user-facing platform blame. |
| `transient_backend_failure` | `unknown_effect` | `retry_after_delay` | Retry once if allowed, then use safe recovery language or summarize verified state. |
| `system_fault` | `unknown_effect` | `do_not_retry_use_fallback` | Stop the failed workflow and use a verified recovery option without exposing internals. |

## Example: Presentation Preview Failure

```ts
{
  success: false,
  error_code: 'PRESENTATION_PREVIEW_UNAVAILABLE',
  error_class: 'saved_but_delivery_failed',
  reliability: 'high_confidence',
  effect_state: 'succeeded_delivery_failed',
  retry_policy: {
    mode: 'do_not_retry_use_fallback',
    max_attempts: 0,
    stop_after_same_error: true,
    reason: 'The presentation save completed. The failed step is preview delivery, so repeating the same preview call is unlikely to help.'
  },
  correction: {
    summary: 'Do not call the same preview URL or another adjacent presentation delivery tool without a verified recovery option.',
    next_tool_preference: ['answer_from_existing_state', 'ask_user_choice']
  },
  fallback: {
    summary: 'Pause delivery tools and present verified recovery options based on the saved artifact state.',
    user_visible_progress: 'The saved presentation is available for editing or for a user-approved delivery option.'
  },
  agent_diagnosis: 'The artifact exists. Only the preview delivery path failed.',
  agent_instruction: 'Continue from the saved artifact state. Do not call adjacent render, publish, export, proxy, or generated-file tools unless the workflow circuit breaker allows one verified recovery attempt. Do not describe this as a platform problem.',
  user_explanation: {
    intent: 'saved_but_delivery_paused',
    sentence: 'The presentation saved. I could not open the preview here, so I can keep editing it or use a delivery option you choose.'
  },
  forbidden_user_framing: [
    'platform rendering issue',
    'infrastructure issue',
    'backend problem',
    'subdomain is down'
  ],
  observability: {
    fingerprint: 'presentation.preview.unavailable',
    report_level: 'warn'
  }
}
```

## Workflow Circuit Breaker Research

The tool error contract is per-call. It tells the agent what one failure means, whether the attempted action had side effects, whether retrying is allowed, and how to communicate the failure safely.

A workflow circuit breaker is cross-call. It watches the full sequence of failures for a user goal and stops the agent from continuing a failing workflow class after repeated or non-recoverable tool failures.

### Problem It Solves

The contract can stop a bad retry of the same tool call, but it does not by itself stop adjacent workaround loops.

Example failure chain:

1. `render_presentation` fails.
2. The agent tries `publish_presentation`.
3. That fails.
4. The agent tries to read a generated carousel file.
5. That fails.
6. The agent tries a proxy/export path.
7. That fails.

Each individual call may have a correct error contract, but the overall workflow is still failing. The breaker should stop this sequence earlier and require a verified recovery option or user decision.

The breaker is a gate, not a planner. When it opens, it prevents more tool calls in the failed workflow class unless a recovery option explicitly allows one bounded attempt.

### Relationship To The Tool Error Contract

The breaker must read normalized contract fields, not raw tool strings:

- `error_class`
- `effect_state`
- `retry_policy.mode`
- `retry_policy.max_attempts`
- `retry_policy.stop_after_same_error`
- `observability.fingerprint`
- `fallback`
- `user_explanation`

It also needs harness-level metadata that is bigger than one tool result:

- `conversation_id`
- `agent_id`
- `workflow_class`
- `tool_name`
- `action`
- `error_code`
- payload or action fingerprint
- timestamp

The contract remains the source of truth for a single failure. The breaker enforces that source of truth over time.

### Workflow Classes

Group failures by user goal and deliverable class, not only by exact tool name:

| Workflow class | Covers |
| --- | --- |
| `integration_access` | Connecting, authenticating, or authorizing third-party access. |
| `file_ingestion` | Reading, importing, parsing, or resolving user files and asset refs. |
| `media_processing` | Transforming image, audio, video, or generated media. |
| `presentation_render` | Rendering slide or presentation previews. |
| `artifact_publish` | Publishing a saved artifact to a public or shareable surface. |
| `artifact_export` | Exporting artifacts to PDF, images, files, or downloadable bundles. |
| `image_analysis` | Inspecting or describing image assets. |
| `video_analysis` | Inspecting, summarizing, or segmenting video assets. |
| `memory_save` | Saving memory, preferences, or durable agent knowledge. |
| `mcp_execution` | Executing remote MCP tools and adapter-mediated actions. |

Every model-visible tool call should map to a workflow class. Unknown or new tools should be classified at the harness boundary before execution, even if the first implementation uses `unknown_workflow` as a temporary telemetry-only class.

### Breaker States

| State | Meaning | Allowed behavior |
| --- | --- | --- |
| `closed` | Normal tool use. | Tool calls run normally. |
| `warning` | Failures are accumulating. | Retry only when the next call changes payload, waits as instructed, or follows a correction. |
| `open` | The workflow class is failing. | Stop tool calls for that workflow class and expose only verified recovery options or user decision. |
| `half_open` | A recovery condition changed. | Allow one verified recovery attempt after changed inputs, elapsed delay, successful prerequisite, or explicit user action. |

The breaker blocks only the workflow class, not the entire agent. If `artifact_export` is open, the agent can still edit artifact text, ask the user to choose a verified recovery option, or save data through a verified save path.

### Opening Rules

Open the breaker when any of these conditions happen inside the same conversation and workflow class:

- The same `observability.fingerprint` fails 2-3 times, with the exact threshold set by error class and retry policy.
- The same payload or action fingerprint is retried after `retry_policy.mode` is `do_not_retry_use_fallback`, `do_not_retry_needs_user_action`, or `do_not_retry_terminal`.
- More than the configured maximum failures happen in the same workflow class within one conversation.
- A failure has `retry_policy.max_attempts = 0` and the agent attempts another equivalent path for the same deliverable class.
- Adjacent tools fail while trying to deliver the same user-visible result, such as preview -> publish -> export -> read generated file.

The warning state should activate before open when the pattern is not yet terminal, especially for `retry_after_delay` or `retry_with_corrected_payload` errors.

### Open-State Instruction

When the breaker opens, the harness should return a hard instruction to the agent:

- Stop using tools for this workflow class.
- Do not try adjacent workarounds in the same workflow class.
- Explain the limitation with the active contract's `user_explanation`.
- Offer only verified recovery options.
- Ask the user to choose when a recovery option requires a tradeoff.
- Treat tool-calling recovery as denied unless a recovery option explicitly sets `requires_tool_call: true`.

The open state should have its own synthetic contract or tool result, for example `WORKFLOW_CIRCUIT_OPEN`, so traces and evals can prove the stop came from the breaker and not from an individual tool.

### Verified Recovery Options

Use `verified_recovery_options` instead of open-ended fallback language in breaker output. These options constrain what the agent may do after the gate opens.

```ts
type VerifiedRecoveryOption =
  | {
      kind: 'answer_from_existing_state'
      requires_tool_call: false
      user_visible_label: string
    }
  | {
      kind: 'ask_user_choice'
      requires_tool_call: false
      user_visible_label: string
    }
  | {
      kind: 'retry_later'
      requires_tool_call: false
      user_visible_label: string
      retry_after_ms?: number
    }
  | {
      kind: 'single_verified_alternative'
      requires_tool_call: true
      workflow_class: string
      max_attempts: 1
      preconditions: string[]
      user_visible_label: string
    }
```

Rules:

- Prefer no-tool options after open: answer from verified existing state, ask the user to choose, or retry later.
- Allow `single_verified_alternative` only when the target workflow class is not open, the option has explicit preconditions, and the harness enforces `max_attempts: 1`.
- Do not let the agent transform a blocked workflow into a chain of adjacent tools. If the option is not in `verified_recovery_options`, it is not allowed.
- Do not use "fallback" in model-facing breaker instructions unless it is paired with these constraints. "Fallback" should mean a verified recovery option, not "try something else."

For the presentation case, an open `presentation_render` or `artifact_export` circuit should produce options like:

```ts
verified_recovery_options: [
  {
    kind: 'answer_from_existing_state',
    requires_tool_call: false,
    user_visible_label: 'Keep editing the saved presentation'
  },
  {
    kind: 'ask_user_choice',
    requires_tool_call: false,
    user_visible_label: 'Choose a delivery option before I try another path'
  }
]
```

It should not tell the agent to try PDF, image export, proxy rendering, file reads, and publish paths in sequence.

### User-Facing Message Pattern

Use simple wording that describes the blocked path without exposing internals:

```text
This export path is not working from chat right now. I can still help by doing one of these: [verified option A], [verified option B].
```

Avoid:

- `platform bug`
- `platform rendering issue`
- `backend issue`
- `CORS problem`
- `Vercel proxy failed`
- pretending the failed workflow succeeded

### Reset Rules

Move from `open` to `half_open` only when something meaningful changes:

- The user changes the goal or chooses a verified recovery option.
- The payload changes in the way the correction plan required.
- A required integration, permission, or file reference is repaired.
- A configured delay expires for a transient class.
- A separate prerequisite tool succeeds and changes the workflow state.

Do not reset only because the agent found another adjacent tool name.

### Definition Of Done

The workflow circuit breaker is complete when:

- repeated non-retryable failures cannot produce long tool-call loops
- the same failed payload is not retried
- adjacent workaround loops are stopped by workflow class
- the user receives a clear recovery message
- open breaker output contains only verified recovery options
- tool-calling recovery is blocked unless an option explicitly allows one bounded attempt
- traces include breaker state, workflow class, and opening reason
- tests cover same-error repeats, adjacent-tool repeats, corrected retry, and user-action reset

### Implementation Boundary

This belongs in the agent harness around tool execution, not inside individual tool handlers. Individual tools should keep returning the normalized tool error contract. The harness should maintain recent failure state per `conversation_id`, `agent_id`, and `workflow_class`, then decide whether the next tool call is allowed, warning-only, blocked, or half-open.

The current contract implementation is complete for per-call model-visible tool error boundaries. The circuit breaker is the required cross-call control layer before workflow-loop UX is complete.

## Workflow Circuit Breaker Implementation Plan

### Layer 1 Architect Summary

The implementation is ready. The breaker should be built as a harness-level OpenClaw gate that runs before tool execution and records normalized failures after execution. It must cover all three execution routes:

1. Model-visible OpenClaw custom tools through `toToolDefinitions`.
2. OpenResponses hosted/client tools through `toClientToolDefinitions`.
3. Direct gateway tool calls through `POST /tools/invoke`.

The breaker should not live in individual tool handlers, the stream UI, or final response rewriting. Those layers can display the result, but they are too late to stop repeated tool execution.

The safest long-term UX is to make the breaker deterministic and narrow:

- Block by `workflow_class`, not by the whole agent.
- Use the per-call tool error contract as input, not raw error text.
- Return a synthetic `WORKFLOW_CIRCUIT_OPEN` contract when blocked.
- Offer only `verified_recovery_options`, not open-ended fallback language.
- Add coverage tests proving every model-visible tool and every documented Vibey API action maps to a workflow class.

### Layer 2 Technical Evidence

| Evidence | File | Finding |
| --- | --- | --- |
| Main model tool gate | `apps/openclaw/src/agents/pi-tool-definition-adapter.ts` | `toToolDefinitions` validates params, runs `before_tool_call`, executes the tool, normalizes returned failures, classifies thrown failures, and returns `jsonResult`. This is the correct pre/post execution gate for model tools. |
| Client tool gate | `apps/openclaw/src/agents/pi-tool-definition-adapter.ts` | `toClientToolDefinitions` already receives `agentId` and `sessionKey`, but only delegates client tool execution as `status: "pending"`. It still needs breaker preflight so hosted/client tools cannot continue a blocked workflow class. |
| Production caller | `apps/openclaw/src/agents/pi-embedded-runner/tool-split.ts` and `run/attempt.ts` | `splitSdkTools` currently calls `toToolDefinitions(tools)` without session/agent context, while `toClientToolDefinitions` receives `{ agentId, sessionKey }`. The implementation must thread breaker context through the split call. |
| Direct HTTP bypass | `apps/openclaw/src/gateway/tools-invoke-http.ts` | `POST /tools/invoke` builds tools and calls `tool.execute` directly. A breaker only in `toToolDefinitions` would miss this route. |
| Current per-call contract | `apps/openclaw/src/agents/platform-failure.ts` | OpenClaw already has local contract fields compatible with the shared API contract. The breaker should build on this shape instead of introducing a second error language. |
| Current stream extraction | `apps/openclaw/src/agents/pi-embedded-subscribe.handlers.tools.ts` | Tool result handling already extracts full contracts and stores `lastToolError`. A synthetic breaker result will flow through if it uses the same `details.status: "error"` shape. |
| Current user fallback | `apps/openclaw/src/agents/pi-embedded-runner/run/payloads.ts` | Last-tool-error fallback always formats as `Tool failed. ...`. For `WORKFLOW_CIRCUIT_OPEN`, this should be rendered as a paused/blocked path using the contract sentence directly. |
| Agent API display | `apps/agent-api/src/modules/chat/services/openclaw-tool-events.ts` | Tool-end UI already prefers `user_explanation.sentence` from structured contracts. No new prose system is needed if the breaker emits the contract correctly. |
| Product action surface | `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts` | The action catalog currently contains 358 documented Vibey API actions. The workflow classifier needs a coverage test against this catalog. |

### New Modules

Add focused OpenClaw modules instead of expanding the near-limit tool factory and failure classifier:

| New file | Responsibility |
| --- | --- |
| `apps/openclaw/src/agents/workflow-circuit-breaker.ts` | State machine, bounded in-memory store, preflight decision, post-call recording, synthetic open-contract builder, TTL cleanup, test reset helper. |
| `apps/openclaw/src/agents/workflow-circuit-classifier.ts` | Tool/action to `workflow_class` mapping, payload/action fingerprinting, adjacent-tool grouping, verified recovery option defaults. |
| `apps/openclaw/src/agents/workflow-circuit-breaker.test.ts` | Pure state-machine tests with no SDK/session dependency. |
| `apps/openclaw/src/agents/workflow-circuit-classifier.test.ts` | Tool/action mapping tests, including unknown-tool behavior and documented Vibey action coverage fixture. |

Keep `platform-failure.ts` as the per-call classifier. It can export or accept the breaker synthetic contract shape, but it should not own cross-call state.

### Workflow Class Coverage

The classifier must return a workflow class for every model-visible tool call. Initial classes should cover the existing OpenClaw and Vibey surfaces:

| Workflow class | Tool/action families |
| --- | --- |
| `integration_access` | `check_*_connection`, `initiate_integration_connect`, `get_integration`, third-party auth and provider access checks. |
| `file_ingestion` | `read`, `read_document`, `read_file`, file import/read/list actions, asset ref resolution. |
| `workspace_file_write` | `write`, `edit`, `apply_patch`, `create_file`, `update_file`, `delete_file`, project file mutation actions. |
| `media_processing` | `process_media`, `generate_image`, `edit_image`, `generate_video`, `tts`, media transform actions. |
| `presentation_render` | `generate_visual_html`, presentation preview/render/show actions, renderer-specific action families. |
| `artifact_publish` | `publish_*`, `schedule_*`, `send_*`, public/share delivery actions. |
| `artifact_export` | `create_pdf`, `create_docx`, bundle/download/export actions. |
| `image_analysis` | `analyze_image`, OpenClaw `image` analysis mode. |
| `video_analysis` | `analyze_video`, `get_video_status`, video transcript/frame inspection. |
| `memory_save` | `save_*_memory`, `ingest_*_brain_*`, `crystallize_user_brain`, durable memory mutation. |
| `memory_read` | `memory_search`, `memory_get`, `search_*_brain`, context retrieval and stats. |
| `mcp_execution` | `list_mcp_*`, `read_mcp_resource`, `use_mcp_tool`, MCP server actions. |
| `browser_execution` | OpenClaw `browser`, `web_search`, `web_fetch`, URL fetch/search/browse actions. |
| `command_execution` | `exec`, `bash`, `process`, shell/process/session command execution. |
| `agent_delegation` | `sessions_spawn`, `sessions_send`, `subagents`, `ask_agent`, `delegate_to_agent`, mission/agent handoff actions. |
| `message_delivery` | `message`, channel actions, email/social/calendar send or schedule actions. |
| `database_execution` | `supabase_*` SQL/table/row actions. |
| `unknown_workflow` | Temporary fail-closed telemetry class for new tools. This still participates in breaker state and must be visible in tests. |

Coverage rules:

- Built-in OpenClaw tool names from `createOpenClawTools`, coding tools, shell/process tools, and client tools must map.
- Vibey backend actions must map by action name, action prefix, and deliverable family.
- The action catalog coverage test must fail when a new documented Vibey action resolves to `unknown_workflow` without an explicit classification update.
- Unknown third-party plugin tools may resolve to `unknown_workflow`, but repeated failures must still circuit-break by plugin tool name and payload fingerprint.

### State Key And Fingerprints

Use a bounded in-memory store keyed by:

```ts
type WorkflowCircuitKey = {
  conversation_id: string
  agent_id: string
  workflow_class: string
}
```

Use `sessionKey` as the conversation key in OpenClaw unless an explicit conversation id is available. Record these fields per failure:

- `tool_name`
- `action`
- `error_code`
- `error_class`
- `effect_state`
- `retry_policy.mode`
- `retry_policy.max_attempts`
- `observability.fingerprint`
- `payload_fingerprint`
- `timestamp`

Fingerprinting rules:

- Prefer `observability.fingerprint` from the contract for same-error detection.
- Prefer the existing mutating `actionFingerprint` from `tool-mutation.ts` when available.
- Add a stable JSON payload fingerprint for non-mutating adjacent workflow failures.
- Redact or omit large payload fields such as file contents, base64, HTML bundles, generated code, and binary/media data before hashing.

### State Transitions

| From | To | Condition |
| --- | --- | --- |
| `closed` | `warning` | First retryable failure or first repeated workflow-class failure. |
| `closed` | `open` | A non-retryable failure with `max_attempts = 0` is repeated by equivalent action/payload. |
| `warning` | `open` | Same fingerprint reaches threshold, same payload repeats after stop policy, or adjacent deliverable path exceeds workflow failure budget. |
| `open` | `half_open` | User action, corrected payload, elapsed retry delay, or verified prerequisite changes the recovery condition. |
| `half_open` | `closed` | The single verified recovery attempt succeeds. |
| `half_open` | `open` | The verified recovery attempt fails or attempts another adjacent unverified path. |

Recommended thresholds:

- Same `observability.fingerprint`: open after 2 failures for `do_not_retry_*`, after 3 for retryable transient failures.
- Same payload/action after `max_attempts = 0`: block the next equivalent call.
- Same workflow class: open after 4 failures in one conversation unless all failures have corrected payloads and improving state.
- `single_verified_alternative`: exactly 1 harness-allowed tool attempt, then open again on failure.

### Synthetic Open Contract

When preflight blocks a call, return the same shape the model already understands:

```ts
{
  status: 'error',
  tool: '<requested tool>',
  success: false,
  error_code: 'WORKFLOW_CIRCUIT_OPEN',
  error_class: 'workflow_circuit_open',
  reliability: 'high_confidence',
  effect_state: 'failed_before_effect',
  retry_policy: {
    mode: 'do_not_retry_needs_user_action',
    max_attempts: 0,
    stop_after_same_error: true
  },
  correction: {
    summary: 'Stop this workflow class unless the user changes the goal or chooses a verified recovery option.'
  },
  fallback: null,
  verified_recovery_options: [...],
  agent_instruction: 'Stop using tools for this workflow class. Do not try adjacent workarounds. Use user_explanation and verified_recovery_options only.',
  user_explanation: {
    intent: 'explain_blocked_workflow_path',
    sentence: 'This path is not working from chat right now. I can keep working with what is already saved or you can choose another delivery option.'
  },
  forbidden_user_framing: [
    'platform bug',
    'platform rendering issue',
    'backend issue',
    'infrastructure issue',
    'CORS problem',
    'Vercel proxy failed'
  ],
  observability: {
    fingerprint: '<workflow_class>.<reason>',
    report_level: 'warn',
    workflow_class: '<workflow_class>',
    breaker_state: 'open',
    breaker_reason: '<reason>'
  }
}
```

The exact user sentence should be specific to the workflow class when possible, for example "This export path..." for `artifact_export` and "This preview path..." for `presentation_render`.

### File-Level Change Map

1. Add `workflow-circuit-classifier.ts`.
   - Export `WorkflowClass`, `resolveWorkflowClass`, `buildPayloadFingerprint`, and `resolveVerifiedRecoveryOptions`.
   - Map built-in OpenClaw tools, hosted client tools, Vibey backend actions, MCP actions, and unknown plugin tools.

2. Add `workflow-circuit-breaker.ts`.
   - Export `preflightWorkflowToolCall`, `recordWorkflowToolResult`, `resetWorkflowCircuitForUserAction`, and test-only reset helpers.
   - Store bounded state by session/conversation, agent, and workflow class.
   - Build the `WORKFLOW_CIRCUIT_OPEN` contract.

3. Update `pi-tool-definition-adapter.ts`.
   - Add optional breaker context to `toToolDefinitions`.
   - Preflight after parameter validation and before `before_tool_call` or tool execution.
   - Record normalized success/failure after execution.
   - Record classified thrown failures before returning the error result.
   - Add breaker support to `toClientToolDefinitions`.

4. Update `pi-embedded-runner/tool-split.ts` and `run/attempt.ts`.
   - Pass `{ agentId: sessionAgentId, sessionKey: params.sessionKey ?? params.sessionId }` into `splitSdkTools`.
   - Pass the same context into custom tools and client tools.

5. Update `tools-invoke-http.ts`.
   - Preflight after `mergeActionIntoArgsIfSupported` and before direct `tool.execute`.
   - Record successful and failed HTTP invocations.
   - Return an `ok:false` body with `WORKFLOW_CIRCUIT_OPEN` when blocked.

6. Update `pi-embedded-runner/run/payloads.ts`.
   - If `failure.error_code === "WORKFLOW_CIRCUIT_OPEN"`, render the contract sentence directly instead of "`<tool> failed.`".

7. Update `openclaw-tool-events.ts`.
   - Keep `user_explanation.sentence` preference.
   - Add optional error category inference for `workflow_circuit_open` so reports group breaker events separately from tool crashes.

8. Optional shared type update.
   - Add API-side types for `verified_recovery_options` and workflow circuit observability in `packages/api-shared/src/types/agent-tool-error-contract.ts`.
   - Do not make OpenClaw depend on `@vibey/api-shared` in this slice.

### Test Matrix

| Test | File |
| --- | --- |
| Same fingerprint repeats open the breaker and block the next equivalent call. | `workflow-circuit-breaker.test.ts` |
| `retry_policy.max_attempts = 0` blocks the next same-payload attempt. | `workflow-circuit-breaker.test.ts` |
| Adjacent tool failures in the same workflow class open the breaker. | `workflow-circuit-breaker.test.ts` |
| A different workflow class is still allowed while one class is open. | `workflow-circuit-breaker.test.ts` |
| Corrected payload or user action moves `open` to `half_open`. | `workflow-circuit-breaker.test.ts` |
| Failed half-open attempt returns to `open`. | `workflow-circuit-breaker.test.ts` |
| `single_verified_alternative` allows one bounded tool attempt and no chain. | `workflow-circuit-breaker.test.ts` |
| `toToolDefinitions` returns `WORKFLOW_CIRCUIT_OPEN` and does not call the wrapped tool. | `pi-tool-definition-adapter.test.ts` |
| Returned error-shaped results are recorded by the breaker after normalization. | `pi-tool-definition-adapter.test.ts` |
| Client tools are blocked before delegation when their workflow class is open. | `pi-tools.before-tool-call.e2e.test.ts` |
| Direct `/tools/invoke` calls are blocked and returned as structured contracts. | `tools-invoke-http.test.ts` |
| `payloads.ts` renders breaker wording without "`tool failed`" phrasing. | `payloads.e2e.test.ts` |
| Agent API tool-end formatting uses the breaker `user_explanation.sentence`. | `openclaw-proxy.service.test.ts` or `openclaw-tool-events` test |
| Every built-in OpenClaw tool maps to a workflow class. | `workflow-circuit-classifier.test.ts` |
| Every documented Vibey API action maps to a non-unknown workflow class. | `workflow-circuit-classifier.test.ts` or an Agent API catalog coverage test |

### Acceptance Criteria

The implementation is done only when:

- No current model-visible execution path can bypass the breaker.
- No documented Vibey API action is unmapped.
- Same failed payloads and adjacent workaround loops stop by workflow class.
- Open breaker output includes state, reason, workflow class, and verified recovery options.
- User-facing output avoids platform/internal framing and does not claim success.
- Tests cover same-error repeats, adjacent-tool repeats, corrected retry, half-open recovery, user-action reset, direct HTTP invoke, client tools, and catalog coverage.

## Coverage Implementation Status

### Inventory and Contract

- Inventory every model-visible tool error path. Status: complete for the current agent harness boundaries listed above.
- Add this plan as the taxonomy source of truth. Status: complete.
- Identify which paths are classified, normalized, preserved, or downstream-only. Status: complete.
- Decide the shared TypeScript home for `AgentToolErrorContract`. Status: complete: backend/API uses `packages/api-shared/src/types/agent-tool-error-contract.ts`; OpenClaw maps locally with identical field names.

### Artifact Harness

- Replace `ArtifactErrorEnvelope` with or adapt it to `AgentToolErrorContract`. Status: complete with backward-compatible fields.
- Wrap artifact executor failures that return raw `success:false` or `message`. Status: complete for all registry handlers through `ArtifactActionExecutionService`.
- Preserve already-structured leaf contracts. Status: complete.
- Preserve structured failures over non-stream and stream HTTP controller boundaries. Status: complete.
- Preserve existing escalation behavior, but move it into `retry_policy` and `observability`.
- Add tests for validation, permission, auth, wrong action family, data lookup, and saved-but-delivery-failed. Status: covered by classifier and dispatch/controller regressions.

### Backend Tool Adapter

- Stop collapsing structured errors into only prose. Status: complete: structured fields are rendered into model-readable sections and preserved in `details`.
- Keep a concise model-readable rendering, but preserve the structured contract in the tool result.
- Replace manual backend unreachable wording with the standard contract. Status: complete.
- Wrap plugin-side local validations and unknown actions with the same contract. Status: complete.

### OpenClaw Tool Surfaces

- Normalize thrown OpenClaw tool errors. Status: complete.
- Normalize returned OpenClaw tool errors. Status: complete.
- Preserve and extract contracts from tool result streaming state. Status: complete.
- Classify fallback payloads when a tool fails and the assistant produced no text. Status: complete.
- Return contracts from `/tools/invoke` HTTP failures. Status: complete.

### Workflow Circuit Breaker

- Define workflow-class grouping by user goal and deliverable class. Status: complete in OpenClaw through `workflow-circuit-classifier.ts`, including current Vibey action catalog coverage.
- Track failure history by `conversation_id`, `agent_id`, `workflow_class`, `observability.fingerprint`, and payload/action fingerprint. Status: complete in OpenClaw via in-memory session/agent/workflow state.
- Enforce warning, open, and half-open states across adjacent tool calls. Status: complete for model tool calls, delegated client tools, compaction tool setup, and direct HTTP `/tools/invoke`.
- Define `verified_recovery_options` so fallback behavior cannot become an open-ended agentic tool loop. Status: complete: open circuits return no automatic fallback and only bounded verified recovery options.
- Return a model-visible `WORKFLOW_CIRCUIT_OPEN` result with user-safe recovery guidance. Status: complete.
- Add tests for same-error repeats, adjacent-tool repeats, corrected retry, and user-action reset. Status: complete with focused classifier, breaker, adapter, payload, split-tool, runner-import, and HTTP invoke regressions.

### Evals and Telemetry

- Add transcript evals for real incidents. Status: follow-up measurement work.
- Track repeated error fingerprints by session. Status: artifact escalation exists; broader telemetry aggregation is follow-up measurement work.
- Assert that forbidden user framing does not appear in final output. Status: focused tests assert user explanations avoid platform/internal wording while forbidden phrases remain agent-only.
- Measure reduced repeated tool calls after non-retryable failures. Status: follow-up measurement work.

## Inventory Queries

Use these while converting each family:

```bash
rg -n "success: false|throw new Error|isError|error_class|agent_guidance|user_hint" apps/agent-api docker/tools apps/openclaw packages
```

```bash
rg -n "ERROR \\[|platform|backend unreachable|retryable|do not retry" apps/agent-api docker/tools apps/openclaw packages
```

## Boundary Coverage Closed

The current implementation covers the current model-visible tool error boundaries through these chokepoints:

- `packages/api-shared/src/types/agent-tool-error-contract.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-error-classifier.ts`
- `apps/agent-api/src/modules/artifacts/services/artifact-action-execution.service.ts`
- `apps/agent-api/src/modules/artifacts/controllers/artifacts.controller.ts`
- `docker/tools/vibey-backend/index.ts`
- `apps/openclaw/src/agents/platform-failure.ts`
- `apps/openclaw/src/agents/workflow-circuit-classifier.ts`
- `apps/openclaw/src/agents/workflow-circuit-breaker.ts`
- `apps/openclaw/src/agents/pi-tool-definition-adapter.ts`
- `apps/openclaw/src/agents/pi-embedded-subscribe.handlers.tools.ts`
- `apps/openclaw/src/agents/pi-embedded-runner/run/payloads.ts`
- `apps/openclaw/src/gateway/tools-invoke-http.ts`
- `apps/agent-api/src/modules/chat/services/openclaw-tool-events.ts`

Remaining contract work in `.docs/plans/agent-follow-up-work.md` is file-size/config extraction and measurement work, not an intentionally uncovered tool-error slice.
