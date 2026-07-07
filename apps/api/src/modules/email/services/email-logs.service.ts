import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorReporter, reportAppError, type RequestScope } from '@vibey/api-shared'
import { EmailRuntimeRepository } from '../repositories/email-runtime.repository'

@Injectable()
export class EmailLogsService {
  private readonly logger = new Logger(EmailLogsService.name)

  constructor(
    private readonly errorReporter: ErrorReporter,
    private readonly emailRuntime: EmailRuntimeRepository = new EmailRuntimeRepository(),
  ) {}

  async getLogs(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    status?: string,
    type?: string,
    startDate?: string,
    endDate?: string,
    includeArchived?: string,
    limitStr?: string,
    offsetStr?: string,
  ) {
    try {
      const limit = parseInt(limitStr || '50', 10)
      const offset = parseInt(offsetStr || '0', 10)

      const { data, count } = await this.emailRuntime.listEmailSends(supabase, {
        userId: user.id,
        orgId: scope.orgId,
        status,
        startDate,
        endDate,
        includeArchived: includeArchived === 'true',
        limit,
        offset,
      })

      const logs = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id,
        email_type: row.sequence_id ? 'sequence' : 'single',
        recipient_email: null,
        recipient_name: null,
        from_email: row.from_email,
        subject: row.subject,
        status: row.status,
        sent_at: row.sent_at,
        delivered_at: row.delivered_at,
        opened_at: row.opened_at,
        clicked_at: row.clicked_at,
        created_at: row.created_at,
        is_archived: row.is_archived,
        html_body: row.html_body,
      }))

      return { success: true, logs, total: count }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to load email logs: ${message}`)
      reportAppError(this.errorReporter, {
        app: process.env.APP_NAME ?? 'api',
        category: 'integration',
        feature: 'email/logs',
        error_code: 'load_logs_failed',
        message,
        user_id: user.id,
      })
      throw new HttpException(
        { success: false, error: 'Failed to load email logs' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async getScheduleCount(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    sequenceId?: string,
    status?: string,
  ) {
    try {
      const count = await this.emailRuntime.countSingleEmailSchedules(supabase, {
        userId: user.id,
        orgId: scope.orgId,
        sequenceId,
        status,
      })
      return { count }
    } catch (error) {
      this.logger.error(`Failed to count schedules: ${error}`)
      throw new HttpException(
        { success: false, error: 'Failed to count schedules' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  async archiveLog(
    supabase: SupabaseClient,
    user: { id: string },
    logId: string,
    body: { archive: boolean },
    scope: RequestScope,
  ) {
    try {
      await this.emailRuntime.archiveEmailSend(supabase, {
        userId: user.id,
        orgId: scope.orgId,
        logId,
        archive: body.archive,
      })
      return { success: true }
    } catch (error) {
      this.logger.error(`Failed to archive email log: ${error}`)
      throw new HttpException(
        { success: false, error: 'Failed to archive email log' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
