'use client'

import { createContext, useContext } from 'react'

type VoiceApprovalFn = (delegationId: string, message: string) => void

const VoiceApprovalContext = createContext<VoiceApprovalFn | null>(null)

export const VoiceApprovalProvider = VoiceApprovalContext.Provider

export function useVoiceApproval(): VoiceApprovalFn | null {
  return useContext(VoiceApprovalContext)
}
