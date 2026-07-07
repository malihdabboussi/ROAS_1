-- WordPress native integration: WordPress.com OAuth + self-hosted Application Passwords.
-- Embeddings are intentionally null here; run /api/integrations/capabilities/sync
-- with {"only":["wordpress"],"force":true} after deploy.

insert into public.integrations_available (id, provider, name, description, auth_type, is_available, metadata)
values (
  'wordpress',
  'wordpress',
  'WordPress',
  'Connect WordPress.com, Jetpack-connected, or self-hosted WordPress sites to publish posts, pages, media, categories, and tags.',
  'oauth2',
  true,
  jsonb_build_object(
    'category', 'productivity',
    'website', 'https://wordpress.org',
    'connection_methods', jsonb_build_array('wordpress_com_oauth', 'self_hosted_application_passwords')
  )
)
on conflict (id) do update set
  provider = excluded.provider,
  name = excluded.name,
  description = excluded.description,
  auth_type = excluded.auth_type,
  is_available = excluded.is_available,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.project_composio_toolkit_config (
  integration_id,
  toolkit_slug,
  auth_config_id,
  auth_mode,
  enabled,
  metadata
)
values (
  'wordpress',
  'wordpress',
  null,
  'custom',
  true,
  jsonb_build_object('execution_mode', 'legacy')
)
on conflict (integration_id) do update set
  toolkit_slug = excluded.toolkit_slug,
  auth_config_id = excluded.auth_config_id,
  auth_mode = excluded.auth_mode,
  enabled = excluded.enabled,
  metadata = excluded.metadata,
  updated_at = now();

