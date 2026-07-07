'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL

const QUOTES = ['Fast-tracking your access.', 'Almost there.', 'Your Ultra subscription is ready.']

export default function FastTrackSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id') ?? ''

  const [status, setStatus] = useState<'polling' | 'ready' | 'error'>('polling')
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || !API_URL) {
      setStatus('error')
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 30

    async function poll() {
      while (!cancelled && attempts < maxAttempts) {
        attempts++
        try {
          const url = `${API_URL}/api/waitlist/fast-track-status/${encodeURIComponent(sessionId)}`
          const res = await fetch(url)
          const data = (await res.json()) as { status: string; inviteCode: string | null }

          if (data.status === 'paid' && data.inviteCode) {
            if (!cancelled) {
              setInviteCode(data.inviteCode)
              setStatus('ready')
            }
            return
          }

          if (data.status === 'failed' || data.status === 'not_found') {
            if (!cancelled) setStatus('error')
            return
          }
        } catch {
          /* poll error — retry */
        }

        await new Promise((r) => setTimeout(r, 2000))
      }

      if (!cancelled) setStatus('error')
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  useEffect(() => {
    if (status === 'ready' && inviteCode) {
      document.cookie = `vibey-ft-session=${encodeURIComponent(sessionId)}; path=/; max-age=3600; SameSite=Lax`
      window.location.href = `/join?code=${encodeURIComponent(inviteCode)}`
    }
  }, [status, inviteCode, sessionId])

  if (status === 'error') {
    return (
      <AuthOrbShell quotes={QUOTES}>
        <div className="text-center">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            SOMETHING WENT WRONG
          </h1>
          <p className="body-2 text-muted-foreground mt-spacing-2">
            We couldn&apos;t verify your payment. Contact support if you were charged.
          </p>
        </div>
      </AuthOrbShell>
    )
  }

  return (
    <AuthOrbShell quotes={QUOTES}>
      <div className="text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">PAYMENT CONFIRMED</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">Setting up your access…</p>
        <div className="mt-spacing-6 flex justify-center">
          <div className="border-muted-foreground border-t-foreground h-6 w-6 animate-spin rounded-full border-2" />
        </div>
      </div>
    </AuthOrbShell>
  )
}
