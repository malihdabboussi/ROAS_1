'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BRAIN_QUEUE_REFRESH_EVENT } from '../lib/brain-training-modal.events'
import {
  cancelImportJob,
  dismissImportJob,
  listActiveImportJobs,
  retryImportJob,
  type BrainQueueJob,
} from '../services/user-brain-import.service'

export type BrainQueueUiJob = BrainQueueJob & { isFading?: boolean; isRetrying?: boolean }

interface UseBrainQueueOptions {
  onJobComplete?: (job: BrainQueueJob) => void
  brainId?: string | null
  campaignId?: string | null
  targetBrain?: 'user' | 'all' | null
  limit?: number
  enabled?: boolean
  /** Keep succeeded jobs visible (Activity tab). Default false removes them after 10s. */
  retainCompleted?: boolean
}

function brainQueueScopeKey(scope: {
  brainId?: string | null
  campaignId?: string | null
  targetBrain?: 'user' | 'all' | null
  limit?: number | null
}) {
  const target = scope.brainId
    ? `brain:${scope.brainId}`
    : scope.campaignId
      ? `campaign:${scope.campaignId}`
      : scope.targetBrain
        ? `target:${scope.targetBrain}`
        : 'global'
  return `${target}:limit:${scope.limit ?? ''}`
}

const queueSnapshotByScope = new Map<string, BrainQueueJob[]>()
const EMPTY_QUEUE_JOBS: BrainQueueJob[] = []

