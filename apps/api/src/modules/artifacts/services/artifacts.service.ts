import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactsRepository } from '../repositories/artifacts.repository'
import { ArtifactSkillDeleteService } from './artifact-skill-delete.service'

type DeleteAction =
  | 'delete_offer'
  | 'delete_ad'
  | 'delete_funnel'
  | 'delete_presentation'
  | 'delete_sequence'
  | 'delete_sequence_email'
  | 'delete_avatar'
  | 'delete_theme'
  | 'delete_document'
  | 'delete_email'
  | 'delete_social_post'
  | 'delete_blog_post'
  | 'delete_task'
  | 'delete_agent_skill'
  | 'delete_agent_skill_resource'

@Injectable()
export class ArtifactsService {
  constructor(
    private readonly repository: ArtifactsRepository,
    private readonly skillDeletes: ArtifactSkillDeleteService,
  ) {}

  async executeDelete(
    supabase: SupabaseClient,
    userId: string,
    input: { delete_action?: string; entity_id?: string; agent_message_id?: string },
  ) {
    const deleteAction = String(input.delete_action ?? '').trim() as DeleteAction
    const entityId = String(input.entity_id ?? '').trim()
    if (!deleteAction) return { success: false, error: 'delete_action is required' }
    if (!entityId) return { success: false, error: 'entity_id is required' }

    switch (deleteAction) {
      case 'delete_offer':
        return this.deleteByUserId(
          supabase,
          userId,
          'offers',
          entityId,
          'id, name',
          (row) => row.name ?? 'Untitled Offer',
          'offer',
        )
      case 'delete_ad':
        return this.deleteByUserId(
          supabase,
          userId,
          'ads',
          entityId,
          'id, headline',
          (row) => row.headline ?? 'Untitled Ad',
          'ad',
        )
      case 'delete_funnel':
        return this.deleteByUserId(
          supabase,
          userId,
          'funnels',
          entityId,
          'id, name',
          (row) => row.name ?? 'Untitled Funnel',
          'funnel',
        )
      case 'delete_presentation':
        return this.deleteByUserId(
          supabase,
          userId,
          'presentations',
          entityId,
          'id, name',
          (row) => row.name ?? 'Untitled Presentation',
          'presentation',
        )
      case 'delete_sequence':
        return this.deleteByUserId(
          supabase,
          userId,
          'sequences',
          entityId,
          'id, name',
          (row) => row.name ?? 'Untitled Sequence',
          'sequence',
        )
      case 'delete_sequence_email':
        return this.deleteSequenceEmail(supabase, userId, entityId)
      case 'delete_avatar':
        return this.deleteByUserId(
          supabase,
          userId,
          'avatars',
          entityId,
          'id, name',
          (row) => row.name ?? 'Untitled Avatar',
          'avatar',
        )
      case 'delete_theme':
        return this.deleteTheme(supabase, userId, entityId)
      case 'delete_document':
        return this.deleteDocument(supabase, userId, entityId)
      case 'delete_email':
        return this.deleteEmail(supabase, entityId)
      case 'delete_social_post':
        return this.deleteSocialPost(supabase, userId, entityId)
      case 'delete_blog_post':
        return this.deleteByUserId(
          supabase,
          userId,
          'blog_posts',
          entityId,
          'id, title',
          (row) => row.title ?? 'Untitled Blog Post',
          'blog_post',
        )
      case 'delete_task':
        return this.deleteTask(supabase, userId, entityId, input.agent_message_id)
      case 'delete_agent_skill':
        return this.skillDeletes.deleteAgentSkill(supabase, userId, entityId)
      case 'delete_agent_skill_resource':
        return this.skillDeletes.deleteAgentSkillResource(supabase, userId, entityId)
      default:
        return { success: false, error: `Unsupported delete_action: ${deleteAction}` }
    }
  }

  private buildDeleteStatusBlock(input: {
    deleteAction: string
    entityType: string
    entityId: string
    entityName: string
    status: 'success' | 'failed'
    error?: string
  }) {
    return {
      type: 'delete_status',
      id: `delete-status-${input.entityType}-${input.entityId}-${Date.now()}`,
      delete_action: input.deleteAction,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
      status: input.status,
      error: input.error ?? null,
    }
  }

