import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AuthGuard, CurrentUser, Supabase, ZodValidationPipe } from '@vibey/api-shared'
import {
  UpdateDefaultAccountSchema,
  type UpdateDefaultAccountInput,
} from '../dto/profile-default-account.dto'
import { ProfileService } from '../services/profile.service'

@Controller('profile')
@UseGuards(AuthGuard, ThrottlerGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
  ) {
    return this.profileService.getProfile(user, supabase)
  }

  @Get(':id')
  async getProfileById(@Param('id') id: string, @Supabase() supabase: SupabaseClient) {
    return this.profileService.getProfileById(id, supabase)
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { full_name?: string; company_name?: string; avatar_url?: string },
  ) {
    return this.profileService.updateProfile(user, supabase, body)
  }

  @Patch('default-account')
  async updateDefaultAccount(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body(new ZodValidationPipe(UpdateDefaultAccountSchema)) body: UpdateDefaultAccountInput,
  ) {
    return this.profileService.updateDefaultAccount(user, supabase, body)
  }

  @Patch('onboarding')
  async updateOnboarding(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body()
    body: {
      full_name?: string
      industry?: string | null
      website?: string | null
      onboarding_completed?: boolean
      onboarding_animation_seen?: boolean
      onboarding_data?: Record<string, unknown>
    },
  ) {
    return this.profileService.updateOnboarding(user, supabase, body)
  }

  @Patch('status')
  async updateStatus(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @Body() body: { status_emoji?: string | null; status_text?: string | null },
  ) {
    return this.profileService.updateStatus(user, supabase, body)
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadAvatar(
    @CurrentUser() user: { id: string },
    @Supabase() supabase: SupabaseClient,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileService.uploadAvatar(user, supabase, file)
  }
}
