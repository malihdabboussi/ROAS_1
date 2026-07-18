'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Play, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

export interface ChatQueueItem {
  id: string
  content: string
}

interface MessageQueueProps<TItem extends ChatQueueItem = ChatQueueItem> {
  items: TItem[]
  onRemove: (itemId: string) => void
  onSendNow: (itemId: string) => void
  onEdit: (item: TItem) => void
}

export function MessageQueue<TItem extends ChatQueueItem>({
  items,
  onRemove,
  onSendNow,
  onEdit,
}: MessageQueueProps<TItem>) {
  if (items.length === 0) return null

  return (
    <div className="gap-spacing-1 px-spacing-1 pb-spacing-2 flex flex-col">
      <span className="body-4 text-muted-foreground px-spacing-1">Queued ({items.length})</span>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 group flex cursor-pointer items-center transition-opacity hover:opacity-80">
              <button
                type="button"
                onClick={() => onEdit(item)}
                aria-label={`Edit ${item.content}`}
                className="body-3 text-muted-foreground min-w-0 flex-1 truncate text-left"
              >
                {item.content}
              </button>

              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <Tooltip label="Send now">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onSendNow(item.id)
                    }}
                    className="btn-icon-glass-sm shrink-0"
                    aria-label="Send now"
                  >
                    <Play className="icon-xs" />
                  </button>
                </Tooltip>
                <Tooltip label="Remove">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemove(item.id)
                    }}
                    className="btn-icon-glass-destructive btn-icon-glass-sm shrink-0"
                    aria-label="Remove from queue"
                  >
                    <Trash2 className="icon-xs" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
