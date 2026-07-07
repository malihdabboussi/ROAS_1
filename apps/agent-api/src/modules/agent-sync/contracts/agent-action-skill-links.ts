export type AgentActionSkillLink = {
  action: string
  skillKey: string
  reason: string
  when?: string
}

const PRESENTATION_ACTIONS = [
  'create_presentation',
  'update_presentation',
  'patch_presentation',
  'update_presentation_slide',
  'add_presentation_slide',
  'list_presentation_files',
  'read_presentation_file',
  'show_presentation_file',
  'write_presentation_file',
  'patch_presentation_file',
  'delete_presentation_file',
  'list_presentation_assets',
  'attach_presentation_asset',
  'detach_presentation_asset',
  'apply_presentation_element_edit',
  'add_presentation_anchor',
  'extract_presentation_tweaks',
  'update_presentation_tweaks',
]

const FUNNEL_ACTIONS = [
  'create_funnel',
  'add_funnel_page',
  'update_funnel_page',
  'set_website_layout',
  'get_funnel',
  'list_funnels',
  'list_funnel_files',
  'read_funnel_file',
  'write_funnel_file',
  'patch_funnel_file',
  'delete_funnel_file',
  'list_funnel_assets',
  'attach_funnel_asset',
  'detach_funnel_asset',
  'apply_funnel_element_edit',
  'add_funnel_anchor',
  'extract_funnel_tweaks',
  'update_funnel_tweaks',
]

const FORM_ACTIONS = [
  'list_forms',
  'get_form',
  'create_form',
  'update_form',
  'attach_form_asset',
  'publish_form',
  'unpublish_form',
  'list_form_responses',
]

const EMAIL_SEQUENCE_ACTIONS = [
  'create_sequence',
  'add_sequence_email',
  'update_sequence',
  'update_sequence_email',
  'prepare_sequence_send',
  'prepare_email_send',
]

const AD_ACTIONS = [
  'create_ad',
  'update_ad',
  'create_ad_campaign',
  'create_ad_set',
  'publish_ad_to_meta',
  'get_meta_ads_insights',
]

const SOCIAL_ACTIONS = [
  'create_social_post',
  'update_social_post',
  'schedule_social_post',
  'publish_social_post',
  'list_social_post_templates',
  'get_social_post_template',
]

const PROJECT_ACTIONS = [
  'create_project',
  'create_file',
  'read_file',
  'update_file',
  'delete_file',
  'list_project_files',
  'get_project',
  'get_project_logs',
  'update_project_deps',
  'import_github_repo',
]

const FLOW_ACTIONS = [
  'search_flow_capabilities',
  'get_flow_capability',
  'list_flows',
  'get_flow',
  'create_flow_draft',
  'update_flow_draft',
  'validate_flow_draft',
  'publish_flow',
  'get_flow_build_context',
  'create_flow_clarification',
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
]

const THEME_ACTIONS = ['create_theme', 'update_theme', 'extract_website_theme']
const AVATAR_ACTIONS = ['create_avatar', 'update_avatar']

function linksFor(
  actions: string[],
  link: Omit<AgentActionSkillLink, 'action'>,
): AgentActionSkillLink[] {
  return actions.map((action) => ({ action, ...link }))
}

export const AGENT_ACTION_SKILL_LINKS: AgentActionSkillLink[] = [
  ...linksFor(PRESENTATION_ACTIONS, {
    skillKey: 'presentation-builder',
    reason:
      'Presentation work needs deck structure, HTML bundle rules, and slide quality guidance.',
    when: 'Read before creating, editing, or reviewing presentation assets.',
  }),
  ...linksFor(FUNNEL_ACTIONS, {
    skillKey: 'funnel-builder',
    reason: 'Funnel work needs conversion flow, page structure, and visual quality guidance.',
    when: 'Read before creating or editing funnel pages.',
  }),
  ...linksFor(FORM_ACTIONS, {
    skillKey: 'vibey-api',
    reason:
      'Form work needs native schema, question, settings, response, and publishing contracts.',
    when: 'Read before creating, editing, publishing, or reviewing native Forms.',
  }),
  ...linksFor(EMAIL_SEQUENCE_ACTIONS, {
    skillKey: 'email-sequence-builder',
    reason: 'Email sequence work needs timing, message order, and copy strategy guidance.',
    when: 'Read before creating, editing, preparing, or sending sequence emails.',
  }),
  ...linksFor(AD_ACTIONS, {
    skillKey: 'ad-builder',
    reason:
      'Ad work needs creative strategy, platform fit, and artifact update-vs-create guidance.',
    when: 'Read before creating, editing, or publishing ads.',
  }),
  ...linksFor(SOCIAL_ACTIONS, {
    skillKey: 'social-content-builder',
    reason: 'Social content work needs platform format, post type, and creative quality guidance.',
    when: 'Read before creating or editing organic social posts.',
  }),
  ...linksFor(['publish_social_post', 'schedule_social_post'], {
    skillKey: 'social-publisher',
    reason:
      'Publishing social content needs channel safety, connected account, and scheduling guidance.',
    when: 'Read before publishing or scheduling social posts.',
  }),
  ...linksFor(PROJECT_ACTIONS, {
    skillKey: 'project-builder',
    reason:
      'Project work needs file reading, scoped edits, dependency, and verification workflow guidance.',
    when: 'Read before creating or editing real project files.',
  }),
  ...linksFor(FLOW_ACTIONS, {
    skillKey: 'flow-builder',
    reason:
      'Flow work needs Space context, capability search, clarification, draft safety, validation, custom blueprint rules, and publish sequencing.',
    when: 'Read before planning, listing, drafting, validating, editing, evaluating, or publishing flows.',
  }),
  ...linksFor(THEME_ACTIONS, {
    skillKey: 'theme-builder',
    reason: 'Theme work needs brand identity, token, color, typography, and voice guidance.',
    when: 'Read before creating or changing brand themes.',
  }),
  ...linksFor(AVATAR_ACTIONS, {
    skillKey: 'avatar-builder',
    reason:
      'Avatar work needs buyer psychology, persona completeness, and customer insight guidance.',
    when: 'Read before creating or editing avatars.',
  }),
]

export function getActionSkillLinks(action: string): AgentActionSkillLink[] {
  return AGENT_ACTION_SKILL_LINKS.filter((link) => link.action === action)
}

export function formatActionSkillLinks(action: string): string[] {
  return getActionSkillLinks(action).map((link) => {
    const when = link.when ? ` ${link.when}` : ''
    return `Relevant skill: read \`skills/${link.skillKey}/SKILL.md\`. ${link.reason}${when}`
  })
}
