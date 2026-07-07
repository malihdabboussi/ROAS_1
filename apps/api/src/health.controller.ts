import { Controller, Get } from '@nestjs/common'

@Controller()
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'vibey-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    }
  }
}
