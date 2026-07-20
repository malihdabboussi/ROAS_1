BEGIN;

-- Personal Dashboards are organization-scoped but remain visible only to their owner.
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS space_kind TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE public.spaces
  DROP CONSTRAINT IF EXISTS spaces_space_kind_check;
ALTER TABLE public.spaces
  ADD CONSTRAINT spaces_space_kind_check
  CHECK (space_kind IN ('standard', 'personal_dashboard'));

ALTER TABLE public.spaces
  DROP CONSTRAINT IF EXISTS spaces_personal_dashboard_private_check;
ALTER TABLE public.spaces
  ADD CONSTRAINT spaces_personal_dashboard_private_check
  CHECK (
    space_kind <> 'personal_dashboard'
    OR (
      org_id IS NOT NULL
      AND visibility = 'private'
      AND share_link_enabled = false
      AND share_token IS NULL
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_one_personal_dashboard_per_member
  ON public.spaces (org_id, user_id)
  WHERE space_kind = 'personal_dashboard';

CREATE INDEX IF NOT EXISTS idx_spaces_personal_dashboard_owner
  ON public.spaces (user_id, org_id)
  WHERE space_kind = 'personal_dashboard';

COMMENT ON COLUMN public.spaces.space_kind IS
  'System role for a Space. personal_dashboard rows are immutable, owner-only organization workspaces.';

-- Replace the two role-specific templates for future creation. Existing Spaces are untouched.
UPDATE public.space_templates
SET is_published = false,
    updated_at = now()
WHERE slug IN ('ceo-hq', 'meetings');

WITH dashboard_schema AS (
  SELECT '{"version":1,"icon":"layout-dashboard","personal_dashboard":true,"fields":[{"id":"title","name":"Name","type":"text","system":true,"required":true},{"id":"status","name":"Status","type":"select","system":true,"required":true,"options":[{"id":"inbox","label":"Inbox","color":"slate","group":"not_started"},{"id":"today","label":"Today","color":"amber","group":"active"},{"id":"processing","label":"Processing","color":"cyan","group":"active"},{"id":"logged","label":"To action","color":"blue","group":"not_started"},{"id":"needs_follow_up","label":"Following up","color":"orange","group":"active"},{"id":"waiting","label":"Waiting","color":"violet","group":"active"},{"id":"done","label":"Done","color":"emerald","group":"closed"}]},{"id":"entry_type","name":"Type","type":"select","required":false,"options":[{"id":"work","label":"Work","color":"slate"},{"id":"call","label":"Call","color":"blue"},{"id":"follow_up","label":"Follow-up","color":"amber"},{"id":"prep","label":"Prep","color":"emerald"}]},{"id":"call_kind","name":"Call Kind","type":"select","required":false,"options":[{"id":"personal","label":"Personal","color":"emerald"},{"id":"team","label":"Team","color":"violet"}]},{"id":"priority","name":"Priority","type":"select","system":true,"required":true,"options":[{"id":"low","label":"Low","color":"slate"},{"id":"medium","label":"Medium","color":"blue"},{"id":"high","label":"High","color":"orange"},{"id":"urgent","label":"Urgent","color":"red"}]},{"id":"attendees","name":"Attendees","type":"multi_select","options":[]},{"id":"recording_url","name":"Recording","type":"url"},{"id":"assignee","name":"Assignee","type":"assignee","system":true},{"id":"source_call","name":"Source call","type":"text"},{"id":"call_date","name":"Call Date","type":"date"},{"id":"calendar_event_id","name":"Calendar Event","type":"text"},{"id":"prep_status","name":"Prep Status","type":"select","options":[{"id":"pending","label":"Pending","color":"slate"},{"id":"ready","label":"Ready","color":"emerald"},{"id":"failed","label":"Failed","color":"red"}]},{"id":"due_date","name":"Due Date","type":"date","system":true}],"views":[{"id":"today","type":"list","name":"Today","visible_fields":["title","status","priority","assignee","due_date"],"field_value_filters":{"status":"today"}},{"id":"priorities","type":"kanban","name":"Priorities","group_by":"status","visible_fields":["title","priority","assignee","due_date"]},{"id":"agenda","type":"calendar","name":"Agenda","calendar_config":{"date_field":"call_date","default_zoom":"week","week_start":1,"show_task_list":false,"time_format":"12h","sources":[{"id":"space_items","type":"space_items","visible":true,"color":"blue"},{"id":"google_calendar","type":"google_calendar","visible":true,"color":"green"},{"id":"outlook","type":"outlook","visible":true,"color":"blue"}]}},{"id":"all-meetings","type":"list","name":"All Meetings","field_value_filters":{"entry_type":"call"},"visible_fields":["status","title","call_kind","attendees","call_date","recording_url","priority"],"column_widths":{"status":140,"title":360,"call_kind":110,"attendees":360,"call_date":170,"recording_url":220,"priority":110},"date_display_formats":{"call_date":"date_time"}},{"id":"prep","type":"list","name":"Prep","field_value_filters":{"entry_type":"prep"},"visible_fields":["status","title","prep_status","attendees","call_date","priority"]},{"id":"follow-ups","type":"kanban","name":"Follow-ups","group_by":"status","field_value_filters":{"entry_type":"follow_up"},"visible_fields":["title","source_call","attendees","priority","assignee","due_date"],"show_closed_tasks":true},{"id":"action-items","type":"list","name":"Action items","field_value_filters":{"entry_type":"follow_up"},"visible_fields":["status","title","source_call","attendees","priority","assignee","due_date"],"show_closed_tasks":true},{"id":"drafts","type":"emails","name":"Drafts","icon":"mail","emails_config":{"display_mode":"grid","time_range":"all","sort_by":"created_at","sort_dir":"desc"}},{"id":"meeting-logs","type":"docs","name":"Meeting Logs"},{"id":"notes","type":"docs","name":"Notes"},{"id":"people","type":"contacts","name":"People","contacts_config":{"scope":"campaign","sort_by":"name","sort_dir":"asc","status_filter":"all"}},{"id":"missions","type":"missions","name":"Missions"}]}'::jsonb AS schema
)
INSERT INTO public.space_templates (
  slug,
  title,
  description,
  icon,
  icon_color,
  category,
  persona,
  badge,
  featured,
  is_new,
  schema,
  channel_name,
  channel_description,
  sort_order,
  is_published
)
SELECT
  'personal-dashboard',
  'Personal Dashboard',
  'A private daily workspace for priorities, meetings, calendar, people, notes, and approval-ready drafts.',
  'layout-dashboard',
  'blue',
  'tier1_universal',
  NULL,
  'Private',
  true,
  true,
  schema,
  NULL,
  NULL,
  5,
  true
FROM dashboard_schema
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  icon_color = EXCLUDED.icon_color,
  category = EXCLUDED.category,
  persona = EXCLUDED.persona,
  badge = EXCLUDED.badge,
  featured = EXCLUDED.featured,
  is_new = EXCLUDED.is_new,
  schema = EXCLUDED.schema,
  channel_name = EXCLUDED.channel_name,
  channel_description = EXCLUDED.channel_description,
  sort_order = EXCLUDED.sort_order,
  is_published = true,
  updated_at = now();

DELETE FROM public.space_template_items
WHERE template_id = (
  SELECT id FROM public.space_templates WHERE slug = 'personal-dashboard'
);

INSERT INTO public.space_template_items (
  template_id,
  kind,
  title,
  status,
  priority,
  description,
  body,
  custom_data,
  sort_order
)
VALUES
  (
    (SELECT id FROM public.space_templates WHERE slug = 'personal-dashboard'),
    'doc',
    'Welcome — your Personal Dashboard',
    NULL,
    'medium',
    NULL,
    '<h1>Personal Dashboard</h1><p>Your private home for today''s priorities, calendar, meetings, approval-ready drafts, notes, people, and missions.</p><p>Use Today for the few actions that need you now. Automations install as drafts and communication stays draft-only until you approve it.</p>',
    '{}'::jsonb,
    0
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'personal-dashboard'),
    'doc',
    'Privacy and connected accounts',
    NULL,
    'medium',
    NULL,
    '<h2>Private by design</h2><p>This dashboard belongs only to you. Organization administrators and teammates cannot open or share it.</p><h2>Connected accounts</h2><p>The layout is ready in advance, but email, calendar, Slack, and Fathom authorization stays under your own account. Your organization cannot authorize a personal account on your behalf.</p>',
    '{}'::jsonb,
    1
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'personal-dashboard'),
    'task',
    'Connect your email and calendar',
    'logged',
    'high',
    'Connect Gmail or Outlook and your calendar from your own integration settings.',
    NULL,
    jsonb_build_object('entry_type', 'follow_up'),
    2
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'personal-dashboard'),
    'task',
    'Connect Slack and Fathom if you use them',
    'logged',
    'medium',
    'Authorize personal connections, then review and publish only the flows you want.',
    NULL,
    jsonb_build_object('entry_type', 'follow_up'),
    3
  ),
  (
    (SELECT id FROM public.space_templates WHERE slug = 'personal-dashboard'),
    'task',
    'Review your draft automations',
    'logged',
    'medium',
    'Set your timezone and publish the daily or meeting flows that fit your role.',
    NULL,
    jsonb_build_object('entry_type', 'follow_up'),
    4
  );

