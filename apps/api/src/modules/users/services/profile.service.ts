import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildVibeyAssetRef,
  hasSharedRailwayRuntime,
  inferAssetRefType,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
} from '@vibey/api-shared'
import type { UpdateDefaultAccountInput } from '../dto/profile-default-account.dto'
import { UsersRepository } from '../repositories/users.repository'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ProfileUser = {
  id: string
  email: string
}

@Injectable()
export class ProfileService {
  private readonly machineColumns = resolveMachineProfileColumns(process.env)

  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(user: ProfileUser, supabase: SupabaseClient) {
    const { data, error } = await this.usersRepository.getProfile(
      supabase,
      user.id,
      `id, full_name, avatar_url, company_name, industry, website, onboarding_completed, onboarding_data, ${this.machineColumns.machineId}, ${this.machineColumns.runtimeType}, ${this.machineColumns.runtimeUrl}, onboarding_animation_seen, account_mode, default_account_mode, default_org_id`,
    )

    if (error) throw new BadRequestException(error.message)

    const profileData =
      (data as unknown as {
        full_name?: string | null
        avatar_url?: string | null
        company_name?: string | null
        industry?: string | null
        website?: string | null
        onboarding_completed?: boolean | null
        onboarding_data?: Record<string, unknown> | null
        onboarding_animation_seen?: boolean | null
        account_mode?: string | null
        default_account_mode?: string | null
        default_org_id?: string | null
      } | null) ?? null
    const machine = resolveMachineProfileRow(
      data as unknown as Record<string, unknown> | null,
      this.machineColumns,
    )

    return {
      id: user.id,
      email: user.email,
      full_name: profileData?.full_name ?? '',
      avatar_url: profileData?.avatar_url ?? null,
      company_name: profileData?.company_name ?? '',
      industry: profileData?.industry ?? null,
      website: profileData?.website ?? null,
      onboarding_completed: profileData?.onboarding_completed ?? false,
      onboarding_data: profileData?.onboarding_data ?? null,
      fly_machine_id: machine.machineId ?? null,
      agent_runtime_type: machine.runtimeType,
      agent_runtime_url: machine.runtimeUrl,
      runtime_ready: Boolean(machine.machineId) || hasSharedRailwayRuntime(machine),
      onboarding_animation_seen: profileData?.onboarding_animation_seen ?? false,
      account_mode: profileData?.account_mode ?? 'personal',
      default_account_mode: profileData?.default_account_mode ?? 'personal',
      default_org_id: profileData?.default_org_id ?? null,
    }
  }

  async getProfileById(id: string, supabase: SupabaseClient) {
    if (!UUID_RE.test(id)) {
      throw new BadRequestException('Invalid profile id')
    }

    const { data, error } = await this.usersRepository.getPublicProfile(supabase, id)

    if (error) throw new BadRequestException(error.message)

    return {
      profile: data
        ? {
            full_name: data.full_name ?? '',
            email: data.email ?? null,
            avatar_url: data.avatar_url ?? null,
          }
        : null,
    }
  }

  async updateProfile(
    user: { id: string },
    supabase: SupabaseClient,
    body: { full_name?: string; company_name?: string; avatar_url?: string },
  ) {
    const payload: Record<string, unknown> = {}
    if (body.full_name !== undefined) payload.full_name = body.full_name.trim()
    if (body.company_name !== undefined) payload.company_name = body.company_name.trim()
    if (body.avatar_url !== undefined) payload.avatar_url = body.avatar_url

    const { error } = await this.usersRepository.updateProfile(supabase, user.id, payload)
    if (error) throw new BadRequestException(error.message)
    return { ok: true }
  }

