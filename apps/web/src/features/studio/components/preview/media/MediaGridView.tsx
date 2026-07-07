'use client'

import type { MutableRefObject, ReactNode } from 'react'
import {
  Check,
  ExternalLink,
  File,
  FileText,
  Image,
  Link2,
  Music,
  Rocket,
  Sparkles,
  Video,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs'
import type { MediaAsset } from '@/lib/services/media-api'
import type { CampaignDeliverable } from '../../../services/artifact-preview.service'
import type { ConversationDocument } from '../../../types'
import { DOC_TYPE_LABELS } from './media-tab.constants'
import type { LinkRow, MediaGridTab, Selection } from './media-tab.types'
import { DeliverableRow } from './MediaDeliverables'
import { AssetRow, DocRow } from './MediaRows'
import { EmptyBlock, ErrorBlock } from './MediaTabListPrimitives'

interface MediaGridViewProps {
  docs: ConversationDocument[]
  groupedDocs: Record<string, ConversationDocument[]>
  images: MediaAsset[]
  videos: MediaAsset[]
  audios: MediaAsset[]
  fileAssets: MediaAsset[]
  linkRows: LinkRow[]
  selection: Selection
  setSelection: (s: Selection) => void
  activeGridTab: MediaGridTab
  setActiveGridTab: (t: MediaGridTab) => void
  menuOpenId: string | null
  setMenuOpenId: (id: string | null) => void
  editingId: string | null
  setEditingId: (id: string | null) => void
  menuBtnRef: MutableRefObject<HTMLButtonElement | null>
  handleRenameDoc: (doc: ConversationDocument) => void
  handleDeleteDoc: (doc: ConversationDocument) => Promise<void>
  handleConfirmRenameDoc: (id: string, title: string) => Promise<void>
  handleRenameAsset: (asset: MediaAsset) => void
  handleDeleteAsset: (asset: MediaAsset) => Promise<void>
  handleConfirmRenameAsset: (id: string, name: string) => Promise<void>
  docsError: string | null
  assetsError: string | null
  deliverables: CampaignDeliverable[]
  deliverablesError: string | null
  bulkSelectMode?: boolean
  bulkSelectedIds?: Set<string>
  onToggleBulkSelectItem?: (
    id: string,
    entry: { kind: 'asset' | 'doc'; asset?: MediaAsset; doc?: ConversationDocument },
  ) => void
}

function GridBulkCheck({ isChecked }: { isChecked: boolean }) {
  return (
    <div
      className={`border-border bg-secondary/80 h-spacing-4 w-spacing-4 rounded-spacing-1 text-muted-foreground flex items-center justify-center border ${
        isChecked ? 'border-primary bg-primary text-primary-foreground' : ''
      }`}
    >
      {isChecked && <Check className="icon-xs" />}
    </div>
  )
}

function GridSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="typo-section-label text-muted-foreground/80 px-spacing-1 pb-spacing-1">
      {children}
    </p>
  )
}

