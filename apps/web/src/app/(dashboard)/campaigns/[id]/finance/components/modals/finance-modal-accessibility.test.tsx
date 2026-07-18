import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProductWithPrices } from '../../types'
import { AddPriceModal } from './AddPriceModal'
import { NewCouponModal } from './NewCouponModal'
import { NewPaymentLinkModal } from './NewPaymentLinkModal'
import { NewProductModal } from './NewProductModal'
import { ProductDetailModal } from './ProductDetailModal'

vi.mock('@/components/media/MediaPickerModal', () => ({ MediaPickerModal: () => null }))

const product: ProductWithPrices = {
  id: 'product-1',
  name: 'Launch offer',
  description: null,
  active: true,
  created: 1_767_225_600,
  metadata: {},
  prices: [],
}

describe('finance modal accessibility', () => {
  afterEach(cleanup)

  it('describes and names the add-price dialog controls', () => {
    render(
      <AddPriceModal
        open
        saving={false}
        setOpen={vi.fn()}
        addPriceProductId={product.id}
        setAddPriceProductId={vi.fn()}
        products={[product]}
        onSubmit={vi.fn()}
        form={{
          addPriceAmount: '',
          setAddPriceAmount: vi.fn(),
          addPriceCurrency: 'usd',
          setAddPriceCurrency: vi.fn(),
          addPriceInterval: '',
          setAddPriceInterval: vi.fn(),
          resetAddPriceForm: vi.fn(),
        }}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Add Price' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText(/Add a price to Launch offer/).id,
    )
    expect(screen.getByRole('button', { name: 'Close add price' })).toBeTruthy()
    expect(screen.getByLabelText('Amount *')).toBeTruthy()
    expect(screen.getByLabelText('Currency')).toBeTruthy()
    expect(screen.getByLabelText('Billing')).toBeTruthy()
  })

  it('describes and names the payment-link dialog controls', () => {
    render(
      <NewPaymentLinkModal
        open
        saving={false}
        setOpen={vi.fn()}
        onSubmit={vi.fn()}
        priceOptions={[{ priceId: 'price-1', label: '$49' }]}
        productsHaveLoadingPrices={false}
        form={{
          newLinkPriceId: 'price-1',
          setNewLinkPriceId: vi.fn(),
          newLinkQuantity: '1',
          setNewLinkQuantity: vi.fn(),
          resetLinkForm: vi.fn(),
        }}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'New Payment Link' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Create a shareable checkout link').id,
    )
    expect(screen.getByRole('button', { name: 'Close new payment link' })).toBeTruthy()
    expect(screen.getByLabelText('Price *')).toBeTruthy()
    expect(screen.getByLabelText('Quantity')).toBeTruthy()
  })

  it('describes and labels the coupon form', () => {
    render(
      <NewCouponModal
        open
        saving={false}
        setOpen={vi.fn()}
        onSubmit={vi.fn()}
        form={{
          newCouponCode: '',
          setNewCouponCode: vi.fn(),
          newCouponName: '',
          setNewCouponName: vi.fn(),
          newCouponType: 'percent',
          setNewCouponType: vi.fn(),
          newCouponValue: '',
          setNewCouponValue: vi.fn(),
          newCouponCurrency: 'usd',
          setNewCouponCurrency: vi.fn(),
          newCouponDuration: 'once',
          setNewCouponDuration: vi.fn(),
          newCouponDurationMonths: '',
          setNewCouponDurationMonths: vi.fn(),
          newCouponMaxUses: '',
          setNewCouponMaxUses: vi.fn(),
          resetCouponForm: vi.fn(),
        }}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'New Coupon' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Create a discount code for this campaign').id,
    )
    expect(screen.getByRole('button', { name: 'Close new coupon' })).toBeTruthy()
    expect(screen.getByLabelText('Code')).toBeTruthy()
    expect(screen.getByLabelText('Display Name')).toBeTruthy()
    expect(screen.getByLabelText('Value *')).toBeTruthy()
    expect(screen.getByLabelText('Duration')).toBeTruthy()
    expect(screen.getByLabelText('Max Uses')).toBeTruthy()
  })

  it('describes and labels the product form', () => {
    render(
      <NewProductModal
        open
        saving={false}
        campaignId="campaign-1"
        showMediaPicker={false}
        setShowMediaPicker={vi.fn()}
        setOpen={vi.fn()}
        onSubmit={vi.fn()}
        form={{
          newProductName: '',
          setNewProductName: vi.fn(),
          newProductDesc: '',
          setNewProductDesc: vi.fn(),
          newProductImageUrl: '',
          setNewProductImageUrl: vi.fn(),
          newProductCurrency: 'usd',
          setNewProductCurrency: vi.fn(),
          newProductPriceAmount: '',
          setNewProductPriceAmount: vi.fn(),
          newProductRecurring: false,
          setNewProductRecurring: vi.fn(),
          newProductInterval: 'month',
          setNewProductInterval: vi.fn(),
          newProductTaxBehavior: 'unspecified',
          setNewProductTaxBehavior: vi.fn(),
          resetProductForm: vi.fn(),
        }}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'New Product' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Create a Stripe product for this campaign').id,
    )
    expect(screen.getByRole('button', { name: 'Close new product' })).toBeTruthy()
    expect(screen.getByLabelText('Name *')).toBeTruthy()
    expect(screen.getByLabelText('Description')).toBeTruthy()
    expect(screen.getByLabelText('Currency')).toBeTruthy()
    expect(screen.getByLabelText('Price Amount')).toBeTruthy()
    expect(screen.getByLabelText('Tax Behavior')).toBeTruthy()
  })

  it('describes and names the product-detail dialog', () => {
    render(
      <ProductDetailModal
        detailProduct={product}
        setDetailProduct={vi.fn()}
        setAddPriceProductId={vi.fn()}
        setShowAddPriceModal={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Launch offer' })
    expect(dialog.getAttribute('aria-describedby')).toBe(
      screen.getByText('Review this product and manage its prices.').id,
    )
    expect(screen.getByRole('button', { name: 'Close product details' })).toBeTruthy()
  })
})
