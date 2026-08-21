export function openGoogleExportTab(): Window | null {
  if (typeof window === 'undefined') return null
  const tab = window.open('about:blank', '_blank')
  if (tab) tab.opener = null
  return tab
}

export function finishGoogleExportTab(tab: Window | null, href: string): boolean {
  if (tab && !tab.closed) {
    tab.location.replace(href)
    return true
  }
  if (typeof window === 'undefined') return false
  return Boolean(window.open(href, '_blank', 'noopener,noreferrer'))
}

export function abandonGoogleExportTab(tab: Window | null): void {
  tab?.close()
}
