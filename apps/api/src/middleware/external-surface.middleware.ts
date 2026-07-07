import type { NextFunction, Request, Response } from 'express'

/**
 * This API is mounted with global prefix `/api` and exposes a few root static files.
 * Anything else (scanner paths like /.env, /wp-login.php, etc.) is rejected at the
 * edge of the Express stack so it never reaches Nest (no bogus 500 / error logs).
 */
const ROOT_STATIC = new Set([
  '/favicon.ico',
  '/favicon.png',
  '/capture.js',
  '/.well-known/oauth-authorization-server',
  '/.well-known/openid-configuration',
])

function isApiOrStaticPath(pathname: string): boolean {
  if (pathname === '/api' || pathname.startsWith('/api/')) return true
  return ROOT_STATIC.has(pathname)
}

export function enforceApiSurface(req: Request, res: Response, next: NextFunction) {
  const pathname = (req.path && req.path.length > 0 ? req.path : '/') || '/'
  if (isApiOrStaticPath(pathname)) {
    return next()
  }
  res.status(404).end()
}
