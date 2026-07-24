/** Maps agent/chat artifact types to Space view `type` ids for focus routing. */
export function artifactTypeToSpaceViewType(artifactType: string): string | null {
  switch (artifactType) {
    case 'funnel':
      return 'funnels'
    case 'website':
      return 'websites'
    case 'offer':
      return 'offers'
    case 'ad-campaign':
      return 'ad_campaigns'
    case 'sequence':
      return 'sequences'
    case 'presentation':
      return 'presentations'
    case 'avatar':
      return 'avatars'
    case 'social-post':
      return 'social_posts'
    case 'ad':
      return 'ads'
    case 'blog-post':
      return 'websites'
    case 'document':
    case 'space_doc':
    case 'visual-doc':
      return 'docs'
    case 'email':
      return 'emails'
    case 'instagram-research':
      return 'instagram_research'
    case 'tiktok-research':
      return 'tiktok_research'
    case 'youtube-research':
      return 'youtube_research'
    case 'twitter-research':
      return 'twitter_research'
    default:
      return null
  }
}
