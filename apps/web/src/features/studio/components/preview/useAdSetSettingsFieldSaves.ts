import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { ADS_TOAST_ERRORS } from '../../config/ads-toast-errors.config'
import { updateAdSet } from '../../services/artifact-preview.service'
import type { AdSet } from '../../types'

export type FieldState = 'idle' | 'saving' | 'saved' | 'error'

export type AdSetSettingsSaveField = (
  field: string,
  value: unknown,
  displayKey?: string,
) => Promise<void>

interface UseAdSetSettingsFieldSavesParams {
  adSetId: string
  setData: Dispatch<SetStateAction<AdSet | null>>
  onUpdated?: (adSet: AdSet) => void
  onAdSetChange?: (adSet: AdSet) => void
}

function formatBudgetDisplay(cents: number | null): string {
  if (cents === null || cents === 0) return ''
  return (cents / 100).toFixed(2)
}

function parseBudgetInput(val: string): number | null {
  const n = parseFloat(val)
  if (isNaN(n) || n <= 0) return null
  return Math.round(n * 100)
}

export function useAdSetSettingsFieldSaves({
  adSetId,
  setData,
  onUpdated,
  onAdSetChange,
}: UseAdSetSettingsFieldSavesParams) {
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({})
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [dailyBudgetText, setDailyBudgetText] = useState('')
  const [lifetimeBudgetText, setLifetimeBudgetText] = useState('')

  const scheduleDebouncedSave = useCallback(
    (key: string, callback: () => void, delayMs = 800) => {
      if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key])
      debounceTimers.current[key] = setTimeout(callback, delayMs)
    },
    [],
  )

  const syncBudgetText = useCallback((adSet: Pick<AdSet, 'daily_budget' | 'lifetime_budget'>) => {
    setDailyBudgetText(formatBudgetDisplay(adSet.daily_budget))
    setLifetimeBudgetText(formatBudgetDisplay(adSet.lifetime_budget))
  }, [])

  const saveField = useCallback<AdSetSettingsSaveField>(
    async (field, value, displayKey) => {
      const key = displayKey ?? field
      setFieldStates((prev) => ({ ...prev, [key]: 'saving' }))
      try {
        const updated = await updateAdSet(adSetId, { [field]: value })
        setData(updated)
        onUpdated?.(updated)
        setFieldStates((prev) => ({ ...prev, [key]: 'saved' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, [key]: 'idle' })), 1500)
      } catch {
        toast.error(ADS_TOAST_ERRORS.SAVE_FAILED.userMessage)
        setFieldStates((prev) => ({ ...prev, [key]: 'error' }))
        setTimeout(() => setFieldStates((prev) => ({ ...prev, [key]: 'idle' })), 3000)
      }
    },
    [adSetId, onUpdated, setData],
  )

  const handleTextChange = useCallback(
    (field: string, value: string) => {
      setData((prev) => {
        if (!prev) return prev
        const next = { ...prev, [field]: value }
        onAdSetChange?.(next)
        return next
      })
      scheduleDebouncedSave(field, () => void saveField(field, value))
    },
    [onAdSetChange, saveField, scheduleDebouncedSave, setData],
  )

  const handleSelectChange = useCallback(
    (field: string, value: string) => {
      setData((prev) => (prev ? { ...prev, [field]: value } : prev))
      void saveField(field, value)
    },
    [saveField, setData],
  )

  const handleBudgetChange = useCallback(
    (field: 'daily_budget' | 'lifetime_budget', textValue: string) => {
      if (field === 'daily_budget') setDailyBudgetText(textValue)
      else setLifetimeBudgetText(textValue)
      scheduleDebouncedSave(field, () => {
        const cents = parseBudgetInput(textValue)
        void saveField(field, cents)
      })
    },
    [saveField, scheduleDebouncedSave],
  )

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout)
    }
  }, [])

  return {
    fieldStates,
    dailyBudgetText,
    lifetimeBudgetText,
    syncBudgetText,
    saveField,
    handleTextChange,
    handleSelectChange,
    handleBudgetChange,
    scheduleDebouncedSave,
  }
}
