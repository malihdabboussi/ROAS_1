import { BadRequestException } from '@nestjs/common'

export function sanitizeFunnelBundlePath(path: string): string {
  const value = String(path ?? '').trim()
  if (
    !value ||
    value.startsWith('/') ||
    /^[A-Za-z]:/.test(value) ||
    value.includes('\\') ||
    value.split('/').includes('..')
  ) {
    throw new BadRequestException('Invalid funnel file path')
  }
  return value
}

export function getMimeTypeForFunnelPath(path: string): string {
  if (path.endsWith('.html') || path.endsWith('.htm')) return 'text/html'
  if (path.endsWith('.css')) return 'text/css'
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text/javascript'
  if (path.endsWith('.json')) return 'application/json'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  return 'text/plain'
}
