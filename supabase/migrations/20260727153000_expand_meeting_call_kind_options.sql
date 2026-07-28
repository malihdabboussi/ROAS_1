-- Expand Meetings call_kind select options for personal dashboard spaces.
-- Adds executive / external / sales alongside existing personal / team.

DO $$
DECLARE
  space_row RECORD;
  fields JSONB;
  field JSONB;
  field_idx INT;
  options JSONB;
  next_options JSONB;
  option_ids TEXT[];
BEGIN
  FOR space_row IN
    SELECT id, schema
    FROM public.spaces
    WHERE COALESCE((schema ->> 'personal_dashboard')::boolean, false) = true
  LOOP
    fields := COALESCE(space_row.schema -> 'fields', '[]'::jsonb);
    field_idx := NULL;
    FOR i IN 0 .. COALESCE(jsonb_array_length(fields), 0) - 1 LOOP
      field := fields -> i;
      IF field ->> 'id' = 'call_kind' THEN
        field_idx := i;
        EXIT;
      END IF;
    END LOOP;

    IF field_idx IS NULL THEN
      CONTINUE;
    END IF;

    options := COALESCE(fields -> field_idx -> 'options', '[]'::jsonb);
    SELECT ARRAY_AGG(opt ->> 'id')
      INTO option_ids
    FROM jsonb_array_elements(options) AS opt;

    next_options := options;
    IF option_ids IS NULL OR NOT ('executive' = ANY (option_ids)) THEN
      next_options := next_options || jsonb_build_array(
        jsonb_build_object('id', 'executive', 'label', 'Executive', 'color', 'amber')
      );
    END IF;
    IF option_ids IS NULL OR NOT ('external' = ANY (option_ids)) THEN
      next_options := next_options || jsonb_build_array(
        jsonb_build_object('id', 'external', 'label', 'External', 'color', 'cyan')
      );
    END IF;
    IF option_ids IS NULL OR NOT ('sales' = ANY (option_ids)) THEN
      next_options := next_options || jsonb_build_array(
        jsonb_build_object('id', 'sales', 'label', 'Sales', 'color', 'orange')
      );
    END IF;

    IF next_options = options THEN
      CONTINUE;
    END IF;

    fields := jsonb_set(fields, ARRAY[field_idx::text, 'options'], next_options, true);
    UPDATE public.spaces
    SET schema = jsonb_set(schema, '{fields}', fields, true),
        updated_at = NOW()
    WHERE id = space_row.id;
  END LOOP;
END $$;
