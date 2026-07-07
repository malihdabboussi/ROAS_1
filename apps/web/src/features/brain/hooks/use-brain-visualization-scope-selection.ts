'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { brainHomeHref } from '../lib/brain-scope-nav'
import { resolveBrainScopeRuntimeState } from '../lib/brain-scope-runtime'
import type { BrainScopeNavOption } from './use-brain-scope-nav-options'

type BrainVisualizationScopeRouter = {
  push: (href: string) => void
  replace: (href: string, options?: { scroll?: boolean }) => void
}

type BrainVisualizationScopeSearchParams = Pick<URLSearchParams, 'get'>

type UseBrainVisualizationScopeSelectionInput = {
  router: BrainVisualizationScopeRouter
  searchParams: BrainVisualizationScopeSearchParams
  scopeOptions: BrainScopeNavOption[]
  scopeOptionsResolved: boolean
  scopesLoading: boolean
}

export function useBrainVisualizationScopeSelection({
  router,
  searchParams,
  scopeOptions,
  scopeOptionsResolved,
  scopesLoading,
}: UseBrainVisualizationScopeSelectionInput) {
  const [selectedScopeId, setSelectedScopeIdRaw] = useState(
    () => searchParams.get('scope') ?? 'user',
  )

  const scopeParam = searchParams.get('scope') ?? 'user'
  useEffect(() => {
    setSelectedScopeIdRaw(scopeParam)
  }, [scopeParam])

  useEffect(() => {
    if (scopesLoading) return
    setSelectedScopeIdRaw((current) => {
      if (scopeOptions.some((option) => option.id === current)) return current
      router.replace(brainHomeHref(), { scroll: false })
      return 'user'
    })
  }, [scopesLoading, scopeOptions, router])

  const selectedScope = useMemo(
    () => scopeOptions.find((option) => option.id === selectedScopeId) ?? scopeOptions[0],
    [scopeOptions, selectedScopeId],
  )

  const navigateToBrainHome = useCallback(() => {
    router.push(brainHomeHref())
  }, [router])

  const brainScopeRuntime = useMemo(
    () =>
      resolveBrainScopeRuntimeState({
        scopeOptions,
        selectedScopeId,
        selectedScope,
        scopeOptionsResolved,
        scopesLoading,
      }),
    [scopeOptions, scopeOptionsResolved, scopesLoading, selectedScope, selectedScopeId],
  )

  return {
    brainScopeRuntime,
    navigateToBrainHome,
    selectedScope,
    selectedScopeId,
  }
}
