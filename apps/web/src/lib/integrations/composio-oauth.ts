export const INTEGRATION_OAUTH_CHANNEL = 'vibey-integration-oauth'
export const INTEGRATION_OAUTH_STORAGE_KEY = 'vibey-integration-oauth-event'

export type IntegrationOAuthEvent =
  | { type: 'connected'; integrationId: string }
  | { type: 'error'; integrationId: string | null; message: string }

export function buildComposioOAuthBridgeUrl(finalRedirectTo?: string): string {
  if (typeof window === 'undefined') return ''
  const redirectTo = finalRedirectTo || window.location.href
  return `${window.location.origin}/integrations/connected?redirect_to=${encodeURIComponent(redirectTo)}`
}

export function buildComposioProxyCallbackUrl(
  integrationId: string,
  finalRedirectTo?: string,
): string {
  const bridgeUrl = buildComposioOAuthBridgeUrl(finalRedirectTo)
  return `${window.location.origin}/api/proxy/integrations/composio/callback?redirect_to=${encodeURIComponent(bridgeUrl)}&integration_id=${encodeURIComponent(integrationId)}`
}

export function broadcastIntegrationOAuthEvent(event: IntegrationOAuthEvent): void {
  if (typeof window === 'undefined') return

  try {
    const channel = new BroadcastChannel(INTEGRATION_OAUTH_CHANNEL)
    channel.postMessage(event)
    channel.close()
  } catch {
    // BroadcastChannel unavailable — storage fallback below.
  }

  try {
    localStorage.setItem(
      INTEGRATION_OAUTH_STORAGE_KEY,
      JSON.stringify({ ...event, ts: Date.now() }),
    )
  } catch {
    // Ignore quota / private mode errors.
  }
}

export function subscribeIntegrationOAuthEvents(
  handler: (event: IntegrationOAuthEvent) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined

  let channel: BroadcastChannel | null = null
  try {
    channel = new BroadcastChannel(INTEGRATION_OAUTH_CHANNEL)
    channel.onmessage = (message) => {
      const data = message.data as IntegrationOAuthEvent | undefined
      if (data?.type === 'connected' || data?.type === 'error') handler(data)
    }
  } catch {
    channel = null
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== INTEGRATION_OAUTH_STORAGE_KEY || !event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue) as IntegrationOAuthEvent & { ts?: number }
      if (parsed.type === 'connected' || parsed.type === 'error') handler(parsed)
    } catch {
      // Ignore malformed payloads.
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    channel?.close()
    window.removeEventListener('storage', onStorage)
  }
}
