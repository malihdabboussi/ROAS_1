import { Injectable } from '@nestjs/common'
import type { ArtifactActionHandler } from './artifact-action.registry'

@Injectable()
export class ArtifactSupabaseService {
  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      supabase_list_tables: (data, sessionKey) => this.listTables(target, data, sessionKey),
      supabase_run_sql: (data, sessionKey) => this.runSql(target, data, sessionKey),
      supabase_create_table: (data, sessionKey) => this.createTable(target, data, sessionKey),
      supabase_insert_rows: (data, sessionKey) => this.insertRows(target, data, sessionKey),
      supabase_update_rows: (data, sessionKey) => this.updateRows(target, data, sessionKey),
      supabase_delete_rows: (data, sessionKey) => this.deleteRows(target, data, sessionKey),
    }
  }

  private async resolveProjectRef(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<string | null> {
    const projectId = String(data.project_id ?? '').trim()
    if (!projectId) return null

    const result = await target.mainApiCall('GET', `/api/projects/${projectId}`, sessionKey)
    return result?.supabase_project_ref ?? null
  }

  private async listTables(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const ref = await this.resolveProjectRef(target, data, sessionKey)
    if (!ref)
      return {
        success: false,
        error: 'project_id is required and must have a linked Supabase project',
      }

    return target.mainApiCall(
      'GET',
      `/api/integrations/supabase/database/tables?projectRef=${encodeURIComponent(ref)}`,
      sessionKey,
    )
  }

  private async runSql(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const ref = await this.resolveProjectRef(target, data, sessionKey)
    if (!ref)
      return {
        success: false,
        error: 'project_id is required and must have a linked Supabase project',
      }

    const query = String(data.query ?? '').trim()
    if (!query) return { success: false, error: 'query is required' }

    return target.mainApiCall(
      'POST',
      `/api/integrations/supabase/database/query?projectRef=${encodeURIComponent(ref)}`,
      sessionKey,
      { query },
    )
  }

  private async createTable(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const ref = await this.resolveProjectRef(target, data, sessionKey)
    if (!ref)
      return {
        success: false,
        error: 'project_id is required and must have a linked Supabase project',
      }

    const tableName = String(data.table_name ?? '').trim()
    if (!tableName) return { success: false, error: 'table_name is required' }

    const columns = data.columns as {
      name: string
      type: string
      nullable?: boolean
      default?: string
      primary_key?: boolean
    }[]
    if (!Array.isArray(columns) || columns.length === 0)
      return { success: false, error: 'columns array is required' }

    const colDefs = columns.map((col) => {
      const parts = [`"${col.name.replace(/"/g, '""')}" ${col.type}`]
      if (col.primary_key) parts.push('PRIMARY KEY')
      if (col.nullable === false) parts.push('NOT NULL')
      if (col.default !== undefined) parts.push(`DEFAULT ${col.default}`)
      return parts.join(' ')
    })

    const enableRls = data.enable_rls !== false
    const sql = [
      `CREATE TABLE IF NOT EXISTS public."${tableName.replace(/"/g, '""')}" (\n  ${colDefs.join(',\n  ')}\n);`,
      enableRls
        ? `ALTER TABLE public."${tableName.replace(/"/g, '""')}" ENABLE ROW LEVEL SECURITY;`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    return target.mainApiCall(
      'POST',
      `/api/integrations/supabase/database/query?projectRef=${encodeURIComponent(ref)}`,
      sessionKey,
      { query: sql },
    )
  }

  private async insertRows(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const ref = await this.resolveProjectRef(target, data, sessionKey)
    if (!ref)
      return {
        success: false,
        error: 'project_id is required and must have a linked Supabase project',
      }

    const table = String(data.table ?? '').trim()
    if (!table) return { success: false, error: 'table is required' }

    const rows = data.rows as Record<string, unknown>[]
    if (!Array.isArray(rows) || rows.length === 0)
      return { success: false, error: 'rows array is required' }

    const results: unknown[] = []
    for (const row of rows) {
      const result = await target.mainApiCall(
        'POST',
        `/api/integrations/supabase/database/tables/${encodeURIComponent(table)}/rows?projectRef=${encodeURIComponent(ref)}`,
        sessionKey,
        { data: row },
      )
      results.push(result)
    }

    return { success: true, inserted: results.length }
  }

  private async updateRows(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const ref = await this.resolveProjectRef(target, data, sessionKey)
    if (!ref)
      return {
        success: false,
        error: 'project_id is required and must have a linked Supabase project',
      }

    const table = String(data.table ?? '').trim()
    if (!table) return { success: false, error: 'table is required' }

    const primaryKeys = data.primary_keys as Record<string, unknown>
    const updates = data.data as Record<string, unknown>
    if (!primaryKeys || !updates)
      return { success: false, error: 'primary_keys and data are required' }

    return target.mainApiCall(
      'PATCH',
      `/api/integrations/supabase/database/tables/${encodeURIComponent(table)}/rows?projectRef=${encodeURIComponent(ref)}`,
      sessionKey,
      { primaryKeys, data: updates },
    )
  }

  private async deleteRows(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const ref = await this.resolveProjectRef(target, data, sessionKey)
    if (!ref)
      return {
        success: false,
        error: 'project_id is required and must have a linked Supabase project',
      }

    const table = String(data.table ?? '').trim()
    if (!table) return { success: false, error: 'table is required' }

    const primaryKeys = data.primary_keys as Record<string, unknown>
    if (!primaryKeys) return { success: false, error: 'primary_keys is required' }

    return target.mainApiCall(
      'DELETE',
      `/api/integrations/supabase/database/tables/${encodeURIComponent(table)}/rows?projectRef=${encodeURIComponent(ref)}`,
      sessionKey,
      { primaryKeys },
    )
  }
}
