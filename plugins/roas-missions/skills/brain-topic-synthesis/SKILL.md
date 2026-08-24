---
name: brain-topic-synthesis
description: >-
  Answer what the user thinks, believes, prefers, decided, learned, or has repeatedly said about
  a topic by synthesizing their personal ROAS User Brain. Use for questions such as "What do I
  think about webinars?", "What is my view on pricing?", or "How has my thinking changed?"
argument-hint: '[topic or question]'
---

# Synthesize a User Brain topic

Use the `roas-platform` MCP tool `synthesize_user_brain_topic`. It retrieves several topic angles and returns one deduplicated, source-grounded dossier.

## Workflow

1. Extract a concise topic from the request and preserve the user's full question.
2. Call `synthesize_user_brain_topic` with `topic`, `question`, and the default evidence limit unless the user asked for a deeper or narrower pass.
3. Check `coverage.context_sufficient`, `coverage.source_count`, and `gaps` before drafting.
4. Build the opening answer from `synthesis.short_answer_basis`.
5. Use the other synthesis sections only when they improve the answer: core beliefs, decisions, preferences, frameworks and strategies, stories and examples, perspectives, and synthesized context.
6. Cite the returned evidence refs, such as `[E1]`, immediately after each material claim. Name the source title when it gives useful context.

## Evidence rules

- Distinguish recurring beliefs from historical decisions, one-off stories, and retrieved background context.
- Describe evolution or tension only when multiple cited records directly support it.
- A retrieval score measures relevance, not whether a statement is the user's current position.
- When coverage is insufficient, say what the Brain does and does not support. Ask for a narrower topic or more source material instead of filling the gap from general knowledge.
- Do not expose raw internal metadata that is unrelated to the user's question.

## Response shape

Lead with a short direct answer. Follow with a small number of useful themes, then close with meaningful uncertainty or gaps. Keep citations attached to the claims they support.

Example opening:

`Your recurring view is that webinars work best as a focused diagnosis-and-offer mechanism, not as broad educational events. [E1][E4]`

Do not invent a belief, source, contradiction, chronology, or citation.
