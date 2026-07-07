import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import {
  CreateCustomFieldDtoSchema,
  UpdateCustomFieldDtoSchema,
  type CreateCustomFieldInput,
  type UpdateCustomFieldInput,
} from '../dto'
import { CustomFieldsService } from '../services/custom-fields.service'

@Controller('custom-fields')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard)
export class CustomFieldsController {
  private readonly logger = new Logger(CustomFieldsController.name)

  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  async getCustomFields(@Supabase() supabase: SupabaseClient, @OrgContext() scope: RequestScope) {
    return this.customFieldsService.getCustomFields(supabase, scope.orgId)
  }

  @Get(':id')
  async getCustomFieldById(
    @Param('id') id: string,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      return await this.customFieldsService.getCustomFieldById(supabase, id, scope.orgId)
    } catch (error) {
      if ((error as Error).message === 'Custom field not found') {
        throw new HttpException('Custom field not found', HttpStatus.NOT_FOUND)
      }
      throw new HttpException('Failed to get custom field', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCustomField(
    @Body(new ZodValidationPipe(CreateCustomFieldDtoSchema)) dto: CreateCustomFieldInput,
    @CurrentUser() user: { id: string; email: string },
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      return await this.customFieldsService.createCustomField(supabase, user.id, dto, scope.orgId)
    } catch (error) {
      if ((error as Error).message === 'Custom field name already exists') {
        throw new HttpException('Custom field name already exists', HttpStatus.CONFLICT)
      }
      this.logger.error(`Failed to create custom field: ${error}`)
      throw new HttpException('Failed to create custom field', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Patch(':id')
  async updateCustomField(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCustomFieldDtoSchema)) dto: UpdateCustomFieldInput,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    try {
      return await this.customFieldsService.updateCustomField(supabase, id, dto, scope.orgId)
    } catch (error) {
      if ((error as Error).message === 'Custom field not found') {
        throw new HttpException('Custom field not found', HttpStatus.NOT_FOUND)
      }
      if ((error as Error).message === 'Custom field name already exists') {
        throw new HttpException('Custom field name already exists', HttpStatus.CONFLICT)
      }
      this.logger.error(`Failed to update custom field: ${error}`)
      throw new HttpException('Failed to update custom field', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  @Delete(':id')
  async deleteCustomField(
    @Param('id') id: string,
    @Supabase() supabase: SupabaseClient,
    @OrgContext() scope: RequestScope,
  ) {
    return this.customFieldsService.deleteCustomField(supabase, id, scope.orgId)
  }
}
