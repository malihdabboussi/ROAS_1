import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { toast } from 'sonner'
import { ADS_TOAST_ERRORS } from '@/features/studio/config/ads-toast-errors.config'
import { updateAd } from '../../services/artifact-preview.service'
import type { Ad, AdFormat } from '../../types'
import type { FieldState } from './ad-settings-panel-primitives'

interface UseAdSettingsFieldSavesParams {
  adId: string
  saveVersion: MutableRefObject<number>
  setAd: Dispatch<SetStateAction<Ad | null>>
  onAdUpdated?: (ad: Ad) => void
  mergeAdResponse: (prev: Ad | null, updated: Ad) => Ad
}

export function useAdSettingsFieldSaves({
  adId,
  saveVersion,
  setAd,
  onAdUpdated,
  mergeAdResponse,
}: UseAdSettingsFieldSavesParams) {
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({})
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const saveField = useCallback(
    async (field: string, value: string | null) => {
      const v = ++saveVersion.current
      setFieldStates((prev) => ({ ...prev, [field]: 'saving' }))
      try {
        const updated = await updateAd(adId, { [field]: value })
        if (saveVersion.current === v)
          setAd((prev) => {
            const next = mergeAdResponse(prev, updated)
            onAdUpdated?.(next)
            return next
          })
        else onAdUpdated?.(updated)
        setFieldStates((prev) => ({ ...prev, [field]: 'saved' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, [field]: 'idle' })), 1500)
      } catch {
        toast.error(ADS_TOAST_ERRORS.SAVE_FAILED.userMessage)
        setFieldStates((prev) => ({ ...prev, [field]: 'error' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, [field]: 'idle' })), 3000)
      }
    },
    [adId, mergeAdResponse, onAdUpdated, saveVersion, setAd],
  )

  const handleChange = useCallback(
    (field: string, value: string | null) => {
      setAd((prev) => (prev ? { ...prev, [field]: value } : prev))
      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field])
      debounceTimers.current[field] = setTimeout(() => saveField(field, value), 800)
    },
    [saveField, setAd],
  )

  const handleSelectChange = useCallback(
    (field: string, value: string | null) => {
      setAd((prev) => (prev ? { ...prev, [field]: value } : prev))
      void saveField(field, value)
    },
    [saveField, setAd],
  )

  const handleAdFormatChange = useCallback(
    (value: AdFormat) => {
      const ver = ++saveVersion.current
      setAd((prev) => (prev ? { ...prev, ad_format: value } : prev))
      updateAd(adId, { ad_format: value })
        .then((updated) => {
          if (saveVersion.current !== ver) return
          const resolved =
            (updated.ad_format || 'SINGLE_IMAGE') === value
              ? updated
              : { ...updated, ad_format: value }
          setAd((prev) => mergeAdResponse(prev, resolved))
          onAdUpdated?.(resolved)
        })
        .catch((err) =>
          toast.error(
            err instanceof Error ? err.message : ADS_TOAST_ERRORS.SAVE_FAILED.userMessage,
          ),
        )
    },
    [adId, mergeAdResponse, onAdUpdated, saveVersion, setAd],
  )

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  return {
    fieldStates,
    setFieldStates,
    handleChange,
    handleSelectChange,
    handleAdFormatChange,
  }
}
