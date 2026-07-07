-- Split document body content from task notes.

ALTER TABLE public.space_items
ADD COLUMN IF NOT EXISTS doc_body TEXT;

COMMENT ON COLUMN public.space_items.doc_body IS
  'Main rich-text body for doc-type space items. Task/list notes remain in notes.';

UPDATE public.space_items
SET doc_body = COALESCE(notes, custom_data->>'body')
WHERE status = 'doc'
  AND doc_body IS NULL
  AND (
    notes IS NOT NULL
    OR custom_data ? 'body'
  );

CREATE OR REPLACE FUNCTION pg_temp.space_template_markdown_to_html(p_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_line TEXT;
  v_trimmed TEXT;
  v_html TEXT := '';
  v_list TEXT := '';
  v_escaped TEXT;
BEGIN
  IF p_text IS NULL OR p_text = '' THEN
    RETURN p_text;
  END IF;

  IF p_text ~* '<[[:alpha:]][^>]*>' THEN
    RETURN p_text;
  END IF;

  FOREACH v_line IN ARRAY string_to_array(p_text, E'\n') LOOP
    v_trimmed := btrim(v_line);
    IF v_trimmed = '' THEN
      IF v_list <> '' THEN
        v_html := v_html || '<ul>' || v_list || '</ul>' || E'\n';
        v_list := '';
      END IF;
      CONTINUE;
    END IF;

    v_escaped := replace(replace(replace(v_trimmed, '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
    v_escaped := regexp_replace(v_escaped, '\*\*([^*]+)\*\*', '<strong>\1</strong>', 'g');

    IF left(v_trimmed, 2) = '# ' THEN
      IF v_list <> '' THEN
        v_html := v_html || '<ul>' || v_list || '</ul>' || E'\n';
        v_list := '';
      END IF;
      v_html := v_html || '<h1>' || substr(v_escaped, 3) || '</h1>' || E'\n';
    ELSIF left(v_trimmed, 3) = '## ' THEN
      IF v_list <> '' THEN
        v_html := v_html || '<ul>' || v_list || '</ul>' || E'\n';
        v_list := '';
      END IF;
      v_html := v_html || '<h2>' || substr(v_escaped, 4) || '</h2>' || E'\n';
    ELSIF left(v_trimmed, 2) = '- ' THEN
      v_list := v_list || '<li>' || substr(v_escaped, 3) || '</li>';
    ELSE
      IF v_list <> '' THEN
        v_html := v_html || '<ul>' || v_list || '</ul>' || E'\n';
        v_list := '';
      END IF;
      v_html := v_html || '<p>' || v_escaped || '</p>' || E'\n';
    END IF;
  END LOOP;

  IF v_list <> '' THEN
    v_html := v_html || '<ul>' || v_list || '</ul>' || E'\n';
  END IF;

  RETURN btrim(v_html);
END;
$$;

UPDATE public.space_template_items
SET body = pg_temp.space_template_markdown_to_html(body)
WHERE kind = 'doc'
  AND body IS NOT NULL
  AND body !~* '<[[:alpha:]][^>]*>';

UPDATE public.space_items
SET doc_body = pg_temp.space_template_markdown_to_html(doc_body)
WHERE status = 'doc'
  AND source = 'template'
  AND doc_body IS NOT NULL
  AND doc_body !~* '<[[:alpha:]][^>]*>';

CREATE OR REPLACE FUNCTION public.instantiate_space_template(
  p_slug TEXT,
  p_title TEXT DEFAULT NULL,
  p_org_id UUID DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_visibility TEXT DEFAULT 'team',
  p_default_share_level TEXT DEFAULT NULL,
  p_include_tasks BOOLEAN DEFAULT true,
  p_include_docs BOOLEAN DEFAULT true,
  p_include_channel BOOLEAN DEFAULT true,
  p_include_automations BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_template public.space_templates%ROWTYPE;
  v_schema JSONB;
  v_space public.spaces%ROWTYPE;
  v_channel_id UUID;
  v_automations JSONB := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_visibility NOT IN ('private', 'team') THEN
    RAISE EXCEPTION 'Invalid visibility: %', p_visibility;
  END IF;

  IF p_default_share_level IS NOT NULL AND p_default_share_level NOT IN ('admin', 'edit', 'view') THEN
    RAISE EXCEPTION 'Invalid default share level: %', p_default_share_level;
  END IF;

  IF p_org_id IS NOT NULL AND NOT public.is_org_member(p_org_id) THEN
    RAISE EXCEPTION 'Organization access denied';
  END IF;

  SELECT *
  INTO v_template
  FROM public.space_templates
  WHERE slug = p_slug
    AND is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  v_schema := v_template.schema || jsonb_build_object(
    'icon', v_template.icon,
    'icon_color', v_template.icon_color
  );

  IF NOT (COALESCE(p_include_channel, true) AND v_template.channel_name IS NOT NULL) THEN
    v_schema := jsonb_set(
      v_schema,
      '{views}',
      COALESCE(
        (
          SELECT jsonb_agg(view_value ORDER BY ord)
          FROM jsonb_array_elements(COALESCE(v_schema->'views', '[]'::jsonb)) WITH ORDINALITY AS views(view_value, ord)
          WHERE view_value->>'type' NOT IN ('channel', 'channels')
        ),
        '[]'::jsonb
      )
    );
  END IF;

  INSERT INTO public.spaces (
    org_id,
    user_id,
    title,
    description,
    campaign_id,
    is_template,
    visibility,
    schema
  )
  VALUES (
    p_org_id,
    v_user_id,
    COALESCE(NULLIF(BTRIM(p_title), ''), v_template.title),
    v_template.description,
    p_campaign_id,
    false,
    COALESCE(p_visibility, 'team'),
    v_schema
  )
  RETURNING * INTO v_space;

  IF COALESCE(p_include_channel, true) AND v_template.channel_name IS NOT NULL THEN
    INSERT INTO public.channels (
      org_id,
      user_id,
      name,
      description,
      is_private,
      metadata
    )
    VALUES (
      p_org_id,
      v_user_id,
      v_template.channel_name,
      v_template.channel_description,
      COALESCE(p_visibility, 'team') = 'private',
      jsonb_build_object('space_id', v_space.id, 'source', 'space-template')
    )
    RETURNING id INTO v_channel_id;

    INSERT INTO public.channel_memberships (
      channel_id,
      member_type,
      user_id,
      agent_key,
      role,
      added_by
    )
    VALUES (
      v_channel_id,
      'user',
      v_user_id,
      NULL,
      'admin',
      v_user_id
    );

    v_schema := jsonb_set(
      v_schema,
      '{views}',
      COALESCE(
        (
          SELECT jsonb_agg(
            CASE
              WHEN view_value->>'type' = 'channel' THEN
                (view_value - 'channels_config') ||
                jsonb_build_object(
                  'channel_config',
                  jsonb_build_object('channel_id', v_channel_id::text)
                )
              WHEN view_value->>'type' = 'channels' THEN
                (view_value - 'channel_config') ||
                jsonb_build_object(
                  'channels_config',
                  COALESCE(view_value->'channels_config', '{}'::jsonb) ||
                  jsonb_build_object(
                    'channel_ids',
                    (
                      SELECT jsonb_agg(id_value ORDER BY ord)
                      FROM (
                        SELECT v_channel_id::text AS id_value, 0 AS ord
                        UNION ALL
                        SELECT existing_id.value #>> '{}' AS id_value, existing_id.ord::int AS ord
                        FROM jsonb_array_elements(
                          COALESCE(view_value#>'{channels_config,channel_ids}', '[]'::jsonb)
                        ) WITH ORDINALITY AS existing_id(value, ord)
                        WHERE existing_id.value #>> '{}' <> v_channel_id::text
                      ) channel_ids
                    ),
                    'active_channel_id',
                    COALESCE(NULLIF(view_value#>>'{channels_config,active_channel_id}', ''), v_channel_id::text)
                  )
                )
              ELSE view_value
            END
            ORDER BY ord
          )
          FROM jsonb_array_elements(COALESCE(v_schema->'views', '[]'::jsonb)) WITH ORDINALITY AS views(view_value, ord)
        ),
        '[]'::jsonb
      )
    );

    UPDATE public.spaces
    SET schema = v_schema
    WHERE id = v_space.id
    RETURNING * INTO v_space;
  END IF;

  IF COALESCE(p_include_tasks, true) OR COALESCE(p_include_docs, true) THEN
    INSERT INTO public.space_items (
      space_id,
      org_id,
      user_id,
      title,
      status,
      priority,
      description,
      notes,
      doc_body,
      source,
      sort_order,
      custom_data
    )
    SELECT
      v_space.id,
      p_org_id,
      v_user_id,
      item.title,
      CASE WHEN item.kind = 'doc' THEN 'doc' ELSE COALESCE(item.status, 'todo') END,
      item.priority,
      item.description,
      NULL,
      CASE WHEN item.kind = 'doc' THEN item.body ELSE NULL END,
      'template',
      (ROW_NUMBER() OVER (ORDER BY item.sort_order, item.id) - 1)::int,
      item.custom_data ||
        CASE
          WHEN item.kind = 'doc' THEN jsonb_build_object('_view_type', 'doc')
          ELSE '{}'::jsonb
        END
    FROM public.space_template_items item
    WHERE item.template_id = v_template.id
      AND (
        (item.kind = 'task' AND COALESCE(p_include_tasks, true))
        OR (item.kind = 'doc' AND COALESCE(p_include_docs, true))
      )
    ORDER BY item.sort_order, item.id;
  END IF;

  IF COALESCE(p_include_automations, true) THEN
    WITH inserted AS (
      INSERT INTO public.space_automations (
        space_id,
        user_id,
        org_id,
        name,
        enabled,
        is_draft,
        trigger,
        actions,
        created_by
      )
      SELECT
        v_space.id,
        v_user_id,
        p_org_id,
        auto.name,
        false,
        true,
        auto.trigger,
        auto.actions,
        v_user_id
      FROM public.space_template_automations auto
      WHERE auto.template_id = v_template.id
      ORDER BY auto.sort_order, auto.id
      RETURNING *
    )
    SELECT COALESCE(jsonb_agg(to_jsonb(inserted) ORDER BY inserted.created_at, inserted.id), '[]'::jsonb)
    INTO v_automations
    FROM inserted;
  END IF;

  IF p_org_id IS NOT NULL
    AND COALESCE(p_visibility, 'team') = 'team'
    AND p_default_share_level IS NOT NULL
    AND p_default_share_level <> 'view'
  THEN
    INSERT INTO public.space_shares (
      space_id,
      org_id,
      entity_type,
      entity_id,
      level,
      created_by
    )
    VALUES (
      v_space.id,
      p_org_id,
      'org',
      p_org_id,
      p_default_share_level,
      v_user_id
    )
    ON CONFLICT (space_id, entity_type, entity_id)
    DO UPDATE SET
      level = EXCLUDED.level,
      created_by = EXCLUDED.created_by;
  END IF;

  RETURN jsonb_build_object(
    'space', to_jsonb(v_space),
    'automations', v_automations
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.instantiate_space_template(
  TEXT,
  TEXT,
  UUID,
  UUID,
  TEXT,
  TEXT,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN,
  BOOLEAN
) TO authenticated;
