'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { ShellStoreHydrator } from '@/components/shell/ShellStoreHydrator'
import { TransferDialogProvider } from '@/components/transfer'
import { PromoRedemptionHandler } from '@/features/billing/components/PromoRedemptionHandler'
import { PurchaseSuccessHandler } from '@/features/billing/components/PurchaseSuccessHandler'
import { AddAgentBrainModals } from '@/features/brain/components/AddAgentBrainModals'
import { BrainImagePickerHost } from '@/features/brain/components/BrainImagePickerHost'
import { TrainBrainModalHost } from '@/features/brain/components/TrainBrainModalHost'
import { ImpersonationBanner } from '@/features/impersonation/components/ImpersonationBanner'
import { CreateOrgDialog } from '@/features/org/components/CreateOrgDialog'
import { useWorkspaceSettingsModal } from '@/features/settings'
import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import { CampaignModeProvider } from '@/features/studio/contexts/CampaignModeContext'
import { dispatchOpenStudioSearch } from '@/features/studio/utils/open-studio-search-result'
import { ClientScopeProvider } from '@/lib/client-scope'
import { installFreezeDiagnostics, reportFreezeEvent } from '@/lib/debug/freeze-diagnostics'
import { broadcastIntegrationOAuthEvent } from '@/lib/integrations/composio-oauth'
import { useOrgStore } from '@/lib/org'
import { withOrgParam } from '@/lib/utils/open-in-new-tab'

function StudioSearchHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 'k') return
      const t = e.target as HTMLElement | null
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return
      e.preventDefault()
      dispatchOpenStudioSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}

const INTEGRATION_RETURN_KEYS = [
  'ghl_connected',
  'github_connected',
  'stripe_connected',
  'paypal_connected',
  'meta_connected',
  'calendly_connected',
  'google_drive_connected',
  'dropbox_connected',
  'fathom_connected',
  'slack_connected',
  'composio_connected',
  'composio_error',
  'composio_error_message',
]

function IntegrationReturnHandler() {
  const searchParams = useSearchParams()
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()

  useEffect(() => {
    const hasIntegrationReturnState = INTEGRATION_RETURN_KEYS.some(
      (key) => searchParams.get(key) !== null,
    )
    const hasIntegrationsDeepLink = searchParams.get('settings') === 'integrations'
    if (!hasIntegrationReturnState && !hasIntegrationsDeepLink) return

    if (searchParams.get('composio_connected') === '1') {
      broadcastIntegrationOAuthEvent({
        type: 'connected',
        integrationId: searchParams.get('integration') ?? '',
      })
    } else if (searchParams.get('composio_error')) {
      broadcastIntegrationOAuthEvent({
        type: 'error',
        integrationId: searchParams.get('integration'),
        message:
          searchParams.get('composio_error_message') ||
          searchParams.get('composio_error') ||
          'Connection failed',
      })
    }

    openWorkspaceSettings('integrations')
  }, [searchParams, openWorkspaceSettings])

  return null
}

function OrgOnboardingGuard() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const checkedOrgRef = useRef<string | null>(null)

  useEffect(() => {
    if (!activeOrgId) {
      checkedOrgRef.current = null
      return
    }
    if (checkedOrgRef.current === activeOrgId) return
    checkedOrgRef.current = activeOrgId

    let cancelled = false
    void (async () => {
      try {
        const { backendGet } = await import('@/lib/api/backend-client')
        const status = await backendGet<{ onboarded: boolean }>('/api/agents/onboarding-status')
        if (cancelled) return
        if (!status?.onboarded) {
          window.location.href = '/org-setup'
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  return null
}

function OrgBootstrap() {
  const searchParams = useSearchParams()
  const fetchMemberships = useOrgStore((s) => s.fetchMemberships)
  const isLoaded = useOrgStore((s) => s.isLoaded)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const requestedOrgId = searchParams.get('org')?.trim() || null

  useLayoutEffect(() => {
    if (!requestedOrgId || activeOrgId === requestedOrgId) return
    if (!isLoaded) {
      useOrgStore.getState().setActiveOrg(requestedOrgId)
      return
    }

    const { memberships, setActiveOrg } = useOrgStore.getState()
    if (!memberships.some((m) => m.org_id === requestedOrgId)) return
    setActiveOrg(requestedOrgId)
    // Drop the previous org's space snapshot so `?space=` deep links resolve
    // against the owning workspace instead of thrashing on a stale list.
    cachedSpaces.invalidate()
    useSpacesStore.setState({
      spaces: [],
      activeSpaceId: null,
      activeViewId: null,
      items: [],
      itemsLoadedForSpaceId: null,
      itemsLoadedForQueryKey: null,
      loading: true,
    })
    void useSpacesStore.getState().loadSpaces()
  }, [activeOrgId, isLoaded, requestedOrgId])

  useEffect(() => {
    if (isLoaded) return
    void fetchMemberships({ preferProfileDefault: !requestedOrgId })
  }, [isLoaded, fetchMemberships, requestedOrgId])

  return null
}

function FreezeDiagnosticsInstaller() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    installFreezeDiagnostics()
  }, [])

  useEffect(() => {
    reportFreezeEvent('route_ready', {
      route_next: pathname,
      search_next: searchParams.toString().slice(0, 240),
    })
  }, [pathname, searchParams])

  return null
}

function ActiveOrgLinkContextPropagator() {
  const activeOrgId = useOrgStore((s) => s.activeOrgId)

  useEffect(() => {
    if (!activeOrgId) return

    const applyActiveOrg = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return

      const href = anchor.getAttribute('href')
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return
      }

      const scopedHref = withOrgParam(href, activeOrgId)
      if (scopedHref !== href) {
        anchor.setAttribute('href', scopedHref)
      }
    }

    document.addEventListener('pointerdown', applyActiveOrg, true)
    document.addEventListener('contextmenu', applyActiveOrg, true)
    document.addEventListener('focusin', applyActiveOrg, true)
    return () => {
      document.removeEventListener('pointerdown', applyActiveOrg, true)
      document.removeEventListener('contextmenu', applyActiveOrg, true)
      document.removeEventListener('focusin', applyActiveOrg, true)
    }
  }, [activeOrgId])

  return null
}

export function DashboardProviders({
  children,
  initialSidebarMode,
}: {
  children: React.ReactNode
  initialSidebarMode?: 'studio' | 'hq'
}) {
  return (
    <CampaignModeProvider initialSidebarMode={initialSidebarMode}>
      <ClientScopeProvider>
        <TransferDialogProvider>
          <ShellStoreHydrator />
          {children}
          <ImpersonationBanner />
          <Suspense fallback={null}>
            <OrgBootstrap />
            <FreezeDiagnosticsInstaller />
          </Suspense>
          <ActiveOrgLinkContextPropagator />
          <OrgOnboardingGuard />
          <CreateOrgDialog />
          <StudioSearchHotkey />
          <AddAgentBrainModals />
          <TrainBrainModalHost />
          <BrainImagePickerHost />
          <Suspense fallback={null}>
            <IntegrationReturnHandler />
            <PurchaseSuccessHandler />
            <PromoRedemptionHandler />
          </Suspense>
        </TransferDialogProvider>
      </ClientScopeProvider>
    </CampaignModeProvider>
  )
}
