import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class OnboardingRepository {
  async getProfileMachineRow(
    supabase: SupabaseClient,
    userId: string,
    selectFields: string,
  ): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }> {
    const { data, error } = await supabase
      .from('profiles')
      .select(selectFields)
      .eq('id', userId)
      .single()

    return {
      data: (data as Record<string, unknown> | null) ?? null,
      error: error ? { message: error.message } : null,
    }
  }
}
