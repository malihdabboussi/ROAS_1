'use client'

import { WorkflowCanvas } from './workflow/WorkflowCanvas'

interface WorkflowTabProps {
  campaignId: string
}

export function WorkflowTab({ campaignId }: WorkflowTabProps) {
  return <WorkflowCanvas campaignId={campaignId} />
}
