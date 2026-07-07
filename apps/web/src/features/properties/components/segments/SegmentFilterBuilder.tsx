'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  LuCalendar,
  LuFolderOpen,
  LuGlobe,
  LuLoader,
  LuTag,
  LuUserCheck,
  LuUsers,
  LuX,
} from 'react-icons/lu'
import { ReportingTimeRangeSelector } from '@/components/reporting'
import type { SegmentFilters } from '@/lib/properties/segments'
import { backendGet, backendPost } from '@/lib/api/backend-client'
import { resolveReportingDates, type ReportingDateRangeInput } from '@/lib/reporting'
import { SegmentFilterSection } from './SegmentFilterSection'
import { SegmentSearchableMultiSelect } from './SegmentSearchableMultiSelect'

function toDateOnly(iso: string | undefined): string | undefined {
  if (!iso) return undefined
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso)
  return m ? m[1] : iso.slice(0, 10)
}

function segmentDateRangeToReportingInput(
  dr: SegmentFilters['date_range'],
): ReportingDateRangeInput {
  if (!dr?.from && !dr?.to) {
    return { time_range: 'all', custom_start: undefined, custom_end: undefined }
  }
  return {
    time_range: undefined,
    custom_start: toDateOnly(dr.from),
    custom_end: toDateOnly(dr.to),
  }
}

function reportingInputToSegmentDateRange(
  config: ReportingDateRangeInput,
): SegmentFilters['date_range'] | undefined {
  const { startDate, endDate } = resolveReportingDates(config)
  if (!startDate && !endDate) return undefined
  return { from: startDate, to: endDate }
}

type FunnelOption = { id: string; title: string }
type CampaignOption = { id: string; name: string }

const STAGE_OPTIONS: { id: string; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'customer', label: 'Customer' },
]

interface SegmentFilterBuilderProps {
  filters: SegmentFilters
  onChange: (filters: SegmentFilters) => void
  onLeadCountChange?: (count: number | null) => void
  showPreview?: boolean
}

