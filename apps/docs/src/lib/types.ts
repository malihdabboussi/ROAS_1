export interface NavLink {
  title: string
  href: string
  slug: string
}

export interface NavSection {
  group: string
  links: NavLink[]
}

export interface TocItem {
  id: string
  title: string
  level: number
}

export interface SearchEntry {
  slug: string
  title: string
  description: string
  content: string
}
