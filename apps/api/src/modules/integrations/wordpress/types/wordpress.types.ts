export type WordpressConnectionMethod = 'wordpress_com' | 'self_hosted'

export type WordpressConnectionSecret =
  | {
      method: 'wordpress_com'
      accessToken: string
      tokenType?: string
      scope?: string
      blogId?: string
      blogUrl?: string
    }
  | {
      method: 'self_hosted'
      username: string
      applicationPassword: string
    }

export type WordpressConnectionMetadata = {
  connection_method: WordpressConnectionMethod
  site_url: string
  site_id?: string
  site_name?: string
  username?: string
  rest_url?: string
  vault_secret_label: string
  wordpress_post_id?: number
  wordpress_post_url?: string
  wordpress_synced_at?: string
}

export type WordpressUserIntegration = {
  id: string
  user_id: string
  integration_id: string
  provider: string
  status: 'pending' | 'connected' | 'error' | 'disconnected'
  connected_at: string | null
  metadata: WordpressConnectionMetadata | null
  connection_label: string | null
  scope_mode?: 'personal' | 'org_shared' | null
  is_default?: boolean | null
}

export type WordpressSiteInfo = {
  id?: string | number
  name?: string
  title?: string
  description?: string
  url?: string
  site_url?: string
  home?: string
}

export type WordpressPostPayload = {
  title?: string
  content?: string
  excerpt?: string
  slug?: string
  status?: 'publish' | 'future' | 'draft' | 'pending' | 'private'
  categories?: Array<number | string>
  tags?: Array<number | string>
  featured_media?: number
  featured_image?: number | string
  date?: string
}

export type WordpressMediaPayload = {
  url?: string
  content_base64?: string
  filename?: string
  mime_type?: string
  title?: string
  alt_text?: string
}
