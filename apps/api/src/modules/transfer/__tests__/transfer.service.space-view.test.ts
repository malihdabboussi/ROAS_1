import { describe, expect, it } from 'vitest'
import {
  createMutationQuery,
  createOrgRoleQuery,
  createQueuedQuery,
  createQueuedSupabase,
  createSupabaseWithQueries,
  createTransferService,
} from './transfer-test-helpers'

describe('TransferService space and view transfers', () => {
  it('previews spaces with child counts, view counts, and share warnings', async () => {
    const supabase = createQueuedSupabase({
      spaces: [
        {
          data: {
            id: 'space-1',
            title: 'Research space',
            org_id: null,
            schema: { views: [{ id: 'view-1' }, { id: 'view-2' }] },
          },
          error: null,
        },
      ],
      org_members: [{ data: { role: 'creator' }, error: null }],
      space_items: [{ count: 2 }],
      space_item_activity: [{ count: 3 }],
      space_item_shares: [{ count: 1 }],
      space_shares: [{ count: 1 }],
    })
    const service = createTransferService(supabase)

    const result = await service.previewSpace('space-1', 'user-1', { org_id: 'org-1' }, 'copy')

    expect(result.children).toEqual({
      space_items: 2,
      space_item_activity: 3,
      space_item_shares: 1,
      space_shares: 1,
      views: 2,
    })
    expect(result.warnings).toEqual([
      '1 space share(s) will be removed during transfer',
      '1 item share(s) will be removed during transfer',
    ])
  })

  it('previews document views by excluding closed space items', async () => {
    const supabase = createQueuedSupabase({
      spaces: [
        {
          data: {
            id: 'space-1',
            title: 'Research space',
            org_id: null,
            schema: {
              fields: [{ id: 'status', options: [{ id: 'done', group: 'done' }] }],
              views: [{ id: 'docs-view', name: 'Docs', type: 'docs', show_closed_tasks: false }],
            },
          },
          error: null,
        },
      ],
      org_members: [{ data: { role: 'creator' }, error: null }],
      space_items: [
        {
          data: [
            { id: 'item-open', status: 'todo', custom_data: { _view_type: 'doc' } },
            { id: 'item-done', status: 'done', custom_data: { _view_type: 'doc' } },
          ],
          error: null,
        },
      ],
    })
    const service = createTransferService(supabase)

    const result = await service.previewView(
      'space-1:docs-view',
      'user-1',
      { org_id: 'org-1' },
      'copy',
    )

    expect(result.entity).toEqual({ id: 'space-1:docs-view', name: 'Docs', type: 'view' })
    expect(result.children).toEqual({ space_items: 1, views: 1 })
  })

  it('moves a space to the target org and clears sharing rows', async () => {
    const spaceLoadQuery = createQueuedQuery({
      data: {
        id: 'space-1',
        title: 'Research space',
        org_id: null,
        campaign_id: 'campaign-1',
      },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('admin')
    const spaceMoveQuery = createMutationQuery()
    const itemsMoveQuery = createMutationQuery({ count: 2, error: null })
    const activityMoveQuery = createMutationQuery({ count: 3, error: null })
    const itemSharesDeleteQuery = createMutationQuery({ count: 1, error: null })
    const spaceSharesDeleteQuery = createMutationQuery({ count: 1, error: null })
    const supabase = createSupabaseWithQueries({
      spaces: [spaceLoadQuery, spaceMoveQuery],
      org_members: [roleQuery],
      space_items: [itemsMoveQuery],
      space_item_activity: [activityMoveQuery],
      space_item_shares: [itemSharesDeleteQuery],
      space_shares: [spaceSharesDeleteQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeSpaceTransfer(
      'space-1',
      'user-1',
      { org_id: 'org-1' },
      'move',
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'space-1',
      mode: 'move',
      transferred: {
        spaces: 1,
        space_items: 2,
        space_item_activity: 3,
        space_item_shares: 1,
        space_shares: 1,
      },
    })
    expect(spaceMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1', campaign_id: null })
    expect(itemsMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' }, { count: 'exact' })
    expect(activityMoveQuery.update).toHaveBeenCalledWith({ org_id: 'org-1' }, { count: 'exact' })
    expect(itemSharesDeleteQuery.delete).toHaveBeenCalledWith({ count: 'exact' })
    expect(spaceSharesDeleteQuery.delete).toHaveBeenCalledWith({ count: 'exact' })
  })

  it('copies a space row into the target org before copying items', async () => {
    const spaceLoadQuery = createQueuedQuery({
      data: {
        id: 'space-1',
        title: 'Research space',
        description: 'Source description',
        org_id: null,
        user_id: 'source-user',
        campaign_id: 'campaign-1',
        share_link_enabled: true,
        share_token: 'share-token',
        schema: { views: [{ id: 'view-1' }] },
        created_at: 'old-created',
        updated_at: 'old-updated',
      },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('creator')
    const spaceCopyQuery = createMutationQuery({
      data: { id: 'space-copy', title: 'Research space (Copy)', org_id: 'org-1' },
      error: null,
    })
    const itemsListQuery = createQueuedQuery({ data: [], error: null })
    const supabase = createSupabaseWithQueries({
      spaces: [spaceLoadQuery, spaceCopyQuery],
      org_members: [roleQuery],
      space_items: [itemsListQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeSpaceTransfer(
      'space-1',
      'user-1',
      { org_id: 'org-1' },
      'copy',
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'space-copy',
      mode: 'copy',
      transferred: { spaces: 1, space_items: 0 },
    })
    expect(spaceCopyQuery.insert).toHaveBeenCalledWith({
      title: 'Research space (Copy)',
      description: 'Source description',
      org_id: 'org-1',
      user_id: 'user-1',
      campaign_id: null,
      share_link_enabled: false,
      share_token: null,
      schema: { views: [{ id: 'view-1' }] },
    })
  })

  it('copies space items into the copied space and restores copied hierarchy', async () => {
    const spaceLoadQuery = createQueuedQuery({
      data: {
        id: 'space-1',
        title: 'Research space',
        org_id: null,
        user_id: 'source-user',
        campaign_id: 'campaign-1',
        schema: {},
        share_link_enabled: true,
        share_token: 'space-share-token',
        created_at: 'old-created',
        updated_at: 'old-updated',
      },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('creator')
    const spaceCopyQuery = createMutationQuery({
      data: { id: 'space-copy', title: 'Research space (Copy)', org_id: 'org-1' },
      error: null,
    })
    const itemsListQuery = createQueuedQuery({
      data: [
        {
          id: 'item-parent',
          space_id: 'space-1',
          org_id: null,
          user_id: 'source-user',
          title: 'Parent',
          status: 'todo',
          custom_data: { kind: 'parent' },
          share_link_enabled: true,
          share_token: 'parent-token',
          parent_item_id: null,
          recurrence_parent_id: null,
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
        {
          id: 'item-child',
          space_id: 'space-1',
          org_id: null,
          user_id: 'source-user',
          title: 'Child',
          status: 'todo',
          custom_data: { kind: 'child' },
          share_link_enabled: true,
          share_token: 'child-token',
          parent_item_id: 'item-parent',
          recurrence_parent_id: 'item-parent',
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
      ],
      error: null,
    })
    const parentInsertQuery = createMutationQuery({ data: { id: 'item-parent-copy' }, error: null })
    const childInsertQuery = createMutationQuery({ data: { id: 'item-child-copy' }, error: null })
    const childHierarchyUpdateQuery = createMutationQuery()
    const supabase = createSupabaseWithQueries({
      spaces: [spaceLoadQuery, spaceCopyQuery],
      org_members: [roleQuery],
      space_items: [itemsListQuery, parentInsertQuery, childInsertQuery, childHierarchyUpdateQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeSpaceTransfer(
      'space-1',
      'user-1',
      { org_id: 'org-1' },
      'copy',
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'space-copy',
      mode: 'copy',
      transferred: { spaces: 1, space_items: 2 },
    })
    expect(parentInsertQuery.insert).toHaveBeenCalledWith({
      space_id: 'space-copy',
      org_id: 'org-1',
      user_id: 'user-1',
      title: 'Parent',
      status: 'todo',
      custom_data: { kind: 'parent' },
      share_link_enabled: false,
      parent_item_id: null,
      recurrence_parent_id: null,
      share_token: null,
    })
    expect(childInsertQuery.insert).toHaveBeenCalledWith({
      space_id: 'space-copy',
      org_id: 'org-1',
      user_id: 'user-1',
      title: 'Child',
      status: 'todo',
      custom_data: { kind: 'child' },
      share_link_enabled: false,
      parent_item_id: null,
      recurrence_parent_id: null,
      share_token: null,
    })
    expect(childHierarchyUpdateQuery.update).toHaveBeenCalledWith({
      parent_item_id: 'item-parent-copy',
      recurrence_parent_id: 'item-parent-copy',
    })
    expect(childHierarchyUpdateQuery.eq).toHaveBeenCalledWith('id', 'item-child-copy')
  })

  it('moves view items into an existing target space and removes the source view', async () => {
    const sourceSpaceQuery = createQueuedQuery({
      data: {
        id: 'space-source',
        title: 'Source space',
        org_id: null,
        schema: {
          fields: [{ id: 'status', options: [{ id: 'done', group: 'done' }] }],
          views: [
            { id: 'docs-view', name: 'Docs', type: 'docs', show_closed_tasks: false },
            { id: 'other-view', name: 'Other', type: 'table' },
          ],
        },
      },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('admin')
    const viewItemsQuery = createQueuedQuery({
      data: [
        { id: 'item-open', status: 'todo', custom_data: { _view_type: 'doc' } },
        { id: 'item-done', status: 'done', custom_data: { _view_type: 'doc' } },
      ],
      error: null,
    })
    const targetSpaceQuery = createQueuedQuery({
      data: { id: 'space-target', title: 'Target space', org_id: 'org-1', schema: {} },
      error: null,
    })
    const moveItemsQuery = createMutationQuery({ count: 1, error: null })
    const updateSchemaQuery = createMutationQuery()
    const supabase = createSupabaseWithQueries({
      spaces: [sourceSpaceQuery, targetSpaceQuery, updateSchemaQuery],
      org_members: [roleQuery],
      space_items: [viewItemsQuery, moveItemsQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeViewTransfer(
      'space-source:docs-view',
      'user-1',
      { org_id: 'org-1' },
      'move',
      { target_space_id: 'space-target' },
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'space-target',
      mode: 'move',
      transferred: { views: 1, space_items: 1 },
    })
    expect(moveItemsQuery.update).toHaveBeenCalledWith(
      { org_id: 'org-1', space_id: 'space-target' },
      { count: 'exact' },
    )
    expect(moveItemsQuery.in).toHaveBeenCalledWith('id', ['item-open'])
    expect(updateSchemaQuery.update).toHaveBeenCalledWith({
      schema: {
        fields: [{ id: 'status', options: [{ id: 'done', group: 'done' }] }],
        views: [{ id: 'other-view', name: 'Other', type: 'table' }],
      },
    })
  })

  it('copies selected view items into a newly created target space', async () => {
    const sourceSpaceQuery = createQueuedQuery({
      data: {
        id: 'space-source',
        title: 'Source space',
        description: 'Docs source',
        org_id: null,
        campaign_id: null,
        schema: {
          version: 1,
          fields: [{ id: 'status', options: [{ id: 'done', group: 'done' }] }],
          views: [{ id: 'docs-view', name: 'Docs', type: 'docs', show_closed_tasks: false }],
        },
      },
      error: null,
    })
    const roleQuery = createOrgRoleQuery('creator')
    const viewItemsQuery = createQueuedQuery({
      data: [{ id: 'item-open', status: 'todo', custom_data: { _view_type: 'doc' } }],
      error: null,
    })
    const createTargetSpaceQuery = createMutationQuery({
      data: { id: 'space-target', title: 'Docs', org_id: 'org-1' },
      error: null,
    })
    const selectedItemsQuery = createQueuedQuery({
      data: [
        {
          id: 'item-open',
          space_id: 'space-source',
          org_id: null,
          user_id: 'source-user',
          title: 'Doc item',
          status: 'todo',
          custom_data: { _view_type: 'doc' },
          share_link_enabled: true,
          share_token: 'item-token',
          parent_item_id: null,
          recurrence_parent_id: null,
          created_at: 'old-created',
          updated_at: 'old-updated',
        },
      ],
      error: null,
    })
    const itemInsertQuery = createMutationQuery({ data: { id: 'item-copy' }, error: null })
    const supabase = createSupabaseWithQueries({
      spaces: [sourceSpaceQuery, createTargetSpaceQuery],
      org_members: [roleQuery],
      space_items: [viewItemsQuery, selectedItemsQuery, itemInsertQuery],
    })
    const service = createTransferService(supabase)

    const result = await service.executeViewTransfer(
      'space-source:docs-view',
      'user-1',
      { org_id: 'org-1' },
      'copy',
    )

    expect(result).toEqual({
      success: true,
      entity_id: 'space-target',
      mode: 'copy',
      transferred: { views: 1, space_items: 1 },
    })
    expect(createTargetSpaceQuery.insert).toHaveBeenCalledWith({
      org_id: 'org-1',
      user_id: 'user-1',
      title: 'Docs',
      description: 'Docs source',
      campaign_id: null,
      is_template: false,
      visibility: 'private',
      schema: {
        version: 1,
        fields: [{ id: 'status', options: [{ id: 'done', group: 'done' }] }],
        views: [
          {
            id: 'docs-view',
            name: 'Docs',
            type: 'docs',
            show_closed_tasks: false,
            pinned_to_start: false,
          },
        ],
      },
    })
    expect(itemInsertQuery.insert).toHaveBeenCalledWith({
      space_id: 'space-target',
      org_id: 'org-1',
      user_id: 'user-1',
      title: 'Doc item',
      status: 'todo',
      custom_data: { _view_type: 'doc' },
      share_link_enabled: false,
      parent_item_id: null,
      recurrence_parent_id: null,
      share_token: null,
    })
  })
})
