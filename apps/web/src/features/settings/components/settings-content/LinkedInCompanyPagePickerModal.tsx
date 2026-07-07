'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchLinkedInCompanyPages,
  saveLinkedInCompanyPage,
  type LinkedInAdministeredOrganization,
} from '@/features/settings/services/linkedin-company-pages-api'
import type { UserIntegration } from './integrations.types'

type LinkedInCompanyPagePickerModalProps = {
  userIntegration: UserIntegration
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function LinkedInCompanyPagePickerModal({
  userIntegration,
  open,
  onClose,
  onSaved,
}: LinkedInCompanyPagePickerModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<LinkedInAdministeredOrganization[]>([])

  const loadPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    setHint(null)
    try {
      const res = await fetchLinkedInCompanyPages(userIntegration.id)
      if (!res.success) {
        setError(res.error ?? 'Failed to load company pages')
        setOrganizations([])
        return
      }
      setOrganizations(res.organizations)
      if (res.hint) setHint(res.hint)
      if (res.organizations.length === 1) {
        const only = res.organizations[0]!
        setSaving(true)
        const saved = await saveLinkedInCompanyPage({
          user_integration_id: userIntegration.id,
          organization_urn: only.urn,
          organization_name: only.name,
        })
        setSaving(false)
        if (!saved.success) {
          setError(saved.error ?? 'Failed to save company page')
          return
        }
        onSaved()
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load company pages')
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [userIntegration.id, onClose, onSaved])

  useEffect(() => {
    if (!open) return
    void loadPages()
  }, [open, loadPages])

  const handleSelect = async (org: LinkedInAdministeredOrganization) => {
    setSaving(true)
    setError(null)
    try {
      const res = await saveLinkedInCompanyPage({
        user_integration_id: userIntegration.id,
        organization_urn: org.urn,
        organization_name: org.name,
      })
      if (!res.success) {
        setError(res.error ?? 'Failed to save company page')
        return
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save company page')
    } finally {
      setSaving(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100010] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-modal-overlay"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="surface-card border-border relative z-[1] w-full max-w-md rounded-xl border p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="body-2 text-foreground font-semibold">Select LinkedIn company page</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="body-3 text-muted-foreground mb-3">
          Social reporting needs a company page you administer. Personal profile connections alone
          cannot load org analytics.
        </p>

        {loading || saving ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <VibeyLoadingOrb size="sm" text={saving ? 'Saving...' : 'Loading pages...'} />
          </div>
        ) : error ? (
          <p className="body-3 text-destructive">{error}</p>
        ) : organizations.length === 0 ? (
          <p className="body-3 text-muted-foreground">
            {hint ??
              'We could not find any LinkedIn company pages for this connection. Make sure this LinkedIn profile is an admin on the company page, then reconnect LinkedIn and approve company page access.'}
          </p>
        ) : (
          <div className="max-h-[280px] space-y-1 overflow-y-auto">
            {organizations.map((org) => {
              const selected = userIntegration.metadata?.linkedin_organization_urn === org.urn
              return (
                <button
                  key={org.urn}
                  type="button"
                  onClick={() => void handleSelect(org)}
                  className="body-3 hover:bg-hover-subtle flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                >
                  <span className="text-foreground min-w-0 truncate">{org.name}</span>
                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
