import { AlertTriangle } from 'lucide-react'

export function FlowsForbiddenState() {
  return (
    <main className="p-spacing-6 flex h-full items-center justify-center">
      <section className="surface-card rounded-spacing-4 p-spacing-6 border-border max-w-md border text-center">
        <AlertTriangle className="icon-lg text-muted-foreground mb-spacing-3 mx-auto" />
        <h1 className="heading-2 text-foreground">FORBIDDEN</h1>
        <p className="body-3 text-muted-foreground mt-spacing-2">Admin access required.</p>
      </section>
    </main>
  )
}
