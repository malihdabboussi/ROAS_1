'use client'

import { type ReactNode, useState } from 'react'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { MOCKUP_OFFER_DEMO } from '@/components/mockup-studio/mockup-offer-demo-data'
import {
  formatOfferFieldKey,
  getAllOfferFields,
  OFFER_WORKBOOK_SECTIONS,
} from '@/components/mockup-studio/mockup-offer-workbook'

function normalizeEmDashToHyphen(s: string): string {
  return s.replace(/\u2014/g, '-').replace(/\u2013/g, '-')
}

function FieldSectionLabel({ children }: { children: ReactNode }) {
  return <p className="body-3 studio-offer-field-label mb-1">{children}</p>
}

function LabeledBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="studio-offer-labeled-block">
      <FieldSectionLabel>{label}</FieldSectionLabel>
      <div className="text-[var(--color-foreground)]">{children}</div>
    </div>
  )
}

function isSimpleValue(v: unknown): boolean {
  return typeof v === 'string' || typeof v === 'number'
}

function renderFieldValue(value: unknown): ReactNode {
  if (Array.isArray(value)) {
    const unique = [
      ...new Set(
        value
          .map((item) =>
            normalizeEmDashToHyphen(
              String(item)
                .replace(/^[\s•\-–—*]+/, '')
                .trim(),
            ),
          )
          .filter(Boolean),
      ),
    ]
    return (
      <ul className="body-2 list-card-compact text-[var(--color-foreground)]">
        {unique.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    return (
      <div className="studio-offer-nested">
        {Object.entries(obj).map(([k, v]) => {
          if (v == null || v === '' || (typeof v === 'string' && v.trim() === '')) return null
          if (isSimpleValue(v)) {
            return (
              <div key={k}>
                <FieldSectionLabel>{formatOfferFieldKey(k)}</FieldSectionLabel>
                <p className="body-2 text-[var(--color-foreground)]">
                  {normalizeEmDashToHyphen(String(v))}
                </p>
              </div>
            )
          }
          return (
            <LabeledBlock key={k} label={formatOfferFieldKey(k)}>
              {renderFieldValue(v)}
            </LabeledBlock>
          )
        })}
      </div>
    )
  }
  return (
    <p className="body-2 whitespace-pre-wrap text-[var(--color-foreground)]">
      {normalizeEmDashToHyphen(String(value))}
    </p>
  )
}

function FieldCard({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string' && value.trim() === '') return null

  return (
    <div className="card-glass rounded-spacing-3">
      <div className="p-4 sm:p-5 md:p-6">
        <LabeledBlock label={label}>{renderFieldValue(value)}</LabeledBlock>
      </div>
    </div>
  )
}

function StepSection({
  title,
  stepData,
  fields,
}: {
  title: string
  stepData: Record<string, unknown>
  fields: [string, string][]
}) {
  const allFields = getAllOfferFields(stepData, fields)
  const hasContent = allFields.some(([key]) => {
    const val = stepData[key]
    return val !== null && val !== undefined && val !== ''
  })
  if (!hasContent) return null

  return (
    <div className="studio-offer-step">
      <h2 className="title-h3">{title}</h2>
      {allFields.map(([key, label]) => (
        <FieldCard key={key} label={label} value={stepData[key]} />
      ))}
    </div>
  )
}

/**
 * Static clone of apps/web `OfferPreview` layout + rendering (no API / export).
 */
export function MockupOfferPreview() {
  const offer = MOCKUP_OFFER_DEMO
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="studio-preview-border-b flex items-center justify-between px-4 py-3">
        <h2 className="title-h3">{normalizeEmDashToHyphen(offer.name || 'Offer')}</h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setDownloadMenuOpen((o) => !o)}
            data-tooltip="Download"
            className="studio-offer-download-btn rounded-lg p-2"
            aria-expanded={downloadMenuOpen}
          >
            <Download className="h-4 w-4" />
          </button>
          {downloadMenuOpen ? (
            <div className="dropdown-glass absolute right-0 top-full z-[70] mt-1 min-w-[160px] py-1">
              <div className="body-3 studio-offer-dd-item flex w-full items-center gap-2 px-3 py-2 text-left">
                PDF
              </div>
              <div className="body-3 studio-offer-dd-item flex w-full items-center gap-2 px-3 py-2 text-left">
                Markdown
              </div>
              <div className="body-3 studio-offer-dd-item flex w-full items-center gap-2 px-3 py-2 text-left">
                JSON
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="studio-offer-scroll space-y-8 p-4">
          {OFFER_WORKBOOK_SECTIONS.map((section, idx) => {
            const raw = offer[section.dataKey as keyof typeof offer]
            if (raw == null || typeof raw !== 'object') return null
            const stepData = { ...raw } as Record<string, unknown>
            return (
              <motion.div
                key={section.dataKey}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.2, ease: 'easeOut' }}
              >
                <StepSection
                  title={section.title}
                  stepData={stepData}
                  fields={section.fields}
                />
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
