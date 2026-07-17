import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveUserAvatarUrl, resolveUserDisplayName } from '@/lib/user-display'
import { DashboardFrame } from './dashboard-frame.client'
import { DashboardShell } from './dashboard-shell'
import { DashboardSidebar } from './dashboard-sidebar.client'
import { DashboardProviders } from './providers'

const SUPABASE_AUTH_TIMEOUT_MS = 4000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] | null = null
  try {
    const authResult = await withTimeout(supabase.auth.getUser(), SUPABASE_AUTH_TIMEOUT_MS)
    user = authResult?.data?.user ?? null
  } catch {
    user = null
  }

  if (!user) {
    redirect('/login')
  }

  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? '/'
  const initialSidebarMode: 'studio' | 'hq' = pathname.startsWith('/studio') ? 'studio' : 'hq'

  // eslint-disable-next-line no-restricted-syntax -- direct profile query for SSR display name/avatar
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const userName = resolveUserDisplayName(user, profile)
  const avatarUrl = resolveUserAvatarUrl(user, profile)

  return (
    <DashboardProviders initialSidebarMode={initialSidebarMode}>
      <DashboardFrame
        sidebar={
          <DashboardSidebar
            userName={userName}
            email={user.email ?? undefined}
            avatarUrl={avatarUrl}
          />
        }
      >
        <DashboardShell>{children}</DashboardShell>
      </DashboardFrame>
    </DashboardProviders>
  )
}
