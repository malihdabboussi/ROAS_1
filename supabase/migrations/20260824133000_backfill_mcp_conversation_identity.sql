WITH historical_mcp_conversations AS (
  SELECT
    conversation.id,
    client.client_name,
    client.logo_uri,
    row_number() OVER (
      PARTITION BY coalesce(
        nullif(trim(client.client_name), ''),
        conversation.metadata->>'mcp_client_id',
        'unknown'
      )
      ORDER BY conversation.created_at, conversation.id
    ) AS call_number
  FROM public.conversations AS conversation
  LEFT JOIN public.mcp_oauth_clients AS client
    ON conversation.metadata->>'mcp_client_id' = client.client_id
  WHERE conversation.metadata->>'source' = 'mcp'
    AND conversation.title = 'MCP session'
)
UPDATE public.conversations AS conversation
SET
  title = left(
    coalesce(nullif(trim(historical.client_name), ''), 'MCP')
      || ' · MCP call '
      || historical.call_number,
    200
  ),
  metadata = coalesce(conversation.metadata, '{}'::jsonb) || jsonb_strip_nulls(
    jsonb_build_object(
      'mcp_client_name', historical.client_name,
      'mcp_client_logo_uri', historical.logo_uri
    )
  )
FROM historical_mcp_conversations AS historical
WHERE conversation.id = historical.id;
