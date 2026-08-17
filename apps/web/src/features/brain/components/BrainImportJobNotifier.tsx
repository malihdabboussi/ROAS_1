'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  acknowledgeImportNotifications,
  listPendingImportNotifications,
} from '../services/user-brain-import.service'
import { planBrainImportNotificationToasts } from './brain-import-job-toast'

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

      const plan = planBrainImportNotificationToasts(jobs)
      if (!queueVisibleRef.current) {
        for (const message of plan.successMessages) toast.success(message)
        for (const message of plan.infoMessages) toast.info(message)
        for (const message of plan.errorMessages) toast.error(message)
      }

      if (plan.acknowledgedIds.length) {
        await acknowledgeImportNotifications(plan.acknowledgedIds)
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
