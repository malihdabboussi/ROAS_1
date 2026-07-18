import { ExternalLink, FileText } from 'lucide-react'
import { CHAT_MARKDOWN_CLASSNAME, renderChatMarkdown } from '@/lib/utils/chat-markdown.utils'
import type { MissionCommentAttachment } from '../../services/missions.service'
import type { MissionLog } from '../../types'
import { formatRelativeTime } from './detail-helpers'

interface UserActivityProps {
  log: MissionLog
  userProfile: { fullName: string; avatarUrl: string | null } | null
}

function UserHeader({
  userProfile,
  createdAt,
}: {
  userProfile: UserActivityProps['userProfile']
  createdAt: string
}) {
  return (
    <div className="gap-spacing-2 flex items-start justify-between">
      <div className="gap-spacing-1 flex min-w-0 items-center">
        {userProfile?.avatarUrl ? (
          <img
            src={userProfile.avatarUrl}
            alt={userProfile.fullName}
            className="h-4 w-4 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="bg-primary/20 typo-2xs text-primary flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-bold">
            {(userProfile?.fullName ?? 'Y').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="body-3 text-foreground truncate font-medium">
          {userProfile?.fullName ?? 'You'}
        </span>
      </div>
      <span className="body-3 text-muted-foreground/50 shrink-0">
        {formatRelativeTime(createdAt)}
      </span>
    </div>
  )
}

function CommentAttachments({ attachments }: { attachments?: MissionCommentAttachment[] }) {
  if (!attachments?.length) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((attachment, index) => {
        const content = (
          <>
            {attachment.type === 'image' && attachment.fileUrl ? (
              <img
                src={attachment.fileUrl}
                alt={attachment.filename}
                className="h-8 w-8 rounded object-cover"
              />
            ) : (
              <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            )}
            <span className="body-4 text-foreground max-w-artifact-compact truncate">
              {attachment.filename}
            </span>
          </>
        )

        return attachment.fileUrl ? (
          <a
            key={index}
            href={attachment.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-secondary/80 body-4 border-border bg-secondary group flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors"
          >
            {content}
            <ExternalLink className="text-muted-foreground h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        ) : (
          <div
            key={index}
            className="body-4 border-border bg-secondary flex items-center gap-1.5 rounded-lg border px-2 py-1"
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}

export function UserRatingActivity({ log, userProfile }: UserActivityProps) {
  const ratingPayload = log.payload as { thumbs_up?: boolean; rating?: number; feedback?: string }
  return (
    <>
      <UserHeader userProfile={userProfile} createdAt={log.created_at} />
      <div className="rounded-spacing-1 px-spacing-2 py-spacing-1 border-warning/20 bg-warning/10 mt-1 border">
        <div className="flex items-center gap-2">
          <span className="body-3 text-warning">
            {ratingPayload.thumbs_up === true
              ? '👍'
              : ratingPayload.thumbs_up === false
                ? '👎'
                : ''}
          </span>
          {ratingPayload.rating != null && (
            <span className="body-3 text-warning font-medium">{ratingPayload.rating}/10</span>
          )}
        </div>
        {ratingPayload.feedback && (
          <p className="body-3 text-foreground mt-0.5">{ratingPayload.feedback}</p>
        )}
      </div>
    </>
  )
}

export function UserCommentActivity({ log, userProfile }: UserActivityProps) {
  const payload = log.payload as {
    message?: string
    attachments?: MissionCommentAttachment[]
  }
  return (
    <>
      <UserHeader userProfile={userProfile} createdAt={log.created_at} />
      <div
        className={`body-3 text-foreground mt-0.5 break-words ${CHAT_MARKDOWN_CLASSNAME}`}
        dangerouslySetInnerHTML={{
          __html: renderChatMarkdown(payload.message ?? ''),
        }}
      />
      <CommentAttachments attachments={payload.attachments} />
    </>
  )
}
