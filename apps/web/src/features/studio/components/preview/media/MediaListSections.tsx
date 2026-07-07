'use client'

import { useState } from 'react'
import { ExternalLink, File, FileText, Image, Link2, Rocket, Video } from 'lucide-react'
import { DOC_TYPE_LABELS, INITIAL_SHOW } from './media-tab.constants'
import type { MediaListSectionsProps } from './media-tab.types'
import { DeliverableRow } from './MediaDeliverables'
import { AssetRow, DocRow } from './MediaRows'
import { CollapsibleSection, EmptyBlock, ErrorBlock } from './MediaTabListPrimitives'

export function MediaListSections(props: MediaListSectionsProps) {
  const {
    docs,
    groupedDocs,
    images,
    videos,
    fileAssets,
    linkRows,
    deliverables,
    selection,
    setSelection,
  } = props
  const [linksCollapsed, setLinksCollapsed] = useState(false)
  const [deliverablesCollapsed, setDeliverablesCollapsed] = useState(false)
  const [deliverablesExpanded, setDeliverablesExpanded] = useState(false)

  return (
    <>
      <CollapsibleSection
        label="Deliverables"
        count={deliverables.length}
        collapsed={deliverablesCollapsed}
        onToggle={() => setDeliverablesCollapsed((c) => !c)}
      >
        {props.deliverablesError ? (
          <ErrorBlock message={props.deliverablesError} />
        ) : deliverables.length === 0 ? (
          <EmptyBlock label="Create your first deliverable by sending a mission" icon={Rocket} />
        ) : (
          <>
            {(deliverablesExpanded ? deliverables : deliverables.slice(0, INITIAL_SHOW)).map(
              (del) => (
                <DeliverableRow
                  key={del.id}
                  deliverable={del}
                  selection={selection}
                  setSelection={setSelection}
                />
              ),
            )}
            {deliverables.length > INITIAL_SHOW && !deliverablesExpanded && (
              <button
                type="button"
                onClick={() => setDeliverablesExpanded(true)}
                className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
              >
                Show more
              </button>
            )}
            {deliverablesExpanded && deliverables.length > INITIAL_SHOW && (
              <button
                type="button"
                onClick={() => setDeliverablesExpanded(false)}
                className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
              >
                Show less
              </button>
            )}
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        label="Documents"
        count={docs.length}
        collapsed={props.docsCollapsed}
        onToggle={() => props.setDocsCollapsed((c) => !c)}
        className="mt-spacing-4"
      >
        {props.docsError ? (
          <ErrorBlock message={props.docsError} />
        ) : docs.length === 0 ? (
          <EmptyBlock
            label="Documents will appear here as your agent creates them"
            icon={FileText}
          />
        ) : (
          Object.entries(groupedDocs).map(([type, typeDocs]) => {
            const isExpanded = props.docsExpanded.has(type)
            const visible = isExpanded ? typeDocs : typeDocs.slice(0, INITIAL_SHOW)
            const hasMore = typeDocs.length > INITIAL_SHOW && !isExpanded
            return (
              <div key={type} className="ml-spacing-2">
                <div className="gap-spacing-2 px-spacing-2 py-spacing-1 flex items-center">
                  <span className="typo-section-label text-muted-foreground/80">
                    {DOC_TYPE_LABELS[type] ?? type}
                  </span>
                  <span className="typo-caption text-muted-foreground ml-auto">
                    {typeDocs.length}
                  </span>
                </div>
                {visible.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    selection={selection}
                    setSelection={setSelection}
                    editingId={props.editingId}
                    setEditingId={props.setEditingId}
                    menuOpenId={props.menuOpenId}
                    setMenuOpenId={props.setMenuOpenId}
                    menuBtnRef={props.menuBtnRef}
                    handleRenameDoc={props.handleRenameDoc}
                    handleDeleteDoc={props.handleDeleteDoc}
                    handleConfirmRenameDoc={props.handleConfirmRenameDoc}
                    bulkSelectMode={props.bulkSelectMode}
                    isChecked={props.bulkSelectedIds?.has(doc.id)}
                    onToggleBulkSelect={() =>
                      props.onToggleBulkSelectItem?.(doc.id, { kind: 'doc', doc })
                    }
                  />
                ))}
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => props.setDocsExpanded((prev) => new Set(prev).add(type))}
                    className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
                  >
                    Show more
                  </button>
                )}
                {isExpanded && typeDocs.length > INITIAL_SHOW && (
                  <button
                    type="button"
                    onClick={() =>
                      props.setDocsExpanded((prev) => {
                        const next = new Set(prev)
                        next.delete(type)
                        return next
                      })
                    }
                    className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
                  >
                    Show less
                  </button>
                )}
              </div>
            )
          })
        )}
      </CollapsibleSection>

      <CollapsibleSection
        label="Images"
        count={images.length}
        collapsed={props.imagesCollapsed}
        onToggle={() => props.setImagesCollapsed((c) => !c)}
        className="mt-spacing-4"
      >
        {props.assetsError ? (
          <ErrorBlock message={props.assetsError} />
        ) : images.length === 0 ? (
          <EmptyBlock label="Upload or generate images to see them here" icon={Image} />
        ) : (
          <>
            {(props.imagesExpanded ? images : images.slice(0, INITIAL_SHOW)).map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                type="image"
                selection={selection}
                setSelection={setSelection}
                editingId={props.editingId}
                setEditingId={props.setEditingId}
                menuOpenId={props.menuOpenId}
                setMenuOpenId={props.setMenuOpenId}
                menuBtnRef={props.menuBtnRef}
                handleRenameAsset={props.handleRenameAsset}
                handleDeleteAsset={props.handleDeleteAsset}
                handleConfirmRenameAsset={props.handleConfirmRenameAsset}
                bulkSelectMode={props.bulkSelectMode}
                isChecked={props.bulkSelectedIds?.has(asset.id)}
                onToggleBulkSelect={() =>
                  props.onToggleBulkSelectItem?.(asset.id, { kind: 'asset', asset })
                }
              />
            ))}
            {images.length > INITIAL_SHOW && !props.imagesExpanded && (
              <button
                type="button"
                onClick={() => props.setImagesExpanded(true)}
                className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
              >
                Show more
              </button>
            )}
            {props.imagesExpanded && images.length > INITIAL_SHOW && (
              <button
                type="button"
                onClick={() => props.setImagesExpanded(false)}
                className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
              >
                Show less
              </button>
            )}
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        label="Videos"
        count={videos.length}
        collapsed={props.videosCollapsed}
        onToggle={() => props.setVideosCollapsed((c) => !c)}
        className="mt-spacing-4"
      >
        {props.assetsError ? (
          <ErrorBlock message={props.assetsError} />
        ) : videos.length === 0 ? (
          <EmptyBlock label="Upload or generate videos to see them here" icon={Video} />
        ) : (
          <>
            {(props.videosExpanded ? videos : videos.slice(0, INITIAL_SHOW)).map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                type="video"
                selection={selection}
                setSelection={setSelection}
                editingId={props.editingId}
                setEditingId={props.setEditingId}
                menuOpenId={props.menuOpenId}
                setMenuOpenId={props.setMenuOpenId}
                menuBtnRef={props.menuBtnRef}
                handleRenameAsset={props.handleRenameAsset}
                handleDeleteAsset={props.handleDeleteAsset}
                handleConfirmRenameAsset={props.handleConfirmRenameAsset}
                bulkSelectMode={props.bulkSelectMode}
                isChecked={props.bulkSelectedIds?.has(asset.id)}
                onToggleBulkSelect={() =>
                  props.onToggleBulkSelectItem?.(asset.id, { kind: 'asset', asset })
                }
              />
            ))}
            {videos.length > INITIAL_SHOW && !props.videosExpanded && (
              <button
                type="button"
                onClick={() => props.setVideosExpanded(true)}
                className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
              >
                Show more
              </button>
            )}
            {props.videosExpanded && videos.length > INITIAL_SHOW && (
              <button
                type="button"
                onClick={() => props.setVideosExpanded(false)}
                className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
              >
                Show less
              </button>
            )}
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        label="Files"
        count={fileAssets.length}
        collapsed={props.filesCollapsed}
        onToggle={() => props.setFilesCollapsed((c) => !c)}
        className="mt-spacing-4"
      >
        {props.assetsError ? (
          <ErrorBlock message={props.assetsError} />
        ) : fileAssets.length === 0 ? (
          <EmptyBlock label="Uploaded files and documents will show here" icon={File} />
        ) : (
          <>
            {(props.filesExpanded ? fileAssets : fileAssets.slice(0, INITIAL_SHOW)).map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                type="file"
                selection={selection}
                setSelection={setSelection}
                editingId={props.editingId}
                setEditingId={props.setEditingId}
                menuOpenId={props.menuOpenId}
                setMenuOpenId={props.setMenuOpenId}
                menuBtnRef={props.menuBtnRef}
                handleRenameAsset={props.handleRenameAsset}
                handleDeleteAsset={props.handleDeleteAsset}
                bulkSelectMode={props.bulkSelectMode}
                isChecked={props.bulkSelectedIds?.has(asset.id)}
                onToggleBulkSelect={() =>
                  props.onToggleBulkSelectItem?.(asset.id, { kind: 'asset', asset })
                }
                handleConfirmRenameAsset={props.handleConfirmRenameAsset}
              />
            ))}
            {fileAssets.length > INITIAL_SHOW && !props.filesExpanded && (
              <button
                type="button"
                onClick={() => props.setFilesExpanded(true)}
                className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
              >
                Show more
              </button>
            )}
            {props.filesExpanded && fileAssets.length > INITIAL_SHOW && (
              <button
                type="button"
                onClick={() => props.setFilesExpanded(false)}
                className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1 text-left hover:underline"
              >
                Show less
              </button>
            )}
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        label="Links"
        count={linkRows.length}
        collapsed={linksCollapsed}
        onToggle={() => setLinksCollapsed((c) => !c)}
        className="mt-spacing-4"
      >
        {linkRows.length === 0 ? (
          <EmptyBlock label="Links shared in conversations will appear here" icon={Link2} />
        ) : (
          linkRows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
              className="hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 flex w-full items-center text-left transition-colors"
            >
              <ExternalLink className="icon-xs text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="body-3 text-primary truncate">{row.title}</p>
                <p className="body-4 text-muted-foreground mt-spacing-0-5 truncate">{row.url}</p>
              </div>
            </button>
          ))
        )}
      </CollapsibleSection>
    </>
  )
}
