UPDATE public.agent_skills
SET markdown_content = replace(
  replace(
    replace(
      markdown_content,
      $$5. **MEMORIES** — the new customer-brain memories since the last analysis pass. Each carries `id`, `content`, `customer_unit_id`, optional `contact_id`, optional `source_identity_id`, `source_type`, `created_at`, temporal fields such as `occurred_at` / `occurred_until`, and any prior `emotional_valence` / `emotional_intensity` scores. Group by `customer_unit_id` to find the cross-customer themes — you need at least 3 distinct customer units on the supporting set for any new belief.$$,
      $$5. **MEMORIES** — the new customer-brain memories since the last analysis pass. Each carries `id`, `content`, `customer_unit_id`, optional `contact_id`, optional `source_identity_id`, `source_type`, `created_at`, temporal fields such as `occurred_at` / `occurred_until`, and any prior `emotional_valence` / `emotional_intensity` scores. Group by `customer_unit_id` to find the cross-customer themes — you need at least 3 distinct customer units on the supporting set for any new belief.

The first pass is intentionally compact. You do not receive every historical memory or any tools. When an existing belief or perspective cannot be safely challenged, resolved, archived, or rewritten without its older evidence trail, use `evidence_requests` to ask the worker for only the relevant history by existing belief or perspective id. Do not request the whole Brain. Routine reinforcement and new patterns that are fully supported by the supplied memories should use an empty request array.$$
    ),
    $$  "brain_id": "uuid (echo from BRAIN block)",
  "new_beliefs": [$$,
    $$  "brain_id": "uuid (echo from BRAIN block)",
  "evidence_requests": [
    {
      "belief_ids": ["existing belief uuid"],
      "perspective_ids": ["existing perspective uuid"],
      "reason": "why the older evidence trail is required"
    }
  ],
  "new_beliefs": [$$
  ),
  $$- Echo the `brain_id` from the BRAIN input block. The worker uses it to scope writes; an empty or missing field fails validation.$$,
  $$- Echo the `brain_id` from the BRAIN input block. The worker uses it to scope writes; an empty or missing field fails validation.
- `evidence_requests` is always present. Use `[]` when the compact packet is sufficient. Each request may name only ids from EXISTING_BELIEFS or EXISTING_PERSPECTIVES. The worker resolves those ids to a bounded older evidence packet and never exposes the full Brain or a tool suite.
- On the high-stakes review pass, `evidence_requests` must be `[]`. If the targeted trail is still insufficient, remove the unsafe lifecycle operation instead of guessing or requesting another loop.$$
),
updated_at = now()
WHERE agent_key = 'atlas'
  AND skill_key = 'customer-brain-pattern-analysis'
  AND markdown_content NOT LIKE '%The first pass is intentionally compact%';
