import { Body, Controller, Get, Headers, Ip, Param, Post, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { ZodValidationPipe } from '@vibey/api-shared'
import {
  PublicFormTokenParamSchema,
  SubmitFormSchema,
  type PublicFormTokenParam,
  type SubmitFormDto,
} from '../dto'
import { FormsService } from '../services/forms.service'

@Controller('public/forms')
@UseGuards(ThrottlerGuard)
export class PublicFormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get(':token')
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  async get(
    @Param(new ZodValidationPipe(PublicFormTokenParamSchema)) params: PublicFormTokenParam,
  ) {
    return this.formsService.getPublicForm(params.token)
  }

  @Post(':token/submit')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async submit(
    @Param(new ZodValidationPipe(PublicFormTokenParamSchema)) params: PublicFormTokenParam,
    @Body(new ZodValidationPipe(SubmitFormSchema)) body: SubmitFormDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.formsService.submitPublicForm(params.token, body, {
      ip,
      userAgent: userAgent ?? null,
    })
  }
}
