-- DB-backed Loop Flow Builder guidance for aligning Space schema to a Flow.
-- The agent skill row points at the reference file; the reference file carries
-- the detailed protocol so runtime skill sync can materialize it into SKILL.md.

UPDATE public.agent_skills
SET
  markdown_content = CASE
    WHEN markdown_content LIKE '%references/space-schema-alignment.md%' THEN markdown_content
    WHEN markdown_content LIKE '%## Backend Actions%' THEN replace(
      markdown_content,
      '## Backend Actions',
      '## Space Schema Alignment

Read `references/space-schema-alignment.md` whenever a Flow requires a missing status, category, tag, or field in the active Space. If schema mutation actions are available, align the Space schema before finalizing the Flow plan. If they are not available, surface the blocker instead of inventing fields or treating the request as impossible.

## Backend Actions'
    )
    ELSE markdown_content || '

## Space Schema Alignment

Read `references/space-schema-alignment.md` whenever a Flow requires a missing status, category, tag, or field in the active Space. If schema mutation actions are available, align the Space schema before finalizing the Flow plan. If they are not available, surface the blocker instead of inventing fields or treating the request as impossible.'
  END,
  updated_at = now()
WHERE agent_key = 'loop'
  AND skill_key = 'flow-builder'
  AND user_id IS NULL
  AND org_id IS NULL
  AND markdown_content NOT LIKE '%references/space-schema-alignment.md%';

INSERT INTO public.agent_skill_resources (
  user_id,
  org_id,
  agent_key,
  skill_key,
  file_path,
  content,
  content_type
)
VALUES (
  NULL,
  NULL,
  'loop',
  'flow-builder',
  'references/space-schema-alignment.md',
  $md$# Space Schema Alignment

Use this reference when a Flow needs a Space field or option that does not exist yet.

## Decision

Missing Space schema is Flow build input, not a reason to stop. When Loop has schema mutation actions, align the Space first, then continue the Flow plan against the real field and option IDs.

## Protocol

1. Read the active Space with `get_space` or the current Space context.
2. Identify the exact missing schema item: status option, category option, tag option, custom field, or custom field option.
3. If an existing field needs a new option, use `update_space_field`.
4. For status changes, target `field_id: "status"` and send the full replacement `options` list: every existing status option plus the new one.
5. For category, tag, or custom select fields, preserve existing options and append only the missing option.
6. If the needed field itself does not exist, use `create_space_field` with the smallest field contract that satisfies the Flow.
7. After the schema write succeeds, continue building the Flow with the confirmed field ID and option ID.
8. If schema mutation actions are not available, tell the user the Flow can be planned but the Space schema cannot be changed from the current surface.

## Example

User asks for a Flow that moves records to a new `Escalated` status.

Do:
- Read the Space status field.
- If `Escalated` is missing, call `update_space_field` for `field_id: "status"` with the complete status option list, including `Escalated`.
- Build the Flow using the returned or confirmed `Escalated` option ID.

Do not:
- Invent an option ID.
- Ask the user to create the status manually when schema actions are available.
- Finalize a Flow that references a status/category/tag option that does not exist.
$md$,
  'text/markdown'
)
ON CONFLICT (agent_key, skill_key, file_path)
WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  updated_at = now();
