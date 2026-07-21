'use client'

import { IntegrationApiKeyConnectDialog } from './IntegrationApiKeyConnectDialog'
import { IntegrationComposioConnectDialog } from './IntegrationComposioConnectDialog'
import { IntegrationOpenAICodexConnectDialog } from './IntegrationOpenAICodexConnectDialog'
import type { Integration } from './integrations.types'

type IntegrationCardDialogsProps = {
  integration: Integration
  logoPath: string | null
  hasConnectionFields: boolean
  showApiKeyModal: boolean
  setShowApiKeyModal: (open: boolean) => void
  apiKeyInput: string
  setApiKeyInput: (value: string) => void
  connectionFields: Record<string, string>
  setConnectionFields: React.Dispatch<React.SetStateAction<Record<string, string>>>
  submittingKey: boolean
  onApiKeySubmit: () => void | Promise<void>
  showOpenAICodexModal: boolean
  setShowOpenAICodexModal: (open: boolean) => void
  openAICodexCallbackUrl: string
  setOpenAICodexCallbackUrl: (value: string) => void
  openAICodexStarting: boolean
  setOpenAICodexStarting: (value: boolean) => void
  openAICodexCompleting: boolean
  setOpenAICodexCompleting: (value: boolean) => void
  onOpenAICodexStart: () => void | Promise<void>
  onOpenAICodexComplete: () => void | Promise<void>
  showComposioModal: boolean
  setShowComposioModal: (open: boolean) => void
  composioConnecting: boolean
  setComposioConnecting: (value: boolean) => void
  onComposioContinue: () => void | Promise<void>
}

export function IntegrationCardDialogs(props: IntegrationCardDialogsProps) {
  return (
    <>
      <IntegrationApiKeyConnectDialog
        integration={props.integration}
        hasConnectionFields={props.hasConnectionFields}
        open={props.showApiKeyModal}
        onOpenChange={props.setShowApiKeyModal}
        apiKeyInput={props.apiKeyInput}
        setApiKeyInput={props.setApiKeyInput}
        connectionFields={props.connectionFields}
        setConnectionFields={props.setConnectionFields}
        submittingKey={props.submittingKey}
        onSubmit={props.onApiKeySubmit}
      />
      <IntegrationOpenAICodexConnectDialog
        open={props.showOpenAICodexModal}
        onOpenChange={props.setShowOpenAICodexModal}
        callbackUrl={props.openAICodexCallbackUrl}
        setCallbackUrl={props.setOpenAICodexCallbackUrl}
        starting={props.openAICodexStarting}
        setStarting={props.setOpenAICodexStarting}
        completing={props.openAICodexCompleting}
        setCompleting={props.setOpenAICodexCompleting}
        onStart={props.onOpenAICodexStart}
        onComplete={props.onOpenAICodexComplete}
      />
      <IntegrationComposioConnectDialog
        integration={props.integration}
        logoPath={props.logoPath}
        open={props.showComposioModal}
        onOpenChange={props.setShowComposioModal}
        connecting={props.composioConnecting}
        setConnecting={props.setComposioConnecting}
        onContinue={props.onComposioContinue}
      />
    </>
  )
}
