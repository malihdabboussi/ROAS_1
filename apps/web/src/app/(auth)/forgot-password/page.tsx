'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { createClient } from '@/lib/supabase/client'

const FORGOT_QUOTES = [
  "We'll get you back in.",
  'Your account stays safe.',
  'A quick reset is all it takes.',
  'Almost there.',
  "We've got you.",
]

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setError(null)
    const redirectTo = `${window.location.origin}/oauth-callback?type=recovery&redirect=${encodeURIComponent('/reset-password')}`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) setError(error.message)
    else setStatus('If the email exists, a reset link has been sent.')
  }

  return (
    <AuthOrbShell quotes={FORGOT_QUOTES}>
      <div className="mb-spacing-6">
        <Link
          href="/login"
          className="body-3 text-muted-foreground hover:text-foreground gap-spacing-2 inline-flex items-center"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </div>
      <div className="mb-spacing-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Reset your password</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">We will email you a reset link.</p>
      </div>

      <form onSubmit={submit} className="space-y-spacing-3">
        <input
          type="email"
          required
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
          <span className="relative z-10">Send reset link</span>
        </button>
      </form>
    </AuthOrbShell>
  )
}
