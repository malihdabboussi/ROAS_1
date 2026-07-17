import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { AttachedFile } from '@/components/chat/FileAttachments'
import type {
  Mission,
  MissionAccessRequest,
  MissionAgent,
  MissionDeliverable,
  MissionLog,
  MissionPriority,
  MissionStatus,
  MissionSubtask,
  PrdContent,
  RecommendedHire,
} from '../../types'
import type { RatingPayload } from './MissionRatingStrip'

export interface MissionDetailModalViewProps {
  mission: Mission
  liveMission: Mission | null
  title: string
  setTitle: (value: string) => void
  description: string
  setDescription: (value: string) => void
  currentStatus: MissionStatus
  currentPriority: MissionPriority
  selectedSubtaskId: string | null
  setSelectedSubtaskId: Dispatch<SetStateAction<string | null>>
  elevatedStacking: boolean
  onClose: () => void
  onUpdated: () => void
  isMobile: boolean
  mobileScreen: 'detail' | 'activity'
  setMobileScreen: Dispatch<SetStateAction<'detail' | 'activity'>>
  mobileMenuOpen: boolean
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>
  menuAnchor: HTMLElement | null
  setMenuAnchor: Dispatch<SetStateAction<HTMLElement | null>>
  prdLoading: boolean
  logsLoading: boolean
  planContent: PrdContent | null
  planModalOpen: boolean
  onClosePlan: () => void
  recommendedHires: RecommendedHire[]
  sortedLogs: MissionLog[]
  subtasks: MissionSubtask[]
  setSubtasks: Dispatch<SetStateAction<MissionSubtask[]>>
  agents: MissionAgent[]
  userProfile: { fullName: string; avatarUrl: string | null } | null
  deliverables: MissionDeliverable[]
  previewDeliverable: MissionDeliverable | null
  setPreviewDeliverable: Dispatch<SetStateAction<MissionDeliverable | null>>
  pendingAccessRequests: MissionAccessRequest[]
  approvingAccess: boolean
  onApproveAccess: () => void
  commentText: string
  sendingComment: boolean
  setCommentText: (value: string) => void
  onSendComment: () => void
  subtaskCommentText: string
  setSubtaskCommentText: (value: string) => void
  sendingSubtaskComment: boolean
  onSendSubtaskComment: () => void
  approvingHumanGate: boolean
  onApproveHumanGate: () => void
  activityEndRef: RefObject<HTMLDivElement | null>
  attachedFiles: AttachedFile[]
  onRemoveFile: (id: string) => void
  onFileButtonClick: () => void
  openDrive: () => void
  openDropbox: () => void
  setShowLibraryPicker: Dispatch<SetStateAction<boolean>>
  maxFiles: number
  fileInputRef: RefObject<HTMLInputElement | null>
  acceptedTypes: string
  onFileSelect: (files: FileList | readonly File[] | null) => void
  onPasteFiles: (files: File[]) => void
  onRatingSubmit: (payload: RatingPayload) => Promise<void>
  ratingSending: boolean
  ratingSubmitted: boolean
  onViewPlan: () => void
  onApprovePlan: () => void
  onRejectPlan: () => void
  approvingPlan: boolean
  autoApprovePlans: boolean
  onToggleAutoApprove: (enabled: boolean) => void
  showDrivePicker: boolean
  setShowDrivePicker: Dispatch<SetStateAction<boolean>>
  onSelectCloudFile: (file: File) => void
  showDropboxPicker: boolean
  setShowDropboxPicker: Dispatch<SetStateAction<boolean>>
  showLibraryPicker: boolean
  onSelectLibrary: (url: string) => void
  onRetry: () => Promise<void>
  onArchive: () => void
  onDelete: () => void
  onStatusChange: (newStatus: MissionStatus) => Promise<void>
  onPriorityChange: (newPriority: MissionPriority) => Promise<void>
}
