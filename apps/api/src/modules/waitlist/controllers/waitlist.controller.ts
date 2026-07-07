import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard, CurrentUser, ZodValidationPipe } from '@vibey/api-shared'
import { FastTrackCheckoutDto, RegisterWithInviteDto, WaitlistJoinDto } from '../dto/waitlist.dto'
import { WaitlistService } from '../services/waitlist.service'

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UsePipes(new ZodValidationPipe(WaitlistJoinDto))
  async join(@Body() body: WaitlistJoinDto) {
    return this.waitlistService.joinWaitlist({
      email: body.email,
      name: body.name,
      source: body.source,
      notes: body.notes,
      heard_from: body.heard_from,
      use_case: body.use_case,
    })
  }

  @Get('count')
  @Throttle({ default: { ttl: 10000, limit: 20 } })
  async count() {
    return this.waitlistService.getWaitlistCount()
  }

  @Post('fast-track-checkout')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UsePipes(new ZodValidationPipe(FastTrackCheckoutDto))
  async fastTrackCheckout(@Body() body: FastTrackCheckoutDto) {
    const appUrl = process.env.APP_URL ?? 'https://app.govibey.com'
    const successUrl =
      body.successUrl ?? `${appUrl}/fast-track-success?session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = body.cancelUrl ?? 'https://vibey.im'
    try {
      return await this.waitlistService.createFastTrackCheckout(body.email, successUrl, cancelUrl)
    } catch (err) {
      throw new BadRequestException(
        err instanceof Error ? err.message : 'Fast track checkout failed',
      )
    }
  }

  @Get('fast-track-status/:sessionId')
  @Throttle({ default: { ttl: 5000, limit: 30 } })
  async fastTrackStatus(@Param('sessionId') sessionId: string) {
    return this.waitlistService.getFastTrackStatus(sessionId)
  }

  @Post('fast-track-link')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async fastTrackLink(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: { sessionId?: string },
  ) {
    return this.waitlistService.linkFastTrackSubscription(user.id, user.email, body.sessionId)
  }
}

@Controller('auth')
export class RegisterWithInviteController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post('register-with-invite')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UsePipes(new ZodValidationPipe(RegisterWithInviteDto))
  async registerWithInvite(@Body() body: RegisterWithInviteDto) {
    const result = await this.waitlistService.registerWithInvite(
      body.email,
      body.password,
      body.code,
    )
    if ('error' in result) {
      return { error: result.error, statusCode: result.status }
    }
    return result
  }

  @Get('invite-codes/:code')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async validateInviteCode(@Param('code') code: string) {
    return this.waitlistService.validateDirectInviteCode(code)
  }
}
