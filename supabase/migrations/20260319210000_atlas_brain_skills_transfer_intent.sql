-- Append persistence-intent + transfer/delete guidance to Brain Scholar template skills; sync atlas copies.

UPDATE agent_template_skills
SET markdown_content = markdown_content || E'

## Persistence intent (missions and chat)

Before writing knowledge, infer **where** the user wants it from title, brief, description, and subtask text:
- **User personal brain** → `save_memory`, `trigger_crystallization`, `ingest_brain_*`, `ingest_user_*`
- **Agent SK (e.g. Vibey)** → `ingest_sk_text` / `ingest_sk_link` with that agent''s `brainId` (use list_team / brain stats / search if needed)
- **Campaign** → `ingest_campaign_file` / `ingest_campaign_url` with `campaignId`

If the user said "Vibey agent brain" or "train Vibey", target is **agent** SK for `vibey`, not `save_memory`.

### Correcting placement
- **`transfer_brain_node`**: `operation` copy or move; `node_type` memory, snapshot, sk_entry, sk_source, or experience; `source_scope` / `target_scope` as `{ "type": "user"|"agent"|"campaign", "agent_id"?, "campaign_id"? }`; for `experience` set `connected_node_ids`.
- **`delete_brain_node`**: `node_type` memory, snapshot, sk_entry, sk_source, or connection; `node_id` UUID.

When uncertain, search first; do not use `save_memory` for agent-bound requests.
'
WHERE template_key = 'brain_scholar' AND skill_key = 'knowledge-intake';

UPDATE agent_skills
SET markdown_content = (
  SELECT markdown_content FROM agent_template_skills
  WHERE template_key = 'brain_scholar' AND skill_key = 'knowledge-intake'
  LIMIT 1
)
WHERE skill_key = 'knowledge-intake'
  AND agent_key = 'atlas';

UPDATE agent_template_skills
SET markdown_content = markdown_content || E'

## Node transfer and deletion

Use **`transfer_brain_node`** to copy or move memories, snapshots, SK entries/sources, or bundled experience sets between the user default brain, an agent SK brain (`type: agent`, `agent_id` e.g. `vibey`), and campaign scope (`type: campaign`, `campaign_id`).

Use **`delete_brain_node`** to remove a misplaced **memory**, **snapshot**, **sk_entry**, **sk_source** (deletes dependent entries), or **connection** between memories. Confirm IDs via search/list tools before delete.
'
WHERE template_key = 'brain_scholar' AND skill_key = 'brain-operations';

UPDATE agent_skills
SET markdown_content = (
  SELECT markdown_content FROM agent_template_skills
  WHERE template_key = 'brain_scholar' AND skill_key = 'brain-operations'
  LIMIT 1
)
WHERE skill_key = 'brain-operations'
  AND agent_key = 'atlas';
