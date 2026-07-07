import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
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
export class SupabaseDatabaseQueryController {
  constructor(
    private readonly management: SupabaseManagementService,
    private readonly projectLinks: SupabaseProjectLinksService,
  ) {}

  @Post('database/query')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async runDatabaseQuery(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('projectRef') projectRef: string,
    @Body() body: { query: string },
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    if (!body.query?.trim()) throw new BadRequestException('query is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)

    const isReadOnly = /^\s*(SELECT|WITH)\b/i.test(body.query.trim())
    const result = isReadOnly
      ? await this.management.runReadOnlyQuery(
          supabase,
          user.id,
          scope.orgId,
          projectRef,
          body.query,
        )
      : await this.management.runQuery(supabase, user.id, scope.orgId, projectRef, body.query)

    return { success: true, result }
  }

  @Get('database/tables')
  @UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
  async listTables(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('projectRef') projectRef: string,
  ) {
    if (!projectRef) throw new BadRequestException('projectRef is required')
    await this.projectLinks.assertProjectOwnership(supabase, projectRef)

    const allColumnsResult = (await this.management.runReadOnlyQuery(
      supabase,
      user.id,
      scope.orgId,
      projectRef,
      `SELECT
         c.table_name,
         c.column_name,
         c.data_type,
         c.is_nullable,
         c.column_default,
         c.ordinal_position,
         EXISTS(
           SELECT 1 FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
           WHERE tc.table_schema = 'public'
             AND tc.table_name = c.table_name
             AND tc.constraint_type = 'PRIMARY KEY'
             AND kcu.column_name = c.column_name
         ) as is_primary_key
       FROM information_schema.columns c
       JOIN information_schema.tables t
         ON t.table_schema = c.table_schema AND t.table_name = c.table_name
       WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
       ORDER BY c.table_name, c.ordinal_position`,
    )) as Record<string, unknown>[]

    const tableMap = new Map<
      string,
      {
        name: string
        columns: {
          name: string
          dataType: string
          isNullable: boolean
          isPrimaryKey: boolean
          defaultValue: string | null
        }[]
        rowCount: number
      }
    >()

    for (const row of allColumnsResult) {
      const tName = row.table_name as string
      if (!tableMap.has(tName)) {
        tableMap.set(tName, { name: tName, columns: [], rowCount: 0 })
      }
      tableMap.get(tName)!.columns.push({
        name: row.column_name as string,
        dataType: row.data_type as string,
        isNullable: (row.is_nullable as string) === 'YES',
        isPrimaryKey: row.is_primary_key === true || row.is_primary_key === 't',
        defaultValue: (row.column_default as string) ?? null,
      })
    }

    if (tableMap.size > 0) {
      const countUnions = [...tableMap.keys()]
        .map(
          (t) =>
            `SELECT '${t.replace(/'/g, "''")}' as t, count(*)::int as cnt FROM public.${this.quoteIdent(t)}`,
        )
        .join(' UNION ALL ')

      const countRows = (await this.management.runReadOnlyQuery(
        supabase,
        user.id,
        scope.orgId,
        projectRef,
        countUnions,
      )) as Record<string, unknown>[]

      for (const cr of countRows) {
        const entry = tableMap.get(cr.t as string)
        if (entry) entry.rowCount = (cr.cnt as number) ?? 0
      }
    }

    return { success: true, tables: [...tableMap.values()] }
  }

  private quoteIdent(name: string): string {
    return `"${name.replace(/"/g, '""')}"`
  }
}
