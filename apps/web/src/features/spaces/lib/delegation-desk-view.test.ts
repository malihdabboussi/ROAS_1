import { describe, expect, it } from 'vitest'
import type { SpaceItem } from '../types'
import { filterDelegationDeskItems, type DelegationDeskFilter } from './delegation-desk-view'

function item(id: string, title: string, status: string): SpaceItem {
  return {
    id,
    title,
    status,
    custom_data: {},
  } as unknown as SpaceItem
}

describe('delegation desk view', () => {
  const items = [
    item('1', 'Loose launch thought', 'inbox'),
    item('2', 'Prepare the media plan', 'ready_review'),
    item('3', 'Send assets to the buyer', 'dispatched'),
    item('4', 'Old completed work', 'done'),
    { ...item('5', 'Operating notes', 'inbox'), doc_body: '<p>Notes</p>' },
  ]

  it('shows every outstanding stage in the default holding view', () => {
    expect(filterDelegationDeskItems(items, 'outstanding', '').map((row) => row.id)).toEqual([
      '1',
      '2',
      '3',
    ])
  })

  it.each<[DelegationDeskFilter, string[]]>([
    ['holding', ['1']],
    ['ready', ['2']],
    ['delegated', ['3']],
    ['completed', ['4']],
  ])('filters %s work', (filter, ids) => {
    expect(filterDelegationDeskItems(items, filter, '').map((row) => row.id)).toEqual(ids)
  })

  it('searches titles and descriptions without including docs', () => {
    const withDescription = {
      ...items[1],
      description: 'Draft the paid social breakdown',
    }
    expect(
      filterDelegationDeskItems(
        [items[0], withDescription, items[4]],
        'outstanding',
        'paid social',
      ).map((row) => row.id),
    ).toEqual(['2'])
  })
})
