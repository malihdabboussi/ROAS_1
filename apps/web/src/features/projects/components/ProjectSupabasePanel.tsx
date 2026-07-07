'use client'

import { useCallback, useEffect, useState } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  connectSupabase,
  getSupabaseStatus,
  linkExistingSupabaseProject,
  listSupabaseOrganizations,
  listSupabaseProjects,
  provisionSupabaseProject,
} from '../services/supabase-integration.service'
import type {
  SupabaseConnectionStatus,
  SupabaseOrg,
  SupabaseProjectSummary,
} from '../services/supabase-integration.service'
import type { ProjectRepo } from '../types'
import { DatabaseBrowser } from './database/DatabaseBrowser'
import {
  ProjectSupabaseLinkExistingForm,
  ProjectSupabaseProvisionForm,
} from './project-supabase-panel/ProjectSupabaseForms'
import type { SupabasePanelSelectField } from './project-supabase-panel/ProjectSupabaseSelect'
import {
  ProjectSupabaseDisconnectedView,
  ProjectSupabaseStatusView,
} from './project-supabase-panel/ProjectSupabaseStatusViews'

interface ProjectSupabasePanelProps {
  project: ProjectRepo
  onProjectUpdated: () => void
}

type PanelView = 'status' | 'provision' | 'link-existing'

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => chars[b % chars.length])
    .join('')
}

export function ProjectSupabasePanel({ project, onProjectUpdated }: ProjectSupabasePanelProps) {
  const [connectionStatus, setConnectionStatus] = useState<SupabaseConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<PanelView>('status')
  const [activeSelect, setActiveSelect] = useState<SupabasePanelSelectField | null>(null)

  const [orgs, setOrgs] = useState<SupabaseOrg[]>([])
  const [existingProjects, setExistingProjects] = useState<SupabaseProjectSummary[]>([])
  const [selectedOrg, setSelectedOrg] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('us-east-1')
  const [projectName, setProjectName] = useState(project.name)
  const [selectedExistingProject, setSelectedExistingProject] = useState('')
  const [provisioning, setProvisioning] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)

  const hasSupabase = !!project.supabase_project_ref

  useEffect(() => {
    if (hasSupabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    getSupabaseStatus()
      .then(setConnectionStatus)
      .catch(() => setConnectionStatus({ connected: false, status: null, connectedAt: null }))
      .finally(() => setLoading(false))
  }, [hasSupabase])

  useEffect(() => {
    if (!activeSelect) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]') && !target.closest('button')) {
        setActiveSelect(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeSelect])

  useEffect(() => {
    setActiveSelect(null)
  }, [view])

  const handleConnect = useCallback(async () => {
    const redirectTo = window.location.href
    const url = await connectSupabase(redirectTo)
    window.location.href = url
  }, [])

  const loadOrgsAndProjects = useCallback(async () => {
    const [orgList, projectList] = await Promise.all([
      listSupabaseOrganizations(),
      listSupabaseProjects(),
    ])
    setOrgs(orgList)
    setExistingProjects(projectList)
    if (orgList.length > 0 && !selectedOrg) {
      setSelectedOrg(orgList[0]!.id)
    }
  }, [selectedOrg])

  const handleStartProvision = useCallback(async () => {
    await loadOrgsAndProjects()
    setView('provision')
  }, [loadOrgsAndProjects])

  const handleStartLinkExisting = useCallback(async () => {
    await loadOrgsAndProjects()
    setView('link-existing')
  }, [loadOrgsAndProjects])

  const handleProvision = useCallback(async () => {
    if (!selectedOrg || !projectName.trim()) return
    setProvisioning(true)
    setProvisionError(null)
    try {
      await provisionSupabaseProject({
        organization_id: selectedOrg,
        name: projectName.trim(),
        region: selectedRegion,
        db_pass: generatePassword(),
        vibey_project_id: project.id,
      })
      onProjectUpdated()
      setView('status')
    } catch (e) {
      setProvisionError(e instanceof Error ? e.message : 'Failed to provision')
    } finally {
      setProvisioning(false)
    }
  }, [selectedOrg, projectName, selectedRegion, project.id, onProjectUpdated])

  const handleLinkExisting = useCallback(async () => {
    if (!selectedExistingProject) return
    setProvisioning(true)
    setProvisionError(null)
    try {
      await linkExistingSupabaseProject({
        supabase_project_ref: selectedExistingProject,
        vibey_project_id: project.id,
      })
      onProjectUpdated()
      setView('status')
    } catch (e) {
      setProvisionError(e instanceof Error ? e.message : 'Failed to link project')
    } finally {
      setProvisioning(false)
    }
  }, [selectedExistingProject, project.id, onProjectUpdated])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading database..." state="processing" size="lg" />
      </div>
    )
  }

  if (hasSupabase) {
    return <DatabaseBrowser project={project} />
  }

  if (!connectionStatus?.connected) {
    return <ProjectSupabaseDisconnectedView onConnect={handleConnect} />
  }

  if (view === 'provision') {
    return (
      <ProjectSupabaseProvisionForm
        orgs={orgs}
        selectedOrg={selectedOrg}
        onSelectedOrgChange={setSelectedOrg}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        selectedRegion={selectedRegion}
        onSelectedRegionChange={setSelectedRegion}
        activeSelect={activeSelect}
        onActiveSelectChange={setActiveSelect}
        provisionError={provisionError}
        provisioning={provisioning}
        onBack={() => setView('status')}
        onProvision={handleProvision}
      />
    )
  }

  if (view === 'link-existing') {
    return (
      <ProjectSupabaseLinkExistingForm
        existingProjects={existingProjects}
        selectedExistingProject={selectedExistingProject}
        onSelectedExistingProjectChange={setSelectedExistingProject}
        activeSelect={activeSelect}
        onActiveSelectChange={setActiveSelect}
        provisionError={provisionError}
        provisioning={provisioning}
        onBack={() => setView('status')}
        onLinkExisting={handleLinkExisting}
      />
    )
  }

  return (
    <ProjectSupabaseStatusView
      onStartProvision={handleStartProvision}
      onStartLinkExisting={handleStartLinkExisting}
    />
  )
}
