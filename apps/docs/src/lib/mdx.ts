import 'server-only'
import fs from 'fs'
import path from 'path'
import { compileMDX } from 'next-mdx-remote/rsc'
import matter from 'gray-matter'
import remarkGfm from 'remark-gfm'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export interface DocFrontmatter {
  title: string
  description: string
  icon?: string
}

export interface DocPage {
  slug: string
  frontmatter: DocFrontmatter
  content: string
}

export function getDocSlugs(): string[] {
  const slugs: string[] = []

  function walk(dir: string, prefix: string) {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), `${prefix}${entry.name}/`)
      } else if (entry.name.endsWith('.mdx')) {
        const slug = `${prefix}${entry.name.replace(/\.mdx$/, '')}`
        if (slug !== 'index') slugs.push(slug)
      }
    }
  }

  walk(CONTENT_DIR, '')
  return slugs
}

export function getDocBySlug(slug: string): { frontmatter: DocFrontmatter; raw: string } | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filePath)) return null

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const { data, content } = matter(fileContent)

  return {
    frontmatter: {
      title: data.title || slug.split('/').pop() || '',
      description: data.description || '',
      icon: data.icon,
    },
    raw: content,
  }
}

export async function compileMdxContent(
  raw: string,
  components: Record<string, React.ComponentType<any>>,
) {
  const { content } = await compileMDX({
    source: raw,
    components,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  })

  return content
}

export function getAllDocs(): DocPage[] {
  const slugs = getDocSlugs()
  const docs: DocPage[] = []

  for (const slug of slugs) {
    const doc = getDocBySlug(slug)
    if (doc) {
      docs.push({ slug, frontmatter: doc.frontmatter, content: doc.raw })
    }
  }

  return docs
}
