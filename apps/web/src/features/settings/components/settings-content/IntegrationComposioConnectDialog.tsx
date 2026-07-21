'use client'

import Image from 'next/image'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { Integration } from './integrations.types'

type Props = {
  integration: Integration
  logoPath: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  connecting: boolean
  setConnecting: (value: boolean) => void
  onContinue: () => void | Promise<void>
}

export function IntegrationComposioConnectDialog({
  integration,
  logoPath,
  open,
  onOpenChange,
  connecting,
  setConnecting,
  onContinue,
}: Props) {
  const showComposioModal = open
  const setShowComposioModal = onOpenChange
  const composioConnecting = connecting
  const setComposioConnecting = setConnecting
  const handleComposioContinue = onContinue
  return (
    <DialogPrimitive.Root
      open={showComposioModal}
      onOpenChange={(open) => {
        setShowComposioModal(open)
        if (!open) setComposioConnecting(false)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above bg-modal-overlay fixed inset-0" />
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

                <svg width="40" height="12" viewBox="0 0 40 12" className="mx-[2px] flex-shrink-0">
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

                <svg width="40" height="12" viewBox="0 0 40 12" className="mx-[2px] flex-shrink-0">
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
                  Tokens are encrypted and managed by Composio. ROAS never stores your credentials.
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
  )
}
