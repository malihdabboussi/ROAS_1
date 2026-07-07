import { Database, Link2, Plus } from 'lucide-react'

interface SupabaseStatusIconProps {
  icon: typeof Database
}

function SupabaseStatusIcon({ icon: Icon }: SupabaseStatusIconProps) {
  return (
    <div className="badge-glass badge-glass-green mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
      <Icon className="icon-md" />
    </div>
  )
}

interface ProjectSupabaseDisconnectedViewProps {
  onConnect: () => void
}

export function ProjectSupabaseDisconnectedView({
  onConnect,
}: ProjectSupabaseDisconnectedViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <SupabaseStatusIcon icon={Database} />
      <p className="body-1 mb-2 font-semibold">Connect Supabase</p>
      <p className="body-3 text-muted-foreground mb-6 max-w-sm">
        Connect your Supabase account to provision a database and auth for this project.
      </p>
      <button
        type="button"
        onClick={onConnect}
        className="button-default button-glass-accent gap-spacing-2 flex items-center"
      >
        <Database className="icon-sm" />
        Connect Supabase Account
      </button>
    </div>
  )
}

interface ProjectSupabaseStatusViewProps {
  onStartProvision: () => void
  onStartLinkExisting: () => void
}

export function ProjectSupabaseStatusView({
  onStartProvision,
  onStartLinkExisting,
}: ProjectSupabaseStatusViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <SupabaseStatusIcon icon={Database} />
      <p className="body-1 mb-2 font-semibold">Add a Database</p>
      <p className="body-3 text-muted-foreground mb-6 max-w-sm">
        Your Supabase account is connected. Create a new project or link an existing one.
      </p>
      <div className="gap-spacing-3 flex">
        <button
          type="button"
          onClick={onStartProvision}
          className="button-default button-glass-accent gap-spacing-2 flex items-center"
        >
          <Plus className="icon-sm" />
          New Project
        </button>
        <button
          type="button"
          onClick={onStartLinkExisting}
          className="button-default chip-glass-neutral gap-spacing-2 flex items-center"
        >
          <Link2 className="icon-sm" />
          Link Existing
        </button>
      </div>
    </div>
  )
}
