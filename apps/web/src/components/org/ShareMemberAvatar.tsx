'use client'

import { useEffect, useState } from 'react'

export function ShareMemberAvatar({
  avatarUrl,
  name,
  initials,
  sizeClass = 'h-spacing-8 w-spacing-8',
  textClassName = 'typo-caption',
}: {
  avatarUrl: string | null | undefined
  name: string
  initials: string
  sizeClass?: string
  textClassName?: string
}) {
  const [failed, setFailed] = useState(false)
  const url = avatarUrl?.trim() || null

  useEffect(() => {
    setFailed(false)
  }, [url])

  const showImage = Boolean(url) && !failed

  return (
    <div
      className={`bg-secondary flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full`}
    >
      {showImage ? (
        <img
          src={url!}
          alt={name}
          referrerPolicy="no-referrer"
          className={`${sizeClass} rounded-full object-cover`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={`text-foreground font-medium ${textClassName}`}>{initials}</span>
      )}
    </div>
  )
}
