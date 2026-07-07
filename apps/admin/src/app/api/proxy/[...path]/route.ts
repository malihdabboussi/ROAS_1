import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params
  const backendPath = `/api/${path.join('/')}`
  const url = new URL(backendPath, BACKEND_URL)

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value)
  })

  const headers = new Headers()
  const authHeader = request.headers.get('authorization')
  if (authHeader) headers.set('Authorization', authHeader)
  headers.set('Content-Type', request.headers.get('content-type') ?? 'application/json')

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    signal: request.signal,
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = Buffer.from(await request.arrayBuffer())
  }

  const backendRes = await fetch(url.toString(), fetchOptions)
  const contentType = backendRes.headers.get('content-type') ?? 'application/json'

  if (backendRes.status === 204) {
    return new NextResponse(null, { status: 204 })
  }

  const body = await backendRes.text()
  return new NextResponse(body, {
    status: backendRes.status,
    headers: { 'Content-Type': contentType },
  })
}

export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const PATCH = proxyRequest
export const DELETE = proxyRequest
