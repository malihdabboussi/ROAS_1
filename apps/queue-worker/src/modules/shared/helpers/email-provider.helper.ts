import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../../../lib/services/database.service'

export type EmailProvider = 'sendgrid' | 'ghl'

export interface EmailProviderResult {
  provider: EmailProvider
  source: 'global' | 'default'
}

@Injectable()
export class EmailProviderHelper {
  constructor(private readonly databaseService: DatabaseService) {}

  async getEmailProvider(userId: string, orgId?: string | null): Promise<EmailProviderResult> {
    const supabase = this.databaseService.getClient()

    let query = supabase.from('email_settings').select('email_provider').eq('user_id', userId)
    query = orgId ? query.eq('org_id', orgId) : query.is('org_id', null)
    const { data: settings, error } = await query.single()

    if (!error && settings?.email_provider) {
      return { provider: settings.email_provider as EmailProvider, source: 'global' }
    }

    return { provider: 'sendgrid', source: 'default' }
  }

  async getProvider(userId: string, orgId?: string | null): Promise<EmailProvider> {
    const result = await this.getEmailProvider(userId, orgId)
    return result.provider
  }
}
