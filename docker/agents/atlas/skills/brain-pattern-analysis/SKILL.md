---
name: brain-pattern-analysis
description: Detect belief patterns and synthesize perspectives from organized narrative pages. Use for brain pattern analysis and cognition missions.
---

# Brain Pattern Analysis

You analyze organized knowledge pages to detect belief patterns and synthesize perspectives from clusters of aligned beliefs.

## Brain Routing

Use the read and write tools for the brain family in the job target. User Brain pattern jobs use the default user cognition tools. Agent, customer, company, or another explicit non-default target must include the target brain id or supported target context. Campaign/Space context can influence interpretation, but durable beliefs and perspectives are written only to an explicit durable brain target.

## Pattern Model

A memory is a thought fused with an emotion. The emotional tag on a memory is not decoration; it is part of what makes repeated patterns visible.

Beliefs form through repeated emotional responses to the same category of situation. Frequency plus emotional consistency plus behavioral evidence is stronger than topic similarity alone.

Perspectives form when 3+ beliefs align into a coherent worldview. The perspective is the narrative that ties beliefs together and explains what blind spots they create.

## Workflow

1. Read the organized pages from the library index and page set.
2. Read existing beliefs with `get_brain_belief_patterns` and perspectives with `get_brain_perspectives`.
3. Detect new patterns across pages: repeated emotional themes, behavioral consistency, explicit statements, and contradictions between stated beliefs and behavior.
4. Create, update, challenge, or archive belief patterns as the evidence requires.
5. Synthesize or update perspectives when the belief landscape changes.
6. Write `narrative_md` as the story of the worldview: how it formed, what it means, what blind spots it creates, and how it is evolving.
7. Log the work via `log_brain_event` with `event_type` set to `detect_pattern` or `synthesize_perspective`.

Use evidence windows when judging formation and change. `created_at` tells you when Atlas learned a row; `occurred_at`, `valid_from`, and evidence windows tell you when the evidence happened and when the belief or perspective was true. When a perspective fundamentally shifts, preserve the old arc and emit timeline-worthy formation, shift, contradiction, or resolution evidence.

## Pattern Quality Rules

- A pattern needs 3+ supporting memories with emotional consistency to become a belief.
- The emotional signature matters: same topic plus different emotions is not one pattern.
- Behavioral evidence outweighs stated beliefs.
- Unconscious beliefs are valuable because they influence decisions without awareness.
- When contradictory evidence appears, mark the belief as challenged instead of deleting it.

## Perspective Quality Rules

- A perspective needs 3+ aligned beliefs.
- The narrative must explain why the beliefs cluster.
- Every perspective has blind spots; name them explicitly.
- Perspectives evolve. Track the arc from formation to current state.
- When a perspective fundamentally shifts, archive the old one and create the new one instead of overwriting history.

## Actions Reference

Read `references/actions.md` for the complete action reference with parameters.
