import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MissionsConfig, ViewDef } from '../types/space-schema'
import { useMissionsViewColumns } from './useMissionsViewColumns'

describe('useMissionsViewColumns', () => {
  it('persists the exact final width only when resize completion is signaled', () => {
    const onViewPatch = vi.fn().mockResolvedValue(undefined)
    const missionsConfig: MissionsConfig = {
      list_column_widths: { title: 380, status: 120 },
    }
    const activeView: ViewDef = {
      id: 'missions-view',
      type: 'missions',
      name: 'Missions',
      missions_config: missionsConfig,
    }
    const { result } = renderHook(() =>
      useMissionsViewColumns({
        activeView,
        mc: missionsConfig,
        onViewPatch,
      }),
    )

    act(() => {
      result.current.handleMissionListColumnResize('title', 410)
    })
    expect(onViewPatch).not.toHaveBeenCalled()

    act(() => {
      result.current.handleMissionListColumnResizeEnd('title', 420)
    })

    expect(onViewPatch).toHaveBeenCalledTimes(1)
    expect(onViewPatch).toHaveBeenCalledWith({
      missions_config: {
        list_column_widths: { title: 420, status: 120 },
      },
    })
  })
})
