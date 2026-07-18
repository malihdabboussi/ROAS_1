'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { reportClientError } from '@/lib/log-client-error'
import { createClient } from '@/lib/supabase/client'
import { AUTH_MESSAGES } from '../config/auth-messages.config'

const copy = AUTH_MESSAGES.EMAIL_VERIFICATION

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  const resend = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    setError(null)
    setIsSubmitting(true)
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
      if (resendError) {
        void reportClientError({
          feature: 'ui/auth_email_verification',
          error_code: 'verification_email_resend_failed',
          message: resendError.message,
        })
        setError(copy.error)
        return
      }
      setStatus(copy.success)
    } catch (resendError) {
      void reportClientError({
        feature: 'ui/auth_email_verification',
        error_code: 'verification_email_resend_failed',
        message: resendError instanceof Error ? resendError.message : String(resendError),
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
          href="/login"
          className="body-3 text-muted-foreground hover:text-foreground gap-spacing-2 inline-flex items-center"
        >
          <ArrowLeft size={16} /> {copy.back}
        </Link>
      </div>
      <div className="mb-spacing-8 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="body-2 text-muted-foreground mt-spacing-2">{copy.body}</p>
      </div>

      <form onSubmit={resend} className="space-y-spacing-3">
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
