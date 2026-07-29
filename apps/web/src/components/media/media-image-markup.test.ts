import { describe, expect, it } from 'vitest'
import {
  buildImageMarkupPrompt,
  closestImageAspectRatio,
  type ImageMarkupAnnotation,
} from './media-image-markup'

describe('buildImageMarkupPrompt', () => {
  it('turns pins and freehand marks into localized edit instructions', () => {
    const annotations: ImageMarkupAnnotation[] = [
      {
        id: 'annotation-1',
        kind: 'pin',
        points: [{ x: 0.25, y: 0.4 }],
        feedback: 'Remove this icon',
      },
      {
        id: 'annotation-2',
        kind: 'pen',
        points: [
          { x: 0.5, y: 0.2 },
          { x: 0.8, y: 0.35 },
        ],
        feedback: 'Move this headline down so no text is cut off',
      },
    ]

    expect(buildImageMarkupPrompt(annotations, 'Keep the layout clean')).toContain(
      'Pin at 25% from the left and 40% from the top: Remove this icon.',
    )
    expect(buildImageMarkupPrompt(annotations, 'Keep the layout clean')).toContain(
      'Freehand mark enclosing the target near 65% from the left and 28% from the top (region: left 50%–80%, top 20%–35%). Apply this instruction to the content enclosed by that region, not to the markup line itself: Move this headline down so no text is cut off.',
    )
    expect(buildImageMarkupPrompt(annotations, 'Keep the layout clean')).toContain(
      'Additional direction: Keep the layout clean.',
    )
    expect(buildImageMarkupPrompt(annotations, 'Keep the layout clean')).toContain(
      'Do not crop, resize, reflow, reposition, restyle, or regenerate any unmarked content.',
    )
  })

  it('ignores marks that do not have feedback', () => {
    expect(
      buildImageMarkupPrompt([
        {
          id: 'annotation-1',
          kind: 'pin',
          points: [{ x: 0.1, y: 0.1 }],
          feedback: ' ',
        },
      ]),
    ).toBe('')
  })

  it('maps a source canvas to the nearest supported aspect ratio', () => {
    expect(closestImageAspectRatio(1080, 1350)).toBe('4:5')
    expect(closestImageAspectRatio(1080, 1920)).toBe('9:16')
    expect(closestImageAspectRatio(0, 1350)).toBeNull()
  })
})
