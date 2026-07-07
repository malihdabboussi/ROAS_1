import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'

export interface BrainImpersonationTarget {
  email: string | null
  role: string | null
}

@Injectable()
export class BrainAuthImpersonationRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async findUserRole(userId: string): Promise<string | null> {
    const { data, error } = await this.serviceClient.client
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return typeof data.role === 'string' ? data.role : null
  }

  async findTargetUser(userId: string): Promise<BrainImpersonationTarget | null> {
    const client = this.serviceClient.client
    const [{ data, error }, { data: targetProfile }] = await Promise.all([
      client.auth.admin.getUserById(userId),
      client.from('user_profiles').select('role').eq('id', userId).single(),
    ])
    if (error || !data?.user) return null
    return {
      email: data.user.email ?? null,
      role: typeof targetProfile?.role === 'string' ? targetProfile.role : null,
    }
  }
}
