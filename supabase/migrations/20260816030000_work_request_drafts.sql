BEGIN;

CREATE TABLE public.work_request_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  campaign_space_id uuid REFERENCES public.spaces(id) ON DELETE SET NULL,
  page_grader_external_client_id text NOT NULL CHECK (
    char_length(page_grader_external_client_id) BETWEEN 1 AND 255
  ),
  page_grader_external_campaign_id text CHECK (
    page_grader_external_campaign_id IS NULL
    OR char_length(page_grader_external_campaign_id) BETWEEN 1 AND 255
  ),
  request_type text NOT NULL CHECK (
    request_type IN ('design', 'copy', 'funnel', 'ghl', 'ad', 'video', 'other', 'general')
  ),
  assignee_name text CHECK (assignee_name IS NULL OR char_length(assignee_name) <= 300),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 1000),
  description text CHECK (description IS NULL OR char_length(description) <= 20000),
  due_at timestamptz,
  priority text NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  structured_fields jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(structured_fields) = 'object'
  ),
  required_fields text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    cardinality(required_fields) <= 50
  ),
  missing_fields text[] NOT NULL DEFAULT '{}'::text[] CHECK (
    cardinality(missing_fields) <= 50
  ),
  assets jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(assets) = 'array' AND jsonb_array_length(assets) <= 25
  ),
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (
    jsonb_typeof(dependencies) = 'array' AND jsonb_array_length(dependencies) <= 25
  ),
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(provenance) = 'object'),
  routing jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(routing) = 'object'),
  requester_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(requester_metadata) = 'object'
  ),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'finalized', 'revoked', 'expired')
  ),
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 255),
  review_token_hash text NOT NULL UNIQUE CHECK (
    review_token_hash ~ '^[0-9a-f]{64}$'
  ),
  review_token_issued_at timestamptz NOT NULL DEFAULT now(),
  review_token_expires_at timestamptz NOT NULL,
  review_token_revoked_at timestamptz,
  review_token_used_at timestamptz,
  review_token_reissued_at timestamptz,
  review_token_version integer NOT NULL DEFAULT 1 CHECK (review_token_version > 0),
  token_refresh_idempotency_key text CHECK (
    token_refresh_idempotency_key IS NULL OR char_length(token_refresh_idempotency_key) <= 255
  ),
  reminder_3h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  final_space_item_id uuid UNIQUE REFERENCES public.space_items(id) ON DELETE RESTRICT,
  finalized_at timestamptz,
  page_grader_receipt jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(page_grader_receipt) = 'object'
  ),
  clickup_receipt jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (
    jsonb_typeof(clickup_receipt) = 'object'
  ),
  sync_status text NOT NULL DEFAULT 'not_started' CHECK (
    sync_status IN ('not_started', 'sync_pending', 'synced', 'sync_failed')
  ),
  sync_attempt_count integer NOT NULL DEFAULT 0 CHECK (sync_attempt_count >= 0),
  last_sync_attempt_at timestamptz,
  next_retry_at timestamptz,
  last_error text CHECK (last_error IS NULL OR char_length(last_error) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_request_drafts_expiry_after_issue CHECK (
    review_token_expires_at > review_token_issued_at
  ),
  CONSTRAINT work_request_drafts_finalized_identity CHECK (
    (
      status = 'finalized'
      AND final_space_item_id IS NOT NULL
      AND review_token_used_at IS NOT NULL
      AND finalized_at IS NOT NULL
    )
    OR status <> 'finalized'
  )
);

CREATE UNIQUE INDEX idx_work_request_drafts_idempotency
  ON public.work_request_drafts (
    owner_user_id,
    page_grader_external_client_id,
    idempotency_key
  );
CREATE INDEX idx_work_request_drafts_owner_status
  ON public.work_request_drafts (owner_user_id, owner_org_id, status, created_at DESC);
CREATE INDEX idx_work_request_drafts_campaign_status
  ON public.work_request_drafts (campaign_id, campaign_space_id, status);
CREATE INDEX idx_work_request_drafts_due_3h
  ON public.work_request_drafts (review_token_issued_at)
  WHERE status = 'draft' AND reminder_3h_sent_at IS NULL;
CREATE INDEX idx_work_request_drafts_due_1h
  ON public.work_request_drafts (review_token_expires_at)
  WHERE status = 'draft' AND reminder_1h_sent_at IS NULL;
CREATE INDEX idx_work_request_drafts_sync_retry
  ON public.work_request_drafts (next_retry_at)
  WHERE sync_status IN ('sync_pending', 'sync_failed');

ALTER TABLE public.work_request_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.work_request_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.work_request_drafts TO service_role;

