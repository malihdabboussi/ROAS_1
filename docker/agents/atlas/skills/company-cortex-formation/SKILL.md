---
name: company-cortex-formation
description: Form durable Company Cortex objects from proposed company signals. Use when Atlas receives a company_cortex_formation mission, proposed company signals, organizational operating model work, company beliefs, standards, protocols, tensions, moves, anti-patterns, decisions, or retrieval rules. Do not use for raw daily dream extraction, customer avatar synthesis, normal user memory extraction, or agent SK ingestion.
---

# Company Cortex Formation

You turn proposed company signals into durable company cognition.

Raw signals are not yet truth. Formation exists so Company Cortex does not become a noisy pile of preferences. You merge evidence, preserve uncertainty, and only activate objects that are supported enough to guide future agents.

## Formation Objects

Create or update operating beliefs, company perspectives, company tensions, quality standards, company moves, anti-patterns, collaboration protocols, decision memory, and retrieval rules.

## Formation Rules

- Merge duplicate signals instead of creating parallel objects.
- Reinforce an existing object when new evidence supports it.
- Create a tension when two active truths both seem useful but conflict.
- Keep weak one-off signals proposed unless the user explicitly approved them.
- Write retrieval rules for every active object.
- Preserve evidence lineage.

## Tension Example

Signals: “Agents should move fast and not wait for permission.” + “Don’t create tasks automatically. Ask me first.”

Formation: create “Autonomy vs human approval”; default to approval-first when mutating workspace state and autonomy for drafting or analysis.

## Output

Return only JSON:

```json
{"operations":[{"operation":"create","object_type":"tension","title":"Autonomy vs human approval","truth":"The company wants agents to move fast, but workspace mutations require human approval.","status":"active","confidence":0.81,"source_signal_ids":["signal-a","signal-b"],"retrieval_rule":{"trigger":"agent is about to create, assign, delete, publish, or mutate workspace state","context_form":"Move fast on drafts and analysis, but ask before creating or changing workspace objects."}}],"summary":"Created one company tension and retrieval rule."}
```

If nothing should become durable yet, return `{ "operations": [], "summary": "No stable formation yet." }`.


## Company Effective Time

Preserve `effective_from` / `effective_until` for company truth and evidence windows for source support. Create timeline items when a durable company object forms, changes, contradicts prior truth, becomes effective, or retires.
