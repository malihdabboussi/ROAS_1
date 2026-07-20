import { describe, expect, it } from 'vitest'
import { VALID_ACTIONS } from '../dtos/artifact-action.dto'
import {
  ACTIVE_PROMPTMODE_ACTIONS,
  getPromptModeActionLifecycle,
  isPromptModeActionOnHold,
} from './artifact-action-lifecycle'
import {
  ACTION_PREFLIGHT_COVERAGE,
  ACTION_PREFLIGHTS,
  validateActionPreflight,
} from './artifact-action-preflight'
import {
  ACTION_SCHEMAS,
  describeActionContract,
  getResolvableFieldsForAction,
  validateActionData,
} from './artifact-action-schemas'

describe('PromptMode action schema and preflight coverage', () => {
  const dreamOpsActions = [
    'dream_inspect_agent',
    'dream_search_evidence',
    'dream_propose_skill_create',
    'dream_propose_skill_update',
    'dream_propose_skill_resource_update',
    'dream_propose_agent_file_update',
    'dream_route_out',
    'dream_finish',
  ] as const

  it('has a hard schema for every backend PromptMode action', () => {
    const missing = VALID_ACTIONS.filter((action) => !ACTION_SCHEMAS[action])
    const extra = Object.keys(ACTION_SCHEMAS).filter(
      (action) => !VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number]),
    )

    expect(missing).toEqual([])
    expect(extra).toEqual([])
  })

  it('has a preflight coverage classification for every backend PromptMode action', () => {
    const missing = VALID_ACTIONS.filter((action) => !ACTION_PREFLIGHT_COVERAGE[action])
    const extra = Object.keys(ACTION_PREFLIGHT_COVERAGE).filter(
      (action) => !VALID_ACTIONS.includes(action as (typeof VALID_ACTIONS)[number]),
    )

    expect(missing).toEqual([])
    expect(extra).toEqual([])
  })

  it('wires every non-schema-only preflight classification to a validator', () => {
    const missingValidators = VALID_ACTIONS.filter((action) => {
      const coverage = ACTION_PREFLIGHT_COVERAGE[action]
      return coverage?.mode !== 'schema_only' && typeof ACTION_PREFLIGHTS[action] !== 'function'
    })

    expect(missingValidators).toEqual([])
  })

  it('describes schema and preflight guidance for every action', () => {
    const missingContracts = VALID_ACTIONS.filter((action) => !describeActionContract(action))
    expect(missingContracts).toEqual([])

    for (const action of VALID_ACTIONS) {
      expect(describeActionContract(action)).toEqual(
        expect.objectContaining({
          action,
          required: expect.any(Array),
          optional: expect.any(Array),
          preflight: expect.objectContaining({
            mode: expect.any(String),
            reason: expect.any(String),
          }),
        }),
      )
    }
  })

  it('classifies active and on-hold PromptMode actions without removing backend compatibility', () => {
    const onHoldActions = VALID_ACTIONS.filter((action) => isPromptModeActionOnHold(action))
    const activeActions = VALID_ACTIONS.filter((action) => !isPromptModeActionOnHold(action))

    expect(onHoldActions).toHaveLength(24)
    expect(ACTIVE_PROMPTMODE_ACTIONS).toEqual(activeActions)

    for (const action of onHoldActions) {
      expect(getPromptModeActionLifecycle(action)).toMatchObject({
        status: 'on_hold',
        agent_available: false,
      })
    }

    for (const action of activeActions) {
      expect(ACTION_SCHEMAS[action]).toBeDefined()
      expect(ACTION_PREFLIGHT_COVERAGE[action]).toBeDefined()
      expect(getPromptModeActionLifecycle(action)).toMatchObject({
        status: 'active',
        agent_available: true,
      })
    }

    expect(describeActionContract('create_project')).toMatchObject({
      lifecycle: {
        status: 'on_hold',
        agent_available: false,
        reason: expect.stringContaining('not available to agents'),
      },
    })
    expect(describeActionContract('supabase_run_sql')).toMatchObject({
      lifecycle: {
        status: 'on_hold',
        agent_available: false,
      },
    })
  })

  it('rejects process_media operation-specific payloads before runtime work', async () => {
    await expect(
      validateActionPreflight('process_media', { operation: 'trim', url: 'x' }),
    ).resolves.toMatchObject({
      error: expect.stringMatching(/duration_seconds/i),
    })
    await expect(
      validateActionPreflight('process_media', {
        operation: 'trim',
        url: 'https://example.com/video.mp4',
        duration_seconds: 2,
      }),
    ).resolves.toBeNull()
  })

  it('rejects analyze_video source and settings mistakes before runtime work', async () => {
    await expect(validateActionPreflight('analyze_video', {})).resolves.toMatchObject({
      error: expect.stringMatching(/media_url/i),
    })
    await expect(
      validateActionPreflight('analyze_video', {
        media_url: 'https://example.com/video.mp4',
        extract_frames: false,
        transcribe: false,
      }),
    ).resolves.toMatchObject({
      error: expect.stringMatching(/extract_frames|transcribe/i),
    })
  })

  it('rejects transcribe_audio source mistakes before runtime work', async () => {
    await expect(validateActionPreflight('transcribe_audio', {})).resolves.toMatchObject({
      error: expect.stringMatching(/media_url/i),
    })
    await expect(
      validateActionPreflight('transcribe_audio', {
        media_url: 'https://example.com/voice.ogg',
      }),
    ).resolves.toBeNull()

    expect(describeActionContract('transcribe_audio')).toMatchObject({
      action: 'transcribe_audio',
      required: expect.arrayContaining([expect.arrayContaining(['media_url', 'file_url'])]),
      optional: expect.arrayContaining(['language']),
      lifecycle: {
        status: 'active',
        agent_available: true,
      },
      preflight: expect.objectContaining({
        mode: 'static_preflight',
      }),
    })
  })

  it('keeps Dream Ops proposal actions behind the HR dream session preflight', async () => {
    for (const action of dreamOpsActions) {
      expect(ACTION_SCHEMAS[action]).toBeDefined()
      expect(describeActionContract(action)).toMatchObject({
        action,
        lifecycle: {
          status: 'active',
          agent_available: true,
        },
        preflight: expect.objectContaining({
          mode: 'static_preflight',
          reason: expect.stringContaining('Dream Ops'),
        }),
      })

      await expect(
        validateActionPreflight(action, {}, { sessionKey: 'agent:hr:normal' }),
      ).resolves.toMatchObject({
        errorCode: 'DREAM_OPS_SESSION_REQUIRED',
      })
      await expect(
        validateActionPreflight(
          action,
          {},
          {
            sessionKey: 'agent:org-org-1-hr:dream_ops:designer:user-1:run-1::org:org-1',
          },
        ),
      ).resolves.toMatchObject({
        errorCode: 'DREAM_OPS_SESSION_REQUIRED',
      })
      await expect(
        validateActionPreflight(
          action,
          {},
          {
            sessionKey: 'agent:org-org-1-hr:dream_ops:hr:user-1:run-1::org:org-1',
          },
        ),
      ).resolves.toBeNull()
    }
  })

  it('accepts explicit transcribe_audio language hints', () => {
    expect(
      validateActionData('transcribe_audio', {
        media_url: 'https://example.com/voice.ogg',
        language: 'he',
      }),
    ).toBeNull()
    expect(
      validateActionData('transcribe_audio', {
        media_url: 'https://example.com/voice.ogg',
        language_code: 'he',
      }),
    ).toBeNull()
  })

  it('rejects use_integration malformed capability params before provider execution', async () => {
    await expect(
      validateActionPreflight('use_integration', {
        service: 'gmail',
        integration_action: 'send_email',
        params: 'subject=Hello',
      }),
    ).resolves.toMatchObject({
      error: expect.stringMatching(/params/i),
    })
  })

  it('rejects use_mcp_tool malformed arguments before MCP execution', async () => {
    await expect(
      validateActionPreflight('use_mcp_tool', {
        server_name: 'docs',
        tool_name: 'search',
        arguments: 'query=docs',
      }),
    ).resolves.toMatchObject({
      error: expect.stringMatching(/arguments/i),
    })
  })

  it('rejects full presentation bundles that cannot render before persistence', async () => {
    await expect(
      validateActionPreflight('create_presentation', {
        name: 'Legacy TSX deck',
        generated_html: 'export default () => <main style="color:red" />',
      }),
    ).resolves.toMatchObject({
      error: expect.stringMatching(/files.*required/i),
      errorCode: 'ARTIFACT_PRESENTATION_BUNDLE_INVALID',
    })

    await expect(
      validateActionPreflight('create_presentation', {
        files: [{ path: 'styles.css', content: '.slide { width: 1280px; }' }],
      }),
    ).resolves.toMatchObject({
      error: expect.stringMatching(/index\.html/i),
      errorCode: 'ARTIFACT_PRESENTATION_BUNDLE_INVALID',
    })

    await expect(
      validateActionPreflight('update_presentation', {
        presentation_id: 'presentation-1',
        files: [
          { path: 'index.html', content: '<!doctype html><body>Deck</body>' },
          { path: 'styles.css', content: '.slide { width: 1280px;' },
        ],
      }),
    ).resolves.toMatchObject({
      error: expect.stringMatching(/styles\.css/i),
      errorCode: 'ARTIFACT_PRESENTATION_BUNDLE_INVALID',
    })
  })

  it('rejects malformed presentation file writes before persistence', async () => {
    await expect(
      validateActionPreflight('write_presentation_file', {
        presentation_id: 'presentation-1',
        path: 'styles.css',
        content: '.slide { width: 1280px;',
      }),
    ).resolves.toMatchObject({
      error: expect.stringMatching(/styles\.css/i),
      errorCode: 'ARTIFACT_PRESENTATION_BUNDLE_INVALID',
    })
  })
})

