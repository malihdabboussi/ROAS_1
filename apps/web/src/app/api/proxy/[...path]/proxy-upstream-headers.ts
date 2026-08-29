export function applyVercelProtectionBypass(
  headers: Headers,
  targetUrl: string,
  bypassSecret: string | undefined,
): void {
  if (!bypassSecret) return
  const hostname = new URL(targetUrl).hostname
  if (!hostname.endsWith('.vercel.app')) return
  headers.set('x-vercel-protection-bypass', bypassSecret)
}
