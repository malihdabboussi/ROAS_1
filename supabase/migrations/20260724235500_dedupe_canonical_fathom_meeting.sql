DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.space_items
    WHERE id = 'c72dfd7d-eef5-4e1a-9728-b2da7c10bd59'::uuid
      AND space_id = '71d2f284-78c5-4495-83d1-058dc285f094'::uuid
      AND org_id = 'f69bd799-3509-41b4-aaef-98f03c48c295'::uuid
      AND custom_data #>> '{external_automation,meeting_id}' = '166805850'
  ) THEN
    DELETE FROM public.space_items
    WHERE id = '01b58c7c-c2a6-467e-9de6-c31a05706204'::uuid
      AND space_id = 'd957d348-c30a-4dbb-a089-ba3092332543'::uuid
      AND org_id IS NULL
      AND custom_data #>> '{external_automation,meeting_id}' = '166805850';
  END IF;
END
$$;
