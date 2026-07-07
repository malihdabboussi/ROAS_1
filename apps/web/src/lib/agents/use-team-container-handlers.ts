'use client'

import type {
  TeamContainerHandlers,
  TeamContainerHandlersData,
} from './team-container-handlers.types'
import { useTeamContainerCampaignHandlers } from './use-team-container-campaign-handlers'
import { useTeamContainerCommunicationHandlers } from './use-team-container-communication-handlers'
import { useTeamContainerNavigationHandlers } from './use-team-container-navigation-handlers'
import { useTeamContainerProfileHandlers } from './use-team-container-profile-handlers'

export function useTeamContainerHandlers(
  data: TeamContainerHandlersData,
): TeamContainerHandlers {
  const communication = useTeamContainerCommunicationHandlers(data)
  const profile = useTeamContainerProfileHandlers(data)
  const campaign = useTeamContainerCampaignHandlers(data)
  const navigation = useTeamContainerNavigationHandlers(data)

  return {
    ...communication,
    ...profile,
    ...campaign,
    ...navigation,
  }
}
