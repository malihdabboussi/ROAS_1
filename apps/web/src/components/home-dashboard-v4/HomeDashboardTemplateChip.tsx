'use client'

import { useState } from 'react'
import {
  HOME_DASHBOARD_TEMPLATES,
  homeDashboardTemplate,
  type HomeDashboardTemplateId,
} from '@/features/home/config/home-dashboard-v4.config'
import {
  HomeDashboardV4Chip,
  HomeDashboardV4Menu,
  HomeDashboardV4MenuDivider,
  HomeDashboardV4MenuItem,
  HomeDashboardV4MenuLabel,
} from './HomeDashboardV4Menu'

export function HomeDashboardTemplateChip({
  selectedTemplateId,
  onSelectTemplate,
}: {
  selectedTemplateId: HomeDashboardTemplateId | null
  onSelectTemplate: (id: HomeDashboardTemplateId | null) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = homeDashboardTemplate(selectedTemplateId)

  return (
    <div className="relative shrink-0">
      <HomeDashboardV4Chip
        label="Template"
        value={selected ? selected.label : 'Blank'}
        icon={selected?.icon}
        selected={Boolean(selected)}
        open={open}
        onClick={() => setOpen((value) => !value)}
      />
      <HomeDashboardV4Menu open={open} onClose={() => setOpen(false)} width={240}>
        <HomeDashboardV4MenuLabel>Templates</HomeDashboardV4MenuLabel>
        {HOME_DASHBOARD_TEMPLATES.map((template) => (
          <HomeDashboardV4MenuItem
            key={template.id}
            icon={template.icon}
            label={template.label}
            checked={selectedTemplateId === template.id}
            onClick={() => {
              onSelectTemplate(template.id)
              setOpen(false)
            }}
          />
        ))}
        <HomeDashboardV4MenuDivider />
        <HomeDashboardV4MenuItem
          label="Start blank"
          checked={!selectedTemplateId}
          onClick={() => {
            onSelectTemplate(null)
            setOpen(false)
          }}
        />
      </HomeDashboardV4Menu>
    </div>
  )
}
