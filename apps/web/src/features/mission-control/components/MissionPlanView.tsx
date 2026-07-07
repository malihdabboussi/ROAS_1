'use client'

import type { MissionPlanContent } from '../types'

interface MissionPlanViewProps {
  content: MissionPlanContent
}

export function MissionPlanView({ content }: MissionPlanViewProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="body-2 text-foreground font-medium">{content.title}</p>
        <p className="body-4 text-muted-foreground mt-1">{content.summary}</p>
      </div>

      {content.approach && (
        <div>
          <p className="body-4 text-muted-foreground font-medium">Approach</p>
          <p className="body-4 text-muted-foreground mt-0.5">{content.approach}</p>
        </div>
      )}

      {content.outOfScope && content.outOfScope.length > 0 && (
        <div>
          <p className="body-4 text-muted-foreground font-medium">Out of scope</p>
          <ul className="body-4 text-muted-foreground mt-0.5 list-inside list-disc">
            {content.outOfScope.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
