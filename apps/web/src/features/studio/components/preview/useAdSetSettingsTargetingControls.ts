import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import type { AdSet } from '../../types'
import type { AdSetAgeField } from './AdSetAdvancedTargetingFields'
import type { AdSetSettingsSaveField } from './useAdSetSettingsFieldSaves'

interface UseAdSetSettingsTargetingControlsParams {
  targeting: Record<string, unknown>
  setData: Dispatch<SetStateAction<AdSet | null>>
  saveField: AdSetSettingsSaveField
  scheduleDebouncedSave: (key: string, callback: () => void, delayMs?: number) => void
}

export function useAdSetSettingsTargetingControls({
  targeting,
  setData,
  saveField,
  scheduleDebouncedSave,
}: UseAdSetSettingsTargetingControlsParams) {
  const [includeAudienceSearch, setIncludeAudienceSearch] = useState('')
  const [excludeAudienceSearch, setExcludeAudienceSearch] = useState('')
  const [includeExpanded, setIncludeExpanded] = useState(false)
  const [excludeExpanded, setExcludeExpanded] = useState(false)

  const handleTargetingChange = useCallback(
    (newTargeting: Record<string, unknown>, displayKey: string) => {
      setData((prev) => (prev ? { ...prev, targeting: newTargeting } : prev))
      void saveField('targeting', newTargeting, displayKey)
    },
    [saveField, setData],
  )

  const handleAgeTargetingChange = useCallback(
    (field: AdSetAgeField, value: number | undefined) => {
      const newTargeting = { ...targeting, [field]: value }
      setData((prev) => (prev ? { ...prev, targeting: newTargeting } : prev))
      scheduleDebouncedSave(
        field,
        () => void saveField('targeting', newTargeting, 'targeting_age'),
      )
    },
    [saveField, scheduleDebouncedSave, setData, targeting],
  )

  const handleAdvantageAudienceChange = useCallback(
    (checked: boolean) => {
      const targetingAutomation = (targeting.targeting_automation ?? {}) as Record<
        string,
        unknown
      >
      const newTargeting = {
        ...targeting,
        targeting_automation: {
          ...targetingAutomation,
          advantage_audience: checked ? 1 : 0,
        },
      }
      setData((prev) => (prev ? { ...prev, targeting: newTargeting } : prev))
      void saveField('targeting', newTargeting, 'targeting_advantage')
    },
    [saveField, setData, targeting],
  )

  return {
    includeAudienceSearch,
    setIncludeAudienceSearch,
    excludeAudienceSearch,
    setExcludeAudienceSearch,
    includeExpanded,
    setIncludeExpanded,
    excludeExpanded,
    setExcludeExpanded,
    handleTargetingChange,
    handleAgeTargetingChange,
    handleAdvantageAudienceChange,
  }
}
