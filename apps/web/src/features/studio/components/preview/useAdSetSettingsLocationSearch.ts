import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { searchMetaLocations } from '../../services/artifact-preview.service'

export type LocationSearchResult = {
  key: string
  name: string
  type: string
  country_code?: string
  country_name?: string
  region?: string
}

export function useAdSetSettingsLocationSearch() {
  const [locationSearch, setLocationSearch] = useState('')
  const [locationResults, setLocationResults] = useState<LocationSearchResult[]>([])
  const [locationSearchLoading, setLocationSearchLoading] = useState(false)
  const locationSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locationInputRef = useRef<HTMLInputElement>(null)
  const locationDropdownRef = useRef<HTMLDivElement>(null)
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const [locationPos, setLocationPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })

  const handleLocationSearch = useCallback((query: string) => {
    setLocationSearch(query)
    if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current)
    if (!query.trim()) {
      setLocationResults([])
      return
    }
    locationSearchTimer.current = setTimeout(async () => {
      setLocationSearchLoading(true)
      try {
        const results = await searchMetaLocations(query)
        setLocationResults(results)
      } catch {
        toast.error('Failed to search locations')
        setLocationResults([])
      } finally {
        setLocationSearchLoading(false)
      }
    }, 400)
  }, [])

  useLayoutEffect(() => {
    if (!locationDropdownOpen || !locationInputRef.current) return
    const rect = locationInputRef.current.getBoundingClientRect()
    setLocationPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [locationDropdownOpen])

  useEffect(() => {
    if (!locationDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !locationDropdownRef.current?.contains(e.target as Node) &&
        !locationInputRef.current?.contains(e.target as Node)
      )
        setLocationDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [locationDropdownOpen])

  useEffect(() => {
    return () => {
      if (locationSearchTimer.current) clearTimeout(locationSearchTimer.current)
    }
  }, [])

  return {
    locationSearch,
    locationResults,
    locationSearchLoading,
    locationInputRef,
    locationDropdownRef,
    locationDropdownOpen,
    setLocationDropdownOpen,
    locationPos,
    handleLocationSearch,
    setLocationSearch,
    setLocationResults,
  }
}
