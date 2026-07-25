'use client'

import type { Dispatch, SetStateAction } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { cachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { sortSpacesWithFavoritesFirst } from '@/features/spaces/hooks/use-space-user-state'
import { updateSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import {
  invalidateProgramsListCache,
  updateProgram,
  writeProgramsLocalCache,
  type Program,
} from '@/lib/programs'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'
import { SIDEBAR_TOAST_ERRORS } from '../config/sidebar-toast-errors.config'
import type { SidebarControllerReturn } from './useSidebarController'

type SidebarTreeMutationOptions = {
  activeOrgId: string | null
  programs: Program[]
  setPrograms: Dispatch<SetStateAction<Program[]>>
  spaces: Space[]
  favoriteIds: Set<string>
  setExpandedIds: Dispatch<SetStateAction<Set<string>>>
  setExpandedProgramIds: Dispatch<SetStateAction<Set<string>>>
  controller: SidebarControllerReturn
}

export function createSidebarTreeMutationHandlers({
  activeOrgId,
  programs,
  setPrograms,
  spaces,
  favoriteIds,
  setExpandedIds,
  setExpandedProgramIds,
  controller,
}: SidebarTreeMutationOptions) {
  const handleMoveSpace = async (spaceId: string, toCampaignId: string) => {
    const previous = spaces.find((space) => space.id === spaceId)
    if (!previous || previous.campaign_id === toCampaignId) return
    const applyCampaign = (campaignId: string | null) => {
      cachedSpaces.mutate((rows) =>
        (rows ?? []).map((space) =>
          space.id === spaceId ? { ...space, campaign_id: campaignId } : space,
        ),
      )
      useSpacesStore.setState((state) => ({
        spaces: state.spaces.map((space) =>
          space.id === spaceId ? { ...space, campaign_id: campaignId } : space,
        ),
      }))
    }
    applyCampaign(toCampaignId)
    setExpandedIds((current) => new Set([...current, toCampaignId]))
    try {
      await updateSpace(spaceId, { campaign_id: toCampaignId })
    } catch (error) {
      applyCampaign(previous.campaign_id ?? null)
      toast.error(sanitizeUserError(error, SIDEBAR_TOAST_ERRORS.MOVE_SPACE_FAILED.userMessage))
    }
  }

  const handleMoveCampaign = (campaignId: string, toProgramId: string | null) => {
    if (toProgramId) {
      setExpandedProgramIds((current) => new Set([...current, toProgramId]))
    }
    void controller.moveCampaignToProgram(campaignId, toProgramId)
  }

  const handleReorderPrograms = async (activeId: string, overId: string) => {
    const oldIndex = programs.findIndex((program) => program.id === activeId)
    const newIndex = programs.findIndex((program) => program.id === overId)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
    const previous = programs
    const next = arrayMove(programs, oldIndex, newIndex).map((program, index) => ({
      ...program,
      sort_order: index,
    }))
    setPrograms(next)
    writeProgramsLocalCache(activeOrgId, next)
    try {
      const changed = next.filter((program) => {
        const before = previous.find((candidate) => candidate.id === program.id)
        return !before || before.sort_order !== program.sort_order
      })
      await Promise.all(
        changed.map((program) => updateProgram(program.id, { sort_order: program.sort_order })),
      )
      invalidateProgramsListCache(activeOrgId)
    } catch (error) {
      setPrograms(previous)
      writeProgramsLocalCache(activeOrgId, previous)
      toast.error(
        sanitizeUserError(error, SIDEBAR_TOAST_ERRORS.REORDER_PROGRAMS_FAILED.userMessage),
      )
    }
  }

  const handleReorderSpaces = async (campaignId: string, activeId: string, overId: string) => {
    const inCampaign = spaces.filter(
      (space) => space.campaign_id === campaignId && !space.share_meta,
    )
    const ordered = sortSpacesWithFavoritesFirst(inCampaign, favoriteIds)
    const oldIndex = ordered.findIndex((space) => space.id === activeId)
    const newIndex = ordered.findIndex((space) => space.id === overId)
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
    const nextOrdered = arrayMove(ordered, oldIndex, newIndex).map((space, index) => ({
      ...space,
      sort_order: index,
    }))
    const sortOrderById = new Map(nextOrdered.map((space) => [space.id, space.sort_order]))
    const previous = spaces
    const applyLocal = (rows: Space[]) => {
      cachedSpaces.mutate(() => rows)
      useSpacesStore.setState({ spaces: rows })
    }
    applyLocal(
      spaces.map((space) =>
        sortOrderById.has(space.id)
          ? { ...space, sort_order: sortOrderById.get(space.id)! }
          : space,
      ),
    )
    try {
      const changed = nextOrdered.filter((space) => {
        const before = previous.find((candidate) => candidate.id === space.id)
        return !before || (before.sort_order ?? 0) !== space.sort_order
      })
      await Promise.all(
        changed.map((space) => updateSpace(space.id, { sort_order: space.sort_order })),
      )
    } catch (error) {
      applyLocal(previous)
      toast.error(sanitizeUserError(error, SIDEBAR_TOAST_ERRORS.REORDER_SPACES_FAILED.userMessage))
    }
  }

  return {
    handleMoveSpace,
    handleMoveCampaign,
    handleReorderPrograms,
    handleReorderSpaces,
  }
}