DELETE FROM public.space_template_automations
WHERE template_id = (
  SELECT id FROM public.space_templates WHERE slug = 'personal-dashboard'
);

INSERT INTO public.space_template_automations (
  template_id,
  name,
  trigger,
  actions,
  sort_order
)
SELECT
  (SELECT id FROM public.space_templates WHERE slug = 'personal-dashboard'),
  CASE
    WHEN source_template.slug = 'ceo-hq' AND automation.name = 'Morning CEO Brief'
      THEN 'Morning Brief'
    ELSE automation.name
  END,
  automation.trigger,
  replace(automation.actions::text, 'CEO', 'personal')::jsonb,
  CASE
    WHEN source_template.slug = 'ceo-hq' THEN automation.sort_order
    ELSE automation.sort_order + 2
  END
FROM public.space_template_automations automation
JOIN public.space_templates source_template ON source_template.id = automation.template_id
WHERE source_template.slug IN ('ceo-hq', 'meetings')
ORDER BY
  CASE WHEN source_template.slug = 'ceo-hq' THEN 0 ELSE 1 END,
  automation.sort_order;

INSERT INTO public.space_template_automations (
  template_id,
  name,
  trigger,
  actions,
  sort_order
)
SELECT
  template.id,
  'Morning Pre-call Prep',
  jsonb_build_object(
    'type', 'schedule',
    'schedule', jsonb_build_object('mode', 'preset', 'preset', 'daily', 'time', '07:00'),
    'timezone', 'America/Los_Angeles'
  ),
  jsonb_build_array(jsonb_build_object('type', 'meetings_precall_prep', 'refresh', true)),
  3
