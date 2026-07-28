BEGIN;

ALTER TABLE public.space_external_automation_events
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.space_external_automation_events
  DROP CONSTRAINT IF EXISTS space_external_automation_events_status_check;

ALTER TABLE public.space_external_automation_events
  ADD CONSTRAINT space_external_automation_events_status_check
  CHECK (status IN ('received', 'processing', 'processed', 'duplicate', 'ignored', 'failed'));

UPDATE public.space_automations automation
SET
  actions = COALESCE(
    (
      SELECT jsonb_agg(action ORDER BY ordinal)
      FROM jsonb_array_elements(automation.actions) WITH ORDINALITY AS steps(action, ordinal)
      WHERE action->>'type' NOT IN (
        'send_to_agent',
        'agent_suggest_tasks',
        'request_slack_follow_up_confirm'
      )
    ),
    '[]'::jsonb
  ),
  updated_at = now()
WHERE automation.name = 'Fathom Meeting Log'
  AND automation.trigger->>'type' = 'external_fathom_recording_ready';

CREATE TABLE IF NOT EXISTS public.meeting_workspaces (
  meeting_item_id UUID PRIMARY KEY REFERENCES public.space_items(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  calendar_event_id TEXT,
  ical_uid TEXT,
  phase TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (phase IN ('scheduled', 'live', 'processing', 'complete')),
  live_started_at TIMESTAMPTZ,
  live_ended_at TIMESTAMPTZ,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  agenda_doc_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  notes_doc_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  recap_doc_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  next_meeting_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  processing_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_workspaces_space_calendar_event
  ON public.meeting_workspaces (space_id, calendar_event_id)
  WHERE calendar_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_workspaces_user_phase
  ON public.meeting_workspaces (user_id, phase, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_workspaces_org_phase
  ON public.meeting_workspaces (org_id, phase, updated_at DESC)
  WHERE org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_item_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_recording_id TEXT NOT NULL,
  provider_meeting_id TEXT,
  calendar_event_id TEXT,
  title TEXT NOT NULL,
  recording_url TEXT,
  scheduled_start_at TIMESTAMPTZ,
  scheduled_end_at TIMESTAMPTZ,
  recording_start_at TIMESTAMPTZ,
  recording_end_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  classification TEXT NOT NULL DEFAULT 'supplemental'
    CHECK (classification IN ('primary', 'supplemental', 'fragment')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  provider_summary TEXT,
  provider_action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcript_entries INTEGER NOT NULL DEFAULT 0 CHECK (transcript_entries >= 0),
  transcript_doc_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  participant_emails TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meeting_recordings_owner_provider_external_unique
    UNIQUE (user_id, provider, external_recording_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_time
  ON public.meeting_recordings (
    meeting_item_id,
    recording_start_at,
    scheduled_start_at,
    created_at
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_recordings_one_primary
  ON public.meeting_recordings (meeting_item_id)
  WHERE is_primary = true;

CREATE TABLE IF NOT EXISTS public.meeting_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_item_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_recording_id UUID REFERENCES public.meeting_recordings(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('provider', 'ai', 'manual')),
  source_key TEXT NOT NULL,
  source_text TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (
      status IN (
        'proposed',
        'confirmed',
        'in_progress',
        'resolved',
        'rolled_forward',
        'dismissed'
      )
    ),
  canonical_assignee_type TEXT
    CHECK (canonical_assignee_type IS NULL OR canonical_assignee_type IN ('user', 'contact')),
  canonical_assignee_id UUID,
  canonical_assignee_name TEXT,
  canonical_assignee_email TEXT,
  due_at TIMESTAMPTZ,
  priority TEXT CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high', 'urgent')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolution JSONB NOT NULL DEFAULT '{}'::jsonb,
  task_item_id UUID REFERENCES public.space_items(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meeting_actions_meeting_source_unique UNIQUE (meeting_item_id, source_key)
);

CREATE INDEX IF NOT EXISTS idx_meeting_actions_meeting_status
  ON public.meeting_actions (meeting_item_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_meeting_actions_assignee_status
  ON public.meeting_actions (canonical_assignee_id, status, due_at)
  WHERE canonical_assignee_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.meeting_context_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_item_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (
      entity_type IN (
        'company',
        'client',
        'contact',
        'campaign',
        'space',
        'artifact',
        'meeting',
        'task'
      )
    ),
  entity_id UUID NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('user', 'calendar', 'crm', 'ai', 'prior_meeting')),
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  confirmation_state TEXT NOT NULL DEFAULT 'suggested'
    CHECK (confirmation_state IN ('suggested', 'confirmed', 'rejected')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT meeting_context_links_entity_unique
    UNIQUE (meeting_item_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_context_links_entity
  ON public.meeting_context_links (entity_type, entity_id, confirmation_state);

CREATE TABLE IF NOT EXISTS public.meeting_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_item_id UUID NOT NULL REFERENCES public.space_items(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_recording_id UUID REFERENCES public.meeting_recordings(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('pasted_text', 'call_quote', 'partial_transcript', 'observation', 'clip')),
  text TEXT NOT NULL CHECK (length(btrim(text)) > 0),
  author_name TEXT,
  occurred_at TIMESTAMPTZ,
  source_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_snippets_meeting_time
  ON public.meeting_snippets (meeting_item_id, occurred_at, created_at);

INSERT INTO public.meeting_workspaces (
  meeting_item_id,
  space_id,
  user_id,
  org_id,
  calendar_event_id,
  phase
)
SELECT
  item.id,
  item.space_id,
  item.user_id,
  item.org_id,
  NULLIF(item.custom_data->>'calendar_event_id', ''),
  'complete'
FROM public.space_items item
WHERE (
    item.source = 'fathom'
    OR item.custom_data->'external_automation'->>'provider' = 'fathom'
  )
  AND item.custom_data->'external_automation'->>'meeting_id' IS NOT NULL
ON CONFLICT (meeting_item_id) DO NOTHING;

INSERT INTO public.meeting_recordings (
  meeting_item_id,
  space_id,
  user_id,
  org_id,
  provider,
  external_recording_id,
  provider_meeting_id,
  title,
  recording_url,
  provider_summary,
  transcript_entries,
  is_primary,
  classification,
  metadata
)
SELECT
  item.id,
  item.space_id,
  item.user_id,
  item.org_id,
  'fathom',
  item.custom_data->'external_automation'->>'meeting_id',
  item.custom_data->'external_automation'->>'meeting_id',
  item.title,
  COALESCE(
    NULLIF(item.custom_data->>'recording_url', ''),
    NULLIF(item.custom_data->>'fathom_url', '')
  ),
  COALESCE(
    NULLIF(item.custom_data->>'summary', ''),
    NULLIF(item.description, '')
  ),
  CASE
    WHEN item.custom_data->'external_automation'->>'transcript_entries' ~ '^[0-9]+$'
      THEN (item.custom_data->'external_automation'->>'transcript_entries')::INTEGER
    ELSE 0
  END,
  true,
  'primary',
  jsonb_build_object('legacy_backfill', true)
FROM public.space_items item
WHERE (
    item.source = 'fathom'
    OR item.custom_data->'external_automation'->>'provider' = 'fathom'
  )
  AND item.custom_data->'external_automation'->>'meeting_id' IS NOT NULL
ON CONFLICT (user_id, provider, external_recording_id) DO NOTHING;

INSERT INTO public.space_items (
  space_id,
  user_id,
  org_id,
  parent_item_id,
  title,
  doc_body,
  source,
  custom_data
)
SELECT
  item.space_id,
  item.user_id,
  item.org_id,
  item.id,
  LEFT('Transcript — ' || item.title, 500),
  '<h1>TRANSCRIPT — ' || replace(replace(replace(item.title, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') ||
    '</h1><p>' ||
    replace(
      replace(
        replace(
          replace(item.custom_data->>'transcript_text', '&', '&amp;'),
          '<',
          '&lt;'
        ),
        '>',
        '&gt;'
      ),
      E'\n',
      '<br>'
    ) ||
    '</p>',
  'fathom',
  jsonb_build_object(
    '_view_type',
    'doc',
    'entry_type',
    'meeting_transcript',
    'meeting_item_id',
    item.id,
    'external_recording_id',
    item.custom_data->'external_automation'->>'meeting_id',
    'provider',
    'fathom',
    'source_locked',
    true,
    'legacy_backfill',
    true
  )
FROM public.space_items item
WHERE (
    item.source = 'fathom'
    OR item.custom_data->'external_automation'->>'provider' = 'fathom'
  )
  AND NULLIF(item.custom_data->>'transcript_text', '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.space_items transcript
    WHERE transcript.parent_item_id = item.id
      AND transcript.custom_data->>'entry_type' = 'meeting_transcript'
      AND transcript.custom_data->>'external_recording_id' =
        item.custom_data->'external_automation'->>'meeting_id'
  );

UPDATE public.meeting_recordings recording
SET transcript_doc_item_id = transcript.id
FROM public.space_items transcript
WHERE transcript.parent_item_id = recording.meeting_item_id
  AND transcript.custom_data->>'entry_type' = 'meeting_transcript'
  AND transcript.custom_data->>'external_recording_id' = recording.external_recording_id
  AND recording.transcript_doc_item_id IS NULL;

INSERT INTO public.meeting_context_links (
  meeting_item_id,
  space_id,
  user_id,
  org_id,
  entity_type,
  entity_id,
  source,
  confidence,
  confirmation_state,
  metadata
)
SELECT
  workspace.meeting_item_id,
  workspace.space_id,
  workspace.user_id,
  workspace.org_id,
  'space',
  workspace.space_id,
  'prior_meeting',
  1,
  'confirmed',
  jsonb_build_object('legacy_backfill', true)
FROM public.meeting_workspaces workspace
ON CONFLICT (meeting_item_id, entity_type, entity_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_meeting_child_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  SELECT item.space_id, item.user_id, item.org_id
  INTO NEW.space_id, NEW.user_id, NEW.org_id
  FROM public.space_items item
  WHERE item.id = NEW.meeting_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting item % does not exist', NEW.meeting_item_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_meeting_item(p_meeting_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_items item
    WHERE item.id = p_meeting_item_id
      AND (
        (SELECT auth.role()) = 'service_role'
        OR
        item.user_id = (SELECT auth.uid())
        OR (
          item.org_id IS NOT NULL
          AND public.has_space_write_access(item.space_id, item.org_id)
        )
        OR (
          item.is_private = false
          AND public.space_view_share_grants_item(item.space_id, item.id, 'edit')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.set_meeting_primary_recording(
  p_meeting_item_id UUID,
  p_recording_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_write_meeting_item(p_meeting_item_id) THEN
    RAISE EXCEPTION 'Meeting write access denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.meeting_recordings recording
    WHERE recording.id = p_recording_id
      AND recording.meeting_item_id = p_meeting_item_id
  ) THEN
    RAISE EXCEPTION 'Recording % does not belong to meeting %', p_recording_id, p_meeting_item_id;
  END IF;

  UPDATE public.meeting_recordings
  SET
    is_primary = false,
    classification = CASE
      WHEN id = p_recording_id THEN 'primary'
      ELSE 'supplemental'
    END
  WHERE meeting_item_id = p_meeting_item_id;

  UPDATE public.meeting_recordings
  SET is_primary = true, classification = 'primary'
  WHERE id = p_recording_id
    AND meeting_item_id = p_meeting_item_id;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'meeting_workspaces',
    'meeting_recordings',
    'meeting_actions',
    'meeting_context_links',
    'meeting_snippets'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS sync_%I_scope ON public.%I',
      table_name,
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER sync_%I_scope
       BEFORE INSERT OR UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.sync_meeting_child_scope()',
      table_name,
      table_name
    );
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at_%I ON public.%I',
      table_name,
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER set_updated_at_%I
       BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()',
      table_name,
      table_name
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_select', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR SELECT TO authenticated
       USING (
         EXISTS (
           SELECT 1 FROM public.space_items item
           WHERE item.id = meeting_item_id
         )
       )',
      table_name || '_select',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_insert', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR INSERT TO authenticated
       WITH CHECK (public.can_write_meeting_item(meeting_item_id))',
      table_name || '_insert',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_update', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR UPDATE TO authenticated
       USING (public.can_write_meeting_item(meeting_item_id))
       WITH CHECK (public.can_write_meeting_item(meeting_item_id))',
      table_name || '_update',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_delete', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR DELETE TO authenticated
       USING (public.can_write_meeting_item(meeting_item_id))',
      table_name || '_delete',
      table_name
    );

    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated, service_role',
      table_name
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_meeting_child_scope() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_meeting_child_scope() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.can_write_meeting_item(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_meeting_item(UUID) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.set_meeting_primary_recording(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_meeting_primary_recording(UUID, UUID)
  TO authenticated, service_role;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY[
      'meeting_workspaces',
      'meeting_recordings',
      'meeting_actions',
      'meeting_context_links',
      'meeting_snippets'
    ]
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_rel publication_table
        JOIN pg_class relation ON relation.oid = publication_table.prrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE publication_table.prpubid = (
          SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime'
        )
          AND namespace.nspname = 'public'
          AND relation.relname = table_name
      ) THEN
        EXECUTE format(
          'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
          table_name
        );
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON TABLE public.meeting_workspaces IS
  'Canonical lifecycle state for a meeting Space item. Calendar prep, live chat, notes, recap, and next-meeting continuity attach here.';
COMMENT ON TABLE public.meeting_recordings IS
  'Provider recording sources attached many-to-one to a canonical meeting, including per-source transcript deliverables.';
COMMENT ON TABLE public.meeting_actions IS
  'Evidence-backed provider, AI, and manual meeting actions. Space tasks are projections created only after confirmation.';
COMMENT ON TABLE public.meeting_context_links IS
  'Fluid typed relationships from a meeting to companies, clients, contacts, campaigns, Spaces, artifacts, meetings, and tasks.';
COMMENT ON TABLE public.meeting_snippets IS
  'User-supplied or call-derived snippets kept distinct from notes, provider transcripts, and AI interpretations.';

COMMIT;
