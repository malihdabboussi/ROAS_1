-- Versioned, normalized Canvas operations shared by human editors and agents.

ALTER TABLE public.campaign_canvases
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Canvas',
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.canvas_items (
  id UUID PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.campaign_canvases(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'sticky_note', 'text', 'shape', 'frame', 'card', 'resource_card'
  )),
  position_x DOUBLE PRECISION NOT NULL,
  position_y DOUBLE PRECISION NOT NULL,
  width DOUBLE PRECISION NOT NULL DEFAULT 240 CHECK (width > 0),
  height DOUBLE PRECISION NOT NULL DEFAULT 160 CHECK (height > 0),
  rotation DOUBLE PRECISION NOT NULL DEFAULT 0,
  z_index INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES public.canvas_items(id) ON DELETE SET NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  resource_type TEXT,
  resource_id UUID,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canvas_items_board ON public.canvas_items(board_id, z_index);
CREATE INDEX IF NOT EXISTS idx_canvas_items_parent ON public.canvas_items(parent_id)
  WHERE parent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.canvas_connectors (
  id UUID PRIMARY KEY,
  board_id UUID NOT NULL REFERENCES public.campaign_canvases(id) ON DELETE CASCADE,
  source_item_id UUID NOT NULL REFERENCES public.canvas_items(id) ON DELETE CASCADE,
  target_item_id UUID NOT NULL REFERENCES public.canvas_items(id) ON DELETE CASCADE,
  source_handle TEXT,
  target_handle TEXT,
  label TEXT NOT NULL DEFAULT '',
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT canvas_connector_distinct_items CHECK (source_item_id <> target_item_id)
);

CREATE INDEX IF NOT EXISTS idx_canvas_connectors_board
  ON public.canvas_connectors(board_id);

CREATE TABLE IF NOT EXISTS public.canvas_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.campaign_canvases(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_agent_key TEXT,
  idempotency_key TEXT NOT NULL,
  base_revision BIGINT NOT NULL,
  committed_revision BIGINT NOT NULL,
  operations JSONB NOT NULL,
  inverse_operations JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_bounds JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT canvas_operations_idempotent UNIQUE (board_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_canvas_operations_board_revision
  ON public.canvas_operations(board_id, committed_revision);

ALTER TABLE public.canvas_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY canvas_items_view ON public.canvas_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'view'))
  ));
CREATE POLICY canvas_items_edit ON public.canvas_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'edit'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'edit'))
  ));

CREATE POLICY canvas_connectors_view ON public.canvas_connectors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'view'))
  ));
CREATE POLICY canvas_connectors_edit ON public.canvas_connectors FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'edit'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'edit'))
  ));

CREATE POLICY canvas_operations_view ON public.canvas_operations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'view'))
  ));
CREATE POLICY canvas_operations_create ON public.canvas_operations FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'edit'))
  ));

DROP TRIGGER IF EXISTS set_updated_at_canvas_items ON public.canvas_items;
CREATE TRIGGER set_updated_at_canvas_items BEFORE UPDATE ON public.canvas_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_canvas_connectors ON public.canvas_connectors;
CREATE TRIGGER set_updated_at_canvas_connectors BEFORE UPDATE ON public.canvas_connectors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.canvas_items TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.canvas_connectors TO authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.canvas_operations TO authenticated, service_role;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_operations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

-- Seed normalized items from the prototype graph. Invalid legacy ids are replaced deterministically.
INSERT INTO public.canvas_items (
  id, board_id, kind, position_x, position_y, content, created_by, updated_by
)
SELECT
  CASE
    WHEN (node->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (node->>'id')::uuid
    ELSE gen_random_uuid()
  END,
  board.id,
  CASE node->'data'->>'kind'
    WHEN 'note' THEN 'sticky_note'
    WHEN 'text' THEN 'text'
    WHEN 'shape' THEN 'shape'
    ELSE 'card'
  END,
  COALESCE((node->'position'->>'x')::double precision, 0),
  COALESCE((node->'position'->>'y')::double precision, 0),
  jsonb_build_object(
    'title', COALESCE(node->'data'->>'title', ''),
    'text', COALESCE(node->'data'->>'text', '')
  ),
  board.user_id,
  board.user_id
FROM public.campaign_canvases board
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(board.graph->'nodes', '[]'::jsonb)) node
ON CONFLICT (id) DO NOTHING;

