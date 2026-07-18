import type { ReactNode } from 'react'

type DocEditorTitleHeaderLayoutProps = {
  actions: ReactNode
  title: ReactNode
}

export function DocEditorTitleHeaderLayout({ actions, title }: DocEditorTitleHeaderLayoutProps) {
  return (
    <div className="group/title-row px-spacing-4 pb-spacing-2 pt-spacing-3 flex flex-col">
      <div className="gap-spacing-2 flex items-center justify-end">{actions}</div>
      <div className="pt-spacing-2 relative w-full min-w-0">{title}</div>
    </div>
  )
}
