import { AdNode } from './AdNode'
import { BriefNode } from './BriefNode'
import { CarouselNode } from './CarouselNode'
import { CopyNode } from './CopyNode'
import { EditNode } from './EditNode'
import { ImageNode } from './ImageNode'
import { OverlayNode } from './OverlayNode'
import { ReferenceImageNode } from './ReferenceImageNode'
import { StrategyNode } from './StrategyNode'
import { VariationNode } from './VariationNode'
import { VideoNode } from './VideoNode'

export const adCanvasNodeTypes = {
  brief: BriefNode,
  strategy: StrategyNode,
  reference_image: ReferenceImageNode,
  image: ImageNode,
  edit: EditNode,
  variation: VariationNode,
  copy: CopyNode,
  carousel: CarouselNode,
  video: VideoNode,
  overlay: OverlayNode,
  ad: AdNode,
}
