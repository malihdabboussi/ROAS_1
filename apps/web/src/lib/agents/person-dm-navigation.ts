export function personDmUrl(userId: string) {
  return `/team?dm=${encodeURIComponent(userId)}`
}

export function personDmAbsoluteUrl(userId: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${personDmUrl(userId)}`
}
