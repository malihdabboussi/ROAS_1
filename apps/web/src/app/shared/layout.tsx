import Image from 'next/image'
import Link from 'next/link'

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="gap-spacing-4 px-spacing-6 py-spacing-4 border-border flex items-center justify-between border-b">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/Logos/logov2/icon-text-black-moregap.png"
            alt="Vibey"
            width={132}
            height={36}
            priority
            className="dark:hidden"
          />
          <Image
            src="/Logos/logov2/icon-text-white-moregap.png"
            alt="Vibey"
            width={132}
            height={36}
            priority
            className="hidden dark:block"
          />
        </Link>
        <div className="gap-spacing-2 flex items-center">
          <Link
            href="/login"
            className="button-glass-neutral body-3 px-spacing-4 py-spacing-2 rounded-md"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="button-glass-primary body-3 px-spacing-4 py-spacing-2 rounded-md"
          >
            Sign up
          </Link>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <footer className="px-spacing-6 py-spacing-4 border-border border-t">
        <p className="body-3 text-muted-foreground text-center">Vibey</p>
      </footer>
    </div>
  )
}
