import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase } from '@vibey/api-shared'
import { VerifyDomainDto } from '../dto/verify-domain.dto'
import { DomainVerificationService } from '../services/domain-verification.service'

@Controller('domains')
@UseGuards(AuthGuard, ThrottlerGuard)
export class DomainVerifyController {
  constructor(private readonly domainVerificationService: DomainVerificationService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyDomain(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() dto: VerifyDomainDto,
  ) {
    return this.domainVerificationService.verifyDomain(supabase, user.id, dto)
  }
}
