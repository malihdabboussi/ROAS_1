'use client'

import { useCallback, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { DELIVERABLE_PREVIEW_MESSAGES } from '@/components/deliverables/deliverable-preview-messages.config'
import { createGoogleDocFromHtml } from '@/lib/services/google-drive-api'
import {
  abandonGoogleExportTab,
  finishGoogleExportTab,
  openGoogleExportTab,
} from '@/lib/spaces/google-export-tab'
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
    if (!docBody.trim() || creating || savedGoogleDocHref) return

    const pendingTab = openGoogleExportTab()
    setCreating(true)
    try {
      const resolvedTitle = title.trim() || 'Untitled'
      const result = await createGoogleDocFromHtml(
        resolvedTitle,
        buildSpaceDocExportHtml(resolvedTitle, docBody),
      )
      const href =
        result.file.webViewLink || `https://docs.google.com/document/d/${result.file.id}/edit`
      finishGoogleExportTab(pendingTab, href)

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
      abandonGoogleExportTab(pendingTab)
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

  if (savedGoogleDocHref) {
    return (
      <a
        href={savedGoogleDocHref}
        target="_blank"
        rel="noopener noreferrer"
        className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 inline-flex shrink-0 items-center whitespace-nowrap"
        aria-label="Open Google Doc"
      >
        <ExternalLink className="icon-sm shrink-0" />
        <span>Open Google Doc</span>
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={() => void exportToGoogleDocs()}
      disabled={creating}
      className="button-glass-neutral body-3 gap-spacing-2 px-spacing-3 py-spacing-2 inline-flex shrink-0 items-center whitespace-nowrap"
      aria-label="Export to Google Docs"
    >
      <ExternalLink className="icon-sm shrink-0" />
      <span>{creating ? 'Creating…' : 'Export to Google Docs'}</span>
    </button>
  )
}
