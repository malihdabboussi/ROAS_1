'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BookCheck, LayoutGrid, UserRoundSearch } from 'lucide-react'

export function SidebarTeamManageLinks({
  pathname,
  showManagePeople,
}: {
  pathname: string
  showManagePeople: boolean
}) {
  const manageSection = useSearchParams().get('section')
  const agentsActive = pathname === '/team' && (!manageSection || manageSection === 'agents')
  const skillsActive = pathname === '/team/skills' || pathname.startsWith('/team/skills/')
  const peopleActive = pathname === '/team' && manageSection === 'people'

  return (
    <div className="mb-2 space-y-0.5">
      <Link
        href="/team"
        data-hub-dock-navigate
        className={`hub-dock-flyout-row ${agentsActive ? 'hub-dock-flyout-row-active' : ''}`}
      >
        <LayoutGrid />
        <span className="min-w-0 flex-1 truncate">Manage Agents</span>
      </Link>
      <Link
        href="/team/skills"
        data-hub-dock-navigate
        className={`hub-dock-flyout-row ${skillsActive ? 'hub-dock-flyout-row-active' : ''}`}
      >
        <BookCheck />
        <span className="min-w-0 flex-1 truncate">Manage Skills</span>
      </Link>
      {showManagePeople ? (
        <Link
          href="/team?section=people"
          data-hub-dock-navigate
          className={`hub-dock-flyout-row ${peopleActive ? 'hub-dock-flyout-row-active' : ''}`}
        >
          <UserRoundSearch />
          <span className="min-w-0 flex-1 truncate">Manage People</span>
        </Link>
      ) : null}
    </div>
  )
}
