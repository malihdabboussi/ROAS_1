import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/layout/AdminShell'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    redirect('/login')
  }

  const backendUrl =
    process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'
  const res = await fetch(`${backendUrl}/api/admin/check`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  })

  if (res.status === 401) redirect('/login')
  if (res.status === 403 || !res.ok) redirect('/no-access')

  return <AdminShell>{children}</AdminShell>
}
