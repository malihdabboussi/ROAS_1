'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { reportClientError } from '@/lib/log-client-error'
import { resolveAuthSignupErrorMessage } from '../config/auth-toast-errors.config'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL

export default function InvitePage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const e = searchParams.get('email')
    const c = searchParams.get('code')
    if (e) setEmail(decodeURIComponent(e))
    if (c) setCode(decodeURIComponent(c))
  }, [searchParams])

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    if (!API_URL) {
      void reportClientError({
        feature: 'ui/auth_invite',
        error_code: 'api_url_missing',
        message: 'NEXT_PUBLIC_API_URL is not configured',
      })
      setError('NEXT_PUBLIC_API_URL is not configured.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/register-with-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      })
      if (!res.ok) {
        void reportClientError({
          feature: 'ui/auth_invite',
          error_code: 'register_with_invite_http_error',
          message: `register-with-invite failed: HTTP ${res.status}`,
          context: { status: res.status },
        })
      }
      const data = (await res.json()) as {
        error?: string
        statusCode?: number
        session?: { access_token?: string; refresh_token?: string }
      }
      if (data.error) {
        void reportClientError({
          feature: 'ui/auth_invite',
          error_code: 'register_with_invite_rejected',
          message: data.error,
        })
        setError(resolveAuthSignupErrorMessage(data.error))
        setLoading(false)
        return
      }
      const token = data.session?.access_token
      const refresh = data.session?.refresh_token ?? ''
      if (token) {
        const enc = encodeURIComponent(token)
        const refr = encodeURIComponent(refresh)
        window.location.href = `${window.location.origin}/callback?access_token=${enc}&refresh_token=${refr}&redirect=/home`
        return
      }
      void reportClientError({
        feature: 'ui/auth_invite',
        error_code: 'register_with_invite_no_session',
        message: 'register-with-invite returned no session token',
      })
      setError('Something went wrong.')
      setLoading(false)
    } catch {
      void reportClientError({
        feature: 'ui/auth_invite',
        error_code: 'register_with_invite_network_error',
        message: 'register-with-invite fetch failed',
      })
      setError('Could not connect. Try again.')
      setLoading(false)
    }
  }

  return (
    <div className="card-glass card-elevated text-card-foreground w-full max-w-[var(--container-auth)] rounded-[var(--spacing-4)] p-[var(--spacing-8)]">
      <div className="mb-[var(--spacing-6)] text-center">
        <img
          src="/Logos/roas/icon-black.png"
          alt="ROAS"
          className="mx-auto mb-[var(--spacing-3)] h-16 w-16 object-contain dark:hidden"
        />
        <img
          src="/Logos/roas/icon-white.png"
          alt="ROAS"
          className="mx-auto mb-[var(--spacing-3)] hidden h-16 w-16 object-contain dark:block"
        />
        <h1 className="title-h1 text-foreground">CREATE ACCOUNT</h1>
        <p className="body-2 text-muted-foreground mt-[var(--spacing-2)]">
          Enter the invite code from your email
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-[var(--spacing-4)]">
        <div>
          <label className="body-3 text-muted-foreground mb-[var(--spacing-1)] block">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-glass body-2 w-full rounded-[var(--spacing-2)] px-[var(--spacing-3)] py-[var(--spacing-2)]"
            placeholder="you@domain.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="body-3 text-muted-foreground mb-[var(--spacing-1)] block">
            Invite code
          </label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input-glass body-2 w-full rounded-[var(--spacing-2)] px-[var(--spacing-3)] py-[var(--spacing-2)]"
            placeholder="Your code"
            autoComplete="one-time-code"
          />
        </div>
        <div>
          <label className="body-3 text-muted-foreground mb-[var(--spacing-1)] block">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-glass body-2 w-full rounded-[var(--spacing-2)] px-[var(--spacing-3)] py-[var(--spacing-2)] pr-10"
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <p className="body-3 text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="button-glass-primary body-2 w-full rounded-[var(--spacing-2)] py-[var(--spacing-3)] font-medium disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="body-3 text-muted-foreground mt-[var(--spacing-6)] text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-primary underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
