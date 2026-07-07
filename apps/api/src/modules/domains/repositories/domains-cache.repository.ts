import { Injectable, Logger } from '@nestjs/common'
import { SupabaseClient } from '@supabase/supabase-js'
import { DomainCache } from '../types/domains.types'

@Injectable()
export class DomainsCacheRepository {
  private readonly logger = new Logger(DomainsCacheRepository.name)

  async cacheDomain(
    supabase: SupabaseClient,
    domainName: string,
    landingPageSlug: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('domains_cache').upsert(
      {
        domain_name: domainName,
        landing_page_slug: landingPageSlug,
        user_id: userId,
        cached_at: new Date().toISOString(),
      },
      { onConflict: 'domain_name' },
    )

    if (error) {
      this.logger.error(`Failed to cache domain ${domainName}: ${error.message}`)
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  async getCachedDomain(
    supabase: SupabaseClient,
    domainName: string,
  ): Promise<{ success: boolean; cache?: DomainCache; error?: string }> {
    const { data, error } = await supabase
      .from('domains_cache')
      .select('*')
      .eq('domain_name', domainName)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, cache: undefined }
      }
      return { success: false, error: error.message }
    }

    // Check TTL (10 minutes)
    const cacheEntry = data as DomainCache
    const cacheAge = Date.now() - new Date(cacheEntry.cached_at).getTime()
    const TTL_MS = 10 * 60 * 1000

    if (cacheAge > TTL_MS) {
      await this.removeCachedDomain(supabase, domainName)
      return { success: true, cache: undefined }
    }

    return { success: true, cache: cacheEntry }
  }

  async removeCachedDomain(
    supabase: SupabaseClient,
    domainName: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('domains_cache').delete().eq('domain_name', domainName)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  async cleanExpiredCache(
    supabase: SupabaseClient,
  ): Promise<{ success: boolean; removedCount?: number; error?: string }> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const { count, error } = await supabase
      .from('domains_cache')
      .delete({ count: 'exact' })
      .lt('cached_at', tenMinutesAgo)

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true, removedCount: count || 0 }
  }
}
