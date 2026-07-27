import { describe, expect, it } from 'vitest'
import {
  formatPageGraderFieldChangeLabel,
  getPageGraderWorkUrlFromActivityPayload,
} from './page-grader-activity'

describe('page-grader-activity', () => {
  const payload = {
    field: 'page_grader',
    from: null,
    to: {
      work_id: 'work-9',
      work_url: 'https://portal.roas.io/launcher?task=work-9',
    },
  }

  it('extracts a valid work_url from field_change payload', () => {
    expect(getPageGraderWorkUrlFromActivityPayload(payload)).toBe(
      'https://portal.roas.io/launcher?task=work-9',
    )
  })

  it('rejects missing or non-http work urls', () => {
    expect(getPageGraderWorkUrlFromActivityPayload({ field: 'tags', to: [] })).toBeNull()
    expect(
      getPageGraderWorkUrlFromActivityPayload({
        field: 'page_grader',
        to: { work_url: 'javascript:alert(1)' },
      }),
    ).toBeNull()
  })

  it('uses the public portal name for page_grader sync activity', () => {
    expect(formatPageGraderFieldChangeLabel(payload)).toBe('sent this to The ROAS Portal')
  })
})
