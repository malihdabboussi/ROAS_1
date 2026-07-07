'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { createClient } from '@/lib/supabase/client'

const RESET_QUOTES = [
  'Fresh start, same you.',
  'Lock it in.',
  'Strong passwords win.',
  'Welcome back in a moment.',
  'Your account, your rules.',
]

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const supabase = createClient()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else {
      setStatus('Password updated. Redirecting…')
      setTimeout(() => (window.location.href = '/login'), 1200)
    }
  }

  return (
    <AuthOrbShell quotes={RESET_QUOTES}>
      <div className="mb-spacing-6">
        <Link
          href="/login"
          className="body-3 text-muted-foreground hover:text-foreground gap-spacing-2 inline-flex items-center"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </div>
      <div className="mb-spacing-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Set a new password</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-spacing-3">
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="input-glass h-spacing-10 rounded-spacing-2 w-full"
        />
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          className="input-glass h-spacing-10 rounded-spacing-2 w-full"
        />
        {error && <p className="body-3 text-destructive">{error}</p>}
        {status && <p className="body-3 text-muted-foreground">{status}</p>}
        <button
          type="submit"
          className="chip-glass-green rounded-spacing-2 w-full px-4 py-2.5 font-medium"
        >
          <span className="relative z-10">Update password</span>
        </button>
      </form>
    </AuthOrbShell>
  )
}
