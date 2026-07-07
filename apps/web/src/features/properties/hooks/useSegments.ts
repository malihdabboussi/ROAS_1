'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CreateSegmentRequest, Segment, UpdateSegmentRequest } from '@/lib/properties/segments'
import { segmentsApi } from '../services/segments-api'

interface UseSegmentsReturn {
  segments: Segment[]
  isLoading: boolean
  error: string | null
  createSegment: (data: CreateSegmentRequest) => Promise<Segment>
  updateSegment: (segmentId: string, data: UpdateSegmentRequest) => Promise<Segment>
  deleteSegment: (segmentId: string) => Promise<void>
  refreshSegments: () => Promise<void>
}

export function useSegments(opts?: { enabled?: boolean }): UseSegmentsReturn {
  const enabled = opts?.enabled ?? true
  const [segments, setSegments] = useState<Segment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSegments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await segmentsApi.getSegments()
      setSegments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load segments')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // `enabled: false` defers the fetch until the consumer actually needs the
  // data (e.g. a panel that is mounted closed); flipping to true loads.
  useEffect(() => {
    if (!enabled) return
    loadSegments()
  }, [enabled, loadSegments])

  const createSegment = useCallback(async (data: CreateSegmentRequest): Promise<Segment> => {
    const newSegment = await segmentsApi.createSegment(data)
    setSegments((prev) => [...prev, newSegment])
    return newSegment
  }, [])

  const updateSegment = useCallback(
    async (segmentId: string, data: UpdateSegmentRequest): Promise<Segment> => {
      const updatedSegment = await segmentsApi.updateSegment(segmentId, data)
      setSegments((prev) => prev.map((s) => (s.id === segmentId ? updatedSegment : s)))
      return updatedSegment
    },
    [],
  )

  const deleteSegment = useCallback(async (segmentId: string): Promise<void> => {
    await segmentsApi.deleteSegment(segmentId)
    setSegments((prev) => prev.filter((s) => s.id !== segmentId))
  }, [])

  const refreshSegments = useCallback(async () => {
    await loadSegments()
  }, [loadSegments])

  return {
    segments,
    isLoading,
    error,
    createSegment,
    updateSegment,
    deleteSegment,
    refreshSegments,
  }
}
