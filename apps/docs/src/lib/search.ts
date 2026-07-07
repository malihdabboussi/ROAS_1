import { getAllDocs } from './mdx'
import type { SearchEntry } from './types'

export type { SearchEntry }

export function buildSearchIndex(): SearchEntry[] {
  const docs = getAllDocs()
  return docs.map((doc) => ({
    slug: doc.slug,
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    content: stripMdx(doc.content),
  }))
}

function stripMdx(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}
