'use client'

import { CircleAlert, X } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  FLOW_VALIDATION_UI,
  formatFlowValidationError,
} from '../config/errors.config'
import type { FlowValidationResult } from '../services/flows.service'

export function FlowValidationAttentionModal({
  open,
  flowName,
  loading,
  validation,
  onClose,
  onAskLoopToFix,
}: {
  open: boolean
  flowName: string
  loading: boolean
  validation: FlowValidationResult | null
  onClose: () => void
  onAskLoopToFix?: () => void
}) {
  if (!open) return null

  const friendlyErrors = (validation?.errors ?? []).map((error) => formatFlowValidationError(error))
  const showLoopFix =
    Boolean(onAskLoopToFix) && validation && !validation.valid && validation.errors.length > 0

  return (
    <>
      <div className="z-modal-backdrop fixed inset-0 bg-modal-overlay" onClick={onClose} />
      <div className="z-modal-content fixed inset-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 md:p-6">
        <div
          className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-icon-bare btn-close-absolute"
            aria-label="Close"
          >
            <X className="icon-sm" />
          </button>
          <div className="px-spacing-6 pt-spacing-6 pb-spacing-4">
            <div className="gap-spacing-3 flex items-start">
              <div className="bg-destructive/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <CircleAlert className="icon-sm text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="title-h6 text-foreground">{FLOW_VALIDATION_UI.BANNER_INVALID}</h2>
                <p className="body-3 text-muted-foreground mt-spacing-1 truncate">{flowName}</p>
              </div>
            </div>
            <div className="mt-spacing-4 min-h-spacing-16">
              {loading ? (
                <div className="py-spacing-4 flex items-center justify-center">
                  <VibeyLoadingOrb text="Checking flow…" state="processing" size="sm" />
                </div>
              ) : validation?.valid ? (
                <p className="body-3 text-foreground">{FLOW_VALIDATION_UI.BANNER_VALID}</p>
              ) : friendlyErrors.length > 0 ? (
                <ul className="body-3 text-muted-foreground gap-spacing-2 flex flex-col">
                  {friendlyErrors.map((error) => (
                    <li key={error.technicalMessage} className="gap-spacing-2 flex items-start">
                      <CircleAlert className="icon-xs text-destructive mt-0.5 shrink-0" />
                      <span>{error.userMessage}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="body-3 text-muted-foreground">{FLOW_VALIDATION_UI.GENERIC}</p>
              )}
            </div>
          </div>
          <div className="gap-spacing-3 px-spacing-6 py-spacing-4 border-border flex border-t">
            <button
              type="button"
              onClick={onClose}
              className="button-default button-glass-neutral flex-1"
            >
              {FLOW_VALIDATION_UI.MODAL_GO_BACK}
            </button>
            {showLoopFix ? (
              <button
                type="button"
                onClick={() => {
                  onAskLoopToFix?.()
                  onClose()
                }}
                className="button-default button-glass-primary flex-1"
              >
                {FLOW_VALIDATION_UI.ASK_LOOP}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
