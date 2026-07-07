'use client'

import type { Dispatch, MutableRefObject, SetStateAction, WheelEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { reorderAgents } from '@/features/mission-control/services/missions.service'
import type { MissionAgent } from '@/features/mission-control/types'
import {
  TeamAgentsCarousel,
  type CarouselScrollDelta,
} from '@/features/team/containers/TeamAgentsCarousel'

export function SkillsAgentsPanel({
  agents,
  selectedAgentId,
  dragAgentId,
  dragOverAgentId,
  roleLabelRefs,
  carouselRef,
  setSelectedAgentId,
  setDragAgentId,
  setDragOverAgentId,
  setAgents,
  handlePinAgent,
  handleRenameAgent,
  pinnedAgentIds,
}: {
  agents: MissionAgent[]
  selectedAgentId: string | null
  dragAgentId: string | null
  dragOverAgentId: string | null
  roleLabelRefs: MutableRefObject<Record<string, HTMLSpanElement | null>>
  carouselRef: MutableRefObject<HTMLDivElement | null>
  setSelectedAgentId: (id: string) => void
  setDragAgentId: Dispatch<SetStateAction<string | null>>
  setDragOverAgentId: Dispatch<SetStateAction<string | null>>
  setAgents: Dispatch<SetStateAction<MissionAgent[]>>
  handlePinAgent: (agentId: string) => void
  handleRenameAgent: (agentId: string, newName: string) => Promise<void>
  pinnedAgentIds: Set<string>
}) {
  const [carouselVariant, setCarouselVariant] = useState<'horizontal' | 'vertical'>('vertical')

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setCarouselVariant(mq.matches ? 'horizontal' : 'vertical')
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const scrollCarouselBy = useCallback(
    (delta: CarouselScrollDelta) => {
      const el = carouselRef.current
      if (!el) return
      el.scrollBy({
        left: delta.left ?? 0,
        top: delta.top ?? 0,
        behavior: 'smooth',
      })
    },
    [carouselRef],
  )

  const handleCarouselWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      const el = carouselRef.current
      if (!el) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      el.scrollBy({ left: event.deltaY, top: 0, behavior: 'auto' })
    },
    [carouselRef],
  )

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <TeamAgentsCarousel
        variant={carouselVariant}
        fullBleedVertical
        showHireButton={false}
        showAgentSlideMenu={false}
        agents={agents}
        selectedId={selectedAgentId}
        dragAgentId={dragAgentId}
        dragOverAgentId={dragOverAgentId}
        roleLabelRefs={roleLabelRefs}
        carouselRef={carouselRef}
        setShowReadyEmployees={() => {}}
        scrollCarouselBy={scrollCarouselBy}
        handleCarouselWheel={handleCarouselWheel}
        setSelectedId={setSelectedAgentId}
        setDragAgentId={setDragAgentId}
        setDragOverAgentId={setDragOverAgentId}
        setAgents={setAgents}
        reorderAgents={reorderAgents}
        onPinAgent={handlePinAgent}
        onRenameAgent={handleRenameAgent}
        pinnedAgentIds={pinnedAgentIds}
      />
    </div>
  )
}
