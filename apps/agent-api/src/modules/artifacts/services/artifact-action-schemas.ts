/**
 * Canonical action parameter schemas.
 *
 * Each entry maps an action name to its required `data` keys and,
 * optionally, typed constraints on optional keys. The validation layer
 * rejects calls that are missing required keys or that supply malformed
 * optional keys, cutting a full handler round-trip for bad payloads.
 */

import { PROMPTMODE_ADDITIONAL_ACTION_SCHEMAS } from './artifact-action-additional-schemas'
import { getPromptModeActionLifecycle } from './artifact-action-lifecycle'
import { describeActionPreflightContract } from './artifact-action-preflight'
import {
  DOCUMENT_SPACE_ITEM_FIELD_TYPES,
  DOCUMENT_SPACE_ITEM_INPUT_FIELD_KEYS,
} from './artifact-space-item-field-contract'

export type ActionParamType =
  | 'string'
  | 'iso_date'
  | 'boolean'
  | 'number'
  | 'platform'
  | 'object'
  | 'object_array'
  | 'string_array'

export type ResolvableField = {
  field: string
  fromArtifactType: string
  parentField?: string
  parentArtifactType?: string
}

export type ActionSchema = {
  required: Array<string | string[]>
  /**
   * Optional keys the handler understands. Presence is not enforced,
   * but when the key is supplied the value is type-checked.
   */
  optional?: string[]
  aliases?: Record<string, string>
  strict?: boolean
  useWhen?: string[]
  doNotUseWhen?: string[]
  allowedValues?: Record<string, string[]>
  retryGuidance?: string[]
  examples?: Array<{
    intent: string
    data: Record<string, unknown>
  }>
  descriptions?: Record<string, string>
  /**
   * Type constraints applied to any param (required or optional) when present.
   * Keys not listed here pass through without type validation.
   */
  types?: Partial<Record<string, ActionParamType>>
  resolvable?: ResolvableField[]
}

const RUNTIME_CONTEXT_KEYS = new Set([
  'campaign_id',
  'space_id',
  'scope_override',
  'conversation_id',
  'user_id',
])

const BRAIN_TEMPORAL_OPTIONAL_KEYS = [
  'episode_id',
  'occurred_at',
  'occurred_until',
  'asserted_at',
  'valid_from',
  'valid_until',
  'temporal_status',
  'temporal_confidence',
  'temporal_source',
] as const

const COMPANY_TEMPORAL_OPTIONAL_KEYS = [
  ...BRAIN_TEMPORAL_OPTIONAL_KEYS,
  'effective_from',
  'effective_until',
  'evidence_started_at',
  'evidence_ended_at',
] as const

const BRAIN_TEMPORAL_PARAM_TYPES = {
  episode_id: 'string',
  occurred_at: 'iso_date',
  occurred_until: 'iso_date',
  asserted_at: 'iso_date',
  valid_from: 'iso_date',
  valid_until: 'iso_date',
  temporal_status: 'string',
  temporal_confidence: 'number',
  temporal_source: 'string',
} satisfies Partial<Record<string, ActionParamType>>

const COMPANY_TEMPORAL_PARAM_TYPES = {
  ...BRAIN_TEMPORAL_PARAM_TYPES,
  effective_from: 'iso_date',
  effective_until: 'iso_date',
  evidence_started_at: 'iso_date',
  evidence_ended_at: 'iso_date',
} satisfies Partial<Record<string, ActionParamType>>

const BRAIN_TEMPORAL_SEARCH_KEYS = [
  'time_mode',
  'as_of',
  'occurred_from',
  'occurred_to',
  'include_historical',
] as const

const BRAIN_TEMPORAL_SEARCH_TYPES = {
  time_mode: 'string',
  as_of: 'iso_date',
  occurred_from: 'iso_date',
  occurred_to: 'iso_date',
  include_historical: 'boolean',
} satisfies Partial<Record<string, ActionParamType>>

const NOTE_CARD_TINT_VALUES = [
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'slate',
] as const

export const VALID_FUNNEL_TYPES = [
  'lead-magnet',
  'call-booking',
  'webinar',
  'home-page',
  'live-event',
  'ecommerce-product',
  'cart-checkout',
  'vsl',
  'custom',
  'website',
] as const

export const VALID_WEBSITE_PAGE_TYPES = [
  'home',
  'about',
  'services',
  'pricing',
  'team',
  'contact',
  'blog-listing',
  'blog-post',
  'faq',
  'testimonials',
  'portfolio',
  'custom',
] as const

export const FUNNEL_TYPE_ALIASES: Record<string, (typeof VALID_FUNNEL_TYPES)[number]> = {
  'general-home-page': 'home-page',
  'business website': 'website',
  'company site': 'website',
  'full website': 'website',
}

export const HOMEPAGE_WEBSITE_INTENT_ALIASES = [
  'homepage',
  'home page',
  'make the home page',
] as const

