'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchLinkedInCompanyPages,
  saveLinkedInCompanyPage,
  type LinkedInAdministeredOrganization,
} from '@/lib/integrations/social-reporting-pages-api'
import type { SocialConnectionOption } from '@/lib/reporting/social-analytics-types'
import { resolveSocialReportingUserIntegrationId } from './resolve-social-reporting-user-integration-id'

type LinkedInReportingCompanyPagePickerProps = {
  userIntegrationId: string | null
  selectedPageName: string | null
  platformOpts: SocialConnectionOption[]
  effectiveConnectionId: string | null
  activeConnectionId?: string | null
  activeConnectionSource?: 'campaign_integration' | 'user_integration' | null
  onConnectionChange?: (connectionId: string | null) => void
  onCompanyPageSaved: () => void
}

export function LinkedInReportingCompanyPagePicker({
  userIntegrationId: userIntegrationIdProp,
  selectedPageName,
  platformOpts,
  effectiveConnectionId,
  activeConnectionId,
  activeConnectionSource,
  onConnectionChange,
  onCompanyPageSaved,
}: LinkedInReportingCompanyPagePickerProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<LinkedInAdministeredOrganization[]>([])
  const [loadedForId, setLoadedForId] = useState<string | null>(null)

  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const userIntegrationId =
    userIntegrationIdProp ??
    resolveSocialReportingUserIntegrationId(
      effectiveConnectionId,
      platformOpts,
      activeConnectionId,
      activeConnectionSource,
    )

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
  }, [open])

  const loadPages = useCallback(async () => {
    if (!userIntegrationId) {
      setError('No LinkedIn connection found for this campaign.')
      setOrganizations([])
      return
    }
    setLoading(true)
    setError(null)
    setHint(null)
    try {
      const res = await fetchLinkedInCompanyPages(userIntegrationId)
      if (!res.success) {
        setError(res.error ?? 'Failed to load company pages')
        setOrganizations([])
        return
      }
      setOrganizations(res.organizations)
      if (res.hint) setHint(res.hint)
      setLoadedForId(userIntegrationId)

      if (res.organizations.length === 1 && !selectedPageName) {
        const only = res.organizations[0]!
        setSaving(true)
        const saved = await saveLinkedInCompanyPage({
          user_integration_id: userIntegrationId,
          organization_urn: only.urn,
          organization_name: only.name,
        })
        setSaving(false)
        if (!saved.success) {
          setError(saved.error ?? 'Failed to save company page')
          return
        }
        setOpen(false)
        onCompanyPageSaved()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load company pages')
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [userIntegrationId, selectedPageName, onCompanyPageSaved])

  useEffect(() => {
    if (!open) return
    if (loadedForId === userIntegrationId && organizations.length > 0) return
    void loadPages()
  }, [open, loadPages, loadedForId, userIntegrationId, organizations.length])

  const handleSelectPage = async (org: LinkedInAdministeredOrganization) => {
    if (!userIntegrationId) return
    setSaving(true)
    setError(null)
    try {
      const res = await saveLinkedInCompanyPage({
        user_integration_id: userIntegrationId,
        organization_urn: org.urn,
        organization_name: org.name,
      })
      if (!res.success) {
        setError(res.error ?? 'Failed to save company page')
        return
      }
      setOpen(false)
      onCompanyPageSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save company page')
    } finally {
      setSaving(false)
    }
  }

  const menuLabel = selectedPageName?.trim() || 'Select company page'
  const showConnectionSection = onConnectionChange != null && platformOpts.length > 0

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-border body-3 text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors"
      >
        Company page: {menuLabel}
        <ChevronDown className="icon-xs" />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-50"
            style={{ top: pos.top, left: pos.left }}
            data-social-account-dropdown
          >
            <div className="surface-card border-border rounded-spacing-2 p-spacing-2 max-h-[320px] min-w-[240px] overflow-auto border shadow-lg">
              {showConnectionSection ? (
                <>
                  <p className="typo-caption text-muted-foreground px-spacing-2 pb-spacing-1 pt-spacing-1">
                    Connection
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onConnectionChange(null)
                    }}
                    className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 block w-full text-left transition-colors ${
                      !effectiveConnectionId
                        ? 'bg-primary/10 text-muted-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Auto (default)
                  </button>
                  {platformOpts.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onConnectionChange(opt.id)
                        setLoadedForId(null)
                        setOrganizations([])
                      }}
                      className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 block w-full truncate text-left transition-colors ${
                        effectiveConnectionId === opt.id
                          ? 'bg-primary/10 text-muted-foreground'
                          : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                      {opt.is_default ? ' · default' : ''}
                    </button>
                  ))}
                  <div className="border-border my-spacing-1 border-t" />
                </>
              ) : null}

              <p className="typo-caption text-muted-foreground px-spacing-2 pb-spacing-1">
                Company page
              </p>

              {loading || saving ? (
                <div className="flex min-h-[80px] items-center justify-center py-4">
                  <VibeyLoadingOrb size="sm" text={saving ? 'Saving...' : 'Loading pages...'} />
                </div>
              ) : error ? (
                <p className="body-3 text-destructive px-spacing-2 py-spacing-2">{error}</p>
              ) : !userIntegrationId ? (
                <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                  Connect LinkedIn in Settings first.
                </p>
              ) : organizations.length === 0 ? (
                <p className="body-3 text-muted-foreground px-spacing-2 py-spacing-2">
                  {hint ??
                    'We could not find any LinkedIn company pages for this connection. Make sure this LinkedIn profile is an admin on the company page, then reconnect LinkedIn and approve company page access.'}
                </p>
              ) : (
                organizations.map((org) => (
                  <button
                    key={org.urn}
                    type="button"
                    onClick={() => void handleSelectPage(org)}
                    className={`body-3 px-spacing-2 py-spacing-2 rounded-spacing-1 block w-full truncate text-left transition-colors ${
                      selectedPageName === org.name
                        ? 'bg-primary/10 text-muted-foreground'
                        : 'hover:bg-hover-subtle text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {org.name}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
