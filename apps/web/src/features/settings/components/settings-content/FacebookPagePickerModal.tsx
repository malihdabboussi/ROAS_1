'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  fetchFacebookPages,
  saveFacebookPage,
  type FacebookManagedPage,
} from '@/features/settings/services/facebook-pages-api'
import type { UserIntegration } from './integrations.types'

export function FacebookPagePickerModal({
  userIntegration,
  open,
  onClose,
  onSaved,
}: {
  userIntegration: UserIntegration
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [pages, setPages] = useState<FacebookManagedPage[]>([])

  const loadPages = useCallback(async () => {
    setLoading(true)
    setError(null)
    setHint(null)
    try {
      const res = await fetchFacebookPages(userIntegration.id)
      if (!res.success) {
        setError(res.error ?? 'Failed to load Facebook Pages')
        setPages([])
        return
      }
      setPages(res.pages)
      if (res.hint) setHint(res.hint)
      if (res.pages.length === 1) {
        const only = res.pages[0]!
        setSaving(true)
        const saved = await saveFacebookPage({
          user_integration_id: userIntegration.id,
          page_id: only.id,
          page_name: only.name,
        })
        setSaving(false)
        if (!saved.success) {
          setError(saved.error ?? 'Failed to save Facebook Page')
          return
        }
        onSaved()
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Facebook Pages')
      setPages([])
    } finally {
      setLoading(false)
    }
  }, [userIntegration.id, onClose, onSaved])

  useEffect(() => {
    if (!open) return
    void loadPages()
  }, [open, loadPages])

  const handleSelect = async (page: FacebookManagedPage) => {
    setSaving(true)
    setError(null)
    try {
      const res = await saveFacebookPage({
        user_integration_id: userIntegration.id,
        page_id: page.id,
        page_name: page.name,
      })
      if (!res.success) {
        setError(res.error ?? 'Failed to save Facebook Page')
        return
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save Facebook Page')
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
          <h3 className="body-2 text-foreground font-semibold">Select Facebook Page</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="body-3 text-muted-foreground mb-3">
          Social reporting needs a Facebook Page you manage. Personal profile connections cannot
          load Page insights.
        </p>
        {loading || saving ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <VibeyLoadingOrb size="sm" text={saving ? 'Saving...' : 'Loading pages...'} />
          </div>
        ) : error ? (
          <p className="body-3 text-destructive">{error}</p>
        ) : pages.length === 0 ? (
          <p className="body-3 text-muted-foreground">
            {hint ?? 'No Facebook Pages found for this account.'}
          </p>
        ) : (
          <div className="max-h-[280px] space-y-1 overflow-y-auto">
            {pages.map((page) => {
              const selected = userIntegration.metadata?.facebook_page_id === page.id
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => void handleSelect(page)}
                  className="body-3 hover:bg-hover-subtle flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left"
                >
                  <span className="text-foreground min-w-0 truncate">{page.name}</span>
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
