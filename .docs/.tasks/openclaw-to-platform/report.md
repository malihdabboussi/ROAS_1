# OpenClaw -> Platform Core Refactor Report

## 1) Your exact concern (reframed correctly)

You are right: this is **not** mainly a frontend filter or prompt tuning problem.

The core issue is:

- OpenClaw agents are still built with self-awareness of runtime internals.
- Vibey is a platform-facing agent, but the core runtime still lets it reason like an infrastructure-aware OpenClaw operator.

So even if we add better filtering on top, the core behavior remains wrong.

---

## 2) Real root cause

The model currently receives and reasons over internal concepts:

- internal tool identity (`vibey_backend`)
- runtime operations (`gateway`, sandbox policy, tool availability diagnostics)
- internal error text shapes (unknown tool, policy block, infra failures)

That means the model can produce infra-language naturally, because those concepts exist in its execution reality.

This is why "add one more filter layer" is a patch, not a fix.

---

## 3) Architecture diagnosis

### A) Runtime identity leak

Current architecture exposes runtime identity to the agent layer.  
Result: the agent can talk about the system that runs it.

### B) Tool contract leak

Tools are exposed with internal naming/semantics.  
Result: failure text includes internal labels the user should never see.

### C) Error contract leak

Tool/system errors are not normalized at source into a platform-safe domain model before model-facing flow continues.

### D) Prompt boundary is not a real boundary

`promptMode=embedded` reduces detail, but does not create a hard separation between:

- runtime internals
- product-facing agent cognition

---

## 4) What must change (core principle)

OpenClaw must run in a **Platform Agent Runtime Mode** where:

- the model never receives OpenClaw identity/context
- the model never receives infrastructure control concepts
- the model only sees product-domain tools and product-domain outcomes

In simple words:

- OpenClaw stays as engine.
- Vibey sees only "product APIs", never "engine internals".

---

## 5) Strict failure system required at the core

You asked for strict classifications and explicit mapping.  
That should live in the core runtime contract, not in upper-layer cleanup.

### Required core classifications

- `TRANSIENT` - temporary execution issue
- `INPUT_INVALID` - missing/wrong business input
- `ACCESS_BLOCKED` - permission/policy block
- `CAPABILITY_UNAVAILABLE` - feature cannot run now
- `SYSTEM_FAULT` - non-user-fixable internal fault

### Required explicit mapping (internal -> user-safe)

Every internal error must map to:

- `class`
- `retryPolicy`
- `userMessageKey`
- `nextActionType` (continue, ask-business-input, defer, stop)

Raw internal messages are never model-visible and never user-visible.

---

## 6) Refactor target state

### Target 1 - Agent blindness to OpenClaw internals

Agent should not know:

- what gateway is
- what plugin/toolset registration is
- what OpenClaw runtime topology is

### Target 2 - Product-domain tool facade

Replace direct internal tool exposure with product-domain capabilities.  
Example shape:

- `campaign.read`
- `campaign.update`
- `creative.generate`
- `publish.execute`

Internal adapters can still call `vibey_backend`, but the model never sees that name.

### Target 3 - Core error normalization gateway

Before any tool error reaches model response construction:

- normalize internal error -> classified domain error
- apply retry/fallback policy
- emit only mapped product-safe result

### Target 4 - Runtime-level conversation policy

When a fault cannot be auto-recovered:

- ask business-relevant next step only
- no infrastructure remediation language

---

## 7) Why this is the right fix

This changes the source of truth, not the surface.

Instead of "hide what leaks", we "remove what can leak" from agent cognition.

That matches your platform principle:

- forward-facing agents should operate as product actors, not runtime operators.

---

## 8) Final conclusion

The required solution is a **core refactor of OpenClaw agent runtime contract**:

1. Remove runtime self-awareness from model-facing context.
2. Introduce strict core failure classifications.
3. Enforce explicit internal-to-user-safe mapping at source.
4. Expose only product-domain capabilities to forward-facing agents.

Anything else is a temporary patch on top of the same wrong core behavior.

