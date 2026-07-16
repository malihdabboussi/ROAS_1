import { redirect } from 'next/navigation'

/**
 * Workspace settings live in a modal, not a standalone page.
 * Preserve OAuth / deep-link query params onto /home so IntegrationReturnHandler can open Manage.
 */
export default async function SettingsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') qs.set(key, value)
    else if (Array.isArray(value) && value[0]) qs.set(key, value[0])
  }
  if (!qs.has('tab')) qs.set('tab', 'manage')
  const query = qs.toString()
  redirect(query ? `/home?${query}` : '/home?tab=manage')
}
