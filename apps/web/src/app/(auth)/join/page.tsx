'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import {
  VIBEY_DIRECT_INVITE_CODE_KEY,
  VIBEY_DIRECT_INVITE_STORAGE_KEY,
} from '@/app/(auth)/onboarding/lib/onboarding-access'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { reportClientError } from '@/lib/log-client-error'
import { createClient } from '@/lib/supabase/client'
import { resolveAuthSignupErrorMessage } from '../config/auth-toast-errors.config'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL
const LAST_PROVIDER_KEY = 'vibey-last-auth-provider'

const SIGNUP_QUOTES = [
  'Start building with your AI team.',
  'Your workspace starts here.',
  'Ideas deserve a home.',
  'Create something worth shipping.',
  'Welcome to the future of work.',
]

export default function JoinPage() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [codeValid, setCodeValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastProvider, setLastProvider] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const code = searchParams.get('code') ?? ''

  useEffect(() => {
    if (!code || !API_URL) {
      setCodeValid(false)
      return
    }
    let cancelled = false
    async function validate() {
      try {
        const res = await fetch(`${API_URL}/api/auth/invite-codes/${encodeURIComponent(code)}`)
        if (!res.ok) {
          void reportClientError({
            feature: 'ui/auth_join',
            error_code: 'invite_code_validate_http_error',
            message: `Invite code validation failed: HTTP ${res.status}`,
            context: { status: res.status },
          })
        }
        const data = await res.json()
        if (!cancelled) {
          const valid = data.valid === true
          setCodeValid(valid)
          if (valid) {
            try {
              localStorage.setItem(VIBEY_DIRECT_INVITE_STORAGE_KEY, '1')
              localStorage.setItem(VIBEY_DIRECT_INVITE_CODE_KEY, code)
            } catch {}
          }
        }
      } catch {
        if (!cancelled) {
          void reportClientError({
            feature: 'ui/auth_join',
            error_code: 'invite_code_validate_network_error',
            message: 'Invite code validation request failed',
          })
          setCodeValid(false)
        }
      }
    }
    void validate()
    return () => {
      cancelled = true
    }
  }, [code])

  useEffect(() => {
    if (codeValid === false) {
      try {
        localStorage.removeItem(VIBEY_DIRECT_INVITE_STORAGE_KEY)
        localStorage.removeItem(VIBEY_DIRECT_INVITE_CODE_KEY)
      } catch {}
    }
  }, [codeValid])

  useEffect(() => {
    setLastProvider(localStorage.getItem(LAST_PROVIDER_KEY))
  }, [])

  const onOAuth = async (provider: 'google' | 'github') => {
    setLoading(true)
    setError(null)
    try {
      localStorage.setItem(LAST_PROVIDER_KEY, provider)
    } catch {}
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/callback` },
    })
    if (oauthErr) {
      void reportClientError({
        feature: 'ui/auth_join',
        error_code: 'oauth_start_failed',
        message: oauthErr.message,
        context: { provider },
      })
      setError(oauthErr.message)
      setLoading(false)
    }
  }

  const onEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    })

    if (error) {
      setLoading(false)
      void reportClientError({
        feature: 'ui/auth_join',
        error_code: 'email_sign_up_failed',
        message: error.message,
      })
      setError(resolveAuthSignupErrorMessage(error))
      return
    }

    const identities = ((data as unknown as Record<string, Record<string, unknown>>)?.user
      ?.identities ?? undefined) as unknown[] | undefined
    if (Array.isArray(identities) && identities.length === 0) {
      setLoading(false)
      setError('An account with this email already exists. You can sign in.')
      return
    }

    if (data?.session) {
      window.location.href = '/home'
      return
    }

    const emailConfirmedAt = data?.user?.email_confirmed_at
    if (emailConfirmedAt) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInError) {
        window.location.href = '/home'
        return
      }
    }

    setLoading(false)
    setMessage('Check your email to confirm your account.')
  }

  const onResend = async () => {
    setError(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) {
      void reportClientError({
        feature: 'ui/auth_join',
        error_code: 'signup_resend_failed',
        message: error.message,
      })
      setError(error.message)
      return
    }
    setMessage('Verification email sent. Check your inbox.')
  }

  if (codeValid === null) {
    return (
      <AuthOrbShell quotes={SIGNUP_QUOTES}>
        <p className="body-2 text-muted-foreground text-center">Validating invite…</p>
      </AuthOrbShell>
    )
  }

  if (!codeValid) {
    return (
      <AuthOrbShell quotes={SIGNUP_QUOTES}>
        <div className="text-center">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">INVALID INVITE</h1>
          <p className="body-2 text-muted-foreground mt-spacing-2">
            This invite link is invalid or has expired.
          </p>
          <Link href="/login" className="body-3 text-primary mt-spacing-6 inline-block underline">
            Go to login
          </Link>
        </div>
      </AuthOrbShell>
    )
  }

  return (
    <AuthOrbShell quotes={SIGNUP_QUOTES}>
      <div className="mb-spacing-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">CREATE ACCOUNT</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">Start building with ROAS</p>
      </div>

      <div className="space-y-spacing-4">
        <div className="gap-spacing-2 flex flex-col">
          <button
            onClick={() => void onOAuth('google')}
            disabled={loading}
            aria-label="Sign up with Google"
            className={`${lastProvider === 'google' ? 'chip-glass-blue' : 'button-glass-neutral'} h-spacing-10 rounded-spacing-2 px-spacing-3 relative flex w-full items-center justify-center font-medium disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="gap-spacing-2 relative z-10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M23.52 12.273c0-.851-.076-1.667-.218-2.455H12v4.642h6.48c-.279 1.5-1.126 2.77-2.396 3.62v3.005h3.868c2.264-2.084 3.568-5.155 3.568-8.812z"
                  fill="#4285F4"
                />
                <path
                  d="M12 24c3.24 0 5.957-1.073 7.943-2.915l-3.868-3.005c-1.074.72-2.448 1.147-4.075 1.147-3.136 0-5.794-2.118-6.744-4.966H1.235v3.126C3.212 21.408 7.296 24 12 24z"
                  fill="#34A853"
                />
                <path
                  d="M5.256 14.261A7.19 7.19 0 0 1 4.885 12c0-.786.135-1.546.371-2.261V6.613H1.235A11.983 11.983 0 0 0 0 12c0 1.941.465 3.778 1.235 5.387l4.021-3.126z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 4.75c1.762 0 3.346.606 4.595 1.793l3.447-3.447C17.954 1.17 15.237 0 12 0 7.296 0 3.212 2.592 1.235 6.613l4.021 3.126C6.206 6.891 8.864 4.75 12 4.75z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google</span>
            </span>
            {lastProvider === 'google' && (
              <span className="body-4 text-muted-foreground right-spacing-3 pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 opacity-60">
                Last used
              </span>
            )}
          </button>
          <button
            onClick={() => void onOAuth('github')}
            disabled={loading}
            aria-label="Sign up with GitHub"
            className={`${lastProvider === 'github' ? 'chip-glass-blue' : 'button-glass-neutral'} h-spacing-10 rounded-spacing-2 px-spacing-3 relative flex w-full items-center justify-center font-medium disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="gap-spacing-2 relative z-10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="shrink-0"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </span>
            {lastProvider === 'github' && (
              <span className="body-4 text-muted-foreground right-spacing-3 pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 opacity-60">
                Last used
              </span>
            )}
          </button>
        </div>

        <div className="gap-spacing-3 flex items-center">
          <div className="bg-border h-px flex-1" />
          <span className="body-3 text-muted-foreground">Or sign up with email</span>
          <div className="bg-border h-px flex-1" />
        </div>

        <form onSubmit={onEmailSignUp} className="space-y-spacing-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="input-glass h-spacing-10 rounded-spacing-2 w-full"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input-glass h-spacing-10 rounded-spacing-2 pr-spacing-8 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="text-muted-foreground right-spacing-2 absolute top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="body-3 text-destructive">{error}</p>}
          {message && (
            <div className="body-3 text-foreground border-border rounded-spacing-2 px-spacing-3 py-spacing-2 border text-center">
              {message}{' '}
              <button type="button" onClick={() => void onResend()} className="underline">
                Resend
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="chip-glass-green rounded-spacing-2 w-full px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative z-10">{loading ? 'Creating…' : 'Create account'}</span>
          </button>
        </form>
      </div>

      <div className="mt-spacing-6 text-center">
        <Link href="/login" className="body-3 text-muted-foreground hover:text-foreground">
          Already have an account? Sign in
        </Link>
      </div>
    </AuthOrbShell>
  )
}
