import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { CustomerBrainMemoryWriteService } from '../services/customer-brain-memory-write.service'
import { CustomerBrainService } from '../services/customer-brain.service'

@Controller('brain')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class CustomerBrainController {
  constructor(
    private readonly customerBrain: CustomerBrainService,
    private readonly memoryWrites: CustomerBrainMemoryWriteService,
  ) {}

  @Get('customer/status')
  async getCustomerBrainStatus(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
  ) {
    if (scope.orgId && scope.orgRole === 'viewer') {
      throw new ForbiddenException('Viewers cannot access Brain')
    }
    const brain = await this.customerBrain.getOrCreateCustomerBrain({
      ownerId: user.id,
      orgId: scope.orgId ?? null,
    })
    return {
      success: true,
      brain_id: brain.id,
      enabled: brain.cortex_max === true,
    }
  }

  /**
   * Direct customer-brain text-memory write. Used by the "Add Information"
   * dropdown on the customer brain page so the user can deliberately attach a
   * note (optionally tied to a specific contact) without going through the
   * Atlas routing skill.
   */
  @Post('customer/memories/text')
  @HttpCode(HttpStatus.CREATED)
  async addCustomerMemoryText(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body()
    body: {
      brainId?: string
      title?: string | null
      content: string
      contactId?: string | null
      sourceType?: string | null
    },
  ) {
    return this.memoryWrites.addTextMemory(user.id, scope, body)
  }

  /**
   * Direct customer-brain link-memory write. Stores the URL as a memory and
   * leaves richer extraction to the existing link-preview pipeline downstream.
   */
  @Post('customer/memories/link')
  @HttpCode(HttpStatus.CREATED)
  async addCustomerMemoryLink(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body()
    body: { brainId?: string; url: string; title?: string | null; contactId?: string | null },
  ) {
    return this.memoryWrites.addLinkMemory(user.id, scope, body)
  }

  @Patch('customer/enabled')
  async setCustomerBrainEnabled(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: { enabled: boolean },
  ) {
    const brain = await this.customerBrain.setCustomerBrainEnabled({
      ownerId: user.id,
      orgId: scope.orgId ?? null,
      enabled: body.enabled === true,
    })
    return {
      success: true,
      brain_id: brain?.id ?? null,
      enabled: brain?.cortex_max === true,
    }
  }

  @Get('customer/view')
  async getCustomerBrainView(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Query('brainId') brainId?: string,
  ) {
    return this.customerBrain.getCustomerBrainView({
      ownerId: user.id,
      orgId: scope.orgId ?? null,
      orgRole: scope.orgRole ?? null,
      brainId: brainId ?? null,
    })
  }
}
