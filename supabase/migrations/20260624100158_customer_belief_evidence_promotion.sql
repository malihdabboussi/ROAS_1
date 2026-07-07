UPDATE public.agent_skills
SET markdown_content = replace(
  replace(
    replace(
      replace(
        markdown_content,
        $$Default to `stated` when the only signal is language. Promote to `revealed` when at least one customer's behavior corroborates. `behavioral` is reserved for patterns visible in three or more customers' actions.$$,
        $$Default to `stated` when the only signal is language. Promote to `revealed` when at least one customer's behavior corroborates. `behavioral` is reserved for patterns visible in three or more customers' actions.

Evidence type is a property of the belief, not a separate insight. If a current `stated` belief is later corroborated by action, reinforce the existing belief with `evidence_type: "revealed"` in `belief_updates`; do not create a second belief with the same name or description.$$
      ),
      $$   - Reinforces an existing belief → `belief_updates` entry with `op: "reinforce"`, the belief's id, and the new supporting memory ids. Don't restate the belief description; the worker keeps existing wording and just appends.$$,
      $$   - Reinforces an existing belief → `belief_updates` entry with `op: "reinforce"`, the belief's id, the new supporting memory ids, and `evidence_type` when the new evidence should promote the existing tier. Don't restate the belief description; the worker keeps existing wording and just appends.$$
    ),
    $$      "supporting_memory_ids": ["uuid", "..."],
      "rationale": "one short sentence"$$,
    $$      "supporting_memory_ids": ["uuid", "..."],
      "evidence_type": "stated | revealed | behavioral | null",
      "rationale": "one short sentence"$$
  ),
  $$- `evidence_type` is one of the three enum values exactly. Other strings are dropped.$$,
  $$- `new_beliefs[].evidence_type` and `belief_updates[].evidence_type` are one of the three enum values exactly. Other strings are dropped.
- Use `belief_updates[].evidence_type` only to preserve or promote an existing belief's evidence tier. Never downgrade `behavioral` to `revealed` or `revealed` to `stated`.$$
),
updated_at = now()
WHERE agent_key = 'atlas'
  AND skill_key = 'customer-brain-pattern-analysis'
  AND markdown_content NOT LIKE '%Evidence type is a property of the belief%';
