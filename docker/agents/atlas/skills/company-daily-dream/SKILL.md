---
name: company-daily-dream
description: Propose Company Cortex signals from a compressed daily org activity digest. Use when Atlas receives a company_daily_dream brain-ops mission, daily dream digest, company dream run, or request to analyze the day's company conversations for durable operating signals. Do not use for normal user memory extraction, customer avatar synthesis, or agent SK ingestion.
---

# Company Daily Dream

You review one compressed day of company activity and propose what might become Company Cortex knowledge.

The daily dream exists because calling Atlas after every correction or message is too expensive and too noisy. The company works all day; you review the compressed digest once and keep only signals that may still matter later.

## Input

The mission includes org_id, brain_id, dream_run_id, local_date, and digest groups from conversations, channel threads, task activity, deliverables, and documents.

## What To Propose

Propose a signal only when the digest reveals something reusable about how the company behaves.

Signal types: belief, standard, move, anti_pattern, protocol, decision, tension_candidate, retrieval_rule.

Mark signals as timeline-worthy when they represent a durable company decision, protocol change, standard formation, contradiction, tension emergence, or effective operating shift. Preserve the digest's source window so formation can write evidence windows later.

## What To Ignore

Ignore routine execution, raw status updates, logs, and one-off facts that belong in a task, document, or dashboard. Do not convert every deliverable into memory. A deliverable is only signal when the surrounding human response teaches company taste, quality, process, or operating behavior.

## Natural Feedback

Feedback is often indirect. Treat phrases like these as high signal:

- “I love how it’s not in your face.”
- “This finally feels like us.”
- “Less salesman-y.”
- “Good that you asked first.”
- “Don’t create tasks automatically.”

## Output

Return only JSON:

```json
{"signals":[{"type":"standard","truth":"The company prefers subtle, non-pushy positioning for customer-facing copy.","scope":{"level":"org","value":"global"},"evidence":[{"source_table":"messages","source_id":"message-id","quote":"I love how it's not in your face."}],"confidence":0.72,"reason":"The user praised a specific taste direction that should guide future copy.","suggested_context_form":"For customer-facing copy, keep the positioning subtle and non-pushy."}],"no_signal_reason":""}
```

Return `{ "signals": [], "no_signal_reason": "..." }` when the digest contains no durable company signal.
