import { notFound, redirect } from 'next/navigation'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { CopyPageDropdown } from '@/components/layout/CopyPageDropdown'
import { Header } from '@/components/layout/Header'
import { PrevNext } from '@/components/layout/PrevNext'
import { Sidebar } from '@/components/layout/Sidebar'
import { TableOfContents } from '@/components/layout/TableOfContents'
import { mdxComponents } from '@/components/mdx'
import { compileMdxContent, getDocBySlug, getDocSlugs } from '@/lib/mdx'
import { getNavigation, getPrevNext } from '@/lib/navigation'
import { buildSearchIndex } from '@/lib/search'
import { extractToc } from '@/lib/toc'

interface PageProps {
  params: Promise<{ slug?: string[] }>
}

export async function generateStaticParams() {
  const slugs = getDocSlugs()
  return slugs.map((slug) => ({
    slug: slug.split('/'),
  }))
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  if (!slug || slug.length === 0) return { title: 'Documentation | Vibey' }

  const doc = getDocBySlug(slug.join('/'))
  if (!doc) return { title: 'Not Found | Vibey' }

  return {
    title: `${doc.frontmatter.title} | Vibey`,
    description: doc.frontmatter.description,
  }
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params

  if (!slug || slug.length === 0) {
    redirect('/getting-started/what-is-vibey')
  }

  const slugPath = slug.join('/')
  const doc = getDocBySlug(slugPath)

  if (!doc) notFound()

  const navigation = getNavigation()
  const searchEntries = buildSearchIndex()
  const toc = extractToc(doc.raw)
  const { prev, next } = getPrevNext(slugPath)
  const content = await compileMdxContent(doc.raw, mdxComponents)

  return (
    <div className="flex min-h-screen flex-col">
      <Header navigation={navigation} searchEntries={searchEntries} />
      <div className="flex flex-1">
        <Sidebar navigation={navigation} currentSlug={slugPath} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
            <Breadcrumbs slug={slugPath} navigation={navigation} />
            <article className="prose-docs mt-2">
              <div className="flex items-start justify-between gap-4">
                <h1 className="!mb-0">{doc.frontmatter.title}</h1>
                <CopyPageDropdown slug={slugPath} rawMarkdown={doc.raw} />
              </div>
              {doc.frontmatter.description && (
                <p
                  className="mb-8 mt-1 text-[15px] leading-relaxed"
                  style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}
                >
                  {doc.frontmatter.description}
                </p>
              )}
              {content}
            </article>
            <PrevNext prev={prev} next={next} />
          </div>
        </main>
        <TableOfContents items={toc} />
      </div>
    </div>
  )
}
