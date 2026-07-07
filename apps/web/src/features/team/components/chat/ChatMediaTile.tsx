'use client'

import { Music } from 'lucide-react'

interface ChatMediaTileProps {
  kind: 'image' | 'video' | 'audio'
  url: string
  alt?: string
  className?: string
}

export function ChatMediaTile({ kind, url, alt = '', className = '' }: ChatMediaTileProps) {
  if (kind === 'image') {
    return <img src={url} alt={alt} className={`h-full w-full object-cover ${className}`.trim()} />
  }

  if (kind === 'audio') {
    return (
      <div
        className={`bg-surface-subtle flex h-full w-full flex-col items-center justify-center gap-1 ${className}`.trim()}
      >
        <Music className="icon-sm text-muted-foreground" />
        <audio
          src={url}
          controls
          preload="metadata"
          className="h-spacing-7 w-spacing-36 max-w-full"
        />
      </div>
    )
  }

  return (
    <video
    src={url}
    muted
    playsInline
    preload="metadata"
    className={`surface-bg h-full w-full object-cover ${className}`.trim()}
    aria-label={alt || 'Video clip'}
  />
  )
}
