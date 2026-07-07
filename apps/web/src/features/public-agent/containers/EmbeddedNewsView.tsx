'use client'

import { ExternalLink } from 'lucide-react'
import type { WidgetNewsItem } from '../services/public-agent.service'

interface EmbeddedNewsViewProps {
  items: WidgetNewsItem[]
  teamName: string
  accent: string
}

export function EmbeddedNewsView({ items, teamName, accent }: EmbeddedNewsViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <p className="text-sm text-white/40">No updates yet</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-base font-semibold text-white">Updates</h3>
        <p className="mt-0.5 text-xs text-white/50">Latest from {teamName}</p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
          >
            {item.imageUrl && (
              <img src={item.imageUrl} alt="" className="h-40 w-full object-cover" />
            )}
            <div className="p-3.5">
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">{item.body}</p>
              <div className="mt-2.5 flex items-center justify-between">
                {item.publishedAt && (
                  <span className="text-[11px] text-white/30">
                    {new Date(item.publishedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                )}
                {item.linkUrl && (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs transition-colors hover:text-white"
                    style={{ color: accent }}
                  >
                    Read more
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
