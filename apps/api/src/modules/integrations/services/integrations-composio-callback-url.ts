export function buildComposioCallbackRedirectUrl(
  redirectToRaw?: string,
  integrationIdRaw?: string,
  errorRaw?: string,
  messageRaw?: string,
): string {
  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const fallback = new URL('/settings?tab=manage', appUrl)

  let target = fallback
  if (typeof redirectToRaw === 'string' && redirectToRaw.trim().length > 0) {
    try {
      const parsed = new URL(redirectToRaw)
      if (parsed.origin === fallback.origin) {
        target = parsed
      }
    } catch {
      // Fall back to APP_URL settings route when redirect_to is invalid.
    }
  }

  target.searchParams.set('tab', target.searchParams.get('tab') || 'manage')

  const integrationId =
    typeof integrationIdRaw === 'string' && integrationIdRaw.trim().length > 0
      ? integrationIdRaw.trim().toLowerCase()
      : null
  if (integrationId) target.searchParams.set('integration', integrationId)

  const hasError = typeof errorRaw === 'string' && errorRaw.trim().length > 0
  if (hasError) {
    target.searchParams.set('composio_error', errorRaw!.trim())
    if (typeof messageRaw === 'string' && messageRaw.trim().length > 0) {
      target.searchParams.set('composio_error_message', messageRaw.trim())
    }
  } else {
    target.searchParams.set('composio_connected', '1')
  }

  return target.toString()
}
