/** Load name catalogs from campaigns, Page Grader, and Slack People for meeting follow-ups. */

import { Logger } from '@nestjs/common'
import type { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PageGraderApiService } from '../../integrations/page-grader/services/page-grader-api.service'
import type { SlackPeopleRepository } from '../../slack/repositories/slack-people.repository'
import { dedupeNameKnowledge, type NameKnowledgeEntry } from './meeting-follow-up-name-knowledge'

const logger = new Logger('MeetingFollowUpNameKnowledgeLoader')

export async function loadMeetingFollowUpNameKnowledge(input: {
  supabase: SupabaseClient
  moduleRef: ModuleRef
  userId: string
  orgId: string | null
  slackPeopleRepo?: SlackPeopleRepository
}): Promise<NameKnowledgeEntry[]> {
  const entries: NameKnowledgeEntry[] = []

  const campaignNames = await loadCampaignNames(input.supabase, input.orgId)
  for (const name of campaignNames) {
    entries.push({ canonical: name, source: 'campaign' })
  }

  const pg = await loadPageGraderClientNames(input.moduleRef, input.userId)
  for (const name of pg.clients) {
    entries.push({ canonical: name, source: 'page_grader_client' })
  }
  for (const name of pg.scopeNames) {
    entries.push({ canonical: name, source: 'page_grader_scope' })
  }

  if (input.orgId && input.slackPeopleRepo) {
    try {
      const people = await input.slackPeopleRepo.listPeople(input.supabase, input.orgId)
      for (const person of people) {
        if (person.relationship_kind === 'ignored') continue
        const name = String(person.display_name ?? '').trim()
        if (name) entries.push({ canonical: name, source: 'slack_person' })
      }
    } catch (err) {
      logger.warn(
        `Slack People name catalog skipped: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  return dedupeNameKnowledge(entries)
}

async function loadCampaignNames(
  supabase: SupabaseClient,
  orgId: string | null,
): Promise<string[]> {
  try {
    let query = supabase
      .from('campaigns')
      .select('name')
      .is('deleted_at', null)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(500)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? [])
      .map((row) => String((row as { name?: unknown }).name ?? '').trim())
      .filter(Boolean)
  } catch (err) {
    logger.warn(
      `Campaign name catalog skipped: ${err instanceof Error ? err.message : String(err)}`,
    )
    return []
  }
}

async function loadPageGraderClientNames(
  moduleRef: ModuleRef,
  userId: string,
): Promise<{ clients: string[]; scopeNames: string[] }> {
  try {
    const pageGrader = moduleRef.get(PageGraderApiService, { strict: false })
    if (!pageGrader) return { clients: [], scopeNames: [] }
    const result = await pageGrader.listClients(userId, { all: true })
    const clients = (result.clients ?? []).map((c) => String(c.name ?? '').trim()).filter(Boolean)
    const scopeNames: string[] = []
    for (const entry of Object.values(result.client_scope_map ?? {})) {
      const campaignName = String(entry.campaign_name ?? '').trim()
      const spaceTitle = String(entry.space_title ?? '').trim()
      if (campaignName) scopeNames.push(campaignName)
      if (spaceTitle) scopeNames.push(spaceTitle)
    }
    return { clients, scopeNames }
  } catch (err) {
    logger.warn(
      `Page Grader name catalog skipped: ${err instanceof Error ? err.message : String(err)}`,
    )
    return { clients: [], scopeNames: [] }
  }
}
