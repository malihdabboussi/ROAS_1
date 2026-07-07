'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { MissionDeliverable } from '@/lib/missions'
import { renameItemCommentAttachment } from '@/lib/spaces'
import { updateMissionDeliverable } from '@/lib/services/docs-api'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ActivityAttachmentRenameCtx = {
  spaceId: string
  itemId: string
  activityId: string
  fileUrl: string
}

function activityAttachmentRenameCtx(
  deliverable: MissionDeliverable,
): ActivityAttachmentRenameCtx | null {
  const meta = deliverable.metadata ?? {}
  if (meta.source !== 'task_activity_comment') return null
  const spaceId = typeof meta.spaceId === 'string' ? meta.spaceId : null
  const itemId = typeof meta.itemId === 'string' ? meta.itemId : null
  const activityId = typeof meta.activityId === 'string' ? meta.activityId : null
  if (!spaceId || !itemId || !activityId || !deliverable.file_url) return null
  return { spaceId, itemId, activityId, fileUrl: deliverable.file_url }
}

export function useDeliverableTitleRename({
  deliverable,
  onDeliverableRenamed,
}: {
  deliverable: MissionDeliverable
  onDeliverableRenamed?: (title: string) => void
}) {
  const [displayTitle, setDisplayTitle] = useState(deliverable.title)
  const [titleDraft, setTitleDraft] = useState(deliverable.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [savingTitle, setSavingTitle] = useState(false)

  useEffect(() => {
    setDisplayTitle(deliverable.title)
    setTitleDraft(deliverable.title)
    setEditingTitle(false)
  }, [deliverable.id, deliverable.title])

  const attachmentRenameCtx = useMemo(() => activityAttachmentRenameCtx(deliverable), [deliverable])
  const titleRenameable = attachmentRenameCtx != null || UUID_RE.test(deliverable.id)

  const handleTitleSave = useCallback(async () => {
    setEditingTitle(false)
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === displayTitle) {
      setTitleDraft(displayTitle)
      return
    }
    setSavingTitle(true)
    const previous = displayTitle
    setDisplayTitle(trimmed)
    try {
      if (attachmentRenameCtx) {
        await renameItemCommentAttachment(
          attachmentRenameCtx.spaceId,
          attachmentRenameCtx.itemId,
          attachmentRenameCtx.activityId,
          attachmentRenameCtx.fileUrl,
          trimmed,
        )
      } else {
        await updateMissionDeliverable(deliverable.id, { title: trimmed })
      }
      onDeliverableRenamed?.(trimmed)
    } catch {
      setDisplayTitle(previous)
      setTitleDraft(previous)
      toast.error('Failed to rename')
    } finally {
      setSavingTitle(false)
    }
  }, [titleDraft, displayTitle, attachmentRenameCtx, deliverable.id, onDeliverableRenamed])

  return {
    displayTitle,
    titleDraft,
    setTitleDraft,
    editingTitle,
    setEditingTitle,
    savingTitle,
    titleRenameable,
    handleTitleSave,
  }
}
