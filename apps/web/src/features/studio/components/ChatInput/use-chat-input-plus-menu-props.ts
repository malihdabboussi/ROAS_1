import { useCallback, type MutableRefObject, type RefObject } from 'react'
import type { ChatInputPlusMenuPortalProps } from './chat-input-plus-menu-portal'
import type { ComposerAccessRow, ComposerPlusSubmenu } from './chat-input-policy'

type PlusSubmenuId = Exclude<ComposerPlusSubmenu, null>

interface UseChatInputPlusMenuPropsOptions
  extends Omit<
    ChatInputPlusMenuPortalProps,
    | 'portalTarget'
    | 'onSubmenuAnchorNode'
    | 'onToggleAgent'
    | 'onConnectIntegration'
    | 'onToggleSkill'
    | 'onToggleAccess'
  > {
  portalTargetRef?: RefObject<HTMLElement | null>
  plusSubmenuAnchorRefs: MutableRefObject<Record<PlusSubmenuId, HTMLButtonElement | null>>
  handleToggleAgent: (provider: string, enabled: boolean) => void | Promise<void>
  handleConnectIntegration: (provider: string) => void | Promise<void>
  handleSkillToggle: (skillKey: string, enabled: boolean) => void | Promise<void>
  handleAccessToggle: (row: ComposerAccessRow, enabled: boolean) => void | Promise<void>
}

export function useChatInputPlusMenuProps({
  portalTargetRef,
  plusSubmenuAnchorRefs,
  handleToggleAgent,
  handleConnectIntegration,
  handleSkillToggle,
  handleAccessToggle,
  ...plusMenuProps
}: UseChatInputPlusMenuPropsOptions) {
  const handleSubmenuAnchorNode = useCallback(
    (id: PlusSubmenuId, node: HTMLButtonElement | null) => {
      plusSubmenuAnchorRefs.current[id] = node
    },
    [plusSubmenuAnchorRefs],
  )

  const handleToggleAgentFireAndForget = useCallback(
    (provider: string, enabled: boolean) => {
      void handleToggleAgent(provider, enabled)
    },
    [handleToggleAgent],
  )

  const handleConnectIntegrationFireAndForget = useCallback(
    (provider: string) => {
      void handleConnectIntegration(provider)
    },
    [handleConnectIntegration],
  )

  const handleSkillToggleFireAndForget = useCallback(
    (skillKey: string, enabled: boolean) => {
      void handleSkillToggle(skillKey, enabled)
    },
    [handleSkillToggle],
  )

  const handleAccessToggleFireAndForget = useCallback(
    (row: ComposerAccessRow, enabled: boolean) => {
      void handleAccessToggle(row, enabled)
    },
    [handleAccessToggle],
  )

  return {
    plusMenuProps: {
      ...plusMenuProps,
      portalTarget: portalTargetRef?.current ?? null,
      onSubmenuAnchorNode: handleSubmenuAnchorNode,
      onToggleAgent: handleToggleAgentFireAndForget,
      onConnectIntegration: handleConnectIntegrationFireAndForget,
      onToggleSkill: handleSkillToggleFireAndForget,
      onToggleAccess: handleAccessToggleFireAndForget,
    },
  }
}
