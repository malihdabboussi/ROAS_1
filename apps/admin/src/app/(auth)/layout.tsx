export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="text-foreground tpl-surface--light relative grid min-h-screen place-items-center overflow-hidden p-[var(--spacing-6)]">
      <div className="tpl-layer tpl-layer--spotlight" />
      <div className="tpl-layer tpl-layer--blobs pointer-events-none" />
      <div className="tpl-layer tpl-layer--vignette" />
      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </main>
  )
}
