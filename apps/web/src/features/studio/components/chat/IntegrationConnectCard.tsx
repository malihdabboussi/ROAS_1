'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, Loader2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import type { IntegrationDoctor, IntegrationRepairAction } from '../../types'

interface IntegrationConnectCardProps {
  provider: string
  title: string
  description: string
  status?:
    | 'disconnected'
    | 'needs_reconnect'
    | 'missing_scope'
    | 'access_denied'
    | 'fallback_available'
  problem?: string
  primaryAction?: IntegrationRepairAction
  secondaryActions?: IntegrationRepairAction[]
  doctor?: IntegrationDoctor
  onSendInstruction?: (content: string) => void
}

const LOGO_MAP: Record<string, string> = {
  gohighlevel: '/Integrations/GHL.png',
  stripe: '/Integrations/Stripe.png',
  github: '/Integrations/GitHub.png',
  meta: '/Integrations/Meta.png',
  facebook: '/Integrations/Facebook.png',
  google_drive: '/Integrations/GoogleDrive.png',
  calendly: '/Integrations/Calendly.png',
  dropbox: '/Integrations/Dropbox.png',
  fathom: '/Integrations/Fathom.png',
  fireflies: '/Integrations/Fireflies.png',
  slack: '/Integrations/Slack.png',
  linkedin: '/Integrations/LinkedIn.png',
  instagram: '/Integrations/Instagram.png',
  twitter: '/Integrations/Twitter.png',
  youtube: '/Integrations/YouTube.png',
  tiktok: '/Integrations/TikTok.png',
  google_analytics: '/Integrations/GoogleAnalytics.png',
  google_calendar: '/Integrations/GoogleCalendar.png',
  gmail: '/Integrations/Gmail.png',
  outlook: '/Integrations/Outlook.png',
  clickup: '/Integrations/ClickUp.png',
  notion: '/Integrations/Notion.png',
  reddit: '/Integrations/Reddit.png',
  mailchimp: '/Integrations/Mailchimp.png',
  kit: '/Integrations/Kit.png',
  hubspot: '/Integrations/HubSpot.png',
  salesforce: '/Integrations/Salesforce.png',
  zoom: '/Integrations/Zoom.png',
  google_ads: '/Integrations/GoogleAds.png',
  google_search_console: '/Integrations/GoogleSearchConsole.png',
  google_sheets: '/Integrations/GoogleSheets.png',
  google_docs: '/Integrations/GoogleDocs.png',
  canva: '/Integrations/Canva.png',
  vercel: '/Integrations/Vercel.png',
  active_campaign: '/Integrations/ActiveCampaign.png',
  whop: '/Integrations/Whop.png',
}

const LEGACY_CONNECT_ENDPOINTS: Record<string, string> = {
  meta: '/api/integrations/meta/connect',
  stripe: '/api/integrations/stripe/connect',
  dropbox: '/api/integrations/dropbox/connect',
  calendly: '/api/integrations/calendly/connect',
  gohighlevel: '/api/integrations/lhg/connect',
  fathom: '/api/integrations/fathom/connect',
  paypal: '/api/integrations/paypal/connect',
  supabase: '/api/integrations/supabase/connect',
}

const API_KEY_PROVIDERS = new Set(['active_campaign', 'whop', 'fireflies', 'fanbasis', 'vercel'])

/** Backend / DB use `active_campaign`; agents may emit `activecampaign` or `active-campaign`. */
function resolveIntegrationId(raw: string): string {
  const p = raw.trim().toLowerCase()
  if (p === 'activecampaign' || p === 'active-campaign') return 'active_campaign'
  return p
}

const DISPLAY_NAMES: Record<string, string> = {
  gohighlevel: 'GoHighLevel',
  google_drive: 'Google Drive',
  google_analytics: 'Google Analytics',
  google_calendar: 'Google Calendar',
  outlook: 'Microsoft Outlook',
  meta: 'Meta',
  github: 'GitHub',
  tiktok: 'TikTok',
  clickup: 'ClickUp',
  hubspot: 'HubSpot',
  kit: 'Kit',
  google_ads: 'Google Ads',
  google_search_console: 'Google Search Console',
  google_sheets: 'Google Sheets',
  google_docs: 'Google Docs',
  active_campaign: 'ActiveCampaign',
}

function getDisplayName(provider: string): string {
  return DISPLAY_NAMES[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1)
}

