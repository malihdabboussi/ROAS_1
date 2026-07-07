'use client'

import { useCallback, useEffect, useState } from 'react'
import { customFieldsApi } from './custom-fields-api'
import type {
  CreateCustomFieldInput,
  CustomFieldDefinition,
  UpdateCustomFieldInput,
} from './custom-fields'

interface UseCustomFieldsReturn {
  fields: CustomFieldDefinition[]
  isLoading: boolean
  error: string | null
  createField: (input: CreateCustomFieldInput) => Promise<CustomFieldDefinition>
  updateField: (fieldId: string, updates: UpdateCustomFieldInput) => Promise<CustomFieldDefinition>
  deleteField: (fieldId: string) => Promise<void>
  refreshFields: () => Promise<void>
}

export function useCustomFields(): UseCustomFieldsReturn {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadFields = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await customFieldsApi.getCustomFields()
      setFields(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custom fields')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFields()
  }, [loadFields])

  const createField = useCallback(
    async (input: CreateCustomFieldInput): Promise<CustomFieldDefinition> => {
      const newField = await customFieldsApi.createCustomField(input)
      setFields((prev) => [...prev, newField])
      return newField
    },
    [],
  )

  const updateField = useCallback(
    async (fieldId: string, updates: UpdateCustomFieldInput): Promise<CustomFieldDefinition> => {
      const updatedField = await customFieldsApi.updateCustomField(fieldId, updates)
      setFields((prev) => prev.map((field) => (field.id === fieldId ? updatedField : field)))
      return updatedField
    },
    [],
  )

  const deleteField = useCallback(async (fieldId: string): Promise<void> => {
    await customFieldsApi.deleteCustomField(fieldId)
    setFields((prev) => prev.filter((field) => field.id !== fieldId))
  }, [])

  const refreshFields = useCallback(async () => {
    await loadFields()
  }, [loadFields])

  return { fields, isLoading, error, createField, updateField, deleteField, refreshFields }
}
