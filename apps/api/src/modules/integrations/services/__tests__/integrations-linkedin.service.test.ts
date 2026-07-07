import { describe, expect, it } from 'vitest'
import { parseLinkedInCompanyInfoResponse } from '../integrations-linkedin.service'

describe('parseLinkedInCompanyInfoResponse', () => {
  it('parses elements with organization URN and localized name', () => {
    const raw = {
      data: {
        response_dict: {
          elements: [
            {
              organization: 'urn:li:organization:12345',
              role: 'ADMINISTRATOR',
              'organization~': { localizedName: 'Acme Corp' },
            },
            {
              organizationalTarget: 'urn:li:organization:99999',
              organizationName: 'Beta LLC',
            },
          ],
        },
      },
    }

    const orgs = parseLinkedInCompanyInfoResponse(raw)
    expect(orgs).toHaveLength(2)
    expect(orgs[0]).toEqual({
      urn: 'urn:li:organization:12345',
      name: 'Acme Corp',
      role: 'ADMINISTRATOR',
    })
    expect(orgs[1]).toEqual({
      urn: 'urn:li:organization:99999',
      name: 'Beta LLC',
      role: undefined,
    })
  })

  it('dedupes duplicate URNs and skips invalid rows', () => {
    const orgs = parseLinkedInCompanyInfoResponse({
      elements: [
        { organization: 'urn:li:organization:1', organizationName: 'One' },
        { organization: 'urn:li:organization:1', organizationName: 'One again' },
        { organization: 'urn:li:person:2', organizationName: 'Person' },
      ],
    })
    expect(orgs).toEqual([{ urn: 'urn:li:organization:1', name: 'One', role: undefined }])
  })

  it('returns empty array for missing elements', () => {
    expect(parseLinkedInCompanyInfoResponse(null)).toEqual([])
    expect(parseLinkedInCompanyInfoResponse({ data: {} })).toEqual([])
  })
})
