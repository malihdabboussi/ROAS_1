'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { reportClientError } from '@/lib/log-client-error'
import { createClient } from '@/lib/supabase/client'

const LAST_PROVIDER_KEY = 'vibey-last-auth-provider'

const VIBEY_QUOTES = [
  "Let's build something together.",
  'Your AI team is waiting.',
  'Welcome back. Ready to create?',
  'Ideas become reality here.',
  'The workspace that works for you.',
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [lastProvider, setLastProvider] = useState<string | null>(null)

  useEffect(() => {
    setLastProvider(localStorage.getItem(LAST_PROVIDER_KEY))
  }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState<string | null>(null)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('auth_error_description') || params.get('auth_error')
    if (authError) setError(authError)
  }, [])

  const getRedirectPath = useCallback(() => {
    if (typeof window === 'undefined') return '/home'
    const params = new URLSearchParams(window.location.search)
    return params.get('redirect') || '/home'
  }, [])

  const onOAuth = async (provider: 'google' | 'github') => {
    setLoading(true)
    try {
      localStorage.setItem(LAST_PROVIDER_KEY, provider)
    } catch {}
    const redirectPath = getRedirectPath()
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/callback?redirect=${encodeURIComponent(redirectPath)}`,
      },
    })
    if (oauthErr) {
      void reportClientError({
        feature: 'ui/auth_login',
        error_code: 'oauth_start_failed',
        message: oauthErr.message,
        context: { provider },
      })
      setError(oauthErr.message)
      setLoading(false)
    }
  }

  const onEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      localStorage.setItem(LAST_PROVIDER_KEY, 'email')
    } catch {}
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      void reportClientError({
        feature: 'ui/auth_login',
        error_code: 'email_password_sign_in_failed',
        message: error.message,
      })
      const msg = error.message || ''
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid')) {
        setError('Invalid email or password.')
      } else if (
        msg.toLowerCase().includes('email not confirmed') ||
        msg.toLowerCase().includes('confirm')
      ) {
        setError('Please verify your email.')
      } else {
        setError(error.message)
      }
      return
    }
    window.location.href = getRedirectPath()
  }

  const onForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotStatus(null)
    setForgotError(null)
    const redirectTo = `${window.location.origin}/oauth-callback?type=recovery&redirect=${encodeURIComponent('/reset-password')}`
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo })
    if (error) {
      void reportClientError({
        feature: 'ui/auth_login',
        error_code: 'password_reset_email_failed',
        message: error.message,
      })
      setForgotError(error.message)
    } else setForgotStatus('If the email exists, a reset link has been sent.')
  }

  return (
    <AuthOrbShell
      quotes={VIBEY_QUOTES}
      overlay={
        showForgotModal ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForgotModal(false)
            }}
          >
            <div className="card-glass card-elevated rounded-spacing-4 p-spacing-8 w-full max-w-[400px]">
              <div className="mb-spacing-6 text-center">
                <h2 className="title-h3">Reset your password</h2>
                <p className="body-3 text-muted-foreground mt-1">
                  We&apos;ll email you a magic link to reset it.
                </p>
              </div>
              <form onSubmit={onForgotPassword} className="space-y-spacing-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@domain.com"
                  autoFocus
                  className="input-glass h-spacing-10 rounded-spacing-2 w-full"
                />
                {forgotStatus && <p className="body-3 text-muted-foreground">{forgotStatus}</p>}
                {forgotError && <p className="body-3 text-destructive">{forgotError}</p>}
                <button
                  type="submit"
                  className="chip-glass-green rounded-spacing-2 w-full px-4 py-2 font-medium"
                >
                  <span className="relative z-10">Send reset link</span>
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="body-3 text-muted-foreground hover:text-foreground mt-4 w-full text-center"
              >
                Back to sign in
              </button>
            </div>
          </div>
        ) : undefined
      }
    >
      <div className="mb-spacing-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">Continue to ROAS</p>
      </div>

      <div className="space-y-spacing-4">
        <div className="gap-spacing-2 flex flex-col">
          <button
            onClick={() => void onOAuth('google')}
            disabled={loading}
            aria-label="Sign in with Google"
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
            aria-label="Sign in with GitHub"
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
          <span className="body-3 text-muted-foreground">Or sign in with email</span>
          <div className="bg-border h-px flex-1" />
        </div>

        <form onSubmit={onEmailLogin} className="space-y-spacing-3">
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
          <button
            type="submit"
            disabled={loading}
            className="chip-glass-green rounded-spacing-2 w-full px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative z-10">{loading ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>
      </div>

      <div className="mt-spacing-6 text-center">
        <button
          type="button"
          onClick={() => {
            setForgotEmail(email)
            setForgotStatus(null)
            setForgotError(null)
            setShowForgotModal(true)
          }}
          className="body-3 text-muted-foreground hover:text-foreground"
        >
          Forgot password?
        </button>
      </div>
    </AuthOrbShell>
  )
}
