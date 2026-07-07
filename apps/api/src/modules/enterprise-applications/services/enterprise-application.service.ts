import { Injectable, Logger } from '@nestjs/common'
import type { EnterpriseApplicationDto } from '../dto/enterprise-application.dto'
import { EnterpriseApplicationRepository } from '../repositories/enterprise-application.repository'

@Injectable()
export class EnterpriseApplicationService {
  private readonly logger = new Logger(EnterpriseApplicationService.name)

  constructor(private readonly enterpriseApplicationRepository: EnterpriseApplicationRepository) {}

  async apply(body: EnterpriseApplicationDto, userId: string | null, source: 'app' | 'website') {
    const email = body.email.trim().toLowerCase()

    const { data: existing } = await this.enterpriseApplicationRepository.findByEmail(email)

    if (existing) {
      return { success: true as const, alreadyApplied: true }
    }

    const { error } = await this.enterpriseApplicationRepository.insert({
      user_id: userId,
      email,
      name: body.name?.trim() || null,
      company_name: body.company_name.trim(),
      company_size: body.company_size,
      role_title: body.role_title?.trim() || null,
      use_case: body.use_case?.trim() || null,
      team_size: body.team_size?.trim() || null,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      source,
      status: 'pending',
    })

    if (error) {
      if (error.code === '23505') {
        return { success: true as const, alreadyApplied: true }
      }
      this.logger.warn(`enterprise application failed: ${error.message}`)
      throw new Error(error.message)
    }

    return { success: true as const, alreadyApplied: false }
  }

  async checkStatus(email: string) {
    const { data } = await this.enterpriseApplicationRepository.findStatusByEmail(
      email.trim().toLowerCase(),
    )

    return { applied: !!data, status: data?.status ?? null }
  }
}
