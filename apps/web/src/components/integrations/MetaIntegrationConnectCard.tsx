'use client'

import Image from 'next/image'
import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Info, Loader2, X } from 'lucide-react'
import { getIntegrationLogoPath } from '@/lib/integrations/integration-logo'
import type { Integration } from '@/lib/integrations/integrations.types'

interface MetaIntegrationConnectCardProps {
  integration: Integration
  isComposioMode: boolean
  connecting: boolean
  onConnect: (integration: Integration) => Promise<void> | void
}

export function MetaIntegrationConnectCard({
  integration,
  isComposioMode,
  connecting,
  onConnect,
}: MetaIntegrationConnectCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [composioConnecting, setComposioConnecting] = useState(false)
  const logoPath = getIntegrationLogoPath(integration.provider)

  const handleConnect = () => {
    if (isComposioMode) {
      setConfirmOpen(true)
      return
    }
    void onConnect(integration)
  }

  const handleComposioContinue = async () => {
    setComposioConnecting(true)
    try {
      await onConnect(integration)
      setConfirmOpen(false)
    } finally {
      setComposioConnecting(false)
    }
  }

  return (
    <div data-integration-card data-integration-id={integration.id} className="surface-card card-elevated border-border rounded-spacing-3 flex h-full flex-col border">
      <div className="p-spacing-4 space-y-spacing-3 flex flex-1 flex-col">
        <div className="gap-spacing-3 flex items-center justify-between">
          <div className="gap-spacing-3 flex min-w-0 flex-1 items-center">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
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
            <h3 className="title-h6 font-medium">{integration.name}</h3>
            <span className="text-muted-foreground border-border body-4 rounded-spacing-2 px-spacing-2 border py-0.5">
              BETA
            </span>
          </div>
        </div>
        <div className="flex-1">
          <p className="body-3 text-muted-foreground line-clamp-2">{integration.description}</p>
        </div>
        <div className="gap-spacing-2 flex flex-wrap items-center">
          {['Productivity', 'Integration', 'Workflow'].map((tag) => (
            <span
              key={tag}
              className="text-muted-foreground rounded-spacing-2 border-border body-4 px-spacing-2 border py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="pt-spacing-2 mt-auto flex items-center justify-between">
          <span className="body-3 text-muted-foreground gap-spacing-1 inline-flex items-center">
            <Info className="icon-xs" />
            Settings
          </span>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>

      <DialogPrimitive.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0 bg-modal-overlay" />
          <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
            <div className="surface-card wizard-container-border rounded-spacing-4 w-full max-w-md overflow-hidden">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="right-spacing-3 top-spacing-3 text-muted-foreground hover:text-foreground absolute flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="icon-xs" />
                </button>
              </DialogPrimitive.Close>

              <div className="px-spacing-6 pt-spacing-10 pb-spacing-6 flex flex-col items-center">
                <div className="gap-spacing-4 flex items-center">
                  <Image
                    src="/Logos/v2transperent.png"
                    alt="Vibey"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                  <Image
                    src="/Integrations/Composio.png"
                    alt="Composio"
                    width={40}
                    height={40}
                    className="rounded-spacing-2 h-10 w-10 object-contain"
                  />
                  {logoPath ? (
                    <img
                      src={logoPath}
                      alt={integration.name}
                      className="block h-10 w-10 object-contain object-center"
                    />
                  ) : null}
                </div>

                <DialogPrimitive.Title className="title-h3 mt-spacing-6 text-center leading-snug">
                  Vibey uses Composio
                  <br />
                  to connect your account
                </DialogPrimitive.Title>

                <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-3 text-center">
                  Composio securely handles the account connection for {integration.name}.
                </DialogPrimitive.Description>
              </div>

              <div className="mx-spacing-6 bg-border h-px" />

              <div className="px-spacing-10 py-spacing-8">
                <button
                  type="button"
                  onClick={handleComposioContinue}
                  disabled={composioConnecting}
                  className="button-glass-accent rounded-spacing-2 body-2 flex h-11 w-full items-center justify-center font-medium disabled:opacity-70"
                >
                  {composioConnecting ? <Loader2 className="icon-sm animate-spin" /> : 'Continue'}
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
