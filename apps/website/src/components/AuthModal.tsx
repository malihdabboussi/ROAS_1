'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, X } from 'lucide-react'
import { SiteLogo } from '@/components/SiteLogo'

const API_URL = process.env.NEXT_PUBLIC_API_URL!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

type Step = 'email' | 'password'
type Mode = 'login' | 'register'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  pendingMessage: string
}

const GLASS = {
  overlay: { background: 'var(--overlay-scrim)', backdropFilter: 'blur(8px)' },
  card: {
    background: 'linear-gradient(135deg, var(--glass-stop-05) 0%, var(--glass-stop-02) 100%)',
    border: '1px solid var(--border-strong)',
    boxShadow: '0 8px 32px var(--shadow-modal), inset 0 1px 0 var(--glass-stop-10)',
  },
  input: {
    background: 'var(--bg-subtle-hover)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-primary)',
  },
  buttonGlassGreen: {
    background:
      'linear-gradient(135deg, rgb(var(--accent-emerald-rgb) / 0.15) 0%, rgb(var(--accent-emerald-mid-rgb) / 0.22) 50%, rgb(var(--accent-emerald-rgb) / 0.12) 100%)',
    border: '1px solid rgb(var(--accent-emerald-rgb) / 0.25)',
    boxShadow:
      '0 2px 12px rgb(var(--accent-emerald-rgb) / 0.08), inset 0 1px 0 rgb(var(--accent-emerald-rgb) / 0.1)',
    color: 'var(--text-primary)',
    fontWeight: 600,
  },
  buttonNeutral: {
    background:
      'linear-gradient(135deg, var(--glass-stop-06) 0%, var(--glass-stop-10) 50%, var(--glass-stop-05) 100%)',
    border: '1px solid var(--border-strong)',
    color: 'var(--text-primary)',
  },
} as const

const GOOGLE_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
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
)