CREATE TRIGGER set_updated_at_work_request_drafts
  BEFORE UPDATE ON public.work_request_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.finalize_work_request_draft(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_draft public.work_request_drafts%ROWTYPE;
  v_space public.spaces%ROWTYPE;
  v_space_id uuid;
  v_space_role text;
  v_external_campaign_id text;
  v_work_scope text;
  v_item public.space_items%ROWTYPE;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_INVALID_TOKEN';
  END IF;

  SELECT *
  INTO v_draft
  FROM public.work_request_drafts
  WHERE review_token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_INVALID_TOKEN';
  END IF;

  IF v_draft.status = 'finalized' AND v_draft.final_space_item_id IS NOT NULL THEN
    SELECT * INTO v_item
    FROM public.space_items
    WHERE id = v_draft.final_space_item_id;
    RETURN jsonb_build_object('draft', to_jsonb(v_draft), 'task', to_jsonb(v_item));
  END IF;

  IF v_draft.status = 'revoked' OR v_draft.review_token_revoked_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_REVOKED';
  END IF;
  IF v_draft.status = 'expired' OR v_draft.review_token_expires_at <= now() THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_EXPIRED';
  END IF;
  IF v_draft.status <> 'draft' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_NOT_FINALIZABLE';
  END IF;
  IF cardinality(v_draft.missing_fields) > 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_MISSING_CONTEXT';
  END IF;

  v_work_scope := COALESCE(v_draft.routing->>'work_scope', 'general');
  IF v_work_scope = 'campaign' THEN
    v_space_id := v_draft.campaign_space_id;
  ELSE
    BEGIN
      v_space_id := NULLIF(v_draft.routing->>'general_space_id', '')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_space_id := NULL;
    END;
  END IF;

  IF v_space_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_SPACE_REQUIRED';
  END IF;

  SELECT *
  INTO v_space
  FROM public.spaces
  WHERE id = v_space_id
    AND campaign_id = v_draft.campaign_id
    AND (
      (v_draft.owner_org_id IS NOT NULL AND org_id = v_draft.owner_org_id)
      OR (
        v_draft.owner_org_id IS NULL
        AND org_id IS NULL
        AND user_id = v_draft.owner_user_id
      )
    )
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_INVALID_SPACE';
  END IF;

  v_space_role := v_space.schema #>> '{custom_data,space_role}';
  v_external_campaign_id := v_space.schema #>> '{custom_data,page_grader_campaign_id}';
  IF v_work_scope = 'campaign' THEN
    IF v_space_role <> 'client_campaign'
      OR v_draft.page_grader_external_campaign_id IS NULL
      OR v_external_campaign_id IS DISTINCT FROM v_draft.page_grader_external_campaign_id THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_INVALID_CAMPAIGN_SPACE';
    END IF;
  ELSIF v_space_role <> 'general'
    OR (v_space.schema #>> '{custom_data,page_grader_client_id}')
      IS DISTINCT FROM v_draft.page_grader_external_client_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'WORK_REQUEST_INVALID_GENERAL_SPACE';
  END IF;

  INSERT INTO public.space_items (
    space_id,
    org_id,
    user_id,
    title,
    status,
    priority,
    due_date,
    description,
    notes,
    source,
    sort_order,
    custom_data
  )
  VALUES (
    v_space_id,
    v_draft.owner_org_id,
    v_draft.owner_user_id,
    v_draft.title,
    'todo',
    v_draft.priority,
    v_draft.due_at,
    v_draft.description,
    v_draft.description,
    'agent',
    0,
    jsonb_build_object(
      'work_request',
      jsonb_build_object(
        'draft_id', v_draft.id,
        'request_type', v_draft.request_type,
        'assignee_name', v_draft.assignee_name,
        'structured_fields', v_draft.structured_fields,
        'assets', v_draft.assets,
        'dependencies', v_draft.dependencies,
        'provenance', v_draft.provenance,
        'requester', v_draft.requester_metadata,
        'page_grader_external_client_id', v_draft.page_grader_external_client_id,
        'page_grader_external_campaign_id', v_draft.page_grader_external_campaign_id
      )
    )
  )
  RETURNING * INTO v_item;

  UPDATE public.work_request_drafts
  SET status = 'finalized',
      final_space_item_id = v_item.id,
      review_token_used_at = now(),
      finalized_at = now(),
      sync_status = 'sync_pending',
      next_retry_at = now(),
      last_error = NULL
  WHERE id = v_draft.id
  RETURNING * INTO v_draft;

  RETURN jsonb_build_object('draft', to_jsonb(v_draft), 'task', to_jsonb(v_item));
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_work_request_draft(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_work_request_draft(text) TO service_role;

COMMENT ON TABLE public.work_request_drafts IS
  'Canonical ROAS Service Request drafts. Public review tokens are stored only as SHA-256 digests; Page Grader is an onboarding and ClickUp mirror adapter.';
COMMENT ON FUNCTION public.finalize_work_request_draft(text) IS
  'Service-role-only exactly-once transition from a valid Service Request draft to one canonical native Space task.';

UPDATE public.agent_skills
SET markdown_content = markdown_content || $guidance$

14. A successful Service Request intake result is a draft review link, not an
    active task. Tell the user the request is ready for review. Never claim a
    ROAS task or ClickUp task exists until finalization returns the native task
    identity and the Page Grader receipt confirms the ClickUp mirror.
$guidance$,
    updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%successful Service Request intake result is a draft review link%';

COMMIT;
