'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { ListTodo } from 'lucide-react'
import type { ChatRenderMessage } from '@/lib/chat/chat-render-message'
import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'

interface ActivePlan {
  planId: string
  title: string
  completed: number
  total: number
}

export function findActivePlan(messages: ChatRenderMessage[]): ActivePlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (!msg || msg.role !== 'assistant') continue
    const blocks = (msg.metadata?.content_blocks_ordered as MessageContentBlock[]) ?? []
    for (let j = blocks.length - 1; j >= 0; j--) {
      const block = blocks[j]
      if (!block || block.type !== 'chat_plan') continue
      if (block.plan_status !== 'active') continue
      const completed = block.items.filter((item) => item.status === 'completed').length
      return { planId: block.plan_id, title: block.title, completed, total: block.items.length }
    }
  }
  return null
}

export function PlanStickyTracker({
  messages,
  scrollContainerRef,
}: {
  messages: ChatRenderMessage[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
  const [isCardOutOfView, setIsCardOutOfView] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const observedElementRef = useRef<Element | null>(null)

  const activePlan = useMemo(() => findActivePlan(messages), [messages])

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
      observedElementRef.current = null
    }

    if (!activePlan) {
      setIsCardOutOfView(false)
      return
    }

    const scrollEl = scrollContainerRef.current
    if (!scrollEl) return

    const setup = () => {
      const el = scrollEl.querySelector(`[data-plan-id="${activePlan.planId}"]`)
      if (!el) {
        setIsCardOutOfView(false)
        return
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry) setIsCardOutOfView(!entry.isIntersecting)
        },
        { root: scrollEl, threshold: 0.1 },
      )

      observer.observe(el)
      observerRef.current = observer
      observedElementRef.current = el
    }

    setup()
    const timer = setTimeout(setup, 500)

    return () => {
      clearTimeout(timer)
      observerRef.current?.disconnect()
    }
  }, [activePlan, scrollContainerRef, messages])

  const handleClick = useCallback(() => {
    if (!activePlan) return
    const scrollEl = scrollContainerRef.current
    if (!scrollEl) return
    const el = scrollEl.querySelector(`[data-plan-id="${activePlan.planId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activePlan, scrollContainerRef])

  if (!activePlan || !isCardOutOfView) return null

  const pct = activePlan.total > 0 ? Math.round((activePlan.completed / activePlan.total) * 100) : 0

  return (
    <div className="px-spacing-4 flex-shrink-0">
      <button
        type="button"
        onClick={handleClick}
        className="surface-card border-border gap-spacing-3 rounded-b-spacing-4 px-spacing-4 py-spacing-2 mx-auto flex w-full max-w-3xl cursor-pointer items-center border border-t-0 transition-opacity hover:opacity-80"
      >
        <ListTodo className="icon-sm text-primary flex-shrink-0" />
        <span className="body-3 text-foreground min-w-0 flex-1 truncate font-medium">
          {activePlan.title}
        </span>
        <div className="gap-spacing-2 flex items-center">
          <div className="progress-bar-track w-spacing-16 relative">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="body-3 text-muted-foreground flex-shrink-0 tabular-nums">
            {activePlan.completed}/{activePlan.total}
          </span>
        </div>
      </button>
    </div>
  )
}
