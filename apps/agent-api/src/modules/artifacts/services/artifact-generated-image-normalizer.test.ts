import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { normalizeGeneratedImage } from './artifact-generated-image-normalizer'

describe('normalizeGeneratedImage', () => {
  it('normalizes 4:5 provider output to the canonical feed dimensions', async () => {
    const source = await sharp({
      create: {
        width: 896,
        height: 1120,
        channels: 4,
        background: '#ffffff',
      },
    })
      .png()
      .toBuffer()

    const result = await normalizeGeneratedImage(source, 'image/png', '4:5')
    const metadata = await sharp(result.buffer).metadata()

    expect(result).toMatchObject({
      contentType: 'image/png',
      width: 1080,
      height: 1350,
    })
    expect(metadata).toMatchObject({ width: 1080, height: 1350, format: 'png' })
  })

  it('normalizes 9:16 provider output to the canonical story dimensions', async () => {
    const source = await sharp({
      create: {
        width: 768,
        height: 1366,
        channels: 4,
        background: '#ffffff',
      },
    })
      .png()
      .toBuffer()

    const result = await normalizeGeneratedImage(source, 'image/png', '9:16')
    const metadata = await sharp(result.buffer).metadata()

    expect(result).toMatchObject({
      contentType: 'image/png',
      width: 1080,
      height: 1920,
    })
    expect(metadata).toMatchObject({ width: 1080, height: 1920, format: 'png' })
  })
})
