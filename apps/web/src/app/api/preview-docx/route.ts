import { NextRequest, NextResponse } from 'next/server'
import { convertDocxUrlToHtml } from '@/components/deliverables/convert-docx-url-to-html.server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const fileUrl =
    typeof (body as { fileUrl?: unknown }).fileUrl === 'string'
      ? (body as { fileUrl: string }).fileUrl.trim()
      : ''

  if (!fileUrl) {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 })
  }

  try {
    const html = await convertDocxUrlToHtml(fileUrl)
    return NextResponse.json({ html })
  } catch {
    return NextResponse.json({ error: 'Failed to generate DOCX preview' }, { status: 500 })
  }
}
