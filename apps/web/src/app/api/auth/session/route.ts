import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Returns the current user's Supabase session tokens to same-origin callers
 * (the Vibey Chrome extension running with host_permissions for this origin).
 *
 * Cookies are sent automatically by Chrome for the extension's fetch; this
 * endpoint exposes nothing that isn't already bound to the caller's cookie jar.
 */
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(_c: Array<{ name: string; value: string; options: CookieOptions }>) {
          // read-only
        },
      },
    },
  )

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
  }

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
  })
}
