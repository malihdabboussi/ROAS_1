'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReportingDateRangeInput } from '@/lib/reporting'

type BrainVisualizationQueueStatusJob = {
  status?: string | null
}

type UseBrainVisualizationUiStateInput = {
  queueJobs: readonly BrainVisualizationQueueStatusJob[]
}

export function useBrainVisualizationUiState({ queueJobs }: UseBrainVisualizationUiStateInput) {
  const [brainNodesMonochrome, setBrainNodesMonochrome] = useState(false)
  const [brainDateRange, setBrainDateRange] = useState<ReportingDateRangeInput>({
    time_range: 'all',
  })
  const [experiencesOnly, setExperiencesOnly] = useState(false)
  const [isMobileBrain, setIsMobileBrain] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobileBrain(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('brain-queue-visibility', { detail: { visible: true } }))
    return () => {
      window.dispatchEvent(
        new CustomEvent('brain-queue-visibility', { detail: { visible: false } }),
      )
    }
  }, [])

  const activeQueueCount = useMemo(
    () =>
      queueJobs.filter(
        (job) => job.status === 'queued' || job.status === 'processing' || job.status === 'retry',
      ).length,
    [queueJobs],
  )

  const toggleBrainNodesMonochrome = useCallback(() => {
    setBrainNodesMonochrome((value) => !value)
  }, [])

  const handleBrainDateRangePatch = useCallback((patch: Partial<ReportingDateRangeInput>) => {
    setBrainDateRange((prev) => ({
      ...prev,
      ...patch,
    }))
  }, [])

  const handleClearBrainDateRange = useCallback(() => {
    setBrainDateRange({ time_range: 'all' })
  }, [])

  return {
    activeQueueCount,
    brainDateRange,
    brainNodesMonochrome,
    experiencesOnly,
    handleBrainDateRangePatch,
    handleClearBrainDateRange,
    isMobileBrain,
    setExperiencesOnly,
    toggleBrainNodesMonochrome,
  }
}
