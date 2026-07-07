'use client'

import { useState, type MouseEvent } from 'react'
import { CircleAlert } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  FLOW_VALIDATION_UI,
  buildFlowValidationLoopPrompt,
} from '../config/errors.config'
import { flowNeedsAttention } from '../lib/flow-needs-attention'
import { validateFlowDraft } from '../services/flows.service'
import type { FlowAutomation, FlowAutomationSummary } from '../types/flow-automation.types'
import type { FlowValidationResult } from '../services/flows.service'
import { FlowValidationAttentionModal } from './FlowValidationAttentionModal'

export function FlowCardAttentionAlert({
  flow,
  fallbackSpaceId,
  onAskLoopToFix,
  onFlowValidated,
  inline = false,
}: {
  flow: FlowAutomationSummary
  fallbackSpaceId?: string | null
  onAskLoopToFix?: (prompt: string) => void
  onFlowValidated?: (flowId: string, result: FlowValidationResult) => void
  inline?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validation, setValidation] = useState<FlowValidationResult | null>(null)

  if (!flowNeedsAttention(flow)) return null

  const spaceId = flow.space_id ?? fallbackSpaceId ?? null

  const handleOpen = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    event.preventDefault()
    setOpen(true)
    if (!spaceId) {
      setValidation({ valid: false, errors: [FLOW_VALIDATION_UI.GENERIC] })
      return
    }
    setLoading(true)
    try {
      const result = await validateFlowDraft(spaceId, flow as FlowAutomation)
      setValidation(result)
      onFlowValidated?.(flow.id, result)
    } finally {
      setLoading(false)
    }
  }

  const handleAskLoopToFix = () => {
    if (!validation || validation.valid || validation.errors.length === 0) return
    const prompt = buildFlowValidationLoopPrompt({
      flowName: flow.name,
      flowId: flow.id,
      errors: validation.errors,
    })
    onAskLoopToFix?.(prompt)
  }

  return (
    <>
      <Tooltip label={FLOW_VALIDATION_UI.CARD_ATTENTION_ARIA} side="top" triggerClassName="inline-flex">
        <span
          className={
            inline
              ? 'inline-flex'
              : 'absolute bottom-spacing-3 left-spacing-3 z-[1] inline-flex'
          }
        >
          <button
            type="button"
            onClick={(event) => void handleOpen(event)}
            className="btn-icon-bare text-destructive hover:text-destructive"
            aria-label={FLOW_VALIDATION_UI.CARD_ATTENTION_ARIA}
          >
            <CircleAlert className="icon-sm" />
          </button>
        </span>
      </Tooltip>
      <FlowValidationAttentionModal
        open={open}
        flowName={flow.name}
        loading={loading}
        validation={validation}
        onClose={() => setOpen(false)}
        onAskLoopToFix={onAskLoopToFix ? handleAskLoopToFix : undefined}
      />
    </>
  )
}
