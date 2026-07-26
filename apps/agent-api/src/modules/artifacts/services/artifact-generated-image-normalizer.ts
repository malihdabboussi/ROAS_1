import sharp from 'sharp'

const CANONICAL_IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
}

export type NormalizedGeneratedImage = {
  buffer: Buffer
  contentType: string
  width: number | null
  height: number | null
}

export async function normalizeGeneratedImage(
  buffer: Buffer,
  contentType: string,
  aspectRatio: string,
): Promise<NormalizedGeneratedImage> {
  const target = CANONICAL_IMAGE_DIMENSIONS[aspectRatio]
  if (!target) {
    return {
      buffer,
      contentType,
      width: null,
      height: null,
    }
  }

  const normalized = await sharp(buffer)
    .resize(target.width, target.height, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  return {
    buffer: normalized,
    contentType: 'image/png',
    width: target.width,
    height: target.height,
  }
}