export function useBrainQueue(options?: UseBrainQueueOptions) {
  const [jobs, setJobs] = useState<BrainQueueJob[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingById, setRetryingById] = useState<Record<string, boolean>>({})
  const jobsRef = useRef<BrainQueueJob[]>([])
  const jobsScopeKeyRef = useRef<string | null>(null)
  const enabledRef = useRef(options?.enabled ?? true)
  const onJobCompleteRef = useRef(options?.onJobComplete)
  const scopeRef = useRef({
    brainId: options?.brainId,
    campaignId: options?.campaignId,
    targetBrain: options?.targetBrain,
    limit: options?.limit,
  })
  const fadingIdsRef = useRef<Set<string>>(new Set())
  const dismissedIdsRef = useRef<Set<string>>(new Set())
  const completionNotifiedRef = useRef<Set<string>>(new Set())
  const scheduledRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const fadeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    onJobCompleteRef.current = options?.onJobComplete
    enabledRef.current = options?.enabled ?? true
    scopeRef.current = {
      brainId: options?.brainId,
      campaignId: options?.campaignId,
      targetBrain: options?.targetBrain,
      limit: options?.limit,
    }
  })

  const refresh = useCallback(async () => {
    if (!enabledRef.current) return
    const requestedScope = scopeRef.current
    const requestedScopeKey = brainQueueScopeKey(requestedScope)
    try {
      const fetched = await listActiveImportJobs(requestedScope)
      if (!enabledRef.current || brainQueueScopeKey(scopeRef.current) !== requestedScopeKey) return
      const next = fetched.filter((job) => !dismissedIdsRef.current.has(job.id))
      const previousById = new Map(jobsRef.current.map((job) => [job.id, job]))
      setJobs(next)
      jobsRef.current = next
      jobsScopeKeyRef.current = requestedScopeKey
      queueSnapshotByScope.set(requestedScopeKey, next)

      for (const job of next) {
        const prev = previousById.get(job.id)
        const becameComplete =
          (job.status === 'succeeded' || job.status === 'failed') &&
          (!prev || (prev.status !== 'succeeded' && prev.status !== 'failed'))
        if (becameComplete && !completionNotifiedRef.current.has(job.id)) {
          completionNotifiedRef.current.add(job.id)
          onJobCompleteRef.current?.(job)
        }
      }
    } catch {
      // Silently ignore transient fetch errors
    }
  }, [])

  const brainId = options?.brainId ?? null
  const campaignId = options?.campaignId ?? null
  const targetBrain = options?.targetBrain ?? null
  const limit = options?.limit ?? null
  const enabled = options?.enabled ?? true
  const scopeKey = useMemo(
    () => brainQueueScopeKey({ brainId, campaignId, targetBrain, limit }),
    [brainId, campaignId, targetBrain, limit],
  )

  useEffect(() => {
    dismissedIdsRef.current.clear()
    completionNotifiedRef.current.clear()
    setRetryingById({})
    for (const timer of scheduledRef.current.values()) clearTimeout(timer)
    for (const timer of fadeTimersRef.current.values()) clearTimeout(timer)
    scheduledRef.current.clear()
    fadeTimersRef.current.clear()
    if (!enabled) {
      setJobs([])
      jobsRef.current = []
      jobsScopeKeyRef.current = null
      setLoading(false)
      return
    }

    const cached = queueSnapshotByScope.get(scopeKey) ?? []
    setJobs(cached)
    jobsRef.current = cached
    jobsScopeKeyRef.current = scopeKey
    setLoading(cached.length === 0)
    void (async () => {
      try {
        await refresh()
      } finally {
        setLoading(false)
      }
    })()
  }, [brainId, campaignId, targetBrain, limit, enabled, refresh, scopeKey])

  useEffect(() => {
    if (!enabled) return

    const onQueueRefresh = () => void refresh()
    window.addEventListener(BRAIN_QUEUE_REFRESH_EVENT, onQueueRefresh)
    return () => window.removeEventListener(BRAIN_QUEUE_REFRESH_EVENT, onQueueRefresh)
  }, [enabled, refresh])

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted || !user) return
      channel = supabase
        .channel(`brain-queue-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'brain_import_jobs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refresh()
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'brain_ops_outbox',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void refresh()
          },
        )
        .subscribe()
    }

    void subscribe()

    return () => {
      mounted = false
      if (channel) void supabase.removeChannel(channel)
    }
  }, [enabled, refresh])

  useEffect(() => {
    if (!enabled) return

    const hasActiveJobs = jobsRef.current.some(
      (j) => j.status === 'queued' || j.status === 'processing' || j.status === 'retry',
    )
    if (!hasActiveJobs && !loading) return

    const interval = setInterval(() => void refresh(), 4000)
    return () => clearInterval(interval)
  }, [enabled, jobs, loading, refresh])

  useEffect(() => {
    if (options?.retainCompleted) return

    for (const job of jobs) {
      if (job.status === 'failed') continue
      const complete = job.status === 'succeeded'
      if (!complete || scheduledRef.current.has(job.id)) continue

      const removeTimer = setTimeout(() => {
        fadingIdsRef.current.add(job.id)
        const fadeTimer = setTimeout(() => {
          setJobs((prev) => {
            const next = prev.filter((item) => item.id !== job.id)
            jobsRef.current = next
            if (jobsScopeKeyRef.current) queueSnapshotByScope.set(jobsScopeKeyRef.current, next)
            return next
          })
          dismissedIdsRef.current.add(job.id)
          fadingIdsRef.current.delete(job.id)
          scheduledRef.current.delete(job.id)
          fadeTimersRef.current.delete(job.id)
        }, 300)
        fadeTimersRef.current.set(job.id, fadeTimer)
      }, 10000)
      scheduledRef.current.set(job.id, removeTimer)
    }

    const activeIds = new Set(jobs.map((job) => job.id))
    for (const [jobId, timer] of scheduledRef.current.entries()) {
      if (!activeIds.has(jobId)) {
        clearTimeout(timer)
        scheduledRef.current.delete(jobId)
      }
    }
    for (const [jobId, timer] of fadeTimersRef.current.entries()) {
      if (!activeIds.has(jobId)) {
        clearTimeout(timer)
        fadeTimersRef.current.delete(jobId)
      }
    }
  }, [jobs, options?.retainCompleted])

  useEffect(() => {
    return () => {
      for (const timer of scheduledRef.current.values()) clearTimeout(timer)
      for (const timer of fadeTimersRef.current.values()) clearTimeout(timer)
      scheduledRef.current.clear()
      fadeTimersRef.current.clear()
    }
  }, [])

  const visibleJobs = useMemo(
    () =>
      !enabled
        ? EMPTY_QUEUE_JOBS
        : jobsScopeKeyRef.current === scopeKey
        ? jobs
        : (queueSnapshotByScope.get(scopeKey) ?? EMPTY_QUEUE_JOBS),
    [enabled, jobs, scopeKey],
  )

  const uiJobs = useMemo<BrainQueueUiJob[]>(
    () =>
      visibleJobs.map((job) => ({
        ...job,
        isFading: fadingIdsRef.current.has(job.id),
        isRetrying: retryingById[job.id] === true,
      })),
    [visibleJobs, retryingById],
  )

  const cancel = useCallback(
    async (jobId: string) => {
      try {
        await cancelImportJob(jobId)
        void refresh()
      } catch {}
    },
    [refresh],
  )

  const retry = useCallback(
    async (jobId: string) => {
      setRetryingById((prev) => ({ ...prev, [jobId]: true }))
      setJobs((prev) => {
        const next = prev.map(
          (job): BrainQueueJob =>
            job.id === jobId
              ? {
                  ...job,
                  status: 'retry' as const,
                  last_error: null,
                  completed_at: null,
                }
              : job,
        )
        jobsRef.current = next
        return next
      })
      try {
        await retryImportJob(jobId)
        await refresh()
      } catch {
      } finally {
        setRetryingById((prev) => {
          const { [jobId]: _removed, ...rest } = prev
          return rest
        })
      }
    },
    [refresh],
  )

  const dismiss = useCallback(
    async (jobId: string) => {
      try {
        await dismissImportJob(jobId)
        void refresh()
      } catch {}
    },
    [refresh],
  )

  return { jobs: uiJobs, loading, refresh, cancel, retry, dismiss }
}
