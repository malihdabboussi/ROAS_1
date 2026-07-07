'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  importCampaignKnowledgeFromFathomMeeting,
  importCampaignKnowledgeFromFirefliesTranscript,
  type CampaignFathomMeeting,
  type KnowledgeDomain,
} from '@/lib/campaigns'
import { BRAIN_TOAST_ERRORS } from '../config/brain-toast-errors.config'
import {
  listFathomMeetings,
  listFirefliesTranscripts,
  type FathomMeeting,
  type FirefliesTranscript,
} from '../services/user-brain-import.service'
import {
  getCampaignInfoMeetingId,
  sortCampaignInfoFathomMeetings,
} from './campaign-add-info-helpers'

interface UseCampaignAddInfoCallImportsOptions {
  campaignId: string | null
  resolvedDomain?: KnowledgeDomain
}

export function useCampaignAddInfoCallImports({
  campaignId,
  resolvedDomain,
}: UseCampaignAddInfoCallImportsOptions) {
  const [fathomModalOpen, setFathomModalOpen] = useState(false)
  const [firefliesModalOpen, setFirefliesModalOpen] = useState(false)
  const [fathomMeetings, setFathomMeetings] = useState<FathomMeeting[]>([])
  const [firefliesTranscripts, setFirefliesTranscripts] = useState<FirefliesTranscript[]>([])
  const [loadingFathom, setLoadingFathom] = useState(false)
  const [loadingFireflies, setLoadingFireflies] = useState(false)
  const [importingMeetingId, setImportingMeetingId] = useState<string | null>(null)
  const [selectedFathomIds, setSelectedFathomIds] = useState<Set<string>>(new Set())
  const [importingBatch, setImportingBatch] = useState(false)
  const [fathomNextCursor, setFathomNextCursor] = useState<string | undefined>()
  const [loadingMoreFathom, setLoadingMoreFathom] = useState(false)

  const loadFathom = useCallback(async () => {
    setLoadingFathom(true)
    try {
      const response = await listFathomMeetings()
      setFathomMeetings(response.items)
      setFathomNextCursor(response.next_cursor)
    } catch (err) {
      setFathomMeetings([])
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.LOAD_FATHOM_FAILED.userMessage,
      )
    } finally {
      setLoadingFathom(false)
    }
  }, [])

  const loadMoreFathom = useCallback(async () => {
    if (!fathomNextCursor || loadingMoreFathom) return
    setLoadingMoreFathom(true)
    try {
      const response = await listFathomMeetings(fathomNextCursor)
      setFathomMeetings((prev) => [...prev, ...(response.items ?? [])])
      setFathomNextCursor(response.next_cursor)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.LOAD_FATHOM_FAILED.userMessage,
      )
    } finally {
      setLoadingMoreFathom(false)
    }
  }, [fathomNextCursor, loadingMoreFathom])

  const loadAllFathom = useCallback(async () => {
    if (!fathomNextCursor || loadingMoreFathom) return
    setLoadingMoreFathom(true)
    try {
      let cursor: string | undefined = fathomNextCursor
      while (cursor) {
        const response = await listFathomMeetings(cursor)
        setFathomMeetings((prev) => [...prev, ...(response.items ?? [])])
        cursor = response.next_cursor
      }
      setFathomNextCursor(undefined)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.LOAD_FATHOM_FAILED.userMessage,
      )
    } finally {
      setLoadingMoreFathom(false)
    }
  }, [fathomNextCursor, loadingMoreFathom])

  const loadFireflies = useCallback(async () => {
    setLoadingFireflies(true)
    try {
      const transcripts = await listFirefliesTranscripts(30)
      setFirefliesTranscripts(transcripts)
    } catch (err) {
      setFirefliesTranscripts([])
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.LOAD_FIREFLIES_FAILED.userMessage,
      )
    } finally {
      setLoadingFireflies(false)
    }
  }, [])

  useEffect(() => {
    if (fathomModalOpen) void loadFathom()
  }, [fathomModalOpen, loadFathom])

  useEffect(() => {
    if (firefliesModalOpen) void loadFireflies()
  }, [firefliesModalOpen, loadFireflies])

  const sortedFathom = useMemo(
    () => sortCampaignInfoFathomMeetings(fathomMeetings),
    [fathomMeetings],
  )

  useEffect(() => {
    if (!fathomModalOpen) setSelectedFathomIds(new Set())
  }, [fathomModalOpen])

  const toggleFathomSelection = useCallback((meetingId: string) => {
    setSelectedFathomIds((prev) => {
      const next = new Set(prev)
      if (next.has(meetingId)) next.delete(meetingId)
      else next.add(meetingId)
      return next
    })
  }, [])

  const handleBatchImportFathom = useCallback(async () => {
    if (!campaignId || selectedFathomIds.size === 0) return
    setImportingBatch(true)
    try {
      const selected = sortedFathom.filter((meeting) =>
        selectedFathomIds.has(getCampaignInfoMeetingId(meeting)),
      )
      await Promise.all(
        selected.map((meeting) =>
          importCampaignKnowledgeFromFathomMeeting(
            campaignId,
            meeting as CampaignFathomMeeting,
            resolvedDomain,
          ),
        ),
      )
      toast.success(`${selected.length} import(s) queued.`)
      setSelectedFathomIds(new Set())
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.IMPORT_FATHOM_FAILED.userMessage,
      )
    } finally {
      setImportingBatch(false)
    }
  }, [campaignId, resolvedDomain, selectedFathomIds, sortedFathom])

  const handleToggleAllFathomSelection = useCallback(() => {
    if (selectedFathomIds.size === sortedFathom.length) {
      setSelectedFathomIds(new Set())
      return
    }
    setSelectedFathomIds(
      new Set(sortedFathom.map((meeting) => getCampaignInfoMeetingId(meeting))),
    )
  }, [selectedFathomIds.size, sortedFathom])

  const handleImportFirefliesTranscript = useCallback(
    async (transcript: FirefliesTranscript) => {
      if (!campaignId) return
      setImportingMeetingId(`fireflies:${transcript.id}`)
      try {
        await importCampaignKnowledgeFromFirefliesTranscript(
          campaignId,
          transcript.id,
          resolvedDomain,
        )
        toast.success('Import started. You can keep working.')
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : BRAIN_TOAST_ERRORS.IMPORT_FIREFLIES_FAILED.userMessage,
        )
      } finally {
        setImportingMeetingId(null)
      }
    },
    [campaignId, resolvedDomain],
  )

  return {
    fathomModalOpen,
    fathomNextCursor,
    firefliesModalOpen,
    firefliesTranscripts,
    handleBatchImportFathom,
    handleImportFirefliesTranscript,
    handleToggleAllFathomSelection,
    importingBatch,
    importingMeetingId,
    loadAllFathom,
    loadMoreFathom,
    loadingFathom,
    loadingFireflies,
    loadingMoreFathom,
    selectedFathomIds,
    setFathomModalOpen,
    setFirefliesModalOpen,
    sortedFathom,
    toggleFathomSelection,
  }
}
