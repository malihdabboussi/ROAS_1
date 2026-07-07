'use client'

import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ExternalLink, Globe2, Loader2, Server } from 'lucide-react'
import type { Integration } from './integrations.types'

interface WordpressConnectDialogProps {
  integration: Integration | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: (
    integration: Integration,
    data?: Record<string, string>,
  ) => Promise<void> | void
}

export function WordpressConnectDialog({
  integration,
  open,
  onOpenChange,
  onConnect,
}: WordpressConnectDialogProps) {
  const [siteUrl, setSiteUrl] = useState('')
  const [submitting, setSubmitting] = useState<'wordpress_com' | 'self_hosted' | null>(null)

  if (!integration) return null

  const connectWordpressCom = async () => {
    setSubmitting('wordpress_com')
    try {
      await onConnect(integration, { connection_method: 'wordpress_com' })
      onOpenChange(false)
    } finally {
      setSubmitting(null)
    }
  }

  const connectSelfHosted = async () => {
    if (!siteUrl.trim()) return
    setSubmitting('self_hosted')
    try {
      await onConnect(integration, {
        connection_method: 'self_hosted',
        siteUrl: siteUrl.trim(),
      })
      onOpenChange(false)
      setSiteUrl('')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 p-spacing-6 w-full max-w-lg">
            <div className="space-y-spacing-2">
              <DialogPrimitive.Title className="title-h6">Connect WordPress</DialogPrimitive.Title>
              <DialogPrimitive.Description className="body-2 text-muted-foreground">
                Choose the connection method for this WordPress site.
              </DialogPrimitive.Description>
            </div>

            <div className="mt-spacing-5 space-y-spacing-3">
              <button
                type="button"
                onClick={connectWordpressCom}
                disabled={submitting !== null}
                className="border-border rounded-spacing-3 hover:bg-hover-subtle p-spacing-4 gap-spacing-3 flex w-full items-start border text-left transition-colors disabled:opacity-50"
              >
                <Globe2 className="icon-sm text-primary mt-0.5 shrink-0" />
                <span className="space-y-spacing-1 min-w-0 flex-1">
                  <span className="body-2 text-foreground block font-medium">WordPress.com</span>
                  <span className="body-3 text-muted-foreground block">
                    WordPress.com and Jetpack-connected sites.
                  </span>
                </span>
                {submitting === 'wordpress_com' ? (
                  <Loader2 className="icon-sm animate-spin" />
                ) : (
                  <ExternalLink className="icon-sm text-muted-foreground" />
                )}
              </button>

              <div className="border-border rounded-spacing-3 p-spacing-4 space-y-spacing-3 border">
                <div className="gap-spacing-3 flex items-start">
                  <Server className="icon-sm text-primary mt-0.5 shrink-0" />
                  <div className="space-y-spacing-1 min-w-0 flex-1">
                    <p className="body-2 text-foreground font-medium">Self-hosted WordPress</p>
                    <p className="body-3 text-muted-foreground">
                      GoDaddy, Bluehost, WP Engine, Kinsta, and other WordPress installs.
                    </p>
                  </div>
                </div>
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(event) => setSiteUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') connectSelfHosted()
                  }}
                  placeholder="https://your-site.com"
                  className="input-glass body-3 w-full"
                />
                <button
                  type="button"
                  onClick={connectSelfHosted}
                  disabled={!siteUrl.trim() || submitting !== null}
                  className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
                >
                  {submitting === 'self_hosted' ? 'Connecting...' : 'Continue'}
                </button>
              </div>
            </div>

            <div className="mt-spacing-6 flex justify-end">
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
                >
                  Cancel
                </button>
              </DialogPrimitive.Close>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
