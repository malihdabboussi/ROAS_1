import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ADS_TOAST_ERRORS } from '../../config/ads-toast-errors.config'
import { searchMetaCountries } from '../../services/artifact-preview.service'

type CountrySearchResult = {
  key: string
  name: string
}

interface UseAdSetSettingsCountrySearchParams {
  excludedCountryCodes: string[]
}

export function useAdSetSettingsCountrySearch({
  excludedCountryCodes,
}: UseAdSetSettingsCountrySearchParams) {
  const [moreCountriesOpen, setMoreCountriesOpen] = useState(false)
  const moreCountriesRef = useRef<HTMLDivElement>(null)
  const countriesInputRef = useRef<HTMLInputElement>(null)
  const [countriesPos, setCountriesPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })
  const [countrySearch, setCountrySearch] = useState('')
  const [countryResults, setCountryResults] = useState<CountrySearchResult[]>([])
  const [countrySearchLoading, setCountrySearchLoading] = useState(false)
  const countrySearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    if (!moreCountriesOpen || !countriesInputRef.current) return
    const rect = countriesInputRef.current.getBoundingClientRect()
    setCountriesPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [moreCountriesOpen])

  const handleCountrySearch = useCallback(
    (query: string) => {
      setCountrySearch(query)
      if (countrySearchTimer.current) clearTimeout(countrySearchTimer.current)
      if (!query.trim()) {
        setCountryResults([])
        return
      }
      countrySearchTimer.current = setTimeout(async () => {
        setCountrySearchLoading(true)
        try {
          const results = await searchMetaCountries(query)
          setCountryResults(results.filter((country) => !excludedCountryCodes.includes(country.key)))
        } catch {
          toast.error(ADS_TOAST_ERRORS.COUNTRY_SEARCH_FAILED.userMessage)
          setCountryResults([])
        } finally {
          setCountrySearchLoading(false)
        }
      }, 400)
    },
    [excludedCountryCodes],
  )

  useEffect(() => {
    if (!moreCountriesOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (!moreCountriesRef.current?.contains(e.target as Node)) setMoreCountriesOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [moreCountriesOpen])

  useEffect(() => {
    return () => {
      if (countrySearchTimer.current) clearTimeout(countrySearchTimer.current)
    }
  }, [])

  return {
    moreCountriesOpen,
    setMoreCountriesOpen,
    moreCountriesRef,
    countriesInputRef,
    countriesPos,
    countrySearch,
    countryResults,
    countrySearchLoading,
    handleCountrySearch,
  }
}
