import { z } from 'zod'

export const StartWordpressConnectSchema = z.object({
  connection_method: z.enum(['wordpress_com', 'self_hosted']),
  redirectTo: z.string().min(1, 'redirectTo is required'),
  siteUrl: z.string().optional(),
  connection_scope: z.enum(['personal', 'org_shared']).optional(),
})

export const WordpressOAuthCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().min(1, 'state is required'),
  error: z.string().optional(),
  error_description: z.string().optional(),
})

export const WordpressApplicationPasswordCallbackSchema = z.object({
  state: z.string().min(1, 'state is required'),
  site_url: z.string().min(1, 'site_url is required'),
  user_login: z.string().min(1, 'user_login is required'),
  password: z.string().min(1, 'password is required'),
})

export const WordpressListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  per_page: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  status: z.string().optional(),
})

export const WordpressPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  excerpt: z.string().optional(),
  slug: z.string().optional(),
  status: z.enum(['publish', 'future', 'draft', 'pending', 'private']).optional(),
  categories: z.array(z.union([z.number(), z.string()])).optional(),
  tags: z.array(z.union([z.number(), z.string()])).optional(),
  featured_media: z.number().int().positive().optional(),
  featured_image: z.union([z.number().int().positive(), z.string().min(1)]).optional(),
  date: z.string().optional(),
})

export const WordpressTaxonomyCreateSchema = z.object({
  name: z.string().min(1, 'name is required'),
  slug: z.string().optional(),
  description: z.string().optional(),
})

export const WordpressMediaSchema = z
  .object({
    url: z.string().url().optional(),
    content_base64: z.string().optional(),
    filename: z.string().optional(),
    mime_type: z.string().optional(),
    title: z.string().optional(),
    alt_text: z.string().optional(),
  })
  .refine((value) => value.url || value.content_base64, {
    message: 'url or content_base64 is required',
  })

export const WordpressPublishBlogPostSchema = z.object({
  blog_post_id: z.string().uuid('blog_post_id must be a UUID'),
  status: z.enum(['publish', 'future', 'draft', 'pending', 'private']).optional(),
  update_existing: z.boolean().optional(),
})
