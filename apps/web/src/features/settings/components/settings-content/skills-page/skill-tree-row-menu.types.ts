export type SkillTreeMenuTarget =
  | { kind: 'skill-md' }
  | { kind: 'file'; resourceId: string; path: string }
  | { kind: 'folder'; path: string; expanded: boolean }

export type SkillTreeRowMenuState = {
  target: SkillTreeMenuTarget
  pointer: { x: number; y: number }
} | null
