import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  if (pathname !== '/waitlist' && pathname !== '/waitlist/') {
    return NextResponse.next()
  }
  const url = request.nextUrl.clone()
  url.pathname = '/'
  const params = new URLSearchParams(searchParams.toString())
  params.set('openWaitlist', '1')
  url.search = params.toString()
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/waitlist', '/waitlist/'],
}
