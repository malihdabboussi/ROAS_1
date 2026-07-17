'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { MissionSubtask } from '../../types'

interface SubtaskPlanIntentProps {
  intent: NonNullable<MissionSubtask['intent']>
}

export function SubtaskPlanIntent({ intent }: SubtaskPlanIntentProps) {
  const [briefOpen, setBriefOpen] = useState(false)
  const hasBrief = Boolean(intent.story || intent.sensory || intent.ecology)

  return (
    <section className="border-border bg-card rounded-spacing-3 p-spacing-4 space-y-spacing-3 border">
      <div className="space-y-spacing-2">
        <p className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
          What this step is for
        </p>
        {intent.why ? (
          <p className="body-2 text-foreground leading-relaxed">{intent.why}</p>
        ) : null}
      </div>

      {intent.endState ? (
        <div className="border-border bg-muted-20 rounded-spacing-2 px-spacing-3 py-spacing-2 space-y-spacing-1 border">
          <p className="typo-caption text-muted-foreground font-medium uppercase tracking-wide">
            Done when
          </p>
          <p className="body-3 text-foreground leading-relaxed">{intent.endState}</p>
        </div>
      ) : null}

      {hasBrief ? (
        <div className="border-border border-t pt-spacing-3">
          <button
            type="button"
            onClick={() => setBriefOpen((open) => !open)}
            className="gap-spacing-2 text-muted-foreground hover:text-foreground flex w-full items-center text-left transition-colors"
            aria-expanded={briefOpen}
          >
            {briefOpen ? (
              <ChevronDown className="icon-sm shrink-0" />
            ) : (
              <ChevronRight className="icon-sm shrink-0" />
            )}
            <span className="body-3 font-medium">Agent brief</span>
          </button>
          {briefOpen ? (
            <div className="mt-spacing-3 space-y-spacing-3">
              {(
                [
                  ['Story', intent.story],
                  ['Sensory', intent.sensory],
                  ['Ecology', intent.ecology],
                ] as const
              ).map(([label, value]) =>
                value ? (
                  <div key={label} className="space-y-spacing-1">
                    <p className="body-4 text-muted-foreground font-medium">{label}</p>
                    <p className="body-3 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {value}
                    </p>
                  </div>
                ) : null,
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
