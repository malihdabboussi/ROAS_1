import { backendPost } from '@/lib/api/backend-client'
import { buildComposioProxyCallbackUrl } from './composio-oauth'

export type ConnectComposioResult =
  | { status: 'oauth_opened' }
  | { status: 'already_connected' }

/**
 * Start Composio OAuth for an integration (popup). Used when a feature needs
 * a connection mid-flow (e.g. Open in Canva) instead of only linking Settings.
 *
 * When Composio already has a reusable account, the API returns success with
 * `redirect_url: null` + `reused: true` — that is "already connected", not a failure.
 */
export async function connectComposioIntegration(
  integrationId: string,
  options?: { forceNew?: boolean },
): Promise<ConnectComposioResult> {
  const id = integrationId.trim().toLowerCase()
  if (!id) throw new Error('integration_id is required')

  const redirectTo = typeof window !== 'undefined' ? window.location.href : ''
  const callbackUrl =
    typeof window !== 'undefined' ? buildComposioProxyCallbackUrl(id, redirectTo) : ''

  const res = await postConnect(id, callbackUrl || redirectTo, Boolean(options?.forceNew))
  if (!res?.success) throw new Error(res?.error || 'Failed to start connection')

  const redirectUrl = readRedirectUrl(res)
  if (redirectUrl) {
    openAuthorizeUrl(redirectUrl)
    return { status: 'oauth_opened' }
  }

  // Settings treats missing redirect as synchronous success (reuse / already linked).
  if (res.reused === true || isConnectedStatus(res.status)) {
    return { status: 'already_connected' }
  }

  // Stale pending row with no authorize URL — force a fresh OAuth link.
  const forced = await postConnect(id, callbackUrl || redirectTo, true)
  if (!forced?.success) throw new Error(forced?.error || 'Failed to start connection')

  const forcedRedirect = readRedirectUrl(forced)
  if (forcedRedirect) {
    openAuthorizeUrl(forcedRedirect)
    return { status: 'oauth_opened' }
  }

  if (forced.reused === true || isConnectedStatus(forced.status)) {
    return { status: 'already_connected' }
  }

  throw new Error('No authorization URL was returned. Open Settings → Integrations to connect.')
}

type ConnectResponse = {
  success: boolean
  redirect_url?: string | null
  reused?: boolean
  status?: string | null
  error?: string
}

async function postConnect(
  integrationId: string,
  callbackUrl: string,
  forceNew: boolean,
): Promise<ConnectResponse> {
  return backendPost<ConnectResponse>('/api/integrations/composio/connect', {
    integration_id: integrationId,
    callback_url: callbackUrl,
    long_redirect_url: true,
    ...(forceNew ? { force_new: true } : {}),
  })
}

function readRedirectUrl(res: ConnectResponse): string | null {
  return typeof res.redirect_url === 'string' && res.redirect_url.trim().length > 0
    ? res.redirect_url.trim()
    : null
}

function isConnectedStatus(status: unknown): boolean {
  return typeof status === 'string' && status.trim().toLowerCase() === 'connected'
}

function openAuthorizeUrl(redirectUrl: string): void {
  const opened = window.open(redirectUrl, '_blank', 'noopener,noreferrer')
  if (!opened) {
    // Async click handlers often get popup-blocked; fall back to same-tab navigate.
    window.location.assign(redirectUrl)
  }
}
