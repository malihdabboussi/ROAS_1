'use client'

import { useState } from 'react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { createClient } from '@/lib/supabase/client'

const VERIFY_QUOTES = [
  'One more step.',
  'Check your inbox.',
  "We're holding your spot.",
  'Almost in.',
  'Your confirmation is on the way.',
]

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const resend = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setError(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) setError(error.message)
    else setStatus('Verification email sent. Check your inbox.')
  }

  return (
    <AuthOrbShell quotes={VERIFY_QUOTES}>
      <div className="mb-spacing-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Verify your email</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          We sent a confirmation link to your email.
        </p>
      </div>

      <form onSubmit={resend} className="space-y-spacing-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="input-glass h-spacing-10 rounded-spacing-2 w-full"
        />
        {status && <p className="body-3 text-muted-foreground">{status}</p>}
        {error && <p className="body-3 text-destructive">{error}</p>}
        <button
          type="submit"
          className="chip-glass-green rounded-spacing-2 w-full px-4 py-2.5 font-medium"
        >
          <span className="relative z-10">Resend confirmation</span>
        </button>
      </form>
    </AuthOrbShell>
  )
}
