import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { reportWebServerError } from '@/lib/observability/server-error-reporter.server'
import { resolveMarketingSiteUrl } from '@/lib/platform/platform-urls'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const promo = searchParams.get('promo')
  const redirect = searchParams.get('redirect') ?? '/home'
  const message = searchParams.get('message')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Route handler context
          }
        },
      },
    },
  )

  let authenticated = false
  let accessTokenForProvision: string | null = null

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      authenticated = true
      accessTokenForProvision = data.session?.access_token ?? null
    } else {
      reportWebServerError({
        request,
        route: '/auth/callback',
        feature: 'auth_callback',
        error_code: 'AUTH_CALLBACK_CODE_EXCHANGE_FAILED',
        message: error.message,
        error,
        statusCode: 302,
        context: { has_code: true },
      })
      console.error('[auth/callback] Code exchange failed:', error.message)
    }
  }

  if (!authenticated && accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (!error) {
      authenticated = true
      accessTokenForProvision = accessToken
    } else {
      reportWebServerError({
        request,
        route: '/auth/callback',
        feature: 'auth_callback',
        error_code: 'AUTH_CALLBACK_TOKEN_SESSION_FAILED',
        message: error.message,
        error,
        statusCode: 302,
        context: { has_access_token: true, has_refresh_token: true },
      })
      console.error('[auth/callback] Token session failed:', error.message)
    }
  }

  if (authenticated) {
    if (accessTokenForProvision) {
      try {
        const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001'
        const profileUrl = new URL('/api/profile', backendUrl).toString()
        const profileResponse = await fetch(profileUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessTokenForProvision}`,
            'Content-Type': 'application/json',
          },
        })

        let runtimeReady = false
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as {
            fly_machine_id?: string | null
            agent_runtime_type?: string | null
            agent_runtime_url?: string | null
          }
          const hasMachine =
            typeof profile?.fly_machine_id === 'string' && profile.fly_machine_id.trim().length > 0
          const hasSharedRailway =
            profile?.agent_runtime_type === 'shared_railway' &&
            typeof profile.agent_runtime_url === 'string' &&
            profile.agent_runtime_url.trim().length > 0
          runtimeReady = hasMachine || hasSharedRailway
        } else {
          console.warn(
            `[auth/callback] Profile fetch failed with ${profileResponse.status}; provisioning fallback will continue`,
          )
        }

        const { data: activeSub } = await supabase
          .from('user_subscriptions')
          .select('id')
          .in('status', ['active', 'trialing'])
          .maybeSingle()

        if (activeSub && !runtimeReady) {
          const provisionUrl = new URL('/api/machines/provision', backendUrl).toString()
          void fetch(provisionUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessTokenForProvision}`,
              'Content-Type': 'application/json',
            },
          }).catch((err) => {
            reportWebServerError({
              request,
              route: '/auth/callback',
              feature: 'auth_callback',
              error_code: 'AUTH_CALLBACK_BACKGROUND_PROVISION_FAILED',
              error: err,
              statusCode: 302,
              context: { provision_url: provisionUrl },
            })
            console.error('[auth/callback] Background provision failed:', err)
          })
        }

        const ftSession = cookieStore.get('vibey-ft-session')?.value
        const fastTrackUrl = new URL('/api/waitlist/fast-track-link', backendUrl).toString()
        void fetch(fastTrackUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessTokenForProvision}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: ftSession || undefined }),
        }).catch((err) => {
          reportWebServerError({
            request,
            route: '/auth/callback',
            feature: 'auth_callback',
            error_code: 'AUTH_CALLBACK_FAST_TRACK_LINK_FAILED',
            error: err,
            statusCode: 302,
            context: { fast_track_url: fastTrackUrl },
          })
          console.error('[auth/callback] Fast-track link failed:', err)
        })
      } catch (err) {
        reportWebServerError({
          request,
          route: '/auth/callback',
          feature: 'auth_callback',
          error_code: 'AUTH_CALLBACK_BACKGROUND_SETUP_FAILED',
          error: err,
          statusCode: 302,
        })
        console.error('[auth/callback] Failed to schedule background provision:', err)
      }
    }

    const params = new URLSearchParams()
    if (promo) params.set('promo', promo)
    if (message) params.set('message', message)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return NextResponse.redirect(`${origin}${redirect}${qs}`)
  }
  return NextResponse.redirect(new URL(resolveMarketingSiteUrl()))
}
