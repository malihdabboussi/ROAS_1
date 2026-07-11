export const ORG_PUBLIC_URL_PREFIX = 'roas.io/org'

export function formatOrgPublicUrl(slug: string | null | undefined) {
  const normalizedSlug = slug?.trim()
  return `${ORG_PUBLIC_URL_PREFIX}/${normalizedSlug || '...'}`
}
