'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { openInNewTab as openAppInNewTab } from '@/lib/utils/open-in-new-tab'
import { ensureGeneralSpace, transferSpaceItem } from '../../services/spaces.service'
import { useSpacesStore } from '../../store/use-spaces-store'
import type { SpaceItem } from '../../types'
import { getDocCustomDataRecord } from '../docs/lib/doc-editor-settings'
import {
  canExportSpaceDoc,
  exportSpaceDocDocx,
  exportSpaceDocHtml,
  exportSpaceDocMarkdown,
  exportSpaceDocPdf,
  exportSpaceDocVisualHtml,
  exportSpaceDocVisualPdf,
} from './export-space-doc'

export interface DocMenuTarget {
  id: string
  space_id: string
  title: string
  status: SpaceItem['status']
  priority: SpaceItem['priority']
  assignee_type: SpaceItem['assignee_type']
  assignee_id: SpaceItem['assignee_id']
  assignees: SpaceItem['assignees']
  start_date: SpaceItem['start_date']
  due_date: SpaceItem['due_date']
  doc_body: SpaceItem['doc_body']
  custom_data: SpaceItem['custom_data']
  parent_item_id: SpaceItem['parent_item_id']
}

export interface UseDocMenuActionsArgs {
  doc: DocMenuTarget
  campaignId?: string | null
  onChanged?: () => void
  onOpenDoc?: () => void
  onDelete?: () => void
}

function buildDocUrl(spaceId: string, itemId: string): string {
  if (typeof window === 'undefined') return `/spaces?space=${spaceId}&item=${itemId}`
  return `${window.location.origin}/spaces?space=${spaceId}&item=${itemId}`
}