const canonicalBrainSchemaActions = [
  'save_user_memory',
  'atlas_save_brain_context',
  'search_user_brain',
  'search_brain_context',
  'crystallize_user_brain',
  'ingest_user_brain_text',
  'ingest_user_brain_link',
  'ingest_user_brain_document',
  'assign_user_memory_source',
  'list_user_brain_memories',
  'list_available_brain_scopes',
  'resolve_agent_brain',
  'search_agent_brain',
  'search_campaign_brain',
  'ingest_agent_brain_text',
  'ingest_agent_brain_link',
  'list_agent_brain_domains',
  'get_agent_brain_gaps',
  'list_agent_brain_imports',
  'save_customer_memory',
  'search_customer_brain',
  'ingest_customer_brain_text',
  'ingest_customer_brain_link',
  'list_customer_brain_memories',
  'list_customer_avatars',
  'get_brain_pages',
  'get_brain_timelines',
  'get_brain_timeline_items',
  'create_brain_timeline',
  'upsert_brain_timeline_items',
  'archive_brain_timeline',
  'create_brain_page',
  'patch_brain_page',
  'update_brain_page',
  'archive_brain_page',
  'link_brain_pages',
  'unlink_brain_pages',
  'get_brain_log',
  'log_brain_event',
  'get_brain_belief_patterns',
  'create_brain_belief_pattern',
  'update_brain_belief_pattern',
  'archive_brain_belief_pattern',
  'merge_brain_belief_patterns',
  'connect_brain_belief_to_memory',
  'disconnect_brain_belief_from_memory',
  'get_brain_perspectives',
  'create_brain_perspective',
  'update_brain_perspective',
  'archive_brain_perspective',
  'connect_brain_belief_to_perspective',
  'disconnect_brain_belief_from_perspective',
  'get_brain_lint',
  'run_brain_lint',
  'resolve_brain_lint',
  'delete_brain_node',
  'transfer_brain_node',
  'transfer_brain_by_source',
  'get_company_brain_objects',
  'get_company_brain_object_edges',
  'search_company_brain',
  'propose_company_brain_signal',
  'create_company_brain_object',
  'update_company_brain_object',
  'archive_company_brain_object',
  'create_company_brain_edge',
  'delete_company_brain_edge',
] as const

const removedBrainSchemaActions = [
  'save_memory',
  'search_memory',
  'search_sk_entries',
  'resolve_agent_sk_brain',
  'ingest_sk_text',
  'ingest_sk_link',
  'ingest_campaign_file',
  'ingest_campaign_url',
  'search_campaign_knowledge',
  'get_narrative_pages',
  'create_narrative_page',
  'patch_narrative_page',
  'update_narrative_page',
  'archive_narrative_page',
  'link_narrative_pages',
  'unlink_narrative_pages',
  'get_belief_patterns',
  'create_belief_pattern',
  'update_belief_pattern',
  'archive_belief_pattern',
  'merge_belief_patterns',
  'connect_belief_to_memory',
  'disconnect_belief_from_memory',
  'get_perspectives',
  'create_perspective',
  'update_perspective',
  'archive_perspective',
  'connect_belief_to_perspective',
  'disconnect_belief_from_perspective',
] as const

