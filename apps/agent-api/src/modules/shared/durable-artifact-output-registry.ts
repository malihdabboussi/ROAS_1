export type DurableArtifactOutputDefinition = {
  artifactType: string
  actions: readonly string[]
  idKeys: string[]
  nameKeys: string[]
  defaultName: string
}

export const DURABLE_ARTIFACT_OUTPUT_DEFINITIONS: readonly DurableArtifactOutputDefinition[] = [
  {
    artifactType: 'campaign',
    actions: ['create_campaign', 'update_campaign'],
    idKeys: ['campaign_id', 'campaignId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Campaign',
  },
  {
    artifactType: 'offer',
    actions: ['create_offer', 'update_offer_step'],
    idKeys: ['offer_id', 'offerId', 'id'],
    nameKeys: ['name', 'title', 'headline'],
    defaultName: 'Offer',
  },
  {
    artifactType: 'avatar',
    actions: ['create_avatar', 'update_avatar'],
    idKeys: ['avatar_id', 'avatarId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Avatar',
  },
  {
    artifactType: 'funnel',
    actions: [
      'create_funnel',
      'add_funnel_page',
      'update_funnel_page',
      'set_website_layout',
      'attach_funnel_asset',
      'detach_funnel_asset',
      'apply_funnel_element_edit',
      'add_funnel_anchor',
      'update_funnel_tweaks',
    ],
    idKeys: ['funnel_id', 'funnelId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Funnel',
  },
  {
    artifactType: 'website',
    actions: ['create_website', 'add_website_page', 'update_website_page'],
    idKeys: ['website_id', 'funnel_id', 'websiteId', 'funnelId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Website',
  },
  {
    artifactType: 'presentation',
    actions: [
      'create_presentation',
      'update_presentation',
      'patch_presentation',
      'update_presentation_slide',
      'add_presentation_slide',
      'attach_presentation_asset',
      'detach_presentation_asset',
      'apply_presentation_element_edit',
      'add_presentation_anchor',
      'update_presentation_tweaks',
    ],
    idKeys: ['presentation_id', 'presentationId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Presentation',
  },
  {
    artifactType: 'ad',
    actions: ['create_ad', 'update_ad', 'patch_ad'],
    idKeys: ['ad_id', 'adId', 'id'],
    nameKeys: ['name', 'title', 'headline'],
    defaultName: 'Ad',
  },
  {
    artifactType: 'ad-campaign',
    actions: ['create_ad_campaign', 'update_ad_campaign'],
    idKeys: ['ad_campaign_id', 'adCampaignId', 'campaign_id', 'campaignId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Ad Campaign',
  },
  {
    artifactType: 'ad-set',
    actions: ['create_ad_set', 'update_ad_set'],
    idKeys: ['ad_set_id', 'adSetId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Ad Set',
  },
  {
    artifactType: 'sequence',
    actions: [
      'create_sequence',
      'add_sequence_email',
      'update_sequence_email',
      'update_sequence',
    ],
    idKeys: ['sequence_id', 'sequenceId', 'id'],
    nameKeys: ['name', 'title', 'subject'],
    defaultName: 'Sequence',
  },
  {
    artifactType: 'social-post',
    actions: [
      'create_social_post',
      'update_social_post',
      'schedule_social_post',
      'publish_social_post',
    ],
    idKeys: ['social_post_id', 'post_id', 'socialPostId', 'postId', 'id'],
    nameKeys: ['name', 'title', 'caption'],
    defaultName: 'Social Post',
  },
  {
    artifactType: 'blog-post',
    actions: ['create_blog_post', 'update_blog_post'],
    idKeys: ['blog_post_id', 'post_id', 'blogPostId', 'postId', 'id'],
    nameKeys: ['title', 'name'],
    defaultName: 'Blog Post',
  },
  {
    artifactType: 'email',
    actions: ['save_email', 'update_email'],
    idKeys: ['email_id', 'emailId', 'id'],
    nameKeys: ['subject', 'name', 'title'],
    defaultName: 'Email',
  },
  {
    artifactType: 'visual-doc',
    actions: ['generate_visual_html'],
    idKeys: ['space_item_id', 'item_id', 'document_id', 'spaceItemId', 'itemId', 'id'],
    nameKeys: ['title', 'name'],
    defaultName: 'Visual Doc',
  },
  {
    artifactType: 'form',
    actions: ['create_form', 'update_form', 'attach_form_asset', 'publish_form', 'unpublish_form'],
    idKeys: ['form_id', 'formId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Form',
  },
  {
    artifactType: 'task',
    actions: ['create_task', 'update_task'],
    idKeys: ['task_id', 'item_id', 'taskId', 'itemId', 'id'],
    nameKeys: ['title', 'name'],
    defaultName: 'Task',
  },
  {
    artifactType: 'mission',
    actions: ['create_mission', 'update_mission', 'attach_mission_context', 'approve_mission'],
    idKeys: ['mission_id', 'missionId', 'id'],
    nameKeys: ['title', 'name'],
    defaultName: 'Mission',
  },
  {
    artifactType: 'flow',
    actions: ['create_flow_draft', 'update_flow_draft', 'publish_flow'],
    idKeys: ['automation_id', 'flow_id', 'automationId', 'flowId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Flow',
  },
  {
    artifactType: 'theme',
    actions: ['create_theme', 'update_theme', 'extract_website_theme'],
    idKeys: ['theme_id', 'themeId', 'id'],
    nameKeys: ['name', 'title'],
    defaultName: 'Theme',
  },
  {
    artifactType: 'custom-object',
    actions: ['define_object_type', 'update_object_type', 'create_object', 'update_object'],
    idKeys: ['object_id', 'object_type_id', 'record_id', 'slug', 'id'],
    nameKeys: ['title', 'name', 'slug'],
    defaultName: 'Object',
  },
]

export const DURABLE_ARTIFACT_OUTPUT_ACTIONS = new Set(
  DURABLE_ARTIFACT_OUTPUT_DEFINITIONS.flatMap((definition) => definition.actions),
)
