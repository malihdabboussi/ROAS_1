export interface WebsiteNavItem {
  label: string
  path: string
  style?: 'link' | 'button'
}

export interface WebsiteLayout {
  navigation?: {
    logo?: { url: string; alt: string }
    items?: WebsiteNavItem[]
  }
  footer?: {
    copyright?: string
  }
  favicon_url?: string
}
