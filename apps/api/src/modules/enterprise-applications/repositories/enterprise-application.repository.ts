import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

@Injectable()
export class EnterpriseApplicationRepository {
  private readonly supabase: SupabaseClient

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.getOrThrow<string>('SUPABASE_URL')
    const serviceKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY')
    this.supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }

  async findByEmail(email: string) {
    return this.supabase
      .from('enterprise_applications')
      .select('id')
      .eq('email', email)
      .maybeSingle()
  }

  async insert(input: {
    user_id: string | null
    email: string
    name: string | null
    company_name: string
    company_size: string
    role_title: string | null
    use_case: string | null
    team_size: string | null
    phone: string | null
    website: string | null
    source: 'app' | 'website'
    status: string
  }) {
    return this.supabase.from('enterprise_applications').insert(input)
  }

  async findStatusByEmail(email: string) {
    return this.supabase
      .from('enterprise_applications')
      .select('id, status')
      .eq('email', email)
      .maybeSingle()
  }
}
