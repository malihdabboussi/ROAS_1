import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'
import { ErrorReporter } from '@vibey/api-shared'
import { RuntimeIdentityGuard } from '../agent-sync/guards/runtime-identity.guard'
import { parseOpenClawErrorDto } from './dto/openclaw-error.dto'

@Controller('internal/observability')
@UseGuards(RuntimeIdentityGuard)
export class InternalOpenClawObservabilityController {
  constructor(private readonly errorReporter: ErrorReporter) {}

  @Post('openclaw-error')
  @HttpCode(204)
  reportOpenClawError(@Body() body: unknown): void {
    const dto = parseOpenClawErrorDto(body)
    this.errorReporter.report({
      app: 'openclaw',
      category: 'runtime',
      severity: dto.severity,
      feature: dto.feature,
      error_code: dto.error_code,
      message: dto.message,
      stack: dto.stack,
      route: dto.route,
      trace_id: dto.trace_id,
      message_id: dto.message_id,
      request_id: dto.request_id,
      run_id: dto.run_id,
      conversation_id: dto.conversation_id,
      source_file: dto.source_file,
      source_line: dto.source_line,
      source_column: dto.source_column,
      function_name: dto.function_name,
      runtime_file: dto.runtime_file,
      runtime_line: dto.runtime_line,
      runtime_column: dto.runtime_column,
      commit_sha: dto.commit_sha,
      release_id: dto.release_id,
      build_id: dto.build_id,
      source_resolved: dto.source_resolved,
      source_context: dto.source_context,
      context: {
        ...dto.context,
        reporter: 'openclaw_internal_observability',
      },
    })
  }
}
