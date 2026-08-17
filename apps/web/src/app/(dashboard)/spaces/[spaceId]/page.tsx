import { redirect } from 'next/navigation'

/** Portal/ClickUp still emit `/spaces/{spaceId}?item=…`. Canonical app links use query form. */
export default async function SpacePathRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { spaceId } = await params
  const query = await searchParams
  const next = new URLSearchParams()
  next.set('space', spaceId)

  for (const [key, value] of Object.entries(query)) {
    if (key === 'space' || value == null) continue
    if (Array.isArray(value)) {
      for (const entry of value) next.append(key, entry)
      continue
    }
    next.set(key, value)
  }

  redirect(`/spaces?${next.toString()}`)
}
