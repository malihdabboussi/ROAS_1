import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePersistedHomeFeedScope } from './HomeFeedScopePicker'

describe('usePersistedHomeFeedScope', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('defaults My Tasks to every scope so all user assignments are included', () => {
    const { result } = renderHook(() => usePersistedHomeFeedScope('my_tasks'))

    expect(result.current.scope).toEqual({
      feedScope: 'all',
      orgId: null,
      campaignId: null,
    })
  })
})
