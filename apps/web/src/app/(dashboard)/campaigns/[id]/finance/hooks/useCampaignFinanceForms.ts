import { useState } from 'react'

export function useCampaignFinanceForms() {
  const [newProductName, setNewProductName] = useState('')
  const [newProductDesc, setNewProductDesc] = useState('')
  const [newProductImageUrl, setNewProductImageUrl] = useState('')
  const [newProductCurrency, setNewProductCurrency] = useState('usd')
  const [newProductPriceAmount, setNewProductPriceAmount] = useState('')
  const [newProductRecurring, setNewProductRecurring] = useState(false)
  const [newProductInterval, setNewProductInterval] = useState<'month' | 'year' | 'week'>('month')
  const [newProductTaxBehavior, setNewProductTaxBehavior] = useState<
    'unspecified' | 'inclusive' | 'exclusive'
  >('unspecified')

  const [addPriceAmount, setAddPriceAmount] = useState('')
  const [addPriceCurrency, setAddPriceCurrency] = useState('usd')
  const [addPriceInterval, setAddPriceInterval] = useState<'' | 'month' | 'year' | 'week'>('')

  const [newLinkPriceId, setNewLinkPriceId] = useState('')
  const [newLinkQuantity, setNewLinkQuantity] = useState('1')

  const [newCouponCode, setNewCouponCode] = useState('')
  const [newCouponName, setNewCouponName] = useState('')
  const [newCouponType, setNewCouponType] = useState<'percent' | 'amount'>('percent')
  const [newCouponValue, setNewCouponValue] = useState('')
  const [newCouponCurrency, setNewCouponCurrency] = useState('usd')
  const [newCouponDuration, setNewCouponDuration] = useState<'once' | 'forever' | 'repeating'>(
    'once',
  )
  const [newCouponDurationMonths, setNewCouponDurationMonths] = useState('')
  const [newCouponMaxUses, setNewCouponMaxUses] = useState('')

  function resetProductForm() {
    setNewProductName('')
    setNewProductDesc('')
    setNewProductImageUrl('')
    setNewProductCurrency('usd')
    setNewProductPriceAmount('')
    setNewProductRecurring(false)
    setNewProductInterval('month')
    setNewProductTaxBehavior('unspecified')
  }

  function resetLinkForm() {
    setNewLinkPriceId('')
    setNewLinkQuantity('1')
  }

  function resetCouponForm() {
    setNewCouponCode('')
    setNewCouponName('')
    setNewCouponType('percent')
    setNewCouponValue('')
    setNewCouponCurrency('usd')
    setNewCouponDuration('once')
    setNewCouponDurationMonths('')
    setNewCouponMaxUses('')
  }

  function resetAddPriceForm() {
    setAddPriceAmount('')
    setAddPriceCurrency('usd')
    setAddPriceInterval('')
  }

  return {
    newProductName,
    setNewProductName,
    newProductDesc,
    setNewProductDesc,
    newProductImageUrl,
    setNewProductImageUrl,
    newProductCurrency,
    setNewProductCurrency,
    newProductPriceAmount,
    setNewProductPriceAmount,
    newProductRecurring,
    setNewProductRecurring,
    newProductInterval,
    setNewProductInterval,
    newProductTaxBehavior,
    setNewProductTaxBehavior,
    addPriceAmount,
    setAddPriceAmount,
    addPriceCurrency,
    setAddPriceCurrency,
    addPriceInterval,
    setAddPriceInterval,
    newLinkPriceId,
    setNewLinkPriceId,
    newLinkQuantity,
    setNewLinkQuantity,
    newCouponCode,
    setNewCouponCode,
    newCouponName,
    setNewCouponName,
    newCouponType,
    setNewCouponType,
    newCouponValue,
    setNewCouponValue,
    newCouponCurrency,
    setNewCouponCurrency,
    newCouponDuration,
    setNewCouponDuration,
    newCouponDurationMonths,
    setNewCouponDurationMonths,
    newCouponMaxUses,
    setNewCouponMaxUses,
    resetProductForm,
    resetLinkForm,
    resetCouponForm,
    resetAddPriceForm,
  }
}
