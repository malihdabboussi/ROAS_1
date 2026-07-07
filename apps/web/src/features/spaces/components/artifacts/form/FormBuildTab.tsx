'use client'

import { useCallback, useRef, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { MediaPickerModal } from '@/components/media/MediaPickerModal'
import { CoverDropdown } from '@/features/spaces/components/docs/cover/CoverDropdown'
import { DocCoverGenerateModal } from '@/features/spaces/components/docs/DocCoverPickerModal'
import type { Form, FormQuestion, FormSettings } from '@/lib/forms/forms-api'
import { reportClientError } from '@/lib/log-client-error'
import { presignPutUploadFile } from '@/lib/media/presigned-client-upload'
import { cn } from '@/lib/utils/cn'
import { EndPageEditor } from './EndPageEditor'
import { FormAddBlockRail } from './FormAddBlockRail'
import { FormCoverHero } from './FormCoverHero'
import { FormLogoPicker } from './FormLogoPicker'
import { FormPagesRail } from './FormPagesRail'
import { FormQuestionEditor } from './FormQuestionEditor'
import { FormSlashAddBlock } from './FormSlashAddBlock'
import { useFormCoverImage } from './use-form-cover-image'

export function FormBuildTab({
  form,
  onChange,
  showAddQuestionRail = true,
  onOpenSettings,
  pagesRailCollapsed,
  onPagesRailCollapsedChange,
}: {
  form: Form
  onChange: (patch: Partial<Form>) => void
  /** When false, omits the right "Add question" column (e.g. spaces slide-over preview). */
  showAddQuestionRail?: boolean
  onOpenSettings?: () => void
  pagesRailCollapsed: boolean
  onPagesRailCollapsedChange: (collapsed: boolean) => void
}) {
  const schema = form.schema ?? { questions: [] }
  const questions = schema.questions ?? []
  const settings = form.settings ?? {}
  const coverUrl =
    typeof settings.cover_url === 'string' && settings.cover_url.trim() ? settings.cover_url : null

  const [activePage, setActivePage] = useState<'start' | 'end'>('start')
  const [coverDropdownOpen, setCoverDropdownOpen] = useState(false)
  const [coverMediaPickerOpen, setCoverMediaPickerOpen] = useState(false)
  const [coverGenerateOpen, setCoverGenerateOpen] = useState(false)
  const [, setCoverUploading] = useState(false)
  const coverDropdownRef = useRef<HTMLDivElement>(null)
  const coverAddBtnRef = useRef<HTMLButtonElement>(null)
  const coverHeroChangeBtnRef = useRef<HTMLButtonElement>(null)
  const coverFileInputRef = useRef<HTMLInputElement>(null)

  const updateSettings = useCallback(
    (next: FormSettings) => {
      onChange({ settings: next })
    },
    [onChange],
  )

  const setCoverUrl = useCallback(
    (url: string) => {
      updateSettings({ ...settings, cover_url: url })
    },
    [updateSettings, settings],
  )

  const handleCoverFileUpload = useCallback(
    async (file: File | undefined) => {
      if (!file?.type.startsWith('image/')) return
      setCoverUploading(true)
      try {
        const { url } = await presignPutUploadFile({
          file,
          category: 'image',
          campaign_id: form.campaign_id,
        })
        setCoverUrl(url)
      } catch (err) {
        void reportClientError({
          feature: 'ui/form_editor',
          error_code: 'form_cover_upload_failed',
          message: err instanceof Error ? err.message : String(err),
          context: { formId: form.id },
        })
      } finally {
        setCoverUploading(false)
      }
    },
    [form.campaign_id, form.id, setCoverUrl],
  )

  const {
    coverRepositioning,
    setCoverRepositioning,
    coverFocalY,
    coverContainerRef,
    handleCoverDragStart,
    handleCoverDragMove,
    handleCoverDragEnd,
  } = useFormCoverImage({ settings, coverUrl, updateSettings })

  const appendQuestion = useCallback(
    (question: FormQuestion) => {
      onChange({
        schema: { ...schema, questions: [...questions, question] },
      })
    },
    [onChange, schema, questions],
  )

  const updateQuestion = useCallback(
    (next: FormQuestion) => {
      onChange({
        schema: {
          ...schema,
          questions: questions.map((q) => (q.id === next.id ? next : q)),
        },
      })
    },
    [onChange, schema, questions],
  )

  const deleteQuestion = useCallback(
    (id: string) => {
      onChange({
        schema: { ...schema, questions: questions.filter((q) => q.id !== id) },
      })
    },
    [onChange, schema, questions],
  )

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

  const showBlockRail = showAddQuestionRail && activePage === 'start'

  return (
    <div className="gap-spacing-2 px-spacing-4 py-spacing-3 flex min-h-0 flex-1 overflow-hidden">
      <FormPagesRail
        activePage={activePage}
        onSelectPage={setActivePage}
        collapsed={pagesRailCollapsed}
        onCollapsedChange={onPagesRailCollapsedChange}
      />

      <main className="border-border bg-background rounded-spacing-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border">
        <div className="p-spacing-8 min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl">
            {activePage === 'end' ? (
              <EndPageEditor
                settings={settings}
                onSettingsChange={updateSettings}
                campaignId={form.campaign_id}
                formId={form.id}
              />
            ) : (
              <>
                {coverUrl ? (
                  <div className="mb-spacing-5">
                    <FormCoverHero
                      coverUrl={coverUrl}
                      settings={settings}
                      onSettingsChange={updateSettings}
                      coverContainerRef={coverContainerRef}
                      coverRepositioning={coverRepositioning}
                      setCoverRepositioning={setCoverRepositioning}
                      coverFocalY={coverFocalY}
                      handleCoverDragStart={handleCoverDragStart}
                      handleCoverDragMove={handleCoverDragMove}
                      handleCoverDragEnd={handleCoverDragEnd}
                      coverDropdownOpen={coverDropdownOpen}
                      setCoverDropdownOpen={setCoverDropdownOpen}
                      coverDropdownRef={coverDropdownRef}
                      coverHeroChangeBtnRef={coverHeroChangeBtnRef}
                      onCoverUploadClick={() => coverFileInputRef.current?.click()}
                      onCoverLibraryOpen={() => setCoverMediaPickerOpen(true)}
                      onCoverGenerateOpen={() => setCoverGenerateOpen(true)}
                    />
                  </div>
                ) : null}

                <div className="group/form-header space-y-spacing-3">
                  {!coverUrl ? (
                    <div
                      className={cn(
                        'gap-spacing-2 flex items-center transition-opacity duration-150',
                        'pointer-events-none opacity-0',
                        'group-hover/form-header:pointer-events-auto group-hover/form-header:opacity-100',
                        'group-focus-within/form-header:pointer-events-auto group-focus-within/form-header:opacity-100',
                      )}
                    >
                      <div className="relative">
                        <button
                          ref={coverAddBtnRef}
                          type="button"
                          onClick={() => setCoverDropdownOpen((o) => !o)}
                          className="flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                        >
                          <ImageIcon className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                          Add cover
                        </button>
                        {coverDropdownOpen && (
                          <CoverDropdown
                            ref={coverDropdownRef}
                            className="left-0 top-full mt-1"
                            onUpload={() => {
                              setCoverDropdownOpen(false)
                              coverFileInputRef.current?.click()
                            }}
                            onLibrary={() => {
                              setCoverDropdownOpen(false)
                              setCoverMediaPickerOpen(true)
                            }}
                            onGenerate={() => {
                              setCoverDropdownOpen(false)
                              setCoverGenerateOpen(true)
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ) : null}

                  <FormLogoPicker
                    value={{
                      icon: settings.icon,
                      icon_color: settings.icon_color,
                      icon_image_url: settings.icon_image_url,
                    }}
                    onChange={(next) =>
                      updateSettings({
                        ...settings,
                        icon: next.icon,
                        icon_color: next.icon_color,
                        icon_image_url: next.icon_image_url,
                      })
                    }
                    campaignId={form.campaign_id}
                    formId={form.id}
                  />

                  <input
                    value={schema.title ?? form.name}
                    onChange={(event) =>
                      onChange({ schema: { ...schema, title: event.target.value, questions } })
                    }
                    className="title-h2 text-foreground w-full bg-transparent outline-none"
                    placeholder="Form title"
                  />
                  <textarea
                    value={schema.description ?? ''}
                    onChange={(event) =>
                      onChange({
                        schema: { ...schema, description: event.target.value, questions },
                      })
                    }
                    className="body-3 text-muted-foreground min-h-spacing-16 w-full resize-none bg-transparent outline-none"
                    placeholder="Describe what this form collects"
                  />
                </div>

                <div className="mt-spacing-5 space-y-spacing-5">
                  {questions.map((question) => (
                    <FormQuestionEditor
                      key={question.id}
                      question={question}
                      targetSpaceId={settings.target_space_id ?? form.space_id ?? null}
                      onOpenSettings={onOpenSettings}
                      onChange={(next) =>
                        onChange({
                          schema: {
                            ...schema,
                            questions: questions.map((candidate) =>
                              candidate.id === question.id ? next : candidate,
                            ),
                          },
                        })
                      }
                      onDelete={() =>
                        onChange({
                          schema: {
                            ...schema,
                            questions: questions.filter(
                              (candidate) => candidate.id !== question.id,
                            ),
                          },
                        })
                      }
                    />
                  ))}
                  <FormSlashAddBlock
                    targetSpaceId={settings.target_space_id ?? form.space_id ?? null}
                    onPickQuestion={appendQuestion}
                    onOpenSettings={onOpenSettings}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {showBlockRail ? (
        <FormAddBlockRail
          questions={questions}
          selectedQuestionId={selectedQuestionId}
          onSelectQuestion={setSelectedQuestionId}
          targetSpaceId={settings.target_space_id ?? form.space_id ?? null}
          onOpenSettings={onOpenSettings}
          onAppend={appendQuestion}
          onUpdateQuestion={updateQuestion}
          onDeleteQuestion={deleteQuestion}
          resetBindingKey={activePage}
        />
      ) : null}

      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleCoverFileUpload(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <MediaPickerModal
        open={coverMediaPickerOpen}
        onClose={() => setCoverMediaPickerOpen(false)}
        onSelect={(url) => {
          setCoverUrl(url)
          setCoverMediaPickerOpen(false)
        }}
        campaignId={form.campaign_id}
      />

      <DocCoverGenerateModal
        open={coverGenerateOpen}
        onClose={() => setCoverGenerateOpen(false)}
        campaignId={form.campaign_id}
        onSelect={(url) => {
          setCoverUrl(url)
          setCoverGenerateOpen(false)
        }}
      />
    </div>
  )
}