  async updateDefaultAccount(
    user: { id: string },
    supabase: SupabaseClient,
    body: UpdateDefaultAccountInput,
  ) {
    if (body.mode === 'personal') {
      const { error } = await this.usersRepository.updateProfile(supabase, user.id, {
        default_account_mode: 'personal',
        default_org_id: null,
      })
      if (error) throw new BadRequestException(error.message)
      return { ok: true, default_account_mode: 'personal', default_org_id: null }
    }

    const { data: membership, error: membershipError } =
      await this.usersRepository.findActiveOrgMembership(supabase, user.id, body.orgId)
    if (membershipError) throw new BadRequestException(membershipError.message)
    if (!membership) throw new BadRequestException('Organization is not available')

    const { error } = await this.usersRepository.updateProfile(supabase, user.id, {
      default_account_mode: 'org',
      default_org_id: body.orgId,
    })
    if (error) throw new BadRequestException(error.message)
    return { ok: true, default_account_mode: 'org', default_org_id: body.orgId }
  }

  async updateOnboarding(
    user: { id: string },
    supabase: SupabaseClient,
    body: {
      full_name?: string
      industry?: string | null
      website?: string | null
      onboarding_completed?: boolean
      onboarding_animation_seen?: boolean
      onboarding_data?: Record<string, unknown>
    },
  ) {
    const payload: Record<string, unknown> = {}
    if (body.full_name !== undefined) payload.full_name = body.full_name.trim()
    if (body.industry !== undefined) payload.industry = body.industry
    if (body.website !== undefined) payload.website = body.website
    if (body.onboarding_completed !== undefined)
      payload.onboarding_completed = body.onboarding_completed
    if (body.onboarding_animation_seen !== undefined)
      payload.onboarding_animation_seen = body.onboarding_animation_seen
    if (body.onboarding_data !== undefined) payload.onboarding_data = body.onboarding_data

    const { error } = await this.usersRepository.updateProfile(supabase, user.id, payload)
    if (error) throw new BadRequestException(error.message)
    return { ok: true }
  }

  async updateStatus(
    user: { id: string },
    supabase: SupabaseClient,
    body: { status_emoji?: string | null; status_text?: string | null },
  ) {
    const payload: Record<string, unknown> = {}
    if (body.status_emoji !== undefined) payload.status_emoji = body.status_emoji ?? null
    if (body.status_text !== undefined) payload.status_text = body.status_text?.trim() ?? null

    const { error } = await this.usersRepository.updateProfile(supabase, user.id, payload)
    if (error) throw new BadRequestException(error.message)
    return { ok: true }
  }

  async uploadAvatar(user: { id: string }, supabase: SupabaseClient, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')

    const ext = (file.originalname.split('.').pop() || 'png').toLowerCase()
    const filePath = `${user.id}/avatar.${ext}`
    const { error: uploadError } = await this.usersRepository.uploadAvatar(
      supabase,
      filePath,
      file.buffer,
      file.mimetype,
    )
    if (uploadError) throw new BadRequestException(uploadError.message)

    const {
      data: { publicUrl },
    } = this.usersRepository.getAvatarPublicUrl(supabase, filePath)

    const { error: updateError } = await this.usersRepository.updateProfile(supabase, user.id, {
      avatar_url: publicUrl,
    })
    if (updateError) throw new BadRequestException(updateError.message)

    const { data: asset, error: assetError } = await this.usersRepository.insertAvatarMediaAsset(
      supabase,
      {
        user_id: user.id,
        name: file.originalname,
        original_filename: file.originalname,
        file_path: filePath,
        bucket_name: 'avatars',
        file_size: file.size ?? file.buffer.length,
        mime_type: file.mimetype,
        asset_type: inferAssetRefType(file.mimetype),
        category: 'profile-avatar',
        campaign_id: null,
        space_id: null,
        org_id: null,
        source: 'upload',
        source_surface: 'profile',
        public_url: publicUrl,
        is_public: true,
      },
    )
    if (assetError) throw new BadRequestException(assetError.message)

    return {
      asset_id: String(asset.id),
      asset_ref: buildVibeyAssetRef(asset, publicUrl),
      url: publicUrl,
    }
  }
}
