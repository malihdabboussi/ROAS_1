'use client'

import {
  FormEvent,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { ReportingToolbarApi } from '@/features/spaces/components/reporting/shared/reporting-toolbar.types'
import type { ReportingTimeRange } from '@/features/spaces/types/space-schema'
import {
  createCampaignStripeCoupon,
  createCampaignStripePaymentLink,
  createCampaignStripePrice,
  createCampaignStripeProduct,
  deleteStripeProduct,
  updateStripeProduct,
} from '@/features/studio/services/analytics.service'
import { CouponsSection } from './components/CouponsSection'
import { AddPriceModal } from './components/modals/AddPriceModal'
import { NewCouponModal } from './components/modals/NewCouponModal'
import { NewPaymentLinkModal } from './components/modals/NewPaymentLinkModal'
import { NewProductModal } from './components/modals/NewProductModal'
import { ProductDetailModal } from './components/modals/ProductDetailModal'
import { PaymentLinksSection } from './components/PaymentLinksSection'
import { ProductMenuPortal } from './components/ProductMenuPortal'
import { ProductsSection } from './components/ProductsSection'
import { RevenueChartSection } from './components/RevenueChartSection'
import { RevenueOverviewSection } from './components/RevenueOverviewSection'
import { CAMPAIGN_FINANCE_TOAST_ERRORS } from './config/campaign-finance-toast-errors.config'
import { useCampaignFinanceData } from './hooks/useCampaignFinanceData'
import { useCampaignFinanceForms } from './hooks/useCampaignFinanceForms'
import { useCampaignFinanceUi } from './hooks/useCampaignFinanceUi'
import type { ProductWithPrices, TimeRange } from './types'

export type CampaignFinanceTabHandle = {
  openNewProduct: () => void
  openNewLink: () => void
  openNewCoupon: () => void
}

interface Props {
  campaignId: string
  campaignName?: string | null
  embedded?: boolean
  /** Hide per-section "New …" buttons (e.g. Spaces toolbar plus menu). */
  hideInlineCreateButtons?: boolean
  /** When set with onReportingTimeRangeChange, revenue period is controlled by Spaces toolbar. */
  reportingTimeRange?: ReportingTimeRange
  onReportingTimeRangeChange?: (value: ReportingTimeRange) => void
  /** Hide revenue header time + refresh (toolbar provides them). */
  toolbarHidesRevenueHeaderControls?: boolean
  financeSearchQuery?: string
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
}

export const CampaignFinanceTabContainer = forwardRef<CampaignFinanceTabHandle, Props>(
  function CampaignFinanceTabContainer(
    {
      campaignId,
      campaignName,
      embedded = false,
      hideInlineCreateButtons = false,
      reportingTimeRange,
      onReportingTimeRangeChange,
      toolbarHidesRevenueHeaderControls = false,
      financeSearchQuery = '',
      onRegisterReportingToolbar,
    },
    ref,
  ) {
    const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>('30d')
    const timeRangeControlled =
      reportingTimeRange !== undefined && onReportingTimeRangeChange != null
    const timeRange: TimeRange = timeRangeControlled
      ? (reportingTimeRange as TimeRange)
      : internalTimeRange
    const setTimeRange = (tr: TimeRange) => {
      onReportingTimeRangeChange?.(tr as ReportingTimeRange)
      if (!timeRangeControlled) setInternalTimeRange(tr)
    }
    const [saving, setSaving] = useState(false)
    const timeRangeBtnRef = useRef<HTMLButtonElement>(null)
    const [timeRangePos, setTimeRangePos] = useState({ top: 0, left: 0 })
    const productMenuDropRef = useRef<HTMLDivElement>(null)

    const financeData = useCampaignFinanceData(campaignId, timeRange)
    const forms = useCampaignFinanceForms()
    const ui = useCampaignFinanceUi()

    const { setShowNewProductModal, setShowNewLinkModal, setShowNewCouponModal } = ui

    useImperativeHandle(
      ref,
      () => ({
        openNewProduct: () => setShowNewProductModal(true),
        openNewLink: () => setShowNewLinkModal(true),
        openNewCoupon: () => setShowNewCouponModal(true),
      }),
      [setShowNewCouponModal, setShowNewLinkModal, setShowNewProductModal],
    )

    useLayoutEffect(() => {
      if (!ui.timeRangeOpen || !timeRangeBtnRef.current) return
      const rect = timeRangeBtnRef.current.getBoundingClientRect()
      setTimeRangePos({ top: rect.bottom + 4, left: rect.right })
    }, [ui.timeRangeOpen])

    useEffect(() => {
      if (!ui.timeRangeOpen) return
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (!target.closest('[data-dropdown]') && !timeRangeBtnRef.current?.contains(target)) {
          ui.setTimeRangeOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [ui.timeRangeOpen, ui])

    useEffect(() => {
      if (!ui.productMenuId) return
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (
          !productMenuDropRef.current?.contains(target) &&
          !target.closest('[data-product-menu-trigger]')
        ) {
          ui.setProductMenuId(null)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [ui.productMenuId, ui])

    const handleCreateProduct = async (e: FormEvent) => {
      e.preventDefault()
      if (!forms.newProductName.trim()) return
      setSaving(true)
      try {
        const productPayload: Record<string, unknown> = {
          name: forms.newProductName.trim(),
          description: forms.newProductDesc.trim() || undefined,
        }
        if (forms.newProductImageUrl.trim()) {
          productPayload.images = [forms.newProductImageUrl.trim()]
        }
        const product = await createCampaignStripeProduct(
          campaignId,
          productPayload as Parameters<typeof createCampaignStripeProduct>[1],
        )
        if (forms.newProductPriceAmount) {
          const amount = Math.round(parseFloat(forms.newProductPriceAmount) * 100)
          if (!isNaN(amount) && amount > 0) {
            const pricePayload: Record<string, unknown> = {
              product: product.id,
              currency: forms.newProductCurrency,
              unit_amount: amount,
              recurring: forms.newProductRecurring
                ? { interval: forms.newProductInterval }
                : undefined,
            }
            if (forms.newProductTaxBehavior !== 'unspecified') {
              pricePayload.tax_behavior = forms.newProductTaxBehavior
            }
            await createCampaignStripePrice(
              campaignId,
              pricePayload as Parameters<typeof createCampaignStripePrice>[1],
            )
          }
        }
        financeData.setProducts((prev) => [...prev, product as ProductWithPrices])
        forms.resetProductForm()
        ui.setShowNewProductModal(false)
        void financeData.refreshObjectsSilently()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : CAMPAIGN_FINANCE_TOAST_ERRORS.CREATE_PRODUCT_FAILED.userMessage,
        )
      } finally {
        setSaving(false)
      }
    }

    const handleCreateInlinePrice = async () => {
      if (!ui.addPriceProductId || !forms.addPriceAmount) return
      const amount = Math.round(parseFloat(forms.addPriceAmount) * 100)
      if (isNaN(amount) || amount <= 0) return
      setSaving(true)
      try {
        await createCampaignStripePrice(campaignId, {
          product: ui.addPriceProductId,
          currency: forms.addPriceCurrency,
          unit_amount: amount,
          recurring: forms.addPriceInterval ? { interval: forms.addPriceInterval } : undefined,
        })
        const pid = ui.addPriceProductId
        forms.resetAddPriceForm()
        ui.setShowAddPriceModal(false)
        ui.setAddPriceProductId(null)
        await financeData.expandProductPrices(pid)
      } finally {
        setSaving(false)
      }
    }

    const handleRenameProduct = async (productId: string, newName: string) => {
      if (!newName.trim()) return
      setSaving(true)
      try {
        await updateStripeProduct(productId, { name: newName.trim() })
        financeData.setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, name: newName.trim() } : p)),
        )
        ui.setRenameProductId(null)
        ui.setRenameProductValue('')
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : CAMPAIGN_FINANCE_TOAST_ERRORS.RENAME_PRODUCT_FAILED.userMessage,
        )
      } finally {
        setSaving(false)
      }
    }

    const handleArchiveProduct = async (productId: string) => {
      setSaving(true)
      try {
        await updateStripeProduct(productId, { active: false })
        financeData.setProducts((prev) => prev.filter((p) => p.id !== productId))
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : CAMPAIGN_FINANCE_TOAST_ERRORS.ARCHIVE_PRODUCT_FAILED.userMessage,
        )
      } finally {
        setSaving(false)
      }
    }

    const handleDeleteProduct = async (productId: string) => {
      setSaving(true)
      try {
        await deleteStripeProduct(productId)
        financeData.setProducts((prev) => prev.filter((p) => p.id !== productId))
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : CAMPAIGN_FINANCE_TOAST_ERRORS.DELETE_PRODUCT_FAILED.userMessage,
        )
        try {
          await handleArchiveProduct(productId)
        } catch (archiveErr) {
          toast.error(
            archiveErr instanceof Error
              ? archiveErr.message
              : CAMPAIGN_FINANCE_TOAST_ERRORS.ARCHIVE_PRODUCT_FAILED.userMessage,
          )
        }
      } finally {
        setSaving(false)
      }
    }

    const handleCreatePaymentLink = async (e: FormEvent) => {
      e.preventDefault()
      if (!forms.newLinkPriceId.trim()) return
      setSaving(true)
      try {
        const link = await createCampaignStripePaymentLink(campaignId, {
          price: forms.newLinkPriceId.trim(),
          quantity: parseInt(forms.newLinkQuantity) || 1,
        })
        financeData.setPaymentLinks((prev) => [...prev, link])
        forms.resetLinkForm()
        ui.setShowNewLinkModal(false)
        void financeData.refreshObjectsSilently()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : CAMPAIGN_FINANCE_TOAST_ERRORS.CREATE_PAYMENT_LINK_FAILED.userMessage,
        )
      } finally {
        setSaving(false)
      }
    }

    const handleCreateCoupon = async (e: FormEvent) => {
      e.preventDefault()
      if (!forms.newCouponValue) return
      const value = parseFloat(forms.newCouponValue)
      if (isNaN(value) || value <= 0) return
      setSaving(true)
      try {
        const coupon = await createCampaignStripeCoupon(campaignId, {
          id: forms.newCouponCode.trim() || undefined,
          name: forms.newCouponName.trim() || undefined,
          ...(forms.newCouponType === 'percent'
            ? { percent_off: value }
            : { amount_off: Math.round(value * 100), currency: forms.newCouponCurrency }),
          duration: forms.newCouponDuration,
          duration_in_months:
            forms.newCouponDuration === 'repeating' && forms.newCouponDurationMonths
              ? parseInt(forms.newCouponDurationMonths)
              : undefined,
          max_redemptions: forms.newCouponMaxUses ? parseInt(forms.newCouponMaxUses) : undefined,
        })
        financeData.setCoupons((prev) => [...prev, coupon])
        forms.resetCouponForm()
        ui.setShowNewCouponModal(false)
        void financeData.refreshObjectsSilently()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : CAMPAIGN_FINANCE_TOAST_ERRORS.CREATE_COUPON_FAILED.userMessage,
        )
      } finally {
        setSaving(false)
      }
    }

    useEffect(() => {
      if (!ui.detailProduct) return
      const fresh = financeData.products.find((p) => p.id === ui.detailProduct?.id)
      if (fresh) ui.setDetailProduct(fresh)
    }, [financeData.products, ui.detailProduct, ui])

    useEffect(() => {
      if (!onRegisterReportingToolbar) return
      onRegisterReportingToolbar({
        refresh: async () => {
          await financeData.loadOverview()
          await financeData.refreshObjectsSilently()
        },
        refreshing: financeData.overviewLoading || financeData.objectsLoading,
      })
      return () => onRegisterReportingToolbar(null)
    }, [
      onRegisterReportingToolbar,
      financeData.loadOverview,
      financeData.refreshObjectsSilently,
      financeData.overviewLoading,
      financeData.objectsLoading,
    ])

    if (financeData.initialLoading) {
      return (
        <div className="flex min-h-[70vh] items-center justify-center">
          <VibeyLoadingOrb text="Loading finance..." state="processing" size="lg" />
        </div>
      )
    }

    return (
      <div className="animate-tab-enter space-y-6 md:pr-6">
        <RevenueOverviewSection
          campaignName={campaignName}
          timeRange={timeRange}
          timeRangeOpen={ui.timeRangeOpen}
          setTimeRangeOpen={ui.setTimeRangeOpen}
          timeRangeBtnRef={timeRangeBtnRef}
          timeRangePos={timeRangePos}
          setTimeRange={setTimeRange}
          loadOverview={financeData.loadOverview}
          overviewLoading={financeData.overviewLoading}
          overview={financeData.overview}
          currency={financeData.currency}
          embedded={embedded}
          hideHeaderControls={toolbarHidesRevenueHeaderControls}
        />

        {financeData.overview && (
          <RevenueChartSection overview={financeData.overview} currency={financeData.currency} />
        )}

        <ProductsSection
          productsOpen={ui.productsOpen}
          setProductsOpen={ui.setProductsOpen}
          objectsLoading={financeData.objectsLoading}
          products={financeData.products}
          renameProductId={ui.renameProductId}
          renameProductValue={ui.renameProductValue}
          setRenameProductId={ui.setRenameProductId}
          setRenameProductValue={ui.setRenameProductValue}
          setProductMenuPos={ui.setProductMenuPos}
          productMenuId={ui.productMenuId}
          setProductMenuId={ui.setProductMenuId}
          setAddPriceProductId={(id) => ui.setAddPriceProductId(id)}
          setShowAddPriceModal={ui.setShowAddPriceModal}
          setDetailProduct={ui.setDetailProduct}
          handleRenameProduct={handleRenameProduct}
          setShowNewProductModal={ui.setShowNewProductModal}
          hideNewButton={hideInlineCreateButtons}
          filterQuery={financeSearchQuery}
        />

        <ProductMenuPortal
          productMenuId={ui.productMenuId}
          productMenuPos={ui.productMenuPos}
          productMenuDropRef={productMenuDropRef}
          products={financeData.products}
          setProductMenuId={ui.setProductMenuId}
          setRenameProductValue={ui.setRenameProductValue}
          setRenameProductId={ui.setRenameProductId}
          handleArchiveProduct={handleArchiveProduct}
          handleDeleteProduct={handleDeleteProduct}
        />

        <PaymentLinksSection
          linksOpen={ui.linksOpen}
          setLinksOpen={ui.setLinksOpen}
          paymentLinks={financeData.paymentLinks}
          objectsLoading={financeData.objectsLoading}
          setShowNewLinkModal={ui.setShowNewLinkModal}
          hideNewButton={hideInlineCreateButtons}
          filterQuery={financeSearchQuery}
        />

        <CouponsSection
          couponsOpen={ui.couponsOpen}
          setCouponsOpen={ui.setCouponsOpen}
          coupons={financeData.coupons}
          objectsLoading={financeData.objectsLoading}
          setShowNewCouponModal={ui.setShowNewCouponModal}
          hideNewButton={hideInlineCreateButtons}
          filterQuery={financeSearchQuery}
        />

        <NewProductModal
          open={ui.showNewProductModal}
          setOpen={ui.setShowNewProductModal}
          saving={saving}
          campaignId={campaignId}
          showMediaPicker={ui.showMediaPicker}
          setShowMediaPicker={ui.setShowMediaPicker}
          onSubmit={(e) => void handleCreateProduct(e)}
          form={forms}
        />

        <NewPaymentLinkModal
          open={ui.showNewLinkModal}
          setOpen={ui.setShowNewLinkModal}
          saving={saving}
          onSubmit={(e) => void handleCreatePaymentLink(e)}
          priceOptions={financeData.newLinkPriceOptions}
          productsHaveLoadingPrices={financeData.products.some((p) => p.pricesLoading)}
          form={forms}
        />

        <NewCouponModal
          open={ui.showNewCouponModal}
          setOpen={ui.setShowNewCouponModal}
          saving={saving}
          onSubmit={(e) => void handleCreateCoupon(e)}
          form={forms}
        />

        <ProductDetailModal
          detailProduct={ui.detailProduct}
          setDetailProduct={ui.setDetailProduct}
          setAddPriceProductId={(id) => ui.setAddPriceProductId(id)}
          setShowAddPriceModal={ui.setShowAddPriceModal}
        />

        <AddPriceModal
          open={ui.showAddPriceModal}
          setOpen={ui.setShowAddPriceModal}
          saving={saving}
          addPriceProductId={ui.addPriceProductId}
          setAddPriceProductId={ui.setAddPriceProductId}
          products={financeData.products}
          onSubmit={(e) => {
            e.preventDefault()
            void handleCreateInlinePrice()
          }}
          form={forms}
        />
      </div>
    )
  },
)
