-- Repair Page Grader Spaces created before the importer wrote a complete Space schema.
WITH canonical_fields AS (
  SELECT jsonb_build_array(
    jsonb_build_object('id', 'title', 'name', 'Name', 'type', 'text', 'system', true, 'required', true),
    jsonb_build_object(
      'id', 'status',
      'name', 'Status',
      'type', 'select',
      'system', true,
      'required', true,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'todo', 'label', 'To Do', 'color', 'cyan', 'group', 'not_started'),
        jsonb_build_object('id', 'in_progress', 'label', 'In Progress', 'color', 'amber', 'group', 'active'),
        jsonb_build_object('id', 'in_review', 'label', 'In Review', 'color', 'violet', 'group', 'active'),
        jsonb_build_object('id', 'done', 'label', 'Completed', 'color', 'emerald', 'group', 'closed'),
        jsonb_build_object('id', 'archived', 'label', 'Closed', 'color', 'slate', 'group', 'closed')
      )
    ),
    jsonb_build_object(
      'id', 'priority',
      'name', 'Priority',
      'type', 'select',
      'system', true,
      'required', true,
      'options', jsonb_build_array(
        jsonb_build_object('id', 'low', 'label', 'Low', 'color', 'slate'),
        jsonb_build_object('id', 'medium', 'label', 'Medium', 'color', 'blue'),
        jsonb_build_object('id', 'high', 'label', 'High', 'color', 'orange'),
        jsonb_build_object('id', 'urgent', 'label', 'Urgent', 'color', 'red')
      )
    ),
    jsonb_build_object('id', 'assignee', 'name', 'Assignee', 'type', 'assignee', 'system', true),
    jsonb_build_object('id', 'due_date', 'name', 'Due Date', 'type', 'date', 'system', true),
    jsonb_build_object(
      'id', 'tags',
      'name', 'Tags',
      'type', 'multi_select',
      'system', true,
      'options', '[]'::jsonb
    )
  ) AS fields
)
UPDATE public.spaces AS spaces
SET
  title = 'General',
  schema = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(COALESCE(spaces.schema, '{}'::jsonb), '{version}', '1'::jsonb, true),
        '{icon}',
        '"layout-grid"'::jsonb,
        true
      ),
      '{fields}',
      canonical_fields.fields,
      true
    ),
    '{custom_data}',
    COALESCE(spaces.schema->'custom_data', '{}'::jsonb) || jsonb_build_object('space_role', 'general'),
    true
  ),
  updated_at = NOW()
FROM canonical_fields
WHERE spaces.schema->'custom_data'->>'source' = 'page_grader'
  AND (
    spaces.schema->'fields' IS NULL
    OR jsonb_typeof(spaces.schema->'fields') <> 'array'
  );
