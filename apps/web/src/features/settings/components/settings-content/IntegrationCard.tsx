'use client'

import Image from 'next/image'
import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ExternalLink, Info, Loader2, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { useWorkspaceSettingsModal } from '@/features/settings/contexts/WorkspaceSettingsModalContext'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import { ConfirmDialog } from './ConfirmDialog'
import type { Integration, UserIntegration } from './integrations.types'
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

  const logoPath = getLogoPath(integration.provider)

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

  const learnMoreControl =
    variant === 'list' ? (
      <Tooltip label="Learn more">
        <button
          type="button"
          onClick={() => openWorkspaceSettings('integrations')}
          className="btn-icon-bare shrink-0"
          aria-label="Learn more"
          data-tour={ghlLearnTour}
        >
          <Info className="icon-xs shrink-0" strokeWidth={2} />
        </button>
      </Tooltip>
    ) : (
      <button
        type="button"
        onClick={() => openWorkspaceSettings('integrations')}
        className="body-3 link-learn-more transition-colors"
        data-tour={ghlLearnTour}
      >
        Learn more
      </button>
    )

  const listConnectButtonClass =
    'body-3 text-foreground border-border rounded-spacing-2 px-spacing-3 py-spacing-1 shrink-0 border font-medium transition-colors hover:bg-hover-subtle disabled:opacity-50'

  const connectDisconnectControl = isConnected ? (
    onDisconnect ? (
      variant === 'list' ? (
        <Tooltip label={disconnecting ? 'Disconnecting…' : 'Disconnect'}>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={disconnecting}
            className="text-destructive flex h-8 w-8 shrink-0 items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
            aria-label={disconnecting ? 'Disconnecting' : 'Disconnect'}
          >
            {disconnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </button>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={disconnecting}
          className="button-glass-destructive rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
        >
          {disconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      )
    ) : (
      <span className="badge-glass badge-glass-green flex-shrink-0">Connected</span>
    )
  ) : comingSoon ? (
    variant === 'list' ? (
      <button type="button" disabled className={`${listConnectButtonClass} opacity-50`}>
        {primaryActionLabel}
      </button>
    ) : (
      <button
        type="button"
        disabled
        className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium opacity-50"
      >
        {primaryActionLabel}
      </button>
    )
  ) : variant === 'list' ? (
    <button
      type="button"
      onClick={handleConnect}
      disabled={!integration.is_active || connecting}
      className={listConnectButtonClass}
      data-tour={ghlConnectTour}
    >
      {connecting ? listProgressLabel : primaryActionLabel}
    </button>
  ) : (
    <button
      type="button"
      onClick={handleConnect}
      disabled={!integration.is_active || connecting}
      className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
      data-tour={ghlConnectTour}
    >
      {connecting ? cardProgressLabel : primaryActionLabel}
    </button>
  )

  const actionsBlock = (
    <div
      className={
        variant === 'list'
          ? 'gap-spacing-2 flex flex-shrink-0 flex-wrap items-center'
          : 'pt-spacing-2 mt-auto flex items-center justify-between'
      }
    >
      {learnMoreControl}
      {connectDisconnectControl}
    </div>
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

      <DialogPrimitive.Root open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
            <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 w-full max-w-md">
              <div className="space-y-spacing-2">
                <DialogPrimitive.Title className="title-h6">
                  Connect {integration.name}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="body-2 text-muted-foreground">
                  {hasConnectionFields
                    ? `Enter your ${integration.name} credentials to connect.`
                    : `Paste your ${integration.name} API key to connect. You can find it in your ${integration.name} dashboard settings.`}
                </DialogPrimitive.Description>
              </div>

              <div className="mt-spacing-4 space-y-spacing-3">
                {hasConnectionFields ? (
                  integration.connection_fields!.map((field) => (
                    <div key={field.name}>
                      <label className="body-3 text-muted-foreground mb-spacing-1 block">
                        {field.label}
                      </label>
                      <input
                        type={
                          field.name.includes('key') ||
                          field.name.includes('token') ||
                          field.name.includes('secret')
                            ? 'password'
                            : 'text'
                        }
                        value={connectionFields[field.name] || ''}
                        onChange={(e) =>
                          setConnectionFields((prev) => ({ ...prev, [field.name]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApiKeySubmit()
                        }}
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        className="input-glass body-3 w-full"
                      />
                      {field.helpTitle || field.helpText || field.helpCommand || field.helpSteps ? (
                        <div className="mt-spacing-2 rounded-spacing-2 border-border bg-secondary p-spacing-3 space-y-spacing-2 border">
                          {field.helpTitle ? (
                            <p className="body-3 text-foreground font-medium">
                              {field.helpTitle}
                            </p>
                          ) : null}
                          {field.helpText ? (
                            <p className="body-4 text-muted-foreground">{field.helpText}</p>
                          ) : null}
                          {field.helpCommand ? (
                            <code className="body-4 text-foreground rounded-spacing-1 border-border bg-background px-spacing-2 py-spacing-1 inline-flex border font-mono">
                              {field.helpCommand}
                            </code>
                          ) : null}
                          {field.helpSteps?.length ? (
                            <ol className="space-y-spacing-1 body-4 text-muted-foreground list-decimal pl-spacing-4">
                              {field.helpSteps.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ol>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleApiKeySubmit()
                    }}
                    placeholder="Paste API key here..."
                    className="input-glass body-3 w-full"
                    autoFocus
                  />
                )}
              </div>

              <div className="mt-spacing-6 gap-spacing-2 flex items-center justify-end">
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
                  >
                    Cancel
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  onClick={handleApiKeySubmit}
                  disabled={
                    hasConnectionFields
                      ? !integration
                          .connection_fields!.filter((f) => f.required !== false)
                          .every((f) => connectionFields[f.name]?.trim())
                      : !apiKeyInput.trim() || submittingKey
                  }
                  className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
                >
                  {submittingKey ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <WordpressConnectDialog
        integration={integration}
        open={showWordpressModal}
        onOpenChange={setShowWordpressModal}
        onConnect={onConnect}
      />

      <DialogPrimitive.Root
        open={showOpenAICodexModal}
        onOpenChange={(open) => {
          setShowOpenAICodexModal(open)
          if (!open) {
            setOpenAICodexCallbackUrl('')
            setOpenAICodexStarting(false)
            setOpenAICodexCompleting(false)
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop bg-modal-overlay fixed inset-0" />
          <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
            <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 border-border bg-card w-full max-w-lg border">
              <div className="space-y-spacing-2">
                <DialogPrimitive.Title className="title-h6 text-foreground">
                  Connect OpenAI Codex
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="body-2 text-muted-foreground">
                  OpenAI returns this authorization code to localhost. Paste that callback URL here
                  to store the token encrypted for your admin account.
                </DialogPrimitive.Description>
              </div>

              <div className="mt-spacing-5 space-y-spacing-4">
                <button
                  type="button"
                  onClick={handleOpenAICodexStart}
                  disabled={openAICodexStarting}
                  className="button-default button-glass-neutral gap-spacing-2 inline-flex items-center"
                >
                  {openAICodexStarting ? (
                    <Loader2 className="icon-sm animate-spin" />
                  ) : (
                    <ExternalLink className="icon-sm" />
                  )}
                  Open OpenAI
                </button>

                <div className="space-y-spacing-2">
                  <label className="body-3 text-muted-foreground block">Callback URL</label>
                  <input
                    type="text"
                    value={openAICodexCallbackUrl}
                    onChange={(e) => setOpenAICodexCallbackUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleOpenAICodexComplete()
                    }}
                    placeholder="http://localhost:1455/auth/callback?code=..."
                    className="input-glass h-spacing-9 px-spacing-3 body-3 w-full"
                  />
                </div>
              </div>

              <div className="mt-spacing-6 gap-spacing-2 flex items-center justify-end">
                <DialogPrimitive.Close asChild>
                  <button type="button" className="button-default button-glass-neutral">
                    Cancel
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  onClick={handleOpenAICodexComplete}
                  disabled={!openAICodexCallbackUrl.trim() || openAICodexCompleting}
                  className="button-default button-glass-primary gap-spacing-2 inline-flex items-center disabled:opacity-50"
                >
                  {openAICodexCompleting ? <Loader2 className="icon-sm animate-spin" /> : null}
                  Complete connection
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={showComposioModal}
        onOpenChange={(open) => {
          setShowComposioModal(open)
          if (!open) setComposioConnecting(false)
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0 bg-modal-overlay" />
          <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
            <div className="surface-card wizard-container-border rounded-spacing-4 w-full max-w-[380px] overflow-hidden">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="right-spacing-3 top-spacing-3 text-muted-foreground hover:text-foreground absolute flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M1 1l12 12M13 1 1 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </DialogPrimitive.Close>

              <style
                dangerouslySetInnerHTML={{
                  __html: `
                @keyframes composio-flow { from { stroke-dashoffset: 16; } to { stroke-dashoffset: 0; } }
                .composio-line { animation: composio-flow 0.8s linear infinite; }
              `,
                }}
              />

              {/* Header: logos + title */}
              <div className="px-spacing-6 pt-spacing-10 pb-spacing-6 flex flex-col items-center">
                <div className="flex items-center gap-0">
                  <Image
                    src="/Logos/roas/icon-black.png"
                    alt="ROAS"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain dark:hidden"
                  />
                  <Image
                    src="/Logos/roas/icon-white.png"
                    alt="ROAS"
                    width={40}
                    height={40}
                    className="hidden h-10 w-10 object-contain dark:block"
                  />

                  <svg
                    width="40"
                    height="12"
                    viewBox="0 0 40 12"
                    className="mx-[2px] flex-shrink-0"
                  >
                    <line
                      x1="2"
                      y1="6"
                      x2="38"
                      y2="6"
                      stroke="rgb(var(--vibe-green))"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      className="composio-line"
                      opacity="0.5"
                    />
                  </svg>

                  <Image
                    src="/Integrations/Composio.png"
                    alt="Composio"
                    width={40}
                    height={40}
                    className="rounded-spacing-2 h-10 w-10 object-contain"
                  />

                  <svg
                    width="40"
                    height="12"
                    viewBox="0 0 40 12"
                    className="mx-[2px] flex-shrink-0"
                  >
                    <line
                      x1="2"
                      y1="6"
                      x2="38"
                      y2="6"
                      stroke="rgb(var(--vibe-green))"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      className="composio-line"
                      opacity="0.5"
                    />
                  </svg>

                  {logoPath ? (
                    <img
                      src={logoPath}
                      alt={integration.name}
                      className="block h-10 w-10 object-contain object-center"
                    />
                  ) : (
                    <span className="text-muted-foreground flex h-10 w-10 items-center justify-center text-sm font-semibold">
                      {integration.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <DialogPrimitive.Title className="title-h3 mt-spacing-6 text-center leading-snug">
                  ROAS uses Composio
                  <br />
                  to connect your account
                </DialogPrimitive.Title>

                <DialogPrimitive.Description className="sr-only">
                  Secure connection flow for {integration.name}
                </DialogPrimitive.Description>
              </div>

              {/* Divider */}
              <div className="mx-spacing-6 bg-border h-px" />

              {/* Feature rows */}
              <div className="px-spacing-10 py-spacing-8 space-y-spacing-5">
                <div>
                  <p className="body-2 text-foreground gap-spacing-2 flex items-center font-medium">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-primary flex-shrink-0"
                    >
                      <path
                        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Connect instantly
                  </p>
                  <p
                    className="body-3 text-muted-foreground mt-spacing-1"
                    style={{ paddingLeft: 'calc(14px + var(--spacing-2))' }}
                  >
                    Composio lets you securely connect your account in seconds.
                  </p>
                </div>

                <div>
                  <p className="body-2 text-foreground gap-spacing-2 flex items-center font-medium">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-primary flex-shrink-0"
                    >
                      <rect
                        x="3"
                        y="11"
                        width="18"
                        height="11"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M7 11V7a5 5 0 0110 0v4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Connect securely
                  </p>
                  <p
                    className="body-3 text-muted-foreground mt-spacing-1"
                    style={{ paddingLeft: 'calc(14px + var(--spacing-2))' }}
                  >
                    Tokens are encrypted and managed by Composio. ROAS never stores your
                    credentials.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-spacing-6 bg-border h-px" />

              {/* TOS + Continue */}
              <div className="px-spacing-10 py-spacing-8">
                <p className="body-3 text-muted-foreground/70 mb-spacing-4 text-center">
                  By continuing, you agree to Composio&apos;s{' '}
                  <a
                    href="https://composio.dev/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://composio.dev/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>

                <button
                  type="button"
                  onClick={handleComposioContinue}
                  disabled={composioConnecting}
                  className="button-glass-accent rounded-spacing-2 body-2 flex h-11 w-full items-center justify-center font-medium disabled:opacity-70"
                >
                  {composioConnecting ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="animate-spin"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        opacity="0.25"
                      />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
