-- Teach the global Pixel runtime to avoid Markdown tables in Slack.
-- The API also converts any table that slips through into labeled bullets.

DO $$
DECLARE
  tools_row record;
  insert_at integer;
  formatting_guidance constant text := $guidance$
### Slack Output Formatting

Slack does not reliably render Markdown tables. When replying in Slack, express rows as compact labeled bullets instead of pipe-delimited table syntax.

Example: `• Date — Spend: $328 · Leads: 42 · CPL: $7.82 · CTR: 2.38%`

Keep real Markdown tables for surfaces that render them, such as portal documents.
$guidance$;
BEGIN
  SELECT id, content
  INTO tools_row
  FROM public.agent_definitions
  WHERE user_id IS NULL
    AND org_id IS NULL
    AND agent_key = 'vibey'
    AND file_name = 'TOOLS.md'
  LIMIT 1;

  IF tools_row.id IS NULL THEN
    RAISE EXCEPTION 'Global Pixel TOOLS.md definition was not found';
  END IF;

  IF tools_row.content NOT LIKE '%### Slack Output Formatting%' THEN
    insert_at := strpos(tools_row.content, E'\nFor unclear,');
    IF insert_at = 0 THEN
      RAISE EXCEPTION 'Global Pixel TOOLS.md formatting anchor was not found';
    END IF;

    UPDATE public.agent_definitions
    SET
      content =
        left(tools_row.content, insert_at - 1) ||
        E'\n\n' ||
        formatting_guidance ||
        substr(tools_row.content, insert_at),
      updated_at = now()
    WHERE id = tools_row.id;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.agent_definitions
    WHERE user_id IS NULL
      AND org_id IS NULL
      AND agent_key = 'vibey'
      AND file_name = 'TOOLS.md'
      AND content LIKE '%### Slack Output Formatting%'
      AND content LIKE '%Slack does not reliably render Markdown tables%'
  ) THEN
    RAISE EXCEPTION 'Pixel Slack formatting guidance was not persisted';
  END IF;
END;
$$;
