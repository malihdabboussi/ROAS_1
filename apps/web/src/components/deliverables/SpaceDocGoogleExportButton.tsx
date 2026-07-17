'use client'

import { useCallback, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { DELIVERABLE_PREVIEW_MESSAGES } from '@/components/deliverables/deliverable-preview-messages.config'
import { createGoogleDocFromHtml } from '@/lib/services/google-drive-api'
import {
  buildSpaceDocExportHtml,
  googleDocHref,
  googleDocMetadataPatch,
} from '@/lib/spaces/space-doc-export'
import { updateSpaceItem } from '@/lib/spaces/spaces-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export function SpaceDocGoogleExportButton({
  spaceId,
  itemId,
  title,
  docBody,
  customData,
  onCustomDataChanged,
}: {
  spaceId: string
  itemId: string
  title: string
  docBody: string
  customData: Record<string, unknown>
  onCustomDataChanged: (customData: Record<string, unknown>) => void
}) {
  const [creating, setCreating] = useState(false)
  const savedGoogleDocHref = googleDocHref(customData)

  const exportToGoogleDocs = useCallback(async () => {
    if (!docBody.trim() || creating) return
    if (savedGoogleDocHref) {
      window.open(savedGoogleDocHref, '_blank', 'noopener,noreferrer')
      return
    }

    const pendingTab = window.open('about:blank', '_blank')
    if (pendingTab) pendingTab.opener = null
    setCreating(true)
    try {
      const resolvedTitle = title.trim() || 'Untitled'
      const result = await createGoogleDocFromHtml(
        resolvedTitle,
        buildSpaceDocExportHtml(resolvedTitle, docBody),
      )
      const href =
        result.file.webViewLink || `https://docs.google.com/document/d/${result.file.id}/edit`
      if (pendingTab) pendingTab.location.replace(href)
      else window.open(href, '_blank', 'noopener,noreferrer')

      const nextCustomData = {
        ...customData,
        ...googleDocMetadataPatch(result.file),
      }
      try {
        await updateSpaceItem(spaceId, itemId, { custom_data: nextCustomData })
        onCustomDataChanged(nextCustomData)
        toast.success(DELIVERABLE_PREVIEW_MESSAGES.GOOGLE_DOC_CREATED)
      } catch {
        toast.error(DELIVERABLE_PREVIEW_MESSAGES.GOOGLE_DOC_LINK_SAVE_FAILED)
      }
    } catch (cause) {
      pendingTab?.close()
      toast.error(sanitizeUserError(cause, DELIVERABLE_PREVIEW_MESSAGES.GOOGLE_DOC_CREATE_FAILED))
    } finally {
      setCreating(false)
    }
  }, [
    creating,
    customData,
    docBody,
    itemId,
    onCustomDataChanged,
    savedGoogleDocHref,
    spaceId,
    title,
  ])

  return (
    <button
      type="button"
      onClick={() => void exportToGoogleDocs()}
      disabled={creating}
      className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 inline-flex shrink-0 items-center whitespace-nowrap"
      aria-label={savedGoogleDocHref ? 'Open Google Doc' : 'Export to Google Docs'}
    >
      <ExternalLink className="icon-sm shrink-0" />
      <span>
        {creating ? 'Creating…' : savedGoogleDocHref ? 'Open Google Doc' : 'Export to Google Docs'}
      </span>
    </button>
  )
}
