'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { buildAuthContinuationPath } from '@/lib/auth/access-routing'
import { reportClientError } from '@/lib/log-client-error'
import { createClient } from '@/lib/supabase/client'
import { AUTH_MESSAGES } from '../config/auth-messages.config'

const copy = AUTH_MESSAGES.PASSWORD_RESET

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const searchParams = useSearchParams()

  const supabase = createClient()
  const requestedRedirect = searchParams.get('redirect')
  const promoCode = searchParams.get('promo')
  const signInHref = buildAuthContinuationPath('/login', requestedRedirect, promoCode)
  const resetPasswordPath = buildAuthContinuationPath(
    '/reset-password',
    requestedRedirect,
    promoCode,
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setError(null)
    setIsSubmitting(true)
    try {
      const redirectTo = `${window.location.origin}/oauth-callback?type=recovery&redirect=${encodeURIComponent(resetPasswordPath)}`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
      if (resetError) {
        void reportClientError({
          feature: 'ui/auth_password_reset',
          error_code: 'password_reset_email_failed',
          message: resetError.message,
        })
        setError(copy.error)
        return
      }
      setStatus(copy.success)
    } catch (resetError) {
      void reportClientError({
        feature: 'ui/auth_password_reset',
        error_code: 'password_reset_email_failed',
        message: resetError instanceof Error ? resetError.message : String(resetError),
      })
      setError(copy.error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthOrbShell quotes={copy.quotes}>
      <div className="mb-spacing-6">
        <Link
          href={signInHref}
          className="body-3 text-muted-foreground hover:text-foreground gap-spacing-2 inline-flex items-center"
        >
          <ArrowLeft size={16} /> {copy.back}
        </Link>
      </div>
      <div className="mb-spacing-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">{copy.body}</p>
      </div>

      <form onSubmit={submit} className="space-y-spacing-3">
        <input
          type="email"
          required
          aria-label={copy.emailLabel}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.emailPlaceholder}
          disabled={isSubmitting}
          className="input-glass h-spacing-10 rounded-spacing-2 w-full"
        />
        {status && (
          <p className="body-3 text-muted-foreground" role="status">
            {status}
          </p>
        )}
        {error && (
          <p className="body-3 text-destructive" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="chip-glass-green rounded-spacing-2 w-full px-4 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="gap-spacing-2 relative z-10 flex items-center justify-center">
            {isSubmitting ? <VibeyLoadingOrb size="sm" /> : null}
            {isSubmitting ? copy.submitting : copy.submit}
          </span>
        </button>
      </form>
    </AuthOrbShell>
  )
}
