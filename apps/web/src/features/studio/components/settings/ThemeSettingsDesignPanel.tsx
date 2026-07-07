'use client'

import type { Dispatch, SetStateAction } from 'react'
import { DesignSettingsPanel } from '@/features/themes/components/design'
import type { DesignSettings } from '@/features/themes/types'

export interface ThemeSettingsDesignPanelProps {
  designSettings: DesignSettings
  setDesignSettings: Dispatch<SetStateAction<DesignSettings>>
}

export function ThemeSettingsDesignPanel({
  designSettings,
  setDesignSettings,
}: ThemeSettingsDesignPanelProps) {
  return (
    <div>
      <DesignSettingsPanel value={designSettings} onChange={setDesignSettings} />
    </div>
  )
}
