export interface A2ATurn {
  from: string
  fromName: string
  fromImage?: string
  content: string
  turnIndex: number
  turnType: 'message' | 'thinking' | 'tool_use' | 'tool_result' | 'ui_block'
  toolName?: string
  blockData?: Record<string, unknown>
  timestamp: number
}

export type IntegrationRepairAction = {
  type: 'connect' | 'reconnect' | 'open_settings' | 'use_connection'
  label: string
  provider?: string
  connectionId?: string
  message?: string
  scopeMode?: 'personal' | 'org_shared' | string
}

export type IntegrationDoctor = {
  status: string
  summary?: string
  providerLabel?: string
  checks?: Array<{ label: string; status: 'pass' | 'warning' | 'fail' | string; detail: string }>
  connections?: Array<Record<string, unknown>>
  selectedConnection?: Record<string, unknown> | null
  nextActions?: IntegrationRepairAction[]
}

export type MessageContentBlock =
  | { type: 'text'; id: string; content: string }
  | { type: 'pdf_file'; id: string; url: string; label: string }
  | { type: 'docx_file'; id: string; url: string; label: string }
  | {
      type: 'media_asset'
      id: string
      url: string
      title: string
      kind: 'image' | 'video' | 'audio' | 'file'
      mediaAssetId?: string
      spaceId?: string
      mimeType?: string
      fileName?: string
      prompt?: string
    }
  | {
      type: 'status'
      id: string
      phase: 'thinking' | 'executing' | 'streaming'
      message: string
      timestamp: number
    }
  | {
      type: 'generation'
      id: string
      label: string
      state: 'active' | 'complete'
      startedAt: number
      endedAt?: number
    }
  | {
      type: 'session_compaction'
      id: string
      label: string
      state: 'active' | 'complete'
      timestamp: number
      completedAt?: number
    }
  | {
      type: 'tool'
      id: string
      name: string
      label: string
      action?: string
      toolCallId?: string
      state: 'active' | 'complete' | 'failed'
      startedAt: number
      endedAt?: number
      progress?: Array<{ id: string; detail: string; timestamp: number }>
      preview?: string
    }
  | {
      type: 'integration_connect'
      id: string
      provider: string
      title: string
      description: string
      status?:
        | 'disconnected'
        | 'needs_reconnect'
        | 'missing_scope'
        | 'access_denied'
        | 'fallback_available'
      problem?: string
      primaryAction?: IntegrationRepairAction
      secondaryActions?: IntegrationRepairAction[]
      doctor?: IntegrationDoctor
    }
  | {
      type: 'meta_ad_accounts'
      id: string
      adAccounts: Array<{ id: string; name: string; currency?: string }>
      pages: Array<{ id: string; name: string }>
      adId?: string
      campaignId?: string
      campaignName?: string
      headline?: string
      primaryText?: string
      imageUrl?: string
      defaults?: {
        objective?: string
        daily_budget?: number
        countries?: string[]
        pixel_id?: string
        custom_event_type?: string
      }
    }
  | {
      type: 'meta_config'
      id: string
      adId: string
      campaignId?: string
      adAccountId?: string
      pageId?: string
      campaignName?: string
      headline?: string
      primaryText?: string
      imageUrl?: string
      defaults?: {
        objective?: string
        daily_budget?: number
        countries?: string[]
        pixel_id?: string
        custom_event_type?: string
      }
    }
  | {
      type: 'meta_publish_confirm'
      id: string
      adId: string
      campaignId?: string
      adAccountId: string
      pageId: string
      pixelId?: string
      customEventType?: string
      campaignName: string
      objective: string
      dailyBudget: number
      targeting: Record<string, unknown>
      headline: string
      primaryText: string
      imageUrl?: string
    }
  | {
      type: 'meta_status'
      id: string
      metaAdId: string
      status: string
      campaignId?: string
    }
  | {
      type: 'clarification'
      id: string
      source?: 'ask_clarification' | 'flow'
      title: string
      introMessage?: string
      questions: Array<{
        id: string
        text: string
        type: 'single_choice' | 'multiple_choice'
        options: Array<{ id: string; label: string; description?: string }>
        required: boolean
      }>
      status?: 'pending' | 'submitted' | 'skipped'
      answers?: Record<string, string | string[]>
    }
  | {
      type: 'work_request'
      id: string
      title: string
      reviewUrl: string
      draftId?: string
      status?: 'pending' | 'submitted'
      summary?: string
    }
  | {
      type: 'widget_preview'
      id: string
      name: string
      widget_definition: Record<string, unknown>
      data_dependencies: unknown[]
    }
  | {
      type: 'project_preview'
      id: string
      project_id: string
      name: string
      entry_point?: string
      files?: string[]
    }
  | {
      type: 'delete_confirm'
      id: string
      status?: string
      delete_action: string
      entity_type: string
      entity_id: string
      entity_name: string
      error?: string
    }
  | {
      type: 'delete_status'
      id: string
      status: 'success' | 'cancelled' | 'failed'
      delete_action?: string
      entity_type: string
      entity_id?: string
      entity_name: string
      error?: string
    }
  | {
      type: 'email_send_confirm'
      id: string
      status?: string
      provider?: string
      available_providers?: Array<{ id: string; name: string; supports_sequences?: boolean }>
      schedule_date?: string
      available_lists?: Array<{ id: string; name: string }>
      available_segments?: Array<{ id: string; name: string }>
      send_type?: 'broadcast' | 'sequence'
      sequence_email_id?: string
      sequence_id?: string
      subject?: string
      sequence_name?: string
      emails?: Array<{
        id: string
        subject: string
        order_index: number
        delay_hours: number
        html_preview?: string
      }>
    }
  | {
      type: 'campaign_context_confirm'
      id: string
      status?: 'pending' | 'confirmed' | 'dismissed'
      channel_id: string
      suggested_campaign_id?: string | null
      options: Array<{ id: string; name: string; avatar_count?: number; offer_count?: number }>
      confirmed_campaign_id?: string | null
    }
  | {
      type: 'email_send_status'
      id: string
      provider: string
      provider_name?: string
      status: 'sent' | 'scheduled' | 'error'
      send_type?: 'broadcast' | 'sequence'
      subject?: string
      sequence_name?: string
      schedule_date?: string
      total_emails?: number
      total_days?: number
      error_message?: string
    }
  | {
      type: 'thinking_transcript'
      id: string
      content?: string
      state?: 'active' | 'complete'
    }
  | {
      type: 'chat_plan'
      id: string
      plan_id: string
      title: string
      summary?: string
      items: Array<{
        id: string
        title: string
        status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
        note?: string
      }>
      plan_status: 'active' | 'completed' | 'cancelled'
      version: number
    }
  | {
      type: 'agent_conversation'
      id: string
      delegationId: string
      callerAgent: string
      callerAgentName: string
      callerAgentImage?: string
      callerAgentRole?: string
      targetAgent: string
      targetAgentName: string
      targetAgentImage?: string
      targetAgentRole?: string
      delegationType: 'query' | 'delegation' | 'brainstorm'
      initialPrompt: string
      turns: A2ATurn[]
      status: 'active' | 'completed' | 'failed'
      participants?: Array<{ id: string; name: string; image?: string; role?: string }>
      deliverables?: { id: string; title: string; type: string }[]
      summary?: string
    }
  | {
      type: 'agent_hire_suggestion'
      id: string
      delegationId?: string
      campaignId: string
      suggestions: { role_key: string; default_name: string; role_title: string; reason?: string }[]
      originalAction: 'ask_agent' | 'delegate_to_agent'
      originalPrompt: string
      status: 'pending' | 'approved' | 'rejected'
    }
  | {
      type: 'artifact_preview'
      id: string
      artifactType:
        | 'campaign'
        | 'canvas'
        | 'offer'
        | 'funnel'
        | 'avatar'
        | 'sequence'
        | 'presentation'
        | 'ad'
        | 'ad-set'
        | 'ad-campaign'
        | 'social-post'
        | 'blog-post'
        | 'email'
        | 'visual-doc'
        | 'form'
        | 'task'
        | 'mission'
        | 'flow'
        | 'website'
        | 'theme'
        | 'custom-object'
      artifactId: string
      spaceId?: string
      campaignId?: string
      internalUrl?: string
      name: string
      subtitle?: string
      career?: string
      age?: string
      backgroundProfile?: string
      bodyPreview?: string
      emailSubject?: string
      funnelPageId?: string
      imageUrl?: string
      videoUrl?: string
      status?: string
    }
  | {
      type: 'document_card'
      id: string
      title: string
      documentId?: string
      spaceId?: string
      spaceItemId?: string
      snippet: string
    }
  | {
      type: 'agent_integration_confirm'
      id: string
      status?: 'pending' | 'approved' | 'cancelled'
    }
  | {
      type: 'agent_access_request'
      id: string
      status?: 'pending' | 'approved' | 'cancelled' | 'failed'
      agent_key: string
      agent_name: string | null
      missing_capability: {
        kind: 'action_domain'
        id: string
      }
      required_action: string
      reason: string
      approve_action: 'agent_policy_allow_extra'
      error?: string
    }
  | {
      type: 'browser_screenshot'
      id: string
      imageUrl: string
      pageUrl?: string
    }
