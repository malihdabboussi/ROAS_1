'use client'

import { useState } from 'react'
import { useWorkspaceSettingsModal } from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { isDefinedNoteTakerId } from '@/lib/integrations/meeting-provider-definitions'
import { ConfirmDialog } from './ConfirmDialog'
import { IntegrationCardActions } from './IntegrationCardActions'
import { IntegrationCardDialogs } from './IntegrationCardDialogs'
import type { Integration, UserIntegration } from './integrations.types'
import { MeetingWebhookAddressNote } from './MeetingWebhookAddressNote'
import { WordpressConnectDialog } from './WordpressConnectDialog'

interface IntegrationCardProps {
  integration: Integration
  isConnected?: boolean
  comingSoon?: boolean
  isComposioMode?: boolean
  connectionStatus?: UserIntegration['status']
  /** `list` = integrations library row layout; default card for other surfaces */
  variant?: 'card' | 'list'
  onConnect: (
    integration: Integration,
    apiKeyOrData?: string | Record<string, string>,
  ) => Promise<void> | void
  onDisconnect?: (integration: Integration) => void
  connecting?: boolean
  disconnecting?: boolean
}

export function IntegrationCard({
  integration,
  isConnected = false,
  comingSoon = false,
  isComposioMode = false,
  connectionStatus,
  variant = 'card',
  onConnect,
  onDisconnect,
  connecting = false,
  disconnecting = false,
}: IntegrationCardProps) {
  const { openWorkspaceSettings } = useWorkspaceSettingsModal()
  const [showConfirm, setShowConfirm] = useState(false)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [showComposioModal, setShowComposioModal] = useState(false)
  const [showWordpressModal, setShowWordpressModal] = useState(false)
  const [showOpenAICodexModal, setShowOpenAICodexModal] = useState(false)
  const [composioConnecting, setComposioConnecting] = useState(false)
  const [openAICodexStarting, setOpenAICodexStarting] = useState(false)
  const [openAICodexCompleting, setOpenAICodexCompleting] = useState(false)
  const [openAICodexCallbackUrl, setOpenAICodexCallbackUrl] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [connectionFields, setConnectionFields] = useState<Record<string, string>>({})
  const [submittingKey, setSubmittingKey] = useState(false)

  const isOpenAICodex = integration.provider.toLowerCase() === 'openai_codex'
  const isApiKey = integration.auth_type === 'api_key'
  const needsReconnect = connectionStatus === 'needs_reconnect'
  const primaryActionLabel = needsReconnect ? 'Reconnect' : 'Connect'
  const listProgressLabel = needsReconnect ? 'Reconnecting…' : 'Connecting…'
  const cardProgressLabel = needsReconnect ? 'Reconnecting...' : 'Connecting...'
  const hasConnectionFields =
    isApiKey && integration.connection_fields && integration.connection_fields.length > 0
  const handleConnect = () => {
    if (isOpenAICodex) {
      setShowOpenAICodexModal(true)
    } else if (integration.provider.toLowerCase() === 'wordpress') {
      setShowWordpressModal(true)
    } else if (isApiKey) {
      setApiKeyInput('')
      setConnectionFields({})
      setShowApiKeyModal(true)
    } else if (isComposioMode) {
      setShowComposioModal(true)
    } else {
      onConnect(integration)
    }
  }

  const handleApiKeySubmit = async () => {
    if (hasConnectionFields) {
      const fields = integration.connection_fields!
      const allFilled = fields
        .filter((f) => f.required !== false)
        .every((f) => connectionFields[f.name]?.trim())
      if (!allFilled) return
      setSubmittingKey(true)
      try {
        onConnect(integration, connectionFields)
        setShowApiKeyModal(false)
        setConnectionFields({})
      } finally {
        setSubmittingKey(false)
      }
    } else {
      if (!apiKeyInput.trim()) return
      setSubmittingKey(true)
      try {
        onConnect(integration, apiKeyInput.trim())
        setShowApiKeyModal(false)
        setApiKeyInput('')
      } finally {
        setSubmittingKey(false)
      }
    }
  }

  const handleDisconnect = () => {
    onDisconnect?.(integration)
    setShowConfirm(false)
  }

  const handleComposioContinue = async () => {
    setComposioConnecting(true)
    try {
      await onConnect(integration)
      setShowComposioModal(false)
    } finally {
      setComposioConnecting(false)
    }
  }

  const handleOpenAICodexStart = async () => {
    setOpenAICodexStarting(true)
    try {
      await onConnect(integration, { flow: 'start' })
    } finally {
      setOpenAICodexStarting(false)
    }
  }

  const handleOpenAICodexComplete = async () => {
    const callbackUrl = openAICodexCallbackUrl.trim()
    if (!callbackUrl) return
    setOpenAICodexCompleting(true)
    try {
      await onConnect(integration, { callbackUrl })
      setOpenAICodexCallbackUrl('')
      setShowOpenAICodexModal(false)
    } finally {
      setOpenAICodexCompleting(false)
    }
  }

  const canRowConnect = variant === 'list' && !isConnected && !comingSoon && integration.is_active
  const handleRowClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canRowConnect || connecting) return
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, input, [role="dialog"]')) return
    handleConnect()
  }

  const getLogoPath = getIntegrationLogoPath

  const getTags = (providerName: string) => {
    switch (providerName.toLowerCase()) {
      case 'airtable':
        return ['Database Management', 'Automation', 'Collaboration']
      case 'github':
        return ['Code', 'Repositories', 'Pull Requests']
      default:
        return ['Productivity', 'Integration', 'Workflow']
    }
  }

  const logoPath = integration.logo_url ?? getLogoPath(integration.provider)
  const definedNoteTaker = isDefinedNoteTakerId(integration.provider)

  const logoBlock = (
    <div className="flex-shrink-0">
      <div
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center ${
          comingSoon ? 'grayscale' : ''
        }`}
      >
        {logoPath ? (
          <img
            src={logoPath}
            alt={`${integration.name} logo`}
            className="block h-7 w-7 object-contain object-center"
          />
        ) : (
          <span className="typo-caption text-muted-foreground font-medium">
            {integration.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )

  const tagsBlock = (
    <div className="gap-spacing-2 flex flex-wrap items-center">
      {getTags(integration.name).map((tag) => (
        <span
          key={tag}
          className="text-muted-foreground rounded-spacing-2 border-border body-4 px-spacing-2 border py-0.5"
        >
          {tag}
        </span>
      ))}
    </div>
  )

  const ghlLearnTour =
    integration.provider.toLowerCase() === 'gohighlevel' ? 'integrations-ghl-learn' : undefined
  const ghlConnectTour =
    integration.provider.toLowerCase() === 'gohighlevel' ? 'integrations-ghl-connect' : undefined

  const actionsBlock = (
    <IntegrationCardActions
      variant={variant}
      isConnected={isConnected}
      comingSoon={comingSoon}
      connecting={connecting}
      disconnecting={disconnecting}
      primaryActionLabel={primaryActionLabel}
      listProgressLabel={listProgressLabel}
      cardProgressLabel={cardProgressLabel}
      isActive={integration.is_active}
      ghlLearnTour={ghlLearnTour}
      ghlConnectTour={ghlConnectTour}
      onLearnMore={() => openWorkspaceSettings('integrations')}
      onConnect={handleConnect}
      onRequestDisconnect={onDisconnect ? () => setShowConfirm(true) : undefined}
    />
  )

  return (
    <div
      data-integration-card
      data-integration-id={integration.id}
      onClick={handleRowClick}
      className={
        variant === 'list'
          ? `border-border rounded-spacing-2 px-spacing-4 py-spacing-3 sm:gap-spacing-4 hover:bg-hover-subtle flex flex-col border transition-colors sm:flex-row sm:items-center sm:justify-between ${
              comingSoon ? 'opacity-50' : ''
            } ${canRowConnect ? 'cursor-pointer' : ''}`
          : `surface-card card-elevated border-border rounded-spacing-3 flex h-full flex-col border ${
              comingSoon ? 'opacity-50' : ''
            }`
      }
    >
      {variant === 'list' ? (
        <>
          <div className="space-y-spacing-2 min-w-0 flex-1">
            <div className="gap-spacing-3 flex items-start">
              {logoBlock}
              <div className="space-y-spacing-2 min-w-0 flex-1">
                <div className="gap-spacing-2 flex flex-wrap items-center">
                  <h3 className="title-h6 font-medium">{integration.name}</h3>
                  <span className="text-muted-foreground border-border body-4 rounded-spacing-2 px-spacing-2 border py-0.5">
                    BETA
                  </span>
                  {comingSoon ? (
                    <span className="badge-glass badge-glass-muted flex-shrink-0">Coming Soon</span>
                  ) : null}
                  {needsReconnect ? (
                    <span className="badge-glass badge-glass-orange flex-shrink-0">
                      Needs reconnect
                    </span>
                  ) : null}
                </div>
                <p className="body-3 text-muted-foreground line-clamp-2 sm:line-clamp-1">
                  {integration.description}
                </p>
                {tagsBlock}
              </div>
            </div>
            <div className="gap-spacing-2 flex sm:hidden">{actionsBlock}</div>
          </div>
          <div className="sm:gap-spacing-2 hidden sm:flex sm:flex-shrink-0 sm:flex-row sm:items-center">
            {actionsBlock}
          </div>
        </>
      ) : (
        <div className="p-spacing-4 space-y-spacing-3 flex flex-1 flex-col">
          <div className="gap-spacing-3 flex items-center justify-between">
            <div className="gap-spacing-3 flex min-w-0 flex-1 items-center">
              {logoBlock}
              <h3 className="title-h6 font-medium">{integration.name}</h3>
              <span className="text-muted-foreground border-border body-4 rounded-spacing-2 px-spacing-2 border py-0.5">
                BETA
              </span>
            </div>
            {comingSoon ? (
              <span className="badge-glass badge-glass-muted flex-shrink-0">Coming Soon</span>
            ) : null}
            {needsReconnect ? (
              <span className="badge-glass badge-glass-orange flex-shrink-0">Needs reconnect</span>
            ) : null}
          </div>
          <div className="flex-1">
            <p className="body-3 text-muted-foreground line-clamp-2">{integration.description}</p>
          </div>
          {tagsBlock}
          {actionsBlock}
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Disconnect Integration"
        description={`Are you sure you want to disconnect ${integration.name}? You can reconnect at any time.`}
        confirmText="Disconnect"
        confirmingText="Disconnecting..."
        confirmDisabled={disconnecting}
        onConfirm={handleDisconnect}
      />

      <WordpressConnectDialog
        integration={integration}
        open={showWordpressModal}
        onOpenChange={setShowWordpressModal}
        onConnect={onConnect}
      />

      <IntegrationCardDialogs
        integration={integration}
        logoPath={logoPath}
        hasConnectionFields={!!hasConnectionFields}
        showApiKeyModal={showApiKeyModal}
        setShowApiKeyModal={setShowApiKeyModal}
        apiKeyInput={apiKeyInput}
        setApiKeyInput={setApiKeyInput}
        connectionFields={connectionFields}
        setConnectionFields={setConnectionFields}
        submittingKey={submittingKey}
        onApiKeySubmit={handleApiKeySubmit}
        showOpenAICodexModal={showOpenAICodexModal}
        setShowOpenAICodexModal={setShowOpenAICodexModal}
        openAICodexCallbackUrl={openAICodexCallbackUrl}
        setOpenAICodexCallbackUrl={setOpenAICodexCallbackUrl}
        openAICodexStarting={openAICodexStarting}
        setOpenAICodexStarting={setOpenAICodexStarting}
        openAICodexCompleting={openAICodexCompleting}
        setOpenAICodexCompleting={setOpenAICodexCompleting}
        onOpenAICodexStart={handleOpenAICodexStart}
        onOpenAICodexComplete={handleOpenAICodexComplete}
        showComposioModal={showComposioModal}
        setShowComposioModal={setShowComposioModal}
        composioConnecting={composioConnecting}
        setComposioConnecting={setComposioConnecting}
        onComposioContinue={handleComposioContinue}
        apiKeyPreface={
          definedNoteTaker && showApiKeyModal ? (
            <MeetingWebhookAddressNote provider={integration.provider} name={integration.name} />
          ) : undefined
        }
      />
    </div>
  )
}
