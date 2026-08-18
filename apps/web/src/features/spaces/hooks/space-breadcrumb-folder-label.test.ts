import { describe, expect, it } from 'vitest'
import { spaceBreadcrumbFolderLabel } from './space-breadcrumb-folder-label'

describe('spaceBreadcrumbFolderLabel', () => {
  it('uses the program/client when the campaign is General', () => {
    expect(spaceBreadcrumbFolderLabel('General', '1DS Collective')).toBe('1DS Collective')
  })

  it('keeps a named campaign when there is no program', () => {
    expect(spaceBreadcrumbFolderLabel('1DS Collective LLC · Webinar', null)).toBe(
      '1DS Collective LLC · Webinar',
    )
  })

  it('keeps a named campaign even when a client program exists', () => {
    expect(
      spaceBreadcrumbFolderLabel('1DS Collective LLC · Webinar', '1DS Collective'),
    ).toBe('1DS Collective LLC · Webinar')
  })

  it('skips Client Spaces and General program labels', () => {
    expect(spaceBreadcrumbFolderLabel('General', 'Client Spaces')).toBe('General')
    expect(spaceBreadcrumbFolderLabel('General', 'General')).toBe('General')
  })
})
