'use client'

/** Marketing mockup avatar: same crop treatment as SpacesHero AssigneeAvatar / org mocks */
export function MarketingPortraitCircle(props: {
  src: string
  alt?: string
  /** Tailwind sizing, e.g. h-7 w-7 */
  className?: string
}) {
  const { src, alt = '', className = 'h-7 w-7' } = props
  if (!src) {
    return <div className={`shrink-0 rounded-full bg-white/15 ring-1 ring-white/10 ${className}`} aria-hidden />
  }
  return (
    <div className={`shrink-0 overflow-hidden rounded-full ring-1 ring-white/15 ${className}`}>
      <img src={src} alt={alt} className="h-full w-full object-cover object-center" decoding="async" />
    </div>
  )
}