export function AuthModal({ open, onClose, pendingMessage }: AuthModalProps) {
  const [step, setStep] = useState<Step>('email')
  const [mode, setMode] = useState<Mode>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotStatus, setForgotStatus] = useState<string | null>(null)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setStep('email')
      setEmail('')
      setPassword('')
      setError(null)
      setConfirmEmail(false)
      setShowPassword(false)
      setShowForgot(false)
      setForgotStatus(null)
      setForgotError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const messageParam = pendingMessage ? `?message=${encodeURIComponent(pendingMessage)}` : ''

  const onOAuth = useCallback(
    async (provider: 'google' | 'github') => {
      try {
        const res = await fetch(`${API_URL}/api/auth/oauth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, message: pendingMessage || undefined }),
        })
        const data = await res.json()
        if (data.url) window.location.href = data.url
      } catch {
        setError('Could not connect. Try again.')
      }
    },
    [pendingMessage],
  )

  const onEmailContinue = useCallback(() => {
    if (!email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    setError(null)
    setStep('password')
  }, [email])

  const onSubmit = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (data.error) {
        if (data.statusCode === 409) {
          setMode('login')
          setError('Account exists. Enter your password to sign in.')
          setLoading(false)
          return
        }
        setError(data.error)
        setLoading(false)
        return
      }

      if (data.session?.access_token) {
        const token = encodeURIComponent(data.session.access_token)
        const refresh = encodeURIComponent(data.session.refresh_token ?? '')
        window.location.href = `${APP_URL}/callback?access_token=${token}&refresh_token=${refresh}&redirect=/mission-control${messageParam ? '&' + messageParam.slice(1) : ''}`
        return
      }

      setError('Something went wrong.')
      setLoading(false)
    } catch {
      setError('Could not connect. Try again.')
      setLoading(false)
    }
  }, [email, password, mode, messageParam])

  const onForgotPassword = useCallback(async () => {
    setForgotStatus(null)
    setForgotError(null)
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setForgotError(data.error ?? 'Something went wrong.')
        return
      }
      setForgotStatus('Reset link sent! Check your inbox.')
    } catch {
      setForgotError('Could not connect. Try again.')
    }
  }, [email])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center px-4"
      style={GLASS.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div ref={cardRef} className="w-full max-w-[400px] rounded-2xl p-8" style={GLASS.card}>
        <div className="mb-6 flex items-center justify-between">
          {step === 'password' || showForgot ? (
            <button
              onClick={() => {
                if (showForgot) {
                  setShowForgot(false)
                  setForgotStatus(null)
                  setForgotError(null)
                } else {
                  setStep('email')
                  setError(null)
                }
              }}
              className="text-color-muted transition-colors hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <div />
          )}
          <button onClick={onClose} className="text-color-muted transition-colors hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 text-center">
          <SiteLogo forceDark className="mx-auto mb-3 !h-12" />
          <h2 className="h3 text-white">
            {confirmEmail
              ? 'Check your email'
              : showForgot
                ? 'Reset your password'
                : mode === 'register'
                  ? 'Create your account'
                  : 'Welcome back'}
          </h2>
          <p className="text-color-muted body-3 mt-1">
            {confirmEmail
              ? 'We sent a verification link.'
              : showForgot
                ? "We'll email you a magic link."
                : 'Start building with ROAS'}
          </p>
        </div>

        {confirmEmail ? (
          <div className="text-center">
            <p className="text-color-muted body-3 mb-4">
              Open the link sent to <strong className="text-white">{email}</strong> to verify your
              account.
            </p>
            <button
              onClick={onClose}
              className="body-3 w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90"
              style={GLASS.buttonGlassGreen}
            >
              Got it
            </button>
          </div>
        ) : step === 'email' ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => void onOAuth('google')}
                className="hover-border-strong body-3 flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all"
                style={GLASS.buttonNeutral}
              >
                {GOOGLE_SVG}
                Google
              </button>
              <button
                onClick={() => void onOAuth('github')}
                className="hover-border-strong body-3 flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium transition-all"
                style={GLASS.buttonNeutral}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>

            <div className="flex items-center gap-3 py-1">
              <div className="divider-line h-px flex-1" />
              <span className="text-color-muted body-4">Or</span>
              <div className="divider-line h-px flex-1" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                onEmailContinue()
              }}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                autoFocus
                className="border-focusable placeholder-dim body-3 w-full rounded-xl px-4 py-3 outline-none transition-all"
                style={GLASS.input}
              />
              {error && <p className="body-3 mt-2 text-red-400">{error}</p>}
              <button
                type="submit"
                className="body-3 mt-3 w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90"
                style={GLASS.buttonGlassGreen}
              >
                Continue with email
              </button>
            </form>

            <p className="text-color-muted body-4 pt-2 text-center">
              {mode === 'register' ? (
                <>
                  Already have an account?{' '}
                  <button onClick={() => setMode('login')} className="text-white underline">
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  No account yet?{' '}
                  <button onClick={() => setMode('register')} className="text-white underline">
                    Create one
                  </button>
                </>
              )}
            </p>
          </div>
        ) : showForgot ? (
          <div className="space-y-3">
            <div
              className="text-color-muted body-3 rounded-xl px-4 py-2.5"
              style={{ ...GLASS.input, cursor: 'default' }}
            >
              {email}
            </div>
            {forgotStatus && <p className="body-3 text-emerald-400">{forgotStatus}</p>}
            {forgotError && <p className="body-3 text-red-400">{forgotError}</p>}
            <button
              onClick={() => void onForgotPassword()}
              className="body-3 w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90"
              style={GLASS.buttonGlassGreen}
            >
              Send reset link
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void onSubmit()
            }}
            className="space-y-3"
          >
            <div
              className="text-color-muted body-3 rounded-xl px-4 py-2.5"
              style={{ ...GLASS.input, cursor: 'default' }}
            >
              {email}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                className="border-focusable placeholder-dim body-3 w-full rounded-xl px-4 py-3 pr-10 outline-none transition-all"
                style={GLASS.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-color-muted absolute right-3 top-1/2 -translate-y-1/2 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="body-3 text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="body-3 w-full rounded-xl px-4 py-3 font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={GLASS.buttonGlassGreen}
            >
              {loading
                ? mode === 'register'
                  ? 'Creating account…'
                  : 'Signing in…'
                : mode === 'register'
                  ? 'Create account'
                  : 'Sign in'}
            </button>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true)
                  setForgotStatus(null)
                  setForgotError(null)
                }}
                className="text-color-muted body-4 w-full pt-1 text-center transition-colors hover:text-white"
              >
                Forgot password?
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
