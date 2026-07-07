import { docsConfig } from '../../docs.config'
import { getDocBySlug } from './mdx'
import type { NavLink, NavSection } from './types'

export type { NavLink, NavSection }

export function getNavigation(): NavSection[] {
  return docsConfig.navigation.map((group) => ({
    group: group.group,
    links: group.pages.map((slug) => {
      const doc = getDocBySlug(slug)
      return {
        title: doc?.frontmatter.title || formatSlugTitle(slug),
        href: `/${slug}`,
        slug,
      }
    }),
  }))
}

export function getPrevNext(currentSlug: string): { prev: NavLink | null; next: NavLink | null } {
  const allPages = docsConfig.navigation.flatMap((group) =>
    group.pages.map((slug) => {
      const doc = getDocBySlug(slug)
      return {
        title: doc?.frontmatter.title || formatSlugTitle(slug),
        href: `/${slug}`,
        slug,
      }
    }),
  )

  const index = allPages.findIndex((p) => p.slug === currentSlug)
  return {
    prev: index > 0 ? (allPages[index - 1] ?? null) : null,
    next: index < allPages.length - 1 ? (allPages[index + 1] ?? null) : null,
  }
}

function formatSlugTitle(slug: string): string {
  const name = slug.split('/').pop() || slug
  return name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
