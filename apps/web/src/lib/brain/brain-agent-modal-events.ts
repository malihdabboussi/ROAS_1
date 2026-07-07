export const BRAIN_ADD_AGENT_MODAL_EVENT = 'brain-sidebar-add-agent'

export const BRAIN_SETUP_AGENT_MODAL_EVENT = 'brain-setup-agent'

export const BRAIN_AGENT_ACTIVATED_EVENT = 'brain-agent-activated'

export type BrainSetupAgentModalDetail = {
  agentKey: string
  agentName: string
}

export type BrainAgentActivatedDetail = {
  agentKey: string
}

export function dispatchBrainAddAgentModal(): void {
  window.dispatchEvent(new CustomEvent(BRAIN_ADD_AGENT_MODAL_EVENT))
}

export function dispatchBrainSetupAgentModal(detail: BrainSetupAgentModalDetail): void {
  window.dispatchEvent(
    new CustomEvent<BrainSetupAgentModalDetail>(BRAIN_SETUP_AGENT_MODAL_EVENT, { detail }),
  )
}

export function dispatchBrainAgentActivated(detail: BrainAgentActivatedDetail): void {
  window.dispatchEvent(
    new CustomEvent<BrainAgentActivatedDetail>(BRAIN_AGENT_ACTIVATED_EVENT, { detail }),
  )
}
