import { Injectable, Logger } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'

type ContextItem = { client_label: string | null; summary: string }

@Injectable()
export class SlackContextStakesService {
  private readonly logger = new Logger(SlackContextStakesService.name)
  constructor(private readonly moduleRef: ModuleRef) {}

  async build(input: {
    supabase: SupabaseClient
    userId: string
    orgId: string
    timezone: string
    now: Date
    items: ContextItem[]
  }): Promise<string[]> {
    const labels = [
      ...new Set(input.items.map((item) => item.client_label?.trim()).filter(Boolean)),
    ] as string[]
    if (!labels.length) return []
    const [calendar, fathom] = await Promise.all([
      this.calendarStakes(input, labels),
      this.fathomStakes(input, labels),
    ])
    return [...calendar, ...fathom].slice(0, 8)
  }

  private async calendarStakes(
    input: { supabase: SupabaseClient; userId: string; orgId: string; timezone: string; now: Date },
    labels: string[],
  ): Promise<string[]> {
    try {
      const { IntegrationsCalendarService } =
        await import('../../integrations/services/integrations-calendar.service')
      const calendar = this.moduleRef.get(IntegrationsCalendarService, { strict: false })
      if (!calendar) return []
      const agenda = await calendar.getAgenda(
        input.supabase,
        { id: input.userId },
        { userId: input.userId, orgId: input.orgId, orgRole: 'owner' },
        {
          start: input.now.toISOString(),
          end: new Date(input.now.getTime() + 14 * 24 * 60 * 60_000).toISOString(),
          timezone: input.timezone,
          provider: 'google_calendar',
          scope: 'personal',
        },
      )
      return agenda.events.flatMap((event) => {
        const searchable =
          `${event.title} ${event.description ?? ''} ${event.attendees.map((attendee) => attendee.name ?? attendee.email).join(' ')}`.toLowerCase()
        const label = labels.find((candidate) => searchable.includes(candidate.toLowerCase()))
        if (!label) return []
        const date = new Intl.DateTimeFormat('en-US', {
          timeZone: input.timezone,
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(event.start))
        return [`Next relevant event for ${label}: ${event.title} — ${date}`]
      })
    } catch (error) {
      this.logger.warn(
        `Calendar stakes unavailable: ${error instanceof Error ? error.message : String(error)}`,
      )
      return []
    }
  }

  private async fathomStakes(
    input: { supabase: SupabaseClient; orgId: string },
    labels: string[],
  ): Promise<string[]> {
    const { data, error } = await input.supabase
      .from('space_items')
      .select('title,status,custom_data,updated_at')
      .eq('org_id', input.orgId)
      .eq('custom_data->>entry_type', 'follow_up')
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) {
      this.logger.warn(`Fathom follow-up stakes unavailable: ${error.message}`)
      return []
    }
    return (data ?? []).flatMap((row) => {
      const customData = JSON.stringify(row.custom_data ?? {})
      if (!/meeting_follow_up|fathom|source_call_item_id/i.test(customData)) return []
      const searchable = `${row.title ?? ''} ${customData}`.toLowerCase()
      const label = labels.find((candidate) => searchable.includes(candidate.toLowerCase()))
      if (!label) return []
      return [
        `Fathom follow-up for ${label} [${row.status ?? 'open'}]: ${row.title ?? 'Untitled follow-up'}`,
      ]
    })
  }
}
