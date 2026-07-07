/** Marketing-site paths that should open the waitlist modal (not full navigation). */
export function isWaitlistNavigationHref(_href: string): boolean {
  return false
}

/** Optional prefill for the modal when the link carried ?plan= */
export function getWaitlistNotesFromHref(href: string): string | undefined {
  if (!isWaitlistNavigationHref(href)) return undefined
  const qStart = href.indexOf('?')
  if (qStart === -1) return undefined
  const hashStart = href.indexOf('#', qStart)
  const query = hashStart === -1 ? href.slice(qStart + 1) : href.slice(qStart + 1, hashStart)
  const plan = new URLSearchParams(query).get('plan')
  if (!plan) return undefined
  return `Interested in plan: ${plan}`
}
