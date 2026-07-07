'use client'

import { AlertTriangle, Check, ChevronRight } from 'lucide-react'
import type { FlowBuilderStepPhase } from '@/lib/flows/flow-builder-step-phase.utils'
import { cn } from '@/lib/utils/cn'

const PHASES: Array<{ id: FlowBuilderStepPhase; label: string }> = [
  { id: 'setup', label: 'Setup' },
  { id: 'configure', label: 'Configure' },
  { id: 'test', label: 'Test' },
]

export function FlowBuilderStepWizardNav({
  activePhase,
  setupComplete,
  configureComplete,
  testComplete,
  onSelectPhase,
}: {
  activePhase: FlowBuilderStepPhase
  setupComplete: boolean
  configureComplete: boolean
  testComplete: boolean
  onSelectPhase: (phase: FlowBuilderStepPhase) => void
}) {
  const completion: Record<FlowBuilderStepPhase, boolean> = {
    setup: setupComplete,
    configure: configureComplete,
    test: testComplete,
  }

  return (
    <nav
      className="border-border gap-spacing-1 px-spacing-4 py-spacing-3 flex shrink-0 items-center border-b"
      aria-label="Step configuration"
    >
      {PHASES.map((phase, index) => {
        const isActive = activePhase === phase.id
        const isComplete = completion[phase.id]
        return (
          <div key={phase.id} className="gap-spacing-1 flex min-w-0 items-center">
            {index > 0 ? (
              <ChevronRight className="icon-xs text-muted-foreground shrink-0" aria-hidden />
            ) : null}
            <button
              type="button"
              onClick={() => onSelectPhase(phase.id)}
              className={cn(
                'gap-spacing-1 rounded-spacing-1 px-spacing-2 py-spacing-1 flex min-w-0 items-center border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {isComplete ? (
                <Check className="icon-xs text-primary shrink-0" aria-hidden />
              ) : (
                <AlertTriangle
                  className="flow-builder-phase-warning-icon icon-xs shrink-0"
                  aria-hidden
                />
              )}
              <span className="body-4 truncate font-medium">{phase.label}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
