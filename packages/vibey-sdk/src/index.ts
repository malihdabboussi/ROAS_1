import {
  agentCall,
  artifactCall,
  chatFetch,
  chatStream,
  chatStreamAbort,
  integrationCall,
} from './client'
import type { AgentCallResult } from './client'
import type {
  InstagramProfile,
  MetaAdsInsights,
  StreamCallbacks,
  VibeyAgent,
  VibeyApiResponse,
  VibeyBrainStats,
  VibeyConversation,
  VibeyCustomObject,
  VibeyFunnel,
  VibeyIntegrationResult,
  VibeyMemory,
  VibeyMessage,
  VibeyMission,
  VibeyOffer,
  YouTubeAnalytics,
} from './types'

export type * from './types'

export type { AgentCallResult }

export const vibey = {
  agent: (agentKey: string) => ({
    ask: (message: string, context?: Record<string, unknown>): Promise<AgentCallResult> =>
      agentCall(agentKey, message, context),
  }),

  team: {
    list: () => artifactCall<VibeyApiResponse<{ agents?: VibeyAgent[] }>>('list_team'),
    get: (agentKey: string) =>
      artifactCall<VibeyApiResponse<{ agent?: VibeyAgent }>>('list_team', { agent_key: agentKey }),
    listCampaignTeam: () =>
      artifactCall<VibeyApiResponse<{ agents?: VibeyAgent[] }>>('list_campaign_team'),
  },

  missions: {
    list: () => artifactCall<VibeyApiResponse<{ missions?: VibeyMission[] }>>('list_missions'),
    get: (missionId: string) =>
      artifactCall<VibeyApiResponse<{ mission?: VibeyMission }>>('get_mission', {
        mission_id: missionId,
      }),
  },

  offers: {
    list: () => artifactCall<VibeyApiResponse<{ offers?: VibeyOffer[] }>>('list_offers'),
    get: (offerId: string) =>
      artifactCall<VibeyApiResponse<{ offer?: VibeyOffer }>>('get_offer', { offer_id: offerId }),
  },

  funnels: {
    list: () => artifactCall<VibeyApiResponse<{ funnels?: VibeyFunnel[] }>>('list_funnels'),
    get: (funnelId: string) =>
      artifactCall<VibeyApiResponse<{ funnel?: VibeyFunnel }>>('get_funnel', {
        funnel_id: funnelId,
      }),
  },

  brain: {
    search: (query: string, limit?: number) =>
      artifactCall<VibeyApiResponse<{ memories?: VibeyMemory[] }>>('search_memory', {
        query,
        limit,
      }),
    getStats: (data?: Record<string, unknown>) =>
      artifactCall<VibeyApiResponse<VibeyBrainStats>>('get_brain_stats', data ?? {}),
    listScopes: () => artifactCall<VibeyApiResponse<Record<string, unknown>>>('list_brain_scopes'),
    resolveAgentSkBrain: (agentId: string) =>
      artifactCall<VibeyApiResponse<Record<string, unknown>>>('resolve_agent_sk_brain', {
        agent_id: agentId,
      }),
    listDomains: () => artifactCall<VibeyApiResponse<{ domains?: string[] }>>('list_brain_domains'),
    listRecent: (limit?: number) =>
      artifactCall<VibeyApiResponse<{ memories?: VibeyMemory[] }>>('list_recent_memories', {
        limit,
      }),
  },

  objects: {
    list: (typeKey: string) =>
      artifactCall<VibeyApiResponse<{ objects?: VibeyCustomObject[] }>>('list_objects', {
        type_key: typeKey,
      }),
    get: (objectId: string) =>
      artifactCall<VibeyApiResponse<{ object?: VibeyCustomObject }>>('get_object', {
        object_id: objectId,
      }),
    create: (typeKey: string, data: Record<string, unknown>) =>
      artifactCall<VibeyApiResponse<{ object?: VibeyCustomObject }>>('create_object', {
        type_key: typeKey,
        ...data,
      }),
    update: (objectId: string, data: Record<string, unknown>) =>
      artifactCall<VibeyApiResponse<{ object?: VibeyCustomObject }>>('update_object', {
        object_id: objectId,
        ...data,
      }),
    delete: (objectId: string) =>
      artifactCall<VibeyApiResponse>('delete_object', { object_id: objectId }),
  },

  integrations: {
    youtube: {
      getAnalytics: (params: {
        startDate: string
        endDate: string
        metrics?: string[]
        dimensions?: string
      }) =>
        integrationCall<YouTubeAnalytics>('youtube', 'get_analytics_report', {
          startDate: params.startDate,
          endDate: params.endDate,
          metrics: params.metrics?.join(','),
          dimensions: params.dimensions,
        }),
    },

    instagram: {
      getProfile: () => integrationCall<InstagramProfile>('instagram', 'get_profile'),
      getMedia: (limit?: number) =>
        integrationCall<VibeyIntegrationResult>('instagram', 'get_media', { limit }),
    },

    meta: {
      checkConnection: () =>
        artifactCall<VibeyApiResponse<{ connected?: boolean }>>('check_meta_connection'),
      listAdAccounts: () => artifactCall<VibeyApiResponse>('list_meta_ad_accounts'),
      listPages: () => artifactCall<VibeyApiResponse>('list_meta_pages'),
      getAdsInsights: (params?: { ad_account_id?: string; date_preset?: string }) =>
        artifactCall<MetaAdsInsights>('get_meta_ads_insights', params ?? {}),
      getAdStatus: (adId: string) =>
        artifactCall<VibeyApiResponse>('get_meta_ad_status', { ad_id: adId }),
    },

    github: {
      listRepos: () => integrationCall<VibeyIntegrationResult>('github', 'list_repos'),
      readFile: (owner: string, repo: string, path: string) =>
        integrationCall<VibeyIntegrationResult>('github', 'read_file', { owner, repo, path }),
    },

    google: {
      analytics: {
        getReport: (params: Record<string, unknown>) =>
          integrationCall<VibeyIntegrationResult>('google_analytics', 'get_report', params),
      },
      calendar: {
        listEvents: (params?: Record<string, unknown>) =>
          integrationCall<VibeyIntegrationResult>(
            'google_calendar',
            'GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS',
            params ?? {},
          ),
      },
      drive: {
        listFiles: (params?: Record<string, unknown>) =>
          integrationCall<VibeyIntegrationResult>('google_drive', 'list_files', params ?? {}),
      },
    },

    linkedin: {
      getProfile: () => integrationCall<VibeyIntegrationResult>('linkedin', 'get_profile'),
      createPost: (content: string) =>
        integrationCall<VibeyIntegrationResult>('linkedin', 'create_post', { content }),
    },

    twitter: {
      getProfile: () => integrationCall<VibeyIntegrationResult>('twitter', 'get_profile'),
      createTweet: (text: string) =>
        integrationCall<VibeyIntegrationResult>('twitter', 'create_tweet', { text }),
    },

    slack: {
      sendMessage: (channel: string, text: string) =>
        integrationCall<VibeyIntegrationResult>('slack', 'send_message', { channel, text }),
      listChannels: () => integrationCall<VibeyIntegrationResult>('slack', 'list_channels'),
    },

    notion: {
      listPages: () => integrationCall<VibeyIntegrationResult>('notion', 'list_pages'),
      getPage: (pageId: string) =>
        integrationCall<VibeyIntegrationResult>('notion', 'get_page', { page_id: pageId }),
    },

    hubspot: {
      listContacts: (params?: Record<string, unknown>) =>
        integrationCall<VibeyIntegrationResult>('hubspot', 'list_contacts', params ?? {}),
      createContact: (data: Record<string, unknown>) =>
        integrationCall<VibeyIntegrationResult>('hubspot', 'create_contact', data),
    },

    raw: (service: string, action: string, params?: Record<string, unknown>) =>
      integrationCall<VibeyIntegrationResult>(service, action, params ?? {}),
  },

  social: {
    listPosts: () => artifactCall<VibeyApiResponse>('list_social_posts'),
    createPost: (data: Record<string, unknown>) =>
      artifactCall<VibeyApiResponse>('create_social_post', data),
  },

  blog: {
    listPosts: () => artifactCall<VibeyApiResponse>('list_blog_posts'),
    getPost: (postId: string) =>
      artifactCall<VibeyApiResponse>('get_blog_post', { post_id: postId }),
  },

  media: {
    listCampaignMedia: () => artifactCall<VibeyApiResponse>('list_campaign_media'),
  },

  conversations: {
    list: (agentId?: string): Promise<VibeyConversation[]> => {
      const params = new URLSearchParams()
      if (agentId) params.set('agent_id', agentId)
      const query = params.toString()
      return chatFetch<VibeyConversation[]>(`/api/conversations${query ? `?${query}` : ''}`)
    },
    create: (agentId: string): Promise<VibeyConversation> =>
      chatFetch<VibeyConversation>('/api/conversations', {
        method: 'POST',
        body: { agent_id: agentId },
      }),
    messages: (conversationId: string): Promise<VibeyMessage[]> =>
      chatFetch<VibeyMessage[]>(`/api/conversations/${conversationId}/messages`),
  },

  chat: {
    send: (conversationId: string, content: string, callbacks: StreamCallbacks): Promise<void> =>
      chatStream(conversationId, content, callbacks),
    stop: (conversationId: string): void => chatStreamAbort(conversationId),
  },
}
