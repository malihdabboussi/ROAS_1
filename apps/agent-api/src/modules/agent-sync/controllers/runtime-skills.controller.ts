import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common'
import { z } from 'zod'
import { ZodValidationPipe } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../artifacts/guards/internal-auth.guard'
import { AgentRuntimeSkillScopeService } from '../services/agent-runtime-skill-scope.service'
import { parseRuntimeSkillSessionContext } from '../services/runtime-skill-session-key'

const RuntimeSkillReadBodySchema = z.object({
  skill_key: z.string().min(1),
  path: z.string().min(1).optional(),
})

type RuntimeSkillReadBody = z.infer<typeof RuntimeSkillReadBodySchema>

@Controller('agents/runtime-skills')
@UseGuards(InternalAuthGuard)
export class RuntimeSkillsController {
  constructor(private readonly skillScope: AgentRuntimeSkillScopeService) {}

  @Post('read')
  async read(
    @Headers('x-session-key') sessionKeyHeader: string | string[] | undefined,
    @Body(new ZodValidationPipe(RuntimeSkillReadBodySchema)) body: RuntimeSkillReadBody,
  ) {
    const sessionKey = Array.isArray(sessionKeyHeader) ? sessionKeyHeader[0] : sessionKeyHeader
    const context = parseRuntimeSkillSessionContext(sessionKey)
    if (!context) {
      throw new BadRequestException('Missing or invalid x-session-key')
    }
    const archetype = await this.skillScope.resolveAgentArchetype({
      agentKey: context.agentKey,
      userId: context.userId,
      orgId: context.orgId,
    })
    const result = await this.skillScope.readRuntimeSkill({
      agentKey: context.agentKey,
      userId: context.userId,
      orgId: context.orgId,
      archetype,
      skillKey: body.skill_key,
      path: body.path,
    })
    if (!result) {
      throw new NotFoundException('Skill or resource not found')
    }
    return result
  }
}
