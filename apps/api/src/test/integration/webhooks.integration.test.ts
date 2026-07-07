/**
 * Webhook Integration Tests — Stripe webhook handler
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { StripeService } from '../../modules/billing/services/stripe.service'
import { createTestApp } from './test-helpers'

describe('Webhooks Integration', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await createTestApp()
  }, 30_000)
  afterAll(async () => {
    await app?.close()
  })

  describe('POST /api/billing/webhook', () => {
    it('returns 400 when stripe-signature is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/billing/webhook')
        .send({ type: 'test' })
        .expect(400)
    })

    for (const eventType of [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
    ]) {
      it(`handles ${eventType}`, async () => {
        const svc = app.get(StripeService)
        vi.spyOn(svc, 'handleWebhookEvent').mockResolvedValue({ received: true, type: eventType })
        const res = await request(app.getHttpServer())
          .post('/api/billing/webhook')
          .set('stripe-signature', 'test_sig')
          .set('Content-Type', 'application/json')
          .send(JSON.stringify({ type: eventType }))
          .expect(200)
        expect(res.body.received).toBe(true)
        expect(res.body.type).toBe(eventType)
        vi.restoreAllMocks()
      })
    }
  })
})
