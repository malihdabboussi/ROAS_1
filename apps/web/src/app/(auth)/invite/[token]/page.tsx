'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { orgService, useOrgStore } from '@/lib/org'
import { reportClientError } from '@/lib/log-client-error'
import { createClient } from '@/lib/supabase/client'
import { clearOrgSensitiveState } from '@/lib/utils/clear-org-state'
import { resolveAuthSignupErrorMessage } from '../../config/auth-toast-errors.config'
import {
  InviteAcceptErrorFooter,
  InviteAcceptHeader,
  InviteAcceptReadyPanel,
  type InviteInvitation,
  type InviteState,
} from './InviteAcceptSections'

const LAST_PROVIDER_KEY = 'vibey-last-auth-provider'
const SIGNUP_QUOTES = [
  'Join your team and start building.',
  'Your workspace is getting ready.',
  'One invite. Your seat is ready.',
  'Step into the flow with your team.',
  'Welcome to your workspace.',
]

export default function OrgInviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { fetchMemberships, setActiveOrg } = useOrgStore()
  const supabase = useMemo(() => createClient(), [])

  const [state, setState] = useState<InviteState>('loading')
  const [invitation, setInvitation] = useState<InviteInvitation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [lastProvider, setLastProvider] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const loadInvitation = useCallback(async () => {
    if (!token) {
      setError('No invitation token provided')
      setState('error')
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsLoggedIn(!!user)

    try {
      const res = await orgService.getInvitationByToken(token)
      if (res.success && res.invitation) {
        setInvitation(res.invitation)
        setState('ready')
      } else {
        setError('Invitation not found')
        setState('error')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load invitation'
      void reportClientError({
        feature: 'ui/org_invite_accept',
        error_code: 'load_invitation_failed',
        message: msg,
      })
      if (msg.includes('404') || msg.includes('not found') || msg.includes('Not Found')) {
        setError('This invitation does not exist or has already been used')
      } else {
        setError(msg)
      }
      setState('error')
    }
  }, [supabase, token])

  useEffect(() => {
    void loadInvitation()
  }, [loadInvitation])

  useEffect(() => {
    try {
      setLastProvider(localStorage.getItem(LAST_PROVIDER_KEY))
    } catch {}
  }, [])

  const bootstrapInvite = useCallback(async () => {
    if (!token) return
    setState('accepting')
    try {
      const res = await orgService.acceptInvitationAndBootstrap(token)
      if (res.success) {
        setState('accepted')
        await fetchMemberships()
        setActiveOrg(res.org_id)
        clearOrgSensitiveState()
        const destination = res.requires_machine_setup === false ? '/home' : '/setting-up'
        router.replace(destination)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to accept invitation'
      void reportClientError({
        feature: 'ui/org_invite_accept',
        error_code: 'accept_invitation_failed',
        message: msg,
      })
      setError(msg)
      setState('error')
    }
  }, [fetchMemberships, router, setActiveOrg, token])

  useEffect(() => {
    if (state !== 'ready') return
    if (!isLoggedIn) return
    if (searchParams.get('bootstrap') !== '1') return
    void bootstrapInvite()
  }, [bootstrapInvite, isLoggedIn, searchParams, state])

  const onOAuth = async (provider: 'google' | 'github') => {
    setError(null)
    setMessage(null)
    setState('accepting')
    try {
      localStorage.setItem(LAST_PROVIDER_KEY, provider)
    } catch {}
    const redirect = encodeURIComponent(`/invite/${token}?bootstrap=1`)
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/callback?redirect=${redirect}` },
    })
    if (oauthErr) {
      void reportClientError({
        feature: 'ui/org_invite_accept',
        error_code: 'oauth_start_failed',
        message: oauthErr.message,
        context: { provider },
      })
      setError(oauthErr.message)
      setState('ready')
    }
  }

  const onEmailSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setState('accepting')

    const redirect = `${window.location.origin}/callback?redirect=${encodeURIComponent(
      `/invite/${token}?bootstrap=1`,
    )}`
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirect },
    })

    if (signUpError) {
      void reportClientError({
        feature: 'ui/org_invite_accept',
        error_code: 'email_sign_up_failed',
        message: signUpError.message,
      })
      setError(resolveAuthSignupErrorMessage(signUpError))
      setState('ready')
      return
    }

    const identities = ((data as unknown as Record<string, Record<string, unknown>>)?.user
      ?.identities ?? undefined) as unknown[] | undefined
    if (Array.isArray(identities) && identities.length === 0) {
      setError('An account with this email already exists. You can sign in.')
      setState('ready')
      return
    }

    if (data?.session) {
      await bootstrapInvite()
      return
    }

    const emailConfirmedAt = data?.user?.email_confirmed_at
    if (emailConfirmedAt) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInError) {
        await bootstrapInvite()
        return
      }
    }

    setMessage('Check your email to confirm your account.')
    setState('ready')
  }

  const isExpired = invitation ? new Date(invitation.expires_at) < new Date() : false
  const isAlreadyAccepted = invitation?.status === 'accepted'
  const isRevoked = invitation?.status === 'revoked'

  return (
    <AuthOrbShell quotes={SIGNUP_QUOTES}>
      <InviteAcceptHeader state={state} invitation={invitation} error={error} />

      {state === 'ready' && invitation && (
        <InviteAcceptReadyPanel
          invitation={invitation}
          isLoggedIn={isLoggedIn}
          isExpired={isExpired}
          isAlreadyAccepted={isAlreadyAccepted}
          isRevoked={isRevoked}
          lastProvider={lastProvider}
          email={email}
          password={password}
          message={message}
          error={error}
          showPassword={showPassword}
          token={token}
          onAccept={() => void bootstrapInvite()}
          onOAuth={(provider) => void onOAuth(provider)}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onShowPasswordChange={setShowPassword}
          onEmailSignUp={(event) => void onEmailSignUp(event)}
        />
      )}

      {state === 'error' && <InviteAcceptErrorFooter />}
    </AuthOrbShell>
  )
}
