import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { NavSection } from '@/lib/types'

interface BreadcrumbsProps {
  slug: string
  navigation: NavSection[]
}

export function Breadcrumbs({ slug, navigation }: BreadcrumbsProps) {
  const group = navigation.find((section) => section.links.some((link) => link.slug === slug))
  const page = group?.links.find((link) => link.slug === slug)

  return (
    <nav className="text-muted-foreground mb-4 flex items-center gap-1 text-[14px]">
      <Link href="/" className="hover:text-foreground transition-colors">
        Docs
      </Link>
      {group && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{group.group}</span>
        </>
      )}
      {page && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span style={{ color: 'var(--foreground)', fontWeight: 500 }}>{page.title}</span>
        </>
      )}
    </nav>
  )
}
