import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Injectable } from '@nestjs/common'

let _ffmpeg: typeof import('fluent-ffmpeg') | undefined
function getFfmpeg() {
  if (!_ffmpeg) _ffmpeg = require('fluent-ffmpeg')
  return _ffmpeg!
}

const POSTER_TIMEOUT_MS = 30_000

/**
 * Extracts the first frame of a video as a JPEG poster. Poster extraction is
 * best-effort metadata: callers treat a null return as "no poster", never as a
 * failed upload.
 */
@Injectable()
export class ArtifactVideoPosterService {
  async extractPosterFrame(videoBuffer: Buffer): Promise<Buffer | null> {
    let tempRoot: string | null = null
    try {
      tempRoot = await mkdtemp(join(tmpdir(), 'video-poster-'))
      const sourcePath = join(tempRoot, 'source.mp4')
      const outputPath = join(tempRoot, 'poster.jpg')
      await writeFile(sourcePath, videoBuffer)

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Poster extraction timed out')),
          POSTER_TIMEOUT_MS,
        )
        getFfmpeg()(sourcePath)
          .seekInput(0)
          .frames(1)
          .output(outputPath)
          .on('end', () => {
            clearTimeout(timer)
            resolve()
          })
          .on('error', (err: Error) => {
            clearTimeout(timer)
            reject(err)
          })
          .run()
      })

      return await readFile(outputPath)
    } catch {
      return null
    } finally {
      if (tempRoot) await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined)
    }
  }
}
