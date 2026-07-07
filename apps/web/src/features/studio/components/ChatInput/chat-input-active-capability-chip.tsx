import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'

export interface ChatInputActiveCapabilityChipValue {
  label: string
  icon: string
}

export function ChatInputActiveCapabilityChip({
  chip,
  onClear,
}: {
  chip: ChatInputActiveCapabilityChipValue | null | undefined
  onClear?: () => void
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {chip && (
        <motion.span
          key={chip.label}
          initial={{ opacity: 0, scale: 0.92, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -4 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="chip-glass-blue body-4 inline-flex h-8 items-center gap-1 rounded-full px-2.5 font-medium"
        >
          <LucideIcon name={chip.icon} className="h-3 w-3" />
          <span className="max-w-32 truncate">{chip.label}</span>
          <button
            type="button"
            onClick={onClear}
            className="hover:bg-hover-subtle rounded-full p-0.5 transition-colors"
            aria-label="Clear selected capability"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </motion.span>
      )}
    </AnimatePresence>
  )
}
