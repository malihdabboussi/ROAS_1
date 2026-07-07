import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { searchMetaInterests } from '../../services/artifact-preview.service'

export type InterestSearchResult = {
  id: string
  name: string
  audience_size_lower_bound?: number
  audience_size_upper_bound?: number
}

export function useAdSetSettingsInterestSearch() {
  const [interestSearch, setInterestSearch] = useState('')
  const [interestResults, setInterestResults] = useState<InterestSearchResult[]>([])
  const [interestSearchLoading, setInterestSearchLoading] = useState(false)
  const interestSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const interestInputRef = useRef<HTMLInputElement>(null)
  const interestDropdownRef = useRef<HTMLDivElement>(null)
  const [interestDropdownOpen, setInterestDropdownOpen] = useState(false)
  const [interestPos, setInterestPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  })

  const handleInterestSearch = useCallback((query: string) => {
    setInterestSearch(query)
    if (interestSearchTimer.current) clearTimeout(interestSearchTimer.current)
    if (!query.trim()) {
      setInterestResults([])
      return
    }
    interestSearchTimer.current = setTimeout(async () => {
      setInterestSearchLoading(true)
      try {
        const results = await searchMetaInterests(query)
        setInterestResults(results)
      } catch {
        toast.error('Failed to search interests')
        setInterestResults([])
      } finally {
        setInterestSearchLoading(false)
      }
    }, 400)
  }, [])

  useLayoutEffect(() => {
    if (!interestDropdownOpen || !interestInputRef.current) return
    const rect = interestInputRef.current.getBoundingClientRect()
    setInterestPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [interestDropdownOpen])

  useEffect(() => {
    if (!interestDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !interestDropdownRef.current?.contains(e.target as Node) &&
        !interestInputRef.current?.contains(e.target as Node)
      )
        setInterestDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [interestDropdownOpen])

  useEffect(() => {
    return () => {
      if (interestSearchTimer.current) clearTimeout(interestSearchTimer.current)
    }
  }, [])

  return {
    interestSearch,
    interestResults,
    interestSearchLoading,
    interestInputRef,
    interestDropdownRef,
    interestDropdownOpen,
    setInterestDropdownOpen,
    interestPos,
    handleInterestSearch,
    setInterestSearch,
    setInterestResults,
  }
}