export function SegmentFilterBuilder({
  filters,
  onChange,
  onLeadCountChange,
  showPreview = true,
}: SegmentFilterBuilderProps) {
  const [funnels, setFunnels] = useState<FunnelOption[]>([])
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const [expandedSections, setExpandedSections] = useState({
    dateRange: false,
  })

  useEffect(() => {
    async function loadData() {
      setIsLoadingData(true)
      try {
        const [funnelsRes, campaignsRes, filterOptsRes] = await Promise.all([
          backendGet<{ funnels: FunnelOption[] }>('/api/funnels').catch(() => ({ funnels: [] })),
          backendGet<{ campaigns: CampaignOption[] }>('/api/campaigns').catch(() => ({
            campaigns: [],
          })),
          backendGet<{ tags: string[]; countries: string[] }>('/api/segments/filter-options').catch(
            () => ({ tags: [], countries: [] }),
          ),
        ])
        setFunnels(funnelsRes.funnels || [])
        setCampaigns(campaignsRes.campaigns || [])
        setAvailableTags(filterOptsRes.tags || [])
        setAvailableCountries(filterOptsRes.countries || [])
      } catch {
        // silently fail
      } finally {
        setIsLoadingData(false)
      }
    }
    loadData()
  }, [])

  const calculatePreview = useCallback(async () => {
    if (!showPreview) return

    const hasFilters =
      (filters.funnels?.length ?? 0) > 0 ||
      (filters.campaigns?.length ?? 0) > 0 ||
      (filters.tags?.length ?? 0) > 0 ||
      (filters.contact_type?.length ?? 0) > 0 ||
      (filters.country?.length ?? 0) > 0 ||
      filters.date_range?.from ||
      filters.date_range?.to

    if (!hasFilters) {
      setPreviewCount(null)
      onLeadCountChange?.(null)
      return
    }

    setIsLoadingPreview(true)
    try {
      const data = await backendPost<{ success: boolean; count?: number }>(
        '/api/segments/preview',
        { filters },
      )
      if (data.success) {
        setPreviewCount(data.count ?? 0)
        onLeadCountChange?.(data.count ?? 0)
      }
    } catch {
      setPreviewCount(null)
      onLeadCountChange?.(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }, [filters, showPreview, onLeadCountChange])

  useEffect(() => {
    const timer = setTimeout(calculatePreview, 500)
    return () => clearTimeout(timer)
  }, [calculatePreview])

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleFunnelsChange = (funnelIds: string[]) => {
    onChange({ ...filters, funnels: funnelIds.length > 0 ? funnelIds : undefined })
  }

  const handleCampaignsChange = (campaignIds: string[]) => {
    onChange({ ...filters, campaigns: campaignIds.length > 0 ? campaignIds : undefined })
  }

  const handleTagsChange = (tagIds: string[]) => {
    onChange({ ...filters, tags: tagIds.length > 0 ? tagIds : undefined })
  }

  const handleStageChange = (stageIds: string[]) => {
    onChange({ ...filters, contact_type: stageIds.length > 0 ? stageIds : undefined })
  }

  const handleCountryChange = (countryIds: string[]) => {
    onChange({ ...filters, country: countryIds.length > 0 ? countryIds : undefined })
  }

  const reportingDateConfig = useMemo(
    () => segmentDateRangeToReportingInput(filters.date_range),
    [filters.date_range?.from, filters.date_range?.to],
  )

  const handleReportingDatePatch = useCallback(
    (patch: Partial<ReportingDateRangeInput>) => {
      const next: ReportingDateRangeInput = { ...reportingDateConfig, ...patch }
      const dr = reportingInputToSegmentDateRange(next)
      if (!dr) {
        const { date_range: _, ...rest } = filters
        onChange(rest)
      } else {
        onChange({ ...filters, date_range: dr })
      }
    },
    [filters, onChange, reportingDateConfig],
  )

  const clearAllFilters = () => {
    onChange({})
  }

  const activeFilterCount =
    (filters.funnels?.length || 0) +
    (filters.campaigns?.length || 0) +
    (filters.tags?.length || 0) +
    (filters.contact_type?.length || 0) +
    (filters.country?.length || 0) +
    (filters.date_range?.from ? 1 : 0) +
    (filters.date_range?.to ? 1 : 0)

  const funnelOptions = funnels.map((f) => ({ id: f.id, label: f.title || 'Untitled Funnel' }))
  const campaignOptions = campaigns.map((c) => ({ id: c.id, label: c.name }))
  const tagOptions = availableTags.map((t) => ({ id: t, label: t }))
  const countryOptions = availableCountries.map((c) => ({ id: c, label: c }))

  if (isLoadingData) {
    return (
      <div className="py-spacing-8 flex items-center justify-center">
        <LuLoader className="icon-md text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-spacing-4">
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="body-3 text-muted-foreground">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </span>
          <button
            type="button"
            onClick={clearAllFilters}
            className="button-glass-neutral px-spacing-2 py-spacing-1 rounded-spacing-2 body-3 gap-spacing-1 flex items-center"
          >
            <LuX className="icon-xs" />
            Clear all
          </button>
        </div>
      )}

      {/* Funnels Dropdown */}
      <SegmentSearchableMultiSelect
        label="Funnels"
        icon={<LuFolderOpen className="icon-sm" />}
        options={funnelOptions}
        selectedIds={filters.funnels || []}
        onSelectionChange={handleFunnelsChange}
        placeholder="Search funnels..."
        emptyMessage="No funnels available"
      />

      {/* Campaigns Dropdown */}
      {campaignOptions.length > 0 && (
        <SegmentSearchableMultiSelect
          label="Campaigns"
          icon={<LuUsers className="icon-sm" />}
          options={campaignOptions}
          selectedIds={filters.campaigns || []}
          onSelectionChange={handleCampaignsChange}
          placeholder="Search campaigns..."
          emptyMessage="No campaigns available"
        />
      )}

      {/* Tags Dropdown */}
      <SegmentSearchableMultiSelect
        label="Tags"
        icon={<LuTag className="icon-sm" />}
        options={tagOptions}
        selectedIds={filters.tags || []}
        onSelectionChange={handleTagsChange}
        placeholder="Search tags..."
        emptyMessage="No tags found"
      />

      {/* Stage Dropdown */}
      <SegmentSearchableMultiSelect
        label="Stage"
        icon={<LuUserCheck className="icon-sm" />}
        options={STAGE_OPTIONS}
        selectedIds={filters.contact_type || []}
        onSelectionChange={handleStageChange}
        placeholder="Search..."
        emptyMessage="No stages available"
      />

      {/* Country Dropdown */}
      {countryOptions.length > 0 && (
        <SegmentSearchableMultiSelect
          label="Country"
          icon={<LuGlobe className="icon-sm" />}
          options={countryOptions}
          selectedIds={filters.country || []}
          onSelectionChange={handleCountryChange}
          placeholder="Search countries..."
          emptyMessage="No countries found"
        />
      )}

      {/* Date Range Section */}
      <SegmentFilterSection
        title="Date Range"
        icon={<LuCalendar className="icon-sm" />}
        isExpanded={expandedSections.dateRange}
        onToggle={() => toggleSection('dateRange')}
        badge={
          filters.date_range?.from || filters.date_range?.to
            ? (filters.date_range?.from ? 1 : 0) + (filters.date_range?.to ? 1 : 0)
            : 0
        }
      >
        <div className="gap-spacing-2 flex flex-col">
          <ReportingTimeRangeSelector
            variant="chip"
            config={reportingDateConfig}
            onConfigPatch={handleReportingDatePatch}
          />
          <p className="body-4 text-muted-foreground">
            Same range control as reporting spaces — filter leads by when they were created.
          </p>
        </div>
      </SegmentFilterSection>

      {/* Preview */}
      {showPreview && activeFilterCount > 0 && (
        <div className="p-spacing-3 bg-muted/30 rounded-spacing-2 border-border flex items-center justify-between border">
          <span className="body-3 text-muted-foreground">Matching leads:</span>
          <span className="body-2 text-foreground font-medium">
            {isLoadingPreview ? (
              <LuLoader className="icon-sm animate-spin" />
            ) : previewCount !== null ? (
              previewCount.toLocaleString()
            ) : (
              '—'
            )}
          </span>
        </div>
      )}
    </div>
  )
}
