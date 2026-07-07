import { NextRequest, NextResponse } from 'next/server'
import { renderSpaceDocDocxBytes } from '@/features/spaces/components/doc-menu/export-space-doc-docx.server'
import { sanitizeFilename } from '@/features/studio/utils/artifact-export'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title =
    typeof (body as { title?: unknown }).title === 'string'
      ? (body as { title: string }).title
      : 'Untitled'
  const docBody =
    typeof (body as { docBody?: unknown }).docBody === 'string'
      ? (body as { docBody: string }).docBody
      : ''

  if (!docBody.trim()) {
    return NextResponse.json({ error: 'docBody is required' }, { status: 400 })
  }

  try {
    const bytes = await renderSpaceDocDocxBytes(title, docBody)
    const filename = `${sanitizeFilename(title, 'doc')}.docx`
    return new Response(bytes as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate DOCX' }, { status: 500 })
  }
}
