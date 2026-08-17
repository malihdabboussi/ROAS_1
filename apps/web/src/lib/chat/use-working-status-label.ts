'use client'

import { useEffect, useState } from 'react'
import {
  CHAT_WORKING_STATUS_CYCLE_MS,
  CHAT_WORKING_STATUS_HOLD_MS,
  resolveWorkingStatusLabel,
} from './chat-working-status'

export function useWorkingStatusLabel(
  pinnedLabel: string | null | undefined,
  active: boolean,
): string {
  const [cycling, setCycling] = useState(false)
  const [cycleIndex, setCycleIndex] = useState(0)

  useEffect(() => {
    if (!active) {
      setCycling(false)
      setCycleIndex(0)
      return
    }
    setCycling(false)
    setCycleIndex(0)
    const holdMs = pinnedLabel?.trim() ? CHAT_WORKING_STATUS_HOLD_MS : 0
    let intervalId: number | undefined
    const timeoutId = window.setTimeout(() => {
      setCycling(true)
      intervalId = window.setInterval(() => {
        setCycleIndex((prev) => prev + 1)
      }, CHAT_WORKING_STATUS_CYCLE_MS)
    }, holdMs)
    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId !== undefined) window.clearInterval(intervalId)
    }
  }, [active, pinnedLabel])

  return resolveWorkingStatusLabel({ pinnedLabel, cycling, cycleIndex })
}
