import { File, UserRound } from 'lucide-react'
import { OptionDot } from '@/components/ui/status/OptionBadge'
import type { AtMentionItem, StudioAtMenuTabId } from './chat-input-at-mentions'

export function StudioComposerAtTabStrip({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: readonly { id: StudioAtMenuTabId; label: string }[]
  activeTab: StudioAtMenuTabId
  onTabChange: (id: StudioAtMenuTabId) => void
}) {
  return (
    <div className="border-border scrollbar-thin gap-spacing-5 px-spacing-4 pt-spacing-2 flex flex-nowrap overflow-x-auto border-b">
      {tabs.map(({ id, label }) => {
        const active = id === activeTab
        return (
          <button
            key={id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onTabChange(id)}
            className={`body-4 pb-spacing-2 shrink-0 whitespace-nowrap border-b-2 font-medium transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'hover:text-foreground text-muted-foreground border-transparent'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function AtItemThumbnail({ item }: { item: AtMentionItem }) {
  const url = item.thumbnailUrl
  if (!url) return null
  const mime = item.type ?? ''
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(url)) {
    return (
      <div className="bg-muted-20 relative h-4 w-4 flex-shrink-0 overflow-hidden rounded">
        <img
          src={url}
          alt=""
          className="pointer-events-none h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    )
  }
  if (mime === 'application/pdf') {
    return (
      <div className="bg-muted-20 relative h-4 w-4 flex-shrink-0 overflow-hidden rounded">
        <iframe
          src={url}
          title=""
          className="pointer-events-none h-full w-full border-0"
          loading="lazy"
        />
      </div>
    )
  }
  if (mime.startsWith('video/')) {
    return (
      <div className="bg-muted-20 relative h-4 w-4 flex-shrink-0 overflow-hidden rounded">
        <video
          src={url}
          muted
          preload="metadata"
          className="pointer-events-none h-full w-full object-cover"
        />
      </div>
    )
  }
  return (
    <div className="bg-muted-20 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded">
      <File className="text-muted-foreground h-3 w-3" />
    </div>
  )
}

export function StudioAtMentionLeading({ item }: { item: AtMentionItem }) {
  if (item.section === 'space-task') {
    return <OptionDot color={item.spaceTaskStatusColor} size="sm" />
  }
  if (item.section === 'person') {
    return item.thumbnailUrl ? (
      <img
        src={item.thumbnailUrl}
        alt=""
        className="h-4 w-4 shrink-0 rounded-full object-cover"
        loading="lazy"
      />
    ) : (
      <UserRound className="text-muted-foreground h-4 w-4 shrink-0" />
    )
  }
  if (item.thumbnailUrl) return <AtItemThumbnail item={item} />
  return null
}

export function StudioAtMentionTrailingType({ item }: { item: AtMentionItem }) {
  if (item.section === 'space-task') return null
  if (!item.type) return null
  return (
    <span className="body-4 text-muted-foreground hidden shrink-0 truncate sm:inline">
      {item.type}
    </span>
  )
}

export function StudioAtMoreRowLeadingSpacer({
  variant,
}: {
  variant: 'thumbnail-slot' | 'status-dot-slot'
}) {
  if (variant === 'status-dot-slot') {
    return (
      <span aria-hidden className="inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center" />
    )
  }
  return <span aria-hidden className="h-4 w-4 shrink-0" />
}
