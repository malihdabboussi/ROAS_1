'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, PlusCircle, Workflow } from 'lucide-react'
import {
  AutomationSolidSelect,
  type AutomationSolidOption,
} from '@/components/ui/forms/AutomationSolidSelect'
import { describeFlowTrigger } from '../lib/describe-flow-trigger'
import type { FlowAutomationSummary } from '../types/flow-automation.types'

type FlowBuildStartMode = 'create' | 'update'

interface FlowBuildStartPanelProps {
  flows: FlowAutomationSummary[]
  preselectedFlow?: FlowAutomationSummary | null
  busy?: boolean
  onStart: (input: { mode: FlowBuildStartMode; targetFlow?: FlowAutomationSummary | null }) => void
}

export function FlowBuildStartPanel({
  flows,
  preselectedFlow,
  busy,
  onStart,
}: FlowBuildStartPanelProps) {
  const [mode, setMode] = useState<FlowBuildStartMode | null>(preselectedFlow ? 'update' : null)
  const [selectedFlowId, setSelectedFlowId] = useState<string>(preselectedFlow?.id ?? '')

  useEffect(() => {
    if (!preselectedFlow) return
    setMode('update')
    setSelectedFlowId(preselectedFlow.id)
  }, [preselectedFlow])

  const flowOptions = useMemo((): AutomationSolidOption[] => {
    return flows.map((flow) => ({
      value: flow.id,
      label: flow.name,
      description: `${describeFlowTrigger(flow.trigger)} · ${flow.actions.length} action${
        flow.actions.length !== 1 ? 's' : ''
      }`,
    }))
  }, [flows])

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.id === selectedFlowId) ?? null,
    [flows, selectedFlowId],
  )

  return (
    <div className="z-modal-layer-3 p-spacing-4 absolute inset-0 flex items-center justify-center">
      <div className="z-modal-dialog-backdrop-fill" aria-hidden />
      <section className="surface-card border-border rounded-spacing-4 p-spacing-6 z-modal-content relative w-full max-w-md border text-center shadow-lg">
        {busy && mode === 'create' ? (
          <div className="gap-spacing-3 py-spacing-6 flex flex-col items-center">
            <Loader2 className="icon-md text-muted-foreground animate-spin" aria-hidden />
            <p className="body-3 text-muted-foreground">Starting...</p>
          </div>
        ) : (
          <>
            <div className="mb-spacing-4">
              <h2 className="body-2 text-foreground font-semibold">Start with Loop</h2>
              <p className="body-4 text-muted-foreground mt-spacing-1">
                Choose whether Loop should create a new flow or update an existing one.
              </p>
            </div>

            <div className="gap-spacing-2 flex flex-wrap justify-center">
              <button
                type="button"
                className={`button-default ${
                  mode === 'create' ? 'button-glass-primary' : 'button-glass-neutral'
                }`}
                disabled={busy}
                onClick={() => {
                  setMode('create')
                  onStart({ mode: 'create' })
                }}
              >
                <PlusCircle className="icon-sm" />
                Create New
              </button>
              <button
                type="button"
                className={`button-default ${
                  mode === 'update' ? 'button-glass-primary' : 'button-glass-neutral'
                }`}
                disabled={busy || flows.length === 0}
                onClick={() => setMode('update')}
              >
                <Workflow className="icon-sm" />
                Update a Flow
              </button>
            </div>

            {mode === 'update' ? (
              <div className="gap-spacing-4 mt-spacing-4 flex flex-col items-center">
                <div className="w-full">
                  <AutomationSolidSelect
                    options={flowOptions}
                    value={selectedFlowId}
                    onChange={setSelectedFlowId}
                    placeholder="Select a flow"
                    ariaLabel="Select flow to update"
                    menuWidth="trigger"
                    disabled={busy || flows.length === 0}
                  />
                </div>
                <button
                  type="button"
                  className="button-default button-glass-primary"
                  disabled={busy || !selectedFlow}
                  onClick={() => onStart({ mode: 'update', targetFlow: selectedFlow })}
                >
                  Continue
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