export function IntegrationConnectCard({
  provider,
  title,
  description,
  status = 'disconnected',
  problem,
  primaryAction,
  secondaryActions = [],
  doctor,
  onSendInstruction,
}: IntegrationConnectCardProps) {
  const integrationId = resolveIntegrationId(provider)
  const needsConnectionApproval = primaryAction?.type === 'use_connection'
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(!needsConnectionApproval)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (needsConnectionApproval) {
      setChecking(false)
      setConnected(false)
      return
    }

    const url = new URL(window.location.href)
    const fromCallback =
      url.searchParams.get(`${integrationId}_connected`) === '1' ||
      (url.searchParams.get('composio_connected') === '1' &&
        url.searchParams.get('integration') === integrationId)

    if (fromCallback) {
      url.searchParams.delete(`${integrationId}_connected`)
      url.searchParams.delete('composio_connected')
      url.searchParams.delete('integration')
      window.history.replaceState({}, '', url.toString())
    }

    void checkStatus(fromCallback)
  }, [integrationId, needsConnectionApproval])

  const checkStatus = async (showToastOnConnected = false): Promise<boolean> => {
    setChecking(true)
    try {
      const res = await backendGet<{
        success: boolean
        connected: boolean
        execution_mode: string
        status?: string | null
      }>(`/api/integrations/status/${encodeURIComponent(integrationId)}`)
      const isConnected = !!res?.connected
      setConnected(isConnected)
      if (isConnected && showToastOnConnected) {
        toast.success(`${getDisplayName(integrationId)} connected.`)
      }
      return isConnected
    } catch {
      setConnected(false)
      return false
    } finally {
      setChecking(false)
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (API_KEY_PROVIDERS.has(integrationId)) {
      window.dispatchEvent(new CustomEvent('open-account-settings', { detail: 'integrations' }))
      return
    }

    setLoading(true)
    try {
      const redirectTo = typeof window !== 'undefined' ? window.location.href : ''

      if (integrationId === 'slack') {
        const returnTo =
          typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : ''
        const qs = new URLSearchParams({ agent_key: 'default' })
        if (returnTo) qs.set('return_to', returnTo)
        const res = await backendGet<{ url: string }>(`/api/slack/install?${qs.toString()}`)
        if (res?.url) {
          window.location.href = res.url
          return
        }
      }

      const statusRes = await backendGet<{
        success: boolean
        connected: boolean
        execution_mode: string
      }>(`/api/integrations/status/${encodeURIComponent(integrationId)}`)

      const mode = statusRes?.execution_mode ?? 'legacy'

      if (mode === 'composio') {
        const callbackUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}/api/proxy/integrations/composio/callback?redirect_to=${encodeURIComponent(redirectTo)}&integration_id=${encodeURIComponent(integrationId)}`
            : ''
        const res = await backendPost<{
          success: boolean
          redirect_url?: string
          error?: string
        }>('/api/integrations/composio/connect', {
          integration_id: integrationId,
          callback_url: callbackUrl || redirectTo,
          long_redirect_url: true,
        })
        if (!res?.success) throw new Error(res?.error || 'Failed to initiate connection')
        if (res.redirect_url) {
          window.location.href = res.redirect_url
          return
        }
        const linked = await checkStatus(true)
        if (!linked) {
          toast.error(
            `No ${getDisplayName(integrationId)} authorization page was returned. Open Settings → Integrations to finish connecting.`,
          )
        }
        return
      }

      const legacyEndpoint = LEGACY_CONNECT_ENDPOINTS[integrationId]
      if (legacyEndpoint) {
        const res = await backendPost<{
          success: boolean
          authorizeUrl?: string
          installUrl?: string
        }>(legacyEndpoint, { redirectTo })
        const url = res?.authorizeUrl ?? res?.installUrl
        if (url) {
          window.location.href = url
          return
        }
      }

      setLoading(false)
    } catch (e) {
      setLoading(false)
      toast.error(sanitizeUserError(e, 'Connection failed'))
    }
  }

  const handleRepairAction = async (action: IntegrationRepairAction) => {
    if (action.type === 'open_settings') {
      window.dispatchEvent(new CustomEvent('open-account-settings', { detail: 'integrations' }))
      return
    }
    if (action.type === 'use_connection') {
      const message = action.message?.trim()
      if (!message || !onSendInstruction) return
      setLoading(true)
      onSendInstruction(message)
      setLoading(false)
      return
    }
    await handleConnect()
  }

  const logoPath = LOGO_MAP[integrationId]
  const displayName = getDisplayName(integrationId)
  const cardTitle = title?.trim() || `Connect ${displayName}`
  const repairProblem =
    problem?.trim() ||
    (status === 'needs_reconnect'
      ? `${displayName} needs to be reconnected before I can continue.`
      : status === 'missing_scope'
        ? `${displayName} needs extra permission before I can continue.`
        : status === 'access_denied'
          ? `${displayName} cannot access the requested item yet.`
          : status === 'fallback_available'
            ? `${displayName} can use your personal connection after you approve it for this task.`
            : description)
  const rawDoctorSummary = doctor?.summary?.trim()
  const doctorSummary =
    rawDoctorSummary && rawDoctorSummary !== repairProblem ? rawDoctorSummary : ''
  const doctorChecks = Array.isArray(doctor?.checks) ? doctor.checks.slice(0, 3) : []
  const effectivePrimaryAction: IntegrationRepairAction = primaryAction ?? {
    type: status === 'needs_reconnect' ? 'reconnect' : 'connect',
    provider: integrationId,
    label: status === 'needs_reconnect' ? `Reconnect ${displayName}` : `Connect ${displayName}`,
  }
  const effectiveSecondaryActions =
    secondaryActions.length > 0
      ? secondaryActions
      : [
          {
            type: 'open_settings' as const,
            provider: integrationId,
            label: 'Open settings',
          },
        ]
  const primaryDisabled = loading || (checking && effectivePrimaryAction.type !== 'use_connection')

  return (
    <div className="surface-card border-border rounded-spacing-3 p-spacing-3 my-spacing-2 max-w-full overflow-hidden border">
      <div className="gap-spacing-3 flex items-start">
        <div className="h-spacing-8 w-spacing-8 border-border bg-secondary flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full border">
          {logoPath ? (
            <Image
              src={logoPath}
              alt={displayName}
              width={20}
              height={20}
              className="object-contain"
            />
          ) : (
            <span className="body-3 text-muted-foreground font-bold">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="gap-spacing-2 flex min-w-0 items-center">
            <h3 className="body-2 text-foreground truncate font-medium">{cardTitle}</h3>
            {connected ? (
              <span className="badge-glass badge-glass-green shrink-0">Connected</span>
            ) : (
              <span className="badge-glass badge-glass-orange shrink-0">Needs action</span>
            )}
          </div>
          <p className="body-3 text-muted-foreground mt-spacing-1 line-clamp-2">{repairProblem}</p>
          {!connected && (doctorSummary || doctorChecks.length > 0) && (
            <div className="border-border bg-secondary mt-spacing-2 rounded-spacing-2 p-spacing-2 border">
              {doctorSummary && <p className="body-4 text-foreground">{doctorSummary}</p>}
              {doctorChecks.length > 0 && (
                <div className="mt-spacing-1 space-y-spacing-1">
                  {doctorChecks.map((check, index) => (
                    <p key={`${check.label}-${index}`} className="body-4 text-muted-foreground">
                      <span className="text-foreground">{check.label}</span>: {check.detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="gap-spacing-2 mt-spacing-3 flex flex-wrap">
            {!connected && (
              <button
                type="button"
                onClick={() => void handleRepairAction(effectivePrimaryAction)}
                disabled={primaryDisabled}
                className="button-compact button-glass-primary gap-spacing-1 inline-flex items-center"
              >
                {loading || checking ? (
                  <Loader2 className="icon-sm animate-spin" />
                ) : effectivePrimaryAction.type === 'use_connection' ? (
                  <CheckCircle2 className="icon-sm" />
                ) : (
                  <ExternalLink className="icon-sm" />
                )}
                {checking
                  ? 'Checking...'
                  : loading
                    ? effectivePrimaryAction.type === 'use_connection'
                      ? 'Starting...'
                      : 'Connecting...'
                    : effectivePrimaryAction.label}
              </button>
            )}
            {!connected &&
              effectiveSecondaryActions.map((action) => (
                <button
                  key={`${action.type}-${action.provider ?? integrationId}-${action.label}`}
                  type="button"
                  onClick={() => void handleRepairAction(action)}
                  disabled={loading || checking}
                  className="button-compact button-glass-neutral gap-spacing-1 inline-flex items-center"
                >
                  <Settings className="icon-sm" />
                  {action.label}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
