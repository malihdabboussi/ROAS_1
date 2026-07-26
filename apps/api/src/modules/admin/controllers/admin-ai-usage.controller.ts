import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AuthGuard, RoleGuard, Roles } from '@vibey/api-shared'
import { AdminAiUsageService } from '../services/admin-ai-usage.service'

@Controller('admin/ai-usage')
@UseGuards(AuthGuard, RoleGuard)
@Roles('admin')
export class AdminAiUsageController {
  constructor(private readonly service: AdminAiUsageService) {}

  @Get()
  getReport(@Query('days') days?: string) {
    return this.service.getReport(Number(days) || 7)
  }
}
