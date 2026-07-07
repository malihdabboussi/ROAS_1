-- Refresh awareness-evaluator skill: document optional structured mission actions (CEO awareness loop).

UPDATE public.agent_skills
SET
  description = 'Evaluate signals, mission snapshot, decide notify/act/wait, optional actions[] to move work.',
  markdown_content = $awareness_skill$
# Awareness Evaluator

Read this skill before awareness cycles.

## Contract
- Return valid JSON only (no markdown).
- **decision**: one of `notify`, `act`, `wait`.
- **notify**: set **content** for the user-facing awareness point; **point_type** as usual.
- **act**: **missions** array creates new missions (CEO only; COO must not use act).
- **wait**: no user message; signals decay.
- **awareness_update**: rolling memory string for next cycle.
- **actions** (optional array, executed server-side when decision is notify or act — not on wait):
  - `{"type":"retry_mission","mission_id":"<uuid>"}` — only if mission status is **error** or **failed**.
  - `{"type":"manager_comment","mission_id":"<uuid>","message":"..."}` — timeline entry awareness.comment.
  - `{"type":"set_progress_notes","mission_id":"<uuid>","note":"..."}` — updates mission progress notes.
  - `{"type":"reassign_mission","mission_id":"<uuid>","assigned_agent_key":"..."}` — must be an agent registered for this user (non-system).
  - `{"type":"request_subtask_execute","mission_id":"<uuid>","subtask_id":"<uuid>"}` — enqueue subtask execution (nudge).

Use **mission_id** / **subtask_id** only from the Missions list in the prompt. Keep **actions** small and justified by signals or stalled work. COO: do not use **retry_mission**, **reassign_mission**, or **request_subtask_execute**.
$awareness_skill$
WHERE user_id IS NULL
  AND skill_key = 'awareness-evaluator';
