'use client'

import { useEffect } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { resolveMarketingSiteUrl } from '@/lib/platform/platform-urls'

export default function OAuthCallbackPage() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const hashParams = new URLSearchParams(hash)

    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const errorCode = hashParams.get('error_code')
    const errorDescription = hashParams.get('error_description')
    const code = url.searchParams.get('code')
    const redirect = url.searchParams.get('redirect') ?? '/home'
    const message = url.searchParams.get('message')

    const target = new URL('/callback', url.origin)
    target.searchParams.set('redirect', redirect)
    if (message) target.searchParams.set('message', message)

    if (code) {
      target.searchParams.set('code', code)
      window.location.replace(target.toString())
      return
    }

    if (accessToken && refreshToken) {
      target.searchParams.set('access_token', accessToken)
      target.searchParams.set('refresh_token', refreshToken)
      window.location.replace(target.toString())
      return
    }

    if (errorCode) {
      const loginTarget = new URL('/login', url.origin)
      loginTarget.searchParams.set('auth_error', errorCode)
      if (errorDescription) loginTarget.searchParams.set('auth_error_description', errorDescription)
      window.location.replace(loginTarget.toString())
      return
    }

    window.location.replace(resolveMarketingSiteUrl())
  }, [])

  return (
    <div className="surface-bg flex min-h-dvh flex-col items-center justify-center px-6">
      <h1 className="sr-only">LOADING YOUR STUDIO</h1>
      <VibeyLoadingOrb size="lg" text="Finalizing sign in..." />
    </div>
  )
}
