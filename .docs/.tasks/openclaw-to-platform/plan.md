# OpenClaw -> Platform Core Refactor Plan

## Goal

Refactor core runtime so forward-facing agents (Vibey and others) are structurally unaware of OpenClaw internals.

This plan is not "add a top layer."  
This plan changes core agent-runtime contracts.

---

## Phase 0 - Architecture decision (must lock first)

Adopt a new runtime mode: `platform_agent`.

In this mode:

- model context cannot include OpenClaw operational identity
- model tool surface is product-domain only
- runtime errors are normalized before model/user visibility

Decision output:

- one ADR in docs
- one ownership map for new core modules

---

## Phase 1 - Split internal tools from model-facing capabilities

## 1.1 Create capability facade contract

Introduce `CapabilityFacade` in OpenClaw core:

- input: product-domain request
- output: product-domain result
- hides internal adapters/tool names

Model sees only capability IDs, never raw tool IDs.

### 1.2 Build internal adapter layer

Move existing internal tools (`vibey_backend`, etc.) behind adapters:

- adapter converts capability request -> internal tool call
- adapter converts internal result -> capability result

Internal errors do not pass through directly.

### 1.3 Remove direct internal tool exposure for `platform_agent`

In `platform_agent` mode:

- do not inject internal tool catalog into model context
- do not expose infra tool names in prompt/tool descriptors

---

## Phase 2 - Core strict failure classification engine

## 2.1 Add canonical failure classes

Add one enum in core runtime:

- `TRANSIENT`
- `INPUT_INVALID`
- `ACCESS_BLOCKED`
- `CAPABILITY_UNAVAILABLE`
- `SYSTEM_FAULT`

No ad-hoc class strings outside this enum.

### 2.2 Build classifier at adapter boundary

Every internal error must be classified at the adapter boundary:

- input: raw internal error + capability context
- output: `FailureEnvelope`

`FailureEnvelope` fields:

- `class`
- `retryable`
- `retryBudget`
- `userMessageKey`
- `businessNextStepType`
- `internalDebug` (logs only)

No raw error string is allowed to leave this boundary.

---

## Phase 3 - Explicit internal-to-user-safe mapping (core)

Create one runtime mapper:

- `FailureEnvelope -> UserSafeOutcome`

`UserSafeOutcome` includes:

- `messageKey` (resolved copy)
- `action` (`continue`, `ask_input`, `defer`, `stop`)
- `safeContext` (business-only details)

Rules:

- mapping table is explicit, versioned, and test-covered
- no fallback to raw internal text
- no infra terms allowed in mapped copy

---

## Phase 4 - Core recovery policy (before model output)

### 4.1 Retry policy engine

Use `FailureEnvelope.retryable` + `retryBudget`:

- transient: retry up to budget
- non-retryable: no retry

### 4.2 Fallback policy engine

If retries fail:

- choose business-safe fallback path
- or ask business-input question
- never generate infra remediation guidance

This happens in core runtime orchestration, not frontend/API post-processing.

---

## Phase 5 - Prompt/runtime hard boundary

In `platform_agent` mode, system prompt builder must remove:

- OpenClaw operations language
- gateway/plugin/toolset remediation instructions
- internal topology and debug instructions

But the main protection is structural:

- model never receives internal tool and internal error objects anyway.

---

## Phase 6 - Migration plan for Vibey

### 6.1 Introduce feature flag

- `agents.[id].runtimeMode = "platform_agent"` (default off)

### 6.2 Migrate Vibey first

Steps:

1. map Vibey flows to capabilities
2. route capability calls through adapters
3. enable classifier/mapper/recovery path
4. disable direct internal tool exposure

### 6.3 Migrate other forward-facing agents

Same runtime mode, same contracts.

---

## Phase 7 - Tests that prove core refactor works

## 7.1 Unit tests (core)

- classifier determinism for known internal errors
- mapping table completeness (all classes mapped)
- banned-term guarantee in mapped user copy
- no raw internal error escape from boundary

### 7.2 Integration tests (runtime)

- forced internal tool failure (`vibey_backend`) -> classified envelope -> safe outcome
- retry budget honored
- fallback action selected correctly

### 7.3 End-to-end tests (conversation)

Repro scenario + forced failures.

Assertions:

- output does not include `gateway`, `plugin`, `toolset`, `OpenClaw`, `vibey_backend`, `restart`
- flow continues or asks business-relevant next step

---

## Phase 8 - Rollout and cleanup

1. ship `platform_agent` mode behind flag
2. run staging traffic with synthetic failures
3. enable Vibey in production
4. monitor regressions
5. remove legacy direct-exposure path for platform agents

If legacy path remains, this problem can return.

---

## Definition of done

Done only when all are true:

- Vibey cannot reason about OpenClaw internals by runtime design
- strict core failure classification is active
- explicit core mapping (internal -> user-safe) is active
- raw internal errors never reach model-visible or user-visible payloads
- forced-failure E2E passes without infra-language leakage

