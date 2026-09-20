'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { Integration } from './integrations.types'

type Props = {
  integration: Integration
  hasConnectionFields: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKeyInput: string
  setApiKeyInput: (value: string) => void
  connectionFields: Record<string, string>
  setConnectionFields: React.Dispatch<React.SetStateAction<Record<string, string>>>
  submittingKey: boolean
  onSubmit: () => void | Promise<void>
  /** Content shown above the fields, for example the webhook address to paste into the tool. */
  preface?: React.ReactNode
}

export function IntegrationApiKeyConnectDialog({
  integration,
  hasConnectionFields,
  open,
  onOpenChange,
  apiKeyInput,
  setApiKeyInput,
  connectionFields,
  setConnectionFields,
  submittingKey,
  onSubmit,
  preface,
}: Props) {
  const showApiKeyModal = open
  const setShowApiKeyModal = onOpenChange
  const handleApiKeySubmit = onSubmit
  return (
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
              {preface ?? null}
              {hasConnectionFields ? (
                integration.connection_fields!.map((field) => (
                  <div key={field.name}>
                    <label className="body-3 text-muted-foreground mb-spacing-1 block">
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        value={connectionFields[field.name] || ''}
                        onChange={(e) =>
                          setConnectionFields((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        rows={8}
                        className="input-glass body-3 w-full font-mono"
                      />
                    ) : (
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
                          setConnectionFields((prev) => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApiKeySubmit()
                        }}
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        className="input-glass body-3 w-full"
                      />
                    )}
                    {field.helpTitle || field.helpText || field.helpCommand || field.helpSteps ? (
                      <div className="mt-spacing-2 rounded-spacing-2 border-border bg-secondary p-spacing-3 space-y-spacing-2 border">
                        {field.helpTitle ? (
                          <p className="body-3 text-foreground font-medium">{field.helpTitle}</p>
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
                          <ol className="space-y-spacing-1 body-4 text-muted-foreground pl-spacing-4 list-decimal">
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
  )
}
