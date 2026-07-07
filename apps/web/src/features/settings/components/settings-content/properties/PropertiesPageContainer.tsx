'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { useCustomFields } from '@/lib/properties/use-custom-fields'
import { CustomFieldsTab } from './custom-fields/CustomFieldsTab'

export function PropertiesPageContainer() {
  const [createTrigger, setCreateTrigger] = useState(0)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const customFieldsState = useCustomFields()

  useEffect(() => {
    if (!customFieldsState.isLoading && !initialLoadComplete) {
      setInitialLoadComplete(true)
    }
  }, [customFieldsState.isLoading, initialLoadComplete])

  if (!initialLoadComplete) {
    return (
      <div className="flex h-full min-h-[400px] w-full items-center justify-center">
        <VibeyLoadingOrb size="sm" state="processing" />
      </div>
    )
  }

  return (
    <div className="p-spacing-4 sm:p-spacing-8">
      <div className="space-y-spacing-4 sm:space-y-spacing-6">
        <div className="flex items-center justify-between">
          <h2 className="title-h6 text-foreground">Custom Fields</h2>
          <button
            onClick={() => {
              setCreateTrigger((prev) => prev + 1)
              setTimeout(() => setCreateTrigger(0), 100)
            }}
            className="button-glass-accent px-spacing-3 py-spacing-1 body-3 gap-spacing-2 flex items-center rounded-lg font-medium"
          >
            <Plus className="icon-sm" />
            <span className="hidden md:inline">Create Field</span>
            <span className="md:hidden">New</span>
          </button>
        </div>

        <CustomFieldsTab
          createTrigger={createTrigger}
          fields={customFieldsState.fields}
          isLoading={customFieldsState.isLoading}
          createField={customFieldsState.createField}
          updateField={customFieldsState.updateField}
          deleteField={customFieldsState.deleteField}
        />
      </div>
    </div>
  )
}
