import { backendPost } from '@/lib/api/backend-client'

type OpenAICodexConnectResponse = {
  success: boolean
  authorizeUrl?: string
}

export async function startOpenAICodexOAuth(redirectTo?: string): Promise<boolean> {
  const finalRedirectTo = redirectTo ?? (typeof window !== 'undefined' ? window.location.href : '')
  const res = await backendPost<OpenAICodexConnectResponse>(
    '/api/integrations/openai-codex/connect',
    { redirectTo: finalRedirectTo },
  )
  if (!res?.authorizeUrl) return false
  window.open(res.authorizeUrl, '_blank', 'noopener,noreferrer')
  return true
}
