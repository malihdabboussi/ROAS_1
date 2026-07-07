import { useState } from 'react'
import type { ProductWithPrices } from '../types'

export function useCampaignFinanceUi() {
  const [timeRangeOpen, setTimeRangeOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [linksOpen, setLinksOpen] = useState(false)
  const [couponsOpen, setCouponsOpen] = useState(false)

  const [showNewProductModal, setShowNewProductModal] = useState(false)
  const [showNewLinkModal, setShowNewLinkModal] = useState(false)
  const [showNewCouponModal, setShowNewCouponModal] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [showAddPriceModal, setShowAddPriceModal] = useState(false)
  const [addPriceProductId, setAddPriceProductId] = useState<string | null>(null)

  const [productMenuId, setProductMenuId] = useState<string | null>(null)
  const [productMenuPos, setProductMenuPos] = useState({ top: 0, left: 0 })
  const [renameProductId, setRenameProductId] = useState<string | null>(null)
  const [renameProductValue, setRenameProductValue] = useState('')
  const [detailProduct, setDetailProduct] = useState<ProductWithPrices | null>(null)

  return {
    timeRangeOpen,
    setTimeRangeOpen,
    productsOpen,
    setProductsOpen,
    linksOpen,
    setLinksOpen,
    couponsOpen,
    setCouponsOpen,
    showNewProductModal,
    setShowNewProductModal,
    showNewLinkModal,
    setShowNewLinkModal,
    showNewCouponModal,
    setShowNewCouponModal,
    showMediaPicker,
    setShowMediaPicker,
    showAddPriceModal,
    setShowAddPriceModal,
    addPriceProductId,
    setAddPriceProductId,
    productMenuId,
    setProductMenuId,
    productMenuPos,
    setProductMenuPos,
    renameProductId,
    setRenameProductId,
    renameProductValue,
    setRenameProductValue,
    detailProduct,
    setDetailProduct,
  }
}
