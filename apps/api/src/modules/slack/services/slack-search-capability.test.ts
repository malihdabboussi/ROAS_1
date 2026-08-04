import { describe, expect, it } from 'vitest'
import { getSlackSearchCapability } from './slack-search-capability'

describe('getSlackSearchCapability', () => {
  it('reports full search only with a user token and search scope', () => {
    expect(
      getSlackSearchCapability({
        user_access_token: 'xoxp-token',
        authed_user_scope: 'search:read',
      }),
    ).toEqual({ mode: 'full_search', reconnectRecommended: false })
  })

  it('reports historical fallback when no user token is stored', () => {
    expect(getSlackSearchCapability({})).toEqual({
      mode: 'historical_fallback',
      reconnectRecommended: true,
    })
  })

  it('requires reconnect when the stored user token lacks search scope', () => {
    expect(getSlackSearchCapability({ user_access_token: 'xoxp-token' })).toEqual({
      mode: 'reconnect_required',
      reconnectRecommended: true,
    })
  })
})
