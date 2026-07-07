'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useWaitlistModal } from '@/components/WaitlistModalProvider'

export function WaitlistUrlOpener() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { openWaitlist } = useWaitlistModal()
  const consumedRef = useRef(false)

  useEffect(() => {
    if (searchParams.get('openWaitlist') !== '1') {
      consumedRef.current = false
      return
    }
    if (consumedRef.current) return
    consumedRef.current = true
    const plan = searchParams.get('plan')
    openWaitlist(plan ? `Interested in plan: ${plan}` : '')
    const q = new URLSearchParams(searchParams.toString())
    q.delete('openWaitlist')
    q.delete('plan')
    const next = q.toString() ? `${pathname}?${q}` : pathname || '/'
    router.replace(next)
  }, [searchParams, pathname, router, openWaitlist])

  return null
}
