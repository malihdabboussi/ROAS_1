export type ScopedArtifactSpec = {
  table: string
  select: string
  artifactType: string
  idPrefix: string
  fallbackName: string
  titleFields: string[]
  statusField?: string
  imageField?: string
  videoField?: string
  subtitle?: string
  userColumn?: string
  campaignColumn?: string | null
  renderable?: 'presentation' | 'funnel'
}

export const SCOPED_ARTIFACT_SPECS: ScopedArtifactSpec[] = [
  {
    table: 'offers',
    select: 'id, name, processing_status, campaign_id, space_id, created_at',
    artifactType: 'offer',
    idPrefix: 'offer',
    fallbackName: 'Untitled Offer',
    titleFields: ['name'],
    statusField: 'processing_status',
  },
  {
    table: 'avatars',
    select: 'id, name, persona_data, campaign_id, space_id, created_at',
    artifactType: 'avatar',
    idPrefix: 'avatar',
    fallbackName: 'Untitled Avatar',
    titleFields: ['name'],
  },
  {
    table: 'sequences',
    select: 'id, name, status, campaign_id, space_id, created_at',
    artifactType: 'sequence',
    idPrefix: 'sequence',
    fallbackName: 'Untitled Sequence',
    titleFields: ['name'],
    statusField: 'status',
  },
  {
    table: 'presentations',
    select: 'id, name, status, generated_html, campaign_id, space_id, created_at',
    artifactType: 'presentation',
    idPrefix: 'presentation',
    fallbackName: 'Untitled Presentation',
    titleFields: ['name'],
    statusField: 'status',
    renderable: 'presentation',
  },
  {
    table: 'funnels',
    select: 'id, name, title, status, funnel_type, home_page_id, campaign_id, space_id, created_at',
    artifactType: 'funnel',
    idPrefix: 'funnel',
    fallbackName: 'Untitled Funnel',
    titleFields: ['name', 'title'],
    statusField: 'status',
    renderable: 'funnel',
  },
  {
    table: 'social_posts',
    select: 'id, headline, caption, status, image_url, video_url, campaign_id, space_id, created_at',
    artifactType: 'social-post',
    idPrefix: 'social-post',
    fallbackName: 'Untitled Social Post',
    titleFields: ['headline', 'caption'],
    statusField: 'status',
    imageField: 'image_url',
    videoField: 'video_url',
  },
  {
    table: 'ads',
    select: 'id, name, headline, image_url, video_url, campaign_id, space_id, created_at',
    artifactType: 'ad',
    idPrefix: 'ad',
    fallbackName: 'Untitled Ad',
    titleFields: ['name', 'headline'],
    imageField: 'image_url',
    videoField: 'video_url',
  },
  {
    table: 'ad_sets',
    select: 'id, name, status, campaign_id, space_id, created_at',
    artifactType: 'ad-set',
    idPrefix: 'ad-set',
    fallbackName: 'Untitled Ad Set',
    titleFields: ['name'],
    statusField: 'status',
  },
  {
    table: 'ad_campaigns',
    select: 'id, name, status, campaign_id, space_id, created_at',
    artifactType: 'ad-campaign',
    idPrefix: 'ad-campaign',
    fallbackName: 'Untitled Ad Campaign',
    titleFields: ['name'],
    statusField: 'status',
  },
  {
    table: 'forms',
    select: 'id, name, status, campaign_id, space_id, created_at',
    artifactType: 'form',
    idPrefix: 'form',
    fallbackName: 'Untitled Form',
    titleFields: ['name'],
    statusField: 'status',
  },
  {
    table: 'space_automations',
    select: 'id, name, enabled, is_draft, space_id, created_by, created_at',
    artifactType: 'flow',
    idPrefix: 'flow',
    fallbackName: 'Untitled Flow',
    titleFields: ['name'],
    userColumn: 'created_by',
    campaignColumn: null,
  },
]
