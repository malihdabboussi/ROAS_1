'use client'

import { Copy, Loader2 } from 'lucide-react'
import type { FlowAutomationSummary } from '../types/flow-automation.types'
import { userFlowTemplateDisplayName } from '@/lib/flows/flow-user-template.utils'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { FlowBrowseTemplatesMockup, FlowEmptyState } from './FlowEmptyMockups'

export function FlowsMyTemplatesPanel({
  templates,
  spaceId,
  installingId,
  onUseTemplate,
}: {
  templates: FlowAutomationSummary[]
  spaceId: string | null
  installingId: string | null
  onUseTemplate: (flow: FlowAutomationSummary) => void | Promise<void>
}) {
  if (templates.length === 0) {
    return (
      <FlowEmptyState
        mockup={<FlowBrowseTemplatesMockup />}
        title={FLOWS_UI.myTemplatesEmptyTitle}
        description={FLOWS_UI.myTemplatesEmptyDescription}
      />
    )
  }

  return (
    <div className="gap-spacing-3 grid grid-cols-1 md:grid-cols-2">
      {templates.map((flow) => {
        const installing = installingId === flow.id
        return (
          <button
            key={flow.id}
            type="button"
            disabled={!spaceId || !!installingId}
            onClick={() => void onUseTemplate(flow)}
            className="section-card rounded-spacing-3 p-spacing-4 gap-spacing-3 hover:bg-hover-subtle flex h-full flex-col items-stretch text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="gap-spacing-2 flex items-center">
              <span className="flow-builder-step-icon flow-builder-step-icon-purple flex h-spacing-8 w-spacing-8 items-center justify-center rounded-spacing-2">
                <Copy className="icon-sm" />
              </span>
              <span className="body-2 text-foreground min-w-0 flex-1 font-semibold leading-snug">
                {userFlowTemplateDisplayName(flow.name)}
              </span>
              {installing ? (
                <span className="badge-glass badge-glass-sm badge-glass-blue gap-spacing-1 inline-flex shrink-0 items-center">
                  <Loader2 className="icon-xs animate-spin" />
                  Adding
                </span>
              ) : null}
            </span>
            <span className="body-3 text-muted-foreground line-clamp-3 block">
              {flow.description?.trim() ||
                'Use this template to add a copy of the loop to your space.'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
