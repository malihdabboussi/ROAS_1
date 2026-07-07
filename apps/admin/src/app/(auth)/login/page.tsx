'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const LAST_PROVIDER_KEY = 'vibey-admin-last-auth-provider'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [lastProvider, setLastProvider] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  useEffect(() => {
    setLastProvider(localStorage.getItem(LAST_PROVIDER_KEY))
  }, [])

  const supabase = createClient()

  const onOAuth = async (provider: 'google' | 'github') => {
    setLoading(true)
    setError(null)
    try {
      localStorage.setItem(LAST_PROVIDER_KEY, provider)
    } catch {}
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthErr) {
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
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (loginError) {
      const msg = loginError.message || ''
      if (msg.toLowerCase().includes('invalid login') || msg.toLowerCase().includes('invalid')) {
        setError('Invalid email or password.')
      } else if (
        msg.toLowerCase().includes('email not confirmed') ||
        msg.toLowerCase().includes('confirm')
      ) {
        setError('Please verify your email.')
      } else {
        setError(loginError.message)
      }
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className="card-glass card-elevated text-card-foreground w-full max-w-[var(--container-auth)] rounded-[var(--spacing-4)] p-[var(--spacing-8)]">
      <div className="mb-[var(--spacing-6)] text-center">
        <img
          src="/Logos/logov2_transperent.png"
          alt="Vibey"
          className="mb-spacing-3 h-spacing-20 mx-auto w-auto object-contain"
        />
        <h1 className="title-h3">Admin</h1>
        <p className="body-3 text-muted-foreground">Sign in to Admin Dashboard</p>
      </div>

      <div className="mx-auto max-w-[360px] space-y-[var(--spacing-4)]">
        <div className="flex gap-[var(--spacing-2)]">
          <button
            onClick={() => void onOAuth('google')}
            disabled={loading}
            aria-label="Sign in with Google"
            className={`${lastProvider === 'google' ? 'chip-glass-blue' : 'button-glass-neutral'} inline-flex h-[var(--button-height-sm)] flex-1 items-center justify-center gap-[var(--spacing-2)] rounded-lg px-[var(--spacing-3)] font-medium disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="relative z-10 flex items-center gap-[var(--spacing-2)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
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
              {lastProvider === 'google' && <span className="body-3 opacity-60">Last used</span>}
            </span>
          </button>
          <button
            onClick={() => void onOAuth('github')}
            disabled={loading}
            aria-label="Sign in with GitHub"
            className={`${lastProvider === 'github' ? 'chip-glass-blue' : 'button-glass-neutral'} inline-flex h-[var(--button-height-sm)] flex-1 items-center justify-center gap-[var(--spacing-2)] rounded-lg px-[var(--spacing-3)] font-medium disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className="relative z-10 flex items-center gap-[var(--spacing-2)]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
              {lastProvider === 'github' && <span className="body-3 opacity-60">Last used</span>}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-[var(--spacing-3)]">
          <div className="bg-border h-px flex-1" />
          <span className="body-3 text-muted-foreground">Or</span>
          <div className="bg-border h-px flex-1" />
        </div>

        {!showEmailForm && (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="chip-glass-green inline-flex h-[var(--button-height-sm)] w-full items-center justify-center gap-[var(--spacing-2)] rounded-lg px-[var(--spacing-3)] font-medium"
          >
            Continue with email
          </button>
        )}

        {showEmailForm && (
          <form onSubmit={onEmailLogin} className="space-y-[var(--spacing-3)]">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="input-glass h-[var(--button-height-sm)] w-full"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input-glass h-[var(--button-height-sm)] w-full pr-[var(--spacing-8)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-muted-foreground absolute right-[var(--spacing-2)] top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="body-3 text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="chip-glass-green w-full rounded-lg px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="relative z-10">{loading ? 'Signing in…' : 'Sign in'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