async function copyToClipboard(value: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`)
  }
}

export function useDocMenuActions({
  doc,
  campaignId,
  onChanged,
  onOpenDoc,
  onDelete,
}: UseDocMenuActionsArgs) {
  const createItem = useSpacesStore((s) => s.createItem)
  const updateItem = useSpacesStore((s) => s.updateItem)
  const pushToAgent = useSpacesStore((s) => s.pushToAgent)
  const refresh = useSpacesStore((s) => s.refresh)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingDocx, setExportingDocx] = useState(false)
  const [exportingVisualPdf, setExportingVisualPdf] = useState(false)

  // Synthetic overlay docs (campaign docs shown via "Include all campaign docs")
  // have no real space_items row, so they cannot be moved/copied/removed.
  const isSyntheticDoc = doc.id.startsWith('cdoc:') || doc.id.startsWith('mdel:')
  const canRemoveFromSpace = !isSyntheticDoc

  const docCustomData = useMemo(() => getDocCustomDataRecord(doc.custom_data), [doc.custom_data])
  const docBody = doc.doc_body?.trim() ?? ''
  const visualHtml =
    typeof docCustomData._doc_visual_html === 'string' && docCustomData._doc_visual_html.trim()
      ? docCustomData._doc_visual_html.trim()
      : null
  const { canExport, canExportDocBody } = useMemo(
    () =>
      canExportSpaceDoc({
        customData: doc.custom_data,
        docBody,
        visualHtml,
      }),
    [doc.custom_data, docBody, visualHtml],
  )

  const copyLink = useCallback(async () => {
    await copyToClipboard(buildDocUrl(doc.space_id, doc.id), 'Doc link')
  }, [doc.space_id, doc.id])

  const copyId = useCallback(async () => {
    await copyToClipboard(doc.id, 'Doc ID')
  }, [doc.id])

  const openInNewTab = useCallback(() => {
    if (typeof window === 'undefined') return
    openAppInNewTab(buildDocUrl(doc.space_id, doc.id))
  }, [doc.space_id, doc.id])

  const openDoc = useCallback(() => {
    onOpenDoc?.()
  }, [onOpenDoc])

  const rename = useCallback(async () => {
    const next = window.prompt('Rename doc', doc.title)?.trim()
    if (!next || next === doc.title) return
    try {
      await updateItem(doc.id, { title: next })
      toast.success('Doc renamed')
      onChanged?.()
    } catch {
      toast.error('Failed to rename doc')
    }
  }, [updateItem, doc.id, doc.title, onChanged])

  const duplicate = useCallback(async () => {
    try {
      const customData = { ...(doc.custom_data ?? {}), _view_type: 'doc' }
      const newDoc = await createItem(`${doc.title || 'Untitled'} (copy)`, {
        status: doc.status,
        priority: doc.priority,
        assignee_type: doc.assignee_type,
        assignee_id: doc.assignee_id,
        assignees: doc.assignees,
        start_date: doc.start_date,
        due_date: doc.due_date,
        doc_body: doc.doc_body ?? '',
        parent_item_id: doc.parent_item_id,
        custom_data: customData,
      })
      if (newDoc) {
        toast.success('Doc duplicated')
        onChanged?.()
      }
    } catch {
      toast.error('Failed to duplicate doc')
    }
  }, [createItem, doc, onChanged])

  const moveToSpace = useCallback(
    async (targetSpaceId: string) => {
      try {
        await transferSpaceItem(doc.space_id, doc.id, {
          target_space_id: targetSpaceId,
          mode: 'move',
        })
        toast.success('Doc moved')
        await refresh()
        onChanged?.()
      } catch {
        toast.error('Failed to move doc')
      }
    },
    [doc.space_id, doc.id, refresh, onChanged],
  )

  const copyToSpace = useCallback(
    async (targetSpaceId: string) => {
      try {
        await transferSpaceItem(doc.space_id, doc.id, {
          target_space_id: targetSpaceId,
          mode: 'copy',
        })
        toast.success('Doc copied')
        onChanged?.()
      } catch {
        toast.error('Failed to copy doc')
      }
    },
    [doc.space_id, doc.id, onChanged],
  )

  const removeFromSpace = useCallback(async () => {
    if (!canRemoveFromSpace) return
    try {
      const general = await ensureGeneralSpace()
      if (general.id === doc.space_id) {
        toast.info('Already in your General workspace')
        return
      }
      await transferSpaceItem(doc.space_id, doc.id, {
        target_space_id: general.id,
        mode: 'move',
      })
      toast.success('Removed from space — kept in General')
      await refresh()
      onChanged?.()
    } catch {
      toast.error('Failed to remove from space')
    }
  }, [canRemoveFromSpace, doc.space_id, doc.id, refresh, onChanged])

  const sendToAgent = useCallback(async () => {
    try {
      await pushToAgent(doc.id)
      toast.success('Sent to agent')
      onChanged?.()
    } catch {
      toast.error('Failed to send doc to agent')
    }
  }, [pushToAgent, doc.id, onChanged])

  const deleteDoc = useCallback(() => {
    onDelete?.()
  }, [onDelete])

  const exportPdf = useCallback(async () => {
    if (!canExportDocBody || exportingPdf) return
    setExportingPdf(true)
    try {
      await exportSpaceDocPdf({
        title: doc.title,
        docBody,
        campaignId: campaignId ?? null,
      })
    } finally {
      setExportingPdf(false)
    }
  }, [campaignId, canExportDocBody, doc.title, docBody, exportingPdf])

  const exportMarkdown = useCallback(() => {
    if (!canExportDocBody) return
    exportSpaceDocMarkdown(doc.title, docBody)
  }, [canExportDocBody, doc.title, docBody])

  const exportHtml = useCallback(() => {
    if (!canExportDocBody) return
    exportSpaceDocHtml(doc.title, docBody)
  }, [canExportDocBody, doc.title, docBody])

  const exportDocx = useCallback(async () => {
    if (!canExportDocBody || exportingDocx) return
    setExportingDocx(true)
    try {
      await exportSpaceDocDocx(doc.title, docBody)
    } finally {
      setExportingDocx(false)
    }
  }, [canExportDocBody, doc.title, docBody, exportingDocx])

  const exportVisualHtml = useCallback(() => {
    if (!visualHtml) return
    exportSpaceDocVisualHtml(doc.title, visualHtml)
  }, [doc.title, visualHtml])

  const exportVisualPdf = useCallback(async () => {
    if (!visualHtml || exportingVisualPdf) return
    setExportingVisualPdf(true)
    try {
      await exportSpaceDocVisualPdf({ title: doc.title, visualHtml })
    } finally {
      setExportingVisualPdf(false)
    }
  }, [doc.title, exportingVisualPdf, visualHtml])

  return {
    canExport,
    canExportDocBody,
    hasVisualHtml: Boolean(visualHtml),
    exportingPdf,
    exportingDocx,
    exportingVisualPdf,
    copyLink,
    copyId,
    openInNewTab,
    openDoc,
    rename,
    duplicate,
    isSyntheticDoc,
    canRemoveFromSpace,
    moveToSpace,
    copyToSpace,
    removeFromSpace,
    sendToAgent,
    exportPdf,
    exportMarkdown,
    exportHtml,
    exportDocx,
    exportVisualHtml,
    exportVisualPdf,
    deleteDoc,
  }
}
