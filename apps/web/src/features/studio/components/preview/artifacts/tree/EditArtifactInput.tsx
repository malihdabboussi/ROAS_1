'use client'

import { useEffect, useRef, useState } from 'react'
import type { TreeNode } from './types'

interface EditArtifactInputProps {
  node: TreeNode
  level: number
  initialValue: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function EditArtifactInput({
  node,
  level,
  initialValue,
  onConfirm,
  onCancel,
}: EditArtifactInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = () => {
    const name = value.trim() || initialValue
    onConfirm(name)
  }

  return (
    <div
      className="flex items-center rounded-lg px-2 py-1"
      style={{ paddingLeft: `${level * 16 + 8}px` }}
    >
      <span className="inline-block h-3.5 w-3.5 flex-shrink-0" />
      {node.icon}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={handleSubmit}
        className="body-2 ring-primary/50 text-foreground focus:ring-primary min-w-0 flex-1 truncate rounded bg-transparent px-1 outline-none ring-1"
        placeholder={initialValue}
      />
    </div>
  )
}
