import { isDefinedNoteTakerId } from '@/lib/integrations/meeting-provider-definitions'
import type { Integration, UserIntegration } from './integrations.types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function metadataText(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function maskedIdentity(prefix: string, value: string | null): string | null {
  if (!value) return null
  return `${prefix} ••••${value.slice(-6)}`
}

export function resolveIntegrationConnectionIdentity(
  userIntegration: UserIntegration,
  integration: Integration,
): string | null {
  const metadata = userIntegration.metadata ?? {}
  const provider = integration.provider.toLowerCase()
  const storedLabel = userIntegration.connection_label?.trim() || null

  // A Meta connection belongs to the Facebook login, not to its first client Page.
  if (provider === 'meta' || provider === 'facebook' || provider === 'meta ads') {
    const pages = Array.isArray(metadata.pages)
      ? (metadata.pages as Array<{
          name?: string
          instagram_business_account?: { username?: string }
        }>)
      : []
    const storedLabelIsPage = pages.some(
      (page) =>
        page.name?.trim() === storedLabel ||
        (page.instagram_business_account?.username
          ? `@${page.instagram_business_account.username.trim()}` === storedLabel
          : false),
    )
    if (storedLabel && !UUID_PATTERN.test(storedLabel) && !storedLabelIsPage) return storedLabel
    return (
      metadataText(metadata, 'meta_user_name') ??
      maskedIdentity('Facebook account', metadataText(metadata, 'meta_user_id'))
    )
  }

  if (storedLabel && !UUID_PATTERN.test(storedLabel)) return storedLabel

  if (provider === 'slack') {
    return metadataText(metadata, 'teamName') ?? metadataText(metadata, 'team_name')
  }
  if (provider === 'paypal') return metadataText(metadata, 'email')
  if (provider === 'dropbox') {
    return metadataText(metadata, 'display_name') ?? metadataText(metadata, 'email')
  }
  if (provider === 'calendly') return metadataText(metadata, 'calendly_user_email')
  if (provider === 'fireflies') {
    return metadataText(metadata, 'name') ?? metadataText(metadata, 'email')
  }
  if (provider === 'read_ai') return metadataText(metadata, 'owner_email') ?? 'Read AI'
  if (isDefinedNoteTakerId(provider)) return metadataText(metadata, 'email')
  if (provider === 'fathom') {
    return (
      metadataText(metadata, 'email') ??
      metadataText(metadata, 'display_name') ??
      metadataText(metadata, 'name') ??
      metadataText(metadata, 'team_name')
    )
  }
  if (provider === 'stripe') return metadataText(metadata, 'stripe_user_id')
  if (provider === 'openai_codex' || provider === 'openai-codex') {
    return (
      metadataText(metadata, 'email') ??
      maskedIdentity('Codex account', metadataText(metadata, 'account_id') ?? storedLabel)
    )
  }
  if (provider === 'higgsfield') {
    return (
      metadataText(metadata, 'email') ??
      metadataText(metadata, 'name') ??
      maskedIdentity('Higgsfield account', metadataText(metadata, 'server_id'))
    )
  }
  if (provider === 'page_grader') return metadataText(metadata, 'base_url_host')

  return metadataText(metadata, 'email')
}

export function getIntegrationConnectionDisplayLabel(input: {
  userIntegration: UserIntegration
  integration: Integration
  accountIndex: number
  accountCount: number
}): string {
  const identity = resolveIntegrationConnectionIdentity(input.userIntegration, input.integration)
  if (identity) return identity
  if (input.accountCount > 1) return `${input.integration.name} account ${input.accountIndex}`
  return input.integration.name
}

export function getIntegrationGroupIdentitySummary(
  rows: UserIntegration[],
  integration: Integration,
): string | null {
  const identities = Array.from(
    new Set(
      rows
        .map((row) => resolveIntegrationConnectionIdentity(row, integration))
        .filter((value): value is string => Boolean(value)),
    ),
  )
  if (identities.length === 0) return null
  if (identities.length <= 2) return identities.join(', ')
  return `${identities.slice(0, 2).join(', ')} +${identities.length - 2} more`
}
