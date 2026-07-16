-- Resolve the original chat conversation for a media asset (Show in chat).
CREATE OR REPLACE FUNCTION public.find_media_asset_origin_conversation(p_asset_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.conversation_id
  FROM public.messages m
  WHERE m.content_blocks::text LIKE '%' || p_asset_id::text || '%'
     OR m.metadata::text LIKE '%' || p_asset_id::text || '%'
     OR coalesce(m.content, '') LIKE '%' || p_asset_id::text || '%'
  ORDER BY m.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_media_asset_origin_conversation(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.find_media_asset_origin_conversation(uuid) IS
  'Earliest conversation that references a media asset id in message content/blocks/metadata.';
