import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { updateConvDoc, updateMissionDeliverable } from '@/lib/services/docs-api'
import type { SpaceItem } from '../../../types'

type UseDocItemUpdateParams = {
  item: SpaceItem
  setItem: Dispatch<SetStateAction<SpaceItem>>
  storeUpdateItem: (id: string, patch: Partial<SpaceItem>) => Promise<void>
  flushDocBodyRef: MutableRefObject<(() => Promise<void>) | null>
  onCampaignDocsRefresh?: () => void
}

export function useDocItemUpdate({
  item,
  setItem,
  storeUpdateItem,
  flushDocBodyRef,
  onCampaignDocsRefresh,
}: UseDocItemUpdateParams) {
  return useCallback(
    async (patch: Partial<SpaceItem>) => {
      const prev = item
      setItem(
        (cur) =>
          ({
            ...cur,
            ...patch,
            // custom_data is shallow-merged server-side; mirror that locally so a
            // single-key patch never drops the item's other custom_data values.
            ...(patch.custom_data !== undefined
              ? { custom_data: { ...(cur.custom_data ?? {}), ...patch.custom_data } }
              : {}),
          }) as SpaceItem,
      )
      const isCdoc = item.id.startsWith('cdoc:')
      const isMdel = item.id.startsWith('mdel:')
      const synthetic = isCdoc || isMdel
      const sourceId = (item.custom_data as Record<string, unknown> | undefined)?._source_id as
        | string
        | undefined
      try {
        // Flush unsaved body text first: this metadata write echoes back through
        // the store resync / realtime row replace, and that echo carries the
        // row's doc_body — which must already hold the current editor text.
        try {
          await flushDocBodyRef.current?.()
        } catch {
          /* autosave surfaces its own failure; the metadata write still proceeds */
        }
        if (synthetic && sourceId) {
          let persisted = false
          if (typeof patch.title === 'string') {
            persisted = true
            if (isCdoc) await updateConvDoc(sourceId, { title: patch.title })
            else if (isMdel) await updateMissionDeliverable(sourceId, { title: patch.title })
          }
          if (patch.custom_data && '_doc_cover_url' in patch.custom_data) {
            const raw = (patch.custom_data as Record<string, unknown>)._doc_cover_url
            const meta =
              raw === undefined
                ? undefined
                : { _doc_cover_url: typeof raw === 'string' && raw.trim() ? raw : null }
            if (meta) {
              persisted = true
              if (isCdoc) await updateConvDoc(sourceId, { metadata: meta })
              else if (isMdel) await updateMissionDeliverable(sourceId, { metadata: meta })
            }
          }
          if (persisted) {
            onCampaignDocsRefresh?.()
          }
          return
        }
        await storeUpdateItem(item.id, patch)
      } catch {
        setItem(prev)
        toast.error('Failed to update document')
      }
    },
    [item, setItem, storeUpdateItem, flushDocBodyRef, onCampaignDocsRefresh],
  )
}
