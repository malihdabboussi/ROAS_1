import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import {
  NO_ORG_ACCESS_PATH,
  ONBOARDING_PATH,
  resolveAccessStatus,
  resolveAuthenticatedRedirect,
} from '@/lib/auth/access-routing'
import {
  hasSharedRailwayRuntime,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
} from '@/lib/runtime/machine-profile-env'

const SUPABASE_TIMEOUT_MS = 4000
const MACHINE_COLUMNS = resolveMachineProfileColumns(process.env)

type AccessQueryResult = { data?: { id: string } | null } | null

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  let authResult: Awaited<ReturnType<typeof supabase.auth.getUser>> | null = null
  try {
    authResult = await withTimeout(supabase.auth.getUser(), SUPABASE_TIMEOUT_MS)
  } catch {
    authResult = null
  }
  const user = authResult?.data?.user ?? null

  const dashboardPaths = [
    '/studio',
    '/dashboard',
    '/campaigns',
    '/brain',
    '/contacts',
    '/settings',
    '/home',
    '/spaces',
    '/team',
  ]
  const isDashboard =
    request.nextUrl.pathname === '/' ||
    dashboardPaths.some((p) => request.nextUrl.pathname.startsWith(p))
  const isOnboardingPage = request.nextUrl.pathname === ONBOARDING_PATH
  const isNoOrgAccessPage = request.nextUrl.pathname === NO_ORG_ACCESS_PATH
  const isSettingUpPage = request.nextUrl.pathname === '/setting-up'
  if (
    process.env.NEXT_PUBLIC_WAITLIST_MODE === 'true' &&
    request.nextUrl.pathname === '/register'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const isAuthPage =
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register' ||
    request.nextUrl.pathname === '/invite' ||
    request.nextUrl.pathname.startsWith('/invite/') ||
    request.nextUrl.pathname === '/join' ||
    request.nextUrl.pathname === '/fast-track-success'

  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isOnboardingPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isNoOrgAccessPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isSettingUpPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const isOrgSetupPage = request.nextUrl.pathname === '/org-setup'
  if (isOrgSetupPage && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (
    user &&
    (isDashboard || isOnboardingPage || isNoOrgAccessPage || isSettingUpPage || isAuthPage)
  ) {
    const roleResult = (await withTimeout(
      Promise.resolve(supabase.from('user_profiles').select('role').eq('id', user.id).single()),
      SUPABASE_TIMEOUT_MS,
    )) as { data?: { role?: string } } | null

    const role = roleResult?.data?.role || 'user'

    const profileResult = (await withTimeout(
      Promise.resolve(
        supabase
          .from('profiles')
          .select(
            `${MACHINE_COLUMNS.machineId}, ${MACHINE_COLUMNS.runtimeType}, ${MACHINE_COLUMNS.runtimeUrl}, onboarding_completed, account_mode`,
          )
          .eq('id', user.id)
          .single(),
      ),
      SUPABASE_TIMEOUT_MS,
    )) as {
      data?: { onboarding_completed?: boolean; account_mode?: string | null } & Record<
        string,
        unknown
      >
      error?: unknown
    } | null

    if (!profileResult || profileResult.error || !profileResult.data) {
      return supabaseResponse
    }

    const profile = profileResult.data
    const machineProfile = resolveMachineProfileRow(profile, MACHINE_COLUMNS)
    const hasMachine =
      typeof machineProfile.machineId === 'string' && machineProfile.machineId.length > 0
    const hasRuntime = hasMachine || hasSharedRailwayRuntime(machineProfile)
    const onboardingCompleted = profile.onboarding_completed === true
    const accountMode = profile.account_mode ?? 'personal'
    const isOrgOnly = accountMode === 'org_only'
    const fullyOnboarded = isOrgOnly || (onboardingCompleted && hasRuntime)

    const requireAdmin = process.env.NEXT_PUBLIC_REQUIRE_ADMIN === 'true'
    if (requireAdmin && role !== 'admin' && role !== 'superadmin') {
      return NextResponse.redirect(new URL('https://vibey.im'))
    }

    let subResult: AccessQueryResult = null
    let orgMemberResult: AccessQueryResult = null
    let accessCheckUnavailable = false

    try {
      const accessResults = await Promise.all([
        withTimeout(
          Promise.resolve(
            supabase
              .from('user_subscriptions')
              .select('id')
              .eq('user_id', user.id)
              .in('status', ['active', 'trialing'])
              .maybeSingle(),
          ),
          SUPABASE_TIMEOUT_MS,
        ) as Promise<AccessQueryResult>,
        withTimeout(
          Promise.resolve(
            supabase
              .from('org_members')
              .select('id')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .limit(1)
              .maybeSingle(),
          ),
          SUPABASE_TIMEOUT_MS,
        ) as Promise<AccessQueryResult>,
      ])
      subResult = accessResults[0]
      orgMemberResult = accessResults[1]
    } catch {
      accessCheckUnavailable = true
    }

    const hasActiveSub = !!subResult?.data
    const isActiveOrgMember = !!orgMemberResult?.data
    const accessStatus = resolveAccessStatus({
      hasActiveSubscription: hasActiveSub,
      hasActiveOrgMembership: isActiveOrgMember,
      accessCheckUnavailable:
        accessCheckUnavailable || subResult === null || orgMemberResult === null,
    })
    const redirectPath = resolveAuthenticatedRedirect({
      isDashboard,
      isOnboardingPage,
      isNoOrgAccessPage,
      isSettingUpPage,
      isAuthPage,
      isInviteTokenPage: request.nextUrl.pathname.startsWith('/invite/'),
      fullyOnboarded,
      isOrgOnly,
      accessStatus,
    })

    if (redirectPath) {
      const url = request.nextUrl.clone()
      url.pathname = redirectPath
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  supabaseResponse.headers.set('x-pathname', request.nextUrl.pathname)
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (browser icon)
     * - public files (images, etc)
     * - callback (auth callback)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|callback).*)',
  ],
}
