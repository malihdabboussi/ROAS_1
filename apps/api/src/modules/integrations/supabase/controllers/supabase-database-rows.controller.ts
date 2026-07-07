import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
} from '@vibey/api-shared'
import type { RequestScope } from '@vibey/api-shared'
import { SupabaseManagementService } from '../services/supabase-management.service'
import { SupabaseProjectLinksService } from '../services/supabase-project-links.service'

@Controller('integrations/supabase')
export class SupabaseDatabaseRowsController {
  constructor(
    private readonly management: SupabaseManagementService,
    private readonly projectLinks: SupabaseProjectLinksService,
  ) {}

  @Get('database/tables/:table/rows')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async fetchTableRows(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('table') table: string,
    @Query('projectRef') projectRef: string,
    @Query('offset') offset = '0',
    @Query('limit') limit = '50',
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)

    const safeTable = this.quoteIdent(table)
    const off = Math.max(0, parseInt(offset, 10) || 0)
    const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50))

    const rows = (await this.management.runReadOnlyQuery(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      `SELECT * FROM public.${safeTable} LIMIT ${lim} OFFSET ${off}`,
    )) as Record<string, unknown>[]
    const countResult = (await this.management.runReadOnlyQuery(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      `SELECT count(*)::int as cnt FROM public.${safeTable}`,
    )) as Record<string, unknown>[]

    return {
      success: true,
      rows,
      totalCount: (countResult[0]?.cnt as number) ?? 0,
    }
  }

  @Post('database/tables/:table/rows')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async insertRow(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('table') table: string,
    @Query('projectRef') projectRef: string,
    @Body() body: { data: Record<string, unknown> },
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)

    const entries = Object.entries(body.data).filter(([, v]) => v !== undefined)
    if (entries.length === 0) throw new BadRequestException('No data provided')

    const cols = entries.map(([k]) => this.quoteIdent(k)).join(', ')
    const placeholders = entries.map((_, i) => `$${i + 1}`).join(', ')
    const values = entries.map(([, v]) => v)
    const safeTable = this.quoteIdent(table)
    const result = await this.management.runQuery(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      `INSERT INTO public.${safeTable} (${cols}) VALUES (${placeholders}) RETURNING *`,
      values,
    )

    return { success: true, row: Array.isArray(result) ? result[0] : result }
  }

  @Patch('database/tables/:table/rows')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async updateRow(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('table') table: string,
    @Query('projectRef') projectRef: string,
    @Body() body: { primaryKeys: Record<string, unknown>; data: Record<string, unknown> },
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)

    const dataEntries = Object.entries(body.data).filter(([, v]) => v !== undefined)
    const pkEntries = Object.entries(body.primaryKeys)
    if (dataEntries.length === 0) throw new BadRequestException('No data to update')
    if (pkEntries.length === 0) throw new BadRequestException('No primary keys provided')

    let paramIdx = 1
    const setClauses = dataEntries.map(([k]) => `${this.quoteIdent(k)} = $${paramIdx++}`).join(', ')
    const whereClauses = pkEntries
      .map(([k]) => `${this.quoteIdent(k)} = $${paramIdx++}`)
      .join(' AND ')
    const values = [...dataEntries.map(([, v]) => v), ...pkEntries.map(([, v]) => v)]
    const safeTable = this.quoteIdent(table)
    const result = await this.management.runQuery(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      `UPDATE public.${safeTable} SET ${setClauses} WHERE ${whereClauses} RETURNING *`,
      values,
    )

    return { success: true, row: Array.isArray(result) ? result[0] : result }
  }

  @Delete('database/tables/:table/rows')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async deleteRow(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Param('table') table: string,
    @Query('projectRef') projectRef: string,
    @Body() body: { primaryKeys: Record<string, unknown> },
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)

    const pkEntries = Object.entries(body.primaryKeys)
    if (pkEntries.length === 0) throw new BadRequestException('No primary keys provided')

    const whereClauses = pkEntries
      .map(([k], i) => `${this.quoteIdent(k)} = $${i + 1}`)
      .join(' AND ')
    const values = pkEntries.map(([, v]) => v)
    const safeTable = this.quoteIdent(table)
    await this.management.runQuery(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      `DELETE FROM public.${safeTable} WHERE ${whereClauses}`,
      values,
    )

    return { success: true }
  }

  private quoteIdent(name: string): string {
    return `"${name.replace(/"/g, '""')}"`
  }
}
