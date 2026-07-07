export default function OrgSetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-[var(--spacing-6)] -mb-[var(--spacing-6)] -mt-[var(--spacing-6)] min-h-dvh w-[calc(100%+2*var(--spacing-6))] max-w-none shrink-0">
      {children}
    </div>
  )
}
