'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

type PageState = 'loading' | 'ready' | 'success' | 'already' | 'error' | 'invalid'

export default function UnsubscribePage() {
  const params = useParams()
  const token = params.token as string

  const [state, setState] = useState<PageState>('loading')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

  useEffect(() => {
    if (!token) return
    const check = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/email/unsubscribe/${token}`)
        const data = await res.json()
        if (!data.valid) {
          setState('invalid')
          return
        }
        setEmail(data.email || '')
        setState(data.isUnsubscribed ? 'already' : 'ready')
      } catch {
        setState('invalid')
      }
    }
    check()
  }, [token, backendUrl])

  const handleUnsubscribe = async () => {
    setIsProcessing(true)
    setError('')
    try {
      const res = await fetch(`${backendUrl}/api/email/unsubscribe/${token}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setEmail(data.email || email)
        setState(data.alreadyUnsubscribed ? 'already' : 'success')
      } else {
        setError(data.error || 'Failed to unsubscribe')
        setState('error')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setState('error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0a0a0a] p-6 text-white">
      <div className="w-full max-w-[440px] rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-lg font-bold text-black">
            V
          </div>
        </div>

        {state === 'loading' && (
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm text-white/50">Loading...</p>
          </div>
        )}

        {state === 'invalid' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mb-2 text-lg font-semibold">Invalid Link</h1>
            <p className="text-sm text-white/50">
              This unsubscribe link is invalid or has expired.
            </p>
          </div>
        )}

        {state === 'ready' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <svg
                className="h-6 w-6 text-white/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="mb-2 text-lg font-semibold">Unsubscribe</h1>
            <p className="mb-6 text-sm text-white/50">
              {email
                ? `Unsubscribe ${email} from future emails?`
                : 'Unsubscribe from future emails?'}
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleUnsubscribe}
              disabled={isProcessing}
              className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Unsubscribe from All Emails'}
            </button>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <svg
                className="h-6 w-6 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-2 text-lg font-semibold">Unsubscribed</h1>
            <p className="text-sm text-white/50">
              {email ? `${email} has` : 'You have'} been successfully unsubscribed.
            </p>
          </div>
        )}

        {state === 'already' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <svg
                className="h-6 w-6 text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
                <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} />
              </svg>
            </div>
            <h1 className="mb-2 text-lg font-semibold">Already Unsubscribed</h1>
            <p className="text-sm text-white/50">
              {email ? `${email} is` : 'This email is'} already unsubscribed. No further action
              needed.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="mb-2 text-lg font-semibold">Something Went Wrong</h1>
            <p className="mb-4 text-sm text-white/50">
              {error || "We couldn't process your request."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/5"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="mt-8 border-t border-white/5 pt-4 text-center">
          <p className="text-[11px] text-white/20">Powered by ROAS</p>
        </div>
      </div>
    </main>
  )
}
