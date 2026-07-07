import { Link2, Loader2, Plus } from 'lucide-react'
import type {
  SupabaseOrg,
  SupabaseProjectSummary,
} from '../../services/supabase-integration.service'
import { ProjectSupabaseSelect, type SupabasePanelSelectField } from './ProjectSupabaseSelect'

const REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-west-2', label: 'Europe (London)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ca-central-1', label: 'Canada (Central)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
]

interface ProjectSupabaseBackButtonProps {
  onClick: () => void
}

function ProjectSupabaseBackButton({ onClick }: ProjectSupabaseBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="body-4 text-muted-foreground mb-4 self-start hover:underline"
    >
      &larr; Back
    </button>
  )
}

interface ProjectSupabaseProvisionFormProps {
  orgs: SupabaseOrg[]
  selectedOrg: string
  onSelectedOrgChange: (next: string) => void
  projectName: string
  onProjectNameChange: (next: string) => void
  selectedRegion: string
  onSelectedRegionChange: (next: string) => void
  activeSelect: SupabasePanelSelectField | null
  onActiveSelectChange: (next: SupabasePanelSelectField | null) => void
  provisionError: string | null
  provisioning: boolean
  onBack: () => void
  onProvision: () => void
}

export function ProjectSupabaseProvisionForm({
  orgs,
  selectedOrg,
  onSelectedOrgChange,
  projectName,
  onProjectNameChange,
  selectedRegion,
  onSelectedRegionChange,
  activeSelect,
  onActiveSelectChange,
  provisionError,
  provisioning,
  onBack,
  onProvision,
}: ProjectSupabaseProvisionFormProps) {
  return (
    <div className="p-spacing-6 flex h-full flex-col overflow-y-auto">
      <ProjectSupabaseBackButton onClick={onBack} />
      <p className="body-1 mb-4 font-semibold">Create New Supabase Project</p>

      <div className="space-y-4">
        <ProjectSupabaseSelect
          field="org"
          labelText="Organization"
          value={selectedOrg}
          onChange={onSelectedOrgChange}
          placeholder={orgs.length === 0 ? 'No organizations' : 'Select organization'}
          options={orgs.map((org) => ({ value: org.id, label: org.name }))}
          activeField={activeSelect}
          onActiveFieldChange={onActiveSelectChange}
        />

        <div>
          <label
            htmlFor="project-supabase-name"
            className="body-4 text-muted-foreground mb-1 block"
          >
            Project Name
          </label>
          <input
            id="project-supabase-name"
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="input-glass body-3 h-spacing-9 px-spacing-3 rounded-spacing-2 w-full"
            placeholder="my-project"
          />
        </div>

        <ProjectSupabaseSelect
          field="region"
          labelText="Region"
          value={selectedRegion}
          onChange={onSelectedRegionChange}
          placeholder="Select region"
          options={REGIONS.map((r) => ({
            value: r.value,
            label: r.label,
            description: r.value,
          }))}
          activeField={activeSelect}
          onActiveFieldChange={onActiveSelectChange}
        />

        {provisionError && <p className="body-4 text-destructive">{provisionError}</p>}

        <button
          type="button"
          onClick={onProvision}
          disabled={provisioning || !selectedOrg || !projectName.trim()}
          className="button-default button-glass-accent gap-spacing-2 flex items-center disabled:opacity-50"
        >
          {provisioning ? (
            <Loader2 className="icon-sm animate-spin" />
          ) : (
            <Plus className="icon-sm" />
          )}
          Create Project
        </button>
      </div>
    </div>
  )
}

interface ProjectSupabaseLinkExistingFormProps {
  existingProjects: SupabaseProjectSummary[]
  selectedExistingProject: string
  onSelectedExistingProjectChange: (next: string) => void
  activeSelect: SupabasePanelSelectField | null
  onActiveSelectChange: (next: SupabasePanelSelectField | null) => void
  provisionError: string | null
  provisioning: boolean
  onBack: () => void
  onLinkExisting: () => void
}

export function ProjectSupabaseLinkExistingForm({
  existingProjects,
  selectedExistingProject,
  onSelectedExistingProjectChange,
  activeSelect,
  onActiveSelectChange,
  provisionError,
  provisioning,
  onBack,
  onLinkExisting,
}: ProjectSupabaseLinkExistingFormProps) {
  return (
    <div className="p-spacing-6 flex h-full flex-col overflow-y-auto">
      <ProjectSupabaseBackButton onClick={onBack} />
      <p className="body-1 mb-4 font-semibold">Link Existing Supabase Project</p>

      <div className="space-y-4">
        <ProjectSupabaseSelect
          field="existing-project"
          labelText="Select Project"
          value={selectedExistingProject}
          onChange={onSelectedExistingProjectChange}
          placeholder="Choose a project..."
          options={existingProjects.map((p) => ({
            value: p.id,
            label: p.name,
            description: p.region,
          }))}
          activeField={activeSelect}
          onActiveFieldChange={onActiveSelectChange}
        />

        {provisionError && <p className="body-4 text-destructive">{provisionError}</p>}

        <button
          type="button"
          onClick={onLinkExisting}
          disabled={provisioning || !selectedExistingProject}
          className="button-default button-glass-accent gap-spacing-2 flex items-center disabled:opacity-50"
        >
          {provisioning ? (
            <Loader2 className="icon-sm animate-spin" />
          ) : (
            <Link2 className="icon-sm" />
          )}
          Link Project
        </button>
      </div>
    </div>
  )
}