describe('validateActionData', () => {
  it('returns null for actions with no schema', () => {
    expect(validateActionData('not_a_real_action', {})).toBeNull()
  })

  it('validates task-list publishing and Mission dependency edits', () => {
    expect(
      validateActionData('create_mission_subtask', {
        mission_id: 'mission-1',
        title: 'Build event page',
        publishToTaskList: true,
        dependsOn: ['step-1'],
      }),
    ).toBeNull()
    expect(
      validateActionData('create_mission_subtask', {
        mission_id: 'mission-1',
        title: 'Build event page',
        publishToTaskList: 'yes',
      }),
    ).toMatch(/publishToTaskList.*boolean/i)
    expect(
      validateActionData('edit_mission_subtask', {
        mission_id: 'mission-1',
        subtask_id: 'step-2',
        dependsOn: 'step-1',
      }),
    ).toMatch(/dependsOn.*array/i)
  })

  describe('Space research action schemas', () => {
    it('validates social research search payloads', () => {
      expect(
        validateActionData('run_social_research_search', {
          space_id: 'space-1',
          platform: 'instagram',
          query: 'pilates studio hooks',
          save_top_n: 3,
        }),
      ).toBeNull()
      expect(
        validateActionData('run_social_research_search', {
          space_id: 'space-1',
          platform: 'twitter',
          query: 'pilates',
        }),
      ).toMatch(/platform must be one of: instagram, tiktok, youtube/i)
      expect(
        validateActionData('run_social_research_search', {
          space_id: 'space-1',
          platform: 'instagram',
        }),
      ).toMatch(/query.*required/i)
    })

    it('validates ads research search payloads', () => {
      expect(
        validateActionData('run_ads_research_search', {
          space_id: 'space-1',
          platform: 'meta',
          kind: 'topic',
          query: 'fitness coaching',
          filters: { country: 'US' },
        }),
      ).toBeNull()
      expect(
        validateActionData('run_ads_research_search', {
          space_id: 'space-1',
          platform: 'linkedin',
          kind: 'topic',
          query: 'fitness',
        }),
      ).toMatch(/platform must be one of: meta, tiktok, google/i)
      expect(
        validateActionData('run_ads_research_search', {
          space_id: 'space-1',
          platform: 'meta',
          kind: 'campaign',
          query: 'fitness',
        }),
      ).toMatch(/kind must be one of: topic, brand/i)
    })

    it('validates ads advertiser lookup payloads', () => {
      expect(
        validateActionData('search_ads_research_advertisers', {
          space_id: 'space-1',
          platform: 'google',
          query: 'Nike',
        }),
      ).toBeNull()
      expect(
        validateActionData('search_ads_research_advertisers', {
          space_id: 'space-1',
          platform: 'google',
        }),
      ).toMatch(/query.*required/i)
    })
  })

  describe('calendar action schemas', () => {
    it('validates calendar event payloads', () => {
      expect(
        validateActionData('create_calendar_event', {
          provider: 'google_calendar',
          title: 'Review launch tasks',
          start: '2026-06-18T10:00:00.000Z',
          end: '2026-06-18T10:30:00.000Z',
        }),
      ).toBeNull()
      expect(
        validateActionData('create_calendar_event', {
          title: 'Review launch tasks',
          start: '2026-06-18T10:00:00.000Z',
          end: '2026-06-18T10:30:00.000Z',
        }),
      ).toMatch(/provider.*required/i)
      expect(
        validateActionData('update_calendar_event', {
          provider: 'outlook',
          end: '2026-06-18T11:00:00.000Z',
        }),
      ).toMatch(/event_id.*required/i)
    })
  })

  describe('flow action schemas', () => {
    const flowActions = [
      'search_flow_capabilities',
      'get_flow_capability',
      'list_flows',
      'get_flow',
      'create_flow_draft',
      'update_flow_draft',
      'validate_flow_draft',
      'publish_flow',
      'get_flow_build_context',
      'create_flow_plan',
      'update_flow_plan',
      'answer_flow_clarification',
      'validate_flow_plan',
      'compile_flow_plan',
      'list_flow_blueprints',
      'get_flow_blueprint',
      'create_flow_blueprint_draft',
      'validate_flow_blueprint',
      'activate_flow_blueprint',
      'evaluate_flow_plan',
    ] as const

    it('has schema entries for every Loop flow action', () => {
      for (const action of flowActions) {
        expect(ACTION_SCHEMAS[action]).toBeDefined()
      }
    })

    it('validates draft create/update/publish contracts', () => {
      expect(validateActionData('create_flow_draft', { space_id: 'space-1' })).toMatch(
        /name.*required/i,
      )
      expect(
        validateActionData('create_flow_draft', {
          space_id: 'space-1',
          name: 'Follow-up flow',
          description: 'unsupported',
          trigger: { type: 'task_created' },
          actions: [{ type: 'add_comment', message_template: 'Automation note' }],
        }),
      ).toMatch(/unknown.*description/i)
      expect(
        validateActionData('create_flow_draft', {
          space_id: 'space-1',
          name: 'Follow-up flow',
          trigger: { type: 'task_created' },
          actions: [{ type: 'add_comment', message_template: 'Automation note' }],
        }),
      ).toBeNull()
      expect(validateActionData('publish_flow', { space_id: 'space-1' })).toMatch(
        /automation_id.*required/i,
      )
      expect(
        validateActionData('publish_flow', {
          space_id: 'space-1',
          automation_id: 'automation-1',
        }),
      ).toBeNull()
    })

    it('allows server-owned flow build session defaults for continuation actions', () => {
      expect(validateActionData('validate_flow_plan', {})).toBeNull()
      expect(validateActionData('compile_flow_plan', {})).toBeNull()
      expect(validateActionData('evaluate_flow_plan', {})).toBeNull()
      expect(validateActionData('answer_flow_clarification', {})).toMatch(/answers.*required/i)
      expect(
        validateActionData('answer_flow_clarification', {
          answers: { question_1: 'Done' },
        }),
      ).toBeNull()
      expect(
        validateActionData('create_flow_clarification', {
          questions: [
            {
              id: 'question_1',
              text: 'Which status should start the Flow?',
              type: 'single_choice',
              options: [{ id: 'done', label: 'Done' }],
              required: true,
            },
          ],
        }),
      ).toBeNull()
      expect(
        validateActionData('update_flow_plan', {
          plan: {
            name: 'Follow up',
            intent: 'Build flow',
            status: 'planned',
            trigger: null,
            actions: [],
            trace_events: [],
            validation_errors: [],
          },
        }),
      ).toBeNull()
    })
  })

  describe('required keys (legacy schemas still work)', () => {
    it('rejects missing required key', () => {
      expect(validateActionData('get_funnel', {})).toMatch(/funnel_id.*required/i)
    })

    it('accepts when required key is present', () => {
      expect(validateActionData('get_funnel', { funnel_id: 'f1' })).toBeNull()
    })

    it('accepts image analysis with either URLs or asset ids', () => {
      expect(validateActionData('analyze_image', {})).toMatch(/image_url.*required/i)
      expect(
        validateActionData('analyze_image', {
          image_urls: ['https://example.com/one.jpg', 'https://example.com/two.jpg'],
          prompt: 'Rank these for a carousel',
        }),
      ).toBeNull()
      expect(validateActionData('analyze_image', { asset_id: 'asset-1' })).toBeNull()
      expect(
        validateActionData('analyze_image', {
          asset_ref: {
            kind: 'vibey_asset',
            asset_id: 'asset-1',
            bucket_name: 'media',
            file_path: 'users/user-1/images/photo.png',
            url: 'https://cdn.example.com/photo.png',
          },
        }),
      ).toBeNull()
      expect(
        validateActionData('analyze_image', {
          asset_refs: [
            {
              kind: 'external_asset',
              provider: 'google_drive',
              external_id: 'drive-image-1',
              url: 'https://drive.example.com/photo.png',
            },
          ],
        }),
      ).toBeNull()
      expect(validateActionData('analyze_image', { image_urls: [''] })).toMatch(
        /image_urls.*array/i,
      )
    })

    it('rejects empty string as missing', () => {
      expect(validateActionData('get_funnel', { funnel_id: '   ' })).toMatch(/funnel_id.*required/i)
    })

    it('ingest_agent_brain_text requires an agent target and source metadata', () => {
      expect(validateActionData('ingest_agent_brain_text', { text: 't', title: 'T' })).toMatch(
        /brain_id.*required/i,
      )
      expect(
        validateActionData('ingest_agent_brain_text', {
          brain_id: 'b',
          text: 't',
          title: 'T',
          sourceType: 'document',
        }),
      ).toBeNull()
      expect(
        validateActionData('ingest_agent_brain_text', {
          brain_id: 'b',
          text: 't',
          title: 'T',
          source_type: 'document',
        }),
      ).toBeNull()
      expect(
        validateActionData('ingest_agent_brain_text', {
          brain_id: 'b',
          text: 't',
          sourceType: 'document',
        }),
      ).toMatch(/title.*required/i)
    })

    it('update_agent_skill accepts payload without agent_key (handler auto-resolves from session)', () => {
      expect(validateActionData('update_agent_skill', { skill_id: 'skill-1' })).toBeNull()
      expect(validateActionData('update_agent_skill', {})).toMatch(/skill_id.*required/i)
    })

    it('create_agent requires identity basics but not skills', () => {
      expect(validateActionData('create_agent', {})).toMatch(/agent_key.*required/i)
      expect(
        validateActionData('create_agent', {
          agent_key: 'business_growth_consultant',
          name: 'Hormozi',
          role: 'Business Growth Consultant',
          level: 'employee',
          specialty: 'Offer design and revenue diagnosis',
          soul: '# SOUL.md - Business Growth Consultant',
          role_content: '# ROLE.md - Business Growth Consultant',
          identity: '# IDENTITY.md - Business Growth Consultant',
        }),
      ).toBeNull()
    })

    it('create_agent allows skill fields only as optional contract fields', () => {
      expect(
        validateActionData('create_agent', {
          agent_key: 'support_agent',
          name: 'Zara',
          role: 'Customer Support Agent',
          skills: ['support-protocol'],
          skill_seed_key: 'customer_support',
          clone_skills_from: 'alex_te_support',
          clone_skill_keys: ['support-protocol'],
        }),
      ).toBeNull()
      expect(describeActionContract('create_agent')).toMatchObject({
        required: ['agent_key', 'name', 'role'],
        optional: expect.arrayContaining([
          'skills',
          'skill_seed_key',
          'clone_skills_from',
          'clone_skill_keys',
        ]),
        use_when: expect.arrayContaining([expect.stringContaining('list_team')]),
        do_not_use_when: expect.arrayContaining([expect.stringContaining('already exists')]),
      })
    })
  })

  describe('canonical Brain schemas', () => {
    it('has schema entries for every canonical Brain action and no removed Brain aliases', () => {
      for (const action of canonicalBrainSchemaActions) {
        expect(ACTION_SCHEMAS[action]).toBeDefined()
      }

      for (const action of removedBrainSchemaActions) {
        expect(ACTION_SCHEMAS[action]).toBeUndefined()
      }
    })

    it('validates user brain actions under canonical names', () => {
      expect(validateActionData('save_user_memory', { content: 'short' })).toMatch(
        /memory_type.*required/i,
      )
      expect(
        validateActionData('save_user_memory', {
          content: 'A durable user insight.',
          memory_type: 'insight',
        }),
      ).toBeNull()
      expect(validateActionData('search_user_brain', {})).toMatch(/query.*required/i)
      expect(validateActionData('search_user_brain', { query: 'launch patterns' })).toBeNull()
      expect(validateActionData('search_brain_context', {})).toMatch(/query.*required/i)
      expect(
        validateActionData('search_brain_context', {
          query: 'pricing decision',
          families: ['user', 'company'],
          limit: 10,
        }),
      ).toBeNull()
    })

    it('validates Atlas Brain save router payloads', () => {
      expect(validateActionData('atlas_save_brain_context', { content: 'Remember this' })).toMatch(
        /target_brain.*required/i,
      )
      expect(validateActionData('atlas_save_brain_context', { target_brain: 'user' })).toMatch(
        /content.*required/i,
      )
      expect(
        validateActionData('atlas_save_brain_context', {
          target_brain: 'user',
          content: 'A durable user insight.',
        }),
      ).toBeNull()
      expect(
        validateActionData('atlas_save_brain_context', {
          target_brain: 'company',
          content: 'We standardize pricing language.',
          confidence: 'high',
        }),
      ).toMatch(/confidence.*number/i)
    })

    it('validates Company Brain signal proposal and strict object creation payloads', () => {
      expect(validateActionData('propose_company_brain_signal', {})).toMatch(/truth.*required/i)
      expect(
        validateActionData('propose_company_brain_signal', {
          truth: 'Ask before publishing.',
          source_title: 'Review note',
        }),
      ).toBeNull()
      expect(
        validateActionData('create_company_brain_object', {
          object_type: 'standard',
          title: 'Approval before publish',
          truth: 'Ask before publishing.',
        }),
      ).toMatch(/source_signal_ids.*required/i)
      expect(
        validateActionData('create_company_brain_object', {
          object_type: 'standard',
          title: 'Approval before publish',
          truth: 'Ask before publishing.',
          source_signal_ids: ['signal-1'],
          evidence_refs: [{ type: 'company_signal', id: 'signal-1' }],
          retrieval_rule: { trigger: 'publishing', context_form: 'Ask first.' },
        }),
      ).toBeNull()
    })

    it('accepts agent brain resolution by agent identity or known brain_id', () => {
      expect(validateActionData('resolve_agent_brain', {})).toMatch(/agent_id.*required/i)
      expect(validateActionData('resolve_agent_brain', { agent_id: 'atlas' })).toBeNull()
      expect(validateActionData('resolve_agent_brain', { agent_key: 'atlas' })).toBeNull()
      expect(validateActionData('resolve_agent_brain', { brain_id: 'brain-1' })).toBeNull()
    })

    it('describes grounded Brain search contracts and insufficiency handling', () => {
      expect(describeActionContract('search_user_brain')).toMatchObject({
        action: 'search_user_brain',
        optional: expect.arrayContaining(['brain_id', 'limit']),
        use_when: expect.arrayContaining([expect.stringContaining('source-grounded memories')]),
        do_not_use_when: expect.arrayContaining([
          expect.stringContaining('family-specific Brain search action'),
        ]),
      })
      expect(describeActionContract('search_company_brain')).toMatchObject({
        action: 'search_company_brain',
        use_when: expect.arrayContaining([expect.stringContaining('sufficiency signals')]),
      })
      expect(describeActionContract('search_brain_context')).toMatchObject({
        action: 'search_brain_context',
        do_not_use_when: expect.arrayContaining([
          expect.stringContaining('one specific Brain family'),
          expect.stringContaining('search or read Space/document sources first'),
        ]),
      })
    })

    it('rejects Campaign Brain schemas entirely', () => {
      expect(describeActionContract('search_campaign_knowledge')).toBeNull()
      expect(describeActionContract('ingest_campaign_file')).toBeNull()
      expect(describeActionContract('ingest_campaign_url')).toBeNull()
    })

    it('validates Customer Brain source anchoring and shared Cortex action targets', async () => {
      expect(
        validateActionData('save_customer_memory', {
          content: 'Customer prefers weekly summaries.',
          memory_type: 'preference',
        }),
      ).toBeNull()
      await expect(
        validateActionPreflight('save_customer_memory', {
          content: 'Customer prefers weekly summaries.',
          memory_type: 'preference',
        }),
      ).resolves.toMatchObject({
        errorCode: 'CUSTOMER_MEMORY_SOURCE_REQUIRED',
      })
      await expect(
        validateActionPreflight('save_customer_memory', {
          content: 'Customer prefers weekly summaries.',
          memory_type: 'preference',
          source_id: 'meeting-1',
        }),
      ).resolves.toBeNull()
      expect(
        validateActionData('save_customer_memory', {
          content: 'Customer prefers weekly summaries.',
          memory_type: 'preference',
          contact_id: 'contact-1',
          speaker: 'Maria Lopez',
          metadata: {
            meeting_id: 'meeting-1',
            routing_confidence: 0.9,
          },
        }),
      ).toBeNull()
      await expect(
        validateActionPreflight('ingest_customer_brain_text', {
          text: 'A widget visitor asked for clearer weekly updates.',
          conversation_id: 'conversation-1',
        }),
      ).resolves.toBeNull()
      await expect(
        validateActionPreflight('ingest_customer_brain_link', {
          url: 'https://example.com/customer-reference',
        }),
      ).resolves.toBeNull()
      await expect(
        validateActionPreflight('atlas_save_brain_context', {
          target_brain: 'customer',
          content: 'A widget visitor asked for clearer weekly updates.',
          source_url: 'https://example.com/widget-chat',
        }),
      ).resolves.toBeNull()
      expect(describeActionContract('save_customer_memory')).toMatchObject({
        required: expect.not.arrayContaining(['contact_id']),
        optional: expect.arrayContaining(['contact_id', 'conversation_id', 'visitor_id']),
        preflight: expect.objectContaining({
          mode: 'static_preflight',
        }),
      })
      expect(
        validateActionData('save_customer_memory', {
          content: 'Customer prefers weekly summaries.',
          memory_type: 'preference',
          contact_id: 'contact-1',
          metadata: 'bad',
        }),
      ).toMatch(/metadata.*object/i)
      expect(validateActionData('get_brain_pages', {})).toMatch(/brain_type.*required/i)
      expect(validateActionData('get_brain_pages', { brain_type: 'user_default' })).toBeNull()
      expect(
        validateActionData('get_brain_pages', {
          brain_type: 'user_default',
          limit: 20,
          cursor: 'opaque-next-cursor',
          include_content: true,
        }),
      ).toBeNull()
      expect(
        validateActionData('get_brain_belief_patterns', {
          brain_type: 'user_default',
          limit: 20,
          cursor: 'opaque-next-cursor',
          include_details: true,
        }),
      ).toBeNull()
      expect(
        validateActionData('get_brain_perspectives', {
          brain_type: 'user_default',
          limit: 20,
          cursor: 'opaque-next-cursor',
          include_details: true,
        }),
      ).toBeNull()
      expect(validateActionData('get_brain_timelines', {})).toMatch(/brain_type.*required/i)
      expect(validateActionData('get_brain_timelines', { brain_type: 'company' })).toBeNull()
      expect(validateActionData('get_brain_timeline_items', { brain_type: 'company' })).toMatch(
        /timeline_id.*required/i,
      )
      expect(
        validateActionData('get_brain_timeline_items', {
          brain_type: 'company',
          timeline_id: 'timeline-1',
        }),
      ).toBeNull()
      expect(
        validateActionData('create_brain_timeline', {
          brain_type: 'company',
          timeline_type: 'company_decision_history',
          target_type: 'company_object',
          title: 'Decision history',
        }),
      ).toBeNull()
      expect(
        validateActionData('upsert_brain_timeline_items', {
          brain_type: 'company',
          timeline_id: 'timeline-1',
          items: [{ item_type: 'decision', title: 'Adopt approval-first mutations' }],
        }),
      ).toBeNull()
      expect(
        validateActionData('archive_brain_timeline', {
          brain_type: 'company',
          id: 'timeline-1',
        }),
      ).toBeNull()
      expect(
        validateActionData('create_brain_belief_pattern', {
          brain_type: 'customer',
          pattern_name: 'Enterprise caution',
        }),
      ).toMatch(/description.*required/i)
    })
  })

  describe('get_campaign_main_dashboard', () => {
    it('accepts empty data (campaign_id is resolved from session)', () => {
      expect(validateActionData('get_campaign_main_dashboard', {})).toBeNull()
    })

    it('accepts valid since/until ISO dates', () => {
      expect(
        validateActionData('get_campaign_main_dashboard', {
          campaign_id: 'c1',
          since: '2026-04-01T00:00:00Z',
          until: '2026-04-20T23:59:59Z',
          refresh: true,
        }),
      ).toBeNull()
    })

    it('rejects malformed since', () => {
      expect(validateActionData('get_campaign_main_dashboard', { since: 'not-a-date' })).toMatch(
        /since.*ISO/i,
      )
    })

    it('rejects non-boolean refresh', () => {
      expect(validateActionData('get_campaign_main_dashboard', { refresh: 'yes-please' })).toMatch(
        /refresh.*boolean/i,
      )
    })
  })

  describe('get_campaign_social_analytics', () => {
    it('rejects missing platform', () => {
      expect(validateActionData('get_campaign_social_analytics', { campaign_id: 'c1' })).toMatch(
        /platform.*required/i,
      )
    })

    it('rejects invalid platform value', () => {
      expect(
        validateActionData('get_campaign_social_analytics', {
          campaign_id: 'c1',
          platform: 'twitter',
        }),
      ).toMatch(/platform.*instagram.*linkedin/i)
    })

    it('accepts platform=instagram', () => {
      expect(
        validateActionData('get_campaign_social_analytics', {
          campaign_id: 'c1',
          platform: 'instagram',
        }),
      ).toBeNull()
    })

    it('accepts platform=linkedin', () => {
      expect(
        validateActionData('get_campaign_social_analytics', {
          campaign_id: 'c1',
          platform: 'linkedin',
        }),
      ).toBeNull()
    })
  })

  describe('get_campaign_stripe_overview', () => {
    it('accepts empty data', () => {
      expect(validateActionData('get_campaign_stripe_overview', {})).toBeNull()
    })

    it('accepts from_unix / to_unix numbers', () => {
      expect(
        validateActionData('get_campaign_stripe_overview', {
          campaign_id: 'c1',
          from_unix: 1700000000,
          to_unix: 1700100000,
        }),
      ).toBeNull()
    })

    it('accepts numeric string for unix values', () => {
      expect(
        validateActionData('get_campaign_stripe_overview', {
          from_unix: '1700000000',
        }),
      ).toBeNull()
    })

    it('rejects non-numeric from_unix', () => {
      expect(
        validateActionData('get_campaign_stripe_overview', { from_unix: 'yesterday' }),
      ).toMatch(/from_unix.*number/i)
    })
  })

  it('has entries for all 3 new analytics actions', () => {
    expect(ACTION_SCHEMAS.get_campaign_main_dashboard).toBeDefined()
    expect(ACTION_SCHEMAS.get_campaign_social_analytics).toBeDefined()
    expect(ACTION_SCHEMAS.get_campaign_stripe_overview).toBeDefined()
  })

  describe('contact actions', () => {
    it('has entries for all contact actions', () => {
      for (const action of [
        'list_contacts',
        'get_contact',
        'create_contact',
        'update_contact',
        'add_contact_note',
        'update_contact_note',
        'get_contact_activity',
        'list_contact_communications',
      ]) {
        expect(ACTION_SCHEMAS[action]).toBeDefined()
      }
    })

    it('validates required contact keys', () => {
      expect(validateActionData('list_contacts', {})).toBeNull()
      expect(validateActionData('get_contact', {})).toMatch(/contact_id.*required/i)
      expect(validateActionData('get_contact', { contact_id: 'contact-1' })).toBeNull()
      expect(validateActionData('create_contact', {})).toMatch(/email.*required/i)
      expect(validateActionData('create_contact', { email: 'sarah@example.com' })).toBeNull()
      expect(validateActionData('update_contact', {})).toMatch(/contact_id.*required/i)
      expect(
        validateActionData('update_contact', { contact_id: 'contact-1', tags: ['vip'] }),
      ).toBeNull()
      expect(validateActionData('add_contact_note', {})).toMatch(/contact_id.*required/i)
      expect(validateActionData('add_contact_note', { contact_id: 'contact-1' })).toMatch(
        /content.*required/i,
      )
      expect(
        validateActionData('add_contact_note', {
          contact_id: 'contact-1',
          content: 'Follow up Friday',
          card_tint: 'teal',
        }),
      ).toBeNull()
      expect(validateActionData('update_contact_note', {})).toMatch(/contact_id.*required/i)
      expect(validateActionData('update_contact_note', { contact_id: 'contact-1' })).toMatch(
        /note_id.*required/i,
      )
      expect(
        validateActionData('update_contact_note', {
          contact_id: 'contact-1',
          note_id: 'note-1',
          content: 'Updated note',
        }),
      ).toBeNull()
      expect(validateActionData('get_contact_activity', {})).toMatch(/contact_id.*required/i)
      expect(validateActionData('get_contact_activity', { contact_id: 'contact-1' })).toBeNull()
      expect(validateActionData('list_contact_communications', {})).toMatch(/contact_id.*required/i)
      expect(
        validateActionData('list_contact_communications', { contact_id: 'contact-1' }),
      ).toBeNull()
    })

    it('keeps create_contact aligned to the current narrow backend create API', () => {
      expect(
        validateActionData('create_contact', {
          email: 'sarah@example.com',
          tags: ['vip'],
        }),
      ).toMatch(/Unknown field tags/i)
      expect(describeActionContract('create_contact')?.do_not_use_when.join(' ')).toContain(
        'update_contact',
      )
    })

    it('preflights create_contact email format before runtime work', async () => {
      await expect(
        validateActionPreflight('create_contact', { email: 'not-email' }),
      ).resolves.toMatchObject({
        error: expect.stringContaining('valid email'),
      })
      await expect(
        validateActionPreflight('create_contact', { email: 'sarah@example.com' }),
      ).resolves.toBeNull()
    })

    it('preflights update_contact array replacement confirmation', async () => {
      await expect(
        validateActionPreflight('update_contact', { contact_id: 'contact-1', tags: ['vip'] }),
      ).resolves.toMatchObject({
        error: expect.stringContaining('confirm_replace_arrays'),
      })
      await expect(
        validateActionPreflight('update_contact', {
          contact_id: 'contact-1',
          tags: ['vip'],
          confirm_replace_arrays: true,
        }),
      ).resolves.toBeNull()
      await expect(
        validateActionPreflight('update_contact', {
          contact_id: 'contact-1',
          custom_fields: { tier: 'gold' },
          confirmReplaceArrays: true,
        }),
      ).resolves.toBeNull()
    })

    it('preflights contact note content and tint', async () => {
      await expect(
        validateActionPreflight('add_contact_note', {
          contact_id: 'contact-1',
          content: '  ',
        }),
      ).resolves.toMatchObject({ error: expect.stringContaining('content') })
      await expect(
        validateActionPreflight('add_contact_note', {
          contact_id: 'contact-1',
          content: 'Follow up Friday',
          card_tint: 'teal',
        }),
      ).resolves.toBeNull()
      await expect(
        validateActionPreflight('update_contact_note', {
          contact_id: 'contact-1',
          note_id: 'note-1',
        }),
      ).resolves.toMatchObject({
        error: expect.stringContaining('content or card_tint'),
      })
      await expect(
        validateActionPreflight('update_contact_note', {
          contact_id: 'contact-1',
          note_id: 'note-1',
          content: 'Updated',
          card_tint: 'invalid',
        }),
      ).resolves.toMatchObject({ error: expect.stringContaining('card_tint') })
      await expect(
        validateActionPreflight('update_contact_note', {
          contact_id: 'contact-1',
          note_id: 'note-1',
          content: 'Updated',
          card_tint: 'amber',
        }),
      ).resolves.toBeNull()
    })

    it('accepts richer update_contact fields and rejects invalid update values', () => {
      expect(
        validateActionData('update_contact', {
          contact_id: 'contact-1',
          custom_fields: { lifecycle_stage: 'vip' },
          business_name: 'Acme Health',
          website: 'https://example.com',
          contact_type: 'customer',
          contact_source: 'manual',
          confirm_replace_arrays: true,
        }),
      ).toBeNull()
      expect(
        validateActionData('update_contact', {
          contact_id: 'contact-1',
          tags: 'vip',
        }),
      ).toMatch(/tags.*array/i)
      expect(
        validateActionData('update_contact', {
          contact_id: 'contact-1',
          contact_source: 'CSV Import',
        }),
      ).toMatch(/contact_source.*one of/i)
      expect(
        validateActionData('add_contact_note', {
          contact_id: 'contact-1',
          content: 'Follow up',
          card_tint: 'espresso',
        }),
      ).toMatch(/card_tint.*one of/i)
    })

    it('accepts CRM list filters with camelCase API aliases', () => {
      expect(
        validateActionData('list_contacts', {
          query: 'sarah',
          contactType: 'customer',
          campaignId: 'campaign-1',
          includeArchived: true,
          filters: { city: { operator: 'is', value: 'Nicosia' } },
          limit: 20,
          offset: 0,
        }),
      ).toBeNull()
      expect(validateActionData('list_contacts', { include_archived: 'maybe' })).toMatch(
        /include_archived.*boolean/i,
      )
    })

    it('validates contact activity and communication filters', () => {
      expect(
        validateActionData('get_contact_activity', {
          contact_id: 'contact-1',
          limit: 50,
          offset: 0,
        }),
      ).toBeNull()
      expect(
        validateActionData('list_contact_communications', {
          contact_id: 'contact-1',
          channel: 'telegram',
          include_email_bodies: false,
          limit: 20,
        }),
      ).toBeNull()
      expect(
        validateActionData('list_contact_communications', {
          contact_id: 'contact-1',
          channel: 'sms',
        }),
      ).toMatch(/channel.*one of/i)
    })
  })

  describe('task actions', () => {
    it('has entries for all task actions', () => {
      for (const action of [
        'list_spaces',
        'search_space_context',
        'get_space',
        'list_space_views',
        'get_space_view',
        'list_space_view_items',
        'get_space_item',
        'create_space_field',
        'update_space_field',
        'append_space_field_option',
        'create_space_status',
        'create_space_category',
        'create_space_tag',
        'create_space_view',
        'update_space_view',
        'list_tasks',
        'get_task',
        'create_task',
        'update_task',
        'delete_task',
        'add_task_comment',
      ]) {
        expect(ACTION_SCHEMAS[action]).toBeDefined()
      }
    })

    it('validates required task keys', () => {
      expect(validateActionData('get_space', {})).toMatch(/space_id.*required/i)
      expect(validateActionData('list_space_views', {})).toMatch(/space_id.*required/i)
      expect(validateActionData('get_space_view', { space_id: 's1' })).toMatch(/view_id.*required/i)
      expect(validateActionData('list_space_view_items', { space_id: 's1' })).toMatch(
        /view_id.*required/i,
      )
      expect(validateActionData('get_space_item', { space_id: 's1' })).toMatch(/item_id.*required/i)
      expect(validateActionData('create_space_field', { space_id: 's1', name: 'Source' })).toMatch(
        /type.*required/i,
      )
      expect(validateActionData('update_space_field', { space_id: 's1' })).toMatch(
        /field_id.*required/i,
      )
      expect(validateActionData('append_space_field_option', { space_id: 's1' })).toMatch(
        /field_id.*required/i,
      )
      expect(
        validateActionData('append_space_field_option', { space_id: 's1', field_id: 'status' }),
      ).toMatch(/label.*required/i)
      expect(validateActionData('create_space_status', { space_id: 's1' })).toMatch(
        /label.*required/i,
      )
      expect(validateActionData('create_space_view', { space_id: 's1' })).toMatch(/name.*required/i)
      expect(validateActionData('update_space_view', { space_id: 's1' })).toMatch(
        /view_id.*required/i,
      )
      expect(validateActionData('list_tasks', {})).toMatch(/space_id.*required/i)
      expect(validateActionData('get_task', { space_id: 's1' })).toMatch(/task_id.*required/i)
      expect(validateActionData('create_task', { space_id: 's1' })).toMatch(/title.*required/i)
      expect(validateActionData('update_task', { space_id: 's1' })).toMatch(/task_id.*required/i)
      expect(validateActionData('delete_task', { space_id: 's1' })).toMatch(/task_id.*required/i)
      expect(validateActionData('add_task_comment', { space_id: 's1', task_id: 't1' })).toMatch(
        /message.*required/i,
      )
    })

    it('create_task accepts payload without space_id (handler auto-resolves a default space)', () => {
      expect(validateActionData('create_task', { title: 'Follow up' })).toBeNull()
    })

    it('accepts scope_override on scope-aware task payloads', () => {
      for (const [action, data] of [
        ['search_space_context', { query: 'retainer guardrails', scope_override: true }],
        ['list_space_views', { space_id: 's1', scope_override: true }],
        ['get_space_view', { space_id: 's1', view_id: 'v1', scope_override: true }],
        ['list_space_view_items', { space_id: 's1', view_id: 'v1', scope_override: true }],
        ['get_space_item', { space_id: 's1', item_id: 'i1', scope_override: true }],
        ['list_tasks', { space_id: 's1', scope_override: true }],
        ['get_task', { space_id: 's1', task_id: 't1', scope_override: true }],
      ] as const) {
        expect(validateActionData(action, data)).toBeNull()
      }
      expect(
        validateActionData('create_task', {
          title: 'Follow up',
          scope_override: true,
        }),
      ).toBeNull()
      expect(
        validateActionData('update_task', {
          space_id: 's1',
          task_id: 't1',
          scope_override: 'true',
        }),
      ).toBeNull()
      expect(
        validateActionData('delete_task', {
          space_id: 's1',
          task_id: 't1',
          scope_override: 'nope',
        }),
      ).toMatch(/scope_override.*boolean/i)
    })

    it('accepts valid minimal task payloads', () => {
      expect(validateActionData('list_spaces', {})).toBeNull()
      expect(validateActionData('list_spaces', { campaign_id: 'c1' })).toBeNull()
      expect(
        validateActionData('search_space_context', { query: 'retainer guardrails' }),
      ).toBeNull()
      expect(validateActionData('get_space', { space_id: 's1' })).toBeNull()
      expect(validateActionData('list_space_views', { space_id: 's1' })).toBeNull()
      expect(validateActionData('get_space_view', { space_id: 's1', view_id: 'v1' })).toBeNull()
      expect(
        validateActionData('list_space_view_items', { space_id: 's1', view_id: 'v1' }),
      ).toBeNull()
      expect(
        validateActionData('list_space_view_items', {
          space_id: 's1',
          view_id: 'v1',
          category: 'bugs',
          priority: 'high',
          filters: { category: 'bugs', _view_type: 'instagram_research' },
          fields: 'summary',
          include_count: true,
          sort_by: 'updated_at',
          sort_direction: 'desc',
        }),
      ).toBeNull()
      expect(validateActionData('get_space_item', { space_id: 's1', item_id: 'i1' })).toBeNull()
      expect(
        validateActionData('create_space_field', {
          space_id: 's1',
          name: 'Launch Tags',
          type: 'multi_select',
          options: [{ label: 'Hot' }],
          visible_in_view_ids: ['list'],
        }),
      ).toBeNull()
      expect(
        validateActionData('update_space_field', {
          space_id: 's1',
          field_id: 'launch_tags',
          name: 'Launch Tags',
          options: [{ id: 'hot', label: 'Hot' }],
          visible_in_view_ids: ['list'],
        }),
      ).toBeNull()
      expect(
        validateActionData('append_space_field_option', {
          space_id: 's1',
          field_id: 'launch_tags',
          label: 'Warm',
          color: 'orange',
        }),
      ).toBeNull()
      expect(
        validateActionData('create_space_status', { space_id: 's1', label: 'Research' }),
      ).toBeNull()
      expect(
        validateActionData('create_space_category', { space_id: 's1', label: 'Content' }),
      ).toBeNull()
      expect(validateActionData('create_space_tag', { space_id: 's1', label: 'Urgent' })).toBeNull()
      expect(
        validateActionData('create_space_view', {
          space_id: 's1',
          name: 'Research Board',
          view_type: 'kanban',
          visible_field_ids: ['status', 'title'],
          config: { group_by: 'status' },
        }),
      ).toBeNull()
      expect(
        validateActionData('update_space_view', {
          space_id: 's1',
          view_id: 'research_board',
          name: 'Research Pipeline',
          visible_field_ids: ['status', 'title', 'tags'],
        }),
      ).toBeNull()
      expect(validateActionData('list_tasks', { space_id: 's1' })).toBeNull()
      expect(
        validateActionData('list_tasks', {
          space_id: 's1',
          status: 'in_review',
          category: 'bugs',
          filters: { severity: 'high' },
          fields: 'summary',
          include_count: true,
          sort_by: 'updated_at',
          sort_direction: 'desc',
        }),
      ).toBeNull()
      expect(validateActionData('get_task', { space_id: 's1', task_id: 't1' })).toBeNull()
      expect(
        validateActionData('create_task', { space_id: 's1', title: 'Follow up', category: 'bugs' }),
      ).toBeNull()
      expect(
        validateActionData('create_task', {
          space_id: 's1',
          title: 'Review upload',
          attachments: [
            {
              filename: 'creative.png',
              mimeType: 'image/png',
              fileUrl: 'https://files.example/creative.png',
            },
          ],
        }),
      ).toBeNull()
      expect(
        validateActionData('update_task', { space_id: 's1', task_id: 't1', category: 'bugs' }),
      ).toBeNull()
      expect(validateActionData('delete_task', { space_id: 's1', task_id: 't1' })).toBeNull()
      expect(
        validateActionData('add_task_comment', {
          space_id: 's1',
          task_id: 't1',
          message: 'Reviewed',
        }),
      ).toBeNull()
    })

    it('validates task primitive types', () => {
      expect(validateActionData('list_spaces', { limit: 'nope' })).toMatch(/limit.*number/i)
      expect(validateActionData('list_spaces', { campaign_id: 123 })).toMatch(
        /campaign_id.*string/i,
      )
      expect(
        validateActionData('list_space_view_items', {
          space_id: 's1',
          view_id: 'v1',
          filters: 'status:todo',
        }),
      ).toMatch(/filters.*object/i)
      expect(
        validateActionData('list_space_view_items', {
          space_id: 's1',
          view_id: 'v1',
          limit: 'many',
        }),
      ).toMatch(/limit.*number/i)
      expect(
        validateActionData('get_space_item', {
          space_id: 's1',
          item_id: 'i1',
          include_activity: 'nope',
        }),
      ).toMatch(/include_activity.*boolean/i)
      expect(validateActionData('search_space_context', {})).toMatch(/query.*required/i)
      expect(
        validateActionData('search_space_context', {
          query: 'retainer guardrails',
          limit: 'many',
        }),
      ).toMatch(/limit.*number/i)
      expect(
        validateActionData('search_space_context', {
          query: 'retainer guardrails',
          source_types: 'space_doc',
        }),
      ).toMatch(/source_types.*array/i)
      expect(
        validateActionData('search_space_context', {
          query: 'retainer guardrails',
          scope_override: true,
        }),
      ).toBeNull()
      expect(describeActionContract('search_space_context')).toMatchObject({
        action: 'search_space_context',
        required: ['query'],
        optional: expect.arrayContaining(['space_id', 'source_types', 'limit', 'scope_override']),
        use_when: expect.arrayContaining([expect.stringContaining('active/current Space')]),
      })
      expect(describeActionContract('search_space_context')?.do_not_use_when).not.toEqual(
        expect.arrayContaining([expect.stringContaining('scope_override')]),
      )
      expect(validateActionData('list_tasks', { space_id: 's1', limit: 'nope' })).toMatch(
        /limit.*number/i,
      )
      expect(
        validateActionData('list_tasks', { space_id: 's1', filters: 'category:bugs' }),
      ).toMatch(/filters.*object/i)
      expect(validateActionData('list_tasks', { space_id: 's1', include_count: 'maybe' })).toMatch(
        /include_count.*boolean/i,
      )
      expect(
        validateActionData('create_task', {
          space_id: 's1',
          title: 'Follow up',
          due_date: 'tomorrow',
        }),
      ).toMatch(/due_date.*ISO/i)
      expect(
        validateActionData('create_task', {
          space_id: 's1',
          title: 'Review upload',
          attachments: 'https://files.example/creative.png',
        }),
      ).toMatch(/attachments.*array/i)
      expect(
        validateActionData('update_task', {
          space_id: 's1',
          task_id: 't1',
          sort_order: 'first',
        }),
      ).toMatch(/sort_order.*number/i)
      expect(
        validateActionData('create_space_field', {
          space_id: 's1',
          name: 'Launch Tags',
          type: 'multi_select',
          options: 'Hot',
        }),
      ).toMatch(/options.*array/i)
      expect(
        validateActionData('create_space_field', {
          space_id: 's1',
          name: 'Launch Tags',
          type: 'multi_select',
          visible_in_view_ids: 'list',
        }),
      ).toMatch(/visible_in_view_ids.*array/i)
      expect(
        validateActionData('update_space_field', {
          space_id: 's1',
          field_id: 'launch_tags',
          scope_override: 'maybe',
        }),
      ).toMatch(/scope_override.*boolean/i)
      expect(
        validateActionData('append_space_field_option', {
          space_id: 's1',
          field_id: 'launch_tags',
          label: 'Warm',
          color: 123,
        }),
      ).toMatch(/color.*string/i)
      expect(
        validateActionData('create_space_view', {
          space_id: 's1',
          name: 'Research Board',
          visible_field_ids: 'status',
        }),
      ).toMatch(/visible_field_ids.*array/i)
      expect(
        validateActionData('create_space_field', {
          space_id: 's1',
          name: 'Launch Tags',
          type: 'unsupported',
        }),
      ).toMatch(/type.*one of/i)
    })
  })

  describe('save_email', () => {
    it('requires subject, body, space_id, and source_item_id', () => {
      expect(validateActionData('save_email', { subject: 'Hi', body: 'Body' })).toMatch(
        /space_id.*required/i,
      )
      expect(
        validateActionData('save_email', {
          subject: 'Hi',
          body: 'Body',
          space_id: 'space-1',
          source_item_id: 'task-1',
          scope_override: true,
        }),
      ).toBeNull()
    })

    it('validates email artifact CRUD actions', () => {
      expect(validateActionData('list_emails', {})).toBeNull()
      expect(validateActionData('get_email', {})).toMatch(/email_id.*required/i)
      expect(validateActionData('get_email', { email_id: 'email-1' })).toBeNull()
      expect(validateActionData('update_email', { email_id: 'email-1' })).toMatch(
        /subject.*required/i,
      )
      expect(validateActionData('update_email', { email_id: 'email-1', subject: 'Hi' })).toBeNull()
      expect(validateActionData('delete_email', {})).toMatch(/email_id.*required/i)
      expect(validateActionData('delete_email', { email_id: 'email-1' })).toBeNull()
    })
  })

  describe('presentation action contracts', () => {
    it('accepts presentation rename fields and rejects unknown update fields', () => {
      expect(
        validateActionData('update_presentation', {
          presentation_id: 'deck-1',
          name: 'The Test. The Practice.',
        }),
      ).toBeNull()
      expect(
        validateActionData('update_presentation', {
          presentation_id: 'deck-1',
          not_a_field: 'x',
        }),
      ).toMatch(/Unknown field not_a_field.*update_presentation.*Accepted fields/i)
    })

    it('requires slide TSX for slide-level presentation edits', () => {
      expect(
        validateActionData('update_presentation_slide', {
          presentation_id: 'deck-1',
          slide_index: 2,
        }),
      ).toMatch(/generated_html.*required/i)
      expect(
        validateActionData('add_presentation_slide', {
          presentation_id: 'deck-1',
          slide_index: 3,
          generated_html: '<section>New slide</section>',
        }),
      ).toBeNull()
    })

    it('accepts HTML bundle presentation files and validates file actions', () => {
      expect(
        validateActionData('create_presentation', {
          name: 'HTML Deck',
          files: [{ path: 'index.html', content: '<!doctype html><html></html>', role: 'entry' }],
          entry_file: 'index.html',
          source_mode: 'html_bundle',
        }),
      ).toBeNull()
      expect(
        validateActionData('create_presentation', {
          name: 'Legacy deck',
          generated_html: 'export default () => <main />',
        }),
      ).toMatch(/files.*required/i)
      expect(
        validateActionData('write_presentation_file', {
          presentation_id: 'deck-1',
          path: 'index.html',
          content: '<!doctype html><html></html>',
        }),
      ).toBeNull()
      expect(
        validateActionData('patch_presentation_file', {
          presentation_id: 'deck-1',
          path: 'index.html',
          find: 'Old',
          replace: 'New',
          unexpected: true,
        }),
      ).toMatch(/Unknown field unexpected.*patch_presentation_file/i)
      expect(
        validateActionData('attach_presentation_asset', {
          presentation_id: 'deck-1',
          path: 'assets/logo.png',
          media_asset_id: 'asset-1',
        }),
      ).toBeNull()
      expect(
        validateActionData('attach_presentation_asset', {
          presentation_id: 'deck-1',
          path: 'assets/logo.png',
          asset_ref: { kind: 'vibey_asset', asset_id: 'asset-1' },
        }),
      ).toBeNull()
    })

    it('describes one action contract for agent lookup', () => {
      expect(describeActionContract('update_presentation')).toMatchObject({
        action: 'update_presentation',
        required: ['presentation_id'],
        optional: expect.arrayContaining(['name', 'generated_html', 'files', 'entry_file']),
        aliases: { title: 'name' },
        strict: true,
      })
    })

    it('validates Phase 2 presentation edit mode action contracts', () => {
      expect(
        validateActionData('apply_presentation_element_edit', {
          presentation_id: 'deck-1',
          path: 'index.html',
          text_snapshot: 'Old headline',
          value: 'New headline',
        }),
      ).toBeNull()
      expect(
        validateActionData('apply_presentation_element_edit', {
          presentation_id: 'deck-1',
          value: 'New headline',
          unexpected: true,
        }),
      ).toMatch(/Unknown field unexpected.*apply_presentation_element_edit/i)
      expect(
        validateActionData('add_presentation_anchor', {
          presentation_id: 'deck-1',
          path: 'index.html',
          find: '<h1>Headline</h1>',
          anchor_id: 'hero-headline',
        }),
      ).toBeNull()
      expect(
        validateActionData('extract_presentation_tweaks', { presentation_id: 'deck-1' }),
      ).toBeNull()
      expect(
        validateActionData('update_presentation_tweaks', {
          presentation_id: 'deck-1',
          path: 'slides.js',
          content: '/*EDITMODE-BEGIN*/{}/*EDITMODE-END*/',
        }),
      ).toBeNull()
    })
  })

  describe('MCP action contracts', () => {
    const mcpActions = [
      'list_mcp_servers',
      'list_mcp_tools',
      'use_mcp_tool',
      'add_mcp_server',
      'remove_mcp_server',
      'list_mcp_resources',
      'read_mcp_resource',
    ]

    it('has schema entries for every MCP action', () => {
      for (const action of mcpActions) {
        expect(ACTION_SCHEMAS[action]).toBeDefined()
      }
    })

    it('validates MCP server lookup requirements', () => {
      expect(validateActionData('list_mcp_servers', {})).toBeNull()
      expect(validateActionData('list_mcp_tools', {})).toMatch(/server_id.*required/i)
      expect(validateActionData('list_mcp_tools', { server_name: 'zuops' })).toBeNull()
      expect(validateActionData('list_mcp_resources', {})).toMatch(/server_id.*required/i)
      expect(validateActionData('list_mcp_resources', { server_id: 'server-1' })).toBeNull()
    })

    it('validates MCP tool and resource calls', () => {
      expect(validateActionData('use_mcp_tool', { server_name: 'zuops' })).toMatch(
        /tool_name.*required/i,
      )
      expect(
        validateActionData('use_mcp_tool', {
          server_name: 'zuops',
          tool_name: 'check_credits',
          arguments: {},
        }),
      ).toBeNull()
      expect(validateActionData('read_mcp_resource', { server_name: 'docs' })).toMatch(
        /uri.*required/i,
      )
      expect(
        validateActionData('read_mcp_resource', {
          server_name: 'docs',
          uri: 'resource://example',
        }),
      ).toBeNull()
    })

    it('validates MCP server management payloads', () => {
      expect(validateActionData('add_mcp_server', { name: 'zuops' })).toMatch(/url.*required/i)
      expect(
        validateActionData('add_mcp_server', {
          name: 'zuops',
          url: 'https://api.zuops.com/functions/v1/mcp-server',
        }),
      ).toBeNull()
      expect(
        validateActionData('add_mcp_server', {
          name: 'zuops',
          url: 'https://api.zuops.com/functions/v1/mcp-server',
          api_key: 'zu-...',
        }),
      ).toMatch(/Unknown field api_key/i)
      expect(validateActionData('remove_mcp_server', {})).toMatch(/server_id.*required/i)
      expect(validateActionData('remove_mcp_server', { server_id: 'server-1' })).toBeNull()
    })

    it('describes MCP contracts for agent lookup', () => {
      expect(describeActionContract('use_mcp_tool')).toMatchObject({
        action: 'use_mcp_tool',
        required: [['server_id', 'server_name'], 'tool_name'],
        optional: expect.arrayContaining(['arguments', 'args']),
        aliases: { tool: 'tool_name', args: 'arguments' },
        strict: true,
      })
    })
  })

  describe('hosted Vibey MCP action contracts', () => {
    const hostedMcpActions = [
      'search_vibey_docs',
      'create_campaign',
      'list_campaigns',
      'get_campaign',
      'create_funnel',
      'list_funnels',
      'list_forms',
      'get_form',
      'create_form',
      'update_form',
      'attach_form_asset',
      'publish_form',
      'unpublish_form',
      'list_form_responses',
      'create_sequence',
      'list_sequences',
      'get_sequence_email',
      'create_mission',
      'list_missions',
      'search_space_context',
      'save_document',
      'create_docx',
      'get_document',
      'list_user_brain_memories',
      'list_team',
      'list_agent_skills',
      'create_agent_skill',
      'create_agent_skill_resource',
      'upload_skill_asset',
    ]

    it('has schema entries for every hosted Vibey MCP action', () => {
      for (const action of hostedMcpActions) {
        expect(ACTION_SCHEMAS[action]).toBeDefined()
        expect(describeActionContract(action)).toMatchObject({ action })
      }
    })

    it('validates campaign and marketing artifact contracts', () => {
      expect(validateActionData('create_campaign', {})).toMatch(/name.*required/i)
      expect(validateActionData('create_campaign', { name: 'Q2 Launch' })).toBeNull()
      expect(validateActionData('list_campaigns', {})).toBeNull()
      expect(validateActionData('list_campaigns', { mode: 'accessible' })).toBeNull()
      expect(validateActionData('list_campaigns', { mode: 'everything' })).toMatch(
        /mode.*relevant.*accessible/i,
      )
      expect(validateActionData('get_campaign', {})).toMatch(/campaign_id.*required/i)
      expect(validateActionData('get_campaign', { campaign_id: 'campaign-1' })).toBeNull()
      expect(validateActionData('create_funnel', { campaign_id: 'campaign-1' })).toBeNull()
      expect(validateActionData('list_funnels', { campaign_id: 'campaign-1' })).toBeNull()
      expect(validateActionData('create_form', { name: 'Intake' })).toBeNull()
      expect(validateActionData('list_forms', { campaign_id: 'campaign-1' })).toBeNull()
      expect(validateActionData('update_form', {})).toMatch(/form_id.*required/i)
      expect(
        validateActionData('update_form', { form_id: 'form-1', settings_patch: {} }),
      ).toBeNull()
      expect(validateActionData('attach_form_asset', { form_id: 'form-1' })).toMatch(
        /placement.*required/i,
      )
      expect(
        validateActionData('attach_form_asset', {
          form_id: 'form-1',
          placement: 'cover',
          focal_y: 45,
        }),
      ).toBeNull()
      expect(
        validateActionData('attach_form_asset', {
          form_id: 'form-1',
          placement: 'cover',
          asset_ref: { kind: 'vibey_asset', asset_id: 'asset-1' },
        }),
      ).toBeNull()
      expect(validateActionData('publish_form', { form_id: 'form-1' })).toBeNull()
      expect(validateActionData('list_form_responses', { form_id: 'form-1' })).toBeNull()
      expect(validateActionData('create_website', { campaign_id: 'campaign-1' })).toBeNull()
      expect(
        validateActionData('add_website_page', {
          funnel_id: 'website-1',
          page_type: 'home',
          path: '/',
        }),
      ).toBeNull()
      expect(
        validateActionData('attach_funnel_asset', {
          funnel_id: 'website-1',
          path: 'assets/logo.png',
          asset_ref: { kind: 'vibey_asset', asset_id: 'asset-1' },
        }),
      ).toBeNull()
      expect(validateActionData('create_sequence', { campaign_id: 'campaign-1' })).toBeNull()
      expect(validateActionData('list_sequences', { campaign_id: 'campaign-1' })).toBeNull()
      expect(validateActionData('get_sequence_email', {})).toMatch(/sequence_email_id.*required/i)
      expect(validateActionData('get_sequence_email', { sequence_email_id: 'email-1' })).toBeNull()
    })

    it('describes first-class website and funnel taxonomy contracts', () => {
      expect(describeActionContract('create_funnel')).toMatchObject({
        allowed_values: {
          funnel_type: expect.arrayContaining(['lead-magnet', 'home-page', 'website']),
        },
        use_when: expect.arrayContaining([expect.stringContaining('single-purpose')]),
        do_not_use_when: expect.arrayContaining([expect.stringContaining('full website')]),
        retry_guidance: expect.arrayContaining([expect.stringContaining('general-home-page')]),
      })

      expect(describeActionContract('create_website')).toMatchObject({
        action: 'create_website',
        optional: expect.arrayContaining(['campaign_id', 'space_id', 'name', 'slug']),
        use_when: expect.arrayContaining([expect.stringContaining('homepage')]),
        examples: [
          expect.objectContaining({
            data: expect.objectContaining({ name: 'Business Name Website' }),
          }),
        ],
      })

      expect(describeActionContract('create_form')).toMatchObject({
        action: 'create_form',
        optional: expect.arrayContaining(['schema', 'settings']),
        descriptions: expect.objectContaining({
          schema: expect.stringContaining('questions'),
          settings: expect.stringContaining('colors'),
        }),
      })

      expect(describeActionContract('attach_form_asset')).toMatchObject({
        action: 'attach_form_asset',
        required: ['form_id', 'placement'],
        optional: expect.arrayContaining(['asset_ref']),
        allowed_values: {
          placement: expect.arrayContaining(['cover', 'icon', 'end_page_icon']),
        },
        descriptions: expect.objectContaining({
          placement: expect.stringContaining('cover_url'),
        }),
      })

      expect(describeActionContract('add_website_page')).toMatchObject({
        allowed_values: {
          page_type: expect.arrayContaining(['home', 'blog-listing', 'blog-post']),
        },
        examples: [
          expect.objectContaining({
            data: expect.objectContaining({ page_type: 'home', path: '/' }),
          }),
        ],
      })
    })

    it('validates mission and document contracts', async () => {
      expect(validateActionData('create_mission', {})).toMatch(/title.*required/i)
      expect(validateActionData('create_mission', { title: 'Draft the launch brief' })).toBeNull()
      expect(validateActionData('list_missions', { limit: 10 })).toBeNull()
      expect(
        validateActionData('compile_webinar_launch_bible', { mission_id: 'mission-1' }),
      ).toMatch(/tabs.*required/i)
      expect(
        validateActionData('compile_webinar_launch_bible', {
          mission_id: 'mission-1',
          title: 'Impact Webinar Launch Bible',
          tabs: [{ title: '0 - Overview', html: '<h1>Overview</h1>' }],
        }),
      ).toBeNull()
      await expect(
        validateActionPreflight('compile_webinar_launch_bible', {
          tabs: [{ title: '0 - Overview', html: '<h1>Overview</h1>' }],
        }),
      ).resolves.toMatchObject({ errorCode: 'WEBINAR_LAUNCH_BIBLE_TABS_MISSING' })
      const requiredTabs = [
        '0 - Overview',
        '1 - ICP Sheet',
        '2A - Webinar Offer',
        '2B - Webinar Content',
        '3 - Funnel Pages',
        'P1 - Opt-in Page',
        'P2 - Confirmation Page',
        'P3 - Offer Page',
        'P4 - Replay Page',
        '4 - Ad Scripts',
        '5 - Meta Ad Copy',
        '6 - Thank You Page Videos',
        '7 - SMS & Emails',
      ]
      await expect(
        validateActionPreflight('compile_webinar_launch_bible', {
          tabs: requiredTabs.map((title) => ({
            title,
            html: `<h1>${title}</h1>`,
            ...(title.match(/^P[1-4] - /) ? { parent_title: '3 - Funnel Pages' } : {}),
          })),
        }),
      ).resolves.toBeNull()
      const outOfOrderTabs = requiredTabs.map((title) => ({
        title,
        html: `<h1>${title}</h1>`,
        ...(title.match(/^P[1-4] - /) ? { parent_title: '3 - Funnel Pages' } : {}),
      }))
      ;[outOfOrderTabs[0], outOfOrderTabs[1]] = [outOfOrderTabs[1]!, outOfOrderTabs[0]!]
      await expect(
        validateActionPreflight('compile_webinar_launch_bible', {
          tabs: outOfOrderTabs,
        }),
      ).resolves.toMatchObject({ errorCode: 'WEBINAR_LAUNCH_BIBLE_TAB_ORDER_INVALID' })
      expect(validateActionData('save_document', { title: 'Brief' })).toMatch(/content.*required/i)
      expect(validateActionData('save_document', { title: 'Brief', content: '# Notes' })).toBeNull()
      expect(
        validateActionData('save_document', {
          title: 'Brief',
          content: '# Notes',
          space_id: 'space-1',
          category: 'client',
          due_date: '2026-07-01T00:00:00.000Z',
          custom_data: { stage: 'draft' },
        }),
      ).toBeNull()
      expect(
        validateActionData('save_document', {
          title: 'Brief',
          content: '# Notes',
          due_date: 'tomorrow',
        }),
      ).toMatch(/due_date.*ISO/i)
      expect(validateActionData('create_docx', { title: 'Brief' })).toMatch(/content.*required/i)
      expect(
        validateActionData('create_docx', {
          title: 'Brief',
          content: '# Notes',
          content_format: 'markdown',
          file_name: 'brief.docx',
          category: 'client',
        }),
      ).toBeNull()
      expect(
        validateActionData('update_document', {
          document_id: 'doc-1',
          due_date: '2026-07-01T00:00:00.000Z',
          custom_data: { stage: 'draft' },
        }),
      ).toBeNull()
      expect(describeActionContract('save_document')).toMatchObject({
        optional: expect.arrayContaining(['category', 'due_date', 'custom_data']),
      })
      expect(validateActionData('get_document', {})).toMatch(/document_id.*required/i)
      expect(validateActionData('get_document', { document_id: 'doc-1' })).toBeNull()
      expect(describeActionContract('get_document')).toMatchObject({
        aliases: { item_id: 'document_id', asset_id: 'document_id' },
      })
      expect(
        validateActionData('read_document', {
          asset_ref: { kind: 'vibey_asset', asset_id: 'asset-1' },
        }),
      ).toBeNull()
      expect(validateActionData('list_documents', { search: 'Hadassah Cyprus' })).toBeNull()
      expect(validateActionData('list_documents', { unexpected: 'field' })).toMatch(
        /Unknown field unexpected.*list_documents/i,
      )
    })

    it('validates hosted Vibey MCP docs search contract', () => {
      expect(validateActionData('search_vibey_docs', {})).toMatch(/query.*required/i)
      expect(validateActionData('search_vibey_docs', { query: 'campaign dashboard' })).toBeNull()
      expect(
        validateActionData('search_vibey_docs', {
          query: 'campaign dashboard',
          match_count: 'many',
        }),
      ).toMatch(/match_count.*number/i)
      expect(describeActionContract('search_vibey_docs')).toMatchObject({
        action: 'search_vibey_docs',
        required: ['query'],
        optional: expect.arrayContaining(['match_count', 'min_similarity']),
        use_when: expect.arrayContaining([expect.stringContaining('product documentation')]),
      })
    })

    it('validates Agent Skill MCP contracts and image reference guidance', () => {
      expect(validateActionData('list_team', {})).toBeNull()
      expect(validateActionData('list_agent_skills', {})).toMatch(/agent_key.*required/i)
      expect(validateActionData('list_agent_skills', { agent_key: 'copywriter' })).toBeNull()
      expect(validateActionData('audit_team_agents_and_skills', {})).toBeNull()
      expect(validateActionData('compare_team_skill_coverage', {})).toBeNull()
      expect(validateActionData('summarize_agent_capabilities', {})).toBeNull()
      expect(
        validateActionData('summarize_agent_capabilities', { agent_key: 'copywriter' }),
      ).toBeNull()
      expect(validateActionData('create_agent_skill', { agent_key: 'copywriter' })).toMatch(
        /skill_key.*required/i,
      )
      expect(
        validateActionData('create_agent_skill', {
          agent_key: 'copywriter',
          skill_key: 'offer_copy_reference',
          name: 'Offer Copy Reference',
          description: 'Writes offer copy from references.',
          markdown_content: '# Offer Copy Reference',
        }),
      ).toBeNull()
      expect(
        validateActionData('create_agent_skill_resource', {
          agent_key: 'copywriter',
          skill_key: 'offer_copy_reference',
          content: '# Reference',
        }),
      ).toMatch(/file_path.*required/i)
      expect(
        validateActionData('create_agent_skill_resource', {
          agent_key: 'copywriter',
          skill_key: 'offer_copy_reference',
          file_path: 'references/offer.md',
          content: '# Reference',
        }),
      ).toBeNull()
      expect(
        validateActionData('upload_skill_asset', {
          agent_key: 'designer',
          skill_key: 'brand_visual_reference',
        }),
      ).toMatch(/image_url.*required/i)
      expect(
        validateActionData('upload_skill_asset', {
          agent_key: 'designer',
          skill_key: 'brand_visual_reference',
          image_url: 'https://example.com/reference.png',
          description: 'homepage-visual-reference.png',
        }),
      ).toBeNull()
      expect(
        validateActionData('upload_skill_asset', {
          agent_key: 'designer',
          skill_key: 'brand_visual_reference',
          asset_ref: {
            kind: 'external_asset',
            provider: 'google_drive',
            external_id: 'drive-image-1',
            url: 'https://drive.example.com/reference.png',
          },
        }),
      ).toBeNull()
      expect(describeActionContract('upload_skill_asset')).toMatchObject({
        action: 'upload_skill_asset',
        required: ['agent_key', 'skill_key', ['image_url', 'asset_ref']],
        optional: expect.arrayContaining(['asset_ref']),
        descriptions: expect.objectContaining({
          image_url: expect.stringContaining('skill-assets'),
          asset_ref: expect.stringContaining('uploaded or connected file handle'),
          description: expect.stringContaining('resource path'),
        }),
        use_when: expect.arrayContaining([expect.stringContaining('image reference')]),
      })
    })
  })

  describe('integration action contracts', () => {
    it('describes use_integration with nested provider params', () => {
      expect(validateActionData('use_integration', { service: 'fathom' })).toMatch(
        /integration_action.*required/i,
      )
      expect(
        validateActionData('use_integration', {
          service: 'fathom',
          integration_action: 'get_transcript',
          params: { recordingId: '149415442' },
        }),
      ).toBeNull()
      expect(
        validateActionData('use_integration', {
          service: 'fathom',
          integration_action: 'get_transcript',
          params: 'recordingId=149415442',
        }),
      ).toMatch(/params.*object/i)
      expect(describeActionContract('use_integration')).toMatchObject({
        action: 'use_integration',
        optional: expect.arrayContaining(['params']),
        types: expect.objectContaining({ params: 'object' }),
        examples: [
          expect.objectContaining({
            data: expect.objectContaining({
              service: 'fathom',
              integration_action: 'get_transcript',
              params: { recordingId: '149415442' },
            }),
          }),
        ],
      })
    })
  })

  describe('resolvable field metadata', () => {
    it('marks presentation edits as resolvable by presentation_id', () => {
      expect(getResolvableFieldsForAction('patch_presentation')).toEqual([
        { field: 'presentation_id', fromArtifactType: 'presentation' },
      ])
      expect(getResolvableFieldsForAction('update_presentation')).toEqual([
        { field: 'presentation_id', fromArtifactType: 'presentation' },
      ])
    })

    it('marks funnel page edits as child-target resolvable by funnel_page_id', () => {
      expect(getResolvableFieldsForAction('update_funnel_page')).toEqual([
        {
          field: 'funnel_page_id',
          fromArtifactType: 'funnel_page',
          parentArtifactType: 'funnel',
          parentField: 'funnel_id',
        },
      ])
    })

    it('requires explicit intent metadata for full funnel page bundle replacement', () => {
      const contract = describeActionContract('update_funnel_page')
      expect(contract.optional).toEqual(expect.arrayContaining(['files', 'replace_entire_page']))
      expect(contract.types).toMatchObject({ replace_entire_page: 'boolean' })
      expect(
        validateActionData('update_funnel_page', {
          funnel_page_id: 'page-1',
          files: [{ path: 'index.html', content: '<!doctype html><html></html>' }],
          replace_entire_page: true,
        }),
      ).toBeNull()
    })

    it('does not mark destructive actions as resolvable', () => {
      expect(getResolvableFieldsForAction('delete_presentation')).toEqual([])
      expect(getResolvableFieldsForAction('delete_funnel')).toEqual([])
      expect(getResolvableFieldsForAction('publish_social_post')).toEqual([])
    })
  })
})
