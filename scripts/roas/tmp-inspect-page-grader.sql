SELECT id, status, connection_label, scope_mode, org_id,
       left(coalesce(metadata::text, ''), 200) AS meta_preview,
       connected_at, updated_at
FROM public.user_integrations
WHERE integration_id = 'page_grader'
  AND user_id = '5f2b4597-31c2-4169-aa4e-3ef31523555c'
ORDER BY updated_at DESC
LIMIT 10;

SELECT id, name, provider, is_active
FROM public.integrations_available
WHERE id = 'page_grader' OR provider = 'page_grader'
LIMIT 5;