  private async deleteByUserId(
    supabase: SupabaseClient,
    userId: string,
    table: string,
    entityId: string,
    selectColumns: string,
    nameResolver: (row: Record<string, any>) => string,
    entityType: string,
  ) {
    const { data: existing, error: existingError } = await this.repository
      .table(supabase, table)
      .select(selectColumns)
      .eq('id', entityId)
      .eq('user_id', userId)
      .maybeSingle()
    if (existingError) throw existingError
    if (!existing) return { success: false, error: `${entityType} not found` }

    const { error } = await this.repository
      .table(supabase, table)
      .delete()
      .eq('id', entityId)
      .eq('user_id', userId)
    if (error) throw error

    const entityName = nameResolver(existing as Record<string, any>)
    return {
      success: true,
      deleted: {
        action: entityType,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: `delete_${entityType}`,
          entityType,
          entityId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }

  private async deleteSequenceEmail(
    supabase: SupabaseClient,
    userId: string,
    sequenceEmailId: string,
  ) {
    const { data: email, error: emailError } = await this.repository
      .table(supabase, 'sequence_emails')
      .select('id, subject, sequence_id')
      .eq('id', sequenceEmailId)
      .maybeSingle()
    if (emailError) throw emailError
    if (!email) return { success: false, error: 'sequence_email not found' }

    const { data: sequence, error: sequenceError } = await this.repository
      .table(supabase, 'sequences')
      .select('id')
      .eq('id', email.sequence_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (sequenceError) throw sequenceError
    if (!sequence) return { success: false, error: 'sequence_email not found' }

    const { error } = await this.repository
      .table(supabase, 'sequence_emails')
      .delete()
      .eq('id', sequenceEmailId)
    if (error) throw error

    const entityName = email.subject ?? 'Untitled Sequence Email'
    return {
      success: true,
      deleted: {
        action: 'delete_sequence_email',
        entity_type: 'sequence_email',
        entity_id: sequenceEmailId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: 'delete_sequence_email',
          entityType: 'sequence_email',
          entityId: sequenceEmailId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }

  private async deleteTheme(supabase: SupabaseClient, userId: string, themeId: string) {
    const { data: brandingTheme, error: brandingThemeError } = await this.repository
      .table(supabase, 'branding_themes')
      .select('id, name, user_id, is_system')
      .eq('id', themeId)
      .maybeSingle()
    if (brandingThemeError) throw brandingThemeError

    if (brandingTheme) {
      if (brandingTheme.is_system) {
        return { success: false, error: 'System themes cannot be deleted' }
      }
      if (String(brandingTheme.user_id ?? '') !== userId) {
        return { success: false, error: 'theme not found' }
      }

      const { error } = await this.repository
        .table(supabase, 'branding_themes')
        .delete()
        .eq('id', themeId)
        .eq('user_id', userId)
      if (error) throw error

      const entityName = brandingTheme.name ?? 'Untitled Theme'
      return {
        success: true,
        deleted: {
          action: 'delete_theme',
          entity_type: 'theme',
          entity_id: themeId,
          entity_name: entityName,
        },
        ui_blocks: [
          this.buildDeleteStatusBlock({
            deleteAction: 'delete_theme',
            entityType: 'theme',
            entityId: themeId,
            entityName,
            status: 'success',
          }),
        ],
      }
    }

    const { data: theme, error: themeError } = await this.repository
      .table(supabase, 'themes')
      .select('id, name')
      .eq('id', themeId)
      .maybeSingle()
    if (themeError) throw themeError
    if (!theme) return { success: false, error: 'theme not found' }

    const { error } = await this.repository.table(supabase, 'themes').delete().eq('id', themeId)
    if (error) throw error

    const entityName = theme.name ?? 'Untitled Theme'
    return {
      success: true,
      deleted: {
        action: 'delete_theme',
        entity_type: 'theme',
        entity_id: themeId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: 'delete_theme',
          entityType: 'theme',
          entityId: themeId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }

  private async deleteDocument(supabase: SupabaseClient, userId: string, documentId: string) {
    const { data: document, error: documentError } = await this.repository
      .table(supabase, 'conversation_documents')
      .select('id, title, conversation_id')
      .eq('id', documentId)
      .maybeSingle()
    if (documentError) throw documentError
    if (!document) return { success: false, error: 'document not found' }

    const { data: conversation, error: conversationError } = await this.repository
      .table(supabase, 'conversations')
      .select('id')
      .eq('id', document.conversation_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (conversationError) throw conversationError
    if (!conversation) return { success: false, error: 'document not found' }

    const { error } = await this.repository
      .table(supabase, 'conversation_documents')
      .delete()
      .eq('id', documentId)
    if (error) throw error

    const entityName = document.title ?? 'Untitled Document'
    return {
      success: true,
      deleted: {
        action: 'delete_document',
        entity_type: 'document',
        entity_id: documentId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: 'delete_document',
          entityType: 'document',
          entityId: documentId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }

  private async deleteEmail(supabase: SupabaseClient, emailId: string) {
    const { data: email, error: emailError } = await this.repository
      .table(supabase, 'emails')
      .select('id, subject, space_id, source_item_id')
      .eq('id', emailId)
      .maybeSingle()
    if (emailError) throw emailError
    if (!email) return { success: false, error: 'email not found' }

    const { error } = await this.repository.table(supabase, 'emails').delete().eq('id', emailId)
    if (error) throw error

    await this.unlinkEmailFromSourceTask(supabase, email as Record<string, unknown>)

    const entityName = email.subject ?? 'Untitled Email'
    return {
      success: true,
      deleted: {
        action: 'delete_email',
        entity_type: 'email',
        entity_id: emailId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: 'delete_email',
          entityType: 'email',
          entityId: emailId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }

  private async unlinkEmailFromSourceTask(
    supabase: SupabaseClient,
    email: Record<string, unknown>,
  ): Promise<void> {
    const sourceItemId = typeof email.source_item_id === 'string' ? email.source_item_id : ''
    const spaceId = typeof email.space_id === 'string' ? email.space_id : ''
    if (!sourceItemId || !spaceId) return

    const { data: task } = await this.repository
      .table(supabase, 'space_items')
      .select('custom_data')
      .eq('id', sourceItemId)
      .eq('space_id', spaceId)
      .maybeSingle()
    const customData =
      task?.custom_data && typeof task.custom_data === 'object' && !Array.isArray(task.custom_data)
        ? (task.custom_data as Record<string, unknown>)
        : null
    if (!customData) return

    const nextCustomData = { ...customData }
    const emailId = String(email.id)
    if (
      nextCustomData.artifact &&
      typeof nextCustomData.artifact === 'object' &&
      !Array.isArray(nextCustomData.artifact)
    ) {
      const artifact = nextCustomData.artifact as Record<string, unknown>
      if (artifact.kind === 'email' && artifact.id === emailId) {
        delete nextCustomData.artifact
      }
    }
    if (Array.isArray(nextCustomData.artifacts)) {
      nextCustomData.artifacts = nextCustomData.artifacts.filter((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return true
        const artifact = entry as Record<string, unknown>
        return !(artifact.kind === 'email' && artifact.id === emailId)
      })
    }

    await this.repository
      .table(supabase, 'space_items')
      .update({ custom_data: nextCustomData })
      .eq('id', sourceItemId)
      .eq('space_id', spaceId)
  }

  private async deleteSocialPost(supabase: SupabaseClient, _userId: string, socialPostId: string) {
    const { data: post, error: postError } = await this.repository
      .table(supabase, 'social_posts')
      .select('id, headline, caption')
      .eq('id', socialPostId)
      .maybeSingle()
    if (postError) throw postError
    if (!post) return { success: false, error: 'social_post not found' }

    const { error } = await this.repository
      .table(supabase, 'social_posts')
      .delete()
      .eq('id', socialPostId)
    if (error) throw error

    const entityName =
      (typeof post.headline === 'string' && post.headline.trim()) ||
      (typeof post.caption === 'string' && post.caption.trim()) ||
      'Untitled Social Post'
    return {
      success: true,
      deleted: {
        action: 'delete_social_post',
        entity_type: 'social_post',
        entity_id: socialPostId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: 'delete_social_post',
          entityType: 'social_post',
          entityId: socialPostId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }

  private async deleteTask(
    supabase: SupabaseClient,
    userId: string,
    taskId: string,
    agentMessageId?: string,
  ) {
    const { data: task, error: taskError } = await this.repository
      .table(supabase, 'space_items')
      .select('*')
      .eq('id', taskId)
      .maybeSingle()
    if (taskError) throw taskError
    if (!task) return { success: false, error: 'task not found' }

    if (agentMessageId) {
      const { error: activityError } = await this.repository
        .table(supabase, 'space_item_activity')
        .insert({
          item_id: taskId,
          space_id: task.space_id,
          user_id: userId,
          org_id: task.org_id ?? null,
          actor_kind: 'agent',
          agent_message_id: agentMessageId,
          event_type: 'deleted',
          payload: { title: task.title ?? 'Untitled Task', snapshot: task },
          snapshot: task,
        })
      if (activityError) throw activityError
    }

    const { error } = await this.repository.table(supabase, 'space_items').delete().eq('id', taskId)
    if (error) throw error

    const entityName = task.title ?? 'Untitled Task'
    return {
      success: true,
      deleted: {
        action: 'delete_task',
        entity_type: 'task',
        entity_id: taskId,
        entity_name: entityName,
      },
      ui_blocks: [
        this.buildDeleteStatusBlock({
          deleteAction: 'delete_task',
          entityType: 'task',
          entityId: taskId,
          entityName,
          status: 'success',
        }),
      ],
    }
  }
}
