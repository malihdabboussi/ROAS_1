import { backendGet, backendPatch } from '@/lib/api/backend-client'

export type FacebookManagedPage = {
  id: string
  name: string
}

export type LinkedInAdministeredOrganization = {
  urn: string
  name: string
  role?: string
}

export type YoutubeAuthenticatedChannel = {
  id: string
  name: string
  handle?: string
}

export async function fetchFacebookPages(userIntegrationId: string): Promise<{
  success: boolean
  pages: FacebookManagedPage[]
  error?: string
  hint?: string
}> {
  const params = new URLSearchParams({ user_integration_id: userIntegrationId })
  const res = await backendGet<{
    success: boolean
    pages?: FacebookManagedPage[]
    error?: string
    hint?: string
  }>(`/api/integrations/facebook/pages?${params.toString()}`)
  return {
    success: Boolean(res?.success),
    pages: res?.pages ?? [],
    error: res?.error,
    hint: res?.hint,
  }
}

export async function saveFacebookPage(input: {
  user_integration_id: string
  page_id: string
  page_name: string
}): Promise<{ success: boolean; error?: string }> {
  const res = await backendPatch<{ success: boolean; error?: string }>(
    '/api/integrations/facebook/page',
    input,
  )
  return { success: Boolean(res?.success), error: res?.error }
}

export async function fetchLinkedInCompanyPages(userIntegrationId: string): Promise<{
  success: boolean
  organizations: LinkedInAdministeredOrganization[]
  error?: string
  hint?: string
}> {
  const params = new URLSearchParams({ user_integration_id: userIntegrationId })
  const res = await backendGet<{
    success: boolean
    organizations?: LinkedInAdministeredOrganization[]
    error?: string
    hint?: string
  }>(`/api/integrations/linkedin/company-pages?${params.toString()}`)
  return {
    success: Boolean(res?.success),
    organizations: res?.organizations ?? [],
    error: res?.error,
    hint: res?.hint,
  }
}

export async function saveLinkedInCompanyPage(input: {
  user_integration_id: string
  organization_urn: string
  organization_name: string
}): Promise<{ success: boolean; error?: string }> {
  const res = await backendPatch<{
    success: boolean
    error?: string
  }>('/api/integrations/linkedin/company-page', input)
  return { success: Boolean(res?.success), error: res?.error }
}

export async function fetchYoutubeChannels(userIntegrationId: string): Promise<{
  success: boolean
  channels: YoutubeAuthenticatedChannel[]
  error?: string
  hint?: string
}> {
  const params = new URLSearchParams({ user_integration_id: userIntegrationId })
  const res = await backendGet<{
    success: boolean
    channels?: YoutubeAuthenticatedChannel[]
    error?: string
    hint?: string
  }>(`/api/integrations/youtube/channels?${params.toString()}`)
  return {
    success: Boolean(res?.success),
    channels: res?.channels ?? [],
    error: res?.error,
    hint: res?.hint,
  }
}

export async function saveYoutubeChannel(input: {
  user_integration_id: string
  channel_id: string
  channel_name: string
}): Promise<{ success: boolean; error?: string }> {
  const res = await backendPatch<{ success: boolean; error?: string }>(
    '/api/integrations/youtube/channel',
    input,
  )
  return { success: Boolean(res?.success), error: res?.error }
}
