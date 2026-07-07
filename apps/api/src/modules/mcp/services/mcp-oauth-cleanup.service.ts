import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { McpOAuthService } from './mcp-oauth.service'

@Injectable()
export class McpOAuthCleanupService {
  constructor(private readonly oauth: McpOAuthService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredOAuthRows() {
    await this.oauth.cleanupExpiredRows()
  }
}
