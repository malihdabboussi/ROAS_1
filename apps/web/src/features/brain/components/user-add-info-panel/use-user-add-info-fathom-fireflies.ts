import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BRAIN_TOAST_ERRORS } from '../../config/brain-toast-errors.config'
import {
  importFathomMeeting,
  listFathomMeetings,
  listFirefliesTranscripts,
  type FathomMeeting,
  type FirefliesTranscript,
} from '../../services/user-brain-import.service'

export function useUserAddInfoFathomFireflies() {
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

  const loadFathomMeetings = useCallback(async () => {
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

  const loadMoreFathomMeetings = useCallback(async () => {
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

  const loadAllFathomMeetings = useCallback(async () => {
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

  const loadFirefliesTranscripts = useCallback(async () => {
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
    if (fathomModalOpen) void loadFathomMeetings()
  }, [fathomModalOpen, loadFathomMeetings])

  useEffect(() => {
    if (firefliesModalOpen) void loadFirefliesTranscripts()
  }, [firefliesModalOpen, loadFirefliesTranscripts])

  const sortedFathom = useMemo(
    () =>
      [...fathomMeetings].sort((a, b) => {
        const left = new Date(a.created_at ?? 0).getTime()
        const right = new Date(b.created_at ?? 0).getTime()
        return right - left
      }),
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

  const getMeetingId = useCallback(
    (m: FathomMeeting) => String(m.id || m.recording_id || m.call_id || m.url || m.title),
    [],
  )

  const handleBatchImportFathom = useCallback(async () => {
    if (selectedFathomIds.size === 0) return
    setImportingBatch(true)
    try {
      const selected = sortedFathom.filter((m) => selectedFathomIds.has(getMeetingId(m)))
      await Promise.all(selected.map((m) => importFathomMeeting(m)))
      toast.success(`${selected.length} import(s) queued.`)
      setSelectedFathomIds(new Set())
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : BRAIN_TOAST_ERRORS.IMPORT_FATHOM_FAILED.userMessage,
      )
    } finally {
      setImportingBatch(false)
    }
  }, [selectedFathomIds, sortedFathom, getMeetingId])

  return {
    fathomModalOpen,
    setFathomModalOpen,
    firefliesModalOpen,
    setFirefliesModalOpen,
    fathomMeetings,
    firefliesTranscripts,
    loadingFathom,
    loadingFireflies,
    importingMeetingId,
    setImportingMeetingId,
    selectedFathomIds,
    setSelectedFathomIds,
    importingBatch,
    fathomNextCursor,
    loadingMoreFathom,
    loadMoreFathomMeetings,
    loadAllFathomMeetings,
    sortedFathom,
    toggleFathomSelection,
    getMeetingId,
    handleBatchImportFathom,
  }
}
