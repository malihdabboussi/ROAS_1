'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  acknowledgeImportNotifications,
  listPendingImportNotifications,
  type BrainImportNotificationJob,
} from '../services/user-brain-import.service'

function buildSuccessMessage(job: BrainImportNotificationJob): string {
  const result = (job.result ?? {}) as { memories_created?: number; snapshots_created?: number }
  const memories = typeof result.memories_created === 'number' ? result.memories_created : null
  const snapshots = typeof result.snapshots_created === 'number' ? result.snapshots_created : null
  if (memories != null || snapshots != null) {
    return `Import done: ${snapshots ?? 0} snapshot(s), ${memories ?? 0} memory(ies)`
  }
  return `Import done: ${job.title}`
}

function buildFailureMessage(job: BrainImportNotificationJob): string {
  const err = typeof job.last_error === 'string' && job.last_error.trim() ? job.last_error : null
  return err ? `Import failed: ${err}` : `Import failed: ${job.title}`
}

function failureToastKey(job: BrainImportNotificationJob): string {
  const err = typeof job.last_error === 'string' ? job.last_error.trim() : ''
  return err || `title:${job.title}`
}

export function BrainImportJobNotifier() {
  const inFlightRef = useRef(false)
  const queueVisibleRef = useRef(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const refreshAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!cancelled) setAuthenticated(!!session?.access_token)
    }

    void refreshAuth()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshAuth()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const processPending = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession()
      if (!session?.access_token) return
      const jobs = await listPendingImportNotifications()
      if (!jobs.length) return

      const acknowledgedIds: string[] = []
      const failureGroups = new Map<string, BrainImportNotificationJob[]>()

      for (const job of jobs) {
        if (job.status === 'succeeded') {
          if (!queueVisibleRef.current) {
            toast.success(buildSuccessMessage(job))
          }
          acknowledgedIds.push(job.id)
          continue
        }
        if (job.status === 'failed') {
          const key = failureToastKey(job)
          const group = failureGroups.get(key) ?? []
          group.push(job)
          failureGroups.set(key, group)
          acknowledgedIds.push(job.id)
        }
      }

      if (!queueVisibleRef.current) {
        for (const group of failureGroups.values()) {
          const first = group[0]
          if (!first) continue
          if (group.length === 1) {
            toast.error(buildFailureMessage(first))
            continue
          }
          toast.error(
            `Import failed (${group.length}): ${
              typeof first.last_error === 'string' && first.last_error.trim()
                ? first.last_error
                : first.title
            }`,
          )
        }
      }

      if (acknowledgedIds.length) {
        await acknowledgeImportNotifications(acknowledgedIds)
      }
    } catch {
      // Keep notifier silent on transient errors.
    } finally {
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!authenticated) return
    void processPending()
  }, [authenticated, processPending])

  useEffect(() => {
    const handleVisibility = (event: Event) => {
      const custom = event as CustomEvent<{ visible?: boolean }>
      queueVisibleRef.current = custom.detail?.visible === true
    }
    window.addEventListener('brain-queue-visibility', handleVisibility as EventListener)
    return () => {
      window.removeEventListener('brain-queue-visibility', handleVisibility as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!authenticated) return

    const supabase = createClient()
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const subscribe = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!mounted || !user) return

      channel = supabase
        .channel(`brain-import-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'brain_import_jobs',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const nextStatus = (payload.new as { status?: string } | null)?.status
            if (nextStatus === 'succeeded' || nextStatus === 'failed') {
              void processPending()
            }
          },
        )
        .subscribe()
    }

    void subscribe()

    return () => {
      mounted = false
      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [authenticated, processPending])

  return null
}
