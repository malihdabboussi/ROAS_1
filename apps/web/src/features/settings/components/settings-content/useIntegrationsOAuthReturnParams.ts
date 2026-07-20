'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { backendPost } from '@/lib/api/backend-client'
import {
  INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER,
  INTEGRATION_CONNECT_SUCCESS_FALLBACK,
  SETTINGS_TOAST_ERRORS,
  SETTINGS_TOAST_SUCCESS,
} from '../../config/settings-toast-errors.config'
import type { IntegrationsTab, UserIntegration } from './integrations.types'

type SocialReportingPlatform = 'linkedin' | 'facebook' | 'youtube'

type UseIntegrationsOAuthReturnParamsInput = {
  finishOAuthConnect: (integrationId: string | null, showToast?: boolean) => void
  loadData: () => void
  setActiveTab: (tab: IntegrationsTab) => void
  setConnectingProvider: (provider: string | null) => void
  setPendingSocialReportingPicker: (platform: SocialReportingPlatform | null) => void
  initialLoadComplete: boolean
  userIntegrations: UserIntegration[]
}

/** Handles OAuth return query params + Fathom meetings-space bootstrap. */
export function useIntegrationsOAuthReturnParams(input: UseIntegrationsOAuthReturnParamsInput) {
  const searchParams = useSearchParams()
  const fathomMeetingsBootstrapRef = useRef(false)

  const ensureFathomMeetingsSpace = useCallback((showSuccess = false) => {
    if (fathomMeetingsBootstrapRef.current) return
    fathomMeetingsBootstrapRef.current = true
    void backendPost('/api/integrations/fathom/ensure-meetings-space', {})
      .then(() => {
        if (showSuccess) toast.success(SETTINGS_TOAST_SUCCESS.FATHOM_MEETINGS_READY.userMessage)
      })
      .catch(() => {
        fathomMeetingsBootstrapRef.current = false
        toast.error(SETTINGS_TOAST_ERRORS.FATHOM_MEETINGS_SETUP_FAILED.userMessage)
      })
  }, [])

  useEffect(() => {
    if (!input.initialLoadComplete) return
    const connected = input.userIntegrations.some(
      (integration) =>
        String(integration.integration_id).toLowerCase() === 'fathom' &&
        String(integration.status).toLowerCase() === 'connected',
    )
    if (connected) ensureFathomMeetingsSpace()
  }, [ensureFathomMeetingsSpace, input.initialLoadComplete, input.userIntegrations])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    let mutated = false

    if (searchParams.get('ghl_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.gohighlevel ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('ghl_connected')
      mutated = true
    }
    if (searchParams.get('github_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.github ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('github_connected')
      mutated = true
    }
    if (searchParams.get('stripe_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.stripe ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('stripe_connected')
      mutated = true
    }
    if (searchParams.get('paypal_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.paypal ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('paypal_connected')
      mutated = true
    }
    if (searchParams.get('meta_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.meta ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      setTimeout(() => {
        toast.info(
          'Your Meta ad account is connected. Head to your Ads dashboard and hit "Sync Meta Ads" to pull in your existing campaigns for analysis.',
          { duration: 8000 },
        )
      }, 1500)
      url.searchParams.delete('meta_connected')
      mutated = true
    }
    if (searchParams.get('calendly_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.calendly ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('calendly_connected')
      mutated = true
    }
    if (searchParams.get('google_drive_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.google_drive ??
          INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('google_drive_connected')
      mutated = true
    }
    if (searchParams.get('dropbox_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.dropbox ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('dropbox_connected')
      mutated = true
    }
    if (searchParams.get('fathom_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.fathom ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      ensureFathomMeetingsSpace(true)
      url.searchParams.delete('fathom_connected')
      mutated = true
    }
    if (searchParams.get('slack_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.slack ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('slack_connected')
      mutated = true
    }
    if (searchParams.get('supabase_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.supabase ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('supabase_connected')
      mutated = true
    }
    if (searchParams.get('wordpress_connected') === '1') {
      toast.success(
        INTEGRATION_CONNECT_SUCCESS_BY_PROVIDER.wordpress ?? INTEGRATION_CONNECT_SUCCESS_FALLBACK,
      )
      input.loadData()
      url.searchParams.delete('wordpress_connected')
      mutated = true
    }
    if (searchParams.get('composio_connected') === '1') {
      const integrationId = searchParams.get('integration')?.toLowerCase()
      if (
        integrationId === 'linkedin' ||
        integrationId === 'facebook' ||
        integrationId === 'youtube'
      ) {
        input.setPendingSocialReportingPicker(integrationId)
        input.setActiveTab('manage')
      }
      input.finishOAuthConnect(integrationId ?? null, false)
      url.searchParams.delete('composio_connected')
      url.searchParams.delete('integration')
      mutated = true
    }
    const paypalError = searchParams.get('paypal_error')
    if (paypalError) {
      const paypalErrorMessages: Record<string, string> = {
        access_denied: 'PayPal connection was cancelled.',
        userinfo_failed:
          'PayPal connected but we could not read your profile. Check Developer Dashboard → Log in with PayPal → user information checkboxes.',
        token_exchange_failed: 'PayPal rejected the authorization code. Try connecting again.',
        invalid_state: 'PayPal session expired. Start the connection again.',
        missing_code_or_state: 'PayPal did not return a valid response. Try again.',
      }
      toast.error(
        paypalErrorMessages[paypalError] ??
          SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage,
      )
      url.searchParams.delete('paypal_error')
      mutated = true
    }
    if (searchParams.get('composio_error')) {
      const message =
        searchParams.get('composio_error_message') || searchParams.get('composio_error')
      input.setConnectingProvider(null)
      toast.error(message || SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECTION_FAILED.userMessage)
      url.searchParams.delete('composio_error')
      url.searchParams.delete('composio_error_message')
      url.searchParams.delete('integration')
      mutated = true
    }
    const wordpressError = searchParams.get('wordpress_error')
    if (wordpressError) {
      const wordpressErrorMessages: Record<string, string> = {
        rejected: 'WordPress connection was cancelled.',
        access_denied: 'WordPress connection was cancelled.',
        invalid_state: 'WordPress session expired. Start the connection again.',
      }
      input.setConnectingProvider(null)
      toast.error(
        wordpressErrorMessages[wordpressError] ??
          SETTINGS_TOAST_ERRORS.INTEGRATION_CONNECT_FAILED.userMessage,
      )
      url.searchParams.delete('wordpress_error')
      mutated = true
    }

    if (mutated) {
      window.history.replaceState({}, '', url.toString())
    }
  }, [
    searchParams,
    input.finishOAuthConnect,
    input.loadData,
    input.setActiveTab,
    input.setConnectingProvider,
    input.setPendingSocialReportingPicker,
    ensureFathomMeetingsSpace,
  ])
}