FROM public.space_templates template
WHERE template.slug = 'personal-dashboard'
  AND NOT EXISTS (
    SELECT 1
    FROM public.space_template_automations existing
    WHERE existing.template_id = template.id
      AND existing.name = 'Morning Pre-call Prep'
  );

CREATE OR REPLACE FUNCTION public.ensure_org_member_personal_dashboard(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.space_templates%ROWTYPE;
  v_space_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.org_members membership
    WHERE membership.org_id = p_org_id
      AND membership.user_id = p_user_id
      AND membership.status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_template
  FROM public.space_templates
  WHERE slug = 'personal-dashboard'
    AND is_published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Published Personal Dashboard template is missing';
  END IF;

  INSERT INTO public.spaces (
    org_id,
    user_id,
    title,
    description,
    campaign_id,
    is_template,
    visibility,
    schema,
    share_link_enabled,
    share_token,
    space_kind
  )
  VALUES (
    p_org_id,
    p_user_id,
    v_template.title,
    v_template.description,
    NULL,
    false,
    'private',
    v_template.schema || jsonb_build_object(
      'icon', v_template.icon,
      'icon_color', v_template.icon_color,
      'personal_dashboard', true
    ),
    false,
    NULL,
    'personal_dashboard'
  )
  ON CONFLICT (org_id, user_id)
    WHERE space_kind = 'personal_dashboard'
  DO NOTHING
  RETURNING id INTO v_space_id;

  IF v_space_id IS NULL THEN
    SELECT id
    INTO v_space_id
    FROM public.spaces
    WHERE org_id = p_org_id
      AND user_id = p_user_id
      AND space_kind = 'personal_dashboard';
    RETURN v_space_id;
  END IF;

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
    custom_data,
    is_private,
    share_link_enabled,
    share_token
  )
  SELECT
    v_space_id,
    p_org_id,
    p_user_id,
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
        WHEN item.kind = 'doc' THEN
          jsonb_build_object('_view_type', 'doc') ||
          CASE
            WHEN item.body IS NOT NULL THEN jsonb_build_object('body', item.body)
            ELSE '{}'::jsonb
          END
        ELSE '{}'::jsonb
      END,
    true,
    false,
    NULL
  FROM public.space_template_items item
  WHERE item.template_id = v_template.id
  ORDER BY item.sort_order, item.id;

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
    v_space_id,
    p_user_id,
    p_org_id,
    automation.name,
    false,
    true,
    automation.trigger,
    automation.actions,
    p_user_id
  FROM public.space_template_automations automation
  WHERE automation.template_id = v_template.id
  ORDER BY automation.sort_order, automation.id;

  RETURN v_space_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_org_member_personal_dashboard(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_org_member_personal_dashboard(UUID, UUID) FROM authenticated;

CREATE OR REPLACE FUNCTION public.provision_org_member_personal_dashboard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM public.ensure_org_member_personal_dashboard(NEW.user_id, NEW.org_id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_org_member_personal_dashboard() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_provision_org_member_personal_dashboard ON public.org_members;
CREATE TRIGGER trg_provision_org_member_personal_dashboard
  AFTER INSERT OR UPDATE OF status ON public.org_members
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.provision_org_member_personal_dashboard();

SELECT public.ensure_org_member_personal_dashboard(om.user_id, om.org_id)
FROM public.org_members om
WHERE om.status = 'active';

UPDATE public.spaces dashboard
SET schema = template.schema || jsonb_build_object(
      'icon', template.icon,
      'icon_color', template.icon_color,
      'personal_dashboard', true
    ),
    updated_at = now()
FROM public.space_templates template
WHERE dashboard.space_kind = 'personal_dashboard'
  AND template.slug = 'personal-dashboard'
  AND dashboard.schema IS DISTINCT FROM (
    template.schema || jsonb_build_object(
      'icon', template.icon,
      'icon_color', template.icon_color,
      'personal_dashboard', true
    )
  );

-- Repair existing dashboards when the legacy source catalog was missing a newer draft flow.
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
  space.id,
  space.user_id,
  space.org_id,
  template_automation.name,
  false,
  true,
  template_automation.trigger,
  template_automation.actions,
  space.user_id
FROM public.spaces space
JOIN public.space_templates template ON template.slug = 'personal-dashboard'
JOIN public.space_template_automations template_automation
  ON template_automation.template_id = template.id
WHERE space.space_kind = 'personal_dashboard'
  AND NOT EXISTS (
    SELECT 1
    FROM public.space_automations existing
    WHERE existing.space_id = space.id
      AND existing.name = template_automation.name
  );

-- A Personal Dashboard cannot be downgraded into a shareable Space or deleted.
CREATE OR REPLACE FUNCTION public.protect_personal_dashboard_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.space_kind = 'personal_dashboard' THEN
    RAISE EXCEPTION 'Personal Dashboards cannot be deleted';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.space_kind = 'personal_dashboard' AND (
    NEW.space_kind IS DISTINCT FROM OLD.space_kind
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.org_id IS DISTINCT FROM OLD.org_id
    OR NEW.visibility IS DISTINCT FROM 'private'
    OR NEW.share_link_enabled IS DISTINCT FROM false
    OR NEW.share_token IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Personal Dashboard ownership and privacy cannot be changed';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_personal_dashboard_space ON public.spaces;
CREATE TRIGGER trg_protect_personal_dashboard_space
  BEFORE UPDATE OR DELETE ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_personal_dashboard_space();

CREATE OR REPLACE FUNCTION public.prevent_personal_dashboard_sharing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.spaces
    WHERE id = NEW.space_id
      AND space_kind = 'personal_dashboard'
  ) THEN
    RAISE EXCEPTION 'Personal Dashboards cannot be shared';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_personal_dashboard_sharing() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_prevent_personal_dashboard_space_shares ON public.space_shares;
CREATE TRIGGER trg_prevent_personal_dashboard_space_shares
  BEFORE INSERT OR UPDATE ON public.space_shares
  FOR EACH ROW EXECUTE FUNCTION public.prevent_personal_dashboard_sharing();

DROP TRIGGER IF EXISTS trg_prevent_personal_dashboard_view_shares ON public.space_view_shares;
CREATE TRIGGER trg_prevent_personal_dashboard_view_shares
  BEFORE INSERT OR UPDATE ON public.space_view_shares
  FOR EACH ROW EXECUTE FUNCTION public.prevent_personal_dashboard_sharing();

DROP TRIGGER IF EXISTS trg_prevent_personal_dashboard_item_shares ON public.space_item_shares;
CREATE TRIGGER trg_prevent_personal_dashboard_item_shares
  BEFORE INSERT OR UPDATE ON public.space_item_shares
  FOR EACH ROW EXECUTE FUNCTION public.prevent_personal_dashboard_sharing();

CREATE OR REPLACE FUNCTION public.protect_personal_dashboard_item_sharing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.spaces
    WHERE id = NEW.space_id
      AND space_kind = 'personal_dashboard'
  ) AND (
    NEW.is_private IS DISTINCT FROM true
    OR NEW.share_link_enabled IS DISTINCT FROM false
    OR NEW.share_token IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Personal Dashboard items cannot be shared';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_personal_dashboard_item_sharing() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_protect_personal_dashboard_item_sharing ON public.space_items;
CREATE TRIGGER trg_protect_personal_dashboard_item_sharing
  BEFORE INSERT OR UPDATE OF is_private, share_link_enabled, share_token, space_id
  ON public.space_items
  FOR EACH ROW EXECUTE FUNCTION public.protect_personal_dashboard_item_sharing();

-- Defense in depth: shared-read policies explicitly exclude Personal Dashboards.
DROP POLICY IF EXISTS "Users can read shared spaces" ON public.spaces;
CREATE POLICY "Users can read shared spaces"
  ON public.spaces FOR SELECT TO public
  USING (
    space_kind <> 'personal_dashboard'
    AND EXISTS (
      SELECT 1
      FROM public.space_shares share
      WHERE share.space_id = public.spaces.id
        AND (
          (share.entity_type = 'user' AND share.entity_id = auth.uid())
          OR (
            share.entity_type = 'org'
            AND public.spaces.org_id IS NOT NULL
            AND share.entity_id = public.spaces.org_id
            AND public.is_org_member(public.spaces.org_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS "space_items_select" ON public.space_items;
CREATE POLICY "space_items_select" ON public.space_items
  AS PERMISSIVE FOR SELECT TO public
  USING (
    ((SELECT auth.uid()) = user_id)
    OR (
      is_private = false
      AND org_id IS NOT NULL
      AND is_org_member(org_id)
      AND EXISTS (
        SELECT 1 FROM public.spaces space
        WHERE space.id = space_items.space_id
          AND space.visibility = 'team'
          AND space.space_kind <> 'personal_dashboard'
      )
    )
    OR (
      is_private = false
      AND EXISTS (
        SELECT 1
        FROM public.space_shares share
        JOIN public.spaces space ON space.id = share.space_id
        WHERE share.space_id = space_items.space_id
          AND space.space_kind <> 'personal_dashboard'
          AND (
            (share.entity_type = 'user' AND share.entity_id = (SELECT auth.uid()))
            OR (
              share.entity_type = 'org'
              AND space_items.org_id IS NOT NULL
              AND share.entity_id = space_items.org_id
              AND is_org_member(space_items.org_id)
            )
          )
      )
    )
    OR (
      is_private = false
      AND EXISTS (
        SELECT 1 FROM public.spaces space
        WHERE space.id = space_items.space_id
          AND space.space_kind <> 'personal_dashboard'
      )
      AND space_view_share_grants_item(space_id, id, 'view')
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.spaces space
        WHERE space.id = space_items.space_id
          AND space.space_kind <> 'personal_dashboard'
      )
      AND has_space_item_share_access(id, space_id, org_id)
    )
  );

DROP POLICY IF EXISTS "Users can read shared space automations" ON public.space_automations;
CREATE POLICY "Users can read shared space automations"
  ON public.space_automations FOR SELECT TO public
  USING (EXISTS (
    SELECT 1
    FROM public.space_shares share
    JOIN public.spaces space ON space.id = share.space_id
    WHERE share.space_id = space_automations.space_id
      AND space.space_kind <> 'personal_dashboard'
      AND (
        (share.entity_type = 'user' AND share.entity_id = auth.uid())
        OR (
          share.entity_type = 'org'
          AND space.org_id IS NOT NULL
          AND share.entity_id = space.org_id
          AND public.is_org_member(space.org_id)
        )
      )
  ));

COMMIT;
