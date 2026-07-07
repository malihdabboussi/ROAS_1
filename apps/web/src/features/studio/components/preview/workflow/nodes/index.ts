import { AdCampaignNode } from './AdCampaignNode'
import { AvatarNode } from './AvatarNode'
import { FunnelNode } from './FunnelNode'
import { GroupBoxNode } from './GroupBoxNode'
import { MilestoneNode } from './MilestoneNode'
import { OfferNode } from './OfferNode'
import { PresentationNode } from './PresentationNode'
import { SequenceNode } from './SequenceNode'
import { SocialPostNode } from './SocialPostNode'
import { StickyNoteNode } from './StickyNoteNode'
import { TextBlockNode } from './TextBlockNode'

export const nodeTypes = {
  funnel: FunnelNode,
  sequence: SequenceNode,
  presentation: PresentationNode,
  offer: OfferNode,
  ad_campaign: AdCampaignNode,
  avatar: AvatarNode,
  social_post: SocialPostNode,
  strategy_sticky_note: StickyNoteNode,
  strategy_text_block: TextBlockNode,
  strategy_group_box: GroupBoxNode,
  strategy_milestone: MilestoneNode,
}
