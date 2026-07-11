'use client'

import { useEffect, useState } from 'react'
import { Building2, X } from 'lucide-react'
import { toast } from 'sonner'
import { orgService } from '@/features/org/services/org.service'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { formatOrgPublicUrl } from '@/lib/org/org-public-url'
import { clearOrgSensitiveState } from '@/lib/utils/clear-org-state'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { ORG_TOAST_ERRORS } from '../config/org-toast-errors.config'

export function CreateOrgDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(false)

  const { fetchMemberships, setActiveOrg } = useOrgStore()

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-create-org', handler)
    return () => window.removeEventListener('open-create-org', handler)
  }, [])

  useEffect(() => {
    if (!open) {
      setName('')
      setSlug('')
      setSlugTouched(false)
      setLoading(false)
    }
  }, [open])

  const deriveSlug = (input: string) =>
    input
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugTouched) setSlug(deriveSlug(val))
  }

  const handleCreate = async () => {
    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()
    if (!trimmedName || !trimmedSlug) return

    setLoading(true)
    try {
      const res = await orgService.createOrg({ name: trimmedName, slug: trimmedSlug })
      if (res.success && res.org) {
        await fetchMemberships()
        setActiveOrg(res.org.id)
        toast.success(`"${res.org.name}" created`)
        clearOrgSensitiveState()
        setOpen(false)
        window.location.href = '/org-setup'
      }
    } catch (err) {
      toast.error(sanitizeUserError(err, ORG_TOAST_ERRORS.CREATE_FAILED.userMessage))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div
        className="bg-modal-overlay fixed inset-0 z-50"
        onClick={loading ? undefined : () => setOpen(false)}
      />

      <div className="p-spacing-4 fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        <div className="surface-card wizard-container-border rounded-spacing-4 relative flex w-full max-w-md flex-col overflow-hidden">
          <div className="px-spacing-4 py-spacing-3 flex items-center justify-between border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Building2 className="text-muted-foreground h-5 w-5" />
              <h2 className="heading-3">NEW ORGANIZATION</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-spacing-1 text-muted-foreground hover:text-foreground p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="gap-spacing-4 px-spacing-4 py-spacing-4 flex flex-col">
            <div className="gap-spacing-1 flex flex-col">
              <label className="body-3 text-muted-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Agency"
                autoFocus
                disabled={loading}
                className="input-glass rounded-spacing-2 px-spacing-3 py-spacing-2 body-2"
              />
            </div>

            <div className="gap-spacing-1 flex flex-col">
              <label className="body-3 text-muted-foreground">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(deriveSlug(e.target.value))
                }}
                placeholder="my-agency"
                disabled={loading}
                className="input-glass rounded-spacing-2 px-spacing-3 py-spacing-2 body-2"
              />
              <span className="body-3 text-muted-foreground">{formatOrgPublicUrl(slug)}</span>
            </div>
          </div>

          <div className="px-spacing-4 py-spacing-3 flex justify-end gap-2 border-t border-[var(--color-border)]">
            <button
              onClick={() => setOpen(false)}
              disabled={loading}
              className="button-glass-neutral rounded-spacing-2 px-spacing-4 py-spacing-2 body-2"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim() || !slug.trim()}
              className="button-glass-primary rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
