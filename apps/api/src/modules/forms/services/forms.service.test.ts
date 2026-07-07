import { describe, expect, it, vi } from 'vitest'
import { FormContactAnswerService } from './form-contact-answer.service'
import { FormsService } from './forms.service'

describe('FormsService', () => {
  it('returns aggregate response counts with target space names', async () => {
    const formsRepo = {
      findByCampaignId: vi.fn().mockResolvedValue([
        {
          id: 'form-1',
          name: 'Intake',
          space_id: 'space-fallback',
          settings: { target_space_id: 'space-target' },
        },
      ]),
    }
    const responsesRepo = {
      findAggregatesByCampaignId: vi.fn().mockResolvedValue([
        {
          form_id: 'form-1',
          responses_count: 3,
          last_response_at: '2026-06-17T00:00:00.000Z',
        },
      ]),
    }
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'spaces') throw new Error(`Unexpected table: ${table}`)
        return {
          select: () => ({
            in: async () => ({
              data: [{ id: 'space-target', title: 'Inbound Leads' }],
              error: null,
            }),
          }),
        }
      }),
    }
    const service = new FormsService(
      formsRepo as never,
      responsesRepo as never,
      {} as never,
      {} as never,
      {} as never,
    )

    await expect(
      service.listAggregates(supabase as never, 'campaign-1', 'org-1'),
    ).resolves.toEqual([
      {
        form_id: 'form-1',
        responses_count: 3,
        last_response_at: '2026-06-17T00:00:00.000Z',
        target_space_id: 'space-target',
        target_space_name: 'Inbound Leads',
      },
    ])
  })
})

describe('FormContactAnswerService', () => {
  it('applies only missing contact extras after resolving a contact answer', async () => {
    const contactIdentifier = {
      findOrCreateContact: vi.fn().mockResolvedValue({ id: 'contact-1' }),
      attachIdentifier: vi.fn(),
    }
    const updates: Array<Record<string, unknown>> = []
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== 'contacts') throw new Error(`Unexpected table: ${table}`)
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          maybeSingle: vi.fn(async () => ({
            data: { phone: null, business_name: 'Existing Co' },
            error: null,
          })),
          update: vi.fn((patch: Record<string, unknown>) => {
            updates.push(patch)
            return { eq: vi.fn(async () => ({ error: null })) }
          }),
        }
        return builder
      }),
    }
    const service = new FormContactAnswerService(contactIdentifier as never)

    await expect(
      service.buildCustomData(
        supabase as never,
        { user_id: 'user-1', org_id: 'org-1', title: 'Intake' },
        [{ id: 'q1', type: 'contact', property_field_id: 'contact_id' }],
        {
          q1: {
            name: 'Ava Smith',
            email: 'AVA@EXAMPLE.COM',
            phone: '+15555550100',
            business_name: 'New Co',
          },
        },
      ),
    ).resolves.toEqual({ contact_id: 'contact-1' })

    expect(updates).toEqual([{ phone: '+15555550100' }])
  })
})
