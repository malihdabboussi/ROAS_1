import { describe, expect, it } from 'vitest'
import { applyWebhookFieldMappings, resolveJsonPointer } from '../space-webhook-mapping'

describe('space webhook mapping', () => {
  it('extracts mapped fields with JSON Pointer escaping and null missing paths', () => {
    const payload = {
      customer: { email: 'customer@example.com' },
      items: [{ sku: 'SKU-1' }],
      'literal/slash': { 'tilde~key': true },
    }

    expect(resolveJsonPointer(payload, '/customer/email')).toBe('customer@example.com')
    expect(resolveJsonPointer(payload, '/items/0/sku')).toBe('SKU-1')
    expect(resolveJsonPointer(payload, '/literal~1slash/tilde~0key')).toBe(true)
    expect(resolveJsonPointer(payload, '/customer/missing')).toBeNull()

    expect(
      applyWebhookFieldMappings(payload, [
        { key: 'customer_email', label: 'Customer email', source_path: '/customer/email' },
        { key: 'first_sku', label: 'First SKU', source_path: '/items/0/sku' },
        { key: 'missing_field', label: 'Missing', source_path: '/missing' },
      ]),
    ).toEqual({
      customer_email: 'customer@example.com',
      first_sku: 'SKU-1',
      missing_field: null,
    })
  })
})
