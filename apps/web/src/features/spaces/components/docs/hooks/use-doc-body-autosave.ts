'use client'

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { toast } from 'sonner'
import { updateConvDoc, updateMissionDeliverable } from '@/lib/services/docs-api'
import { RETRY_CONFIGS, withRetry } from '@/lib/utils/retry'
import type { SpaceItem } from '../../../types'
import type { SaveStatus } from '../types/doc-editor.types'

type UseDocBodyAutosaveParams = {
  initialItemId: string
  baselineDocBodyOnIdChange: string | null | undefined
  item: SpaceItem
  activeSpaceId: string | null
  docBodyHydrationBlockedRef: MutableRefObject<boolean>
  storeUpdateItem: (id: string, patch: Partial<SpaceItem>) => Promise<void>
  onCampaignDocsRefresh?: () => void
  onHydrationUnblocked?: () => void
}

export function useDocBodyAutosave({
  initialItemId,
  baselineDocBodyOnIdChange,
  item,
  activeSpaceId,
  docBodyHydrationBlockedRef,
  storeUpdateItem,
  onCampaignDocsRefresh,
  onHydrationUnblocked,
}: UseDocBodyAutosaveParams) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const savePromiseRef = useRef<Promise<void> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const baselineRef = useRef(baselineDocBodyOnIdChange)
  baselineRef.current = baselineDocBodyOnIdChange
  const localDocBodyRef = useRef<string>(baselineDocBodyOnIdChange ?? '')
  /** Latest debounced-but-unsaved body. `undefined` = nothing pending (null = cleared doc). */
  const pendingDocBodyRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    // Adopt the incoming baseline only on doc switch or while pristine — a
    // stale list copy arriving mid-edit must not clobber the local body.
    if (docBodyHydrationBlockedRef.current) return
    localDocBodyRef.current = baselineRef.current ?? ''
  }, [initialItemId, baselineDocBodyOnIdChange, docBodyHydrationBlockedRef])

  const unblockHydrationIfCurrent = useCallback(
    (savedDocBody: string | null) => {
      if (pendingDocBodyRef.current !== undefined) return
      const local = localDocBodyRef.current === '' ? null : localDocBodyRef.current
      if ((savedDocBody ?? null) !== local) return
      docBodyHydrationBlockedRef.current = false
      onHydrationUnblocked?.()
    },
    [docBodyHydrationBlockedRef, onHydrationUnblocked],
  )

  const persistDocBody = useCallback(
    async (docBody: string | null) => {
      if (!activeSpaceId) return
      const isCdoc = item.id.startsWith('cdoc:')
      const isMdel = item.id.startsWith('mdel:')
      const sourceId = (item.custom_data as Record<string, unknown> | undefined)?._source_id as
        | string
        | undefined
      if ((isCdoc || isMdel) && sourceId) {
        if (isCdoc) {
          await withRetry(
            () =>
              updateConvDoc(sourceId, {
                content: { html: docBody ?? null },
              }),
            RETRY_CONFIGS.API_CALL,
          )
        } else if (isMdel) {
          await withRetry(
            () => updateMissionDeliverable(sourceId, { content: docBody }),
            RETRY_CONFIGS.API_CALL,
          )
        }
        onCampaignDocsRefresh?.()
      } else {
        await withRetry(
          () => storeUpdateItem(item.id, { doc_body: docBody }),
          RETRY_CONFIGS.API_CALL,
        )
      }
    },
    [activeSpaceId, item, onCampaignDocsRefresh, storeUpdateItem],
  )

  const persistDocBodyRef = useRef(persistDocBody)
  persistDocBodyRef.current = persistDocBody

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      // A pending debounced save must survive close/unmount — discarding it
      // silently loses everything typed in the last second.
      if (pendingDocBodyRef.current !== undefined) {
        void persistDocBodyRef.current(pendingDocBodyRef.current).catch(() => {})
        pendingDocBodyRef.current = undefined
      }
    }
  }, [])

  const runPersistDocBody = useCallback(
    async (docBody: string | null, rethrow: boolean) => {
      if (savingRef.current && savePromiseRef.current) {
        try {
          await savePromiseRef.current
        } catch (error) {
          if (rethrow) throw error
          return
        }
      }
      if (!activeSpaceId) return
      savingRef.current = true
      setSaveStatus('saving')
      const savePromise = persistDocBody(docBody)
      savePromiseRef.current = savePromise
      try {
        await savePromise
        unblockHydrationIfCurrent(docBody)
        setSaveStatus('saved')
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        toast.error('Failed to save document')
        setSaveStatus('error')
        if (rethrow) throw error
      } finally {
        if (savePromiseRef.current === savePromise) savePromiseRef.current = null
        savingRef.current = false
      }
    },
    [activeSpaceId, persistDocBody, unblockHydrationIfCurrent],
  )

  const flushDocBodyChange = useCallback(
    async (html: string) => {
      const docBody = html === '<p></p>' || html === '' ? null : html
      const baseline = baselineRef.current ?? null
      localDocBodyRef.current = docBody ?? ''
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      pendingDocBodyRef.current = undefined
      if ((docBody ?? null) === baseline) {
        docBodyHydrationBlockedRef.current = false
        onHydrationUnblocked?.()
        return
      }
      await runPersistDocBody(docBody, true)
    },
    [docBodyHydrationBlockedRef, onHydrationUnblocked, runPersistDocBody],
  )

  const handleDocBodyChange = useCallback(
    (html: string) => {
      const docBody = html === '<p></p>' || html === '' ? null : html
      const baseline = baselineRef.current ?? null
      if ((docBody ?? null) === baseline) {
        localDocBodyRef.current = docBody ?? ''
        docBodyHydrationBlockedRef.current = false
        onHydrationUnblocked?.()
        // Back at baseline: a still-pending timer would persist the stale
        // intermediate content, so drop it.
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        pendingDocBodyRef.current = undefined
        return
      }
      localDocBodyRef.current = docBody ?? ''
      docBodyHydrationBlockedRef.current = true

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setSaveStatus('idle')

      pendingDocBodyRef.current = docBody
      saveTimerRef.current = setTimeout(async () => {
        pendingDocBodyRef.current = undefined
        await runPersistDocBody(docBody, false)
      }, 1000)
    },
    [docBodyHydrationBlockedRef, onHydrationUnblocked, runPersistDocBody],
  )

  return { saveStatus, handleDocBodyChange, flushDocBodyChange, localDocBodyRef }
}
