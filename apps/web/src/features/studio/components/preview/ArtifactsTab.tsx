'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArtifactPreviewPane } from '@/components/artifacts/ArtifactPreviewPaneAdapter'
import { useCampaignMode } from '../../contexts/CampaignModeContext'
import { useArtifactTreeResize } from '../../hooks/useArtifactTreeResize'
import { ResizableDivider } from '../layout/ResizableDivider'
import { useArtifactsController } from './artifacts/hooks/useArtifactsController'
import { BulkDeleteArtifactModal } from './artifacts/modals/BulkDeleteArtifactModal'
import { DeleteArtifactModal } from './artifacts/modals/DeleteArtifactModal'
import { ArtifactTreePane } from './artifacts/tree/ArtifactTreePane'

interface ArtifactsTabProps {
  campaignId: string
  mobilePreviewMode?: boolean
}

export function ArtifactsTab({ campaignId, mobilePreviewMode }: ArtifactsTabProps) {
  const state = useArtifactsController(campaignId)
  const { isPanelMinimized } = useCampaignMode()
  const { treeWidth, isDragging, containerRef, handleMouseDown } = useArtifactTreeResize({
    defaultWidth: 280,
    minWidth: 112,
    maxWidth: 280,
  })

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const prevSelectedRef = useRef(state.selectedResource)
  useEffect(() => {
    if (
      !isMobile ||
      !state.selectedResource ||
      state.selectedResource === prevSelectedRef.current
    ) {
      prevSelectedRef.current = state.selectedResource
      return
    }
    prevSelectedRef.current = state.selectedResource
    const name = state.selectedResource.name ?? 'Preview'
    const hasSettings = state.selectedResource.type === 'ad'
    window.dispatchEvent(
      new CustomEvent('mobile-artifact-preview', { detail: { name, hasSettings } }),
    )
  }, [isMobile, state.selectedResource])

  const handleMobileBack = useCallback(() => {
    state.setSelectedId(null)
    state.setSelectedResource(null)
  }, [state.setSelectedId, state.setSelectedResource])

  const handleResourceDeleted = useCallback(() => {
    state.setSelectedId(null)
    state.setSelectedResource(null)
    void state.loadArtifacts(true)
  }, [state.setSelectedId, state.setSelectedResource, state.loadArtifacts])

  useEffect(() => {
    if (!isMobile) return
    const handler = () => handleMobileBack()
    window.addEventListener('mobile-artifact-back', handler)
    return () => window.removeEventListener('mobile-artifact-back', handler)
  }, [isMobile, handleMobileBack])

  // When artifacts view becomes visible again (after minimization), refresh once.
  // This covers missed realtime events while the panel was hidden.
  const wasMinimizedRef = useRef(isPanelMinimized)
  useEffect(() => {
    if (wasMinimizedRef.current && !isPanelMinimized) {
      void state.loadArtifacts(true)
    }
    wasMinimizedRef.current = isPanelMinimized
  }, [isPanelMinimized, state.loadArtifacts])

  if (isMobile) {
    if (mobilePreviewMode) {
      return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <ArtifactPreviewPane
            selectedResource={state.selectedResource}
            selectedFunnel={state.selectedFunnel}
            selectedPresentation={state.selectedPresentation}
            pageContent={state.pageContent}
            pageLoading={state.pageLoading}
            pageError={state.pageError}
            themePreviewCss={state.themePreviewCss}
            funnelViewport={state.funnelViewport}
            setFunnelViewport={state.setFunnelViewport}
            lmViewport={state.lmViewport}
            setLmViewport={state.setLmViewport}
            adViewport={state.adViewport}
            setAdViewport={state.setAdViewport}
            onFunnelStatusChange={state.handleFunnelStatusChange}
            onPresentationStatusChange={state.handlePresentationStatusChange}
            onPresentationMutated={() => void state.refreshSelectedPresentation()}
            onAdUpdated={state.handleAdUpdated}
            funnelPages={state.funnelPages}
            currentPageId={state.currentPageId}
            onFunnelPageChange={state.handleFunnelPageChange}
            onFunnelPreviewRefresh={state.refreshCurrentFunnelPage}
            blogPosts={state.artifacts.blogPosts}
            onBlogPostChange={state.handleBlogPostChange}
            onResourceDeleted={handleResourceDeleted}
          />
        </div>
      )
    }

    return (
      <>
        <DeleteArtifactModal
          open={!!state.deleteModalNode}
          onClose={() => {
            if (state.isDeleting) return
            state.setDeleteModalNode(null)
          }}
          node={state.deleteModalNode}
          onConfirm={state.handleConfirmDelete}
          isDeleting={state.isDeleting}
          errorMessage={state.deleteError}
          sequenceDeleteMode={state.sequenceDeleteMode}
          onSequenceDeleteModeChange={state.setSequenceDeleteMode}
          campaignDeleteMode={state.campaignDeleteMode}
          onCampaignDeleteModeChange={state.setCampaignDeleteMode}
          adSetDeleteMode={state.adSetDeleteMode}
          onAdSetDeleteModeChange={state.setAdSetDeleteMode}
        />
        <BulkDeleteArtifactModal
          open={state.showBulkDeleteModal}
          onClose={() => {
            if (state.isBulkDeleting) return
            state.setShowBulkDeleteModal(false)
          }}
          count={state.bulkSelectedCount}
          onConfirm={state.handleConfirmBulkDelete}
          isDeleting={state.isBulkDeleting}
          errorMessage={state.bulkDeleteError}
        />
        <div className="flex h-full flex-col overflow-y-auto">
          <ArtifactTreePane
            selectedResource={null}
            treeWidth={99999}
            isDragging={false}
            activeCampaignName={state.activeCampaignName}
            filterBtnRef={state.filterBtnRef}
            filterSet={state.filterSet}
            setFilterSet={state.setFilterSet}
            sourceFilter={state.sourceFilter}
            setSourceFilter={state.setSourceFilter}
            filterDropdownOpen={state.filterDropdownOpen}
            setFilterDropdownOpen={state.setFilterDropdownOpen}
            isFiltering={state.isFiltering}
            isAllExpanded={state.isAllExpanded}
            handleToggleExpandAll={state.handleToggleExpandAll}
            loading={state.loading}
            fetchError={state.fetchError}
            totalItems={state.totalItems}
            filteredTotalItems={state.filteredTotalItems}
            filteredTreeData={state.filteredTreeData}
            selectedId={state.selectedId}
            expandedIds={state.expandedIds}
            toggleExpand={state.toggleExpand}
            handleSelect={state.handleSelect}
            addLoading={state.addLoading}
            handleStartAdd={state.handleStartAdd}
            handleConfirmAdd={state.handleConfirmAdd}
            handleCancelAdd={state.handleCancelAdd}
            pendingAdd={state.pendingAdd}
            handleReorderPages={state.handleReorderPages}
            handleReorderEmails={state.handleReorderEmails}
            handleMovePageToFunnel={state.handleMovePageToFunnel}
            handleMoveSequenceEmailToSequence={state.handleMoveSequenceEmailToSequence}
            draggingType={state.draggingType}
            setDraggingType={state.setDraggingType}
            handleEditFolder={state.handleEditFolder}
            handleDuplicateFolder={state.handleDuplicateFolder}
            handleDeleteFolder={state.handleDeleteFolder}
            handleConfirmEdit={state.handleConfirmEdit}
            handleCancelEdit={state.handleCancelEdit}
            editingFolderId={state.editingFolderId}
            menuOpenId={state.menuOpenId}
            setMenuOpenId={state.setMenuOpenId}
            campaignOptions={state.campaignOptions}
            campaignId={campaignId}
            handleMoveToCampaign={state.handleMoveToCampaign}
            bulkSelectMode={state.bulkSelectMode}
            bulkSelectedIds={state.bulkSelectedIds}
            bulkSelectedCount={state.bulkSelectedCount}
            onToggleBulkSelectMode={state.toggleBulkSelectMode}
            onToggleBulkSelectNode={state.toggleBulkSelectNode}
            onBulkDelete={state.handleBulkDelete}
            onBulkDuplicate={state.handleBulkDuplicate}
            onBulkMoveToCampaign={state.handleBulkMoveToCampaign}
            onExitBulkSelect={state.exitBulkSelect}
            onRefresh={() => state.loadArtifacts(true)}
            adSetOptions={state.adSetOptions}
            handleCloneToAdSet={state.handleCloneToAdSet}
            onCreateVariations={state.handleCreateVariations}
            onOpenBulkCreator={state.handleOpenBulkCreator}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <DeleteArtifactModal
        open={!!state.deleteModalNode}
        onClose={() => {
          if (state.isDeleting) return
          state.setDeleteModalNode(null)
        }}
        node={state.deleteModalNode}
        onConfirm={state.handleConfirmDelete}
        isDeleting={state.isDeleting}
        errorMessage={state.deleteError}
        sequenceDeleteMode={state.sequenceDeleteMode}
        onSequenceDeleteModeChange={state.setSequenceDeleteMode}
        campaignDeleteMode={state.campaignDeleteMode}
        onCampaignDeleteModeChange={state.setCampaignDeleteMode}
        adSetDeleteMode={state.adSetDeleteMode}
        onAdSetDeleteModeChange={state.setAdSetDeleteMode}
      />
      <BulkDeleteArtifactModal
        open={state.showBulkDeleteModal}
        onClose={() => {
          if (state.isBulkDeleting) return
          state.setShowBulkDeleteModal(false)
        }}
        count={state.bulkSelectedCount}
        onConfirm={state.handleConfirmBulkDelete}
        isDeleting={state.isBulkDeleting}
        errorMessage={state.bulkDeleteError}
      />
      <div ref={containerRef} className="card-glass flex h-full overflow-hidden rounded-2xl">
        <ArtifactTreePane
          selectedResource={state.selectedResource}
          treeWidth={treeWidth}
          isDragging={isDragging}
          activeCampaignName={state.activeCampaignName}
          filterBtnRef={state.filterBtnRef}
          filterSet={state.filterSet}
          setFilterSet={state.setFilterSet}
          sourceFilter={state.sourceFilter}
          setSourceFilter={state.setSourceFilter}
          filterDropdownOpen={state.filterDropdownOpen}
          setFilterDropdownOpen={state.setFilterDropdownOpen}
          isFiltering={state.isFiltering}
          isAllExpanded={state.isAllExpanded}
          handleToggleExpandAll={state.handleToggleExpandAll}
          loading={state.loading}
          fetchError={state.fetchError}
          totalItems={state.totalItems}
          filteredTotalItems={state.filteredTotalItems}
          filteredTreeData={state.filteredTreeData}
          selectedId={state.selectedId}
          expandedIds={state.expandedIds}
          toggleExpand={state.toggleExpand}
          handleSelect={state.handleSelect}
          addLoading={state.addLoading}
          handleStartAdd={state.handleStartAdd}
          handleConfirmAdd={state.handleConfirmAdd}
          handleCancelAdd={state.handleCancelAdd}
          pendingAdd={state.pendingAdd}
          handleReorderPages={state.handleReorderPages}
          handleReorderEmails={state.handleReorderEmails}
          handleMovePageToFunnel={state.handleMovePageToFunnel}
          handleMoveSequenceEmailToSequence={state.handleMoveSequenceEmailToSequence}
          draggingType={state.draggingType}
          setDraggingType={state.setDraggingType}
          handleEditFolder={state.handleEditFolder}
          handleDuplicateFolder={state.handleDuplicateFolder}
          handleDeleteFolder={state.handleDeleteFolder}
          handleConfirmEdit={state.handleConfirmEdit}
          handleCancelEdit={state.handleCancelEdit}
          editingFolderId={state.editingFolderId}
          menuOpenId={state.menuOpenId}
          setMenuOpenId={state.setMenuOpenId}
          campaignOptions={state.campaignOptions}
          campaignId={campaignId}
          handleMoveToCampaign={state.handleMoveToCampaign}
          bulkSelectMode={state.bulkSelectMode}
          bulkSelectedIds={state.bulkSelectedIds}
          bulkSelectedCount={state.bulkSelectedCount}
          onToggleBulkSelectMode={state.toggleBulkSelectMode}
          onToggleBulkSelectNode={state.toggleBulkSelectNode}
          onBulkDelete={state.handleBulkDelete}
          onBulkDuplicate={state.handleBulkDuplicate}
          onBulkMoveToCampaign={state.handleBulkMoveToCampaign}
          onExitBulkSelect={state.exitBulkSelect}
          onRefresh={() => state.loadArtifacts(true)}
          adSetOptions={state.adSetOptions}
          handleCloneToAdSet={state.handleCloneToAdSet}
          onCreateVariations={state.handleCreateVariations}
          onOpenBulkCreator={state.handleOpenBulkCreator}
        />
        {state.selectedResource && (
          <ResizableDivider onMouseDown={handleMouseDown} isDragging={isDragging} compact />
        )}
        <ArtifactPreviewPane
          selectedResource={state.selectedResource}
          selectedFunnel={state.selectedFunnel}
          selectedPresentation={state.selectedPresentation}
          pageContent={state.pageContent}
          pageLoading={state.pageLoading}
          pageError={state.pageError}
          themePreviewCss={state.themePreviewCss}
          funnelViewport={state.funnelViewport}
          setFunnelViewport={state.setFunnelViewport}
          lmViewport={state.lmViewport}
          setLmViewport={state.setLmViewport}
          adViewport={state.adViewport}
          setAdViewport={state.setAdViewport}
          onFunnelStatusChange={state.handleFunnelStatusChange}
          onPresentationStatusChange={state.handlePresentationStatusChange}
          onPresentationMutated={() => void state.refreshSelectedPresentation()}
          onAdUpdated={state.handleAdUpdated}
          funnelPages={state.funnelPages}
          currentPageId={state.currentPageId}
          onFunnelPageChange={state.handleFunnelPageChange}
          onFunnelPreviewRefresh={state.refreshCurrentFunnelPage}
          blogPosts={state.artifacts.blogPosts}
          onBlogPostChange={state.handleBlogPostChange}
          onResourceDeleted={handleResourceDeleted}
        />
      </div>
    </>
  )
}
