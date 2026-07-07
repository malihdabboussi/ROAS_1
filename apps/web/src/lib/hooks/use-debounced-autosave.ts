'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RETRY_CONFIGS, withRetry } from '@/lib/utils/retry'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type UseDebouncedAutosaveParams<T> = {
  value: T
  getBaseline: () => T
  setBaseline: (value: T) => void
  enabled?: boolean
  debounceMs?: number
  equals?: (a: T, b: T) => boolean
  onSave: (value: T) => Promise<void>
  errorMessage?: string
}

export function useDebouncedAutosave<T>({
  value,
  getBaseline,
  setBaseline,
  enabled = true,
  debounceMs = 1000,
  equals = (a, b) => Object.is(a, b),
  onSave,
  errorMessage = 'Failed to save',
}: UseDebouncedAutosaveParams<T>) {
  const [saveStatus, setSaveStatus] = useState<AutosaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const savePromiseRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const runSave = useCallback(
    async (nextValue: T, rethrow: boolean) => {
      if (savingRef.current && savePromiseRef.current) {
        try {
          await savePromiseRef.current
        } catch (error) {
          if (rethrow) throw error
          return
        }
      }

      savingRef.current = true
      setSaveStatus('saving')
      const savePromise = withRetry(() => onSave(nextValue), RETRY_CONFIGS.API_CALL)
      savePromiseRef.current = savePromise

      try {
        await savePromise
        setBaseline(nextValue)
        setSaveStatus('saved')
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      } catch (error) {
        toast.error(errorMessage)
        setSaveStatus('error')
        if (rethrow) throw error
      } finally {
        if (savePromiseRef.current === savePromise) savePromiseRef.current = null
        savingRef.current = false
      }
    },
    [errorMessage, onSave, setBaseline],
  )

  const flush = useCallback(async () => {
    if (!enabled) return
    if (equals(value, getBaseline())) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    await runSave(value, true)
  }, [enabled, equals, getBaseline, runSave, value])

  useEffect(() => {
    if (!enabled) return
    if (equals(value, getBaseline())) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    setSaveStatus('idle')

    saveTimerRef.current = setTimeout(() => {
      void runSave(value, false)
    }, debounceMs)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [value, enabled, debounceMs, equals, getBaseline, runSave])

  return { saveStatus, flush }
}
