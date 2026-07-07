import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { InternalService } from '../services/internal.service'

/**
 * Internal Controller
 *
 * Service-to-service endpoints for the Vibey agent.
 * Auth: INTERNAL_API_TOKEN via InternalAuthGuard.
 * Uses service role Supabase client (no RLS).
 */
@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  // ─── Offers ───

  /**
   * POST /api/internal/offers
   * Create an offer on behalf of a user.
   */
  @Post('offers')
  @HttpCode(HttpStatus.CREATED)
  async createOffer(@Body() body: { user_id: string; campaign_id: string; name: string }) {
    if (!body.user_id || !body.campaign_id || !body.name) {
      throw new BadRequestException('user_id, campaign_id, and name are required')
    }
    return this.internalService.createOffer(body)
  }

  /**
   * POST /api/internal/offers/:id/steps
   * Update offer step data.
   */
  @Post('offers/:id/steps')
  @HttpCode(HttpStatus.CREATED)
  async updateOfferStep(
    @Param('id') id: string,
    @Body() body: { step_number: number; step_name: string; data: unknown },
  ) {
    if (!body.step_number || !body.step_name || body.data === undefined) {
      throw new BadRequestException('step_number, step_name, and data are required')
    }
    return this.internalService.updateOfferStep(id, body)
  }

  // ─── Documents ───

  /**
   * POST /api/internal/documents
   * Create a conversation document.
   */
  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Body()
    body: {
      user_id: string
      conversation_id: string
      campaign_id?: string
      document_type: string
      title: string
      content: unknown
      resource_id?: string
    },
  ) {
    if (!body.user_id || !body.conversation_id || !body.document_type || !body.title) {
      throw new BadRequestException(
        'user_id, conversation_id, document_type, and title are required',
      )
    }
    return this.internalService.createDocument(body)
  }

  // ─── Sequences ───

  /**
   * POST /api/internal/sequences
   * Create a sequence.
   */
  @Post('sequences')
  @HttpCode(HttpStatus.CREATED)
  async createSequence(
    @Body()
    body: {
      user_id: string
      campaign_id?: string
      offer_id?: string
      name: string
      trigger?: unknown
      config?: unknown
    },
  ) {
    if (!body.user_id || !body.name) {
      throw new BadRequestException('user_id and name are required')
    }
    return this.internalService.createSequence(body)
  }

  /**
   * POST /api/internal/sequences/:id/emails
   * Create a sequence email.
   */
  @Post('sequences/:id/emails')
  @HttpCode(HttpStatus.CREATED)
  async createSequenceEmail(
    @Param('id') id: string,
    @Body()
    body: {
      subject: string
      body: string
      delay_hours: number
      order_index: number
    },
  ) {
    if (
      !body.subject ||
      !body.body ||
      body.delay_hours === undefined ||
      body.order_index === undefined
    ) {
      throw new BadRequestException('subject, body, delay_hours, and order_index are required')
    }
    return this.internalService.createSequenceEmail(id, body)
  }

  // ─── Storage ───

  /**
   * POST /api/internal/storage/upload
   * Upload a file to Supabase Storage.
   */
  @Post('storage/upload')
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @Body()
    body: {
      user_id: string
      campaign_id: string
      file_path: string
      content: string
      content_type: string
    },
  ) {
    if (
      !body.user_id ||
      !body.campaign_id ||
      !body.file_path ||
      !body.content ||
      !body.content_type
    ) {
      throw new BadRequestException(
        'user_id, campaign_id, file_path, content, and content_type are required',
      )
    }
    return this.internalService.uploadFile(body)
  }
}
