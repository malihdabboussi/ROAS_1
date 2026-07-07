import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type RequestScope,
} from '@vibey/api-shared'
import { CreateDomainSchema } from '../dto/domain.dto'
import { DomainAuthService } from '../services/domain-auth.service'

@Controller('email/domains')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class DomainsController {
  private readonly logger = new Logger(DomainsController.name)

  constructor(private readonly domainAuthService: DomainAuthService) {}

  @Get()
  async listDomains(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const domains = await this.domainAuthService.listDomains(supabase, user.id, scope.orgId)
      return { success: true, domains }
    } catch (error) {
      this.logger.error(`Failed to list domains: ${error}`)
      throw new HttpException(
        { success: false, error: 'Failed to list domains' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post()
  async addDomain(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Body() body: unknown,
    @OrgContext() scope: RequestScope,
  ) {
    const validation = CreateDomainSchema.safeParse(body)
    if (!validation.success) {
      throw new HttpException(
        { success: false, error: 'Invalid request', details: validation.error.flatten() },
        HttpStatus.BAD_REQUEST,
      )
    }

    const { domain, subdomain, isDefault, customDkimSelector } = validation.data
    try {
      const result = await this.domainAuthService.addDomain(
        supabase,
        user.id,
        domain,
        subdomain,
        isDefault,
        customDkimSelector,
        scope.orgId,
      )
      return {
        success: true,
        domain: result.domain,
        dnsRecords: result.dnsRecords,
        message: 'Domain created. Add the DNS records shown below to verify ownership.',
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      const msg = error instanceof Error ? error.message : 'Failed to add domain'
      const isAuthError =
        msg.toLowerCase().includes('authorization required') ||
        msg.toLowerCase().includes('unauthorized')
      const userMessage = isAuthError
        ? 'SendGrid API key is missing or invalid. Add SENDGRID_API_KEY to your backend environment.'
        : msg
      throw new HttpException(
        { success: false, error: userMessage },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Get(':id')
  async getDomain(
    @Supabase() supabase: SupabaseClient,
    @Param('id') domainId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const domain = await this.domainAuthService.getDomain(supabase, domainId, scope.orgId)
      return { success: true, domain }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException({ success: false, error: 'Domain not found' }, HttpStatus.NOT_FOUND)
    }
  }

  @Post(':id/verify')
  async verifyDomain(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') domainId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      const result = await this.domainAuthService.verifyDomain(
        supabase,
        user.id,
        domainId,
        scope.orgId,
      )
      return {
        success: true,
        domain: result.domain,
        allValid: result.allValid,
        records: result.records,
        isValid: result.allValid,
        message: result.allValid
          ? 'Domain verified successfully!'
          : 'Some DNS records are not yet verified.',
      }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        { success: false, error: 'Failed to verify domain' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post(':id/default')
  async setDefaultDomain(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @Param('id') domainId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      await this.domainAuthService.setDefaultDomain(supabase, user.id, domainId, scope.orgId)
      return { success: true, message: 'Default domain updated' }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        { success: false, error: 'Failed to set default domain' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Delete(':id')
  async deleteDomain(
    @Supabase() supabase: SupabaseClient,
    @Param('id') domainId: string,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      await this.domainAuthService.deleteDomain(supabase, domainId, scope.orgId)
      return { success: true, message: 'Domain deleted' }
    } catch (error) {
      if (error instanceof HttpException) throw error
      throw new HttpException(
        { success: false, error: 'Failed to delete domain' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
