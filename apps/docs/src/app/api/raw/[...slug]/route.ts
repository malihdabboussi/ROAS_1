import { NextResponse } from 'next/server'
import { getDocBySlug } from '@/lib/mdx'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const slugPath = slug.join('/')
  const doc = getDocBySlug(slugPath)

  if (!doc) {
    return new NextResponse('Not found', { status: 404 })
  }

  const frontmatterBlock = [
    `# ${doc.frontmatter.title}`,
    doc.frontmatter.description ? `\n> ${doc.frontmatter.description}` : '',
    '\n---\n',
  ].join('')

  const markdown = frontmatterBlock + doc.raw

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