-- Service-backed agent actions must prove the invoking user's effective Campaign and
-- Program access explicitly; service_role itself is never treated as the editor.
CREATE OR REPLACE FUNCTION public.has_canvas_campaign_access_for_user(
  p_user_id UUID,
  p_campaign_id UUID,
  p_min_level TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = p_campaign_id
      AND (
        (c.user_id IS NOT NULL AND c.user_id = p_user_id)
        OR (
          c.org_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.org_members om
            LEFT JOIN public.org_campaign_permissions ocp
              ON ocp.org_member_id = om.id AND ocp.campaign_id = c.id
            WHERE om.org_id = c.org_id
              AND om.user_id = p_user_id
              AND om.status = 'active'
              AND (
                p_min_level = 'view'
                OR ocp.permission = 'edit'
                OR om.role IN ('owner', 'admin', 'creator')
              )
          )
          AND (
            c.program_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.programs p
              JOIN public.org_members pom
                ON pom.org_id = p.org_id
               AND pom.user_id = p_user_id
               AND pom.status = 'active'
              WHERE p.id = c.program_id
                AND p.deleted_at IS NULL
                AND (
                  pom.role IN ('owner', 'admin')
                  OR p.created_by = p_user_id
                  OR (
                    p.visibility = 'workspace'
                    AND (
                      p_min_level = 'view'
                      OR pom.role IN ('owner', 'admin', 'creator', 'editor')
                    )
                  )
                  OR (
                    p.visibility IN ('private', 'selected')
                    AND EXISTS (
                      SELECT 1 FROM public.program_shares ps
                      WHERE ps.program_id = p.id
                        AND ps.entity_type = 'user'
                        AND ps.entity_id = p_user_id
                        AND (p_min_level = 'view' OR ps.level = 'edit')
                    )
                  )
                )
            )
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.has_canvas_campaign_access_for_user(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_canvas_campaign_access_for_user(UUID, UUID, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.apply_canvas_operations(
  p_board_id UUID,
  p_actor_user_id UUID,
  p_base_revision BIGINT,
  p_idempotency_key TEXT,
  p_operations JSONB,
  p_actor_agent_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_revision BIGINT;
  committed_revision BIGINT;
  existing_operation public.canvas_operations%ROWTYPE;
  operation JSONB;
  inverse_operations JSONB := '[]'::jsonb;
  inverse_group JSONB;
  item_before public.canvas_items%ROWTYPE;
  connector_before public.canvas_connectors%ROWTYPE;
  viewport_before JSONB;
  affected_item_ids UUID[] := ARRAY[]::UUID[];
  affected_bounds JSONB;
BEGIN
  IF jsonb_typeof(p_operations) <> 'array'
    OR jsonb_array_length(p_operations) < 1
    OR jsonb_array_length(p_operations) > 100 THEN
    RAISE EXCEPTION 'CANVAS_BATCH_INVALID';
  END IF;

  IF auth.role() <> 'service_role' AND p_actor_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'CANVAS_ACTOR_MISMATCH';
  END IF;

  IF NOT public.has_canvas_campaign_access_for_user(
    p_actor_user_id,
    (SELECT campaign_id FROM public.campaign_canvases WHERE id = p_board_id),
    'edit'
  ) THEN
    RAISE EXCEPTION 'CANVAS_EDIT_FORBIDDEN';
  END IF;

  IF auth.role() <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM public.campaign_canvases b
    WHERE b.id = p_board_id
      AND (b.user_id = auth.uid() OR public.has_org_campaign_access(b.campaign_id, 'edit'))
  ) THEN
    RAISE EXCEPTION 'CANVAS_EDIT_FORBIDDEN';
  END IF;

  SELECT * INTO existing_operation
  FROM public.canvas_operations
  WHERE board_id = p_board_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'operation_id', existing_operation.id,
      'committed_revision', existing_operation.committed_revision,
      'idempotent_replay', true,
      'affected_bounds', existing_operation.affected_bounds
    );
  END IF;

  SELECT revision INTO current_revision
  FROM public.campaign_canvases
  WHERE id = p_board_id
  FOR UPDATE;
  IF current_revision IS NULL THEN RAISE EXCEPTION 'CANVAS_NOT_FOUND'; END IF;
  IF current_revision <> p_base_revision THEN
    RAISE EXCEPTION 'CANVAS_REVISION_CONFLICT:%', current_revision;
  END IF;

  FOR operation IN SELECT * FROM jsonb_array_elements(p_operations)
  LOOP
    CASE operation->>'op'
      WHEN 'create_item' THEN
        IF operation->'item'->>'parent_id' IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.canvas_items
          WHERE id = (operation->'item'->>'parent_id')::uuid AND board_id = p_board_id
        ) THEN
          RAISE EXCEPTION 'CANVAS_PARENT_NOT_FOUND';
        END IF;
        INSERT INTO public.canvas_items (
          id, board_id, kind, position_x, position_y, width, height, rotation,
          z_index, parent_id, content, style, resource_type, resource_id,
          locked, created_by, updated_by
        ) VALUES (
          (operation->'item'->>'id')::uuid, p_board_id, operation->'item'->>'kind',
          (operation->'item'->>'position_x')::double precision,
          (operation->'item'->>'position_y')::double precision,
          COALESCE((operation->'item'->>'width')::double precision, 240),
          COALESCE((operation->'item'->>'height')::double precision, 160),
          COALESCE((operation->'item'->>'rotation')::double precision, 0),
          COALESCE((operation->'item'->>'z_index')::integer, 0),
          (operation->'item'->>'parent_id')::uuid,
          COALESCE(operation->'item'->'content', '{}'::jsonb),
          COALESCE(operation->'item'->'style', '{}'::jsonb),
          operation->'item'->>'resource_type',
          (operation->'item'->>'resource_id')::uuid,
          COALESCE((operation->'item'->>'locked')::boolean, false),
          p_actor_user_id, p_actor_user_id
        );
        inverse_operations := jsonb_build_array(jsonb_build_object(
          'op', 'delete_item', 'item_id', operation->'item'->>'id'
        )) || inverse_operations;
        affected_item_ids := array_append(affected_item_ids, (operation->'item'->>'id')::uuid);
      WHEN 'update_item' THEN
        item_before := NULL;
        SELECT * INTO item_before FROM public.canvas_items
        WHERE id = (operation->>'item_id')::uuid AND board_id = p_board_id;
        UPDATE public.canvas_items SET
          position_x = COALESCE((operation->'patch'->>'position_x')::double precision, position_x),
          position_y = COALESCE((operation->'patch'->>'position_y')::double precision, position_y),
          width = COALESCE((operation->'patch'->>'width')::double precision, width),
          height = COALESCE((operation->'patch'->>'height')::double precision, height),
          rotation = COALESCE((operation->'patch'->>'rotation')::double precision, rotation),
          z_index = COALESCE((operation->'patch'->>'z_index')::integer, z_index),
          content = COALESCE(operation->'patch'->'content', content),
          style = COALESCE(operation->'patch'->'style', style),
          locked = COALESCE((operation->'patch'->>'locked')::boolean, locked),
          updated_by = p_actor_user_id
        WHERE id = (operation->>'item_id')::uuid AND board_id = p_board_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'CANVAS_ITEM_NOT_FOUND'; END IF;
        inverse_operations := jsonb_build_array(jsonb_build_object(
          'op', 'update_item',
          'item_id', item_before.id,
          'patch', jsonb_build_object(
            'position_x', item_before.position_x, 'position_y', item_before.position_y,
            'width', item_before.width, 'height', item_before.height,
            'rotation', item_before.rotation, 'z_index', item_before.z_index,
            'content', item_before.content, 'style', item_before.style,
            'locked', item_before.locked
          )
        )) || inverse_operations;
        affected_item_ids := array_append(affected_item_ids, (operation->>'item_id')::uuid);
      WHEN 'delete_item' THEN
        item_before := NULL;
        SELECT * INTO item_before FROM public.canvas_items
        WHERE id = (operation->>'item_id')::uuid AND board_id = p_board_id;
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'op', 'create_connector', 'connector', to_jsonb(c) - 'board_id' - 'created_by' - 'created_at' - 'updated_at'
        )), '[]'::jsonb) INTO inverse_group
        FROM public.canvas_connectors c
        WHERE c.board_id = p_board_id
          AND (c.source_item_id = (operation->>'item_id')::uuid
            OR c.target_item_id = (operation->>'item_id')::uuid);
        DELETE FROM public.canvas_items
        WHERE id = (operation->>'item_id')::uuid AND board_id = p_board_id;
        IF item_before.id IS NULL THEN RAISE EXCEPTION 'CANVAS_ITEM_NOT_FOUND'; END IF;
        inverse_group := jsonb_build_array(jsonb_build_object(
          'op', 'create_item',
          'item', to_jsonb(item_before) - 'board_id' - 'created_by' - 'updated_by' - 'created_at' - 'updated_at'
        )) || inverse_group;
        inverse_operations := inverse_group || inverse_operations;
        affected_item_ids := array_append(affected_item_ids, (operation->>'item_id')::uuid);
      WHEN 'create_connector' THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.canvas_items
          WHERE id = (operation->'connector'->>'source_item_id')::uuid AND board_id = p_board_id
        ) OR NOT EXISTS (
          SELECT 1 FROM public.canvas_items
          WHERE id = (operation->'connector'->>'target_item_id')::uuid AND board_id = p_board_id
        ) THEN
          RAISE EXCEPTION 'CANVAS_CONNECTOR_ENDPOINT_NOT_FOUND';
        END IF;
        INSERT INTO public.canvas_connectors (
          id, board_id, source_item_id, target_item_id, source_handle,
          target_handle, label, style, created_by
        ) VALUES (
          (operation->'connector'->>'id')::uuid, p_board_id,
          (operation->'connector'->>'source_item_id')::uuid,
          (operation->'connector'->>'target_item_id')::uuid,
          operation->'connector'->>'source_handle',
          operation->'connector'->>'target_handle',
          COALESCE(operation->'connector'->>'label', ''),
          COALESCE(operation->'connector'->'style', '{}'::jsonb),
          p_actor_user_id
        );
        inverse_operations := jsonb_build_array(jsonb_build_object(
          'op', 'delete_connector', 'connector_id', operation->'connector'->>'id'
        )) || inverse_operations;
        affected_item_ids := affected_item_ids || ARRAY[
          (operation->'connector'->>'source_item_id')::uuid,
          (operation->'connector'->>'target_item_id')::uuid
        ];
      WHEN 'delete_connector' THEN
        connector_before := NULL;
        SELECT * INTO connector_before FROM public.canvas_connectors
        WHERE id = (operation->>'connector_id')::uuid AND board_id = p_board_id;
        DELETE FROM public.canvas_connectors
        WHERE id = (operation->>'connector_id')::uuid AND board_id = p_board_id;
        IF connector_before.id IS NULL THEN RAISE EXCEPTION 'CANVAS_CONNECTOR_NOT_FOUND'; END IF;
        inverse_operations := jsonb_build_array(jsonb_build_object(
          'op', 'create_connector',
          'connector', to_jsonb(connector_before) - 'board_id' - 'created_by' - 'created_at' - 'updated_at'
        )) || inverse_operations;
      WHEN 'update_viewport' THEN
        SELECT viewport INTO viewport_before FROM public.campaign_canvases WHERE id = p_board_id;
        UPDATE public.campaign_canvases
        SET viewport = operation->'viewport'
        WHERE id = p_board_id;
        inverse_operations := jsonb_build_array(jsonb_build_object(
          'op', 'update_viewport', 'viewport', viewport_before
        )) || inverse_operations;
      ELSE
        RAISE EXCEPTION 'CANVAS_OPERATION_UNSUPPORTED:%', operation->>'op';
    END CASE;
  END LOOP;

  committed_revision := current_revision + 1;
  SELECT CASE WHEN count(*) = 0 THEN NULL ELSE jsonb_build_object(
    'x', min(position_x),
    'y', min(position_y),
    'width', max(position_x + width) - min(position_x),
    'height', max(position_y + height) - min(position_y)
  ) END
  INTO affected_bounds
  FROM public.canvas_items
  WHERE board_id = p_board_id AND id = ANY(affected_item_ids);

  UPDATE public.campaign_canvases
  SET revision = committed_revision, updated_at = now()
  WHERE id = p_board_id;

  INSERT INTO public.canvas_operations (
    board_id, actor_user_id, actor_agent_key, idempotency_key,
    base_revision, committed_revision, operations, inverse_operations, affected_bounds
  ) VALUES (
    p_board_id, p_actor_user_id, p_actor_agent_key, p_idempotency_key,
    p_base_revision, committed_revision, p_operations, inverse_operations, affected_bounds
  ) RETURNING id INTO existing_operation.id;

  RETURN jsonb_build_object(
    'operation_id', existing_operation.id,
    'committed_revision', committed_revision,
    'idempotent_replay', false,
    'affected_bounds', affected_bounds
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_canvas_operations(UUID, UUID, BIGINT, TEXT, JSONB, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_canvas_operations(UUID, UUID, BIGINT, TEXT, JSONB, TEXT)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.undo_canvas_operation(
  p_board_id UUID,
  p_actor_user_id UUID,
  p_operation_id UUID,
  p_actor_agent_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_operation public.canvas_operations%ROWTYPE;
  current_revision BIGINT;
BEGIN
  SELECT * INTO target_operation FROM public.canvas_operations
  WHERE id = p_operation_id AND board_id = p_board_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CANVAS_OPERATION_NOT_FOUND'; END IF;

  SELECT revision INTO current_revision FROM public.campaign_canvases WHERE id = p_board_id;
  IF current_revision <> target_operation.committed_revision THEN
    RAISE EXCEPTION 'CANVAS_UNDO_NOT_LATEST:%', current_revision;
  END IF;

  RETURN public.apply_canvas_operations(
    p_board_id,
    p_actor_user_id,
    current_revision,
    'undo:' || p_operation_id::text,
    target_operation.inverse_operations,
    p_actor_agent_key
  );
END;
$$;

REVOKE ALL ON FUNCTION public.undo_canvas_operation(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.undo_canvas_operation(UUID, UUID, UUID, TEXT)
  TO authenticated, service_role;