const BASE_ACTION_SCHEMAS: Record<string, ActionSchema> = {
  delete_social_post: { required: ['social_post_id'] },
  get_social_post: { required: ['social_post_id'] },
  update_social_post: {
    required: ['social_post_id'],
    resolvable: [{ field: 'social_post_id', fromArtifactType: 'social_post' }],
  },
  schedule_social_post: { required: ['social_post_id', 'scheduled_at'] },
  publish_social_post: { required: ['social_post_id'] },
  create_social_post: { required: ['platform', 'post_type'] },

  delete_blog_post: { required: ['blog_post_id'] },
  get_blog_post: { required: ['blog_post_id'] },
  update_blog_post: {
    required: ['blog_post_id'],
    resolvable: [{ field: 'blog_post_id', fromArtifactType: 'blog_post' }],
  },

  update_offer_step: {
    required: ['offer_id', 'step_number'],
    resolvable: [{ field: 'offer_id', fromArtifactType: 'offer' }],
  },
  get_offer: { required: ['offer_id'] },
  delete_offer: { required: ['offer_id'] },

  create_funnel: {
    required: [],
    optional: ['campaign_id', 'space_id', 'name', 'slug', 'funnel_type', 'status', 'theme_id'],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      name: 'string',
      slug: 'string',
      funnel_type: 'string',
      status: 'string',
      theme_id: 'string',
    },
    allowedValues: {
      funnel_type: [...VALID_FUNNEL_TYPES],
    },
    descriptions: {
      funnel_type:
        'Allowed DB values only. general-home-page is an example category alias, not a persisted funnel_type.',
    },
    useWhen: ['Create a single-purpose funnel or standalone single-page artifact.'],
    doNotUseWhen: [
      'Reading existing funnels; use list_funnels or get_funnel instead.',
      'User wants a full website, business site, or homepage inside an existing website; use list_websites, get_website, create_website, or add_website_page.',
      'Do not use lead-magnet as a fallback for homepage or website failures.',
    ],
    retryGuidance: [
      'If funnel_type is rejected, do not choose an unrelated valid type.',
      'general-home-page may only map to home-page or website; it must never map to lead-magnet.',
    ],
    examples: [
      {
        intent: 'create a lead magnet funnel',
        data: { campaign_id: 'UUID', name: 'Q2 Lead Magnet', funnel_type: 'lead-magnet' },
      },
      {
        intent: 'create a standalone home page artifact',
        data: { campaign_id: 'UUID', name: 'Brand Home Page', funnel_type: 'home-page' },
      },
    ],
  },
  list_funnels: {
    required: [],
    optional: ['campaign_id', 'space_id', 'funnel_type_filter'],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      funnel_type_filter: 'string',
    },
    useWhen: ['List funnels in the active campaign or an explicit campaign_id.'],
    examples: [{ intent: 'list campaign funnels', data: { campaign_id: 'UUID' } }],
  },
  get_funnel: { required: ['funnel_id'], types: { funnel_id: 'string' } },
  delete_funnel: { required: ['funnel_id'] },
  list_forms: {
    required: [],
    optional: ['campaign_id', 'space_id', 'include_archived', 'limit'],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      include_archived: 'boolean',
      limit: 'number',
    },
    useWhen: ['List native Forms in the active campaign or an explicit campaign_id.'],
    examples: [{ intent: 'list campaign forms', data: { campaign_id: 'UUID' } }],
  },
  get_form: {
    required: ['form_id'],
    types: { form_id: 'string' },
    resolvable: [{ field: 'form_id', fromArtifactType: 'form' }],
  },
  create_form: {
    required: ['name'],
    optional: ['campaign_id', 'space_id', 'visibility', 'schema', 'settings'],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      visibility: 'string',
      name: 'string',
      schema: 'object',
      settings: 'object',
    },
    allowedValues: { visibility: ['public', 'auth', 'embed_only'] },
    descriptions: {
      schema:
        'Native form schema: { title, description, questions }. Questions support type, label, description, placeholder, required, options, contact_subfields, property_field_id, and config.',
      settings:
        'Native form settings: colors, cover_url, icon_image_url, end_page fields, redirect_url, button_label, target_space_id, assignee, branding, CAPTCHA, and layout/theme options.',
    },
    useWhen: ['Create a native Vibey Form with questions, colors, settings, and image URLs.'],
    examples: [
      {
        intent: 'create a branded intake form',
        data: {
          campaign_id: 'UUID',
          name: 'Client Intake',
          schema: {
            title: 'Client Intake',
            questions: [{ id: 'name', type: 'short_text', label: 'Name', required: true }],
          },
          settings: { button_label: 'Submit', cover_url: 'https://example.com/cover.png' },
        },
      },
    ],
  },
  update_form: {
    required: ['form_id'],
    optional: ['name', 'space_id', 'visibility', 'schema', 'settings', 'settings_patch'],
    types: {
      form_id: 'string',
      name: 'string',
      space_id: 'string',
      visibility: 'string',
      schema: 'object',
      settings: 'object',
      settings_patch: 'object',
    },
    allowedValues: { visibility: ['public', 'auth', 'embed_only'] },
    resolvable: [{ field: 'form_id', fromArtifactType: 'form' }],
    useWhen: [
      'Update native Form metadata, replace schema/questions, replace settings, or merge settings_patch into existing settings.',
    ],
    doNotUseWhen: [
      'Attaching a user-uploaded or campaign media image to a Form slot; use attach_form_asset instead.',
    ],
  },
  attach_form_asset: {
    required: ['form_id', 'placement'],
    optional: ['media_asset_id', 'asset_ref', 'file_url', 'image_url', 'focal_y'],
    types: {
      form_id: 'string',
      placement: 'string',
      media_asset_id: 'string',
      asset_ref: 'object',
      file_url: 'string',
      image_url: 'string',
      focal_y: 'number',
    },
    allowedValues: {
      placement: ['cover', 'hero', 'icon', 'logo', 'end_page_icon', 'thank_you', 'thank_you_icon'],
    },
    descriptions: {
      placement:
        'Semantic image slot. cover/hero updates settings.cover_url; icon/logo updates settings.icon_image_url; end_page_icon/thank_you updates settings.end_page_icon_image_url.',
      media_asset_id:
        'Preferred when the uploaded image exists in campaign media. Omit when using the single current uploaded image from the chat request.',
      asset_ref:
        'Stable uploaded or connected file handle. The action normalizer converts it to media_asset_id or file_url.',
      file_url: 'Direct public or signed image URL. Use only when a media_asset_id is unavailable.',
      focal_y: 'Optional cover focal point from 0 to 100. Applies only when placement is cover.',
    },
    resolvable: [{ field: 'form_id', fromArtifactType: 'form' }],
    useWhen: [
      'Attach a user-uploaded or campaign media image to a native Form cover, logo/icon, or thank-you image slot.',
    ],
    examples: [
      {
        intent: 'use the current uploaded image as the form cover',
        data: { form_id: 'UUID', placement: 'cover', focal_y: 45 },
      },
      {
        intent: 'attach campaign media as the form logo',
        data: { form_id: 'UUID', placement: 'icon', media_asset_id: 'UUID' },
      },
    ],
  },
  publish_form: {
    required: ['form_id'],
    types: { form_id: 'string' },
    resolvable: [{ field: 'form_id', fromArtifactType: 'form' }],
  },
  unpublish_form: {
    required: ['form_id'],
    types: { form_id: 'string' },
    resolvable: [{ field: 'form_id', fromArtifactType: 'form' }],
  },
  list_form_responses: {
    required: ['form_id'],
    optional: ['limit'],
    types: { form_id: 'string', limit: 'number' },
    resolvable: [{ field: 'form_id', fromArtifactType: 'form' }],
  },
  add_funnel_page: {
    required: ['funnel_id', 'files'],
    optional: ['name', 'slug', 'page_type', 'order_index', 'generation_mode', 'path', 'space_id'],
    types: {
      funnel_id: 'string',
      name: 'string',
      slug: 'string',
      page_type: 'string',
      files: 'object_array',
      order_index: 'number',
      generation_mode: 'string',
      path: 'string',
      space_id: 'string',
    },
    useWhen: [
      'Add a NEW page to a funnel as an HTML file bundle (files with an index.html entry).',
    ],
    doNotUseWhen: ['Editing an existing page; use patch_funnel_file or write_funnel_file.'],
    examples: [
      {
        intent: 'add an HTML bundle opt-in page',
        data: {
          funnel_id: 'UUID',
          name: 'Free Guide Opt-in',
          slug: 'free-guide-opt-in',
          page_type: 'opt-in',
          order_index: 0,
          files: [
            { path: 'index.html', role: 'entry', content: '<!doctype html><html>...</html>' },
            { path: 'styles.css', role: 'style', content: ':root { --color-primary: #10b981; }' },
          ],
        },
      },
    ],
  },
  update_funnel_page: {
    required: ['funnel_page_id'],
    optional: ['files', 'replace_entire_page', 'name', 'slug', 'page_type', 'order_index', 'path'],
    types: {
      funnel_page_id: 'string',
      files: 'object_array',
      replace_entire_page: 'boolean',
      name: 'string',
      slug: 'string',
      page_type: 'string',
      order_index: 'number',
      path: 'string',
    },
    resolvable: [
      {
        field: 'funnel_page_id',
        fromArtifactType: 'funnel_page',
        parentField: 'funnel_id',
        parentArtifactType: 'funnel',
      },
    ],
    useWhen: [
      'Replace the WHOLE page bundle (full redesign) by passing files with replace_entire_page: true, or update page metadata (name, slug, path, order_index).',
    ],
    doNotUseWhen: [
      'Changing copy, one section, or styles — use patch_funnel_file (exact find/replace) or write_funnel_file (one file) instead. update_funnel_page.files is blocked unless replace_entire_page: true is supplied for an intentional full redesign.',
    ],
  },
  list_funnel_files: {
    required: ['funnel_id'],
    optional: ['funnel_page_id'],
    aliases: { page_id: 'funnel_page_id' },
    types: { funnel_id: 'string', funnel_page_id: 'string' },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  read_funnel_file: {
    required: ['funnel_id', 'path'],
    optional: ['funnel_page_id'],
    aliases: { page_id: 'funnel_page_id' },
    types: { funnel_id: 'string', funnel_page_id: 'string', path: 'string' },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  write_funnel_file: {
    required: ['funnel_id', 'path', 'content'],
    optional: ['funnel_page_id', 'role'],
    aliases: { page_id: 'funnel_page_id' },
    strict: true,
    types: {
      funnel_id: 'string',
      funnel_page_id: 'string',
      path: 'string',
      content: 'string',
      role: 'string',
    },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
    useWhen: [
      'Create or replace one source file in an HTML bundle funnel page (pass funnel_page_id) or a funnel-shared file like shared/styles.css (omit funnel_page_id).',
    ],
  },
  patch_funnel_file: {
    required: ['funnel_id', 'path', 'find', 'replace'],
    optional: ['funnel_page_id'],
    aliases: { page_id: 'funnel_page_id' },
    strict: true,
    types: {
      funnel_id: 'string',
      funnel_page_id: 'string',
      path: 'string',
      find: 'string',
      replace: 'string',
    },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  delete_funnel_file: {
    required: ['funnel_id', 'path'],
    optional: ['funnel_page_id'],
    aliases: { page_id: 'funnel_page_id' },
    types: { funnel_id: 'string', funnel_page_id: 'string', path: 'string' },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  list_funnel_assets: {
    required: ['funnel_id'],
    types: { funnel_id: 'string' },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  attach_funnel_asset: {
    required: ['funnel_id', 'path', ['media_asset_id', 'asset_ref']],
    optional: ['asset_ref', 'role'],
    strict: true,
    types: {
      funnel_id: 'string',
      path: 'string',
      media_asset_id: 'string',
      asset_ref: 'object',
      role: 'string',
    },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  detach_funnel_asset: {
    required: ['funnel_id', 'path'],
    types: { funnel_id: 'string', path: 'string' },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  apply_funnel_element_edit: {
    required: ['funnel_id', 'funnel_page_id', 'value'],
    optional: ['path', 'source_file', 'find', 'text_snapshot', 'source_hint', 'anchor_id'],
    aliases: { page_id: 'funnel_page_id' },
    strict: true,
    types: {
      funnel_id: 'string',
      funnel_page_id: 'string',
      value: 'string',
      path: 'string',
      source_file: 'string',
      find: 'string',
      text_snapshot: 'string',
      source_hint: 'string',
      anchor_id: 'string',
    },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
    useWhen: ['Apply a surgical HTML-first funnel page edit from Markup/Edit context.'],
    doNotUseWhen: ['Replacing a full source file; use write_funnel_file instead.'],
  },
  add_funnel_anchor: {
    required: ['funnel_id', 'funnel_page_id', 'path', 'find', 'anchor_id'],
    aliases: { page_id: 'funnel_page_id' },
    strict: true,
    types: {
      funnel_id: 'string',
      funnel_page_id: 'string',
      path: 'string',
      find: 'string',
      anchor_id: 'string',
    },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  extract_funnel_tweaks: {
    required: ['funnel_id'],
    optional: ['funnel_page_id'],
    aliases: { page_id: 'funnel_page_id' },
    types: { funnel_id: 'string', funnel_page_id: 'string' },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },
  update_funnel_tweaks: {
    required: ['funnel_id', 'path', 'content'],
    optional: ['funnel_page_id'],
    aliases: { page_id: 'funnel_page_id' },
    strict: true,
    types: {
      funnel_id: 'string',
      funnel_page_id: 'string',
      path: 'string',
      content: 'string',
    },
    resolvable: [{ field: 'funnel_id', fromArtifactType: 'funnel' }],
  },

  create_website: {
    required: [],
    optional: ['campaign_id', 'space_id', 'name', 'slug', 'status', 'theme_id'],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      name: 'string',
      slug: 'string',
      status: 'string',
      theme_id: 'string',
    },
    useWhen: [
      'Create a first-class website artifact for a full website, business site, company site, or brand homepage when no website exists.',
      'For "make the homepage", list_websites first and update/add the home page on an existing website when present.',
    ],
    doNotUseWhen: [
      'Single-purpose lead capture, freebie, opt-in, webinar, VSL, checkout, or event funnels; use create_funnel with the correct funnel_type.',
    ],
    examples: [
      {
        intent: 'create a business website before adding its Home page',
        data: { campaign_id: 'UUID', name: 'Business Name Website', slug: 'business-name' },
      },
    ],
  },
  get_website: {
    required: ['funnel_id'],
    types: { funnel_id: 'string' },
    useWhen: ['Read a first-class website plus its pages and blog metadata.'],
  },
  delete_website: { required: ['funnel_id'], types: { funnel_id: 'string' } },
  add_website_page: {
    required: ['funnel_id'],
    optional: [
      'name',
      'slug',
      'page_type',
      'path',
      'files',
      'order_index',
      'generation_mode',
      'space_id',
    ],
    types: {
      funnel_id: 'string',
      name: 'string',
      slug: 'string',
      page_type: 'string',
      path: 'string',
      files: 'object_array',
      order_index: 'number',
      generation_mode: 'string',
      space_id: 'string',
    },
    allowedValues: {
      page_type: [...VALID_WEBSITE_PAGE_TYPES],
    },
    useWhen: [
      'Add a page to an existing website stored in funnels with funnel_type website.',
      'Use page_type home and path / for the Home page.',
    ],
    examples: [
      {
        intent: 'add the Home page to an existing website',
        data: { funnel_id: 'UUID', name: 'Home', slug: 'home', page_type: 'home', path: '/' },
      },
    ],
  },
  update_website_page: {
    required: ['funnel_page_id'],
    optional: [
      'name',
      'slug',
      'page_type',
      'path',
      'files',
      'replace_entire_page',
      'order_index',
      'generation_mode',
    ],
    types: {
      funnel_page_id: 'string',
      name: 'string',
      slug: 'string',
      page_type: 'string',
      path: 'string',
      files: 'object_array',
      replace_entire_page: 'boolean',
      order_index: 'number',
      generation_mode: 'string',
    },
    allowedValues: {
      page_type: [...VALID_WEBSITE_PAGE_TYPES],
    },
    resolvable: [
      {
        field: 'funnel_page_id',
        fromArtifactType: 'funnel_page',
        parentField: 'funnel_id',
        parentArtifactType: 'funnel',
      },
    ],
    useWhen: [
      'Replace a WHOLE website page bundle by passing files with replace_entire_page: true, or update website page metadata.',
    ],
    doNotUseWhen: [
      'Changing copy, one section, or styles — use patch_funnel_file or write_funnel_file instead.',
    ],
  },
  set_website_layout: {
    required: ['funnel_id'],
    optional: ['layout', 'nav_html', 'footer_html'],
    types: { funnel_id: 'string', layout: 'object', nav_html: 'string', footer_html: 'string' },
    useWhen: [
      'Set the structured layout config, or write shared HTML nav/footer files (nav_html/footer_html) for HTML bundle websites.',
    ],
  },

  update_ad: {
    required: ['ad_id'],
    resolvable: [{ field: 'ad_id', fromArtifactType: 'ad' }],
  },
  patch_ad: {
    required: ['ad_id'],
    resolvable: [{ field: 'ad_id', fromArtifactType: 'ad' }],
  },
  get_ad: { required: ['ad_id'] },
  delete_ad: { required: ['ad_id'] },

  create_sequence: {
    required: [],
    optional: ['campaign_id', 'space_id', 'name', 'trigger', 'config', 'status'],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      name: 'string',
      status: 'string',
    },
    useWhen: ['Create an email sequence in the active campaign or explicit campaign_id.'],
    examples: [
      { intent: 'create a nurture sequence', data: { campaign_id: 'UUID', name: 'Nurture' } },
    ],
  },
  list_sequences: {
    required: [],
    optional: ['campaign_id', 'space_id'],
    types: { campaign_id: 'string', space_id: 'string' },
    useWhen: ['List email sequences in the active campaign or explicit campaign_id.'],
    examples: [{ intent: 'list campaign sequences', data: { campaign_id: 'UUID' } }],
  },
  get_sequence: { required: ['sequence_id'], types: { sequence_id: 'string' } },
  get_sequence_email: {
    required: ['sequence_email_id'],
    types: { sequence_email_id: 'string' },
    resolvable: [
      {
        field: 'sequence_email_id',
        fromArtifactType: 'sequence_email',
        parentField: 'sequence_id',
        parentArtifactType: 'sequence',
      },
    ],
  },
  delete_sequence: { required: ['sequence_id'] },
  update_sequence: {
    required: ['sequence_id'],
    resolvable: [{ field: 'sequence_id', fromArtifactType: 'sequence' }],
  },
  add_sequence_email: { required: ['sequence_id'] },
  update_sequence_email: {
    required: ['sequence_email_id'],
    resolvable: [
      {
        field: 'sequence_email_id',
        fromArtifactType: 'sequence_email',
        parentField: 'sequence_id',
        parentArtifactType: 'sequence',
      },
    ],
  },
  delete_sequence_email: { required: ['sequence_email_id'] },

  describe_action: {
    required: ['action_name'],
    optional: ['action'],
    types: { action_name: 'string', action: 'string' },
    useWhen: ['Fetch the exact data contract for one backend action before calling it.'],
    examples: [
      {
        intent: 'inspect update_presentation before calling it',
        data: { action_name: 'update_presentation' },
      },
    ],
  },
  search_vibey_docs: {
    required: ['query'],
    optional: ['match_count', 'min_similarity'],
    types: { query: 'string', match_count: 'number', min_similarity: 'number' },
    descriptions: {
      query: 'Search phrase for Vibey product documentation.',
      match_count: 'Maximum number of citations to return.',
      min_similarity: 'Minimum vector similarity threshold between 0 and 1.',
    },
    useWhen: ['You need product documentation about Vibey features, actions, or policies.'],
    examples: [
      {
        intent: 'Find the campaign dashboard doc',
        data: { query: 'campaign dashboard' },
      },
    ],
  },

  create_campaign: {
    required: ['name'],
    optional: ['campaign_type', 'config'],
    types: {
      name: 'string',
      campaign_type: 'string',
      config: 'object',
    },
    useWhen: ['Create a new Vibey campaign.'],
    examples: [
      {
        intent: 'create a lead campaign',
        data: { name: 'Q2 Launch', campaign_type: 'get-more-leads' },
      },
    ],
  },
  list_campaigns: {
    required: [],
    optional: ['mode'],
    types: { mode: 'string' },
    useWhen: ['List relevant campaigns for the active/current context by default.'],
    examples: [
      { intent: 'list relevant campaigns', data: {} },
      { intent: 'show all campaigns I can access', data: { mode: 'accessible' } },
    ],
  },
  get_campaign: {
    required: ['campaign_id'],
    types: { campaign_id: 'string' },
    useWhen: ['Read one campaign by id after list_campaigns returns it.'],
    examples: [{ intent: 'read one campaign', data: { campaign_id: 'UUID' } }],
  },
  discover_channel_context: {
    required: ['channel_id'],
    types: { channel_id: 'string' },
    useWhen: [
      'In a studio channel with no bound campaign (CHANNEL_CONTEXT says none is bound) before any campaign-scoped lookup (avatars, offers, brain).',
    ],
    doNotUseWhen: [
      'The channel already has a bound campaign — use it directly.',
      'Outside studio channels (regular chat conversations resolve scope automatically).',
    ],
    examples: [
      { intent: 'find the right campaign for this channel', data: { channel_id: 'UUID' } },
    ],
  },
  set_channel_context: {
    required: ['channel_id'],
    optional: ['campaign_id'],
    types: { channel_id: 'string', campaign_id: 'string' },
    useWhen: [
      'After discover_channel_context returned exactly one plausible campaign, or after the user explicitly confirmed which campaign to use.',
    ],
    doNotUseWhen: [
      'Multiple plausible campaigns and the user has not picked one — never bind without confirmation.',
    ],
    descriptions: { campaign_id: 'Campaign to bind. Omit to clear the channel binding.' },
    examples: [
      {
        intent: 'bind the confirmed campaign to this channel',
        data: { channel_id: 'UUID', campaign_id: 'UUID' },
      },
    ],
  },

  get_presentation: { required: ['presentation_id'], types: { presentation_id: 'string' } },
  delete_presentation: { required: ['presentation_id'] },
  create_presentation: {
    required: ['files'],
    optional: [
      'name',
      'generated_html',
      'slides',
      'offer_id',
      'status',
      'theme_id',
      'files',
      'entry_file',
      'source_mode',
    ],
    types: {
      name: 'string',
      generated_html: 'string',
      offer_id: 'string',
      status: 'string',
      theme_id: 'string',
      files: 'object_array',
      entry_file: 'string',
      source_mode: 'string',
    },
    useWhen: ['Create a new presentation artifact.', 'Save an HTML presentation file bundle.'],
    doNotUseWhen: [
      'Creating a legacy generated_html or slides payload; new presentations require a complete HTML file bundle.',
      'Renaming an existing presentation; use update_presentation with name.',
    ],
    examples: [
      {
        intent: 'create a presentation from HTML files',
        data: {
          name: 'Guide',
          source_mode: 'html_bundle',
          entry_file: 'index.html',
          files: [
            { path: 'index.html', content: '<!doctype html><html>...</html>', role: 'entry' },
          ],
        },
      },
    ],
  },
  update_presentation: {
    required: ['presentation_id'],
    optional: [
      'name',
      'slides',
      'file_url',
      'status',
      'generated_html',
      'theme_id',
      'files',
      'entry_file',
      'source_mode',
    ],
    aliases: { title: 'name' },
    strict: true,
    types: {
      presentation_id: 'string',
      name: 'string',
      file_url: 'string',
      status: 'string',
      generated_html: 'string',
      theme_id: 'string',
      files: 'object_array',
      entry_file: 'string',
      source_mode: 'string',
    },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
    useWhen: [
      'Rename a presentation by passing name.',
      'Replace the full HTML presentation bundle by passing files.',
      'Update presentation metadata such as status, file_url, slides, or theme_id.',
    ],
    doNotUseWhen: [
      'Patching one text node inside slide TSX; use patch_presentation.',
      'Replacing one slide only; use update_presentation_slide.',
    ],
    examples: [
      {
        intent: 'rename a presentation',
        data: { presentation_id: 'UUID', name: 'The Test. The Practice.' },
      },
      {
        intent: 'replace the full presentation HTML bundle',
        data: {
          presentation_id: 'UUID',
          files: [
            { path: 'index.html', content: '<!doctype html><html>...</html>', role: 'entry' },
          ],
        },
      },
    ],
  },
  patch_presentation: {
    required: ['presentation_id'],
    optional: ['marker_id', 'patch_type', 'value', 'fallback_find', 'fallback_replace'],
    types: {
      presentation_id: 'string',
      marker_id: 'string',
      patch_type: 'string',
      value: 'string',
      fallback_find: 'string',
      fallback_replace: 'string',
    },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
    useWhen: [
      'Patch one marked element in presentation TSX.',
      'Patch one exact text snippet via fallback_find and fallback_replace.',
    ],
    doNotUseWhen: ['Renaming the presentation artifact; use update_presentation with name.'],
    examples: [
      {
        intent: 'patch marked headline text',
        data: {
          presentation_id: 'UUID',
          marker_id: 'slide3.headline',
          patch_type: 'text',
          value: 'New headline',
        },
      },
      {
        intent: 'fallback find and replace',
        data: {
          presentation_id: 'UUID',
          fallback_find: 'Old text',
          fallback_replace: 'New text',
        },
      },
    ],
  },
  update_presentation_slide: {
    required: ['presentation_id', 'slide_index', 'generated_html'],
    optional: [],
    types: { presentation_id: 'string', slide_index: 'number', generated_html: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
    useWhen: ['Replace one slide by zero-based slide_index without touching other slides.'],
    examples: [
      {
        intent: 'replace slide 3',
        data: {
          presentation_id: 'UUID',
          slide_index: 2,
          generated_html: '<section key="resources">...</section>',
        },
      },
    ],
  },
  add_presentation_slide: {
    required: ['presentation_id', 'slide_index', 'generated_html'],
    optional: [],
    types: { presentation_id: 'string', slide_index: 'number', generated_html: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
    useWhen: ['Insert one new slide at a zero-based index. Use total slide count to append.'],
    examples: [
      {
        intent: 'append a new slide',
        data: {
          presentation_id: 'UUID',
          slide_index: 3,
          generated_html: '<section key="new-slide">...</section>',
        },
      },
    ],
  },
  list_presentation_files: {
    required: ['presentation_id'],
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  read_presentation_file: {
    required: ['presentation_id', 'path'],
    types: { presentation_id: 'string', path: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  write_presentation_file: {
    required: ['presentation_id', 'path', 'content'],
    optional: ['role'],
    strict: true,
    types: { presentation_id: 'string', path: 'string', content: 'string', role: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  patch_presentation_file: {
    required: ['presentation_id', 'path', 'find', 'replace'],
    strict: true,
    types: { presentation_id: 'string', path: 'string', find: 'string', replace: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  delete_presentation_file: {
    required: ['presentation_id', 'path'],
    types: { presentation_id: 'string', path: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  show_presentation_file: {
    required: ['presentation_id', 'path'],
    types: { presentation_id: 'string', path: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  list_presentation_assets: {
    required: ['presentation_id'],
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  attach_presentation_asset: {
    required: ['presentation_id', 'path', ['media_asset_id', 'asset_ref']],
    optional: ['asset_ref', 'role'],
    strict: true,
    types: {
      presentation_id: 'string',
      path: 'string',
      media_asset_id: 'string',
      asset_ref: 'object',
      role: 'string',
    },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  detach_presentation_asset: {
    required: ['presentation_id', 'path'],
    types: { presentation_id: 'string', path: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  apply_presentation_element_edit: {
    required: ['presentation_id', 'value'],
    optional: ['path', 'source_file', 'find', 'text_snapshot', 'source_hint', 'anchor_id'],
    strict: true,
    types: {
      presentation_id: 'string',
      value: 'string',
      path: 'string',
      source_file: 'string',
      find: 'string',
      text_snapshot: 'string',
      source_hint: 'string',
      anchor_id: 'string',
    },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
    useWhen: ['Apply a surgical HTML-first presentation edit from Markup/Edit context.'],
    doNotUseWhen: ['Replacing a full source file; use write_presentation_file instead.'],
  },
  add_presentation_anchor: {
    required: ['presentation_id', 'path', 'find', 'anchor_id'],
    strict: true,
    types: {
      presentation_id: 'string',
      path: 'string',
      find: 'string',
      anchor_id: 'string',
    },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  extract_presentation_tweaks: {
    required: ['presentation_id'],
    types: { presentation_id: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },
  update_presentation_tweaks: {
    required: ['presentation_id', 'path', 'content'],
    strict: true,
    types: { presentation_id: 'string', path: 'string', content: 'string' },
    resolvable: [{ field: 'presentation_id', fromArtifactType: 'presentation' }],
  },

  get_avatar: { required: ['avatar_id'] },
  delete_avatar: { required: ['avatar_id'] },
  update_avatar: {
    required: ['avatar_id'],
    resolvable: [{ field: 'avatar_id', fromArtifactType: 'avatar' }],
  },

  get_theme: { required: ['theme_id'] },
  delete_theme: { required: ['theme_id'] },
  update_theme: {
    required: ['theme_id'],
    resolvable: [{ field: 'theme_id', fromArtifactType: 'theme' }],
  },

  list_documents: {
    required: [],
    optional: [
      'space_id',
      'campaign_id',
      'scope',
      'parent_item_id',
      'doc_source',
      'search',
      'query',
      'limit',
    ],
    aliases: { query: 'search' },
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope: 'string',
      parent_item_id: 'string',
      doc_source: 'string',
      search: 'string',
      query: 'string',
      limit: 'number',
    },
  },
  save_document: {
    required: ['title', 'content'],
    optional: [
      'campaign_id',
      'space_id',
      'conversation_id',
      'document_type',
      'deliverable_id',
      ...DOCUMENT_SPACE_ITEM_INPUT_FIELD_KEYS,
    ],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      conversation_id: 'string',
      title: 'string',
      document_type: 'string',
      deliverable_id: 'string',
      ...DOCUMENT_SPACE_ITEM_FIELD_TYPES,
    },
    useWhen: ['Save a document into the active conversation, campaign, or space context.'],
    examples: [
      {
        intent: 'save a campaign document',
        data: { campaign_id: 'UUID', title: 'Brief', content: '# Brief\nNotes' },
      },
    ],
  },
  create_docx: {
    required: ['title', 'content'],
    optional: [
      'campaign_id',
      'space_id',
      'conversation_id',
      'document_type',
      'deliverable_id',
      'content_format',
      'file_name',
      ...DOCUMENT_SPACE_ITEM_INPUT_FIELD_KEYS,
    ],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      conversation_id: 'string',
      title: 'string',
      content: 'string',
      document_type: 'string',
      deliverable_id: 'string',
      content_format: 'string',
      file_name: 'string',
      ...DOCUMENT_SPACE_ITEM_FIELD_TYPES,
    },
    useWhen: ['Create a downloadable Word DOCX file from markdown, HTML, or plain text.'],
    examples: [
      {
        intent: 'create a Word document report',
        data: {
          title: 'Brief',
          content: '# Brief\n\n| Field | Value |\n| ----- | ----- |\n| A | 1 |',
          content_format: 'markdown',
        },
      },
    ],
  },
  get_document: {
    required: ['document_id'],
    optional: ['space_id', 'item_id', 'asset_id'],
    aliases: { item_id: 'document_id', asset_id: 'document_id' },
    types: { document_id: 'string', space_id: 'string', item_id: 'string', asset_id: 'string' },
    resolvable: [{ field: 'document_id', fromArtifactType: 'space_doc' }],
  },
  read_space_document: {
    required: ['space_id', 'document_id'],
    optional: ['item_id', 'limit'],
    aliases: { item_id: 'document_id' },
    types: { space_id: 'string', document_id: 'string', item_id: 'string', limit: 'number' },
    resolvable: [{ field: 'document_id', fromArtifactType: 'space_doc' }],
  },
  delete_document: { required: ['document_id'] },
  update_document: {
    required: ['document_id'],
    optional: [
      'title',
      'content',
      'document_type',
      'item_id',
      'asset_id',
      ...DOCUMENT_SPACE_ITEM_INPUT_FIELD_KEYS,
    ],
    aliases: { item_id: 'document_id', asset_id: 'document_id' },
    types: {
      document_id: 'string',
      title: 'string',
      document_type: 'string',
      item_id: 'string',
      asset_id: 'string',
      ...DOCUMENT_SPACE_ITEM_FIELD_TYPES,
    },
    useWhen: [
      'Update a document title, content, or document_type. Accepts the conversation document_id or the Space Doc item id; linked copies are kept in sync.',
    ],
    resolvable: [{ field: 'document_id', fromArtifactType: 'document' }],
  },
  list_emails: {
    required: [],
    optional: ['campaign_id', 'space_id', 'source_item_id', 'status', 'limit', 'scope_override'],
    types: {
      campaign_id: 'string',
      space_id: 'string',
      source_item_id: 'string',
      status: 'string',
      limit: 'number',
      scope_override: 'boolean',
    },
  },
  save_email: {
    required: ['subject', 'body', 'space_id', 'source_item_id'],
    optional: ['campaign_id', 'scope_override'],
    types: {
      subject: 'string',
      body: 'string',
      space_id: 'string',
      source_item_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
    },
  },
  get_email: {
    required: ['email_id'],
    types: { email_id: 'string' },
  },
  update_email: {
    required: ['email_id', ['subject', 'body']],
    optional: ['subject', 'body'],
    resolvable: [
      {
        field: 'email_id',
        fromArtifactType: 'email',
        parentField: 'sequence_id',
        parentArtifactType: 'sequence',
      },
    ],
    types: {
      email_id: 'string',
      subject: 'string',
      body: 'string',
    },
  },
  delete_email: {
    required: ['email_id'],
    types: { email_id: 'string' },
  },

  get_project: { required: ['project_id'] },
  create_file: { required: ['project_id', 'path'] },
  update_file: { required: ['project_id', 'path'] },
  read_file: { required: ['project_id', 'path'] },
  read_document: {
    required: [['asset_id', 'asset_ref']],
    optional: ['asset_ref', 'mode', 'page_range', 'query', 'max_pages', 'model_id'],
    types: {
      asset_id: 'string',
      asset_ref: 'object',
      mode: 'string',
      query: 'string',
      max_pages: 'number',
      model_id: 'string',
    },
  },
  analyze_image: {
    required: [['image_url', 'image_urls', 'asset_id', 'asset_ids', 'asset_ref', 'asset_refs']],
    optional: ['prompt', 'mode', 'max_images', 'url', 'urls', 'media_asset_id', 'media_asset_ids'],
    aliases: {
      image: 'image_url',
      url: 'image_url',
      urls: 'image_urls',
      media_asset_id: 'asset_id',
      media_asset_ids: 'asset_ids',
    },
    types: {
      image_url: 'string',
      image_urls: 'string_array',
      asset_id: 'string',
      asset_ids: 'string_array',
      asset_ref: 'object',
      asset_refs: 'object_array',
      prompt: 'string',
      mode: 'string',
      max_images: 'number',
      url: 'string',
      urls: 'string_array',
      media_asset_id: 'string',
      media_asset_ids: 'string_array',
    },
    descriptions: {
      image_url: 'Public image URL to inspect.',
      image_urls: 'Public image URLs to inspect, rank, compare, or summarize.',
      asset_id: 'Vibey media asset id for an uploaded or library image.',
      asset_ids: 'Vibey media asset ids for uploaded or library images.',
      asset_ref:
        'Stable uploaded or connected file handle. The action normalizer converts it to asset_id or image_url.',
      asset_refs:
        'Stable uploaded or connected file handles. The action normalizer converts them to asset_ids and image_urls.',
      prompt:
        'Specific visual analysis instruction, for example carousel ranking, image quality, text extraction, or brand fit.',
    },
    useWhen: [
      'Use for carousel photo selection, Drive image inspection, uploaded image analysis, and media-library image ranking.',
      'Use when the user asks what is in an image or which photos are best for a creative workflow.',
    ],
    doNotUseWhen: [
      'Do not ask the user for API keys or tokens. This action uses Vibey-managed tools.',
    ],
    examples: [
      {
        intent: 'Rank photos for a carousel',
        data: {
          image_urls: ['https://example.com/photo-1.jpg', 'https://example.com/photo-2.jpg'],
          prompt:
            'Rank these for an Instagram carousel. Return subject, quality, brand fit, and carousel_score.',
        },
      },
    ],
    strict: true,
  },
  delete_file: { required: ['project_id', 'path'] },
  list_project_files: { required: ['project_id'] },
  update_project_deps: { required: ['project_id'] },
  get_project_logs: { required: ['project_id'] },
  restart_project: { required: ['project_id'] },
  patch_file: { required: ['project_id', 'path'] },
  validate_project: { required: ['project_id'] },

  list_spaces: {
    required: [],
    optional: ['campaign_id', 'general', 'limit', 'scope_override'],
    types: {
      campaign_id: 'string',
      general: 'boolean',
      limit: 'number',
      scope_override: 'boolean',
    },
  },
  search_space_context: {
    required: ['query'],
    optional: [
      'space_id',
      'campaign_id',
      'mode',
      'source_types',
      'limit',
      'require_sufficient_context',
      'scope_override',
    ],
    types: {
      query: 'string',
      space_id: 'string',
      campaign_id: 'string',
      mode: 'string',
      source_types: 'string_array',
      limit: 'number',
      require_sufficient_context: 'boolean',
      scope_override: 'boolean',
    },
    descriptions: {
      query: 'Search phrase for semantic retrieval across the active Space.',
      space_id: 'Target Space id. Omit to use the active Space from the session.',
      campaign_id: 'Target campaign id. Omit to use the active campaign from the session.',
      mode: 'Retrieval mode: current_space, space_plus_related, or all_accessible.',
      source_types:
        'Optional array of Space source types such as space_doc, instagram_research_item, funnel, media_asset, channel_message, or campaign_overview_snapshot.',
      limit: 'Maximum number of ranked chunks to return.',
      require_sufficient_context:
        'When true, caller intends to use context_sufficient before answering.',
    },
    useWhen: [
      'Find what exists, what was decided, where something lives, or context across the active/current Space before calling exact get/read/list actions.',
    ],
    doNotUseWhen: [
      'Listing records for browsing/counting; use list_spaces, list_tasks, or list_documents.',
      'Mutating tasks, docs, missions, or artifacts.',
      'Reading a known document/task/mission id; use the exact get/read action.',
    ],
    examples: [
      {
        intent: 'search this Space for retainer scope guardrails',
        data: { query: 'retainer scope guardrails', limit: 10 },
      },
    ],
  },
  get_space: {
    required: ['space_id'],
    optional: ['scope_override'],
    types: { space_id: 'string', scope_override: 'boolean' },
  },
  create_space_field: {
    required: ['space_id', 'name', 'type'],
    optional: ['campaign_id', 'scope_override', 'field_id', 'options', 'visible_in_view_ids'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      field_id: 'string',
      name: 'string',
      type: 'string',
      options: 'object_array',
      visible_in_view_ids: 'string_array',
    },
    allowedValues: {
      type: [
        'select',
        'multi_select',
        'text',
        'date',
        'number',
        'checkbox',
        'currency',
        'url',
        'email',
        'phone',
        'rating',
        'progress',
        'media',
        'contact',
      ],
    },
    descriptions: {
      space_id: 'Target Space id. Omit only when the active Space scope will inject it.',
      name: 'Human-visible field name.',
      type: 'Creatable user field type.',
      field_id: 'Optional schema field id. If omitted, backend generates one from name.',
      options: 'Select or multi-select options, each with label and optional id, color, group.',
      visible_in_view_ids: 'Existing view ids where the field should be made visible.',
    },
  },
  update_space_field: {
    required: ['space_id', 'field_id'],
    optional: ['campaign_id', 'scope_override', 'name', 'options', 'visible_in_view_ids'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      field_id: 'string',
      name: 'string',
      options: 'object_array',
      visible_in_view_ids: 'string_array',
    },
    descriptions: {
      space_id: 'Target Space id. Omit only when the active Space scope will inject it.',
      field_id: 'Existing schema field id.',
      name: 'New field name. System fields cannot be renamed.',
      options: 'Replacement select or multi-select options array.',
      visible_in_view_ids: 'Existing view ids where the field should be made visible.',
    },
  },
  append_space_field_option: {
    required: ['space_id', 'field_id', 'label'],
    optional: ['campaign_id', 'scope_override', 'id', 'color', 'group'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      field_id: 'string',
      id: 'string',
      label: 'string',
      color: 'string',
      group: 'string',
    },
    descriptions: {
      space_id: 'Target Space id.',
      field_id: 'Existing select or multi-select schema field id.',
      id: 'Optional option id. If omitted, backend generates one from label.',
      label: 'Human-visible option label to append.',
      color: 'Optional option color token/name.',
      group: 'Optional option group label.',
    },
  },
  create_space_status: {
    required: ['space_id', 'label'],
    optional: ['campaign_id', 'scope_override', 'id', 'color', 'group'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      id: 'string',
      label: 'string',
      color: 'string',
      group: 'string',
    },
    descriptions: {
      space_id: 'Target Space id.',
      label: 'Status label to append to the system status field.',
      id: 'Optional status id. If omitted, backend generates one from label.',
      color: 'Optional status color token/name.',
      group: 'Optional status group label.',
    },
  },
  create_space_category: {
    required: ['space_id', 'label'],
    optional: ['campaign_id', 'scope_override', 'field_id', 'id', 'color', 'group'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      field_id: 'string',
      id: 'string',
      label: 'string',
      color: 'string',
      group: 'string',
    },
    descriptions: {
      space_id: 'Target Space id.',
      field_id:
        'Optional category select field id. Defaults to category and creates it if missing.',
      label: 'Category label to append.',
      id: 'Optional category option id. If omitted, backend generates one from label.',
      color: 'Optional category color token/name.',
      group: 'Optional category group label.',
    },
  },
  create_space_tag: {
    required: ['space_id', 'label'],
    optional: ['campaign_id', 'scope_override', 'id', 'color', 'group'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      id: 'string',
      label: 'string',
      color: 'string',
      group: 'string',
    },
    descriptions: {
      space_id: 'Target Space id.',
      label: 'Tag label to append to the system tags field.',
      id: 'Optional tag id. If omitted, backend generates one from label.',
      color: 'Optional tag color token/name.',
      group: 'Optional tag group label.',
    },
  },
  create_space_view: {
    required: ['space_id', 'name'],
    optional: [
      'campaign_id',
      'scope_override',
      'view_id',
      'view_type',
      'visible_field_ids',
      'filters',
      'config',
    ],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      view_id: 'string',
      name: 'string',
      view_type: 'string',
      visible_field_ids: 'string_array',
      filters: 'object',
      config: 'object',
    },
    descriptions: {
      space_id: 'Target Space id.',
      view_id: 'Optional view id. If omitted, backend generates one from name.',
      name: 'Human-visible view name.',
      view_type: 'Optional view type. Defaults to table.',
      visible_field_ids: 'Existing field ids visible in the new view.',
      filters: 'Optional view filter configuration object.',
      config: 'Optional view configuration object.',
    },
  },
  update_space_view: {
    required: ['space_id', 'view_id'],
    optional: [
      'campaign_id',
      'scope_override',
      'name',
      'view_type',
      'visible_field_ids',
      'filters',
      'config',
    ],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      view_id: 'string',
      name: 'string',
      view_type: 'string',
      visible_field_ids: 'string_array',
      filters: 'object',
      config: 'object',
    },
    descriptions: {
      space_id: 'Target Space id.',
      view_id: 'Existing Space view id.',
      name: 'New human-visible view name.',
      view_type: 'New view type.',
      visible_field_ids: 'Full replacement list of existing field ids visible in the view.',
      filters: 'Replacement view filter configuration object.',
      config: 'Replacement view configuration object.',
    },
  },
  run_social_research_search: {
    required: ['space_id', 'platform', 'query'],
    optional: ['campaign_id', 'scope_override', 'title', 'filters', 'cursor', 'save_top_n'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      platform: 'string',
      query: 'string',
      title: 'string',
      filters: 'object',
      cursor: 'string',
      save_top_n: 'number',
    },
    allowedValues: { platform: ['instagram', 'tiktok', 'youtube'] },
    descriptions: {
      space_id: 'Target Space id. Omit only when the active Space scope will inject it.',
      platform: 'Social research platform to search.',
      query: 'Topic or phrase to search in the same provider used by the manual view.',
      title: 'Optional saved-search title. Defaults to query.',
      filters: 'Optional saved-search metadata filters.',
      cursor: 'Optional next cursor from a prior social research search.',
      save_top_n: 'Optional count of top results to also save as Space items, maximum 25.',
    },
  },
  run_ads_research_search: {
    required: ['space_id', 'platform', 'kind', 'query'],
    optional: [
      'campaign_id',
      'scope_override',
      'title',
      'advertiser',
      'filters',
      'next_page_token',
      'save_top_n',
    ],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      platform: 'string',
      kind: 'string',
      query: 'string',
      title: 'string',
      advertiser: 'object',
      filters: 'object',
      next_page_token: 'string',
      save_top_n: 'number',
    },
    allowedValues: { platform: ['meta', 'tiktok', 'google'], kind: ['topic', 'brand'] },
    descriptions: {
      space_id: 'Target Space id. Omit only when the active Space scope will inject it.',
      platform: 'Ads research platform: meta, tiktok, or google.',
      kind: 'Search type. Google supports brand only; brand searches require advertiser.',
      query: 'Topic query or brand label saved with the search.',
      advertiser: 'Advertiser object from search_ads_research_advertisers for brand searches.',
      filters: 'Optional saved-search filters such as country or exact_phrase.',
      next_page_token: 'Optional next page token from a prior ad search.',
      save_top_n: 'Optional count of top ads to also save as Space items, maximum 25.',
    },
  },
  search_ads_research_advertisers: {
    required: ['space_id', 'platform', 'query'],
    optional: ['campaign_id', 'scope_override'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      platform: 'string',
      query: 'string',
    },
    allowedValues: { platform: ['meta', 'tiktok', 'google'] },
    descriptions: {
      space_id: 'Target Space id. Omit only when the active Space scope will inject it.',
      platform: 'Ads research platform to search for advertisers.',
      query: 'Brand or advertiser name.',
    },
  },
  list_contacts: {
    required: [],
    optional: [
      'search',
      'query',
      'sort',
      'limit',
      'offset',
      'filters',
      'include_archived',
      'includeArchived',
      'contact_type',
      'contactType',
      'campaign_id',
      'campaignId',
    ],
    aliases: {
      query: 'search',
      includeArchived: 'include_archived',
      contactType: 'contact_type',
      campaignId: 'campaign_id',
    },
    strict: true,
    types: {
      search: 'string',
      query: 'string',
      sort: 'string',
      limit: 'number',
      offset: 'number',
      filters: 'object',
      include_archived: 'boolean',
      includeArchived: 'boolean',
      contact_type: 'string',
      contactType: 'string',
      campaign_id: 'string',
      campaignId: 'string',
    },
    descriptions: {
      search: 'Search email, first name, last name, phone, or business name.',
      filters: 'CRM filter object matching the Contacts drawer filter shape.',
      include_archived: 'When true, list archived contacts instead of active contacts.',
      contact_type: 'Optional contact classification such as lead or customer.',
      campaign_id: 'Optional campaign membership scope.',
    },
    useWhen: ['List organization CRM contacts with optional CRM filters or campaign scope.'],
  },
  get_contact: {
    required: ['contact_id'],
    aliases: { id: 'contact_id' },
    strict: true,
    types: { contact_id: 'string', id: 'string' },
    resolvable: [{ field: 'contact_id', fromArtifactType: 'contact' }],
  },
  create_contact: {
    required: ['email'],
    optional: ['first_name', 'last_name', 'phone'],
    strict: true,
    types: {
      email: 'string',
      first_name: 'string',
      last_name: 'string',
      phone: 'string',
    },
    descriptions: {
      email: 'Required valid email address. The handler lowercases it and prevents duplicates.',
      first_name: 'Optional first name accepted by the current Contacts create API.',
      last_name: 'Optional last name accepted by the current Contacts create API.',
      phone: 'Optional phone accepted by the current Contacts create API.',
    },
    useWhen: ['Create a minimal manual org-scoped CRM contact.'],
    doNotUseWhen: [
      'Do not send tags, custom_fields, business fields, address fields, contact_type, or contact_source on create; create first, then update_contact.',
    ],
  },
  update_contact: {
    required: ['contact_id'],
    optional: [
      'id',
      'first_name',
      'last_name',
      'phone',
      'email',
      'tags',
      'custom_fields',
      'source',
      'business_name',
      'website',
      'address',
      'city',
      'state',
      'country',
      'contact_type',
      'contact_type_source',
      'contact_type_confidence',
      'contact_type_set_at',
      'contact_source',
      'contact_source_detail',
      'confirm_replace_arrays',
      'confirmReplaceArrays',
    ],
    aliases: { id: 'contact_id', confirmReplaceArrays: 'confirm_replace_arrays' },
    strict: true,
    types: {
      contact_id: 'string',
      id: 'string',
      first_name: 'string',
      last_name: 'string',
      phone: 'string',
      email: 'string',
      tags: 'string_array',
      custom_fields: 'object',
      source: 'string',
      business_name: 'string',
      website: 'string',
      address: 'string',
      city: 'string',
      state: 'string',
      country: 'string',
      contact_type: 'string',
      contact_type_source: 'string',
      contact_type_confidence: 'number',
      contact_type_set_at: 'iso_date',
      contact_source: 'string',
      contact_source_detail: 'string',
      confirm_replace_arrays: 'boolean',
      confirmReplaceArrays: 'boolean',
    },
    allowedValues: {
      contact_source: [
        'funnel',
        'form',
        'widget',
        'telegram',
        'import',
        'manual',
        'automation',
        'integration',
      ],
    },
    descriptions: {
      contact_id: 'Contacts table id.',
      tags: 'Replacement tag array. Read current tags first before appending.',
      custom_fields: 'Replacement custom fields object for this contact.',
      confirm_replace_arrays:
        'Required true when tags or custom_fields are supplied, because those fields replace existing values.',
      contact_source: 'Canonical contact source channel.',
      contact_source_detail: 'Optional detail for the canonical contact source.',
    },
    useWhen: ['Update allowed CRM contact fields after the contact already exists.'],
    retryGuidance: [
      'If replacing tags or custom_fields, first read the contact and then pass confirm_replace_arrays: true with the intended complete replacement value.',
    ],
    resolvable: [{ field: 'contact_id', fromArtifactType: 'contact' }],
  },
  add_contact_note: {
    required: ['contact_id', 'content'],
    optional: ['id', 'card_tint', 'cardTint'],
    aliases: { id: 'contact_id', cardTint: 'card_tint' },
    strict: true,
    types: {
      contact_id: 'string',
      id: 'string',
      content: 'string',
      card_tint: 'string',
      cardTint: 'string',
    },
    allowedValues: {
      card_tint: [...NOTE_CARD_TINT_VALUES],
      cardTint: [...NOTE_CARD_TINT_VALUES],
    },
    descriptions: {
      contact_id: 'Contacts table id.',
      content: 'Required note text. Empty or whitespace-only content is rejected.',
      card_tint: 'Optional note color tint used by the CRM note card UI.',
    },
    useWhen: ['Add an internal note to an existing org-scoped CRM contact.'],
    doNotUseWhen: [
      'Do not use for outbound emails or chat messages; use the appropriate communication action instead.',
    ],
    resolvable: [{ field: 'contact_id', fromArtifactType: 'contact' }],
  },
  update_contact_note: {
    required: ['contact_id', 'note_id'],
    optional: ['id', 'content', 'card_tint', 'cardTint'],
    aliases: { id: 'contact_id', cardTint: 'card_tint' },
    strict: true,
    types: {
      contact_id: 'string',
      id: 'string',
      note_id: 'string',
      content: 'string',
      card_tint: 'string',
      cardTint: 'string',
    },
    allowedValues: {
      card_tint: [...NOTE_CARD_TINT_VALUES],
      cardTint: [...NOTE_CARD_TINT_VALUES],
    },
    descriptions: {
      contact_id: 'Contacts table id.',
      note_id: 'Contact note id from get_contact_activity.',
      content: 'Optional replacement note text. Empty or whitespace-only content is rejected.',
      card_tint: 'Optional replacement note color tint used by the CRM note card UI.',
    },
    useWhen: ['Update the content or tint of an existing CRM contact note.'],
    doNotUseWhen: [
      'Do not use without a note_id; read get_contact_activity first when the note id is unknown.',
    ],
    retryGuidance: [
      'If note_id is unknown, call get_contact_activity for the contact and choose the exact contact note id before retrying.',
    ],
    resolvable: [{ field: 'contact_id', fromArtifactType: 'contact' }],
  },
  get_contact_activity: {
    required: ['contact_id'],
    optional: ['id', 'limit', 'offset'],
    aliases: { id: 'contact_id' },
    strict: true,
    types: {
      contact_id: 'string',
      id: 'string',
      limit: 'number',
      offset: 'number',
    },
    descriptions: {
      contact_id: 'Contacts table id.',
      limit: 'Maximum timeline events to return. Defaults to 100, maximum 200.',
      offset: 'Zero-based timeline event offset.',
    },
    useWhen: [
      'Read CRM contact timeline activity: notes, field changes, funnel/campaign events, and conversation activity rollups.',
    ],
    resolvable: [{ field: 'contact_id', fromArtifactType: 'contact' }],
  },
  list_contact_communications: {
    required: ['contact_id'],
    optional: ['id', 'limit', 'offset', 'include_email_bodies', 'includeEmailBodies', 'channel'],
    aliases: { id: 'contact_id', includeEmailBodies: 'include_email_bodies' },
    strict: true,
    types: {
      contact_id: 'string',
      id: 'string',
      limit: 'number',
      offset: 'number',
      include_email_bodies: 'boolean',
      includeEmailBodies: 'boolean',
      channel: 'string',
    },
    allowedValues: { channel: ['email', 'widget', 'telegram', 'app'] },
    descriptions: {
      contact_id: 'Contacts table id.',
      include_email_bodies:
        'When true, include email HTML bodies. Omit for lighter communication summaries.',
      channel:
        'Optional filter. email returns emails only; widget, telegram, or app return matching conversations.',
    },
    useWhen: [
      'List communication records for a contact, including emails and widget/Telegram/app conversations.',
    ],
    resolvable: [{ field: 'contact_id', fromArtifactType: 'contact' }],
  },
  search_flow_capabilities: {
    required: [],
    optional: ['space_id', 'campaign_id', 'query', 'kind', 'category', 'limit', 'cursor'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      query: 'string',
      kind: 'string',
      category: 'string',
      limit: 'number',
      cursor: 'string',
    },
    allowedValues: {
      kind: ['trigger', 'action'],
    },
    useWhen: ['Search bounded trigger/action capabilities before drafting or editing a flow.'],
    doNotUseWhen: ['Do not list all capabilities without query, category, or limit.'],
    examples: [
      {
        intent: 'find status based triggers',
        data: { query: 'status change', kind: 'trigger', limit: 10 },
      },
    ],
  },
  get_flow_capability: {
    required: ['capability_id'],
    optional: ['space_id', 'campaign_id'],
    strict: true,
    types: { capability_id: 'string', space_id: 'string', campaign_id: 'string' },
  },
  list_flows: {
    required: ['space_id'],
    optional: ['campaign_id', 'limit'],
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', limit: 'number' },
  },
  get_flow: {
    required: ['space_id', 'automation_id'],
    optional: ['campaign_id'],
    aliases: { flow_id: 'automation_id' },
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', automation_id: 'string' },
  },
  create_flow_draft: {
    required: ['space_id', 'name', 'trigger', 'actions'],
    optional: ['campaign_id'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      name: 'string',
      trigger: 'object',
      actions: 'object_array',
    },
  },
  update_flow_draft: {
    required: ['space_id', 'automation_id'],
    optional: ['campaign_id', 'name', 'trigger', 'actions'],
    aliases: { flow_id: 'automation_id' },
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      automation_id: 'string',
      name: 'string',
      trigger: 'object',
      actions: 'object_array',
    },
  },
  validate_flow_draft: {
    required: ['space_id', ['automation_id', 'flow']],
    optional: ['campaign_id', 'name', 'trigger', 'actions'],
    aliases: { flow_id: 'automation_id' },
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      automation_id: 'string',
      flow: 'object',
      name: 'string',
      trigger: 'object',
      actions: 'object_array',
    },
  },
  publish_flow: {
    required: ['space_id', 'automation_id'],
    optional: ['campaign_id'],
    aliases: { flow_id: 'automation_id' },
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', automation_id: 'string' },
  },
  get_flow_build_context: {
    required: ['space_id'],
    optional: ['campaign_id', 'query'],
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', query: 'string' },
  },
  create_flow_clarification: {
    required: ['questions'],
    optional: ['space_id', 'campaign_id', 'session_id', 'intent', 'title', 'intro_message'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      session_id: 'string',
      intent: 'string',
      title: 'string',
      intro_message: 'string',
      questions: 'object_array',
    },
    descriptions: {
      questions:
        'Flow-owned pre-plan questions using the chat clarification card shape: id, text, type, options, required.',
      session_id:
        'Server-managed in /flows. Omit this during normal Loop builds; the backend attaches the active build session.',
    },
    useWhen: [
      'Use before create_flow_plan when a required human choice is still unresolved.',
      'Use instead of generic clarification actions for Loop Flow builds.',
    ],
  },
  create_flow_plan: {
    required: ['space_id', 'intent'],
    optional: [
      'campaign_id',
      'name',
      'mode',
      'target_automation_id',
      'trigger',
      'actions',
      'trace_events',
    ],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      intent: 'string',
      name: 'string',
      mode: 'string',
      target_automation_id: 'string',
      trigger: 'object',
      actions: 'object_array',
      trace_events: 'object_array',
    },
    descriptions: {
      intent:
        'Short 1-2 sentence summary of the outcome. Never put Step 1/Step 2 workflow write-ups or branching logic here; use trigger and actions.',
      trigger:
        'Use IDs and option values resolved from get_flow_build_context or exact list/get actions. Do not ask the user for internal IDs.',
      actions:
        'Use payloads backed by capability search and resolved context. Missing human choices belong in create_flow_clarification before planning.',
    },
    useWhen: [
      'Create the durable Loop build plan only after required pre-plan clarifications are answered or unnecessary.',
      'Always include trigger and actions on create_flow_plan. Do not save narrative-only plans with empty trigger/actions.',
      'Do not include question fields on the plan. Use create_flow_clarification first when human choices are missing.',
    ],
  },
  update_flow_plan: {
    required: ['plan'],
    optional: ['space_id', 'campaign_id', 'session_id'],
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', session_id: 'string', plan: 'object' },
    descriptions: {
      session_id:
        'Server-managed in /flows. Omit this during normal Loop builds; the backend attaches the active build session.',
    },
  },
  answer_flow_clarification: {
    required: ['answers'],
    optional: ['space_id', 'campaign_id', 'session_id'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      session_id: 'string',
      answers: 'object',
    },
  },
  validate_flow_plan: {
    required: [],
    optional: ['space_id', 'campaign_id', 'session_id'],
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', session_id: 'string' },
  },
  compile_flow_plan: {
    required: [],
    optional: ['space_id', 'campaign_id', 'session_id', 'allow_invalid_draft'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      session_id: 'string',
      allow_invalid_draft: 'boolean',
    },
  },
  list_flow_blueprints: {
    required: ['space_id'],
    optional: ['campaign_id', 'limit'],
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', limit: 'number' },
  },
  get_flow_blueprint: {
    required: ['blueprint_id'],
    optional: ['space_id', 'campaign_id'],
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', blueprint_id: 'string' },
  },
  create_flow_blueprint_draft: {
    required: ['space_id', 'name', 'action_template'],
    optional: [
      'campaign_id',
      'description',
      'category',
      'input_schema',
      'required_contexts',
      'output_contexts',
    ],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      name: 'string',
      description: 'string',
      category: 'string',
      input_schema: 'object',
      action_template: 'object',
      required_contexts: 'string_array',
      output_contexts: 'string_array',
    },
  },
  validate_flow_blueprint: {
    required: ['blueprint_id'],
    optional: ['space_id', 'campaign_id'],
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', blueprint_id: 'string' },
  },
  activate_flow_blueprint: {
    required: ['blueprint_id'],
    optional: ['space_id', 'campaign_id'],
    strict: true,
    types: { space_id: 'string', campaign_id: 'string', blueprint_id: 'string' },
  },
  evaluate_flow_plan: {
    required: [],
    optional: ['space_id', 'campaign_id', 'session_id', 'scenario_key', 'prompt'],
    strict: true,
    types: {
      space_id: 'string',
      campaign_id: 'string',
      session_id: 'string',
      scenario_key: 'string',
      prompt: 'string',
    },
  },
  list_space_views: {
    required: ['space_id'],
    optional: ['view_type', 'scope_override'],
    types: { space_id: 'string', view_type: 'string', scope_override: 'boolean' },
  },
  get_space_view: {
    required: ['space_id', 'view_id'],
    optional: ['scope_override'],
    types: { space_id: 'string', view_id: 'string', scope_override: 'boolean' },
  },
  list_space_view_items: {
    required: ['space_id', 'view_id'],
    optional: [
      'filters',
      'status',
      'category',
      'priority',
      'assignee_id',
      'parent_item_id',
      'item_type',
      'doc_source',
      'source',
      'search',
      'query',
      'limit',
      'include_count',
      'fields',
      'sort_by',
      'sort_direction',
      'scope_override',
    ],
    aliases: { query: 'search' },
    types: {
      space_id: 'string',
      view_id: 'string',
      filters: 'object',
      status: 'string',
      category: 'string',
      priority: 'string',
      assignee_id: 'string',
      parent_item_id: 'string',
      item_type: 'string',
      doc_source: 'string',
      source: 'string',
      search: 'string',
      query: 'string',
      limit: 'number',
      include_count: 'boolean',
      fields: 'string',
      sort_by: 'string',
      sort_direction: 'string',
      scope_override: 'boolean',
    },
  },
  get_space_item: {
    required: ['space_id', 'item_id'],
    optional: ['include_activity', 'scope_override'],
    aliases: { task_id: 'item_id', document_id: 'item_id' },
    types: {
      space_id: 'string',
      item_id: 'string',
      task_id: 'string',
      document_id: 'string',
      include_activity: 'boolean',
      scope_override: 'boolean',
    },
  },
  generate_visual_html: {
    required: ['item_id'],
    optional: ['space_id', 'style_hint', 'prompt', 'force'],
    types: {
      item_id: 'string',
      space_id: 'string',
      style_hint: 'string',
      prompt: 'string',
      force: 'boolean',
    },
  },
  list_tasks: {
    required: ['space_id'],
    optional: [
      'status',
      'category',
      'filters',
      'assignee_id',
      'assigned_to_me',
      'parent_item_id',
      'include_closed',
      'limit',
      'include_count',
      'fields',
      'search',
      'query',
      'sort_by',
      'sort_direction',
      'scope_override',
    ],
    aliases: { query: 'search' },
    types: {
      space_id: 'string',
      status: 'string',
      category: 'string',
      filters: 'object',
      assignee_id: 'string',
      assigned_to_me: 'boolean',
      parent_item_id: 'string',
      include_closed: 'boolean',
      limit: 'number',
      include_count: 'boolean',
      fields: 'string',
      search: 'string',
      query: 'string',
      sort_by: 'string',
      sort_direction: 'string',
      scope_override: 'boolean',
    },
  },
  get_task: {
    required: ['space_id', 'task_id'],
    optional: ['scope_override'],
    types: { space_id: 'string', task_id: 'string', scope_override: 'boolean' },
  },
  create_task: {
    required: ['title'],
    optional: [
      'space_id',
      'campaign_id',
      'scope_override',
      'status',
      'priority',
      'category',
      'assignee_type',
      'assignee_id',
      'assignee_name',
      'assignee_email',
      'start_date',
      'due_date',
      'description',
      'notes',
      'custom_data',
      'attachments',
      'parent_item_id',
      'sort_order',
      'recurrence',
    ],
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      title: 'string',
      status: 'string',
      priority: 'string',
      category: 'string',
      assignee_type: 'string',
      assignee_id: 'string',
      assignee_name: 'string',
      assignee_email: 'string',
      start_date: 'iso_date',
      due_date: 'iso_date',
      description: 'string',
      notes: 'string',
      attachments: 'object_array',
      parent_item_id: 'string',
      sort_order: 'number',
    },
  },
  update_task: {
    required: ['space_id', 'task_id'],
    optional: [
      'campaign_id',
      'scope_override',
      'title',
      'status',
      'priority',
      'category',
      'assignee_type',
      'assignee_id',
      'assignee_name',
      'assignee_email',
      'start_date',
      'due_date',
      'description',
      'notes',
      'custom_data',
      'parent_item_id',
      'sort_order',
      'recurrence',
    ],
    types: {
      space_id: 'string',
      campaign_id: 'string',
      scope_override: 'boolean',
      task_id: 'string',
      title: 'string',
      status: 'string',
      priority: 'string',
      category: 'string',
      assignee_type: 'string',
      assignee_id: 'string',
      assignee_name: 'string',
      assignee_email: 'string',
      start_date: 'iso_date',
      due_date: 'iso_date',
      description: 'string',
      notes: 'string',
      parent_item_id: 'string',
      sort_order: 'number',
    },
  },
  delete_task: {
    required: ['space_id', 'task_id'],
    optional: ['scope_override'],
    types: { space_id: 'string', task_id: 'string', scope_override: 'boolean' },
  },
  add_task_comment: {
    required: ['space_id', 'task_id', 'message'],
    optional: ['mentions', 'attachments', 'scope_override'],
    types: { space_id: 'string', task_id: 'string', message: 'string', scope_override: 'boolean' },
  },

  create_mission: {
    required: ['title'],
    optional: [
      'brief',
      'description',
      'priority',
      'assigned_agent_key',
      'input',
      'idempotency_key',
      'parent_mission_id',
      'campaign_id',
      'space_id',
      'source_space_item_id',
    ],
    types: {
      title: 'string',
      brief: 'string',
      description: 'string',
      priority: 'string',
      assigned_agent_key: 'string',
      idempotency_key: 'string',
      parent_mission_id: 'string',
      campaign_id: 'string',
      space_id: 'string',
      source_space_item_id: 'string',
    },
    useWhen: ['Create a mission for Vibey to execute or track.'],
    examples: [{ intent: 'create a campaign mission', data: { title: 'Draft the launch brief' } }],
  },
  list_missions: {
    required: [],
    optional: ['status', 'campaign_id', 'limit'],
    types: { status: 'string', campaign_id: 'string', limit: 'number' },
    useWhen: ['List missions visible to the authenticated user.'],
    examples: [{ intent: 'list open missions', data: { status: 'inbox', limit: 10 } }],
  },
  get_mission: { required: ['mission_id'] },
  update_mission: { required: ['mission_id'] },
  add_mission_comment: { required: ['mission_id', 'message'] },
  list_mission_subtasks: { required: ['mission_id'] },
  update_mission_subtask: { required: ['mission_id', 'subtask_id'] },
  retry_mission: { required: ['mission_id'] },
  trash_mission: { required: ['mission_id'] },
  get_mission_plan: { required: ['mission_id'] },
  get_mission_logs: { required: ['mission_id'] },
  get_mission_deliverables: { required: ['mission_id'] },
  compile_webinar_launch_bible: {
    required: ['mission_id', 'title', 'tabs'],
    optional: [],
    strict: true,
    types: { mission_id: 'string', title: 'string', tabs: 'object_array' },
    useWhen: [
      'Compile the final approved Webinar Fulfillment assets into the ROAS Launch Bible tab structure, replacing template sample bodies with campaign-ready content. Client-facing copy must first pass Dylan Super Voice and contain zero em dashes. Video scripts and overlays must contain no editing timestamps or time ranges. P4 contains only on-page replay landing-page copy; replay delivery and post-webinar email/SMS belong in 7 - SMS & Emails.',
    ],
    examples: [
      {
        intent: 'compile the final webinar Launch Bible',
        data: {
          mission_id: 'UUID',
          title: 'Impact Elite Coaching — Webinar Launch Bible',
          tabs: [
            { title: '0 - Overview', html: '<h1>Overview</h1>' },
            { title: '3 - Funnel Pages', html: '<h1>Funnel Pages</h1>' },
            {
              title: 'P1 - Opt-in Page',
              parent_title: '3 - Funnel Pages',
              html: '<h1>Opt-in Page</h1>',
            },
          ],
        },
      },
    ],
  },
  answer_mission_question: { required: ['mission_id'], optional: ['question', 'message'] },
  summarize_mission_state: { required: ['mission_id'] },
  attach_mission_context: { required: ['mission_id'], optional: ['message', 'context'] },
  show_mission_deliverable: { required: ['mission_id'], optional: ['deliverable_id'] },
  create_mission_subtask: {
    required: ['mission_id', 'title'],
    optional: [
      'assignTo',
      'assigned_agent_key',
      'dependsOn',
      'intent',
      'publishToTaskList',
      'subtask',
    ],
    types: { dependsOn: 'string_array', publishToTaskList: 'boolean' },
  },
  edit_mission_subtask: {
    required: ['mission_id', 'subtask_id'],
    optional: ['title', 'assigned_agent_key', 'dependsOn', 'intent'],
    types: { dependsOn: 'string_array' },
  },
  cancel_mission_subtask: { required: ['mission_id', 'subtask_id'] },
  retry_mission_subtask: { required: ['mission_id', 'subtask_id'] },
  reassign_mission_subtask: {
    required: ['mission_id', 'subtask_id', ['assigned_agent_key', 'assignTo']],
  },
  prepare_mission_replan: { required: ['mission_id'], optional: ['reason'] },
  approve_mission: { required: ['mission_id'], optional: ['feedback'] },

  create_agent: {
    required: ['agent_key', 'name', 'role'],
    optional: [
      'level',
      'specialty',
      'soul',
      'role_content',
      'identity',
      'team_id',
      'skills',
      'skill_seed_key',
      'clone_skills_from',
      'clone_skill_keys',
    ],
    types: {
      agent_key: 'string',
      name: 'string',
      role: 'string',
      level: 'string',
      specialty: 'string',
      soul: 'string',
      role_content: 'string',
      identity: 'string',
      team_id: 'string',
      skill_seed_key: 'string',
      clone_skills_from: 'string',
    },
    useWhen: [
      'Create a new managed team agent after list_team confirms the agent does not already exist.',
      'Do not pass skill fields unless the user explicitly asked for skills or approved skill cloning.',
    ],
    doNotUseWhen: [
      'The agent already exists; use get_agent, then update_agent if changes are needed.',
      'The user wants a C-level agent; C-level agents are platform-managed.',
    ],
    examples: [
      {
        intent: 'create a clean employee agent without skills',
        data: {
          agent_key: 'business_growth_consultant',
          name: 'Hormozi',
          role: 'Business Growth Consultant',
          level: 'employee',
          specialty: 'Offer design, revenue diagnosis, sales strategy, and scaling decisions',
          soul: '# SOUL.md - Business Growth Consultant\n\n...',
          role_content: '# ROLE.md - Business Growth Consultant\n\n...',
          identity: '# IDENTITY.md - Business Growth Consultant\n\n...',
        },
      },
    ],
  },
  get_agent: { required: ['agent_key'] },
  update_agent: {
    required: ['agent_key'],
    optional: ['name', 'role', 'soul', 'role_content', 'identity', 'change_summary'],
    types: { agent_key: 'string', change_summary: 'string' },
  },
  list_team: {
    required: [],
    useWhen: ['List available Vibey agents before choosing an agent_key for skill work.'],
  },
  list_agent_skills: {
    required: ['agent_key'],
    types: { agent_key: 'string' },
    useWhen: [
      'List existing skills for one agent before creating a new skill, so duplicate skill_key values are avoided.',
    ],
  },
  audit_team_agents_and_skills: {
    required: [],
    useWhen: [
      'HR-only compact audit of all team agents and their enabled skills before broad team capability analysis.',
    ],
  },
  compare_team_skill_coverage: {
    required: [],
    useWhen: ['HR-only compact comparison of skill coverage across team domains and agents.'],
  },
  summarize_agent_capabilities: {
    required: [],
    optional: ['agent_key'],
    types: { agent_key: 'string' },
    useWhen: ['HR-only compact summary of one agent or the full team capability surface.'],
  },
  create_agent_skill: {
    required: ['agent_key', 'skill_key', 'name', 'description', 'markdown_content'],
    types: {
      agent_key: 'string',
      skill_key: 'string',
      name: 'string',
      description: 'string',
      markdown_content: 'string',
    },
    useWhen: [
      'Create a new skill for an existing agent after list_agent_skills confirms the skill does not already exist.',
    ],
    doNotUseWhen: [
      'Updating an existing skill; this MCP surface intentionally does not expose skill editing.',
      'Creating a new agent; this MCP surface intentionally does not expose agent creation.',
    ],
    examples: [
      {
        intent: 'create a skill for an existing agent',
        data: {
          agent_key: 'copywriter',
          skill_key: 'offer_copy_reference',
          name: 'Offer Copy Reference',
          description: 'Writes offer copy using the attached reference material.',
          markdown_content: '# Offer Copy Reference\n\nUse the attached references before writing.',
        },
      },
    ],
  },
  update_agent_skill: {
    required: ['skill_id'],
    optional: [
      'agent_key',
      'skill_key',
      'name',
      'description',
      'markdown_content',
      'is_enabled',
      'change_summary',
    ],
    types: { agent_key: 'string', skill_id: 'string', change_summary: 'string' },
  },
  create_agent_skill_resource: {
    required: ['agent_key', 'skill_key', 'file_path', 'content'],
    types: {
      agent_key: 'string',
      skill_key: 'string',
      file_path: 'string',
      content: 'string',
    },
    useWhen: [
      'Attach text, markdown, or reference documentation to an existing skill.',
      'Use upload_agent_skill_image_reference instead when the reference is an image URL.',
    ],
    examples: [
      {
        intent: 'attach a markdown reference to a skill',
        data: {
          agent_key: 'copywriter',
          skill_key: 'offer_copy_reference',
          file_path: 'references/offer-notes.md',
          content: '# Offer Notes\n\nUse concise proof before claims.',
        },
      },
    ],
  },
  upload_skill_asset: {
    required: ['agent_key', 'skill_key', ['image_url', 'asset_ref']],
    optional: ['asset_ref', 'description'],
    types: {
      agent_key: 'string',
      skill_key: 'string',
      image_url: 'string',
      asset_ref: 'object',
      description: 'string',
    },
    descriptions: {
      image_url:
        'Public image URL to download, store in skill-assets, and attach to the skill as a resource.',
      asset_ref:
        'Stable uploaded or connected file handle. The action normalizer converts it to image_url.',
      description:
        'Human-readable label for the image reference. It is also used to form the stored resource path.',
    },
    useWhen: [
      'Attach an image reference to an existing agent skill from a URL.',
      'The backend downloads the image, stores it in skill-assets, creates a skill resource, and returns the public URL/resource.',
    ],
    examples: [
      {
        intent: 'attach an image reference to a skill',
        data: {
          agent_key: 'designer',
          skill_key: 'brand_visual_reference',
          image_url: 'https://example.com/reference.png',
          description: 'homepage-visual-reference.png',
        },
      },
    ],
  },

  ask_agent: { required: ['target_agent_key', 'prompt'] },
  delegate_to_agent: { required: ['target_agent_key', 'task_description'] },

  save_user_memory: {
    required: ['content', 'memory_type'],
    optional: [
      'source_type',
      'source_id',
      'source_title',
      'significance',
      'tags',
      'domain',
      'contact_id',
      ...BRAIN_TEMPORAL_OPTIONAL_KEYS,
    ],
    types: {
      content: 'string',
      memory_type: 'string',
      source_type: 'string',
      source_id: 'string',
      source_title: 'string',
      significance: 'number',
      domain: 'string',
      contact_id: 'string',
      ...BRAIN_TEMPORAL_PARAM_TYPES,
    },
  },
  atlas_save_brain_context: {
    required: ['target_brain', 'content'],
    optional: [
      'intent',
      'brain_id',
      'agent_key',
      'agent_id',
      'contact_id',
      'contactId',
      'customer_source_identity_id',
      'customerSourceIdentityId',
      'campaign_id',
      'space_id',
      'title',
      'source_type',
      'sourceType',
      'source_id',
      'sourceId',
      'source_title',
      'sourceTitle',
      'source_url',
      'sourceUrl',
      'source_identity',
      'sourceIdentity',
      'visitor_id',
      'visitorId',
      'telegram_chat_id',
      'telegramChatId',
      'meeting_id',
      'meetingId',
      'conversation_id',
      'conversationId',
      'object_type',
      'signal_type',
      'reason',
      'context_form',
      'confidence',
      'confidence_basis',
      ...COMPANY_TEMPORAL_OPTIONAL_KEYS,
    ],
    aliases: { targetBrain: 'target_brain', brainId: 'brain_id', contactId: 'contact_id' },
    types: {
      target_brain: 'string',
      targetBrain: 'string',
      content: 'string',
      intent: 'string',
      brain_id: 'string',
      brainId: 'string',
      agent_key: 'string',
      agent_id: 'string',
      contact_id: 'string',
      contactId: 'string',
      customer_source_identity_id: 'string',
      customerSourceIdentityId: 'string',
      campaign_id: 'string',
      space_id: 'string',
      title: 'string',
      source_type: 'string',
      sourceType: 'string',
      source_id: 'string',
      sourceId: 'string',
      source_title: 'string',
      sourceTitle: 'string',
      source_url: 'string',
      sourceUrl: 'string',
      source_identity: 'string',
      sourceIdentity: 'string',
      visitor_id: 'string',
      visitorId: 'string',
      telegram_chat_id: 'string',
      telegramChatId: 'string',
      meeting_id: 'string',
      meetingId: 'string',
      conversation_id: 'string',
      conversationId: 'string',
      object_type: 'string',
      signal_type: 'string',
      reason: 'string',
      context_form: 'string',
      confidence: 'number',
      confidence_basis: 'object',
      ...COMPANY_TEMPORAL_PARAM_TYPES,
    },
    useWhen: [
      'Save user-provided knowledge to the requested Brain/context surface without requiring the MCP client to know the low-level write schema.',
      'Preferred tool for "save this to my/customer/company/agent/campaign/space brain" requests.',
    ],
    doNotUseWhen: [
      'The user is only searching; use search_brains or a family-specific search tool.',
      'The user explicitly provided reviewed Company Cortex signal lineage, evidence, and retrieval rules for formation; use create_company_brain_object.',
    ],
  },
  search_user_brain: {
    required: ['query'],
    optional: ['brain_id', 'limit', ...BRAIN_TEMPORAL_SEARCH_KEYS],
    types: {
      query: 'string',
      brain_id: 'string',
      limit: 'number',
      ...BRAIN_TEMPORAL_SEARCH_TYPES,
    },
    useWhen: [
      'Search the selected/default User Brain for source-grounded memories, snapshots, related beliefs/pages, scores, and sufficiency signals.',
    ],
    doNotUseWhen: [
      'Searching an Agent, Customer, or Company Brain; use the family-specific Brain search action instead.',
    ],
  },
  search_brain_context: {
    required: ['query'],
    optional: [
      'families',
      'brain_ids',
      'brainIds',
      'limit',
      'include_related',
      'require_sufficient_context',
      ...BRAIN_TEMPORAL_SEARCH_KEYS,
    ],
    types: {
      query: 'string',
      limit: 'number',
      include_related: 'boolean',
      require_sufficient_context: 'boolean',
      ...BRAIN_TEMPORAL_SEARCH_TYPES,
    },
    useWhen: [
      'Explicitly search across accessible Brain families when the user asks to search all brains/everything/shared brains.',
    ],
    doNotUseWhen: [
      'The user asks for one specific Brain family; use search_user_brain, search_agent_brain, search_customer_brain, search_company_brain, or search_campaign_brain instead.',
      'The user asks for campaign / client knowledge stored on a campaign brain; use search_campaign_brain.',
      'The user refers to uploaded files, attachments, reports, spreadsheets, PDFs, generated documents, or data they previously provided in the active work; search or read Space/document sources first because those usually have exact retrievable objects.',
      'This agent does not have access to the requested Brain family (user requires Read personal brain; agent/company/customer require the matching read_brain action domain).',
    ],
    examples: [
      {
        intent: 'search user and company brains together',
        data: { query: 'pricing decision', families: ['user', 'company'], limit: 10 },
      },
    ],
  },
  crystallize_user_brain: {
    required: ['text'],
    optional: ['input'],
    types: { text: 'string', input: 'string' },
  },
  ingest_user_brain_text: {
    required: [['text', 'content'], 'title'],
    optional: [...BRAIN_TEMPORAL_OPTIONAL_KEYS],
    types: { text: 'string', content: 'string', title: 'string', ...BRAIN_TEMPORAL_PARAM_TYPES },
  },
  ingest_user_brain_link: {
    required: ['url'],
    optional: ['title', ...BRAIN_TEMPORAL_OPTIONAL_KEYS],
    types: { url: 'string', title: 'string', ...BRAIN_TEMPORAL_PARAM_TYPES },
  },
  ingest_user_brain_document: {
    required: [['content', 'text']],
    optional: ['source_type', 'source_id', 'source_title', ...BRAIN_TEMPORAL_OPTIONAL_KEYS],
    types: {
      content: 'string',
      text: 'string',
      source_type: 'string',
      source_id: 'string',
      source_title: 'string',
      ...BRAIN_TEMPORAL_PARAM_TYPES,
    },
  },
  assign_user_memory_source: {
    required: ['new_source_title'],
    optional: ['memory_ids', 'match_source_title', 'match_orphan_source_title', 'new_source_id'],
    types: { new_source_title: 'string', match_source_title: 'string', new_source_id: 'string' },
  },
  list_user_brain_memories: { required: [], optional: ['limit'], types: { limit: 'number' } },
  list_available_brain_scopes: { required: [] },
  resolve_agent_brain: {
    required: [['agent_id', 'agent_key', 'brain_id']],
    optional: ['agent_id', 'agent_key', 'brain_id'],
    types: { agent_id: 'string', agent_key: 'string', brain_id: 'string' },
  },
  search_agent_brain: {
    required: ['query', 'brain_id'],
    optional: ['domain', 'limit', ...BRAIN_TEMPORAL_SEARCH_KEYS],
    types: {
      query: 'string',
      brain_id: 'string',
      domain: 'string',
      limit: 'number',
      ...BRAIN_TEMPORAL_SEARCH_TYPES,
    },
    useWhen: [
      'Search an Agent Brain by brain_id for source-grounded SK entries, scores, related context, and sufficiency signals.',
    ],
    doNotUseWhen: [
      'Searching a campaign / client knowledge brain; use search_campaign_brain with campaign_id (or campaign chat scope).',
    ],
  },
  search_campaign_brain: {
    required: ['query'],
    optional: [
      'campaign_id',
      'campaign_name',
      'brain_id',
      'limit',
      'scope_override',
      ...BRAIN_TEMPORAL_SEARCH_KEYS,
    ],
    types: {
      query: 'string',
      campaign_id: 'string',
      campaign_name: 'string',
      brain_id: 'string',
      limit: 'number',
      scope_override: 'boolean',
      ...BRAIN_TEMPORAL_SEARCH_TYPES,
    },
    useWhen: [
      'Search the campaign brain (ns_memories on the campaign-scoped ns_brains row) for client research, onboarding intake, strategy notes, or ROAS-brain package knowledge.',
      'Pre-call strategy, launch briefs, or any work that must use Impact/client knowledge stored on the campaign brain.',
      'Chat is on General but the user named a client campaign — pass campaign_id or campaign_name (cross-scope read is allowed).',
    ],
    doNotUseWhen: [
      'Searching an Agent Brain (use search_agent_brain), User Brain (search_user_brain), Customer Brain (search_customer_brain), or Company Brain (search_company_brain).',
      'Searching Space docs/tasks only (use search_space_context).',
      'Using the General campaign as target — General has no client package brain.',
    ],
    examples: [
      {
        intent: 'pull Impact campaign brain for pre-call strategy',
        data: {
          query: 'offer pricing ICP competitors onboarding form',
          campaign_id: 'c0a6bc09-9502-4b0e-9438-302ed1482531',
          limit: 15,
        },
      },
      {
        intent: 'read Impact campaign brain while Team chat is on General',
        data: {
          query: 'onboarding form offer ICP',
          campaign_name: 'Impact',
          limit: 15,
        },
      },
    ],
  },
  ingest_agent_brain_text: {
    required: ['brain_id', ['text', 'content'], 'title', ['source_type', 'sourceType']],
    optional: ['domain', 'source_type', ...BRAIN_TEMPORAL_OPTIONAL_KEYS],
    types: {
      brain_id: 'string',
      text: 'string',
      content: 'string',
      title: 'string',
      sourceType: 'string',
      source_type: 'string',
      domain: 'string',
      ...BRAIN_TEMPORAL_PARAM_TYPES,
    },
  },
  ingest_agent_brain_link: {
    required: ['brain_id', 'url'],
    optional: ['title', 'domain', 'sourceType', 'source_type', ...BRAIN_TEMPORAL_OPTIONAL_KEYS],
    types: {
      brain_id: 'string',
      url: 'string',
      title: 'string',
      domain: 'string',
      sourceType: 'string',
      source_type: 'string',
      ...BRAIN_TEMPORAL_PARAM_TYPES,
    },
  },
  list_agent_brain_domains: { required: ['brain_id'], types: { brain_id: 'string' } },
  get_agent_brain_gaps: { required: ['brain_id'], types: { brain_id: 'string' } },
  list_agent_brain_imports: {
    required: ['brain_id'],
    optional: ['source', 'limit'],
    types: { brain_id: 'string', source: 'string', limit: 'number' },
  },
  save_customer_memory: {
    required: ['content', 'memory_type'],
    optional: [
      'brain_id',
      'contact_id',
      'contactId',
      'customer_source_identity_id',
      'customerSourceIdentityId',
      'source_type',
      'sourceType',
      'source_id',
      'sourceId',
      'source_url',
      'sourceUrl',
      'source_title',
      'sourceTitle',
      'source_identity',
      'sourceIdentity',
      'conversation_id',
      'conversationId',
      'visitor_id',
      'visitorId',
      'telegram_chat_id',
      'telegramChatId',
      'meeting_id',
      'meetingId',
      'significance',
      'tags',
      'speaker',
      'metadata',
      ...BRAIN_TEMPORAL_OPTIONAL_KEYS,
    ],
    types: {
      content: 'string',
      memory_type: 'string',
      contact_id: 'string',
      contactId: 'string',
      customer_source_identity_id: 'string',
      customerSourceIdentityId: 'string',
      brain_id: 'string',
      source_type: 'string',
      sourceType: 'string',
      source_id: 'string',
      sourceId: 'string',
      source_url: 'string',
      sourceUrl: 'string',
      source_title: 'string',
      sourceTitle: 'string',
      source_identity: 'string',
      sourceIdentity: 'string',
      conversation_id: 'string',
      conversationId: 'string',
      visitor_id: 'string',
      visitorId: 'string',
      telegram_chat_id: 'string',
      telegramChatId: 'string',
      meeting_id: 'string',
      meetingId: 'string',
      significance: 'number',
      speaker: 'string',
      metadata: 'object',
      ...BRAIN_TEMPORAL_PARAM_TYPES,
    },
  },
  search_customer_brain: {
    required: ['query'],
    optional: ['brain_id', 'limit', ...BRAIN_TEMPORAL_SEARCH_KEYS],
    types: {
      query: 'string',
      brain_id: 'string',
      limit: 'number',
      ...BRAIN_TEMPORAL_SEARCH_TYPES,
    },
    useWhen: [
      'Search Customer Brain for source-grounded customer memories, avatar evidence, scores, and sufficiency signals.',
    ],
  },
  ingest_customer_brain_text: {
    required: [['text', 'content']],
    optional: [
      'brain_id',
      'contact_id',
      'contactId',
      'customer_source_identity_id',
      'customerSourceIdentityId',
      'title',
      'memory_type',
      'source_type',
      'sourceType',
      'source_id',
      'sourceId',
      'source_url',
      'sourceUrl',
      'source_title',
      'sourceTitle',
      'source_identity',
      'sourceIdentity',
      'conversation_id',
      'conversationId',
      'visitor_id',
      'visitorId',
      'telegram_chat_id',
      'telegramChatId',
      'meeting_id',
      'meetingId',
      'metadata',
      ...BRAIN_TEMPORAL_OPTIONAL_KEYS,
    ],
    types: {
      text: 'string',
      content: 'string',
      contact_id: 'string',
      contactId: 'string',
      customer_source_identity_id: 'string',
      customerSourceIdentityId: 'string',
      brain_id: 'string',
      title: 'string',
      memory_type: 'string',
      source_type: 'string',
      sourceType: 'string',
      source_id: 'string',
      sourceId: 'string',
      source_url: 'string',
      sourceUrl: 'string',
      source_title: 'string',
      sourceTitle: 'string',
      source_identity: 'string',
      sourceIdentity: 'string',
      conversation_id: 'string',
      conversationId: 'string',
      visitor_id: 'string',
      visitorId: 'string',
      telegram_chat_id: 'string',
      telegramChatId: 'string',
      meeting_id: 'string',
      meetingId: 'string',
      metadata: 'object',
      ...BRAIN_TEMPORAL_PARAM_TYPES,
    },
  },
  ingest_customer_brain_link: {
    required: ['url'],
    optional: [
      'brain_id',
      'contact_id',
      'contactId',
      'customer_source_identity_id',
      'customerSourceIdentityId',
      'title',
      'memory_type',
      'source_identity',
      'sourceIdentity',
      'visitor_id',
      'visitorId',
      'telegram_chat_id',
      'telegramChatId',
      'meeting_id',
      'meetingId',
      'conversation_id',
      'conversationId',
      'metadata',
      ...BRAIN_TEMPORAL_OPTIONAL_KEYS,
    ],
    types: {
      url: 'string',
      contact_id: 'string',
      contactId: 'string',
      customer_source_identity_id: 'string',
      customerSourceIdentityId: 'string',
      brain_id: 'string',
      title: 'string',
      memory_type: 'string',
      source_identity: 'string',
      sourceIdentity: 'string',
      visitor_id: 'string',
      visitorId: 'string',
      telegram_chat_id: 'string',
      telegramChatId: 'string',
      meeting_id: 'string',
      meetingId: 'string',
      conversation_id: 'string',
      conversationId: 'string',
      metadata: 'object',
      ...BRAIN_TEMPORAL_PARAM_TYPES,
    },
  },
  list_customer_brain_memories: {
    required: [],
    optional: ['brain_id', 'limit'],
    types: { brain_id: 'string', limit: 'number' },
  },
  list_customer_avatars: { required: [], optional: ['brain_id'], types: { brain_id: 'string' } },
  get_company_brain_objects: {
    required: [],
    optional: ['brain_id', 'object_type', 'status', 'limit'],
    types: { brain_id: 'string', object_type: 'string', status: 'string', limit: 'number' },
  },
  get_company_brain_object_edges: {
    required: [],
    optional: ['brain_id', 'source_object_id', 'target_object_id', 'relation_type', 'limit'],
    types: {
      brain_id: 'string',
      source_object_id: 'string',
      target_object_id: 'string',
      relation_type: 'string',
      limit: 'number',
    },
  },
  search_company_brain: {
    required: ['query'],
    optional: ['brain_id', 'limit', ...BRAIN_TEMPORAL_SEARCH_KEYS],
    types: {
      query: 'string',
      brain_id: 'string',
      limit: 'number',
      ...BRAIN_TEMPORAL_SEARCH_TYPES,
    },
    useWhen: [
      'Search Company Brain for source-grounded operating beliefs, standards, protocols, decisions, related company objects, scores, and sufficiency signals.',
    ],
  },
  propose_company_brain_signal: {
    required: [['truth', 'content']],
    optional: [
      'brain_id',
      'signal_type',
      'object_type',
      'scope',
      'evidence_refs',
      'confidence',
      'confidence_basis',
      'reason',
      'context_form',
      'source',
      'source_type',
      'source_id',
      'source_url',
      'source_title',
      'title',
      ...COMPANY_TEMPORAL_OPTIONAL_KEYS,
    ],
    types: {
      truth: 'string',
      content: 'string',
      brain_id: 'string',
      signal_type: 'string',
      object_type: 'string',
      scope: 'object',
      evidence_refs: 'object_array',
      confidence: 'number',
      confidence_basis: 'object',
      reason: 'string',
      context_form: 'string',
      source: 'string',
      source_type: 'string',
      source_id: 'string',
      source_url: 'string',
      source_title: 'string',
      title: 'string',
      ...COMPANY_TEMPORAL_PARAM_TYPES,
    },
    useWhen: [
      'Propose organization-level operating knowledge for human review before it becomes durable Company Brain knowledge.',
      'Preferred low-level Company Brain write action for MCP, agent, and Atlas save routes.',
    ],
    doNotUseWhen: [
      'The user is only searching; use search_company_brain.',
      'You are running reviewed Company Cortex formation with approved source_signal_ids and retrieval rules; use create_company_brain_object.',
    ],
  },
  create_company_brain_object: {
    required: [
      'object_type',
      'title',
      'truth',
      'source_signal_ids',
      'evidence_refs',
      'retrieval_rule',
    ],
    optional: [
      'brain_id',
      'status',
      'confidence',
      'confidence_basis',
      ...COMPANY_TEMPORAL_OPTIONAL_KEYS,
    ],
    types: {
      object_type: 'string',
      title: 'string',
      truth: 'string',
      brain_id: 'string',
      status: 'string',
      confidence: 'number',
      source_signal_ids: 'string_array',
      evidence_refs: 'object_array',
      retrieval_rule: 'object',
      confidence_basis: 'object',
      ...COMPANY_TEMPORAL_PARAM_TYPES,
    },
    useWhen: [
      'Create a durable Company Cortex object only from reviewed signal lineage during formation.',
    ],
    doNotUseWhen: [
      'Raw company knowledge is being saved from chat, MCP, documents, or activity; use propose_company_brain_signal.',
    ],
  },
  update_company_brain_object: {
    required: ['id'],
    optional: ['brain_id', 'title', 'truth', 'status', 'confidence'],
    types: {
      id: 'string',
      brain_id: 'string',
      title: 'string',
      truth: 'string',
      status: 'string',
      confidence: 'number',
    },
  },
  archive_company_brain_object: {
    required: ['id'],
    optional: ['brain_id'],
    types: { id: 'string', brain_id: 'string' },
  },
  create_company_brain_edge: {
    required: ['source_object_id', 'target_object_id', 'relation_type'],
    optional: ['brain_id', 'confidence'],
    types: {
      source_object_id: 'string',
      target_object_id: 'string',
      relation_type: 'string',
      brain_id: 'string',
      confidence: 'number',
    },
  },
  delete_company_brain_edge: {
    required: ['id'],
    optional: ['brain_id'],
    types: { id: 'string', brain_id: 'string' },
  },
  get_brain_pages: {
    required: ['brain_type'],
    optional: ['brain_id', 'slug', 'page_type', 'status', 'limit', 'cursor', 'include_content'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      slug: 'string',
      page_type: 'string',
      status: 'string',
      limit: 'number',
      cursor: 'string',
      include_content: 'boolean',
    },
  },
  get_brain_timelines: {
    required: ['brain_type'],
    optional: ['brain_id', 'timeline_type', 'target_type', 'target_id', 'status', 'limit'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      timeline_type: 'string',
      target_type: 'string',
      target_id: 'string',
      status: 'string',
      limit: 'number',
    },
  },
  get_brain_timeline_items: {
    required: ['brain_type', 'timeline_id'],
    optional: ['brain_id', 'limit'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      timeline_id: 'string',
      limit: 'number',
    },
  },
  create_brain_timeline: {
    required: ['brain_type', 'timeline_type', 'target_type', 'title'],
    optional: [
      'brain_id',
      'target_id',
      'summary',
      'status',
      'metadata',
      ...COMPANY_TEMPORAL_OPTIONAL_KEYS,
    ],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      timeline_type: 'string',
      target_type: 'string',
      target_id: 'string',
      title: 'string',
      summary: 'string',
      status: 'string',
      metadata: 'object',
      ...COMPANY_TEMPORAL_PARAM_TYPES,
    },
  },
  upsert_brain_timeline_items: {
    required: ['brain_type', 'timeline_id', 'items'],
    optional: ['brain_id'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      timeline_id: 'string',
      items: 'object_array',
    },
  },
  archive_brain_timeline: {
    required: ['brain_type', 'id'],
    optional: ['brain_id'],
    types: { brain_type: 'string', brain_id: 'string', id: 'string' },
  },
  create_brain_page: {
    required: ['brain_type', 'slug', 'title', 'content_md'],
    optional: ['brain_id', 'page_type', 'summary', 'tags', 'source_refs'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      slug: 'string',
      title: 'string',
      content_md: 'string',
      page_type: 'string',
      summary: 'string',
    },
  },
  patch_brain_page: {
    required: ['brain_type', 'id', 'operation', 'content'],
    optional: ['brain_id', 'section', 'heading', 'after', 'source_refs', 'summary'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      id: 'string',
      operation: 'string',
      content: 'string',
      section: 'string',
      heading: 'string',
      after: 'string',
      summary: 'string',
    },
  },
  update_brain_page: {
    required: ['brain_type', 'id'],
    optional: ['brain_id', 'content_md', 'summary', 'title', 'tags', 'source_refs'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      id: 'string',
      content_md: 'string',
      summary: 'string',
      title: 'string',
    },
  },
  archive_brain_page: {
    required: ['brain_type', 'id'],
    optional: ['brain_id'],
    types: { brain_type: 'string', brain_id: 'string', id: 'string' },
  },
  link_brain_pages: {
    required: ['brain_type', 'from_page_id', 'to_page_id'],
    optional: ['brain_id', 'link_type'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      from_page_id: 'string',
      to_page_id: 'string',
      link_type: 'string',
    },
  },
  unlink_brain_pages: {
    required: ['brain_type', 'from_page_id', 'to_page_id'],
    optional: ['brain_id'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      from_page_id: 'string',
      to_page_id: 'string',
    },
  },
  get_brain_log: {
    required: ['brain_type'],
    optional: ['brain_id', 'event_type', 'limit'],
    types: { brain_type: 'string', brain_id: 'string', event_type: 'string', limit: 'number' },
  },
  log_brain_event: {
    required: ['brain_type', 'event_type', 'summary'],
    optional: ['brain_id', 'affected_pages', 'source_ref', 'metadata'],
    types: { brain_type: 'string', brain_id: 'string', event_type: 'string', summary: 'string' },
  },
  get_brain_belief_patterns: {
    required: ['brain_type'],
    optional: ['brain_id', 'status', 'limit', 'cursor', 'include_details'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      status: 'string',
      limit: 'number',
      cursor: 'string',
      include_details: 'boolean',
    },
  },
  create_brain_belief_pattern: {
    required: ['brain_type', 'pattern_name', 'description'],
    optional: ['brain_id', 'emotional_signature', 'supporting_memories', 'strength', 'status'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      pattern_name: 'string',
      description: 'string',
      strength: 'number',
      status: 'string',
    },
  },
  update_brain_belief_pattern: {
    required: ['brain_type', 'id'],
    optional: [
      'brain_id',
      'pattern_name',
      'description',
      'strength',
      'status',
      'emotional_signature',
    ],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      id: 'string',
      pattern_name: 'string',
      description: 'string',
      strength: 'number',
      status: 'string',
    },
  },
  archive_brain_belief_pattern: {
    required: ['brain_type', 'id'],
    optional: ['brain_id'],
    types: { brain_type: 'string', brain_id: 'string', id: 'string' },
  },
  merge_brain_belief_patterns: {
    required: ['brain_type', 'primary_id', 'secondary_id'],
    optional: ['brain_id', 'description'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      primary_id: 'string',
      secondary_id: 'string',
      description: 'string',
    },
  },
  connect_brain_belief_to_memory: {
    required: ['brain_type', 'belief_id', 'memory_id'],
    optional: ['brain_id'],
    types: { brain_type: 'string', brain_id: 'string', belief_id: 'string', memory_id: 'string' },
  },
  disconnect_brain_belief_from_memory: {
    required: ['brain_type', 'belief_id', 'memory_id'],
    optional: ['brain_id'],
    types: { brain_type: 'string', brain_id: 'string', belief_id: 'string', memory_id: 'string' },
  },
  get_brain_perspectives: {
    required: ['brain_type'],
    optional: ['brain_id', 'status', 'limit', 'cursor', 'include_details'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      status: 'string',
      limit: 'number',
      cursor: 'string',
      include_details: 'boolean',
    },
  },
  create_brain_perspective: {
    required: ['brain_type', 'name', 'description'],
    optional: ['brain_id', 'narrative_md', 'beliefs', 'influence_areas', 'blind_spots', 'strength'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      name: 'string',
      description: 'string',
      narrative_md: 'string',
      blind_spots: 'string',
      strength: 'number',
    },
  },
  update_brain_perspective: {
    required: ['brain_type', 'id'],
    optional: [
      'brain_id',
      'name',
      'description',
      'narrative_md',
      'strength',
      'status',
      'blind_spots',
    ],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      id: 'string',
      name: 'string',
      description: 'string',
      narrative_md: 'string',
      strength: 'number',
      status: 'string',
      blind_spots: 'string',
    },
  },
  archive_brain_perspective: {
    required: ['brain_type', 'id'],
    optional: ['brain_id'],
    types: { brain_type: 'string', brain_id: 'string', id: 'string' },
  },
  connect_brain_belief_to_perspective: {
    required: ['brain_type', 'perspective_id', 'belief_id'],
    optional: ['brain_id'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      perspective_id: 'string',
      belief_id: 'string',
    },
  },
  disconnect_brain_belief_from_perspective: {
    required: ['brain_type', 'perspective_id', 'belief_id'],
    optional: ['brain_id'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      perspective_id: 'string',
      belief_id: 'string',
    },
  },
  get_brain_lint: {
    required: ['brain_type'],
    optional: ['brain_id', 'check_type', 'severity', 'resolved', 'limit'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      check_type: 'string',
      severity: 'string',
      resolved: 'boolean',
      limit: 'number',
    },
  },
  run_brain_lint: {
    required: ['brain_type'],
    optional: ['brain_id'],
    types: { brain_type: 'string', brain_id: 'string' },
  },
  resolve_brain_lint: {
    required: ['brain_type', 'id'],
    optional: ['brain_id'],
    types: { brain_type: 'string', brain_id: 'string', id: 'string' },
  },
  delete_brain_node: {
    required: ['brain_type', 'node_type', 'node_id'],
    optional: ['brain_id', 'agent_id'],
    types: {
      brain_type: 'string',
      brain_id: 'string',
      agent_id: 'string',
      node_type: 'string',
      node_id: 'string',
    },
  },
  transfer_brain_node: {
    required: ['operation', 'node_type', 'node_id', 'source_scope', 'target_scope'],
    optional: ['connected_node_ids', 'source_type', 'source_id', 'source_title'],
    types: {
      operation: 'string',
      node_type: 'string',
      node_id: 'string',
      source_type: 'string',
      source_id: 'string',
      source_title: 'string',
    },
  },
  transfer_brain_by_source: {
    required: ['operation', 'source_title', 'source_scope', 'target_scope'],
    optional: ['source_type', 'source_id'],
    types: {
      operation: 'string',
      source_title: 'string',
      source_type: 'string',
      source_id: 'string',
    },
  },
  ingest_fathom_meeting: {
    required: [['meeting_id', 'recording_id', 'call_id', 'meeting']],
    optional: [
      'title',
      'brainId',
      'brain_id',
      'targetBrain',
      'target_brain',
      'campaignId',
      'campaign_id',
    ],
    types: {
      meeting_id: 'string',
      recording_id: 'string',
      call_id: 'string',
      title: 'string',
      brainId: 'string',
      brain_id: 'string',
      targetBrain: 'string',
      target_brain: 'string',
      campaignId: 'string',
      campaign_id: 'string',
    },
  },

  use_integration: {
    required: ['service', 'integration_action'],
    optional: [
      'params',
      'integration_connection_id',
      'user_integration_id',
      'connected_account_id',
    ],
    types: {
      params: 'object',
      integration_connection_id: 'string',
      user_integration_id: 'string',
      connected_account_id: 'string',
    },
    useWhen: [
      'Execute a connected provider action. Put provider-specific inputs inside params using the exact parameter names returned by get_integration or search_available_integrations.',
    ],
    examples: [
      {
        intent: 'run a connected integration action',
        data: {
          service: 'fathom',
          integration_action: 'get_transcript',
          params: { recordingId: '149415442' },
        },
      },
    ],
  },
  get_integration: { required: ['service'] },
  initiate_integration_connect: { required: ['integration_id'] },
  check_integration_connection: { required: ['integration_id'] },
  list_calendar_events: {
    required: ['start', 'end'],
    optional: ['provider', 'timezone'],
    allowedValues: { provider: ['google_calendar', 'outlook'] },
    types: {
      provider: 'string',
      start: 'iso_date',
      end: 'iso_date',
      timezone: 'string',
    },
    useWhen: ['Read connected Google Calendar and Outlook events for a visible time window.'],
    examples: [
      {
        intent: 'list tomorrow calendar events',
        data: {
          start: '2026-06-18T00:00:00.000Z',
          end: '2026-06-19T00:00:00.000Z',
          timezone: 'Asia/Nicosia',
        },
      },
    ],
  },
  get_person_agenda: {
    required: ['start', 'end'],
    optional: ['email', 'person_id', 'vibey_user_id', 'person_brain_id', 'timezone'],
    types: {
      start: 'iso_date',
      end: 'iso_date',
      timezone: 'string',
      email: 'string',
      person_id: 'string',
      vibey_user_id: 'string',
      person_brain_id: 'string',
    },
    useWhen: [
      'Read one teammate calendar via org Google Workspace impersonation (admin/agent only).',
      'Resolve by work email, Slack person id, portal user id, or Person Brain id.',
    ],
    examples: [
      {
        intent: 'get alex agenda tomorrow',
        data: {
          email: 'alex@company.com',
          start: '2026-06-18T00:00:00.000Z',
          end: '2026-06-19T00:00:00.000Z',
        },
      },
    ],
  },
  list_org_upcoming: {
    required: ['start', 'end'],
    optional: ['timezone', 'limit_people'],
    types: {
      start: 'iso_date',
      end: 'iso_date',
      timezone: 'string',
      limit_people: 'number',
    },
    useWhen: ['List upcoming Workspace calendars for mapped org people (admin/agent only).'],
    examples: [
      {
        intent: 'scan team calendars this morning',
        data: {
          start: '2026-06-18T00:00:00.000Z',
          end: '2026-06-18T12:00:00.000Z',
          limit_people: 20,
        },
      },
    ],
  },
  get_person_briefing: {
    required: ['start', 'end'],
    optional: ['email', 'person_id', 'vibey_user_id', 'person_brain_id', 'timezone'],
    types: {
      start: 'iso_date',
      end: 'iso_date',
      timezone: 'string',
      email: 'string',
      person_id: 'string',
      vibey_user_id: 'string',
      person_brain_id: 'string',
    },
    useWhen: [
      'Compound prep for a person: Workspace calendar + meetings + Slack People + Person Brain + Page Grader clients on the same email key.',
    ],
    examples: [
      {
        intent: 'brief me on alex before the call',
        data: {
          email: 'alex@company.com',
          start: '2026-06-18T00:00:00.000Z',
          end: '2026-06-19T00:00:00.000Z',
        },
      },
    ],
  },
  create_calendar_event: {
    required: ['provider', 'title', 'start', 'end'],
    allowedValues: { provider: ['google_calendar', 'outlook'] },
    optional: [
      'timezone',
      'description',
      'location',
      'attendees',
      'calendar_id',
      'create_video_meeting',
    ],
    types: {
      provider: 'string',
      title: 'string',
      start: 'iso_date',
      end: 'iso_date',
      timezone: 'string',
      description: 'string',
      location: 'string',
      attendees: 'object_array',
      calendar_id: 'string',
      create_video_meeting: 'boolean',
    },
    useWhen: ['Create a timed event in connected Google Calendar or Outlook.'],
    examples: [
      {
        intent: 'create a Google Calendar meeting',
        data: {
          provider: 'google_calendar',
          title: 'Review launch tasks',
          start: '2026-06-18T10:00:00.000Z',
          end: '2026-06-18T10:30:00.000Z',
          timezone: 'Asia/Nicosia',
        },
      },
    ],
  },
  update_calendar_event: {
    required: ['provider', 'event_id'],
    allowedValues: { provider: ['google_calendar', 'outlook'] },
    optional: [
      'title',
      'start',
      'end',
      'timezone',
      'description',
      'location',
      'attendees',
      'calendar_id',
      'create_video_meeting',
    ],
    types: {
      provider: 'string',
      event_id: 'string',
      title: 'string',
      start: 'iso_date',
      end: 'iso_date',
      timezone: 'string',
      description: 'string',
      location: 'string',
      attendees: 'object_array',
      calendar_id: 'string',
      create_video_meeting: 'boolean',
    },
    useWhen: ['Move, rename, or edit a timed Google Calendar or Outlook event.'],
    examples: [
      {
        intent: 'move a calendar event',
        data: {
          provider: 'outlook',
          event_id: 'outlook:event-123',
          start: '2026-06-18T11:00:00.000Z',
          end: '2026-06-18T11:45:00.000Z',
          timezone: 'Asia/Nicosia',
        },
      },
    ],
  },
  delete_calendar_event: {
    required: ['provider', 'event_id'],
    optional: ['calendar_id'],
    allowedValues: { provider: ['google_calendar', 'outlook'] },
    types: {
      provider: 'string',
      event_id: 'string',
      calendar_id: 'string',
    },
    useWhen: ['Delete a connected Google Calendar or Outlook event.'],
    examples: [
      {
        intent: 'delete a Google Calendar event',
        data: { provider: 'google_calendar', event_id: 'google:event-123' },
      },
    ],
  },

  list_mcp_servers: {
    required: [],
    optional: [],
    strict: true,
    useWhen: ['Discover which MCP servers are already connected to the current workspace.'],
    examples: [{ intent: 'list connected MCP servers', data: {} }],
  },
  list_mcp_tools: {
    required: [['server_id', 'server_name']],
    optional: ['server_id', 'server_name'],
    strict: true,
    types: { server_id: 'string', server_name: 'string' },
    useWhen: ['Inspect the tools exposed by one connected MCP server before calling a tool.'],
    examples: [{ intent: 'list tools on the Zuops MCP server', data: { server_name: 'zuops' } }],
  },
  use_mcp_tool: {
    required: [['server_id', 'server_name'], 'tool_name'],
    optional: ['server_id', 'server_name', 'tool', 'arguments', 'args'],
    aliases: { tool: 'tool_name', args: 'arguments' },
    strict: true,
    types: { server_id: 'string', server_name: 'string', tool_name: 'string', tool: 'string' },
    useWhen: [
      'Call a tool on a connected MCP server after list_mcp_tools confirms the tool name and input schema.',
    ],
    doNotUseWhen: ['Adding a new MCP server; use add_mcp_server instead.'],
    examples: [
      {
        intent: 'check credits on Zuops',
        data: { server_name: 'zuops', tool_name: 'check_credits', arguments: {} },
      },
      {
        intent: 'call a Zuops generation tool with inputs',
        data: {
          server_name: 'zuops',
          tool_name: 'generate_image',
          arguments: { prompt: 'Premium product photo on white background' },
        },
      },
    ],
  },
  add_mcp_server: {
    required: ['name', 'url'],
    optional: ['server_url', 'description', 'domain'],
    aliases: { server_url: 'url' },
    strict: true,
    types: {
      name: 'string',
      url: 'string',
      server_url: 'string',
      description: 'string',
      domain: 'string',
    },
    useWhen: [
      'Connect a new public MCP server for the workspace when the user provides a server URL.',
    ],
    doNotUseWhen: [
      'Using tools from an already connected MCP server; list_mcp_servers/list_mcp_tools/use_mcp_tool instead.',
      'Private MCP servers that require API keys, bearer tokens, headers, or secrets. Ask the user to connect those through the secure Vibey integration flow.',
    ],
    examples: [
      {
        intent: 'connect public docs MCP',
        data: {
          name: 'docs',
          url: 'https://example.com/mcp',
          description: 'Documentation tools',
          domain: 'developer',
        },
      },
    ],
  },
  remove_mcp_server: {
    required: ['server_id'],
    optional: [],
    strict: true,
    types: { server_id: 'string' },
    useWhen: [
      'Remove a connected MCP server by id after the user explicitly asks to disconnect it.',
    ],
    examples: [{ intent: 'remove an MCP server', data: { server_id: 'UUID' } }],
  },
  list_mcp_resources: {
    required: [['server_id', 'server_name']],
    optional: ['server_id', 'server_name'],
    strict: true,
    types: { server_id: 'string', server_name: 'string' },
    useWhen: ['List MCP resources exposed by a connected server before reading one by URI.'],
    examples: [
      { intent: 'list resources from a connected MCP server', data: { server_name: 'docs' } },
    ],
  },
  read_mcp_resource: {
    required: [['server_id', 'server_name'], 'uri'],
    optional: ['server_id', 'server_name'],
    strict: true,
    types: { server_id: 'string', server_name: 'string', uri: 'string' },
    useWhen: ['Read a specific MCP resource by URI after list_mcp_resources returns it.'],
    examples: [
      {
        intent: 'read a resource from a connected MCP server',
        data: { server_name: 'docs', uri: 'resource://example' },
      },
    ],
  },

  // Analytics — campaign_id is usually resolved from the session, so we mark it optional in
  // the schema and let the handler surface a typed error if no resolution is possible.
  get_campaign_main_dashboard: {
    required: [],
    optional: ['campaign_id', 'campaignId', 'since', 'until', 'refresh'],
    types: {
      campaign_id: 'string',
      campaignId: 'string',
      since: 'iso_date',
      until: 'iso_date',
      refresh: 'boolean',
    },
  },
  get_campaign_social_analytics: {
    required: ['platform'],
    optional: ['campaign_id', 'campaignId', 'since', 'until', 'refresh'],
    types: {
      platform: 'platform',
      campaign_id: 'string',
      campaignId: 'string',
      since: 'iso_date',
      until: 'iso_date',
      refresh: 'boolean',
    },
  },
  get_campaign_stripe_overview: {
    required: [],
    optional: ['campaign_id', 'campaignId', 'since', 'until', 'from_unix', 'to_unix'],
    types: {
      campaign_id: 'string',
      campaignId: 'string',
      since: 'iso_date',
      until: 'iso_date',
      from_unix: 'number',
      to_unix: 'number',
    },
  },
}

export const ACTION_SCHEMAS: Record<string, ActionSchema> = {
  ...BASE_ACTION_SCHEMAS,
  ...PROMPTMODE_ADDITIONAL_ACTION_SCHEMAS,
}

function isNonEmpty(value: unknown): boolean {
  return !(
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  )
}

function validateParamType(key: string, value: unknown, type: ActionParamType): string | null {
  if (value === undefined || value === null) return null
  if (type === 'string') {
    if (typeof value !== 'string' || value.trim() === '') return `${key} must be a non-empty string`
    return null
  }
  if (type === 'boolean') {
    if (
      typeof value !== 'boolean' &&
      value !== 'true' &&
      value !== 'false' &&
      value !== 1 &&
      value !== 0
    ) {
      return `${key} must be a boolean`
    }
    return null
  }
  if (type === 'number') {
    if (typeof value === 'number' && Number.isFinite(value)) return null
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
      return null
    return `${key} must be a finite number`
  }
  if (type === 'object') {
    if (typeof value === 'object' && !Array.isArray(value)) return null
    return `${key} must be an object`
  }
  if (type === 'object_array') {
    if (
      Array.isArray(value) &&
      value.every((item) => item && typeof item === 'object' && !Array.isArray(item))
    )
      return null
    return `${key} must be an array of objects`
  }
  if (type === 'string_array') {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string' && item.trim() !== '')
    )
      return null
    return `${key} must be an array of non-empty strings`
  }
  if (type === 'iso_date') {
    if (typeof value !== 'string' || value.trim() === '')
      return `${key} must be an ISO 8601 date string`
    const parsed = Date.parse(value)
    if (!Number.isFinite(parsed)) return `${key} must be an ISO 8601 date string`
    return null
  }
  if (type === 'platform') {
    if (value !== 'instagram' && value !== 'linkedin') {
      return `${key} must be "instagram" or "linkedin"`
    }
    return null
  }
  return null
}

/**
 * Validate action data against the canonical schema.
 * Returns null if valid, or an error string if validation fails.
 */
export function validateActionData(action: string, data: Record<string, unknown>): string | null {
  const schema = ACTION_SCHEMAS[action]
  if (!schema) return null
  if (
    action === 'list_campaigns' &&
    data.mode !== undefined &&
    data.mode !== 'relevant' &&
    data.mode !== 'accessible'
  ) {
    return 'mode for list_campaigns must be "relevant" or "accessible"'
  }

  const missing: string[] = []
  for (const requirement of schema.required) {
    const keys = Array.isArray(requirement) ? requirement : [requirement]
    const present = keys.some((key) => isNonEmpty(data[key]))
    if (!present) {
      missing.push(keys[0])
    }
  }

  if (missing.length > 0) {
    return `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required for ${action}`
  }

  if (schema.types) {
    for (const [key, type] of Object.entries(schema.types)) {
      if (!type) continue
      const err = validateParamType(key, data[key], type)
      if (err) return err
    }
  }

  if (schema.allowedValues) {
    for (const [key, values] of Object.entries(schema.allowedValues)) {
      const value = data[key]
      if (value === undefined || value === null) continue
      if (typeof value !== 'string' || !values.includes(value)) {
        return `${key} must be one of: ${values.join(', ')}`
      }
    }
  }

  if (schema.strict) {
    const allowed = new Set([
      ...schema.required.flatMap((requirement) =>
        Array.isArray(requirement) ? requirement : [requirement],
      ),
      ...(schema.optional ?? []),
      ...Object.keys(schema.aliases ?? {}),
      ...RUNTIME_CONTEXT_KEYS,
    ])
    for (const key of Object.keys(data)) {
      if (allowed.has(key)) continue
      return buildUnknownFieldError(action, key, schema)
    }
  }

  return null
}

function buildUnknownFieldError(action: string, key: string, schema: ActionSchema): string {
  const aliasTarget = schema.aliases?.[key]
  if (aliasTarget) return `Unknown field ${key} for ${action}. Use ${aliasTarget}.`
  const accepted = [...new Set([...(schema.optional ?? []), ...Object.keys(schema.aliases ?? {})])]
  return accepted.length > 0
    ? `Unknown field ${key} for ${action}. Accepted fields: ${accepted.join(', ')}.`
    : `Unknown field ${key} for ${action}.`
}

export function getResolvableFieldsForAction(action: string): ResolvableField[] {
  return [...(ACTION_SCHEMAS[action]?.resolvable ?? [])]
}

export function describeActionContract(action: string): Record<string, unknown> | null {
  const schema = ACTION_SCHEMAS[action]
  if (!schema) return null
  return {
    action,
    required: schema.required,
    optional: schema.optional ?? [],
    aliases: schema.aliases ?? {},
    types: schema.types ?? {},
    descriptions: schema.descriptions ?? {},
    strict: schema.strict === true,
    resolvable: schema.resolvable ?? [],
    use_when: schema.useWhen ?? [],
    do_not_use_when: schema.doNotUseWhen ?? [],
    examples: schema.examples ?? [],
    allowed_values: schema.allowedValues ?? {},
    retry_guidance: schema.retryGuidance ?? [],
    preflight: describeActionPreflightContract(action),
    lifecycle: getPromptModeActionLifecycle(action),
  }
}