export function MediaGridView({
  docs,
  groupedDocs,
  images,
  videos,
  audios,
  fileAssets,
  linkRows,
  selection,
  setSelection,
  activeGridTab,
  setActiveGridTab,
  menuOpenId,
  setMenuOpenId,
  editingId,
  setEditingId,
  menuBtnRef,
  handleRenameDoc,
  handleDeleteDoc,
  handleConfirmRenameDoc,
  handleRenameAsset,
  handleDeleteAsset,
  handleConfirmRenameAsset,
  docsError,
  assetsError,
  deliverables,
  deliverablesError,
  bulkSelectMode = false,
  bulkSelectedIds,
  onToggleBulkSelectItem,
}: MediaGridViewProps) {
  return (
    <Tabs
      value={activeGridTab}
      onValueChange={(v) => setActiveGridTab(v as MediaGridTab)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList variant="full" className="scrollbar-thin shrink-0 overflow-x-auto">
        <TabsTrigger value="deliverables" className="gap-spacing-1 px-spacing-2 shrink-0">
          <FileText className="icon-xs shrink-0" />
          <span className="body-4">Deliverables</span>
          <span className="typo-caption text-muted-foreground/60">{deliverables.length}</span>
        </TabsTrigger>
        <TabsTrigger value="documents" className="gap-spacing-1 px-spacing-2 shrink-0">
          <FileText className="icon-xs shrink-0" />
          <span className="body-4">Docs</span>
          <span className="typo-caption text-muted-foreground/60">{docs.length}</span>
        </TabsTrigger>
        <TabsTrigger value="media" className="gap-spacing-1 px-spacing-2 shrink-0">
          <Image className="icon-xs shrink-0" />
          <span className="body-4">Media</span>
          <span className="typo-caption text-muted-foreground/60">
            {images.length + videos.length + audios.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="files" className="gap-spacing-1 px-spacing-2 shrink-0">
          <File className="icon-xs shrink-0" />
          <span className="body-4">Files</span>
          <span className="typo-caption text-muted-foreground/60">{fileAssets.length}</span>
        </TabsTrigger>
        <TabsTrigger value="links" className="gap-spacing-1 px-spacing-2 shrink-0">
          <Link2 className="icon-xs shrink-0" />
          <span className="body-4">Links</span>
          <span className="typo-caption text-muted-foreground/60">{linkRows.length}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="deliverables" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        {deliverablesError ? (
          <ErrorBlock message={deliverablesError} />
        ) : deliverables.length === 0 ? (
          <EmptyBlock label="Create your first deliverable by sending a mission" icon={Rocket} />
        ) : (
          deliverables.map((del) => (
            <DeliverableRow
              key={del.id}
              deliverable={del}
              selection={selection}
              setSelection={setSelection}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="documents" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        {docsError ? (
          <ErrorBlock message={docsError} />
        ) : docs.length === 0 ? (
          <EmptyBlock
            label="Documents will appear here as your agent creates them"
            icon={FileText}
          />
        ) : (
          Object.entries(groupedDocs).map(([type, typeDocs]) => (
            <div key={type} className="mb-spacing-2">
              <p className="typo-section-label text-muted-foreground/80 px-spacing-2 py-spacing-1">
                {DOC_TYPE_LABELS[type] ?? type}
              </p>
              {typeDocs.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  selection={selection}
                  setSelection={setSelection}
                  editingId={editingId}
                  setEditingId={setEditingId}
                  menuOpenId={menuOpenId}
                  setMenuOpenId={setMenuOpenId}
                  menuBtnRef={menuBtnRef}
                  handleRenameDoc={handleRenameDoc}
                  handleDeleteDoc={handleDeleteDoc}
                  handleConfirmRenameDoc={handleConfirmRenameDoc}
                  bulkSelectMode={bulkSelectMode}
                  isChecked={bulkSelectedIds?.has(doc.id)}
                  onToggleBulkSelect={() => onToggleBulkSelectItem?.(doc.id, { kind: 'doc', doc })}
                />
              ))}
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="media" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        {assetsError ? (
          <ErrorBlock message={assetsError} />
        ) : images.length === 0 && videos.length === 0 && audios.length === 0 ? (
          <EmptyBlock label="Upload or generate images, videos, and audio" icon={Sparkles} />
        ) : (
          <div className="space-y-spacing-3 p-spacing-1">
            {images.length > 0 && (
              <div>
                <GridSectionLabel>Images · {images.length}</GridSectionLabel>
                <div className="gap-spacing-1 grid grid-cols-3">
                  {images.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() =>
                        bulkSelectMode
                          ? onToggleBulkSelectItem?.(asset.id, { kind: 'asset', asset })
                          : setSelection({ type: 'image', asset })
                      }
                      className={`rounded-spacing-2 relative aspect-square overflow-hidden ${bulkSelectMode && bulkSelectedIds?.has(asset.id) ? 'ring-primary ring-2' : selection?.type === 'image' && selection.asset.id === asset.id ? 'ring-primary ring-2' : ''}`}
                    >
                      {bulkSelectMode && (
                        <div className="left-spacing-1 top-spacing-1 absolute z-10">
                          <GridBulkCheck isChecked={bulkSelectedIds?.has(asset.id) ?? false} />
                        </div>
                      )}
                      <img
                        src={asset.public_url ?? ''}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {videos.length > 0 && (
              <div>
                <GridSectionLabel>Videos · {videos.length}</GridSectionLabel>
                <div className="gap-spacing-1 grid grid-cols-2">
                  {videos.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() =>
                        bulkSelectMode
                          ? onToggleBulkSelectItem?.(asset.id, { kind: 'asset', asset })
                          : setSelection({ type: 'video', asset })
                      }
                      className={`bg-secondary rounded-spacing-2 relative aspect-video overflow-hidden ${bulkSelectMode && bulkSelectedIds?.has(asset.id) ? 'ring-primary ring-2' : selection?.type === 'video' && selection.asset.id === asset.id ? 'ring-primary ring-2' : ''}`}
                    >
                      {bulkSelectMode && (
                        <div className="left-spacing-1 top-spacing-1 absolute z-10">
                          <GridBulkCheck isChecked={bulkSelectedIds?.has(asset.id) ?? false} />
                        </div>
                      )}
                      <video
                        src={asset.public_url ?? ''}
                        preload="metadata"
                        muted
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Video className="text-muted-foreground h-spacing-6 w-spacing-6" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {audios.length > 0 && (
              <div>
                <GridSectionLabel>Audio · {audios.length}</GridSectionLabel>
                <div className="gap-spacing-1 flex flex-col">
                  {audios.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() =>
                        bulkSelectMode
                          ? onToggleBulkSelectItem?.(asset.id, { kind: 'asset', asset })
                          : setSelection({ type: 'audio', asset })
                      }
                      type="button"
                      className={`card-glass-interactive gap-spacing-3 p-spacing-2 rounded-spacing-2 flex items-center text-left transition-colors ${bulkSelectMode && bulkSelectedIds?.has(asset.id) ? 'ring-primary/40 ring-1' : selection?.type === 'audio' && selection.asset.id === asset.id ? 'ring-primary/40 ring-1' : ''}`}
                    >
                      {bulkSelectMode && (
                        <GridBulkCheck isChecked={bulkSelectedIds?.has(asset.id) ?? false} />
                      )}
                      <div className="bg-secondary h-spacing-10 w-spacing-10 rounded-spacing-2 flex shrink-0 items-center justify-center">
                        <Music className="text-muted-foreground h-spacing-5 w-spacing-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="body-4 text-foreground truncate font-medium">{asset.name}</p>
                        <p className="typo-caption text-muted-foreground">{asset.mime_type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="files" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        {assetsError ? (
          <ErrorBlock message={assetsError} />
        ) : fileAssets.length === 0 ? (
          <EmptyBlock label="Uploaded files and documents will show here" icon={File} />
        ) : (
          fileAssets.map((asset) => (
            <AssetRow
              key={asset.id}
              asset={asset}
              type="file"
              selection={selection}
              setSelection={setSelection}
              editingId={editingId}
              setEditingId={setEditingId}
              menuOpenId={menuOpenId}
              setMenuOpenId={setMenuOpenId}
              menuBtnRef={menuBtnRef}
              handleRenameAsset={handleRenameAsset}
              handleDeleteAsset={handleDeleteAsset}
              handleConfirmRenameAsset={handleConfirmRenameAsset}
              bulkSelectMode={bulkSelectMode}
              isChecked={bulkSelectedIds?.has(asset.id)}
              onToggleBulkSelect={() =>
                onToggleBulkSelectItem?.(asset.id, { kind: 'asset', asset })
              }
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="links" className="mt-0 min-h-0 flex-1 overflow-y-auto">
        {linkRows.length === 0 ? (
          <EmptyBlock label="Links shared in conversations will appear here" icon={Link2} />
        ) : (
          <div className="space-y-spacing-1 p-spacing-1">
            {linkRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
                className="hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-2 flex w-full items-center text-left transition-colors"
              >
                <ExternalLink className="icon-xs text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="body-3 text-primary truncate">{row.title}</p>
                  <p className="body-4 text-muted-foreground mt-spacing-0-5 truncate">{row.url}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
