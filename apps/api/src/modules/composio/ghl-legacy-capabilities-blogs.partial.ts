/**
 * GoHighLevel legacy capabilities: blogs.
 */
import type { GhlLegacyRow } from './ghl-legacy-capabilities.shared.partial'
import { p } from './ghl-legacy-capabilities.shared.partial'

export const GHL_LEGACY_BLOGS_CAPABILITY_ENTRIES: GhlLegacyRow[] = [
  {
    integration_id: 'gohighlevel',
    action_slug: 'list_blogs',
    execution_mode: 'legacy',
    display_name: 'List GHL Blogs',
    description:
      'List blogs for the connected GoHighLevel sub-account (location). Use for content sites and blog management.',
    parameters: p({ blogId: { type: 'string' }, limit: { type: 'number' } }),
    examples: [],
    metadata: {},
    domains: [],
  },
  {
    integration_id: 'gohighlevel',
    action_slug: 'list_blog_posts',
    execution_mode: 'legacy',
    display_name: 'List GHL Blog Posts',
    description: 'List blog posts in GoHighLevel. Filter by blog, pagination, or search.',
    parameters: p({
      blogId: { type: 'string' },
      limit: { type: 'number' },
      offset: { type: 'number' },
    }),
    examples: [],
    metadata: {},
    domains: [],
  },
  {
    integration_id: 'gohighlevel',
    action_slug: 'create_blog_post',
    execution_mode: 'legacy',
    display_name: 'Create GHL Blog Post',
    description: 'Create a new blog post in GoHighLevel (blogs/post.write scope).',
    parameters: p({}),
    examples: [],
    metadata: {},
    domains: [],
  },
  {
    integration_id: 'gohighlevel',
    action_slug: 'update_blog_post',
    execution_mode: 'legacy',
    display_name: 'Update GHL Blog Post',
    description: 'Update an existing blog post by postId (blogs/post-update.write).',
    parameters: p({ postId: { type: 'string', required: true } }),
    examples: [],
    metadata: {},
    domains: [],
  },
  {
    integration_id: 'gohighlevel',
    action_slug: 'check_blog_slug',
    execution_mode: 'legacy',
    display_name: 'Check GHL Blog Slug',
    description:
      'Check if a blog URL slug already exists for the location (blogs/check-slug.readonly).',
    parameters: p({ slug: { type: 'string', required: true } }),
    examples: [],
    metadata: {},
    domains: [],
  },
  {
    integration_id: 'gohighlevel',
    action_slug: 'list_blog_categories',
    execution_mode: 'legacy',
    display_name: 'List GHL Blog Categories',
    description: 'List blog categories for the GoHighLevel location.',
    parameters: p({}),
    examples: [],
    metadata: {},
    domains: [],
  },
  {
    integration_id: 'gohighlevel',
    action_slug: 'list_blog_authors',
    execution_mode: 'legacy',
    display_name: 'List GHL Blog Authors',
    description: 'List blog authors for the GoHighLevel location.',
    parameters: p({}),
    examples: [],
    metadata: {},
    domains: [],
  },
]
