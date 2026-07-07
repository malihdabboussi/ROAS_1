import { describe, expect, it, vi } from 'vitest'
import { CalendlyApiService } from '../calendly-api.service'

function createSupabase(metadata: Record<string, unknown>) {
  return {
    from: vi.fn(() => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        single: vi.fn(async () => ({
          data: { metadata },
          error: null,
        })),
      }
      return builder
    }),
  } as any
}

describe('CalendlyApiService', () => {
  it('lists event types with the stored Calendly user URI', async () => {
    const supabase = createSupabase({
      calendly_user_uri: 'https://api.calendly.com/users/user_1',
    })
    const calendly = {
      listEventTypes: vi.fn().mockResolvedValue({ collection: [] }),
    }
    const oauth = {
      getAccessToken: vi.fn().mockResolvedValue('cal-token'),
    }
    const connections = {
      getStatus: vi.fn().mockResolvedValue({
        metadata: { calendly_user_uri: 'https://api.calendly.com/users/user_1' },
      }),
    }
    const service = new (CalendlyApiService as any)(calendly, oauth, connections)

    await expect(service.listEventTypes(supabase, 'user_1')).resolves.toEqual({ collection: [] })

    expect(oauth.getAccessToken).toHaveBeenCalledWith(supabase, 'user_1')
    expect(calendly.listEventTypes).toHaveBeenCalledWith(
      'cal-token',
      'https://api.calendly.com/users/user_1',
    )
  })
})
