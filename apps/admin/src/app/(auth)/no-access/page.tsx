export default function NoAccessPage() {
  return (
    <div className="card-glass card-elevated text-card-foreground w-full max-w-[var(--container-auth)] rounded-[var(--spacing-4)] p-[var(--spacing-8)]">
      <div className="text-center">
        <h1 className="title-h3">No access</h1>
        <p className="body-3 text-muted-foreground mt-spacing-2">
          Your account does not have admin privileges. Please contact support if you believe this is
          a mistake.
        </p>
      </div>
    </div>
  )
}
