import { describe, it } from 'vitest'

describe('Storage Upload Contract', () => {
  it.todo('POST /api/media/upload supports campaigns bucket for authenticated users')
  it.todo('POST /api/profile/avatar stores file in avatars bucket')
  it.todo('POST /api/missions/:id/attachments stores in mission-attachments bucket')
  it.todo('upload endpoints reject cross-org mission attachment attempts')
  it.todo('multipart uploads preserve content type and filename')
})
