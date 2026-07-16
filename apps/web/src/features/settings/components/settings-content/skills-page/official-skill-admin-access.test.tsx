import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { MissionAgent, MissionAgentSkill } from '@/lib/agents/agent-skill-types'
import { SkillsCatalogTree } from './skills-catalog-tree'
import { SkillsPreviewPanel } from './skills-preview-panel'

const officialSkill: MissionAgentSkill = {
  id: 'official-skill-1',
  user_id: null,
  org_id: null,
  agent_key: 'vibey',
  skill_key: 'official-launch',
  name: 'Official Launch',
  description: 'Platform-owned launch instructions.',
  markdown_content: '# Official Launch\n\nAdmin-only instructions.',
  is_enabled: true,
  is_system: true,
  source: 'system',
  resources: [],
  created_at: '2026-06-22T00:00:00Z',
  updated_at: '2026-06-22T00:00:00Z',
}

const agents: MissionAgent[] = [
  {
    id: 'agent-1',
    user_id: 'user-1',
    agent_key: 'vibey',
    name: 'ROAS',
    image_url: null,
    role: 'CEO',
    level: 'c_level',
    skills: [],
    is_active: true,
    status: 'online',
    sort_order: 0,
    created_at: '2026-06-22T00:00:00Z',
    updated_at: '2026-06-22T00:00:00Z',
  },
]

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

afterEach(cleanup)

function renderCatalog(canViewOfficialSkillContent: boolean, onSelectSkill = vi.fn()) {
  render(
    <SkillsCatalogTree
      skills={[officialSkill]}
      skillsViewKey="vibey"
      skillsGroupBy="none"
      skillsGroupSort="asc"
      agents={agents}
      detailSkillId={null}
      detailResourceId={null}
      toggleBusyId={null}
      onSkillsChanged={vi.fn()}
      onSelectSkill={onSelectSkill}
      canViewOfficialSkillContent={canViewOfficialSkillContent}
      onToggleEnabled={vi.fn()}
      onOpenSkillMenu={vi.fn()}
    />,
  )
  return onSelectSkill
}

describe('official skill admin access', () => {
  it('keeps official catalog rows inert for non-admins', () => {
    const onSelectSkill = renderCatalog(false)

    fireEvent.click(screen.getByText('Official Launch'))

    expect(onSelectSkill).not.toHaveBeenCalled()
  })

  it('lets admins open official catalog rows', () => {
    const onSelectSkill = renderCatalog(true)

    fireEvent.click(screen.getByText('Official Launch'))

    expect(onSelectSkill).toHaveBeenCalledWith(officialSkill)
  })

  it('shows official markdown only when admin viewing is enabled', () => {
    const baseProps = {
      detailSkillResolved: officialSkill,
      detailResource: null,
      detailResourceId: null,
      skillDetailMarkdownExportRef: { current: null },
      detailExportMenuOpen: false,
      setDetailExportMenuOpen: vi.fn(),
      detailExportingPdf: false,
      handleSkillDetailPdf: vi.fn(),
      handleSkillDetailMarkdown: vi.fn(),
      handleSkillDetailJson: vi.fn(),
    }

    const { rerender } = render(
      <SkillsPreviewPanel {...baseProps} canViewOfficialSkillContent={false} />,
    )

    expect(
      screen.getByText('Official platform skill. Instructions are managed by ROAS.'),
    ).toBeTruthy()
    expect(screen.queryByText('Admin-only instructions.')).toBeNull()

    rerender(<SkillsPreviewPanel {...baseProps} canViewOfficialSkillContent />)

    expect(screen.getByText('Admin-only instructions.')).toBeTruthy()
    expect(
      screen.queryByText('Official platform skill. Instructions are managed by ROAS.'),
    ).toBeNull()
  })
})
