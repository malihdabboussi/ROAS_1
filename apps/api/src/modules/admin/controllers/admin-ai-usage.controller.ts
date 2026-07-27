import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, RoleGuard, Roles } from '@vibey/api-shared'
import { AdminAiUsageService } from '../services/admin-ai-usage.service'
import type { AdminAiUsageRangeQuery } from '../types/admin-ai-usage.types'

@Controller('admin/ai-usage')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class AdminAiUsageController {
  constructor(private readonly service: AdminAiUsageService) {}

  @Get()
  getReport(
    @Query('days') days?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const query: AdminAiUsageRangeQuery = { days, start, end }
    return this.service.getReport(query)
  }
}
