/**
 * Supabase Database Types — Vibey V2
 *
 * Manually authored to match supabase/schema.sql.
 * Replace with `supabase gen types` output once project is live.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          industry: string | null
          website: string | null
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          api_key: string | null
          onboarding_completed: boolean
          onboarding_data: Record<string, unknown>
          preferences: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          industry?: string | null
          website?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          api_key?: string | null
          onboarding_completed?: boolean
          onboarding_data?: Record<string, unknown>
          preferences?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          industry?: string | null
          website?: string | null
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          api_key?: string | null
          onboarding_completed?: boolean
          onboarding_data?: Record<string, unknown>
          preferences?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      brains: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          snapshot_count: number
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name?: string
          description?: string | null
          snapshot_count?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          snapshot_count?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          id: string
          brain_id: string
          name: string
          type: string | null
          core: string
          one_liner: string | null
          story: string | null
          moment: string | null
          emotion: Record<string, unknown> | null
          source: string | null
          trigger_pattern: string | null
          method: string | null
          steps: string | null
          filter: string | null
          challenge: string | null
          break_test: string | null
          risks: string | null
          proof: string | null
          confidence: number | null
          significance_score: number | null
          tags: string[] | null
          source_type: string | null
          source_id: string | null
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brain_id: string
          name: string
          type?: string | null
          core: string
          one_liner?: string | null
          story?: string | null
          moment?: string | null
          emotion?: Record<string, unknown> | null
          source?: string | null
          trigger_pattern?: string | null
          method?: string | null
          steps?: string | null
          filter?: string | null
          challenge?: string | null
          break_test?: string | null
          risks?: string | null
          proof?: string | null
          confidence?: number | null
          significance_score?: number | null
          tags?: string[] | null
          source_type?: string | null
          source_id?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brain_id?: string
          name?: string
          type?: string | null
          core?: string
          one_liner?: string | null
          story?: string | null
          moment?: string | null
          emotion?: Record<string, unknown> | null
          source?: string | null
          trigger_pattern?: string | null
          method?: string | null
          steps?: string | null
          filter?: string | null
          challenge?: string | null
          break_test?: string | null
          risks?: string | null
          proof?: string | null
          confidence?: number | null
          significance_score?: number | null
          tags?: string[] | null
          source_type?: string | null
          source_id?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      brain_connections: {
        Row: {
          id: string
          profile_id: string
          provider: string
          credentials: Record<string, unknown>
          status: string
          last_sync_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          provider: string
          credentials?: Record<string, unknown>
          status?: string
          last_sync_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          provider?: string
          credentials?: Record<string, unknown>
          status?: string
          last_sync_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          campaign_type: string | null
          status: string
          goal: Record<string, unknown>
          config: Record<string, unknown>
          metrics: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          campaign_type?: string | null
          status?: string
          goal?: Record<string, unknown>
          config?: Record<string, unknown>
          metrics?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          campaign_type?: string | null
          status?: string
          goal?: Record<string, unknown>
          config?: Record<string, unknown>
          metrics?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_tasks: {
        Row: {
          id: string
          campaign_id: string
          title: string
          description: string | null
          status: string
          priority: string
          task_type: string | null
          resource_id: string | null
          agent_id: string | null
          order_index: number
          metadata: Record<string, unknown>
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          task_type?: string | null
          resource_id?: string | null
          agent_id?: string | null
          order_index?: number
          metadata?: Record<string, unknown>
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          task_type?: string | null
          resource_id?: string | null
          agent_id?: string | null
          order_index?: number
          metadata?: Record<string, unknown>
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_plans: {
        Row: {
          id: string
          campaign_id: string
          plan_data: Record<string, unknown>
          version: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          plan_data?: Record<string, unknown>
          version?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          plan_data?: Record<string, unknown>
          version?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          name: string | null
          processing_status: string
          step1_data: Record<string, unknown> | null
          step2_data: Record<string, unknown> | null
          step3_data: Record<string, unknown> | null
          step4_data: Record<string, unknown> | null
          step5_data: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          name?: string | null
          processing_status?: string
          step1_data?: Record<string, unknown> | null
          step2_data?: Record<string, unknown> | null
          step3_data?: Record<string, unknown> | null
          step4_data?: Record<string, unknown> | null
          step5_data?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          name?: string | null
          processing_status?: string
          step1_data?: Record<string, unknown> | null
          step2_data?: Record<string, unknown> | null
          step3_data?: Record<string, unknown> | null
          step4_data?: Record<string, unknown> | null
          step5_data?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      avatars: {
        Row: {
          id: string
          user_id: string
          offer_id: string | null
          name: string | null
          persona_data: Record<string, unknown>
          avatar_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          offer_id?: string | null
          name?: string | null
          persona_data?: Record<string, unknown>
          avatar_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          offer_id?: string | null
          name?: string | null
          persona_data?: Record<string, unknown>
          avatar_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      domains: {
        Row: {
          id: string
          user_id: string
          domain: string
          status: string
          verification_token: string | null
          ssl_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          domain: string
          status?: string
          verification_token?: string | null
          ssl_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          domain?: string
          status?: string
          verification_token?: string | null
          ssl_status?: string | null
          created_at?: string
        }
        Relationships: []
      }
      funnels: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          offer_id: string | null
          name: string | null
          funnel_type: string | null
          template_id: string | null
          status: string
          domain_id: string | null
          slug: string | null
          published_url: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          offer_id?: string | null
          name?: string | null
          funnel_type?: string | null
          template_id?: string | null
          status?: string
          domain_id?: string | null
          slug?: string | null
          published_url?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          offer_id?: string | null
          name?: string | null
          funnel_type?: string | null
          template_id?: string | null
          status?: string
          domain_id?: string | null
          slug?: string | null
          published_url?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_pages: {
        Row: {
          id: string
          funnel_id: string
          name: string | null
          page_type: string | null
          slug: string | null
          generated_html: string
          generated_css: string
          generation_mode: string
          content: Record<string, unknown>
          seo: Record<string, unknown>
          org_id: string | null
          source_mode: string
          sections: Record<string, unknown>[]
          theme_config: Record<string, unknown>
          order_index: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          funnel_id: string
          name?: string | null
          page_type?: string | null
          slug?: string | null
          generated_html?: string
          generated_css?: string
          generation_mode?: string
          content?: Record<string, unknown>
          seo?: Record<string, unknown>
          org_id?: string | null
          source_mode?: string
          sections?: Record<string, unknown>[]
          theme_config?: Record<string, unknown>
          order_index?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          funnel_id?: string
          name?: string | null
          page_type?: string | null
          slug?: string | null
          generated_html?: string
          generated_css?: string
          generation_mode?: string
          content?: Record<string, unknown>
          seo?: Record<string, unknown>
          org_id?: string | null
          source_mode?: string
          sections?: Record<string, unknown>[]
          theme_config?: Record<string, unknown>
          order_index?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      presentations: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          offer_id: string | null
          name: string | null
          slides: Record<string, unknown>[]
          theme_id: string | null
          file_url: string | null
          status: string
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
          generated_html: string | null
          slug: string | null
          published_url: string | null
          domain_id: string | null
          hide_branding: boolean
          org_id: string | null
          space_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          offer_id?: string | null
          name?: string | null
          slides?: Record<string, unknown>[]
          theme_id?: string | null
          file_url?: string | null
          status?: string
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
          generated_html?: string | null
          slug?: string | null
          published_url?: string | null
          domain_id?: string | null
          hide_branding?: boolean
          org_id?: string | null
          space_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          offer_id?: string | null
          name?: string | null
          slides?: Record<string, unknown>[]
          theme_id?: string | null
          file_url?: string | null
          status?: string
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
          generated_html?: string | null
          slug?: string | null
          published_url?: string | null
          domain_id?: string | null
          hide_branding?: boolean
          org_id?: string | null
          space_id?: string | null
        }
        Relationships: []
      }
      presentation_files: {
        Row: {
          id: string
          presentation_id: string
          user_id: string
          org_id: string | null
          path: string
          content: string
          mime_type: string
          role: string
          size_bytes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          presentation_id: string
          user_id: string
          org_id?: string | null
          path: string
          content: string
          mime_type?: string
          role?: string
          size_bytes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          presentation_id?: string
          user_id?: string
          org_id?: string | null
          path?: string
          content?: string
          mime_type?: string
          role?: string
          size_bytes?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      presentation_assets: {
        Row: {
          id: string
          presentation_id: string
          media_asset_id: string
          user_id: string
          org_id: string | null
          path: string
          mime_type: string
          size_bytes: number
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          presentation_id: string
          media_asset_id: string
          user_id: string
          org_id?: string | null
          path: string
          mime_type: string
          size_bytes?: number
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          presentation_id?: string
          media_asset_id?: string
          user_id?: string
          org_id?: string | null
          path?: string
          mime_type?: string
          size_bytes?: number
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sequences: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          name: string | null
          status: string
          trigger: Record<string, unknown>
          config: Record<string, unknown>
          metrics: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          name?: string | null
          status?: string
          trigger?: Record<string, unknown>
          config?: Record<string, unknown>
          metrics?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          name?: string | null
          status?: string
          trigger?: Record<string, unknown>
          config?: Record<string, unknown>
          metrics?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sequence_emails: {
        Row: {
          id: string
          sequence_id: string
          subject: string | null
          body: string | null
          delay_hours: number
          order_index: number
          status: string
          metrics: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sequence_id: string
          subject?: string | null
          body?: string | null
          delay_hours?: number
          order_index?: number
          status?: string
          metrics?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sequence_id?: string
          subject?: string | null
          body?: string | null
          delay_hours?: number
          order_index?: number
          status?: string
          metrics?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          title: string | null
          agent_id: string | null
          status: string
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          title?: string | null
          agent_id?: string | null
          status?: string
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          title?: string | null
          agent_id?: string | null
          status?: string
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string | null
          content_blocks: Record<string, unknown> | null
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content?: string | null
          content_blocks?: Record<string, unknown> | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string | null
          content_blocks?: Record<string, unknown> | null
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Relationships: []
      }
      conversation_documents: {
        Row: {
          id: string
          conversation_id: string
          campaign_id: string | null
          document_type: string | null
          title: string | null
          content: Record<string, unknown>
          status: string | null
          resource_id: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          campaign_id?: string | null
          document_type?: string | null
          title?: string | null
          content?: Record<string, unknown>
          status?: string | null
          resource_id?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          campaign_id?: string | null
          document_type?: string | null
          title?: string | null
          content?: Record<string, unknown>
          status?: string | null
          resource_id?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_configs: {
        Row: {
          id: string
          user_id: string
          name: string
          persona: string | null
          model_config: Record<string, unknown>
          confirmation_mode: string
          custom_approvals: Record<string, unknown>
          skills: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          persona?: string | null
          model_config?: Record<string, unknown>
          confirmation_mode?: string
          custom_approvals?: Record<string, unknown>
          skills?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          persona?: string | null
          model_config?: Record<string, unknown>
          confirmation_mode?: string
          custom_approvals?: Record<string, unknown>
          skills?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_tasks: {
        Row: {
          id: string
          conversation_id: string | null
          campaign_id: string | null
          task_type: string | null
          agent_type: string | null
          status: string
          input: Record<string, unknown>
          output: Record<string, unknown>
          cost: Record<string, unknown>
          started_at: string | null
          completed_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id?: string | null
          campaign_id?: string | null
          task_type?: string | null
          agent_type?: string | null
          status?: string
          input?: Record<string, unknown>
          output?: Record<string, unknown>
          cost?: Record<string, unknown>
          started_at?: string | null
          completed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string | null
          campaign_id?: string | null
          task_type?: string | null
          agent_type?: string | null
          status?: string
          input?: Record<string, unknown>
          output?: Record<string, unknown>
          cost?: Record<string, unknown>
          started_at?: string | null
          completed_at?: string | null
          error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          tags: string[]
          source: string | null
          source_id: string | null
          custom_fields: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          tags?: string[]
          source?: string | null
          source_id?: string | null
          custom_fields?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          tags?: string[]
          source?: string | null
          source_id?: string | null
          custom_fields?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audiences: {
        Row: {
          id: string
          user_id: string
          name: string | null
          filter_rules: Record<string, unknown>
          contact_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          filter_rules?: Record<string, unknown>
          contact_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string | null
          filter_rules?: Record<string, unknown>
          contact_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions: string[]
          last_used_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          permissions?: string[]
          last_used_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          method: string
          status_code: number
          tokens_used: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          method: string
          status_code: number
          tokens_used?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          method?: string
          status_code?: number
          tokens_used?: number
          created_at?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          id: string
          name: string
          category: string | null
          template_data: Record<string, unknown>
          fields_schema: Record<string, unknown>
          output_schema: Record<string, unknown>
          preview_url: string | null
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          template_data?: Record<string, unknown>
          fields_schema?: Record<string, unknown>
          output_schema?: Record<string, unknown>
          preview_url?: string | null
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          template_data?: Record<string, unknown>
          fields_schema?: Record<string, unknown>
          output_schema?: Record<string, unknown>
          preview_url?: string | null
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          id: string
          name: string
          config: Record<string, unknown>
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          config?: Record<string, unknown>
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          config?: Record<string, unknown>
          is_system?: boolean
          created_at?: string
        }
        Relationships: []
      }
      lists: {
        Row: {
          id: string
          org_id: string
          user_id: string
          title: string
          description: string | null
          campaign_id: string | null
          is_template: boolean
          visibility: 'private' | 'team'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          user_id: string
          title: string
          description?: string | null
          campaign_id?: string | null
          is_template?: boolean
          visibility?: 'private' | 'team'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          user_id?: string
          title?: string
          description?: string | null
          campaign_id?: string | null
          is_template?: boolean
          visibility?: 'private' | 'team'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      list_items: {
        Row: {
          id: string
          list_id: string
          org_id: string
          user_id: string
          title: string
          status: 'todo' | 'in_progress' | 'in_review' | 'done'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          assignee_type: 'human' | 'agent' | 'unassigned'
          assignee_id: string | null
          due_date: string | null
          notes: string | null
          source: 'manual' | 'agent_suggested' | 'template' | 'fathom'
          linked_mission_id: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          list_id: string
          org_id: string
          user_id: string
          title: string
          status?: 'todo' | 'in_progress' | 'in_review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assignee_type?: 'human' | 'agent' | 'unassigned'
          assignee_id?: string | null
          due_date?: string | null
          notes?: string | null
          source?: 'manual' | 'agent_suggested' | 'template' | 'fathom'
          linked_mission_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          org_id?: string
          user_id?: string
          title?: string
          status?: 'todo' | 'in_progress' | 'in_review' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          assignee_type?: 'human' | 'agent' | 'unassigned'
          assignee_id?: string | null
          due_date?: string | null
          notes?: string | null
          source?: 'manual' | 'agent_suggested' | 'template' | 'fathom'
          linked_mission_id?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
