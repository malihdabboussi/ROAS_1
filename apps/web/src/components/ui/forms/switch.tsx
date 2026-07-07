'use client'

import * as React from 'react'

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  className = '',
  disabled,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        if (onCheckedChange) onCheckedChange(!checked)
      }}
      className={`switch-glass-primary relative inline-flex h-5 w-9 items-center overflow-hidden rounded-full disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span
        className={`switch-glass-primary-thumb inline-block h-4 w-4 transform rounded-full ${checked ? 'translate-x-4' : 'translate-x-1'}`}
      />
    </button>
  )
}

export default Switch
