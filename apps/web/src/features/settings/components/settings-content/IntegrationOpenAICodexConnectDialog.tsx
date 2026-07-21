'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ExternalLink, Loader2 } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  callbackUrl: string
  setCallbackUrl: (value: string) => void
  starting: boolean
  setStarting: (value: boolean) => void
  completing: boolean
  setCompleting: (value: boolean) => void
  onStart: () => void | Promise<void>
  onComplete: () => void | Promise<void>
}

export function IntegrationOpenAICodexConnectDialog({
  open,
  onOpenChange,
  callbackUrl,
  setCallbackUrl,
  starting,
  setStarting,
  completing,
  setCompleting,
  onStart,
  onComplete,
}: Props) {
  const showOpenAICodexModal = open
  const setShowOpenAICodexModal = onOpenChange
  const openAICodexCallbackUrl = callbackUrl
  const setOpenAICodexCallbackUrl = setCallbackUrl
  const openAICodexStarting = starting
  const setOpenAICodexStarting = setStarting
  const openAICodexCompleting = completing
  const setOpenAICodexCompleting = setCompleting
  const handleOpenAICodexStart = onStart
  const handleOpenAICodexComplete = onComplete
  return (
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
                OpenAI returns this authorization code to localhost. Paste that callback URL here to
                store the token encrypted for your admin account.
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
  )
}
