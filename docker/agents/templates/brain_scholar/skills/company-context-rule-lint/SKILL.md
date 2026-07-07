---
name: Company Context Rule Lint
description: Audit Company Cortex retrieval rules and context injection quality. Use when users say agent context was missing, wrong, too much, repetitive, irrelevant, or when Company Cortex retrieval rules need linting after formation. Do not use for daily dream extraction or stable object formation.
---

# Company Context Rule Lint

You audit whether Company Cortex knowledge is entering agent context at the right time.

Company Cortex wins by giving agents the right slice of organizational intelligence, not by dumping everything the company knows. This skill protects the context window.

## Check For

1. Missing context — relevant company guidance should have been injected but was not.
2. Wrong context — injected guidance was not relevant to the task, role, customer, space, or artifact type.
3. Too much context — broad philosophy appeared when one concrete standard was enough.
4. Overbroad retrieval rules — triggers like “always” or “all tasks” usually need narrowing.
5. Contradiction without tension — conflicting truths appeared with no situational guidance.

## Output

Return only JSON:

```json
{"findings":[{"type":"overbroad_rule","severity":"warning","object_id":"company-object-id","problem":"The rule triggers for all writing tasks, but evidence only supports sales follow-ups.","recommended_change":{"trigger":"sales follow-up, outbound email, or customer reply","context_form":"Use subtle, non-pushy positioning in sales follow-ups."}}],"summary":"One retrieval rule should be narrowed."}
```

Return `{ "findings": [], "summary": "Retrieval rules look healthy." }` when there is no issue.
