'use client'

import { useRef, type RefObject } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { FilePlus, Loader2, Plus, Sparkles } from 'lucide-react'
import { isSkillWriteLockedAgent } from '@/lib/agents/system-agent-contracts'
import {
  SkillsMenuItemWithPeek,
  SkillsMenuPeekList,
  SkillsUploadMenuItem,
} from './skills-upload-menu-item'
import { useTriggerIsVisible } from './use-trigger-is-visible'

export function SkillsNewSkillButton({
  variant = 'default',
  selectedAgentKey,
  addSkillMenuOpen,
  setAddSkillMenuOpen,
  openCreateFresh,
  openCreateWithJaime,
  skillUploadInputRef,
  handleUploadSkill,
  extracting,
}: {
  variant?: 'default' | 'toolbar'
  selectedAgentKey: string
  addSkillMenuOpen: boolean
  setAddSkillMenuOpen: (open: boolean) => void
  openCreateFresh: () => void
  openCreateWithJaime: () => void
  skillUploadInputRef: RefObject<HTMLInputElement | null>
  handleUploadSkill: (files: FileList | File[]) => void
  extracting: boolean
}) {
  const targetIsSkillLocked = isSkillWriteLockedAgent(selectedAgentKey)
  const createBlocked = targetIsSkillLocked || !selectedAgentKey
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isTriggerVisible = useTriggerIsVisible(triggerRef)

  return (
    <>
      <Popover.Root
        open={addSkillMenuOpen && isTriggerVisible}
        onOpenChange={(open) => {
          if (!open) {
            setAddSkillMenuOpen(false)
            return
          }
          if (isTriggerVisible) setAddSkillMenuOpen(true)
        }}
      >
        <Popover.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            disabled={extracting || createBlocked}
            title={
              targetIsSkillLocked
                ? "This agent's skills are managed by the platform. Toggle skills on/off in the chat agent panel."
                : undefined
            }
            className={
              variant === 'toolbar'
                ? 'badge-glass badge-glass-green body-3 rounded-spacing-2 inline-flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                : 'chip-glass-green body-3 gap-spacing-1 rounded-spacing-2 px-spacing-3 py-spacing-1 inline-flex items-center font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            {extracting ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5 shrink-0" />
            )}
            {extracting ? 'Extracting…' : 'New skill'}
          </button>
        </Popover.Trigger>
        {isTriggerVisible ? (
          <Popover.Portal>
            <Popover.Content
              side="bottom"
              align="end"
              sideOffset={4}
              collisionPadding={12}
              className="dropdown-menu-solid z-dropdown w-52 py-1 outline-none"
              onOpenAutoFocus={(e) => e.preventDefault()}
              role="menu"
            >
              <SkillsMenuItemWithPeek
                icon={FilePlus}
                label="Create manually"
                disabled={extracting}
                onClick={openCreateFresh}
                peekTitle="Create manually"
                peekDescription="Build a skill yourself in the editor. Name it, describe it, and write the instructions."
                peekExtra={
                  <SkillsMenuPeekList
                    heading="What you'll set up"
                    items={[
                      <>
                        <span className="text-foreground">Name & description</span>: how the skill
                        shows up in the library
                      </>,
                      <>
                        <span className="text-foreground font-mono">SKILL.md</span>: the
                        instructions your agent follows
                      </>,
                      <>
                        <span className="text-foreground">References</span>: optional files in{' '}
                        <span className="text-foreground font-mono">references/</span> for examples
                        and context
                      </>,
                    ]}
                  />
                }
              />
              <SkillsMenuItemWithPeek
                icon={Sparkles}
                label="Create with Jaime"
                disabled={extracting}
                onClick={openCreateWithJaime}
                peekTitle="Create with Jaime"
                peekDescription="Jaime interviews you and drafts the skill in chat. You review before saving."
                peekExtra={
                  <SkillsMenuPeekList
                    heading="How it works"
                    items={[
                      <>
                        Opens a new chat with{' '}
                        <span className="text-foreground font-mono">/skill-creator</span>
                      </>,
                      <>You describe what the agent should do and when to use the skill</>,
                      <>
                        Jaime writes <span className="text-foreground font-mono">SKILL.md</span> and
                        can add reference files for you
                      </>,
                    ]}
                  />
                }
              />
              <SkillsUploadMenuItem
                disabled={extracting}
                onClick={() => {
                  setAddSkillMenuOpen(false)
                  setTimeout(() => skillUploadInputRef.current?.click(), 0)
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        ) : null}
      </Popover.Root>

      {isTriggerVisible ? (
        <input
          ref={skillUploadInputRef}
          type="file"
          className="hidden"
          multiple
          accept=".md,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown"
          onChange={(e) => {
            if (e.target.files?.length) handleUploadSkill(e.target.files)
            e.target.value = ''
          }}
        />
      ) : null}
    </>
  )
}