with capabilities as (
  select *
  from jsonb_to_recordset(
    $json$
    [
      {
        "action_slug": "list_posts",
        "display_name": "List WordPress Posts",
        "description": "List WordPress posts from the connected WordPress.com, Jetpack, or self-hosted WordPress site. Supports pagination, status, and search filters.",
        "parameters": {"page":{"type":"number"},"per_page":{"type":"number"},"search":{"type":"string"},"status":{"type":"string"}},
        "route_config": {"method":"GET","path":"/api/integrations/wordpress/posts","query_remainder":true}
      },
      {
        "action_slug": "create_post",
        "display_name": "Create WordPress Post",
        "description": "Create a WordPress post with title, HTML content, excerpt, slug, category IDs, tag IDs, featured media, and draft or publish status.",
        "parameters": {"title":{"type":"string"},"content":{"type":"string"},"excerpt":{"type":"string"},"slug":{"type":"string"},"status":{"type":"string"},"categories":{"type":"array"},"tags":{"type":"array"},"featured_media":{"type":"number"}},
        "route_config": {"method":"POST","path":"/api/integrations/wordpress/posts"}
      },
      {
        "action_slug": "update_post",
        "display_name": "Update WordPress Post",
        "description": "Update an existing WordPress post by post ID without creating a duplicate. Use this for editing drafts or republishing changed content.",
        "parameters": {"postId":{"type":"string","required":true},"title":{"type":"string"},"content":{"type":"string"},"excerpt":{"type":"string"},"slug":{"type":"string"},"status":{"type":"string"},"categories":{"type":"array"},"tags":{"type":"array"},"featured_media":{"type":"number"}},
        "route_config": {"method":"PATCH","path":"/api/integrations/wordpress/posts/:postId"}
      },
      {
        "action_slug": "publish_blog_post",
        "display_name": "Publish Vibey Blog Post to WordPress",
        "description": "Publish a Vibey blog_posts row to the connected WordPress site, then write wordpress_post_id, wordpress_post_url, and wordpress_synced_at back to blog_posts.metadata.",
        "parameters": {"blog_post_id":{"type":"string","required":true},"status":{"type":"string"},"update_existing":{"type":"boolean"}},
        "route_config": {"method":"POST","path":"/api/integrations/wordpress/posts/publish-blog-post"}
      },
      {
        "action_slug": "list_pages",
        "display_name": "List WordPress Pages",
        "description": "List WordPress pages from the connected site with pagination and search filters.",
        "parameters": {"page":{"type":"number"},"per_page":{"type":"number"},"search":{"type":"string"},"status":{"type":"string"}},
        "route_config": {"method":"GET","path":"/api/integrations/wordpress/pages","query_remainder":true}
      },
      {
        "action_slug": "create_page",
        "display_name": "Create WordPress Page",
        "description": "Create a WordPress page on the connected site with title, HTML content, slug, and status.",
        "parameters": {"title":{"type":"string"},"content":{"type":"string"},"slug":{"type":"string"},"status":{"type":"string"}},
        "route_config": {"method":"POST","path":"/api/integrations/wordpress/pages"}
      },
      {
        "action_slug": "update_page",
        "display_name": "Update WordPress Page",
        "description": "Update an existing WordPress page by page ID.",
        "parameters": {"pageId":{"type":"string","required":true},"title":{"type":"string"},"content":{"type":"string"},"slug":{"type":"string"},"status":{"type":"string"}},
        "route_config": {"method":"PATCH","path":"/api/integrations/wordpress/pages/:pageId"}
      },
      {
        "action_slug": "upload_media",
        "display_name": "Upload WordPress Media",
        "description": "Upload media to the connected WordPress site from an HTTPS URL or base64 payload, returning the WordPress media item for use as featured media.",
        "parameters": {"url":{"type":"string"},"content_base64":{"type":"string"},"filename":{"type":"string"},"mime_type":{"type":"string"},"title":{"type":"string"},"alt_text":{"type":"string"}},
        "route_config": {"method":"POST","path":"/api/integrations/wordpress/media"}
      },
      {
        "action_slug": "list_categories",
        "display_name": "List WordPress Categories",
        "description": "List post categories from the connected WordPress site.",
        "parameters": {"page":{"type":"number"},"per_page":{"type":"number"},"search":{"type":"string"}},
        "route_config": {"method":"GET","path":"/api/integrations/wordpress/categories","query_remainder":true}
      },
      {
        "action_slug": "create_category",
        "display_name": "Create WordPress Category",
        "description": "Create a WordPress post category with name, slug, and description.",
        "parameters": {"name":{"type":"string","required":true},"slug":{"type":"string"},"description":{"type":"string"}},
        "route_config": {"method":"POST","path":"/api/integrations/wordpress/categories"}
      },
      {
        "action_slug": "list_tags",
        "display_name": "List WordPress Tags",
        "description": "List post tags from the connected WordPress site.",
        "parameters": {"page":{"type":"number"},"per_page":{"type":"number"},"search":{"type":"string"}},
        "route_config": {"method":"GET","path":"/api/integrations/wordpress/tags","query_remainder":true}
      },
      {
        "action_slug": "create_tag",
        "display_name": "Create WordPress Tag",
        "description": "Create a WordPress post tag with name, slug, and description.",
        "parameters": {"name":{"type":"string","required":true},"slug":{"type":"string"},"description":{"type":"string"}},
        "route_config": {"method":"POST","path":"/api/integrations/wordpress/tags"}
      },
      {
        "action_slug": "get_site_info",
        "display_name": "Get WordPress Site Info",
        "description": "Get metadata for the connected WordPress site, including name, description, URL, and REST API details when available.",
        "parameters": {},
        "route_config": {"method":"GET","path":"/api/integrations/wordpress/site"}
      }
    ]
    $json$::jsonb
  ) as c(action_slug text, display_name text, description text, parameters jsonb, route_config jsonb)
)
insert into public.integration_capabilities (
  integration_id,
  action_slug,
  execution_mode,
  display_name,
  description,
  parameters,
  examples,
  metadata,
  domains,
  route_config,
  updated_at
)
select
  'wordpress',
  action_slug,
  'legacy',
  display_name,
  description,
  parameters,
  '[]'::jsonb,
  '{}'::jsonb,
  array['marketing', 'shared']::text[],
  route_config,
  now()
from capabilities
on conflict (integration_id, action_slug) do update set
  execution_mode = excluded.execution_mode,
  display_name = excluded.display_name,
  description = excluded.description,
  parameters = excluded.parameters,
  examples = excluded.examples,
  metadata = excluded.metadata,
  domains = excluded.domains,
  route_config = excluded.route_config,
  updated_at = now();
